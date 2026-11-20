#!/usr/bin/env node
// Único escritor de keel/features/<história>/state.json. Diz a fase atual e o que falta
// (next), muda de fase só quando os critérios de saída do workflow.json passam (advance)
// e prende cada aprovação ao hash do documento aprovado (approve).
//
// Critério de saída: "<tipo>[:<alvo>][?]". O "?" final faz o critério valer só quando o
// documento é exigido pelo nível (design.md só em com-design). Tipos em CRITERIA abaixo.
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import {
  checkCoverage, frozenBlock, openQuestions, readDocs, tasksDone, validateDesign, validateRequirements, validateTasks,
} from './validate-feature.mjs';

export const LEVELS = ['trivial', 'padrao', 'com-design'];
const DOC_STEPS = { 'requirements.md': 'requirements', 'design.md': 'design', 'tasks.md': 'tasks' };
const VALIDATORS = { 'requirements.md': validateRequirements, 'design.md': validateDesign, 'tasks.md': validateTasks };
const REVIEW_RESULTS = ['ok', 'achados', 'unavailable'];
const PENDING_PARTS = { convergence: 6, 'approval:deltas': 6, arch: 6 };

// Só o bloco congelado entra no hash: andamento, notas e cabeçalho mudam sem vencer a aprovação.
export function approvalHash(text) {
  const content = frozenBlock(text).content ?? text.replace(/\r\n/g, '\n');
  return createHash('sha256').update(content).digest('hex');
}

const approvalStep = () => ({ approved: false, approvedBy: null, approvedAt: null, hash: null });

export function newState({ key, slug, title, source = null, branch, now }) {
  return {
    schema: 1,
    story: { key, title, source, folder: `keel/features/${key}-${slug}`, branch },
    level: null,
    phase: 'triage',
    steps: {
      triage: { done: false, confirmedBy: null, at: null },
      reading: { repoMap: false },
      requirements: { review: null, ...approvalStep() },
      design: approvalStep(),
      tasks: approvalStep(),
      implementation: { currentTask: null, blocked: null },
      closing: { convergence: false, deltasApproved: false, pullRequest: null },
    },
    updatedAt: now,
  };
}

function docRequired(doc, state) {
  if (doc === 'design.md') return state.level === 'com-design';
  if (doc === 'requirements.md') return state.level !== 'trivial';
  return true;
}

function result(met, reason) {
  return met ? { met: true } : { met: false, reason };
}

function docErrors(doc, docs) {
  if (docs[doc] == null) return [`${doc} não existe`];
  return VALIDATORS[doc](docs[doc]);
}

const CRITERIA = {
  approval: (target, { state, docs }) => {
    if (target === 'level') return result(state.steps.triage.done, 'nível não confirmado: rode level <nível> --by <dev>');
    const step = state.steps[DOC_STEPS[target]];
    if (!step) return null;
    if (!step.approved) return result(false, `${target} sem aprovação do dev`);
    if (docs[target] == null) return result(false, `${target} não existe`);
    return result(step.hash === approvalHash(docs[target]), `${target} mudou depois da aprovação`);
  },
  valid: (target, { docs }) => {
    if (!VALIDATORS[target]) return null;
    const errors = docErrors(target, docs);
    return result(errors.length === 0, errors.join('; '));
  },
  noOpenQuestions: (_, { docs }) => {
    const count = openQuestions(docs['requirements.md'] ?? '');
    return result(count === 0, `${count} [PERGUNTA] aberta(s) no requirements.md`);
  },
  review: (target, { state }) => {
    if (target !== 'requirements') return null;
    return result(state.steps.requirements.review !== null, 'revisor isolado não registrado: rode review requirements --result <ok|achados|unavailable>');
  },
  generated: (target, { state }) => {
    if (target !== 'repo-map') return null;
    return result(state.steps.reading.repoMap, 'repo map não gerado: rode generated repo-map');
  },
  coverage: (target, { docs }) => {
    if (target !== 'rules->tasks->tests') return null;
    if (docs['tasks.md'] == null) return result(false, 'tasks.md não existe');
    const errors = checkCoverage(docs['tasks.md'], docs['requirements.md']);
    return result(errors.length === 0, errors.join('; '));
  },
  tasks: (target, { docs }) => {
    if (target !== 'all-done') return null;
    return result(docs['tasks.md'] != null && tasksDone(docs['tasks.md']), 'há task do tasks.md sem Status: feita');
  },
};

