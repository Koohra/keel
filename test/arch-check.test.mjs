import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { root } from './helpers.mjs';
import { parseImports, globToRegExp, checkArchitecture } from '../scripts/arch-check.mjs';

const script = join(root, 'scripts', 'arch-check.mjs');
const FIX = 'Declare uma porta no domínio e implemente-a em infra; passe-a por parâmetro.';

function architecture(base) {
  return {
    components: {
      dominio: [`${base}/dominio/**`],
      infra: [`${base}/infra/**`, `${base}/web/**`],
    },
    rules: [{ name: 'dominio-nao-depende-de-fora', from: 'dominio', forbid: ['infra', 'external:web', 'external:db', 'external:http'], fix: FIX }],
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
  'keel/architecture.json': architecture('src/cobranca'),
  'src/cobranca/dominio/fatura.ts': "import { Valor } from './valor';\nexport const f = (v: Valor) => v;\n",
  'src/cobranca/dominio/valor.ts': 'export type Valor = number;\n',
  'src/cobranca/infra/repo.ts': "import { f } from '../dominio/fatura.js';\nimport { Pool } from 'pg';\nexport const r = { f, Pool };\n",
};

const pyClean = {
  'keel/architecture.json': architecture('app'),
  'app/__init__.py': '',
  'app/dominio/__init__.py': '',
  'app/dominio/fatura.py': 'from .valor import Valor\nimport dataclasses\n',
  'app/dominio/valor.py': 'Valor = int\n',
  'app/infra/__init__.py': '',
  'app/infra/repo.py': 'from sqlalchemy.orm import Session\nfrom app.dominio.fatura import Valor\n',
};

test('parseImports: JS multi-linha, require, import dinâmico, export from e comentários', () => {
  const text = [
    '// import fake from "comentado";',
    '/* import outro from "bloco"; */',
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
    "const s = ' /* não é comentário';",
    "import z from 'depois-da-string';",
    "z(); // import 'comentario-no-fim';",
    "const code = \"import x from 'dentro-de-string'\";",
  ].join('\n');
  assert.deepEqual(parseImports(text, 'src/a.ts').map(({ specifier, line }) => [specifier, line]), [
    ['./multi', 3], ['@scope/pkg/sub', 7], ['side-effect', 8], ['express', 9], ['./reexport', 10], ['node:fs', 11], ['depois-da-string', 14],
  ]);
});

test('parseImports: Python absoluto, alias, relativo e from multi-linha', () => {
  const text = 'import os.path as p, sys\n# import comentado\nfrom . import repo\nfrom ..pkg import (\n    y,\n    z,\n)\nfrom sqlalchemy.orm import Session\nimport os; import requests\n';
  assert.deepEqual(parseImports(text, 'app/x/m.py').map(({ specifier, line, names }) => [specifier, line, names ?? null]), [
    ['os.path', 1, null], ['sys', 1, null], ['.', 3, ['repo']], ['..pkg', 4, ['y', 'z']], ['sqlalchemy.orm', 8, ['Session']], ['os', 9, null], ['requests', 9, null],
  ]);
});

test('globToRegExp: ** atravessa pastas, * e ? ficam num segmento', () => {
  assert.ok(globToRegExp('src/cobranca/dominio/**').test('src/cobranca/dominio/a/b.ts'));
  assert.ok(!globToRegExp('src/cobranca/dominio/**').test('src/cobranca/dominiox/b.ts'));
  assert.ok(globToRegExp('src/*').test('src/a'));
  assert.ok(!globToRegExp('src/*').test('src/a/b.ts'));
  assert.ok(globToRegExp('**/*.t?').test('x/y/z.ts'));
});

test('JS/TS: domínio importando infra e express é barrado com a correção; versão limpa passa', () => {
  withProject(jsClean, (_dir, run) => assert.equal(run().status, 0));
  const dirty = {
    ...jsClean,
    'src/cobranca/dominio/fatura.ts': "import { Valor } from './valor';\nimport express from 'express';\nimport { r } from '../infra/repo';\n",
  };
  withProject(dirty, (_dir, run) => {
    const result = run();
    assert.equal(result.status, 1, result.stderr);
    const out = result.stdout + result.stderr;
    assert.match(out, /varredor aproximado/);
    assert.match(out, /src\/cobranca\/dominio\/fatura\.ts:2 .*express/);
    assert.match(out, /src\/cobranca\/dominio\/fatura\.ts:3 /);
    assert.ok(out.includes(`Correção: ${FIX}`));
    const json = JSON.parse(run('--json').stdout);
    assert.deepEqual(json.violations.map((v) => v.key).sort(), [
      'dominio-nao-depende-de-fora|src/cobranca/dominio/fatura.ts|external:web:express',
      'dominio-nao-depende-de-fora|src/cobranca/dominio/fatura.ts|src/cobranca/infra/repo.ts',
    ]);
  });
});

test('Python: domínio importando sqlalchemy e app.infra é barrado; versão limpa passa', () => {
  withProject(pyClean, (_dir, run) => assert.equal(run().status, 0));
  const dirty = { ...pyClean, 'app/dominio/fatura.py': 'from .valor import Valor\nimport sqlalchemy\nfrom app.infra import repo\n' };
  withProject(dirty, (_dir, run) => {
    const result = run('--json');
    assert.equal(result.status, 1, result.stderr);
    const json = JSON.parse(result.stdout);
    assert.deepEqual(json.violations.map((v) => [v.key, v.line]).sort(), [
      ['dominio-nao-depende-de-fora|app/dominio/fatura.py|app/infra/repo.py', 3],
      ['dominio-nao-depende-de-fora|app/dominio/fatura.py|external:db:sqlalchemy', 2],
    ]);
    assert.ok(json.violations.every((v) => v.message.includes(`Correção: ${FIX}`)));
  });
  const withRoots = {
    'keel/architecture.json': { ...architecture('backend/app'), roots: ['backend'] },
    'backend/app/__init__.py': '',
    'backend/app/dominio/fatura.py': 'from app.infra.repo import Repo\nimport os; import requests\n',
    'backend/app/infra/repo.py': 'Repo = object\n',
  };
  withProject(withRoots, (_dir, run) => {
    const json = JSON.parse(run('--json').stdout);
    assert.deepEqual(json.violations.map((v) => v.key).sort(), [
      'dominio-nao-depende-de-fora|backend/app/dominio/fatura.py|backend/app/infra/repo.py',
      'dominio-nao-depende-de-fora|backend/app/dominio/fatura.py|external:http:requests',
    ]);
  });
});

test('configuração inválida sai com 2: regra com zero arquivos, componente ou categoria desconhecida', () => {
  withProject({ ...jsClean, 'keel/architecture.json': architecture('src/outro') }, (_dir, run) => {
    const result = run();
    assert.equal(result.status, 2);
    assert.match(result.stderr, /regra dominio-nao-depende-de-fora casa com zero arquivos/);
  });
  const files = new Map([['src/a.ts', '']]);
  const bad = (rule) => () => checkArchitecture({ config: { components: { a: ['src/**'] }, rules: [rule] }, files });
  assert.throws(bad({ name: 'r', from: 'a', forbid: ['b'], fix: 'x' }), /componente desconhecido "b"/);
  assert.throws(bad({ name: 'r', from: 'a', forbid: ['external:fila'], fix: 'x' }), /categoria externa desconhecida "fila"/);
  assert.throws(bad({ name: 'r', from: 'a', forbid: [] }), /regra r sem "fix"/);
  const typo = { components: { a: ['src/**'], b: ['src/infrastructure/**'] }, rules: [{ name: 'r', from: 'a', forbid: ['b'], fix: 'x' }] };
  assert.throws(() => checkArchitecture({ config: typo, files }), /regra r: componente b em "forbid" casa com zero arquivos/);
  const cycles = { components: { a: ['src/**'] }, rules: [], noCycles: ['pkg/*'] };
  assert.throws(() => checkArchitecture({ config: cycles, files }), /noCycles: "pkg\/\*" não casa com nenhum módulo/);
});

test('baseline tolera violação conhecida, barra a nova e aponta a que pode sair', () => {
  const dirty = {
    ...jsClean,
    'src/cobranca/dominio/fatura.ts': "import express from 'express';\n",
    'keel/arch-baseline.txt': '# conhecidas\ndominio-nao-depende-de-fora|src/cobranca/dominio/fatura.ts|external:web:express\ndominio-nao-depende-de-fora|src/cobranca/dominio/velho.ts|external:db:pg\n',
  };
  withProject(dirty, (_dir, run) => {
    const known = run();
    assert.equal(known.status, 0, known.stdout + known.stderr);
    assert.match(known.stdout, /pode sair da baseline: dominio-nao-depende-de-fora\|src\/cobranca\/dominio\/velho\.ts\|external:db:pg/);
  });
  withProject({ ...dirty, 'src/cobranca/dominio/valor.ts': "import axios from 'axios';\n" }, (_dir, run) => {
    const result = run('--json');
    assert.equal(result.status, 1);
    const json = JSON.parse(result.stdout);
    assert.deepEqual(json.violations.map((v) => v.key), ['dominio-nao-depende-de-fora|src/cobranca/dominio/valor.ts|external:http:axios']);
    assert.equal(json.known.length, 1);
    assert.deepEqual(json.stale, ['dominio-nao-depende-de-fora|src/cobranca/dominio/velho.ts|external:db:pg']);
  });
});

test('--write-baseline grava as chaves atuais ordenadas e --files filtra por arquivo', () => {
  const dirty = { ...jsClean, 'src/cobranca/dominio/fatura.ts': "import express from 'express';\nimport { r } from '../infra/repo';\n" };
  withProject(dirty, (dir, run) => {
    assert.equal(run('--files', 'src/cobranca/infra/repo.ts').status, 0);
    assert.equal(run('--files', 'src/cobranca/dominio/fatura.ts').status, 1);
    assert.equal(run('--write-baseline').status, 0);
    const lines = readFileSync(join(dir, 'keel', 'arch-baseline.txt'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#'));
    assert.deepEqual(lines, [
      'dominio-nao-depende-de-fora|src/cobranca/dominio/fatura.ts|external:web:express',
      'dominio-nao-depende-de-fora|src/cobranca/dominio/fatura.ts|src/cobranca/infra/repo.ts',
    ]);
    assert.equal(run().status, 0);
  });
});

test('JS: aliases do tsconfig, barra final, externals somados aos padrões e imports não resolvidos', () => {
  const project = {
    ...jsClean,
    'keel/architecture.json': { ...architecture('src/cobranca'), externals: { db: ['drizzle-orm'] } },
    'tsconfig.json': '{\n  // comentário\n  "compilerOptions": {\n    "baseUrl": ".",\n    "paths": { "@/*": ["src/*"], },\n  },\n}\n',
    'src/cobranca/infra/index.ts': 'export const i = 1;\n',
    'src/cobranca/dominio/fatura.ts': "import { r } from '@/cobranca/infra/repo';\nimport { i } from '../infra/';\nimport { Pool } from 'pg';\nimport { drizzle } from 'drizzle-orm';\nimport { x } from '@/nao/existe';\n",
  };
  withProject(project, (dir, run) => {
    const json = JSON.parse(run('--json').stdout);
    const rule = 'dominio-nao-depende-de-fora|src/cobranca/dominio/fatura.ts|';
    assert.deepEqual(json.violations.map((v) => v.key).sort(), [
      `${rule}external:db:drizzle-orm`, `${rule}external:db:pg`, `${rule}src/cobranca/infra/index.ts`, `${rule}src/cobranca/infra/repo.ts`,
    ]);
    assert.deepEqual(json.unresolved, [{ file: 'src/cobranca/dominio/fatura.ts', line: 5, specifier: '@/nao/existe' }]);
    assert.match(run().stdout, /imports não resolvidos \(aproximado\)/);
    writeFileSync(join(dir, 'tsconfig.json'), '{ quebrado');
    const broken = run();
    assert.equal(broken.status, 1);
    assert.match(broken.stdout, /tsconfig\.json ignorado/);
  });
});

test('CLI funciona chamado por um link simbólico', (t) => {
  withProject({}, (dir) => {
    const link = join(dir, 'arch-check.mjs');
    try {
      symlinkSync(script, link);
    } catch {
      t.skip('sem permissão para criar link simbólico');
      return;
    }
    const result = spawnSync(process.execPath, [link, '--root', dir], { encoding: 'utf8' });
    assert.match(result.stdout, /checagem de arquitetura pulada/);
  });
});

test('ciclo entre src/a e src/b é detectado com chave canônica', () => {
  const config = { components: { todos: ['src/**'] }, rules: [], noCycles: ['src/*'] };
  const files = new Map([
    ['src/b/index.ts', "import { a } from '../a/x.js';\nexport const b = 1;\n"],
    ['src/a/x.ts', "import { b } from '../b';\nexport const a = 2;\n"],
    ['src/c/y.ts', "import { a } from '../a/x';\n"],
  ]);
  const { violations } = checkArchitecture({ config, files });
  assert.equal(violations.length, 1);
  assert.equal(violations[0].key, 'noCycles|src/a -> src/b -> src/a');
  assert.match(violations[0].message, /Correção: quebre o ciclo/);
});

test('sem keel/architecture.json a checagem é pulada com saída 0', () => {
  withProject({ 'src/a.ts': "import 'express';\n" }, (_dir, run) => {
    const result = run();
    assert.equal(result.status, 0);
    assert.match(result.stdout, /sem keel\/architecture\.json: checagem de arquitetura pulada \(skipped\)/);
    assert.deepEqual(JSON.parse(run('--json').stdout), { status: 'skipped' });
  });
});

test('o próprio Keel passa no keel/architecture.json', () => {
  const result = spawnSync(process.execPath, [join(root, 'scripts', 'arch-check.mjs')], { cwd: root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stdout + result.stderr);
});
