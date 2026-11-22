import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { root, read } from './helpers.mjs';
import { applyBlock, removeBlock, restructureCheck, scan, review, check, run } from '../scripts/keel-context.mjs';

const script = join(root, 'scripts', 'keel-context.mjs');
const BOM = '\uFEFF';

function project(files) {
  const dir = mkdtempSync(join(tmpdir(), 'keel-context-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

function hashes(dir, base = dir) {
  const out = {};
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) Object.assign(out, hashes(full, base));
    else out[full.slice(base.length)] = createHash('sha256').update(readFileSync(full)).digest('hex');
  }
  return out;
}

function cli(dir, ...args) {
  return spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: 'utf8' });
}

const block = (lang) => read(`templates/keel-block.${lang}.md`);

test('block templates have markers, LF, at most 6 lines and 700 bytes between the markers', () => {
  for (const lang of ['pt-BR', 'en']) {
    const text = block(lang);
    const lines = text.split('\n');
    assert.equal(lines.at(-1), '', `${lang}: ends without a line break`);
    assert.equal(lines[0], '<!-- keel:start -->');
    assert.equal(lines.at(-2), '<!-- keel:end -->');
    const inner = lines.slice(1, -2);
    assert.ok(inner.length <= 6, `${lang}: ${inner.length} lines`);
    assert.ok(Buffer.byteLength(inner.join('\n')) <= 700, `${lang}: ${Buffer.byteLength(inner.join('\n'))} bytes`);
  }
});

