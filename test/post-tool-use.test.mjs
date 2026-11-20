import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, read, readJson } from './helpers.mjs';

const hook = join(root, 'scripts', 'hooks', 'post-tool-use.mjs');

const architecture = {
  components: { dominio: ['src/dominio/**'], infra: ['src/infra/**'] },
  rules: [{ name: 'dominio-isolado', from: 'dominio', forbid: ['infra'], fix: 'Use uma porta no domínio.' }],
  noCycles: [],
  baseline: 'keel/arch-baseline.txt',
};

function write(dir, path, text) {
  mkdirSync(join(dir, path, '..'), { recursive: true });
  writeFileSync(join(dir, path), text);
}

function run(dir, file) {
  const result = spawnSync(process.execPath, [hook], {
    input: JSON.stringify({ hook_event_name: 'PostToolUse', tool_name: 'Edit', tool_input: { file_path: join(dir, file) }, cwd: dir }),
    encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir },
  });
  return { status: result.status, output: result.stdout ? JSON.parse(result.stdout) : null };
}

test('PostToolUse devolve a violação nova do arquivo editado e cala no resto', () => {
  const dir = mkdtempSync(join(tmpdir(), 'keel-post-'));
  try {
    write(dir, 'src/infra/repo.js', 'export const repo = {};\n');
    write(dir, 'src/dominio/fatura.js', "import { repo } from '../infra/repo.js';\n");
    write(dir, 'src/dominio/limpo.js', 'export const x = 1;\n');
    assert.deepEqual(run(dir, 'src/dominio/fatura.js'), { status: 0, output: null }, 'sem architecture.json não checa');
    write(dir, 'keel/architecture.json', JSON.stringify(architecture));
    const planted = run(dir, 'src/dominio/fatura.js');
    assert.equal(planted.status, 0);
    assert.equal(planted.output.decision, 'block');
    assert.match(planted.output.reason, /src\/dominio\/fatura\.js:1.*Correção: Use uma porta no domínio\./s);
    assert.deepEqual(run(dir, 'src/dominio/limpo.js'), { status: 0, output: null });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('PostToolUse avisa architecture.json inválido sem quebrar a sessão', () => {
  const dir = mkdtempSync(join(tmpdir(), 'keel-post-'));
  try {
    write(dir, 'src/dominio/a.js', 'export const a = 1;\n');
    write(dir, 'keel/architecture.json', '{ quebrado');
    const edit = run(dir, 'src/dominio/a.js');
    assert.equal(edit.status, 0);
    assert.match(edit.output.hookSpecificOutput.additionalContext, /architecture\.json/);
    const config = run(dir, 'keel/architecture.json');
    assert.equal(config.output.decision, 'block');
    const empty = spawnSync(process.execPath, [hook], { input: '', encoding: 'utf8', env: { ...process.env, CLAUDE_PROJECT_DIR: dir } });
    assert.equal(empty.status, 0);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('PostToolUse avisa deriva do bloco do Keel ao editar AGENTS.md, sem bloquear', () => {
  const dir = mkdtempSync(join(tmpdir(), 'keel-post-'));
  try {
    const block = read('templates/keel-block.pt-BR.md').replace('à mão', 'como quiser');
    write(dir, 'AGENTS.md', `# App\n\n${block}`);
    const drift = run(dir, 'AGENTS.md');
    assert.equal(drift.status, 0);
    assert.equal(drift.output.decision, undefined);
    assert.match(drift.output.hookSpecificOutput.additionalContext, /keel-context\.mjs check/);
    write(dir, 'AGENTS.md', `# App\n\n${read('templates/keel-block.pt-BR.md')}`);
    assert.deepEqual(run(dir, 'AGENTS.md'), { status: 0, output: null });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('hooks.json registra o PostToolUse nas ferramentas de edição', () => {
  const entry = readJson('hooks/hooks.json').hooks.PostToolUse[0];
  assert.equal(entry.matcher, 'Write|Edit|MultiEdit');
  assert.match(entry.hooks[0].command, /\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/hooks\/post-tool-use\.mjs/);
});
