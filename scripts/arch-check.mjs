#!/usr/bin/env node
// Confere keel/architecture.json com um varredor de imports aproximado (JS/TS e Python),
// para quando o projeto não tem a ferramenta nativa da linguagem.
// Uso: node scripts/arch-check.mjs [--root <pasta>] [--json] [--write-baseline] [--files a,b]
// Saída: 0 sem violação nova (ou sem architecture.json), 1 com violação nova, 2 configuração inválida.
import { existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CONFIG_PATH = 'keel/architecture.json';
const DEFAULT_BASELINE = 'keel/arch-baseline.txt';
const CYCLE_FIX = 'quebre o ciclo invertendo uma das dependências ou extraindo o que é comum';

const JS_EXTENSIONS = ['.ts', '.tsx', '.js', '.mjs', '.cjs', '.jsx', '.mts', '.cts'];
const SOURCE_EXTENSIONS = new Set([...JS_EXTENSIONS, '.py']);
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'coverage', '.venv', 'venv', '__pycache__', '.next', 'target', 'results']);

// Pacotes por categoria. Casam por nome exato ou prefixo "nome/" (JS) ou "nome." (Python);
// o prefixo mais longo vence. "clock" não tem pacote padrão: declare-o em "externals".
// "externals" do architecture.json soma pacotes a uma categoria ou cria categorias novas.
export const DEFAULT_EXTERNALS = {
  web: ['express', 'fastify', 'koa', '@nestjs', 'next', 'hapi', 'flask', 'fastapi', 'django', 'starlette'],
  db: ['pg', 'mysql', 'mysql2', 'mongodb', 'mongoose', 'typeorm', '@prisma/client', 'prisma', 'sequelize', 'knex',
    'sqlite3', 'better-sqlite3', 'redis', 'ioredis', 'sqlalchemy', 'psycopg2', 'psycopg', 'pymongo', 'django.db'],
  http: ['axios', 'node-fetch', 'got', 'undici', 'http', 'https', 'node:http', 'node:https', 'requests', 'httpx', 'aiohttp', 'urllib.request'],
  fs: ['fs', 'fs/promises', 'node:fs', 'node:fs/promises', 'pathlib', 'shutil'],
  clock: [],
};

const toPosix = (path) => path.split(sep).join('/');
const lineAt = (text, index) => text.slice(0, index).split('\n').length;

export function globToRegExp(glob) {
  let source = '';
  for (let i = 0; i < glob.length; i++) {
    const char = glob[i];
    if (char === '*' && glob[i + 1] === '*') {
      const before = i === 0 || glob[i - 1] === '/';
      const after = glob[i + 2];
      if (before && after === '/') { source += '(?:.*/)?'; i += 2; }
      else if (before && after === undefined && source.endsWith('/')) { source = `${source.slice(0, -1)}(?:/.*)?`; i += 1; }
      else { source += '.*'; i += 1; }
    } else if (char === '*') source += '[^/]*';
    else if (char === '?') source += '[^/]';
    else source += char.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${source}$`);
}

const isPython = (path) => path.endsWith('.py');

// Troca comentários // e /* */ fora de strings por espaços, preservando as quebras de linha.
// Com strings: true, troca também o conteúdo das strings. Aproximado: não reconhece literais de regex.
export function blankComments(text, { strings = false } = {}) {
  let out = '';
  let quote = null;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quote) {
      const hide = (c) => (strings && c !== '\n' ? ' ' : c);
      if (char === '\\') { out += hide(char) + hide(text[i + 1] ?? ''); i++; continue; }
      if (char === quote || (char === '\n' && quote !== '`')) { quote = null; out += char; continue; }
      out += hide(char);
      continue;
    }
    if (char === '/' && (text[i + 1] === '/' || text[i + 1] === '*')) {
      const block = text[i + 1] === '*';
      const end = block ? text.indexOf('*/', i + 2) : text.indexOf('\n', i);
      const stop = end === -1 ? text.length : block ? end + 2 : end;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop - 1;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') quote = char;
    out += char;
  }
  return out;
}

