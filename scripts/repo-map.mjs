#!/usr/bin/env node
// Repo map: files with classes, functions and signatures (with the line), ordered by the graph of
// references between files and cut by a token budget, in the style of Aider's repo map.
// Made by script, without going through the model; regenerated for each story.
// Usage: node scripts/repo-map.mjs [folder] [--budget <tokens>] [--focus <term1,term2>]
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const NAME = '(?<name>[A-Za-z_$][\\w$]*)';
const JS = [
  `^\\s*(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?function\\s*\\*?\\s*${NAME}`,
  `^\\s*(?:export\\s+)?(?:default\\s+)?(?:abstract\\s+)?class\\s+${NAME}`,
  `^\\s*export\\s+(?:declare\\s+)?(?:interface|type|enum|const|let|var)\\s+${NAME}`,
  `^\\s+(?:(?:public|private|protected|static|readonly|async|override|get|set)\\s+)*${NAME}\\s*\\([^)]*\\)\\s*(?::\\s*[^{=;]+)?\\{\\s*$`,
];
const C_LIKE = [
  `^\\s*(?:(?:public|private|protected|internal|static|abstract|sealed|final|partial|readonly)\\s+)*(?:class|interface|record|enum|struct)\\s+${NAME}`,
  `^\\s*(?:(?:public|private|protected|internal|static|abstract|virtual|override|async|final|synchronized|sealed)\\s+)+[\\w<>\\[\\],.?]+(?:\\s+[\\w<>\\[\\],.?]+)?\\s+${NAME}\\s*\\(`,
];
const PATTERNS = {
  js: JS,
  python: [`^\\s*(?:async\\s+)?def\\s+${NAME}`, `^\\s*class\\s+${NAME}`],
  go: [`^func\\s+(?:\\([^)]*\\)\\s*)?${NAME}`, `^type\\s+${NAME}`],
  cLike: C_LIKE,
  kotlin: [
    `^\\s*(?:(?:public|private|internal|protected|open|abstract|sealed|data|enum|inner|override|suspend|inline)\\s+)*(?:class|interface|object|fun)\\s+(?:<[^>]+>\\s*)?(?:\\w+\\.)?${NAME}`,
  ],
};
const LANGUAGE = {
  '.js': 'js', '.mjs': 'js', '.cjs': 'js', '.jsx': 'js', '.ts': 'js', '.tsx': 'js', '.mts': 'js', '.cts': 'js',
  '.py': 'python', '.go': 'go', '.cs': 'cLike', '.java': 'cLike', '.kt': 'kotlin', '.kts': 'kotlin',
};
const REGEXES = Object.fromEntries(Object.entries(PATTERNS).map(([lang, list]) => [lang, list.map((p) => new RegExp(p))]));
const KEYWORDS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'else', 'do', 'with', 'new']);
const IGNORED_DIRS = new Set([
  '.git', 'node_modules', 'dist', 'build', 'out', 'target', 'bin', 'obj', 'vendor', 'coverage',
  '.venv', 'venv', '__pycache__', '.next', '.nuxt', '.gradle', '.idea', '.vs', 'results',
]);
const MAX_FILE_BYTES = 500_000;
const MAX_LINE = 120;

export function definitions(file, text) {
  const regexes = REGEXES[LANGUAGE[extname(file).toLowerCase()]];
  if (!regexes) return [];
  const defs = [];
  text.replace(/\r\n/g, '\n').split('\n').forEach((line, index) => {
    for (const regex of regexes) {
      const name = line.match(regex)?.groups.name;
      if (!name) continue;
      if (!KEYWORDS.has(name)) defs.push({ line: index + 1, name, text: line.trim().slice(0, MAX_LINE) });
      break;
    }
  });
  return defs;
}

function walk(root, dir = root) {
  const files = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRS.has(entry.name)) files.push(...walk(root, join(dir, entry.name)));
    } else if (entry.isFile()) {
      files.push(relative(root, join(dir, entry.name)));
    }
  }
  return files;
}

// The project's code files: the ones git knows (respects .gitignore) or, outside a
// repository, a scan that skips dependency and build folders.
function sourceFiles(root) {
  const git = spawnSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' });
  const files = git.status === 0 ? git.stdout.split('\0').filter(Boolean) : walk(root);
  return files.map((f) => f.split(sep).join('/'))
    .filter((f) => LANGUAGE[extname(f).toLowerCase()] && !f.split('/').some((part) => IGNORED_DIRS.has(part)));
}

