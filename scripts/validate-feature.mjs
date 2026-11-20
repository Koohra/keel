#!/usr/bin/env node
// Checks structure, IDs, EARS, rule → task → test coverage and open markers
// in a story's documents. Does not judge content.
// Usage: node scripts/validate-feature.mjs <story-folder>
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIREMENTS_SECTIONS = [
  'Original story', 'Goal', 'Out of scope', 'Rules and acceptance criteria',
  'Explicit obligations', 'Questions and assumptions', 'Conflicts found',
  'Changes after confirmation',
];
const DESIGN_SECTIONS = [
  'Approach', 'Code map', 'Contracts and data', 'New structure and rationale',
  'Alternatives considered', 'Cross-cutting concerns', 'Risks and pattern breaks',
  'ADR candidate?',
];
const TASKS_SECTIONS = ['Progress', 'Implementation notes', 'Convergence (filled at the end, checked by script)'];

const EARS = /^(?:(?:WHEN|WHILE|WHERE) .+ |IF .+ THEN )?THE .+ SHALL /;
const GHERKIN = /GIVEN .+ WHEN .+ THEN /;
const TASK_HEADING = /^T(\d+) [—-] /;
const STATUS = /^(pending|red|green|in review|done)( \(.+\))?$/;

export const FROZEN_START = '<!-- frozen after approval: start -->';
export const FROZEN_END = '<!-- frozen after approval: end -->';

// Text between the markers: what the dev approves and what goes into the approval hash.
export function frozenBlock(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const start = lines.flatMap((line, i) => (line.trim() === FROZEN_START ? [i] : []));
  const end = lines.flatMap((line, i) => (line.trim() === FROZEN_END ? [i] : []));
  if (start.length !== 1 || end.length !== 1 || start[0] > end[0]) {
    return { content: null, error: `needs a frozen block: one line "${FROZEN_START}" and, after it, one "${FROZEN_END}"` };
  }
  return { content: lines.slice(start[0] + 1, end[0]).join('\n'), error: null };
}

function frozenErrors(text) {
  const { error } = frozenBlock(text);
  return error ? [error] : [];
}

// Splits the markdown into level-2 sections: [{ title, body }].
function sections(text) {
  const result = [];
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    if (line.startsWith('## ')) result.push({ title: line.slice(3).trim(), body: [] });
    else result.at(-1)?.body.push(line);
  }
  return result.map(({ title, body }) => ({ title, body: body.join('\n') }));
}

function checkSections(found, expected) {
  const errors = [];
  for (const title of expected) {
    const section = found.find((s) => s.title === title);
    if (!section) errors.push(`missing section "${title}"`);
    else if (!section.body.trim()) errors.push(`section "${title}" is empty; write "not applicable"`);
  }
  return errors;
}

function duplicates(ids, label) {
  const seen = new Set();
  const errors = [];
  for (const id of ids) {
    if (seen.has(id)) errors.push(`${id} ${label}`);
    seen.add(id);
  }
  return errors;
}

export function parseRules(text) {
  const body = sections(text).find((s) => s.title === 'Rules and acceptance criteria')?.body ?? '';
  const rules = [];
  const malformed = [];
  for (const line of body.split('\n')) {
    const rule = line.match(/^R(\d+)\. (.*)$/);
    const ac = line.match(/^\s+- AC-(\d+)\.(\d+) (.*)$/);
    if (rule) rules.push({ id: `R${rule[1]}`, n: rule[1], text: rule[2], acs: [] });
    else if (ac) rules.at(-1)?.acs.push({ id: `AC-${ac[1]}.${ac[2]}`, rule: ac[1], text: ac[3] });
    else if (/^\s*(R\d|-\s*AC-)/.test(line)) malformed.push(line.trim());
  }
  rules.malformed = malformed;
  return rules;
}