function parseJs(text) {
  const clean = blankComments(text);
  // Só vale import cuja palavra-chave está fora de string.
  const code = blankComments(text, { strings: true });
  const patterns = [
    /(?<![\w$.])(?:import|export)\s+(?:type\s+)?[\w$*{},\s]*?\bfrom\s*(['"])([^'"\n]+)\1/g,
    /(?<![\w$.])import\s*(['"])([^'"\n]+)\1/g,
    /(?<![\w$.])(?:require|import)\s*\(\s*(['"])([^'"\n]+)\1\s*\)/g,
  ];
  const found = [];
  for (const pattern of patterns) {
    for (const match of clean.matchAll(pattern)) if (code[match.index] === clean[match.index]) found.push({ specifier: match[2], line: lineAt(clean, match.index), index: match.index });
  }
  return found.sort((a, b) => a.index - b.index).map(({ specifier, line }) => ({ specifier, line }));
}

function parsePython(text) {
  const lines = text.split('\n');
  const found = [];
  let inString = false;
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const quotes = (raw.match(/"""|'''/g) ?? []).length;
    const skip = inString || /^\s*#/.test(raw);
    if (quotes % 2 === 1) inString = !inString;
    if (skip) continue;
    let j = i;
    for (const statement of raw.replace(/#.*$/, '').split(';')) {
      const plain = statement.match(/^\s*import\s+(.+)$/);
      if (plain) {
        for (const part of plain[1].split(',')) {
          const specifier = part.trim().split(/\s+as\s+/)[0].trim();
          if (/^[\w.]+$/.test(specifier)) found.push({ specifier, line: i + 1 });
        }
        continue;
      }
      const from = statement.match(/^\s*from\s+(\.+[\w.]*|[\w.]+)\s+import\s+(.*)$/);
      if (!from) continue;
      let clause = from[2];
      if (clause.includes('(')) {
        while (!clause.includes(')') && j + 1 < lines.length) clause += ` ${lines[++j].replace(/#.*$/, '')}`;
      } else {
        while (clause.trimEnd().endsWith('\\') && j + 1 < lines.length) clause = `${clause.trimEnd().slice(0, -1)} ${lines[++j]}`;
      }
      const names = clause.replace(/[()\\]/g, ' ').split(',')
        .map((part) => part.trim().split(/\s+as\s+/)[0].trim())
        .filter((name) => /^\w+$/.test(name));
      found.push({ specifier: from[1], line: i + 1, names });
    }
    i = j;
  }
  return found;
}

export function parseImports(text, path) {
  const normalized = text.replace(/\r\n?/g, '\n');
  return isPython(path) ? parsePython(normalized) : parseJs(normalized);
}

function jsPackage(specifier) {
  const parts = specifier.split('/');
  return specifier.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

function classify(specifier, python, externals) {
  const separator = python ? '.' : '/';
  let best = null;
  for (const [category, entries] of Object.entries(externals)) {
    for (const entry of entries) {
      if ((specifier === entry || specifier.startsWith(entry + separator)) && (!best || entry.length > best.entry.length)) best = { category, entry };
    }
  }
  return best?.category ?? null;
}

function resolveJsFile(base, fileSet) {
  const stem = base.replace(/\/+$/, '');
  const candidates = [stem, ...JS_EXTENSIONS.map((ext) => stem + ext)];
  const js = stem.match(/^(.*)\.(js|mjs|cjs|jsx)$/);
  if (js) candidates.push(...{ js: ['.ts', '.tsx'], mjs: ['.mts'], cjs: ['.cts'], jsx: ['.tsx'] }[js[2]].map((ext) => js[1] + ext));
  candidates.push(...JS_EXTENSIONS.map((ext) => `${stem}/index${ext}`));
  return candidates.find((p) => fileSet.has(p));
}

// Aliases de tsconfig/jsconfig: devolve os caminhos candidatos, ou null se nenhum padrão casa.
function aliasTargets(specifier, aliases) {
  if (!aliases) return null;
  const base = aliases.baseUrl ?? '.';
  for (const [pattern, targets] of Object.entries(aliases.paths ?? {})) {
    let star = null;
    if (pattern.includes('*')) {
      const [prefix, suffix] = pattern.split('*');
      if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix) || specifier.length < prefix.length + suffix.length) continue;
      star = specifier.slice(prefix.length, specifier.length - suffix.length);
    } else if (pattern !== specifier) continue;
    return (Array.isArray(targets) ? targets : []).map((t) => posix.normalize(posix.join(base, star == null ? t : t.replace('*', star))));
  }
  return null;
}

// Resolve um import para arquivos do projeto ({ internal: [paths] }), um pacote externo
// ({ external }) ou um import que parece do projeto mas não foi achado ({ unresolved: true }).
function resolveImport(imp, from, context) {
  const { fileSet, externals, roots, aliases, topDirs } = context;
  if (isPython(from)) {
    const names = imp.names ?? [];
    let bases;
    if (imp.specifier.startsWith('.')) {
      const dots = imp.specifier.match(/^\.+/)[0].length;
      let dir = posix.dirname(from);
      for (let k = 1; k < dots; k++) dir = posix.dirname(dir);
      const rest = imp.specifier.slice(dots).split('.').filter(Boolean);
      bases = [posix.join(dir, ...rest)];
    } else {
      const parts = imp.specifier.split('.');
      bases = ['', 'src', ...roots].map((r) => [r, ...parts].filter(Boolean).join('/'));
    }
    for (const base of bases) {
      const clean = base === '.' ? '' : base;
      const pick = (stem) => [`${stem}.py`, `${stem ? `${stem}/` : ''}__init__.py`].find((p) => fileSet.has(p));
      const internal = [];
      let unresolvedName = names.length === 0;
      for (const name of names) {
        const hit = pick(clean ? `${clean}/${name}` : name);
        if (hit) internal.push(hit);
        else unresolvedName = true;
      }
      const self = clean ? pick(clean) : fileSet.has('__init__.py') ? '__init__.py' : undefined;
      if (unresolvedName && self) internal.push(self);
      if (internal.length) return { internal };
    }
    if (imp.specifier.startsWith('.')) return { internal: [] };
    const category = classify(imp.specifier, true, externals);
    const top = imp.specifier.split('.')[0];
    if (!category && topDirs.has(top)) return { unresolved: true };
    return { external: { name: top, category } };
  }
  const { specifier } = imp;
  if (specifier.startsWith('.')) {
    const hit = resolveJsFile(posix.normalize(posix.join(posix.dirname(from), specifier)), fileSet);
    return { internal: hit ? [hit] : [] };
  }
  if (specifier.startsWith('/')) return { internal: [] };
  const targets = aliasTargets(specifier, aliases);
  for (const target of targets ?? []) {
    const hit = resolveJsFile(target, fileSet);
    if (hit) return { internal: [hit] };
  }
  if (aliases?.baseUrl != null) {
    const hit = resolveJsFile(posix.normalize(posix.join(aliases.baseUrl, specifier)), fileSet);
    if (hit) return { internal: [hit] };
  }
  const category = classify(specifier, false, externals);
  const looksLocal = targets !== null || /^[@~]\//.test(specifier) || topDirs.has(specifier.split('/')[0]);
  if (!category && looksLocal) return { unresolved: true };
  return { external: { name: jsPackage(specifier), category } };
}

function validateConfig(config, paths) {
  const fail = (message) => { throw new Error(`${CONFIG_PATH}: ${message}`); };
  if (!config || typeof config !== 'object' || Array.isArray(config)) fail('esperado um objeto');
  const components = config.components ?? {};
  if (typeof components !== 'object' || Array.isArray(components)) fail('"components" deve ser um objeto nome → lista de globs');
  for (const [name, globs] of Object.entries(components)) {
    if (!Array.isArray(globs) || globs.some((g) => typeof g !== 'string')) fail(`componente ${name}: esperada uma lista de globs`);
  }
  const externals = { ...DEFAULT_EXTERNALS };
  for (const [category, entries] of Object.entries(config.externals ?? {})) {
    if (!Array.isArray(entries) || entries.some((e) => typeof e !== 'string')) fail(`externals.${category}: esperada uma lista de pacotes`);
    externals[category] = [...(DEFAULT_EXTERNALS[category] ?? []), ...entries];
  }
  const roots = config.roots ?? [];
  if (!Array.isArray(roots) || roots.some((r) => typeof r !== 'string')) fail('"roots" deve ser uma lista de pastas');
  const matches = (component) => {
    const regexes = components[component].map(globToRegExp);
    return paths.some((path) => regexes.some((re) => re.test(path)));
  };
  if (!Array.isArray(config.rules ?? [])) fail('"rules" deve ser uma lista');
  for (const rule of config.rules ?? []) {
    const name = rule?.name;
    if (typeof name !== 'string' || !name) fail('regra sem "name"');
    if (!(rule.from in components)) fail(`regra ${name}: componente desconhecido "${rule.from}" em "from"`);
    if (!matches(rule.from)) {
      fail(`regra ${name} casa com zero arquivos (componente ${rule.from}); corrija os globs para evitar passe vazio`);
    }
    if (!Array.isArray(rule.forbid)) fail(`regra ${name}: "forbid" deve ser uma lista`);
    for (const target of rule.forbid) {
      if (typeof target === 'string' && target.startsWith('external:')) {
        const category = target.slice('external:'.length);
        if (!(category in externals)) fail(`regra ${name}: categoria externa desconhecida "${category}"`);
      } else if (!(target in components)) fail(`regra ${name}: componente desconhecido "${target}" em "forbid"`);
      else if (!matches(target)) fail(`regra ${name}: componente ${target} em "forbid" casa com zero arquivos; corrija os globs`);
    }
    if (typeof rule.fix !== 'string' || !rule.fix.trim()) fail(`regra ${name} sem "fix"`);
  }
  const noCycles = config.noCycles ?? [];
  if (!Array.isArray(noCycles) || noCycles.some((g) => typeof g !== 'string')) fail('"noCycles" deve ser uma lista de globs');
  for (const pattern of noCycles) {
    const regex = globToRegExp(pattern);
    if (!paths.some((path) => moduleOf(path, regex))) fail(`noCycles: "${pattern}" não casa com nenhum módulo; corrija o glob`);
  }
  if (config.baseline != null && typeof config.baseline !== 'string') fail('"baseline" deve ser um caminho');
  return { components, externals, rules: config.rules ?? [], noCycles, roots: roots.map((r) => toPosix(r).replace(/^\.\/|\/+$/g, '')).filter(Boolean) };
}

// Módulo de um arquivo para um padrão de noCycles: o menor prefixo do caminho que casa com o glob.
function moduleOf(path, regex) {
  const parts = path.split('/');
  for (let k = 1; k <= parts.length; k++) {
    const prefix = parts.slice(0, k).join('/');
    if (regex.test(prefix)) return prefix;
  }
  return null;
}

// Tarjan: componentes fortemente conexos com mais de um nó.
function stronglyConnected(graph) {
  let index = 0;
  const stack = [];
  const meta = new Map();
  const result = [];
  const visit = (node) => {
    meta.set(node, { index, low: index, onStack: true });
    index++;
    stack.push(node);
    for (const next of graph.get(node) ?? []) {
      if (!meta.has(next)) {
        visit(next);
        meta.get(node).low = Math.min(meta.get(node).low, meta.get(next).low);
      } else if (meta.get(next).onStack) {
        meta.get(node).low = Math.min(meta.get(node).low, meta.get(next).index);
      }
    }
    if (meta.get(node).low === meta.get(node).index) {
      const scc = [];
      let member;
      do {
        member = stack.pop();
        meta.get(member).onStack = false;
        scc.push(member);
      } while (member !== node);
      if (scc.length > 1) result.push(scc);
    }
  };
  for (const node of [...graph.keys()].sort()) if (!meta.has(node)) visit(node);
  return result;
}

// Ciclo mais curto que sai do menor módulo do componente e volta a ele.
function shortestCycle(start, graph, members) {
  const previous = new Map([[start, null]]);
  const queue = [start];
  while (queue.length) {
    const node = queue.shift();
    for (const next of [...(graph.get(node) ?? [])].sort()) {
      if (!members.has(next)) continue;
      if (next === start) {
        const path = [];
        for (let n = node; n !== null; n = previous.get(n)) path.unshift(n);
        return [...path, start];
      }
      if (!previous.has(next)) { previous.set(next, node); queue.push(next); }
    }
  }
  return null;
}

export function parseBaseline(text) {
  return new Set(text.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#')));
}

// files: Map ou objeto caminho posix relativo → conteúdo. baseline: Set de chaves conhecidas.
// aliases: { baseUrl, paths } lidos do tsconfig/jsconfig, ou null.
export function checkArchitecture({ config, files, baseline = new Set(), aliases = null }) {
  const entries = files instanceof Map ? [...files] : Object.entries(files);
  const paths = entries.map(([path]) => path).sort();
  const fileSet = new Set(paths);
  const { components, externals, rules, noCycles, roots } = validateConfig(config, paths);
  const topDirs = new Set(paths.filter((p) => p.includes('/')).map((p) => p.split('/')[0]));
  const context = { fileSet, externals, roots, aliases, topDirs };
  const unresolved = [];

  const componentRegexes = Object.entries(components).map(([name, globs]) => [name, globs.map(globToRegExp)]);
  const componentsOf = (path) => new Set(componentRegexes.filter(([, res]) => res.some((re) => re.test(path))).map(([name]) => name));

  const edges = [];
  for (const [path, text] of entries) {
    for (const imp of parseImports(text, path)) {
      const resolved = resolveImport(imp, path, context);
      if (resolved.unresolved) unresolved.push({ file: path, line: imp.line, specifier: imp.specifier });
      for (const target of resolved.internal ?? []) if (target !== path) edges.push({ from: path, line: imp.line, specifier: imp.specifier, target });
      if (resolved.external) edges.push({ from: path, line: imp.line, specifier: imp.specifier, external: resolved.external });
    }
  }

  const all = new Map();
  const add = (violation) => { if (!all.has(violation.key)) all.set(violation.key, violation); };

  for (const rule of rules) {
    const forbiddenComponents = rule.forbid.filter((t) => !t.startsWith('external:'));
    const forbiddenCategories = new Set(rule.forbid.filter((t) => t.startsWith('external:')).map((t) => t.slice('external:'.length)));
    for (const edge of edges) {
      if (!componentsOf(edge.from).has(rule.from)) continue;
      let target = null;
      let label = null;
      if (edge.external) {
        if (edge.external.category && forbiddenCategories.has(edge.external.category)) {
          target = `external:${edge.external.category}:${edge.external.name}`;
          label = `external:${edge.external.category}`;
        }
      } else {
        const hit = forbiddenComponents.find((c) => componentsOf(edge.target).has(c));
        if (hit) { target = edge.target; label = `componente ${hit}`; }
      }
      if (!target) continue;
      add({
        key: `${rule.name}|${edge.from}|${target}`,
        rule: rule.name,
        file: edge.from,
        line: edge.line,
        target,
        message: `${edge.from}:${edge.line} importa "${edge.specifier}" (${label}), proibido pela regra ${rule.name}. Correção: ${rule.fix}`,
      });
    }
  }

  for (const pattern of noCycles) {
    const regex = globToRegExp(pattern);
    const graph = new Map();
    const witness = new Map();
    for (const edge of edges) {
      if (!edge.target) continue;
      const a = moduleOf(edge.from, regex);
      const b = moduleOf(edge.target, regex);
      if (!a || !b || a === b) continue;
      if (!graph.has(a)) graph.set(a, new Set());
      graph.get(a).add(b);
      if (!witness.has(`${a}>${b}`)) witness.set(`${a}>${b}`, edge);
    }
    for (const scc of stronglyConnected(graph)) {
      const start = [...scc].sort()[0];
      const cycle = shortestCycle(start, graph, new Set(scc));
      const edge = witness.get(`${cycle[0]}>${cycle[1]}`);
      const chain = cycle.join(' -> ');
      add({
        key: `noCycles|${chain}`,
        rule: 'noCycles',
        file: edge.from,
        line: edge.line,
        target: edge.target,
        modules: cycle.slice(0, -1),
        message: `ciclo entre módulos (${pattern}): ${chain}; ${edge.from}:${edge.line} importa "${edge.specifier}". Correção: ${CYCLE_FIX}`,
      });
    }
  }

  const found = [...all.values()].sort((a, b) => a.key.localeCompare(b.key));
  return {
    violations: found.filter((v) => !baseline.has(v.key)),
    known: found.filter((v) => baseline.has(v.key)),
    stale: [...baseline].filter((key) => !all.has(key)).sort(),
    unresolved: unresolved.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line),
  };
}

function walk(root, dir = root, out = new Map()) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(root, join(dir, entry.name), out);
    } else if (entry.isFile()) {
      const dot = entry.name.lastIndexOf('.');
      if (dot > 0 && SOURCE_EXTENSIONS.has(entry.name.slice(dot))) {
        const full = join(dir, entry.name);
        out.set(toPosix(relative(root, full)), readFileSync(full, 'utf8'));
      }
    }
  }
  return out;
}

// Lê compilerOptions.baseUrl e paths do tsconfig.json ou jsconfig.json da raiz (sem seguir "extends").
export function loadAliases(root) {
  for (const name of ['tsconfig.json', 'jsconfig.json']) {
    const file = join(root, name);
    if (!existsSync(file)) continue;
    try {
      const json = JSON.parse(blankComments(readFileSync(file, 'utf8')).replace(/,(\s*[}\]])/g, '$1'));
      const options = json?.compilerOptions ?? {};
      if (options.paths == null && options.baseUrl == null) return { aliases: null, notes: [] };
      const baseUrl = typeof options.baseUrl === 'string' ? posix.normalize(toPosix(options.baseUrl)) : null;
      return { aliases: { baseUrl, paths: options.paths ?? {} }, notes: [] };
    } catch (error) {
      return { aliases: null, notes: [`${name} ignorado: não é JSON válido (${error.message}); aliases não serão resolvidos`] };
    }
  }
  return { aliases: null, notes: [] };
}

// null quando o projeto não tem keel/architecture.json.
export function loadProject(root) {
  const configFile = join(root, ...CONFIG_PATH.split('/'));
  if (!existsSync(configFile)) return null;
  let config;
  try {
    config = JSON.parse(readFileSync(configFile, 'utf8'));
  } catch (error) {
    throw new Error(`${CONFIG_PATH} não é JSON válido: ${error.message}`);
  }
  const baselinePath = typeof config?.baseline === 'string' ? config.baseline : DEFAULT_BASELINE;
  const baselineFile = join(root, ...baselinePath.split('/'));
  const baseline = existsSync(baselineFile) ? parseBaseline(readFileSync(baselineFile, 'utf8')) : new Set();
  return { config, files: walk(root), baseline, baselinePath, ...loadAliases(root) };
}

function relevant(violation, only) {
  if (only.has(violation.file)) return true;
  return (violation.modules ?? []).some((m) => [...only].some((f) => f === m || f.startsWith(`${m}/`)));
}

export function runCheck(root, { files } = {}) {
  const project = loadProject(root);
  if (!project) return { status: 'skipped' };
  const result = checkArchitecture(project);
  if (files?.length) {
    const only = new Set(files.map((f) => toPosix(isAbsolute(f) ? relative(root, f) : f).replace(/^\.\//, '')));
    result.violations = result.violations.filter((v) => relevant(v, only));
    result.known = result.known.filter((v) => relevant(v, only));
    result.unresolved = result.unresolved.filter((u) => only.has(u.file));
  }
  return {
    status: result.violations.length ? 'fail' : 'ok',
    approximate: true,
    files: project.files.size,
    baselinePath: project.baselinePath,
    notes: project.notes,
    ...result,
  };
}

export function writeBaseline(root) {
  const project = loadProject(root);
  if (!project) return null;
  const { violations, known } = checkArchitecture({ ...project, baseline: new Set() });
  const keys = [...violations, ...known].map((v) => v.key).sort();
  const file = join(root, ...project.baselinePath.split('/'));
  mkdirSync(dirname(file), { recursive: true });
  const header = '# Baseline do arch-check (varredor aproximado): violações conhecidas, uma chave por linha.\n# Só violações novas falham. Apague a linha quando a violação for corrigida.\n';
  writeFileSync(file, header + keys.map((k) => `${k}\n`).join(''));
  return { path: project.baselinePath, count: keys.length };
}

function parseArgs(argv) {
  const options = { root: process.cwd(), json: false, writeBaseline: false, files: undefined };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--root') options.root = argv[++i];
    else if (arg === '--json') options.json = true;
    else if (arg === '--write-baseline') options.writeBaseline = true;
    else if (arg === '--files') options.files = (argv[++i] ?? '').split(',').map((f) => f.trim()).filter(Boolean);
    else throw new Error(`argumento desconhecido: ${arg}`);
  }
  if (!options.root) throw new Error('--root precisa de uma pasta');
  options.root = resolve(options.root);
  return options;
}

const SKIPPED = `sem ${CONFIG_PATH}: checagem de arquitetura pulada (skipped)`;

function main(argv) {
  let options;
  try {
    options = parseArgs(argv);
    if (options.writeBaseline) {
      const written = writeBaseline(options.root);
      if (!written) console.log(options.json ? JSON.stringify({ status: 'skipped' }) : SKIPPED);
      else if (options.json) console.log(JSON.stringify({ status: 'baseline', ...written }));
      else console.log(`baseline gravada em ${written.path}: ${written.count} violação(ões) conhecida(s)`);
      return 0;
    }
    const result = runCheck(options.root, { files: options.files });
    if (options.json) {
      console.log(JSON.stringify(result, null, 2));
      return result.status === 'fail' ? 1 : 0;
    }
    if (result.status === 'skipped') {
      console.log(SKIPPED);
      return 0;
    }
    console.log(`arch-check (varredor aproximado): ${result.files} arquivo(s) lido(s), ${result.violations.length} violação(ões) nova(s), ${result.known.length} conhecida(s) na baseline`);
    for (const note of result.notes) console.log(`nota: ${note}`);
    for (const violation of result.violations) console.log(`- ${violation.message}`);
    if (result.unresolved.length) {
      console.log('imports não resolvidos (aproximado), não contam como violação:');
      for (const u of result.unresolved) console.log(`  ${u.file}:${u.line} "${u.specifier}"`);
    }
    for (const key of result.stale) console.log(`pode sair da baseline: ${key}`);
    return result.status === 'fail' ? 1 : 0;
  } catch (error) {
    if (options?.json) console.log(JSON.stringify({ status: 'error', error: error.message }));
    console.error(error.message);
    return 2;
  }
}

function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry || !existsSync(entry)) return false;
  return realpathSync(entry) === realpathSync(fileURLToPath(import.meta.url));
}

if (invokedDirectly()) {
  process.exitCode = main(process.argv.slice(2));
}
