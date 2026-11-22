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
const REQUIRED_TASK_FIELDS = ['Covers', 'Files', 'New structure', 'Done when', 'Depends on'];
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
export function sections(text) {
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

// An [ASSUMPTION] still waiting for the dev: its line has no "accepted by" (templates/requirements.md).
export function pendingAssumptions(text) {
  return text.split('\n').filter((line) => line.includes('[ASSUMPTION]') && !/accepted by/i.test(line)).length;
}

const TRIGGERS = ['trade-off', 'contract', 'data/migration', 'new dependency', 'cross-cutting', 'pattern break', 'new structure', 'rung change'];
const STRUCTURE_KINDS = ['interface', 'layer', 'mapper/DTO', 'module', 'helper', 'dependency'];
const KIND_WORDS = ['interface', 'layer', 'mapper', 'dto', 'module', 'helper', 'dependency'];
const HEURISTIC = /\bR\d+\b|2nd implementation|external port|published boundary|3rd occurrence/i;
const EMPTY_CELL = /^[\s—–-]*$/;
// "No new structure" in the design section or in a task's New structure: field.
const NO_VALUE = /^\s*(none|nenhuma|not applicable|[—–-])\s*\.?\s*$/i;

export function tableRows(body) {
  const rows = body.split('\n').filter((l) => l.trim().startsWith('|'))
    .map((l) => l.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim()));
  return rows.slice(1).filter((cells) => !cells.every((c) => /^:?-+:?$/.test(c)));
}

// Rows of "New structure and rationale": [{ element, kind, rationale, simpler }].
export function parseNewStructure(text) {
  const body = sections(text).find((s) => s.title === 'New structure and rationale')?.body ?? '';
  return tableRows(body).map(([element = '', kind = '', rationale = '', simpler = '']) => ({ element, kind, rationale, simpler }));
}

function ruleIds(text) {
  return [...new Set(text.match(/\bR\d+\b/g) ?? [])];
}

