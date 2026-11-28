#!/usr/bin/env node
// Checks the structure of the documents Keel reads: keel/product.md, ADRs, requirements.md and
// design.md. Required sections come from this plugin's templates. Never writes a file and does
// not judge content.
// Usage: node doc-check.mjs <file> [<file> ...]
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEMPLATES = join(dirname(fileURLToPath(import.meta.url)), '..', 'templates');
const FROZEN_START = '<!-- frozen after approval: start -->';
const FROZEN_END = '<!-- frozen after approval: end -->';
const EARS = /^(?:(?:WHEN|WHILE|WHERE) .+ |IF .+ THEN )?THE .+ SHALL /;
const GHERKIN = /GIVEN .+ WHEN .+ THEN /;
const ADR_NAME = /^ADR-\d{3}-[a-z0-9]+(?:-[a-z0-9]+)*\.md$/;
// Template lines that are structure, not prose to fill: headings, markers, table rows, blanks.
const STRUCTURE_LINE = /^(#|<!--|\||$)/;
// The principles section of the product template is kept verbatim on purpose.
const VERBATIM_FROM = '## Engineering principles';
// Template sections a document may leave out: product.md of a project set up before them.
const OPTIONAL = new Set(['Quality goals']);
// Size budgets from docs/specification.md#arquivos: product.md fails above the limit; a story
// document only warns, because "about one page" is a guide, not a contract.
const BUDGETS = {
  product: { lines: 200, label: 'about 200 lines', error: true },
  requirements: { lines: 100, label: 'about one page (100 lines)', error: false },
  design: { lines: 200, label: 'about two pages (200 lines)', error: false },
};

export function kindOf(path) {
  const name = basename(path);
  if (name === 'product.md') return basename(dirname(resolve(path))) === 'keel' ? 'product' : null;
  if (name === 'requirements.md') return 'requirements';
  if (name === 'design.md') return 'design';
  if (/^adr-.*\.md$/i.test(name)) return 'adr';
  return null;
}

function lines(text) {
  return text.replace(/\r\n/g, '\n').split('\n');
}

function sections(text) {
  const result = [];
  let fenced = false;
  for (const line of lines(text)) {
    if (line.startsWith('```')) fenced = !fenced;
    if (!fenced && line.startsWith('## ')) result.push({ title: line.slice(3).trim(), body: [] });
    else result.at(-1)?.body.push(line);
  }
  return result.map(({ title, body }) => ({ title, body: body.join('\n') }));
}

function template(kind) {
  return readFileSync(join(TEMPLATES, `${kind}.md`), 'utf8');
}

function sectionErrors(text, expected) {
  const found = sections(text);
  const errors = [];
  for (const title of expected) {
    const section = found.find((s) => s.title === title);
    if (!section) errors.push(`missing section "${title}"`);
    else if (!section.body.replace(/<!--[\s\S]*?-->/g, '').trim()) errors.push(`section "${title}" is empty; write "not applicable"`);
  }
  return errors;
}

// Every prose line of the template copied verbatim is a leftover, and so is a literal "[source: ...]".
function leftoverErrors(text, templateText) {
  const prose = templateText.split(VERBATIM_FROM)[0];
  const leftovers = new Set(lines(prose).map((l) => l.trim()).filter((l) => !STRUCTURE_LINE.test(l)));
  const kept = text.includes(VERBATIM_FROM) && templateText.includes(VERBATIM_FROM) ? text.split(VERBATIM_FROM)[0] : text;
  const errors = [...new Set(lines(kept).map((l) => l.trim()).filter((l) => leftovers.has(l)))]
    .map((l) => `template text left: "${l.slice(0, 50)}"`);
  if (/\[source: \.\.\.\]/.test(text)) errors.push('literal [source: ...] left; cite the real source');
  return errors;
}

function frozenErrors(text) {
  const all = lines(text).map((l) => l.trim());
  const starts = all.filter((l) => l === FROZEN_START).length;
  const ends = all.filter((l) => l === FROZEN_END).length;
  const ordered = all.indexOf(FROZEN_START) < all.indexOf(FROZEN_END);
  return starts === 1 && ends === 1 && ordered ? [] : [`needs one "${FROZEN_START}" and, after it, one "${FROZEN_END}"`];
}

function duplicates(ids) {
  return ids.filter((id, i) => ids.indexOf(id) !== i).map((id) => `${id} duplicated`);
}

// Same checks and messages as the Keel's validate-feature.mjs, plus the source on every rule.
function ruleErrors(text) {
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
  const errors = [];
  if (rules.length === 0) errors.push('no R# rule in "Rules and acceptance criteria"');
  for (const line of malformed) {
    errors.push(`malformed line: "${line.slice(0, 40)}"; use "R1. <EARS>" and "  - AC-1.1 GIVEN ... WHEN ... THEN ..."`);
  }
  errors.push(...duplicates(rules.map((r) => r.id)), ...duplicates(rules.flatMap((r) => r.acs.map((a) => a.id))));
  for (const rule of rules) {
    if (!EARS.test(rule.text)) errors.push(`${rule.id} does not follow EARS (WHEN/IF ... THEN/WHILE/WHERE ... THE ... SHALL)`);
    if (rule.acs.length === 0) errors.push(`${rule.id} has no acceptance criterion`);
    for (const ac of rule.acs) {
      if (!GHERKIN.test(ac.text)) errors.push(`${ac.id} is not GIVEN/WHEN/THEN`);
      if (ac.rule !== rule.n) errors.push(`${ac.id} is under ${rule.id}`);
    }
    if (!/\[source: [^\]]+\]/.test(rule.text)) errors.push(`${rule.id} has no [source: ...]; cite it or turn it into a [QUESTION]`);
  }
  return errors;
}

