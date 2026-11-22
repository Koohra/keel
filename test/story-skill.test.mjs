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

test('cada fase da triagem ao fechamento tem instruções na skill', () => {
  const phases = readJson('workflow/workflow.json').phases;
  for (const id of ['triage', 'reading', 'requirements', 'confirmation', 'design', 'tasks', 'implementation', 'closing']) {
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

test('a implementação grava evidência por script, chama o revisor e só commita com a palavra do dev (AC-10.1)', () => {
  const text = read('skills/story/phases/implementation.md');
  for (const command of ['task start', 'evidence red', 'evidence green', 'checks', 'review task', 'approve commit', 'block']) {
    assert.match(text, new RegExp(`keel-state\\.mjs"? ${command}`), command);
  }
  assert.match(text, /task-metrics\.mjs/);
  assert.match(text, /keel:reviewer/);
  assert.match(text, /git diff/);
});

test('o revisor tem a revisão de task com a rubrica de design', () => {
  const text = read('agents/reviewer.md');
  const section = text.slice(text.indexOf('## Revisão de task'));
  assert.ok(text.includes('## Revisão de task'));
  for (const item of ['Regra de negócio fora do lugar', 'Estrutura sem justificativa', 'Reuso', 'Escopo e sobra', 'Erros', 'Degrau', 'Legibilidade', 'teste afrouxado']) {
    assert.ok(section.includes(item), item);
  }
  assert.match(section, /no máximo 5 achados/);
  assert.match(section, /BLOQUEIA.*REMOVER.*SUGERIR/s);
});

test('o fechamento copia a convergência, vira regra faltante em task, aprova deltas com a palavra do dev e confere a história (AC-7.1)', () => {
  const text = read('skills/story/phases/closing.md');
  for (const command of ['next', 'approve deltas', 'advance']) assert.match(text, new RegExp(`keel-state\\.mjs"? ${command}`), command);
  assert.match(text, /check-feature\.mjs"? <pasta-da-história> --pr/);
  assert.match(text, /task nova/);
  assert.match(text, /Original story/);
  assert.match(text, /adicionado, modificado e removido/);
  assert.match(text, /ADR candidate\?/);
});

test('debugging, review answer and checklists are in the skill', () => {
  const debugging = read('skills/story/phases/debugging.md');
  for (const step of ['Reproduza', 'Isole', 'hipótese', 'uma mudança', 'teste do RED']) assert.match(debugging, new RegExp(step), step);
  assert.match(debugging, /keel-state\.mjs"? block --reason/);
  assert.match(debugging, /3 tentativas/);
  const implementation = read('skills/story/phases/implementation.md');
  assert.match(implementation, /phases\/debugging\.md/);
  assert.match(implementation, /task\.debugging/);
  assert.match(implementation, /task\.checklists/);
  for (const answer of ['Confira cada achado no código', 'discorde com a fonte', 'nunca afrouxe o teste']) assert.match(implementation, new RegExp(answer), answer);
  for (const name of ['security', 'data', 'contract']) {
    const items = read(`skills/story/checklists/${name}.md`).split('\n').filter((line) => /^\d+\. /.test(line));
    assert.ok(items.length >= 1 && items.length <= 5, `${name}: ${items.length} itens`);
  }
  const reviewer = read('agents/reviewer.md');
  const section = reviewer.slice(reviewer.indexOf('## Checklists'));
  assert.ok(reviewer.includes('## Checklists'));
  assert.match(section, /sim ou não/);
  assert.match(section, /arquivo:linha/);
});

test('focus: the skill finishes what was asked without extra work', () => {
  const skill = read('skills/story/SKILL.md');
  const rules = skill.slice(skill.indexOf('## Regras de todas as fases'));
  assert.match(rules, /Foco:.*só o que a fase e a task pedem/);
  assert.match(rules, /não proponha nem comece trabalho/i);
  assert.match(rules, /"Implementation notes"/);
  assert.match(rules, /resultado ou na pergunta do portão/);
  const implementation = read('skills/story/phases/implementation.md');
  assert.match(implementation, /`outsideTask`[^\n]*desfaça[^\n]*`approve commit` recusa/);
});

test('session: each gated phase ends suggesting a new conversation, like each task', () => {
  const skill = read('skills/story/SKILL.md');
  const flow = skill.slice(skill.indexOf('## Como andar no fluxo'), skill.indexOf('## O que nunca fazer'));
  assert.match(flow, /`advance` aceito na saída de requirements, confirmation ou tasks[^\n]*conversa nova \(`\/clear`\)/);
  assert.match(flow, /`next` retoma de onde parou/);
  assert.match(flow, /Na saída de triage, reading e design, siga na mesma conversa/);
  assert.match(read('docs/release.md'), /uma sessão nova por fase e por task/);
});

test('red: the tasks phase plans no test-only task without Regression', () => {
  const text = read('skills/story/phases/tasks.md');
  assert.match(text, /RED possível/);
  assert.match(text, /[Nn]unca planeje task "só teste" sem `Regression:`/);
  assert.match(text, /amplie o `Test first:` da task que entrega o comportamento/);
  assert.match(text, /de onde vem o RED/);
});

test('scope: confirmation review keeps the story inside its goal', () => {
  const reviewer = read('agents/reviewer.md');
  const review = reviewer.slice(reviewer.indexOf('## Revisão de requisitos'), reviewer.indexOf('## Revisão de task'));
  assert.match(review, /"Goal" e o "Out of scope"/);
  assert.match(review, /[Nn]ão reporte como falta o que o "Out of scope" já exclui/);
  assert.match(review, /fora da história/);
  const confirmation = read('skills/story/phases/confirmation.md');
  assert.match(confirmation, /pendência em "Out of scope"/);
  assert.match(confirmation, /contraria o "Out of scope"/);
  assert.match(confirmation, /não se testa de verdade/);
  assert.match(confirmation, /quantas regras a história tinha e quantas terá/);
});