export function validateRequirements(text) {
  const errors = [...frozenErrors(text), ...checkSections(sections(text), REQUIREMENTS_SECTIONS)];
  const rules = parseRules(text);
  if (rules.length === 0) errors.push('no R# rule in "Rules and acceptance criteria"');
  for (const line of rules.malformed) {
    errors.push(`malformed line: "${line.slice(0, 40)}"; use "R1. <EARS>" and "  - AC-1.1 GIVEN ... WHEN ... THEN ..."`);
  }
  errors.push(...duplicates(rules.map((r) => r.id), 'duplicated'));
  errors.push(...duplicates(rules.flatMap((r) => r.acs.map((a) => a.id)), 'duplicated'));
  for (const rule of rules) {
    if (!EARS.test(rule.text)) errors.push(`${rule.id} does not follow EARS (WHEN/IF ... THEN/WHILE/WHERE ... THE ... SHALL)`);
    if (rule.acs.length === 0) errors.push(`${rule.id} has no acceptance criterion`);
    for (const ac of rule.acs) {
      if (!GHERKIN.test(ac.text)) errors.push(`${ac.id} is not GIVEN/WHEN/THEN`);
      if (ac.rule !== rule.n) errors.push(`${ac.id} is under ${rule.id}`);
    }
  }
  return errors;
}

export function openQuestions(text) {
  return (text.match(/\[QUESTION\]/g) ?? []).length;
}

export function validateDesign(text) {
  const errors = [...frozenErrors(text), ...checkSections(sections(text), DESIGN_SECTIONS)];
  if (!/^Trigger: \S/m.test(text)) errors.push('missing the "Trigger:" line with the reason for the design');
  return errors;
}

function fieldsOf(body) {
  const fields = {};
  for (const line of body.split('\n')) {
    const field = line.match(/^([A-Za-zÀ-ú ]+): ?(.*)$/);
    if (field) fields[field[1]] = field[2].trim();
  }
  return fields;
}

