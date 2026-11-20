#!/usr/bin/env node
// Confere estrutura, IDs, EARS, cobertura regra → task → teste e marcadores abertos
// dos documentos de uma história. Não julga conteúdo.
// Uso: node scripts/validate-feature.mjs <pasta-da-história>
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIREMENTS_SECTIONS = [
  'História original', 'Objetivo', 'Fora de escopo', 'Regras e critérios de aceite',
  'Obrigações explícitas', 'Perguntas e suposições', 'Conflitos encontrados',
  'Mudanças após a confirmação',
];
const DESIGN_SECTIONS = [
  'Abordagem', 'Mapa de código', 'Contratos e dados', 'Estrutura nova e justificativa',
  'Alternativas consideradas', 'Preocupações transversais', 'Riscos e quebras de padrão',
  'Candidata a ADR?',
];
const TASKS_SECTIONS = ['Notas de implementação', 'Convergência (preenchida no fim, conferida por script)'];

const EARS = /^(?:(?:WHEN|WHILE|WHERE) .+ |IF .+ THEN )?THE .+ SHALL /;
const GHERKIN = /GIVEN .+ WHEN .+ THEN /;
const TASK_HEADING = /^T(\d+) [—-] /;
const STATUS = /^(pendente|red|green|em revisão|feita)( \(.+\))?$/;

// Separa o markdown em seções de nível 2: [{ title, body }].
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
    if (!section) errors.push(`falta a seção "${title}"`);
    else if (!section.body.trim()) errors.push(`seção "${title}" vazia; escreva "não se aplica"`);
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
  const body = sections(text).find((s) => s.title === 'Regras e critérios de aceite')?.body ?? '';
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
  const errors = checkSections(sections(text), REQUIREMENTS_SECTIONS);
  const rules = parseRules(text);
  if (rules.length === 0) errors.push('nenhuma regra R# em "Regras e critérios de aceite"');
  for (const line of rules.malformed) {
    errors.push(`linha malformada: "${line.slice(0, 40)}"; use "R1. <EARS>" e "  - AC-1.1 GIVEN ... WHEN ... THEN ..."`);
  }
  errors.push(...duplicates(rules.map((r) => r.id), 'repetida'));
  errors.push(...duplicates(rules.flatMap((r) => r.acs.map((a) => a.id)), 'repetido'));
  for (const rule of rules) {
    if (!EARS.test(rule.text)) errors.push(`${rule.id} não segue EARS (WHEN/IF ... THEN/WHILE/WHERE ... THE ... SHALL)`);
    if (rule.acs.length === 0) errors.push(`${rule.id} sem critério de aceite`);
    for (const ac of rule.acs) {
      if (!GHERKIN.test(ac.text)) errors.push(`${ac.id} fora de GIVEN/WHEN/THEN`);
      if (ac.rule !== rule.n) errors.push(`${ac.id} está sob ${rule.id}`);
    }
  }
  return errors;
}

export function openQuestions(text) {
  return (text.match(/\[PERGUNTA\]/g) ?? []).length;
}

export function validateDesign(text) {
  const errors = checkSections(sections(text), DESIGN_SECTIONS);
  if (!/^Gatilho: \S/m.test(text)) errors.push('falta a linha "Gatilho:" com o motivo do design');
  return errors;
}

export function parseTasks(text) {
  return sections(text).filter((s) => TASK_HEADING.test(s.title)).map((s) => {
    const fields = {};
    for (const line of s.body.split('\n')) {
      const field = line.match(/^([A-Za-zÀ-ú ]+): ?(.*)$/);
      if (field) fields[field[1]] = field[2].trim();
    }
    const deps = fields['Depende de'] ?? '';
    return {
      id: `T${s.title.match(TASK_HEADING)[1]}`,
      fields,
      covers: fields.Cobre?.match(/\bR\d+\b/g) ?? [],
      tested: 'Teste primeiro' in fields,
      deps: deps.match(/\bT\d+\b/g) ?? [],
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
  const errors = checkSections(sections(text), TASKS_SECTIONS);
  const tasks = parseTasks(text);
  if (tasks.length === 0) errors.push('nenhuma task "## T1 — ..."');
  errors.push(...duplicates(tasks.map((t) => t.id), 'repetida'));
  const ids = new Set(tasks.map((t) => t.id));
  for (const { id, fields, deps } of tasks) {
    if (!fields.Cobre) errors.push(`${id} sem Cobre:`);
    const noTest = 'Sem teste' in fields;
    if (noTest && 'Teste primeiro' in fields) errors.push(`${id} tem Teste primeiro: e Sem teste: ao mesmo tempo`);
    if (!noTest && !('Teste primeiro' in fields)) errors.push(`${id} sem Teste primeiro: nem Sem teste:`);
    if (!noTest && !/`[^`]+`/.test(fields['Verificação'] ?? '')) errors.push(`${id}: Verificação sem comando entre crases`);
    if (fields.Status !== undefined && !STATUS.test(fields.Status)) errors.push(`${id}: Status "${fields.Status}" inválido`);
    for (const dep of deps) if (!ids.has(dep)) errors.push(`${id} depende de ${dep}, que não existe`);
  }
  const cycle = findCycle(tasks);
  if (cycle) errors.push(`ciclo de dependências: ${cycle.join(' → ')}`);
  return errors;
}

// Toda regra precisa de ao menos uma task com teste; toda task só cobre regras existentes.
// Sem requirements.md (nível trivial) o critério fica na própria task e não há o que cruzar.
export function checkCoverage(tasksText, requirementsText) {
  if (requirementsText == null) return [];
  const rules = parseRules(requirementsText).map((r) => r.id);
  const tasks = parseTasks(tasksText);
  const errors = [];
  for (const task of tasks) {
    for (const rule of task.covers) if (!rules.includes(rule)) errors.push(`${task.id} cobre ${rule}, que não existe`);
  }
  for (const rule of rules) {
    if (!tasks.some((t) => t.tested && t.covers.includes(rule))) errors.push(`${rule} sem task com teste`);
  }
  return errors;
}

export function tasksDone(text) {
  const tasks = parseTasks(text);
  return tasks.length > 0 && tasks.every((t) => /^feita\b/.test(t.fields.Status ?? ''));
}

// Valida os documentos presentes numa pasta: { arquivo: [erros] }.
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
    console.error('uso: node scripts/validate-feature.mjs <pasta-da-história>');
    return 1;
  }
  const docs = readDocs(resolve(folder));
  if (docs['requirements.md'] == null && docs['tasks.md'] == null) {
    console.error(`${folder}: nenhum requirements.md ou tasks.md para validar`);
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