export function evaluate(criterion, ctx) {
  const optional = criterion.endsWith('?');
  const [kind, target] = criterion.replace(/\?$/, '').split(':');
  if (optional && DOC_STEPS[target] && !docRequired(target, ctx.state)) return { criterion, met: true };
  const pending = PENDING_PARTS[`${kind}:${target}`] ?? PENDING_PARTS[kind];
  if (pending) return { criterion, met: false, reason: `verificador ainda não existe (parte ${pending})` };
  const outcome = CRITERIA[kind]?.(target, ctx);
  return { criterion, ...(outcome ?? { met: false, reason: `critério desconhecido: ${criterion}` }) };
}

function phaseIndex(workflow, id) {
  return workflow.phases.findIndex((p) => p.id === id);
}

function applies(phase, state) {
  if (!phase.skipUnless) return true;
  const [key, values] = phase.skipUnless.split('=');
  return values.split(',').includes(String(state[key]));
}

function missingFor(phase, state, docs) {
  return (phase.exit ?? []).map((c) => evaluate(c, { state, docs })).filter((r) => !r.met)
    .map(({ criterion, reason }) => ({ criterion, reason }));
}

// Fase cujo critério de saída aprova o documento: é para ela que a história volta.
function gatePhase(workflow, doc) {
  return workflow.phases.find((p) => (p.exit ?? []).some((c) => c.replace(/\?$/, '') === `approval:${doc}`));
}

export function reconcile(state, workflow, docs) {
  const expired = [];
  let next = state;
  for (const [doc, stepName] of Object.entries(DOC_STEPS)) {
    const step = next.steps[stepName];
    if (!step.approved || (docs[doc] != null && step.hash === approvalHash(docs[doc]))) continue;
    expired.push(doc);
    next = { ...next, steps: { ...next.steps, [stepName]: { ...step, ...approvalStep() } } };
  }
  // A fase atual só vale se toda fase anterior que se aplica cumpre os critérios de saída.
  // Isso cobre aprovação vencida e state.json alterado por fora do script.
  const current = phaseIndex(workflow, next.phase);
  const failing = workflow.phases.slice(0, current)
    .find((phase) => applies(phase, next) && missingFor(phase, next, docs).length > 0);
  if (failing) next = { ...next, phase: failing.id };
  return { state: next, expired };
}

export function nextStep(state, workflow, docs) {
  const { state: current, expired } = reconcile(state, workflow, docs);
  const phase = workflow.phases[phaseIndex(workflow, current.phase)];
  return {
    story: current.story.key,
    phase: current.phase,
    level: current.level,
    instructions: phase.instructions ?? null,
    missing: missingFor(phase, current, docs),
    expired,
  };
}

export function advance(state, workflow, docs, now) {
  const index = phaseIndex(workflow, state.phase);
  const missing = missingFor(workflow.phases[index], state, docs);
  if (missing.length) return { missing };
  const target = workflow.phases.slice(index + 1).find((p) => applies(p, state));
  if (!target) return { missing: [{ criterion: 'done', reason: 'a história já terminou' }] };
  return { state: { ...state, phase: target.id, updatedAt: now }, missing: [] };
}

function requirePhase(state, phase, action) {
  if (state.phase !== phase) throw new Error(`${action} só na fase ${phase}; a história está em ${state.phase}`);
}

function requireBy(by) {
  if (!by) throw new Error('informe quem aprovou com --by <dev>');
}

export function setLevel(state, level, by, now) {
  if (!LEVELS.includes(level)) throw new Error(`nível "${level}" inválido; use ${LEVELS.join(', ')}`);
  requireBy(by);
  requirePhase(state, 'triage', 'level');
  return { ...state, level, steps: { ...state.steps, triage: { done: true, confirmedBy: by, at: now } }, updatedAt: now };
}

export function recordGenerated(state, artifact, now) {
  if (artifact !== 'repo-map') throw new Error(`artefato "${artifact}" desconhecido; use repo-map`);
  requirePhase(state, 'reading', 'generated repo-map');
  return { ...state, steps: { ...state.steps, reading: { repoMap: true } }, updatedAt: now };
}