function readSource(root, file) {
  try {
    const path = join(root, file);
    return statSync(path).size > MAX_FILE_BYTES ? null : readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

// PageRank with a personalization vector: a file that defines names used by many others
// rises; the focus pulls up the files whose path or definition matches the term.
function rank(edges, personal) {
  const total = personal.reduce((a, b) => a + b, 0);
  const p = personal.map((w) => w / total);
  const out = edges.map((targets) => [...targets.values()].reduce((a, b) => a + b, 0));
  let scores = p.slice();
  for (let iteration = 0; iteration < 30; iteration += 1) {
    const dangling = scores.reduce((sum, s, i) => (out[i] ? sum : sum + s), 0);
    const next = p.map((pi) => 0.15 * pi + 0.85 * dangling * pi);
    edges.forEach((targets, from) => {
      for (const [to, weight] of targets) next[to] += 0.85 * scores[from] * (weight / out[from]);
    });
    scores = next;
  }
  return scores;
}

const tokens = (text) => Math.ceil(text.length / 4);

export const MIN_BUDGET = 50;

export function repoMap(root, { budget = 1500, focus = [] } = {}) {
  if (budget < MIN_BUDGET) throw new Error(`--budget minimum is ${MIN_BUDGET} tokens`);
  const parsed = sourceFiles(root).sort().map((file) => {
    const text = readSource(root, file);
    return text == null ? null : { file, text, defs: definitions(file, text) };
  }).filter(Boolean);
  const withDefs = parsed.filter((f) => f.defs.length);
  if (!withDefs.length) return `no definitions found in ${parsed.length} code files\n`;

  const definers = new Map();
  parsed.forEach((f, i) => f.defs.forEach((d) => definers.set(d.name, (definers.get(d.name) ?? new Set()).add(i))));
  const edges = parsed.map((f, i) => {
    const targets = new Map();
    const counts = new Map();
    for (const word of f.text.match(/[A-Za-z_$][\w$]*/g) ?? []) counts.set(word, (counts.get(word) ?? 0) + 1);
    for (const [word, count] of counts) {
      const owners = definers.get(word);
      if (!owners || owners.size > 5) continue;
      for (const owner of owners) if (owner !== i) targets.set(owner, (targets.get(owner) ?? 0) + count);
    }
    return targets;
  });
  const terms = focus.map((t) => t.toLowerCase()).filter(Boolean);
  const personal = parsed.map((f) => {
    const haystack = [f.file, ...f.defs.map((d) => d.name)].join(' ').toLowerCase();
    return terms.some((t) => haystack.includes(t)) ? 20 : 1;
  });
  const scores = rank(edges, personal);
  const order = parsed.map((f, i) => ({ file: f.file, defs: f.defs, score: scores[i] }))
    .filter((r) => r.defs.length)
    .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));

  const footer = (left) => `… ${left} files outside the budget of ${budget} tokens\n`;
  const block = (file, defs, cut) => {
    const shown = cut ? defs.slice(0, defs.length - cut) : defs;
    const more = cut ? `\n  … +${cut} definitions` : '';
    return `${file}\n${shown.map((d) => `  ${d.line}: ${d.text}`).join('\n')}${more}\n\n`;
  };
  let map = '';
  let shown = 0;
  for (const { file, defs } of order) {
    const left = order.length - shown - 1; // worst case: all the others stay out
    const fits = (text) => tokens(map + text + (left ? footer(left) : '')) <= budget;
    // A file that does not fit whole goes in with its first definitions; it only drops out if not even one fits.
    let cut = 0;
    while (cut < defs.length && !fits(block(file, defs, cut))) cut += 1;
    if (cut === defs.length) continue;
    map += block(file, defs, cut);
    shown += 1;
  }
  return shown < order.length ? map + footer(order.length - shown) : map;
}

function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: { budget: { type: 'string' }, focus: { type: 'string' } },
  });
  const budget = Number(values.budget ?? 1500);
  if (!Number.isInteger(budget) || budget <= 0) throw new Error('--budget must be a whole number of tokens greater than zero');
  if (positionals.length > 1) throw new Error('one folder only; separate the --focus terms with a comma: --focus term1,term2');
  const dir = resolve(positionals[0] ?? '.');
  if (!existsSync(dir)) throw new Error(`the folder ${positionals[0]} does not exist`);
  const focus = (values.focus ?? '').split(',').map((t) => t.trim());
  process.stdout.write(repoMap(dir, { budget, focus }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
