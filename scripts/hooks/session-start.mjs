#!/usr/bin/env node
// Hook SessionStart: diz ao modelo em que ponto está a história da branch atual e qual skill
// usar, também depois de compactar o contexto. Nunca copia o AGENTS.md nem o CLAUDE.md.
// Nunca bloqueia a sessão: um erro vira uma linha de contexto.
import { existsSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { findActiveStory, loadWorkflow, nextStep } from '../keel-state.mjs';
import { readDocs } from '../validate-feature.mjs';

const MAX_CHARS = 1500;
const PRECEDENCE = 'Precedência: durante uma história ativa, a ordem do fluxo e os portões vêm do Keel '
  + '(os hooks bloqueiam o que a fase não permite). Comandos, estilo e convenções vêm do AGENTS.md ou CLAUDE.md do projeto.';

function sessionContext(root) {
  if (!existsSync(join(root, 'keel'))) return '';
  let active;
  let step;
  try {
    active = findActiveStory(root);
    step = active && nextStep(active.state, loadWorkflow(), readDocs(active.folder));
  } catch (error) {
    return `Keel: não consegui ler o estado da história (${error.message.split('\n')[0]}).`;
  }
  if (!active) {
    return 'Keel: nenhuma história ativa nesta branch. Produto e decisões em keel/product.md e keel/adrs/; para começar uma história, use a skill keel:story.';
  }
  const folder = relative(root, active.folder).split('\\').join('/');
  const missing = step.missing.map((m) => `- ${m.criterion}: ${m.reason}`);
  const lines = [
    `Keel: história ${step.story} em ${folder}, nível ${step.level ?? 'a definir'}, fase ${step.phase}.`,
    ...(step.expired.length ? [`Aprovação vencida: ${step.expired.join(', ')}.`] : []),
    ...(missing.length ? ['Falta para sair da fase:', ...missing] : []),
    'Próximo passo: use a skill keel:story, que pergunta ao keel-state.mjs o que fazer; não edite state.json.',
    PRECEDENCE,
  ];
  const text = lines.join('\n');
  return text.length <= MAX_CHARS ? text : `${text.slice(0, MAX_CHARS - 1)}…`;
}

const input = readFileSync(0, 'utf8');
const event = input.trim() ? JSON.parse(input) : {};
const root = process.env.CLAUDE_PROJECT_DIR ?? event.cwd ?? process.cwd();
const context = sessionContext(root);
if (context) {
  console.log(JSON.stringify({ hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext: context } }));
}
