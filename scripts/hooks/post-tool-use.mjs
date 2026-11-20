#!/usr/bin/env node
// Hook PostToolUse: depois de uma edição, devolve ao modelo a violação de arquitetura nova
// do arquivo editado (decision: block) e, se o arquivo é AGENTS.md ou CLAUDE.md, a deriva do
// bloco do Keel (só contexto, sem bloquear). A edição já aconteceu; o hook não desfaz nada.
// Um keel/architecture.json inválido vira aviso ao modelo, nunca um erro que trava a sessão.
import { readFileSync } from 'node:fs';
import { basename, relative, resolve } from 'node:path';
import { CONFIG_PATH, runCheck } from '../arch-check.mjs';
import { check } from '../keel-context.mjs';

const INSTRUCTION_FILES = new Set(['AGENTS.md', 'CLAUDE.md']);

function context(text) {
  return { hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: text } };
}

function instructionFeedback(root) {
  const drift = check(root);
  if (drift.ok) return null;
  return context(`Keel: deriva no bloco do Keel (${drift.errors.join('; ')}). Rode keel-context.mjs check e, se o dev aprovar, block apply para refazer o bloco.`);
}

function architectureFeedback(root, path) {
  let result;
  try {
    result = runCheck(root, { files: [path] });
  } catch (error) {
    const message = `${CONFIG_PATH} inválido, checagem de arquitetura desligada: ${error.message}`;
    return path === CONFIG_PATH ? { decision: 'block', reason: message } : context(`Keel: ${message}`);
  }
  if (result.status !== 'fail') return null;
  const reason = ['Violação de arquitetura (keel/architecture.json, varredor aproximado):',
    ...result.violations.map((v) => `- ${v.message}`)].join('\n');
  return { decision: 'block', reason };
}

const input = readFileSync(0, 'utf8');
const event = input.trim() ? JSON.parse(input) : {};
const root = process.env.CLAUDE_PROJECT_DIR ?? event.cwd;
const target = event.tool_input?.file_path;
if (!root || !target) process.exit(0);
const path = relative(root, resolve(root, target)).split('\\').join('/');
if (path.startsWith('../')) process.exit(0);

const feedback = INSTRUCTION_FILES.has(basename(path)) ? instructionFeedback(root) : architectureFeedback(root, path);
if (feedback) console.log(JSON.stringify(feedback));
