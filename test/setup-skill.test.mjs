import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { root, read } from './helpers.mjs';
import { checkDoc } from '../plugins/keel-docs/scripts/doc-check.mjs';

const skill = read('skills/setup/SKILL.md');

test('setup skill has frontmatter with name and a description of when to use it', () => {
  const front = skill.match(/^---\n([\s\S]+?)\n---\n/);
  assert.ok(front, 'no frontmatter');
  assert.match(front[1], /^name: setup$/m);
  assert.match(front[1], /^description: .{40,1024}$/m);
});

test('setup skill carries the guarantees agreed with the dev', () => {
  for (const rule of [
    /revis[ãa]o .*sem alterar/i,
    /nunca crie (um )?CLAUDE\.md/i,
    /s[óo] move e remove/i,
    /restructure-check/,
    /padr[ãa]o [ée] "?n[ãa]o"?/i,
    /viola[çc][ãa]o plantada/i,
    /--write-baseline/,
  ]) assert.match(skill, rule);
});

test('setup skill turns the structure findings into suggestions', () => {
  for (const rule of [
    /`commands`/,
    /`sections`/,
    /`emphasis`/,
    /`rules`/,
    /README/,
    /\/doctor prompt-audit/,
  ]) assert.match(skill, rule);
});

test('setup skill is agent-neutral: <plugin> paths, /doctor marked as Claude Code, Codex visibility cases', () => {
  const body = skill.replace(/^---\n[\s\S]*?\n---\n/, '');
  const varLines = body.split('\n').filter((line) => /\$\{CLAUDE_(PLUGIN_ROOT|SKILL_DIR)\}/.test(line));
  assert.equal(varLines.length, 1, 'only the "Caminhos" line names a Claude Code variable');
  assert.match(varLines[0], /^Caminhos: `<plugin>` é a pasta do plugin: no Claude Code, `\$\{CLAUDE_PLUGIN_ROOT\}`; em outro agente, a pasta dois níveis acima deste SKILL\.md\./);
  const refs = [...body.matchAll(/<plugin>\/([\w./-]+)/g)].map((m) => m[1]);
  assert.ok(refs.includes('scripts/keel-context.mjs') && refs.includes('scripts/arch-check.mjs'));
  for (const ref of refs) assert.ok(existsSync(join(root, 'skills/setup/../..', ref)), `does not exist: <plugin>/${ref}`);
  assert.doesNotMatch(body, /`(templates|scripts)\//, 'plugin files always carry <plugin>/');
  for (const line of body.split('\n').filter((l) => l.includes('/doctor'))) assert.match(line, /Claude Code/);
  const visibility = body.match(/^Visibilidade[\s\S]*?(?=\n## )/m)?.[0] ?? '';
  assert.match(visibility, /Codex/);
  assert.match(visibility, /AGENTS\.override\.md/);
  assert.match(visibility, /Só CLAUDE\.md/);
});

// Section 3.1 of the setup: the branch for a repository without source code.
const newRepo = () => {
  const start = skill.indexOf('## 3.1');
  return start < 0 ? '' : skill.slice(start, skill.indexOf('\n## 4.', start));
};

test('setup: a repository without source code gets an interview of at most 6 questions', () => {
  const section = newRepo();
  assert.ok(section, 'no section 3.1');
  assert.ok(skill.indexOf('## 3. ') < skill.indexOf('## 3.1') && skill.indexOf('## 3.1') < skill.indexOf('## 4. '), '3.1 sits between steps 3 and 4');
  assert.match(section, /sem código-fonte/);
  for (const rule of [/no máximo 6 perguntas/, /uma por vez/, /"por que importa"/, /as opções/, /recomenda/, /"sim"/]) assert.match(section, rule);
  for (const theme of ['quem usa e quantos', 'dado sensível', 'serviços externos', 'offline ou mobile', 'quem vai manter', '6 a 12 meses']) {
    assert.ok(section.includes(theme), theme);
  }
});

test('setup: answers become 3 to 5 Quality goals scenarios', () => {
  const template = read('plugins/keel-docs/templates/product.md');
  const goals = template.indexOf('## Quality goals');
  assert.ok(goals > 0 && goals < template.indexOf('## Engineering principles'), 'Quality goals before Engineering principles');
  const scenario = template.slice(goals, template.indexOf('## Engineering principles'));
  for (const part of ['Contexto:', 'Estímulo:', 'Métrica:']) assert.ok(scenario.includes(part), part);
  assert.match(read('plugins/keel-docs/skills/write/guides/product.md'), /"Quality goals"[^\n]*3 a 5 cenários/);
  const section = newRepo();
  assert.match(section, /"Quality goals"[^\n]*3 a 5 cenários[^\n]*contexto, estímulo e métrica/);
  assert.match(section, /menos de 3[^\n]*cenários propostos pelo Keel[^\n]*decisão do Keel/);
  // A product.md set up before Quality goals existed (this repository's, without that section) still passes.
  const before = read('keel/product.md').replace(/^## Quality goals\n[\s\S]*?(?=^## )/m, '');
  assert.deepEqual(checkDoc('product', 'keel/product.md', before).errors, []);
});

test('setup: approaches by stance, a starter checked on the web and "tanto faz" as a Keel decision', () => {
  const section = newRepo();
  for (const stance of ['mínima', 'proporcional', 'preparada para crescer']) assert.ok(section.includes(stance), stance);
  assert.match(section, /2 ou 3 abordagens/);
  assert.match(section, /o que custa depois/);
  assert.match(section, /starter[^\n]*conferido na web/);
  assert.match(section, /sem acesso à web[^\n]*`\[ASSUMPTION\]`/);
  assert.match(section, /recusa todas as abordagens[^\n]*uma pergunta sobre o que falta[^\n]*de novo/);
  assert.match(section, /\(porta, adaptador\)[^\n]*só[^\n]*cenário de mudança/);
  assert.match(section, /"tanto faz"[^\n]*decisão do Keel, não do dev/);
  assert.match(section, /recusa a entrevista[^\n]*recomendações do Keel[^\n]*ADR-001/);
});

test('setup: the new repository ends with ADR-001, rungs and a planned architecture.json', () => {
  const section = newRepo();
  assert.match(section, /"Rungs per module"[^\n]*cenário/);
  assert.match(section, /ADR-001 de arquitetura e stack[^\n]*"Confirmation"[^\n]*`keel\/architecture\.json`/);
  assert.match(section, /"Decisões adiadas"[^\n]*agora não, porque/);
  assert.match(section, /`"planned": true`/);
  assert.match(section, /`coverage`/);
  assert.match(section, /`Architecture: não se aplica`[^\n]*não vale/);
  assert.match(section, /cada trecho[^\n]*aprovação/);
  assert.match(section, /`arch-check\.mjs`[^\n]*`pending`[^\n]*sem `noCycles` nem baseline/);
  assert.match(section, /violação plantada[^\n]*primeiro arquivo/);
  const gate = skill.slice(skill.indexOf('## Portão'));
  assert.match(gate, /O dev aprova o product\.md e as ADRs iniciais/);
  assert.match(gate, /sem código-fonte[^\n]*ADR-001 de arquitetura e stack/);
  const step4 = skill.slice(skill.indexOf('## 4. '), skill.indexOf('## 5. '));
  assert.match(step4, /a partir das pastas reais/);
  const stage0 = read('docs/specification.md').match(/## Etapa 0\.[\s\S]*?(?=\n## Etapa 1\.)/)[0];
  assert.match(stage0, /sem código-fonte[^\n]*"Quality goals"[^\n]*ADR-001/);
});

test('setup: in a repository without source code every question follows the interview format', () => {
  const intro = skill.slice(0, skill.indexOf('## 1. '));
  assert.match(intro, /sem código-fonte[^\n]*toda pergunta[^\n]*passo 2[^\n]*"por que importa"[^\n]*as opções[^\n]*recomendação[^\n]*uma por vez/);
});
