import { test } from 'node:test';
import assert from 'node:assert/strict';
import { read } from './helpers.mjs';

function section(text, start, end) {
  return text.slice(text.indexOf(start), end ? text.indexOf(end) : undefined);
}

test('closing: the PR description is shown in the answer and never left in the project tree', () => {
  const pr = section(read('skills/story/phases/closing.md'), '## 6. Conferência e PR', '## Nunca');
  assert.match(pr, /Mostre a descrição do PR na resposta/);
  assert.match(pr, /fora da árvore do projeto/);
  assert.match(pr, /nunca na raiz do projeto nem na pasta da história/);
});

test('closing: leaving implementation suggests a new conversation before the closing', () => {
  const skill = read('skills/story/SKILL.md');
  const flow = section(skill, '## Como andar no fluxo', '## O que nunca fazer');
  assert.match(flow, /Na saída de implementation[^\n]*conversa nova \(`\/clear`\)/);
  assert.match(read('skills/story/phases/implementation.md'), /Quando todas estiverem `done`[^\n]*conversa nova \(`\/clear`\)/);
  assert.match(read('docs/specification.md'), /saída de requirements, confirmation, tasks e implementation/);
});

test('adr: a conflict with an ADR is recommended as a draft in the design, written in the closing', () => {
  const requirements = read('skills/story/phases/requirements.md');
  assert.match(requirements, /conflito com uma ADR[^\n]*`adr-draft\.md`[^\n]*fechamento/);
  assert.doesNotMatch(requirements, /ADR escrita (na fase de|no) design/);
});