export function validateDesign(text, requirementsText = null) {
  const errors = [...frozenErrors(text), ...checkSections(sections(text), DESIGN_SECTIONS)];
  const trigger = text.match(/^Trigger: (.*)$/m)?.[1];
  if (trigger == null) errors.push('missing the "Trigger:" line with the reason for the design');
  else if (!TRIGGERS.some((kind) => trigger.toLowerCase().startsWith(kind))) {
    errors.push(`Trigger: must start with one of: ${TRIGGERS.join(', ')}`);
  }
  const all = sections(text);
  const structure = all.find((s) => s.title === 'New structure and rationale');
  const rows = parseNewStructure(text);
  if (structure && structure.body.trim() && rows.length === 0 && !structure.body.split('\n').some((line) => NO_VALUE.test(line))) {
    errors.push('New structure and rationale: fill the table or write "none"');
  }
  for (const { element, kind, rationale, simpler } of rows) {
    const name = element.replace(/`/g, '');
    if (!KIND_WORDS.some((k) => kind.toLowerCase().includes(k))) {
      errors.push(`New structure "${name}": Kind must be one of: ${STRUCTURE_KINDS.join(', ')}`);
    }
    if (!HEURISTIC.test(rationale)) {
      errors.push(`New structure "${name}": Rationale needs R# or a heuristic (2nd implementation, external port, published boundary, 3rd occurrence)`);
    }
    if (EMPTY_CELL.test(simpler)) errors.push(`New structure "${name}": write the simpler alternative and why not`);
  }
  const adr = all.find((s) => s.title === 'ADR candidate?')?.body.trim().split('\n')[0] ?? '';
  if (adr && !/^(Yes|No) [—-] \S/.test(adr)) errors.push('ADR candidate?: write "Yes — <reason>" or "No — <reason>"');
  const approach = all.find((s) => s.title === 'Approach')?.body ?? '';
  if (approach.trim() && ruleIds(approach).length === 0) errors.push('Approach: cite the rules it meets (R1, R2)');
  if (requirementsText != null) {
    const rules = parseRules(requirementsText).map((r) => r.id);
    for (const id of ruleIds(frozenBlock(text).content ?? text)) {
      if (!rules.includes(id)) errors.push(`design.md cites ${id}, which does not exist in requirements.md`);
    }
  }
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
  const first = sections(text).find((s) => /^T1 [—-] /.test(s.title));
  if (tasks.length && !/^T1 [—-] Walking skeleton: \S/.test(first?.title ?? '')) {
    errors.push('T1 must be the walking skeleton: "## T1 — Walking skeleton: <minimal end-to-end path>"');
  }
  const ids = new Set(tasks.map((t) => t.id));
  for (const { id, fields, deps, frozen, progress } of tasks) {
    if (hasBlock && !frozen) errors.push(`${id} is outside the frozen block; the task plan goes inside it`);
    for (const name of ['Status', 'RED evidence', 'GREEN evidence', 'Review']) {
      if (name in fields) errors.push(`${id}: ${name}: belongs in "Progress", outside the frozen block`);
    }
    if (!progress) errors.push(`${id} has no entry in "Progress" (### ${id} with Status:)`);
    else if (!STATUS.test(progress.Status ?? '')) errors.push(`${id}: invalid Status "${progress.Status ?? ''}"`);
    for (const name of REQUIRED_TASK_FIELDS) if (!fields[name]) errors.push(`${id} has no ${name}:`);
    if (fields.Files && !/`[^`]+`/.test(fields.Files)) errors.push(`${id}: Files: put each path or glob in backticks (\`src/a.js\`, \`test/**\`)`);
    if (fields['Test first'] && !/\S\s+[—-]\s+\S/.test(fields['Test first'])) {
      errors.push(`${id}: Test first: needs "<test name> — <what it checks>"`);
    }
    const noTest = 'No test' in fields;
    if (noTest && 'Test first' in fields) errors.push(`${id} has both Test first: and No test:`);
    if (!noTest && !('Test first' in fields)) errors.push(`${id} has neither Test first: nor No test:`);
    if (!noTest && !/`[^`]+`/.test(fields['Verification'] ?? '')) errors.push(`${id}: Verification has no command in backticks`);
    for (const dep of deps) if (!ids.has(dep)) errors.push(`${id} depends on ${dep}, which does not exist`);
    if ('Regression' in fields) {
      const by = fields.Regression.match(/^delivered by (T\d+)$/)?.[1];
      if (!by) errors.push(`${id}: Regression: write "delivered by T<n>", the task whose code already does what this test checks`);
      else if (!ids.has(by)) errors.push(`${id}: Regression: ${by} does not exist`);
      if (noTest) errors.push(`${id}: a Regression task needs Test first:, the test it adds`);
    }
  }
  const cycle = findCycle(tasks);
  if (cycle) errors.push(`dependency cycle: ${cycle.join(' → ')}`);
  return errors;
}

// Every rule needs at least one task with a test; every task covers only existing rules.
// Without requirements.md (trivial level) the criterion lives in the task's Covers: as GIVEN/WHEN/THEN.
export function checkCoverage(tasksText, requirementsText) {
  const tasks = parseTasks(tasksText);
  if (requirementsText == null) {
    return tasks.filter((t) => !GHERKIN.test(t.fields.Covers ?? ''))
      .map((t) => `${t.id}: without requirements.md, Covers: needs the criterion as GIVEN ... WHEN ... THEN ...`);
  }
  const parsed = parseRules(requirementsText);
  const rules = parsed.map((r) => r.id);
  const acs = parsed.flatMap((r) => r.acs.map((a) => a.id));
  const errors = [];
  for (const task of tasks) {
    for (const rule of task.covers) if (!rules.includes(rule)) errors.push(`${task.id} covers ${rule}, which does not exist`);
    for (const ac of task.fields.Covers?.match(/\bAC-\d+\.\d+\b/g) ?? []) {
      if (!acs.includes(ac)) errors.push(`${task.id} covers ${ac}, which does not exist`);
      else if (!task.covers.includes(`R${ac.match(/\d+/)[0]}`)) errors.push(`${task.id} covers ${ac} without covering R${ac.match(/\d+/)[0]}`);
    }
  }
  for (const rule of rules) {
    if (!tasks.some((t) => t.tested && t.covers.includes(rule))) errors.push(`${rule} has no task with a test`);
  }
  return errors;
}

const plainElement = (text) => text.replace(/`/g, '').replace(/\s*\(.*\)\s*$/, '').trim();

// "New structure: none" or "A (interface), `B` (helper)" → ['A', 'B'].
function declaredStructure(field = '') {
  if (!field.trim() || NO_VALUE.test(field)) return [];
  return field.split(/,(?![^(]*\))/).map(plainElement).filter(Boolean);
}

// With design.md, structure is planned there and declared by the tasks: each one matches the other.
// Without design.md (trivial and standard levels) the task only declares.
export function checkStructure(tasksText, designText) {
  if (designText == null) return [];
  const designed = parseNewStructure(designText).map((r) => plainElement(r.element));
  const same = (a) => (b) => a.toLowerCase() === b.toLowerCase();
  const tasks = parseTasks(tasksText).map((t) => ({ id: t.id, declared: declaredStructure(t.fields['New structure']) }));
  const errors = [];
  for (const { id, declared } of tasks) {
    for (const name of declared) {
      if (!designed.some(same(name))) errors.push(`${id}: New structure "${name}" is not justified in design.md; add it to "New structure and rationale" or drop it`);
    }
  }
  for (const name of designed) {
    if (!tasks.some((t) => t.declared.some(same(name)))) errors.push(`${name} from design.md is not declared in any task's New structure:`);
  }
  return errors;
}

export function tasksDone(text) {
  const tasks = parseTasks(text);
  return tasks.length > 0 && tasks.every((t) => /^done\b/.test(t.progress?.Status ?? ''));
}

// One document checked on its own and against the others in the folder (rules, ACs, structure).
// Rule → task → test coverage is separate: keel-state.mjs has its own criterion for it.
export function validateDoc(name, docs) {
  if (name === 'requirements.md') return validateRequirements(docs[name]);
  if (name === 'design.md') return validateDesign(docs[name], docs['requirements.md']);
  if (name === 'tasks.md') return [...validateTasks(docs[name]), ...checkStructure(docs[name], docs['design.md'])];
  throw new Error(`unknown document ${name}`);
}

// Validates the documents present in a folder: { file: [errors] }.
export function validateFeature(docs) {
  const result = {};
  for (const name of ['requirements.md', 'design.md', 'tasks.md']) {
    if (docs[name] != null) result[name] = validateDoc(name, docs);
  }
  if (docs['tasks.md'] != null) result['tasks.md'].push(...checkCoverage(docs['tasks.md'], docs['requirements.md']));
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
