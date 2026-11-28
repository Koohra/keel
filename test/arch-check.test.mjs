import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { root } from './helpers.mjs';
import { parseImports, globToRegExp, checkArchitecture } from '../scripts/arch-check.mjs';

const script = join(root, 'scripts', 'arch-check.mjs');
const FIX = 'Declare a port in the domain and implement it in infra; pass it as a parameter.';

function architecture(base) {
  return {
    components: {
      domain: [`${base}/domain/**`],
      infra: [`${base}/infra/**`, `${base}/web/**`],
    },
    rules: [{ name: 'domain-does-not-depend-on-outside', from: 'domain', forbid: ['infra', 'external:web', 'external:db', 'external:http'], fix: FIX }],
    noCycles: [base.split('/')[0]],
    baseline: 'keel/arch-baseline.txt',
  };
}

function withProject(files, fn) {
  const dir = mkdtempSync(join(tmpdir(), 'keel-arch-'));
  try {
    for (const [path, text] of Object.entries(files)) {
      const full = join(dir, path);
      mkdirSync(dirname(full), { recursive: true });
      writeFileSync(full, typeof text === 'string' ? text : `${JSON.stringify(text, null, 2)}\n`);
    }
    return fn(dir, (...args) => spawnSync(process.execPath, [script, '--root', dir, ...args], { encoding: 'utf8' }));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

const jsClean = {
  'keel/architecture.json': architecture('src/billing'),
  'src/billing/domain/invoice.ts': "import { Value } from './value';\nexport const f = (v: Value) => v;\n",
  'src/billing/domain/value.ts': 'export type Value = number;\n',
  'src/billing/infra/repo.ts': "import { f } from '../domain/invoice.js';\nimport { Pool } from 'pg';\nexport const r = { f, Pool };\n",
};

const pyClean = {
  'keel/architecture.json': architecture('app'),
  'app/__init__.py': '',
  'app/domain/__init__.py': '',
  'app/domain/invoice.py': 'from .value import Value\nimport dataclasses\n',
  'app/domain/value.py': 'Value = int\n',
  'app/infra/__init__.py': '',
  'app/infra/repo.py': 'from sqlalchemy.orm import Session\nfrom app.domain.invoice import Value\n',
};

test('parseImports: JS multi-line, require, dynamic import, export from and comments', () => {
  const text = [
    '// import fake from "commented";',
    '/* import other from "block"; */',
    'import {',
    '  a,',
    '  b,',
    "} from './multi';",
    "import type { T } from '@scope/pkg/sub';",
    "import 'side-effect';",
    "const x = require('express');",
    "export * from './reexport';",
    "const y = await import('node:fs');",
    "const glob = 'src/**/*.ts';",
    "const s = ' /* not a comment';",
    "import z from 'after-the-string';",
    "z(); // import 'comment-at-end';",
    "const code = \"import x from 'inside-a-string'\";",
  ].join('\n');
  assert.deepEqual(parseImports(text, 'src/a.ts').map(({ specifier, line }) => [specifier, line]), [
    ['./multi', 3], ['@scope/pkg/sub', 7], ['side-effect', 8], ['express', 9], ['./reexport', 10], ['node:fs', 11], ['after-the-string', 14],
  ]);
});

test('parseImports: Python absolute, alias, relative and multi-line from', () => {
  const text = 'import os.path as p, sys\n# import commented\nfrom . import repo\nfrom ..pkg import (\n    y,\n    z,\n)\nfrom sqlalchemy.orm import Session\nimport os; import requests\n';
  assert.deepEqual(parseImports(text, 'app/x/m.py').map(({ specifier, line, names }) => [specifier, line, names ?? null]), [
    ['os.path', 1, null], ['sys', 1, null], ['.', 3, ['repo']], ['..pkg', 4, ['y', 'z']], ['sqlalchemy.orm', 8, ['Session']], ['os', 9, null], ['requests', 9, null],
  ]);
});

test('globToRegExp: ** crosses folders, * and ? stay in one segment', () => {
  assert.ok(globToRegExp('src/billing/domain/**').test('src/billing/domain/a/b.ts'));
  assert.ok(!globToRegExp('src/billing/domain/**').test('src/billing/domainx/b.ts'));
  assert.ok(globToRegExp('src/*').test('src/a'));
  assert.ok(!globToRegExp('src/*').test('src/a/b.ts'));
  assert.ok(globToRegExp('**/*.t?').test('x/y/z.ts'));
});

test('JS/TS: domain importing infra and express is blocked with the fix; clean version passes', () => {
  withProject(jsClean, (_dir, run) => assert.equal(run().status, 0));
  const dirty = {
    ...jsClean,
    'src/billing/domain/invoice.ts': "import { Value } from './value';\nimport express from 'express';\nimport { r } from '../infra/repo';\n",
  };
  withProject(dirty, (_dir, run) => {
    const result = run();
    assert.equal(result.status, 1, result.stderr);
    const out = result.stdout + result.stderr;
    assert.match(out, /approximate scanner/);
    assert.match(out, /src\/billing\/domain\/invoice\.ts:2 .*express/);
    assert.match(out, /src\/billing\/domain\/invoice\.ts:3 /);
    assert.ok(out.includes(`Fix: ${FIX}`));
    const json = JSON.parse(run('--json').stdout);
    assert.deepEqual(json.violations.map((v) => v.key).sort(), [
      'domain-does-not-depend-on-outside|src/billing/domain/invoice.ts|external:web:express',
      'domain-does-not-depend-on-outside|src/billing/domain/invoice.ts|src/billing/infra/repo.ts',
    ]);
  });
});

test('Python: domain importing sqlalchemy and app.infra is blocked; clean version passes', () => {
  withProject(pyClean, (_dir, run) => assert.equal(run().status, 0));
  const dirty = { ...pyClean, 'app/domain/invoice.py': 'from .value import Value\nimport sqlalchemy\nfrom app.infra import repo\n' };
  withProject(dirty, (_dir, run) => {
    const result = run('--json');
    assert.equal(result.status, 1, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.deepEqual(json.violations.map((v) => [v.key, v.line]).sort(), [
      ['domain-does-not-depend-on-outside|app/domain/invoice.py|app/infra/repo.py', 3],
      ['domain-does-not-depend-on-outside|app/domain/invoice.py|external:db:sqlalchemy', 2],
    ]);
    assert.ok(json.violations.every((v) => v.message.includes(`Fix: ${FIX}`)));
  });
  const withRoots = {
    'keel/architecture.json': { ...architecture('backend/app'), roots: ['backend'] },
    'backend/app/__init__.py': '',
    'backend/app/domain/invoice.py': 'from app.infra.repo import Repo\nimport os; import requests\n',
    'backend/app/infra/repo.py': 'Repo = object\n',
  };
  withProject(withRoots, (_dir, run) => {
    const json = JSON.parse(run('--json').stdout);
    assert.deepEqual(json.violations.map((v) => v.key).sort(), [
      'domain-does-not-depend-on-outside|backend/app/domain/invoice.py|backend/app/infra/repo.py',
      'domain-does-not-depend-on-outside|backend/app/domain/invoice.py|external:http:requests',
    ]);
  });
});

test('invalid configuration exits with 2: rule with zero files, unknown component or category', () => {
  withProject({ ...jsClean, 'keel/architecture.json': architecture('src/other') }, (_dir, run) => {
    const result = run();
    assert.equal(result.status, 2);
    assert.match(result.stderr, /rule domain-does-not-depend-on-outside matches zero files/);
  });
  const files = new Map([['src/a.ts', '']]);
  const bad = (rule) => () => checkArchitecture({ config: { components: { a: ['src/**'] }, rules: [rule] }, files });
  assert.throws(bad({ name: 'r', from: 'a', forbid: ['b'], fix: 'x' }), /unknown component "b"/);
  assert.throws(bad({ name: 'r', from: 'a', forbid: ['external:queue'], fix: 'x' }), /unknown external category "queue"/);
  assert.throws(bad({ name: 'r', from: 'a', forbid: [] }), /rule r without "fix"/);
  const typo = { components: { a: ['src/**'], b: ['src/infrastructure/**'] }, rules: [{ name: 'r', from: 'a', forbid: ['b'], fix: 'x' }] };
  assert.throws(() => checkArchitecture({ config: typo, files }), /rule r: component b in "forbid" matches zero files/);
  const cycles = { components: { a: ['src/**'] }, rules: [], noCycles: ['pkg/*'] };
  assert.throws(() => checkArchitecture({ config: cycles, files }), /noCycles: "pkg\/\*" matches no module/);
});

test('baseline tolerates a known violation, blocks the new one and points out the one that can leave', () => {
  const dirty = {
    ...jsClean,
    'src/billing/domain/invoice.ts': "import express from 'express';\n",
    'keel/arch-baseline.txt': '# known\ndomain-does-not-depend-on-outside|src/billing/domain/invoice.ts|external:web:express\ndomain-does-not-depend-on-outside|src/billing/domain/old.ts|external:db:pg\n',
  };
  withProject(dirty, (_dir, run) => {
    const known = run();
    assert.equal(known.status, 0, known.stdout + known.stderr);
    assert.match(known.stdout, /can leave the baseline: domain-does-not-depend-on-outside\|src\/billing\/domain\/old\.ts\|external:db:pg/);
  });
  withProject({ ...dirty, 'src/billing/domain/value.ts': "import axios from 'axios';\n" }, (_dir, run) => {
    const result = run('--json');
    assert.equal(result.status, 1);
    const json = JSON.parse(result.stdout);
    assert.deepEqual(json.violations.map((v) => v.key), ['domain-does-not-depend-on-outside|src/billing/domain/value.ts|external:http:axios']);
    assert.equal(json.known.length, 1);
    assert.deepEqual(json.stale, ['domain-does-not-depend-on-outside|src/billing/domain/old.ts|external:db:pg']);
  });
});

test('--write-baseline writes the current keys sorted and --files filters by file', () => {
  const dirty = { ...jsClean, 'src/billing/domain/invoice.ts': "import express from 'express';\nimport { r } from '../infra/repo';\n" };
  withProject(dirty, (dir, run) => {
    assert.equal(run('--files', 'src/billing/infra/repo.ts').status, 0);
    assert.equal(run('--files', 'src/billing/domain/invoice.ts').status, 1);
    assert.equal(run('--write-baseline').status, 0);
    const lines = readFileSync(join(dir, 'keel', 'arch-baseline.txt'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
    assert.deepEqual(lines, [
      'domain-does-not-depend-on-outside|src/billing/domain/invoice.ts|external:web:express',
      'domain-does-not-depend-on-outside|src/billing/domain/invoice.ts|src/billing/infra/repo.ts',
    ]);
    assert.equal(run().status, 0);
  });
});

test('JS: tsconfig aliases, trailing slash, externals added to the defaults and unresolved imports', () => {
  const project = {
    ...jsClean,
    'keel/architecture.json': { ...architecture('src/billing'), externals: { db: ['drizzle-orm'] } },
    'tsconfig.json': '{\n  // comment\n  "compilerOptions": {\n    "baseUrl": ".",\n    "paths": { "@/*": ["src/*"], },\n  },\n}\n',
    'src/billing/infra/index.ts': 'export const i = 1;\n',
    'src/billing/domain/invoice.ts': "import { r } from '@/billing/infra/repo';\nimport { i } from '../infra/';\nimport { Pool } from 'pg';\nimport { drizzle } from 'drizzle-orm';\nimport { x } from '@/does/not-exist';\n",
  };
  withProject(project, (dir, run) => {
    const json = JSON.parse(run('--json').stdout);
    const rule = 'domain-does-not-depend-on-outside|src/billing/domain/invoice.ts|';
    assert.deepEqual(json.violations.map((v) => v.key).sort(), [
      `${rule}external:db:drizzle-orm`, `${rule}external:db:pg`, `${rule}src/billing/infra/index.ts`, `${rule}src/billing/infra/repo.ts`,
    ]);
    assert.deepEqual(json.unresolved, [{ file: 'src/billing/domain/invoice.ts', line: 5, specifier: '@/does/not-exist' }]);
    assert.match(run().stdout, /unresolved imports \(approximate\)/);
    writeFileSync(join(dir, 'tsconfig.json'), '{ broken');
    const broken = run();
    assert.equal(broken.status, 1);
    assert.match(broken.stdout, /tsconfig\.json ignored/);
  });
});

test('CLI works when called through a symbolic link', (t) => {
  withProject({}, (dir) => {
    const link = join(dir, 'arch-check.mjs');
    try {
      symlinkSync(script, link);
    } catch {
      t.skip('no permission to create a symbolic link');
      return;
    }
    const result = spawnSync(process.execPath, [link, '--root', dir], { encoding: 'utf8' });
    assert.match(result.stdout, /architecture check skipped/);
  });
});

test('cycle between src/a and src/b is detected with a canonical key', () => {
  const config = { components: { all: ['src/**'] }, rules: [], noCycles: ['src/*'] };
  const files = new Map([
    ['src/b/index.ts', "import { a } from '../a/x.js';\nexport const b = 1;\n"],
    ['src/a/x.ts', "import { b } from '../b';\nexport const a = 2;\n"],
    ['src/c/y.ts', "import { a } from '../a/x';\n"],
  ]);
  const { violations } = checkArchitecture({ config, files });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].key, 'noCycles|src/a -> src/b -> src/a');
  assert.match(violations[0].message, /Fix: break the cycle/);
});

test('without keel/architecture.json the check is skipped with exit 0', () => {
  withProject({ 'src/a.ts': "import 'express';\n" }, (_dir, run) => {
    const result = run();
    assert.equal(result.status, 0);
    assert.match(result.stdout, /no keel\/architecture\.json: architecture check skipped/);
    assert.deepEqual(JSON.parse(run('--json').stdout), { status: 'skipped' });
  });
});

test('Keel itself passes its keel/architecture.json', () => {
  const result = spawnSync(process.execPath, [join(root, 'scripts', 'arch-check.mjs')], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});

test('planned component without files is pending and its rules wait', () => {
  const config = {
    components: {
      domain: ['src/domain/**'],
      infra: ['src/infra/**'],
      api: { globs: ['src/api/**'], planned: true },
    },
    rules: [
      { name: 'api-isolated', from: 'api', forbid: ['infra'], fix: 'x' },
      { name: 'domain-isolated', from: 'domain', forbid: ['api', 'infra'], fix: 'y' },
    ],
  };
  withProject({ 'keel/architecture.json': config, 'src/domain/a.ts': 'export const a = 1;\n', 'src/infra/db.ts': 'export const db = 1;\n' }, (dir, run) => {
    const empty = run('--json');
    assert.equal(empty.status, 0, empty.stdout + empty.stderr);
    const json = JSON.parse(empty.stdout);
    assert.deepEqual(json.pending, ['api']);
    assert.deepEqual(json.violations, []);
    assert.match(run().stdout, /planned component\(s\) without files \(pending\): api/);

    writeFileSync(join(dir, 'src', 'domain', 'a.ts'), "import { db } from '../infra/db';\n");
    const active = JSON.parse(run('--json').stdout);
    assert.deepEqual(active.violations.map((v) => v.key), ['domain-isolated|src/domain/a.ts|src/infra/db.ts'], 'the active target is checked beside a pending one');

    mkdirSync(join(dir, 'src', 'api'));
    writeFileSync(join(dir, 'src', 'api', 'h.ts'), "import { db } from '../infra/db';\n");
    const first = JSON.parse(run('--json').stdout);
    assert.deepEqual(first.pending, []);
    assert.ok(first.violations.some((v) => v.key === 'api-isolated|src/api/h.ts|src/infra/db.ts'), 'the rule applies with the first file');
  });
  const files = new Map([['src/a.ts', '']]);
  const check = (components) => () => checkArchitecture({ config: { components, rules: [{ name: 'r', from: 'a', forbid: [], fix: 'x' }] }, files });
  assert.throws(check({ a: ['lib/**'] }), /rule r matches zero files/);
  assert.throws(check({ a: { globs: ['src/**'], planned: 'yes' } }), /component a: "planned" must be true or false/);
  assert.throws(check({ a: { planned: true } }), /component a: expected a list of globs/);
  assert.throws(check({ a: { globs: ['src/**'], planned: null } }), /component a: "planned" must be true or false/);
  assert.throws(check({ a: { globs: ['lib/**'] } }), /rule r matches zero files/, 'an object without planned is a common component');
});

test('covered file outside every component is an orphan', () => {
  const config = {
    components: { domain: ['src/domain/**'], api: { globs: ['src/api/**'], planned: true } },
    rules: [],
    coverage: ['src/**'],
    baseline: 'keel/arch-baseline.txt',
  };
  const project = {
    'keel/architecture.json': config,
    'src/domain/a.ts': 'export const a = 1;\n',
    'src/novo/x.js': 'export const x = 1;\n',
    'scripts/tool.mjs': 'export const t = 1;\n',
  };
  withProject(project, (dir, run) => {
    const result = run('--json');
    assert.equal(result.status, 0, 'an orphan alone does not fail the check');
    const json = JSON.parse(result.stdout);
    assert.deepEqual(json.orphans.map((o) => o.key), ['orphan|src/novo/x.js']);
    assert.match(json.orphans[0].message, /src\/novo\/x\.js .*no component.*declare the component or move the file/);
    assert.deepEqual(json.violations, []);
    assert.match(run().stdout, /orphan file\(s\).*\n- src\/novo\/x\.js/);
    assert.deepEqual(JSON.parse(run('--json', '--files', 'src/domain/a.ts').stdout).orphans, []);

    assert.equal(run('--write-baseline').status, 0);
    const lines = readFileSync(join(dir, 'keel', 'arch-baseline.txt'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
    assert.deepEqual(lines, ['orphan|src/novo/x.js']);
    const known = JSON.parse(run('--json').stdout);
    assert.deepEqual(known.orphans, []);
    assert.deepEqual(known.known.map((v) => v.key), ['orphan|src/novo/x.js']);

    rmSync(join(dir, 'src', 'novo'), { recursive: true });
    mkdirSync(join(dir, 'src', 'api'));
    writeFileSync(join(dir, 'src', 'api', 'h.ts'), 'export const h = 1;\n');
    const moved = JSON.parse(run('--json').stdout);
    assert.deepEqual(moved.orphans, [], 'a file of a planned component is not an orphan');
    assert.deepEqual(moved.pending, []);
    assert.deepEqual(moved.stale, ['orphan|src/novo/x.js']);
  });
  const files = new Map([['src/a.ts', '']]);
  assert.throws(() => checkArchitecture({ config: { components: { a: ['src/**'] }, coverage: 'src/**' }, files }), /"coverage" must be a list of globs/);
});
