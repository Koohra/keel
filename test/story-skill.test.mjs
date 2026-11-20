import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { root, read, readJson, listFiles } from './helpers.mjs';
import { COMMANDS } from '../scripts/keel-state.mjs';

const skillFiles = listFiles().filter((f) => f.startsWith('skills/story/'));

function frontmatter(text) {
  const block = text.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
  return Object.fromEntries(block.split('\n').map((l) => l.match(/^([\w-]+):\s*(.*)$/)).filter(Boolean).map((m) => [m[1], m[2]]));
}

test('a skill story declara nome, descrição e só pré-autoriza os scripts do plugin', () => {
  const meta = frontmatter(read('skills/story/SKILL.md'));
  assert.equal(meta.name, 'story');
  assert.match(meta.description, /história/);
  assert.match(meta['allowed-tools'], /^Bash\(node "?\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/\*/);
});

test('cada fase da triagem à confirmação tem instruções na skill', () => {
  const phases = readJson('workflow/workflow.json').phases;
  for (const id of ['triage', 'reading', 'requirements', 'confirmation']) {
    const phase = phases.find((p) => p.id === id);
    assert.ok(existsSync(join(root, 'skills/story', phase.instructions)), `${id}: falta ${phase.instructions}`);
  }
});

test('comandos do keel-state.mjs e scripts citados pela skill existem', () => {
  for (const file of skillFiles) {
    const text = read(file);
    for (const [, script] of text.matchAll(/\$\{CLAUDE_PLUGIN_ROOT\}\/([\w/.-]+)/g)) {
      assert.ok(existsSync(join(root, script)), `${file}: ${script} não existe`);
    }
    for (const [, command] of text.matchAll(/keel-state\.mjs"? ([a-z]+)/g)) {
      assert.ok(COMMANDS.includes(command), `${file}: comando "${command}" não existe no keel-state.mjs`);
    }
  }
});

test('o revisor isolado só lê', () => {
  const meta = frontmatter(read('agents/reviewer.md'));
  assert.equal(meta.name, 'reviewer');
  assert.deepEqual(meta.tools.split(',').map((t) => t.trim()), ['Read', 'Grep', 'Glob']);
});