export function recordReview(state, doc, outcome, now) {
  if (doc !== 'requirements') throw new Error(`review de "${doc}" desconhecido; use requirements`);
  if (!REVIEW_RESULTS.includes(outcome)) throw new Error(`resultado "${outcome}" inválido; use ${REVIEW_RESULTS.join(', ')}`);
  requirePhase(state, 'confirmation', 'review requirements');
  const requirements = { ...state.steps.requirements, review: { result: outcome, at: now } };
  return { ...state, steps: { ...state.steps, requirements }, updatedAt: now };
}

const APPROVAL_CHECKS = {
  'requirements.md': ['valid:requirements.md', 'noOpenQuestions'],
  'design.md': ['valid:design.md'],
  'tasks.md': ['valid:tasks.md', 'coverage:rules->tasks->tests'],
};

export function approve(state, doc, by, docs, workflow, now) {
  if (!DOC_STEPS[doc]) throw new Error(`documento "${doc}" desconhecido; use ${Object.keys(DOC_STEPS).join(', ')}`);
  requireBy(by);
  const gate = gatePhase(workflow, doc).id;
  if (state.phase !== gate) throw new Error(`o portão de ${doc} é da fase ${gate}; a história está em ${state.phase}`);
  const failing = APPROVAL_CHECKS[doc].map((c) => evaluate(c, { state, docs })).filter((r) => !r.met);
  if (failing.length) throw new Error(`${doc} não pode ser aprovado: ${failing.map((f) => f.reason).join('; ')}`);
  const step = { ...state.steps[DOC_STEPS[doc]], approved: true, approvedBy: by, approvedAt: now, hash: approvalHash(docs[doc]) };
  return { ...state, steps: { ...state.steps, [DOC_STEPS[doc]]: step }, updatedAt: now };
}

const STATE_FILE = /^keel\/features\/[^/]+\/state\.json$/i;
const SHELL_WRITE = /(>>?\s*["']?[^\s|;&]*state\.json|\b(tee|cp|mv|rm|dd|sed\s+-i|writeFile\w*|Set-Content|Out-File|Add-Content)\b[^|;&]*state\.json)/i;

// Decide se o hook PreToolUse deixa a IA rodar um comando de terminal: bloqueia o que grava
// state.json, exceto o próprio keel-state.mjs e o git (restaurar o arquivo).
export function checkCommand(command) {
  if (/^\s*git\s/.test(command) || command.includes('keel-state.mjs') || !SHELL_WRITE.test(command)) return { block: false };
  return { block: true, reason: 'state.json só é escrito por scripts/keel-state.mjs; use node scripts/keel-state.mjs <comando>.' };
}

// Arquivo do projeto que a fase controla: dentro da raiz e fora de keel/.
export function isProjectSource(relPath) {
  const path = relPath.split(sep).join('/');
  return !(path.startsWith('../') || isAbsolute(relPath) || path.startsWith('keel/'));
}

// Decide se o hook PreToolUse deixa a IA editar o arquivo (caminho relativo à raiz do projeto).
export function checkEdit(relPath, state, workflow) {
  if (STATE_FILE.test(relPath.split(sep).join('/'))) {
    return { block: true, reason: 'state.json só é escrito por scripts/keel-state.mjs; use node scripts/keel-state.mjs <comando>.' };
  }
  if (!state || !isProjectSource(relPath)) return { block: false };
  const phase = workflow.phases[phaseIndex(workflow, state.phase)];
  if (phase?.allowSourceEdits) return { block: false };
  return {
    block: true,
    reason: `A história ${state.story.key} está na fase ${state.phase}; edição de código só na fase implementation. Rode node scripts/keel-state.mjs next para ver o que falta.`,
  };
}

// --- Borda: disco, git e linha de comando ---

const pluginRoot = fileURLToPath(new URL('..', import.meta.url));

export function loadWorkflow() {
  return JSON.parse(readFileSync(join(pluginRoot, 'workflow', 'workflow.json'), 'utf8'));
}

export function currentBranch(root) {
  let gitDir = join(root, '.git');
  if (!existsSync(gitDir)) return null;
  if (statSync(gitDir).isFile()) gitDir = resolve(root, readFileSync(gitDir, 'utf8').replace(/^gitdir:\s*/, '').trim());
  const head = readFileSync(join(gitDir, 'HEAD'), 'utf8').trim();
  return head.startsWith('ref: refs/heads/') ? head.slice('ref: refs/heads/'.length) : null;
}

function readState(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`state.json ilegível em ${path}: ${error.message}. Restaure com git checkout -- ${path}`);
  }
}

