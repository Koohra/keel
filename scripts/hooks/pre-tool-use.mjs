#!/usr/bin/env node
// Hook PreToolUse: bloqueia escrita em state.json (por edição ou terminal) e edição de código
// fora da fase que permite.
// Lê o evento do stdin; sai com 2 (bloqueia, motivo no stderr) ou 0 (libera).
import { readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { checkCommand, checkEdit, findActiveStory, isProjectSource, loadWorkflow, reconcile } from '../keel-state.mjs';
import { readDocs } from '../validate-feature.mjs';

const event = JSON.parse(readFileSync(0, 'utf8'));
const root = process.env.CLAUDE_PROJECT_DIR ?? event.cwd;
if (event.tool_name === 'Bash') {
  const decision = checkCommand(event.tool_input?.command ?? '');
  if (decision.block) console.error(decision.reason);
  process.exit(decision.block ? 2 : 0);
}
const target = event.tool_input?.file_path ?? event.tool_input?.notebook_path;
if (!target) process.exit(0);

const path = relative(root, resolve(root, target));
const workflow = loadWorkflow();
let state = null;
try {
  const active = findActiveStory(root);
  // Aprovação vencida devolve a história ao portão antes de decidir, mesmo sem rodar next.
  if (active) state = reconcile(active.state, workflow, readDocs(active.folder)).state;
} catch (error) {
  // Sem saber a fase, só bloqueia o que dependeria dela: código do projeto.
  if (checkEdit(path, null, workflow).block || isProjectSource(path)) {
    console.error(error.message);
    process.exit(2);
  }
  process.exit(0);
}
const decision = checkEdit(path, state, workflow);
if (decision.block) {
  console.error(decision.reason);
  process.exit(2);
}