// Pure check of one document: { errors, warnings, questions }.
export function checkDoc(kind, path, text) {
  const templateText = template(kind);
  const expected = sections(templateText).map((s) => s.title).filter((title) => !OPTIONAL.has(title));
  const errors = [...sectionErrors(text, expected), ...leftoverErrors(text, templateText)];
  const warnings = [];
  if (kind === 'requirements' || kind === 'design') errors.unshift(...frozenErrors(text));
  if (kind === 'requirements') errors.push(...ruleErrors(text));
  if (kind === 'adr' && !ADR_NAME.test(basename(path))) errors.push(`file name must be ADR-NNN-<slug>.md (lowercase slug), not ${basename(path)}`);
  const budget = BUDGETS[kind];
  const count = lines(text.trimEnd()).length;
  if (budget && count > budget.lines) {
    (budget.error ? errors : warnings).push(`${count} lines; the budget is ${budget.label}`);
  }
  return { errors, warnings, questions: (text.match(/\[QUESTION\]/g) ?? []).length };
}

function main(paths) {
  if (paths.length === 0) {
    console.error('usage: node doc-check.mjs <file> [<file> ...]');
    return 2;
  }
  let status = 0;
  for (const path of paths) {
    const kind = kindOf(path);
    if (!kind) {
      console.error(`${path}: not a Keel document (keel/product.md, adrs/ADR-NNN-*.md, requirements.md, design.md)`);
      status = 2;
      continue;
    }
    if (!existsSync(resolve(path))) {
      console.error(`${path}: file not found`);
      status = 2;
      continue;
    }
    const { errors, warnings, questions } = checkDoc(kind, path, readFileSync(resolve(path), 'utf8'));
    console.log(errors.length ? `${path}: ${errors.length} error${errors.length > 1 ? 's' : ''}` : `${path}: ok`);
    for (const error of errors) console.log(`  - ${error}`);
    for (const warning of warnings) console.log(`  ! ${warning}`);
    if (questions) console.log(`  ? ${questions} open [QUESTION]`);
    if (errors.length) status = Math.max(status, 1);
  }
  return status;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) process.exitCode = main(process.argv.slice(2));