test('review finds "commit directly" in AGENTS.md with file, line and literal quote, without changing anything', () => {
  const dir = project({
    'AGENTS.md': '# App\n\n## Rules\n- Use pnpm.\n  - Commit directly to main after small fixes.\n',
    'package.json': '{"scripts":{"test":"node --test"}}\n',
  });
  try {
    const before = hashes(dir);
    const result = cli(dir, 'review');
    assert.equal(result.status, 0, result.stderr);
    const { findings } = JSON.parse(result.stdout);
    const conflict = findings.find((f) => f.severity === 'conflict');
    assert.ok(conflict, result.stdout);
    assert.equal(conflict.file, 'AGENTS.md');
    assert.equal(conflict.line, 5);
    assert.equal(conflict.quote, '- Commit directly to main after small fixes.');
    assert.match(conflict.message, /outside Keel stories/);
    assert.equal(cli(dir, 'quote', 'AGENTS.md', '5', conflict.quote).status, 0);
    assert.equal(cli(dir, 'quote', 'AGENTS.md', '4', conflict.quote).status, 1);
    assert.deepEqual(hashes(dir), before);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('review warns that Claude does not see AGENTS.md only when @AGENTS.md is missing', () => {
  const visibility = (files) => {
    const dir = project(files);
    try { return review(dir).findings.filter((f) => f.kind === 'visibility'); } finally { rmSync(dir, { recursive: true, force: true }); }
  };
  const nested = visibility({ 'AGENTS.md': '# A\n', '.claude/CLAUDE.md': '# C\n' });
  assert.equal(nested[0].severity, 'warning');
  assert.match(nested[0].message, /`@\.\.\/AGENTS\.md`/);
  const missing = visibility({ 'AGENTS.md': '# A\n', 'CLAUDE.md': '# C\n' });
  assert.equal(missing.length, 1);
  assert.equal(missing[0].severity, 'warning');
  assert.match(missing[0].message, /@AGENTS\.md/);
  assert.ok(visibility({ 'AGENTS.md': '# A\n', 'CLAUDE.md': '@AGENTS.md\n# C\n' }).every((f) => f.severity === 'info'));
  assert.ok(visibility({ 'AGENTS.md': '# A\n' }).every((f) => f.severity === 'info'));
});

test('review flags a dead command in code and accepts a script that exists', () => {
  const dir = project({
    'AGENTS.md': '# A\n\n- Test: `npm test`\n- Lint: `npm run lint`\n\n```sh\nmake check\nnode scripts/missing.mjs\n```\n',
    'package.json': '{"scripts":{"test":"node --test"}}\n',
    'Makefile': 'check:\n\techo ok\n',
  });
  try {
    const dead = review(dir).findings.filter((f) => f.kind === 'dead-command');
    assert.deepEqual(dead.map((f) => [f.line, f.quote]), [[4, 'npm run lint'], [8, 'node scripts/missing.mjs']]);
    assert.ok(dead.every((f) => f.severity === 'warning' && f.file === 'AGENTS.md'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('scan reports EOL, BOM, import, other tools\' blocks and other agents', () => {
  const dir = project({
    'AGENTS.md': `${BOM}# A\r\n<!-- SPECKIT START -->\r\nx\r\n<!-- SPECKIT END -->\r\n`,
    'CLAUDE.md': '@./AGENTS.md\n',
    'pkg/a/AGENTS.md': '# nested\n',
    'node_modules/x/AGENTS.md': '# ignored\n',
    'GEMINI.md': '# g\n',
  });
  try {
    const facts = scan(dir);
    const agents = facts.files.find((f) => f.path === 'AGENTS.md');
    assert.deepEqual([agents.eol, agents.bom, agents.lines, agents.keelBlock, agents.otherBlocks], ['crlf', true, 4, 'none', ['SPECKIT']]);
    assert.ok(facts.claudeImportsAgents);
    assert.deepEqual(facts.files.map((f) => f.path).sort(), ['AGENTS.md', 'CLAUDE.md', 'pkg/a/AGENTS.md']);
    assert.deepEqual(facts.otherAgents, ['GEMINI.md']);
    const others = review(dir).findings.filter((f) => f.kind === 'other-agents');
    assert.equal(others.length, 1);
    assert.equal(others[0].severity, 'info');
    assert.match(others[0].message, /GEMINI\.md/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('block apply on a file with BOM and CRLF keeps the outside bytes, is idempotent and remove restores the original', () => {
  const original = `${BOM}# Projeto\r\n\r\nRegras do projeto: não commitar segredos.\r\n`;
  const applied = applyBlock(original, { lang: 'pt-BR', templates: { 'pt-BR': block('pt-BR') } });
  assert.ok(applied.startsWith(original), 'outside bytes changed');
  const added = applied.slice(original.length);
  assert.ok(added.startsWith('\r\n<!-- keel:start -->\r\n'));
  assert.ok(added.endsWith('<!-- keel:end -->\r\n'));
  assert.ok(!/[^\r]\n/.test(added), 'block does not use CRLF');
  assert.equal(applyBlock(applied, { lang: 'pt-BR', templates: { 'pt-BR': block('pt-BR') } }), applied);
  assert.equal(removeBlock(applied), original);
  for (const text of ['abc\n\n', 'abc\r\n\r\n', 'abc\n', '']) {
    assert.equal(removeBlock(applyBlock(text, { lang: 'en', templates: { en: block('en') } })), text, JSON.stringify(text));
  }
  // Without a final line break there is no way to tell later whether it belonged to the file: remove leaves "abc\n".
  assert.equal(removeBlock(applyBlock('abc', { lang: 'en', templates: { en: block('en') } })), 'abc\n');
});

test('block apply aborts without writing on unbalanced or duplicated markers', () => {
  const bad = '# A\n<!-- keel:start -->\nx\n<!-- keel:start -->\ny\n<!-- keel:end -->\n';
  const dir = project({ 'AGENTS.md': bad });
  try {
    const result = cli(dir, 'block', 'apply', '--file', 'AGENTS.md', '--lang', 'en');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /marker/);
    assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), bad);
    assert.throws(() => applyBlock('<!-- keel:end -->\n<!-- keel:start -->\n', { lang: 'en' }), /marker/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('block apply never creates CLAUDE.md with AGENTS.md present and only creates a file with --create', () => {
  const dir = project({ 'AGENTS.md': '# A\n' });
  try {
    assert.throws(() => run(['block', 'apply', '--file', 'CLAUDE.md', '--create'], dir), /AGENTS\.md/);
    assert.ok(!existsSync(join(dir, 'CLAUDE.md')));
    rmSync(join(dir, 'AGENTS.md'));
    assert.throws(() => run(['block', 'apply', '--file', 'AGENTS.md'], dir), /--create/);
    run(['block', 'apply', '--file', 'AGENTS.md', '--create', '--lang', 'en'], dir);
    assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), block('en'));
    writeFileSync(join(dir, 'CLAUDE.md'), '@AGENTS.md\n');
    assert.throws(() => run(['block', 'apply', '--file', 'CLAUDE.md', '--lang', 'en'], dir), /already has the keel block/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('block remove takes out only the block and keeps the file, even empty; a BOM before the block on line 1 stays', () => {
  const withBom = `${BOM}${block('en')}`;
  assert.equal(applyBlock(withBom, { lang: 'en', templates: { en: block('en') } }), withBom);
  assert.equal(removeBlock(withBom), BOM);
  const dir = project({ 'AGENTS.md': block('en') });
  try {
    run(['block', 'remove', '--file', 'AGENTS.md'], dir);
    assert.equal(readFileSync(join(dir, 'AGENTS.md'), 'utf8'), '');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('block apply through a symlink writes to the target, keeps the link and warns', (t) => {
  const dir = project({ 'AGENTS.md': '# Project\n\nUse the tests.\n' });
  try {
    try { symlinkSync('AGENTS.md', join(dir, 'CLAUDE.md')); } catch { t.skip('symlink unavailable'); return; }
    const facts = scan(dir);
    assert.equal(facts.files.find((f) => f.path === 'CLAUDE.md').symlink, 'AGENTS.md');
    assert.ok(review(dir).findings.some((f) => f.kind === 'visibility' && /double load/.test(f.message)));
    const { output } = run(['block', 'apply', '--file', 'CLAUDE.md', '--lang', 'en'], dir);
    assert.match(output.warnings.join(' '), /symlink/);
    assert.ok(readFileSync(join(dir, 'AGENTS.md'), 'utf8').endsWith(block('en')));
    assert.equal(scan(dir).files.find((f) => f.path === 'CLAUDE.md').symlink, 'AGENTS.md');
    assert.equal(check(dir).ok, true);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('import-agents puts @AGENTS.md at the top after the BOM and refuses to repeat', () => {
  const dir = project({ 'AGENTS.md': '# A\n', 'CLAUDE.md': `${BOM}# C\r\nx\r\n` });
  try {
    run(['import-agents'], dir);
    assert.equal(readFileSync(join(dir, 'CLAUDE.md'), 'utf8'), `${BOM}@AGENTS.md\r\n# C\r\nx\r\n`);
    assert.throws(() => run(['import-agents'], dir), /already imports/);
    mkdirSync(join(dir, '.claude'));
    writeFileSync(join(dir, '.claude', 'CLAUDE.md'), '# C\n');
    run(['import-agents', '--file', '.claude/CLAUDE.md'], dir);
    assert.equal(readFileSync(join(dir, '.claude', 'CLAUDE.md'), 'utf8'), '@../AGENTS.md\n# C\n');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('restructure-check accepts a proposal that only moves and removes and refuses a rewritten or duplicated line', () => {
  const original = '# App\nIntro.\n- Run `pnpm test` before finishing.\n- Never edit dist/.\n- Old note.\n';
  const moved = '# App\nIntro.\n\n## Commands\n- Run `pnpm test` before finishing.\n\n## Boundaries\n- Never edit dist/.\n';
  const ok = restructureCheck(original, moved);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.removed, [{ line: 5, text: '- Old note.' }]);
  const rewritten = restructureCheck(original, '# App\n- Run `pnpm test` always.\n- Never edit dist/.\n- Never edit dist/.\n');
  assert.equal(rewritten.ok, false);
  assert.deepEqual(rewritten.added, [{ line: 2, text: '- Run `pnpm test` always.' }, { line: 4, text: '- Never edit dist/.' }]);
});

test('check passes with the template block and fails with a hand-edited block', () => {
  const dir = project({ 'AGENTS.md': `# A\n\n${block('pt-BR')}` });
  try {
    assert.equal(check(dir).ok, true);
    assert.equal(cli(dir, 'check').status, 0);
    writeFileSync(join(dir, 'AGENTS.md'), `# A\n\n${block('pt-BR').replace('à mão', 'quando quiser')}`);
    const result = cli(dir, 'check');
    assert.equal(result.status, 1);
    assert.match(JSON.parse(result.stdout).errors.join(' '), /template/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('the CLI runs when called through a symlink to the script', (t) => {
  const dir = project({ 'AGENTS.md': '# A\n' });
  try {
    try { symlinkSync(script, join(dir, 'link.mjs')); } catch { t.skip('symlink unavailable'); return; }
    const result = spawnSync(process.execPath, [join(dir, 'link.mjs'), 'scan'], { cwd: dir, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout).files.map((f) => f.path), ['AGENTS.md']);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

const findingsOf = (files, kind) => {
  const dir = project(files);
  try { return review(dir).findings.filter((f) => f.kind === kind); } finally { rmSync(dir, { recursive: true, force: true }); }
};

test('review warns when no instruction file names a test, build or lint command', () => {
  const prose = findingsOf({ 'AGENTS.md': '# App\n\nA small app. Be careful with the database.\n' }, 'commands');
  assert.equal(prose.length, 1);
  assert.equal(prose[0].severity, 'warning');
  const pkg = { 'package.json': '{"scripts":{"test":"node --test"}}\n' };
  assert.deepEqual(findingsOf({ 'AGENTS.md': '# App\n\n- Test: `npm test`\n', ...pkg }, 'commands'), []);
  assert.deepEqual(findingsOf({ 'AGENTS.md': '# App\n\n```sh\npytest -q\n```\n' }, 'commands'), []);
  assert.deepEqual(findingsOf({ 'CLAUDE.md': '@AGENTS.md\n', 'AGENTS.md': '# A\n\n`make lint`\n', 'Makefile': 'lint:\n\ttrue\n' }, 'commands'), []);
  assert.deepEqual(findingsOf({ 'README.md': '# none\n' }, 'commands'), []);
});

test('review lists the template sections missing from the main file, with Portuguese synonyms', () => {
  const pt = '# App\n\n## Comandos\n\n## Convenções\n\n## Limites\n\n## Pronto quando\n\n## Armadilhas\n\n## Mais detalhes\n';
  assert.deepEqual(findingsOf({ 'AGENTS.md': pt, 'CLAUDE.md': '@AGENTS.md\n## Other\n' }, 'sections'), []);
  const sparse = findingsOf({ 'AGENTS.md': '# App\n\n## Setup\n' }, 'sections');
  assert.equal(sparse.length, 1);
  assert.equal(sparse[0].severity, 'info');
  assert.equal(sparse[0].file, 'AGENTS.md');
  assert.match(sparse[0].message, /Conventions, Boundaries, Done when, Pitfalls, More details/);
  assert.doesNotMatch(sparse[0].message, /Commands/);
  assert.match(sparse[0].message, /restructur/);
  const two = findingsOf({ 'CLAUDE.md': '# A\n## Commands\n## Conventions\n## Boundaries\n## Done when\n' }, 'sections');
  assert.equal(two[0].file, 'CLAUDE.md');
  assert.doesNotMatch(two[0].message, /restructur/);
  assert.deepEqual(findingsOf({ 'README.md': '# none\n' }, 'sections'), []);
});

test('review flags piled-up emphasis and too many list items', () => {
  const shout = (n) => Array.from({ length: n }, (_, i) => `IMPORTANT: rule ${i}.`).join('\n');
  const loud = findingsOf({ 'AGENTS.md': `# A\n${shout(5)}\n` }, 'emphasis');
  assert.equal(loud.length, 1);
  assert.equal(loud[0].severity, 'info');
  assert.match(loud[0].message, /\b5\b/);
  assert.deepEqual(findingsOf({ 'AGENTS.md': `# A\n${shout(4)}\n` }, 'emphasis'), []);
  assert.deepEqual(findingsOf({ 'AGENTS.md': '# A\n```\nNEVER NEVER NEVER\nNEVER NEVER\n```\n' }, 'emphasis'), []);
  const items = (n) => Array.from({ length: n }, (_, i) => `- rule ${i}`).join('\n');
  const many = findingsOf({ 'AGENTS.md': `# A\n${items(40)}\n` }, 'rules');
  assert.equal(many.length, 1);
  assert.equal(many[0].severity, 'info');
  assert.deepEqual(findingsOf({ 'AGENTS.md': `# A\n${items(39)}\n` }, 'rules'), []);
});