// História cujo state.json aponta para a branch atual, ou null. Um state.json ilegível de
// outra história não atrapalha; só vira erro quando nenhuma história casa com a branch.
export function findActiveStory(root) {
  const branch = currentBranch(root);
  const features = join(root, 'keel', 'features');
  if (!branch || !existsSync(features)) return null;
  const unreadable = [];
  for (const name of readdirSync(features)) {
    const path = join(features, name, 'state.json');
    if (!existsSync(path)) continue;
    try {
      const state = readState(path);
      if (state.story?.branch === branch) return { folder: join(features, name), state };
    } catch (error) {
      unreadable.push(error.message);
    }
  }
  if (unreadable.length) throw new Error(unreadable.join('\n'));
  return null;
}

function writeState(folder, state) {
  writeFileSync(join(folder, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);
}

function loadStory(root, story) {
  if (story) {
    const folder = resolve(root, story);
    const path = join(folder, 'state.json');
    if (!existsSync(path)) throw new Error(`${story} não tem state.json; crie com init`);
    return { folder, state: readState(path) };
  }
  const active = findActiveStory(root);
  if (!active) throw new Error('nenhuma história com state.json para a branch atual; use --story <pasta>');
  return active;
}

// Comandos da CLI; a skill só usa estes (conferido em test/story-skill.test.mjs).
export const COMMANDS = ['init', 'next', 'advance', 'level', 'generated', 'review', 'approve', 'hash'];

const USAGE = `uso: node scripts/keel-state.mjs <comando> [--story <pasta>]
  init --key <CHAVE> --slug <descricao> --title <título> [--source <link>] [--branch <branch>]
  next | advance
  level <${LEVELS.join('|')}> --by <dev>
  generated repo-map
  review requirements --result <${REVIEW_RESULTS.join('|')}>
  approve <${Object.keys(DOC_STEPS).join('|')}> --by <dev>
  hash <arquivo>`;

function run(argv, root, now) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: Object.fromEntries(['story', 'key', 'slug', 'title', 'source', 'branch', 'by', 'result']
      .map((name) => [name, { type: 'string' }])),
  });
  const [command, arg] = positionals;
  if (command === 'hash') {
    if (!arg) throw new Error('informe o arquivo: hash <arquivo>');
    return { output: { file: arg, hash: approvalHash(readFileSync(resolve(root, arg), 'utf8')) } };
  }
  const workflow = loadWorkflow();
  if (command === 'init') {
    for (const name of ['key', 'slug', 'title']) if (!values[name]) throw new Error(`init exige --${name}`);
    const branch = values.branch ?? currentBranch(root);
    if (!branch) throw new Error('não achei a branch atual; informe --branch');
    const state = newState({ ...values, branch, now });
    const folder = join(root, state.story.folder);
    if (existsSync(join(folder, 'state.json'))) throw new Error(`${state.story.folder} já tem state.json`);
    mkdirSync(folder, { recursive: true });
    writeState(folder, state);
    return { output: nextStep(state, workflow, readDocs(folder)) };
  }
  const { folder, state: stored } = loadStory(root, values.story);
  const docs = readDocs(folder);
  const { state, expired } = reconcile(stored, workflow, docs);
  let updated = expired.length ? { ...state, updatedAt: now } : state;
  switch (command) {
    case 'next':
      break;
    case 'advance': {
      const moved = advance(updated, workflow, docs, now);
      if (!moved.state) {
        if (updated !== stored) writeState(folder, updated);
        const lines = moved.missing.map((m) => `- ${m.criterion}: ${m.reason}`).join('\n');
        throw new Error(`a fase ${updated.phase} ainda não pode terminar:\n${lines}`);
      }
      updated = moved.state;
      break;
    }
    case 'level': updated = setLevel(updated, arg, values.by, now); break;
    case 'generated': updated = recordGenerated(updated, arg, now); break;
    case 'review': updated = recordReview(updated, arg, values.result, now); break;
    case 'approve': updated = approve(updated, arg, values.by, docs, workflow, now); break;
    default: throw new Error(command ? `comando "${command}" desconhecido\n${USAGE}` : USAGE);
  }
  if (updated !== stored) writeState(folder, updated);
  return { output: nextStep(updated, workflow, docs) };
}

function main() {
  try {
    const { output } = run(process.argv.slice(2), process.cwd(), new Date().toISOString());
    console.log(JSON.stringify(output, null, 2));
    return 0;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