// Progress: "### T1" followed by Status, evidence and review of each task.
function parseProgress(text) {
  const body = sections(text).find((s) => s.title === 'Progress')?.body ?? '';
  const progress = {};
  for (const chunk of body.split(/^(?=### T\d+\s*$)/m)) {
    const id = chunk.match(/^### (T\d+)\s*$/m)?.[1];
    if (id) progress[id] = fieldsOf(chunk);
  }
  return progress;
}

export function parseTasks(text) {
  const frozen = new Set(sections(frozenBlock(text).content ?? '').map((s) => s.title));
  const progress = parseProgress(text);
  return sections(text).filter((s) => TASK_HEADING.test(s.title)).map((s) => {
    const fields = fieldsOf(s.body);
    const id = `T${s.title.match(TASK_HEADING)[1]}`;
    return {
      id,
      fields,
      frozen: frozen.has(s.title),
      progress: progress[id] ?? null,
      covers: fields.Covers?.match(/\bR\d+\b/g) ?? [],
      tested: 'Test first' in fields,
      deps: (fields['Depends on'] ?? '').match(/\bT\d+\b/g) ?? [],
    };
  });
}

function findCycle(tasks) {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  const done = new Set();
  const visit = (id, path) => {
    if (path.includes(id)) return [...path.slice(path.indexOf(id)), id];
    if (done.has(id) || !byId.has(id)) return null;
    for (const dep of byId.get(id).deps) {
      const cycle = visit(dep, [...path, id]);
      if (cycle) return cycle;
    }
    done.add(id);
    return null;
  };
  for (const task of tasks) {
    const cycle = visit(task.id, []);
    if (cycle) return cycle;
  }
  return null;
}

export function validateTasks(text) {
  const errors = [...frozenErrors(text), ...checkSections(sections(text), TASKS_SECTIONS)];
  const tasks = parseTasks(text);
  const hasBlock = frozenErrors(text).length === 0;
  if (tasks.length === 0) errors.push('no task "## T1 — ..."');
  errors.push(...duplicates(tasks.map((t) => t.id), 'duplicated'));
  const ids = new Set(tasks.map((t) => t.id));
  for (const { id, fields, deps, frozen, progress } of tasks) {
    if (hasBlock && !frozen) errors.push(`${id} is outside the frozen block; the task plan goes inside it`);
    for (const name of ['Status', 'RED evidence', 'GREEN evidence', 'Review']) {
      if (name in fields) errors.push(`${id}: ${name}: belongs in "Progress", outside the frozen block`);
    }
    if (!progress) errors.push(`${id} has no entry in "Progress" (### ${id} with Status:)`);
    else if (!STATUS.test(progress.Status ?? '')) errors.push(`${id}: invalid Status "${progress.Status ?? ''}"`);
    if (!fields.Covers) errors.push(`${id} has no Covers:`);
    const noTest = 'No test' in fields;
    if (noTest && 'Test first' in fields) errors.push(`${id} has both Test first: and No test:`);
    if (!noTest && !('Test first' in fields)) errors.push(`${id} has neither Test first: nor No test:`);
    if (!noTest && !/`[^`]+`/.test(fields['Verification'] ?? '')) errors.push(`${id}: Verification has no command in backticks`);
    for (const dep of deps) if (!ids.has(dep)) errors.push(`${id} depends on ${dep}, which does not exist`);
  }
  const cycle = findCycle(tasks);
  if (cycle) errors.push(`dependency cycle: ${cycle.join(' → ')}`);
  return errors;
}

// Every rule needs at least one task with a test; every task covers only existing rules.
// Without requirements.md (trivial level) the criterion lives in the task itself and there is nothing to cross-check.
export function checkCoverage(tasksText, requirementsText) {
  if (requirementsText == null) return [];
  const rules = parseRules(requirementsText).map((r) => r.id);
  const tasks = parseTasks(tasksText);
  const errors = [];
  for (const task of tasks) {
    for (const rule of task.covers) if (!rules.includes(rule)) errors.push(`${task.id} covers ${rule}, which does not exist`);
  }
  for (const rule of rules) {
    if (!tasks.some((t) => t.tested && t.covers.includes(rule))) errors.push(`${rule} has no task with a test`);
  }
  return errors;
}

export function tasksDone(text) {
  const tasks = parseTasks(text);
  return tasks.length > 0 && tasks.every((t) => /^done\b/.test(t.progress?.Status ?? ''));
}

// Validates the documents present in a folder: { file: [errors] }.
export function validateFeature(docs) {
  const result = {};
  if (docs['requirements.md'] != null) {
    result['requirements.md'] = validateRequirements(docs['requirements.md']);
  }
  if (docs['design.md'] != null) result['design.md'] = validateDesign(docs['design.md']);
  if (docs['tasks.md'] != null) {
    result['tasks.md'] = [...validateTasks(docs['tasks.md']), ...checkCoverage(docs['tasks.md'], docs['requirements.md'])];
  }
  return result;
}

export function readDocs(folder) {
  const docs = {};
  for (const name of ['requirements.md', 'design.md', 'tasks.md']) {
    const path = join(folder, name);
    docs[name] = existsSync(path) ? readFileSync(path, 'utf8') : null;
  }
  return docs;
}

function main([folder]) {
  if (!folder) {
    console.error('usage: node scripts/validate-feature.mjs <story-folder>');
    return 1;
  }
  const docs = readDocs(resolve(folder));
  if (docs['requirements.md'] == null && docs['tasks.md'] == null) {
    console.error(`${folder}: no requirements.md or tasks.md to validate`);
    return 1;
  }
  let failed = false;
  for (const [file, errors] of Object.entries(validateFeature(docs))) {
    for (const error of errors) console.error(`${file}: ${error}`);
    if (errors.length) failed = true;
    else console.log(`${file}: ok`);
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
