#!/usr/bin/env node
// Reads and reviews the project's instruction files (AGENTS.md, CLAUDE.md and relatives) for
// Keel setup. scan, review, quote, restructure-check and check only read. Only three commands
// write, each after the dev's approval: block apply/remove (the optional keel block, between
// <!-- keel:start --> and <!-- keel:end -->, in a single file) and import-agents (the
// @AGENTS.md line at the top of CLAUDE.md). Nothing outside the block changes: BOM and CRLF stay as they are.
import {
  existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const TEMPLATES_DIR = fileURLToPath(new URL('../templates/', import.meta.url));
export const LANGS = ['pt-BR', 'en'];
export const MAX_BLOCK_LINES = 6;
export const MAX_BLOCK_BYTES = 700;
export const MAX_FILE_LINES = 150;
const BOM = '\uFEFF';
const CLAUDE_FILES = ['CLAUDE.md', '.claude/CLAUDE.md'];
const BLOCK_TARGETS = ['AGENTS.md', 'CLAUDE.md', '.claude/CLAUDE.md'];
const SKIP_DIRS = new Set(['.git', 'node_modules', 'dist', 'build', 'vendor', '.venv']);
const OTHER_AGENTS = ['.github/copilot-instructions.md', '.cursor/rules', 'GEMINI.md'];
const SETTINGS = ['.claude/settings.json', '.claude/settings.local.json'];
const FALLBACK_HEADINGS = ['Commands', 'Conventions', 'Boundaries', 'Done when', 'Pitfalls', 'More details'];

const CONFLICT_MESSAGE = 'Conflicts with the Keel flow. The dev decides: (a) change the file itself (Keel shows the '
  + 'suggested text and does not apply it); (b) the rule applies only outside Keel stories; or (c) keep it, aware that '
  + 'the hook blocks during a story.';
const CONFLICTS = [
  /\b(commit|push)\w*\b.{0,40}\b(directly|straight)\s+(to|on|into)\b/i,
  /\bcommit\w*\b.{0,40}\bwithout\s+(asking|approval|review|confirmation|permission)/i,
  /(?<!\b(don'?t|do not|never)\s+)\bskip(ping)?\s+(the\s+)?(writing\s+|running\s+)?tests?\b/i,
  /\bno\s+need\s+(for|to\s+(write|run|add))\s+(any\s+)?tests?\b/i,
  /\b(don'?t|do not|never|no need to)\s+ask\s+(for\s+)?(confirmation|approval|permission)/i,
  /\b(commit\w*|push)\s+direto\b/i,
  /\bsem\s+pedir\s+(aprova|confirma|permiss)/i,
  /(?<!\bn[ãa]o\s+)\bpul(e|ar|ando)\s+(os\s+)?testes?\b/i,
  /\bn[ãa]o\s+precisa\s+(de\s+)?(escrever\s+|rodar\s+)?testes?\b/i,
  /\bn[ãa]o\s+(pe[çc]a|pergunte)\s+(por\s+)?(confirma|aprova|permiss)/i,
];

const CHECK_COMMAND = /\b(test|tests|build|lint|check|verify|typecheck|pytest|jest|vitest|tsc|ruff|eslint|clippy|mypy|phpunit|rspec)\b/i;

// Headings that count as each section of templates/agents.md, in English and Portuguese.
const SECTION_SYNONYMS = {
  Commands: /command|comando|setup|\brun\b|rodar|build|scripts|development|desenvolvimento|getting started|testing|testes/i,
  Conventions: /convention|conven[çc]|padr[õo]es|\bstyle|estilo/i,
  Boundaries: /boundar|limite|\bnever\b|\bnunca\b|\brules?\b|\bregras?\b|restri|ask first|proib/i,
  'Done when': /\bdone\b|pronto|verifica|checklist|before (a |opening a )?pr|antes de (abrir )?(um )?pr/i,
  Pitfalls: /pitfall|armadilha|gotcha|cuidado|known issue|problemas conhecidos|caveat/i,
  'More details': /more details|mais detalhes|\bdocs\b|documenta|reference|refer[êe]ncia|links|see also|veja tamb/i,
};
const EMPHASIS = /\b(IMPORTANT|CRITICAL|MUST|NEVER|ALWAYS|IMPORTANTE|NUNCA|SEMPRE|OBRIGATÓRIO|CRÍTICO)\b/g;
const MAX_EMPHASIS = 4;
const MAX_LIST_ITEMS = 39;
const MAIN_FILES = ['AGENTS.md', 'CLAUDE.md', '.claude/CLAUDE.md'];
const RESTRUCTURE_AT = 3;

const PNPM_BUILTINS = new Set(['install', 'i', 'add', 'remove', 'rm', 'uninstall', 'update', 'up', 'exec', 'dlx', 'create',
  'init', 'list', 'ls', 'why', 'outdated', 'audit', 'publish', 'pack', 'link', 'unlink', 'store', 'prune', 'rebuild',
  'config', 'import', 'fetch', 'patch', 'patch-commit', 'env', 'setup', 'server', 'root', 'bin', 'deploy', 'licenses',
  'doctor', 'approve-builds', 'self-update', 'install-test', 'it', 'help', 'dedupe', '-r', '--filter', '-C', '--dir', '-w']);
const YARN_BUILTINS = new Set(['install', 'add', 'remove', 'upgrade', 'up', 'why', 'info', 'init', 'create', 'dlx', 'exec',
  'workspace', 'workspaces', 'global', 'cache', 'config', 'link', 'unlink', 'pack', 'publish', 'login', 'logout', 'set',
  'plugin', 'node', 'bin', 'constraints', 'dedupe', 'npm', 'patch', 'rebuild', 'version', 'explain', 'import', 'list',
  'outdated', 'audit', 'licenses', 'autoclean', 'check', 'policies', 'owner', 'tag', 'team', 'help']);

const toPosix = (path) => path.split(sep).join('/');
const splitLines = (text) => text.replace(/^\uFEFF/, '').split(/\r?\n/);

// ---- facts of a text ----

export function eolOf(text) {
  const crlf = (text.match(/\r\n/g) ?? []).length;
  const lf = (text.match(/(?<!\r)\n/g) ?? []).length;
  if (crlf && lf) return 'mixed';
  return crlf ? 'crlf' : lf ? 'lf' : 'none';
}

function newlineFor(text) {
  const crlf = (text.match(/\r\n/g) ?? []).length;
  const lf = (text.match(/(?<!\r)\n/g) ?? []).length;
  return crlf && crlf >= lf ? '\r\n' : '\n';
}

function lineCount(text) {
  const body = text.replace(/^\uFEFF/, '');
  if (body === '') return 0;
  return body.split('\n').length - (body.endsWith('\n') ? 1 : 0);
}

// Finds the pair of keel markers. ok carries the offsets: start at the beginning of the start
// marker's line, end after the line break that follows the end marker.
export function findBlock(text) {
  const markers = [...text.matchAll(/<!--\s*keel:(start|end)\s*-->/gi)];
  if (markers.length === 0) return { state: 'none' };
  for (const marker of markers) {
    const lineStart = text.lastIndexOf('\n', marker.index - 1) + 1;
    const lineEnd = text.indexOf('\n', marker.index);
    const line = text.slice(lineStart, lineEnd === -1 ? text.length : lineEnd);
    if (line.replace(/^\uFEFF/, '').trim() !== marker[0]) return { state: 'malformed' };
  }
  const [open, close] = markers;
  if (markers.length !== 2 || open[1].toLowerCase() !== 'start' || close[1].toLowerCase() !== 'end') return { state: 'malformed' };
  // A leading BOM stays outside the block, even with the marker on line 1.
  const start = Math.max(text.lastIndexOf('\n', open.index - 1) + 1, text.startsWith(BOM) ? 1 : 0);
  const lineEnd = text.indexOf('\n', close.index);
  const end = lineEnd === -1 ? text.length : lineEnd + 1;
  const content = text.slice(start, end).replace(/^\uFEFF/, '').replace(/\r?\n$/, '').replace(/\r\n/g, '\n');
  return { state: 'ok', start, end, content };
}

export function otherBlocks(text) {
  const names = [...text.matchAll(/<!--\s*([A-Za-z][\w-]*?)[\s:_-]*(START|BEGIN)\b/gi)].map((m) => m[1]);
  return [...new Set(names.filter((name) => name.toLowerCase() !== 'keel'))];
}

export function detectLang(text) {
  const pt = new Set(['não', 'que', 'para', 'com', 'os', 'as', 'uma', 'um', 'do', 'da', 'dos', 'das', 'em', 'no', 'na',
    'de', 'é', 'são', 'você', 'arquivo', 'testes', 'antes', 'sempre', 'nunca', 'rode', 'deste', 'só', 'também']);
  const en = new Set(['the', 'and', 'to', 'of', 'with', 'is', 'are', 'for', 'this', 'that', 'run', 'before', 'always',
    'never', 'you', 'file', 'tests', 'use', 'in', 'on', 'only', 'do', 'not']);
  let score = 0;
  for (const word of text.toLowerCase().split(/[^\p{L}]+/u)) {
    if (pt.has(word)) score += 1;
    if (en.has(word)) score -= 1;
  }
  return score > 0 ? 'pt-BR' : 'en';
}

// ---- templates ----

export function loadTemplates(dir = TEMPLATES_DIR) {
  return Object.fromEntries(LANGS.map((lang) => [lang, readFileSync(join(dir, `keel-block.${lang}.md`), 'utf8')]));
}

const templateBlock = (template) => template.replace(/\r\n/g, '\n').replace(/\n+$/, '');

function blockSize(content) {
  const inner = content.split('\n').slice(1, -1).join('\n');
  return { lines: content.split('\n').length - 2, bytes: Buffer.byteLength(inner) };
}

// ---- keel block ----

export function applyBlock(text, { lang, templates = loadTemplates() }) {
  if (!templates[lang]) throw new Error(`language "${lang}" has no template; use ${LANGS.join(' or ')}`);
  const nl = newlineFor(text);
  const block = templateBlock(templates[lang]).split('\n').join(nl) + nl;
  const found = findBlock(text);
  if (found.state === 'malformed') {
    throw new Error('keel markers unbalanced, duplicated, nested or not on a line of their own; nothing was written');
  }
  if (found.state === 'ok') return text.slice(0, found.start) + block + text.slice(found.end);
  const bom = text.startsWith(BOM) ? BOM : '';
  if (text.slice(bom.length) === '') return bom + block;
  // Always a blank line of its own before the block: that is what remove undoes.
  const out = text.endsWith('\n') ? text : text + nl;
  return out + nl + block;
}

export function removeBlock(text) {
  const found = findBlock(text);
  if (found.state === 'malformed') {
    throw new Error('keel markers unbalanced, duplicated, nested or not on a line of their own; nothing was written');
  }
  if (found.state === 'none') return text;
  const nl = newlineFor(text);
  let before = text.slice(0, found.start);
  const after = text.slice(found.end);
  // Undoes the blank line that apply adds before the block at the end of the file. The final
  // line break that apply adds to a file without one stays: there is no way to tell it apart.
  if (after === '' && before.endsWith(nl + nl)) before = before.slice(0, -nl.length);
  return before + after;
}

// ---- scan ----

function lstat(path) {
  try { return lstatSync(path); } catch { return null; }
}

function realpath(path) {
  try { return realpathSync(path); } catch { return null; }
}

function instructionPaths(root) {
  const paths = ['AGENTS.md', 'CLAUDE.md', '.claude/CLAUDE.md', 'CLAUDE.local.md'];
  const rules = join(root, '.claude', 'rules');
  if (lstat(rules)?.isDirectory()) {
    for (const name of readdirSync(rules).sort()) if (name.endsWith('.md')) paths.push(`.claude/rules/${name}`);
  }
  const walk = (dir, depth) => {
    if (depth > 3) return;
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory() || SKIP_DIRS.has(entry.name)) continue;
      const full = join(dir, entry.name);
      if (lstat(join(full, 'AGENTS.md'))) paths.push(toPosix(relative(root, join(full, 'AGENTS.md'))));
      walk(full, depth + 1);
    }
  };
  walk(root, 1);
  return paths.filter((path) => lstat(join(root, path)));
}

function fileFacts(root, path) {
  const full = join(root, path);
  const symlink = lstat(full).isSymbolicLink() ? toPosix(readlinkSync(full)) : null;
  let raw;
  try { raw = readFileSync(full); } catch { return { path, symlink, broken: true }; }
  const text = raw.toString('utf8');
  return {
    path, symlink, lines: lineCount(text), bytes: raw.length, eol: eolOf(text), bom: text.startsWith(BOM),
    keelBlock: findBlock(text).state, otherBlocks: otherBlocks(text),
  };
}

const importLine = (path) => (path === '.claude/CLAUDE.md' ? '@../AGENTS.md' : '@AGENTS.md');

function importsAgents(text, path) {
  const accepted = path === '.claude/CLAUDE.md' ? ['@../AGENTS.md'] : ['@AGENTS.md', '@./AGENTS.md'];
  return splitLines(text).some((line) => accepted.includes(line.trim()));
}

export function scan(root) {
  const files = instructionPaths(root).map((path) => fileFacts(root, path));
  const claudeImportsAgents = CLAUDE_FILES.some((path) => {
    const full = join(root, path);
    return existsSync(full) && importsAgents(readFileSync(full, 'utf8'), path);
  });
  const bothInstructionsSetting = SETTINGS.some((path) => {
    const full = join(root, path);
    return existsSync(full) && readFileSync(full, 'utf8').includes('claude-md-and-agents-md');
  });
  const otherAgents = OTHER_AGENTS.filter((path) => existsSync(join(root, path)));
  return { files, claudeImportsAgents, bothInstructionsSetting, otherAgents };
}

// One file per content: a CLAUDE.md that is a symlink to AGENTS.md counts once.
function distinctFiles(root, files) {
  const seen = new Set();
  return files.filter((file) => {
    if (file.broken) return false;
    const real = realpath(join(root, file.path));
    if (seen.has(real)) return false;
    seen.add(real);
    return true;
  });
}

// ---- review ----

function finding(kind, severity, file, line, quote, message) {
  return { kind, severity, file, line, quote, message };
}

function visibility(root, facts) {
  const has = (path) => facts.files.some((file) => file.path === path && !file.broken);
  const agents = has('AGENTS.md');
  const claude = CLAUDE_FILES.find(has);
  const kind = 'visibility';
  const claudeLink = facts.files.find((file) => file.path === 'CLAUDE.md')?.symlink;
  if (agents && claudeLink && realpath(join(root, 'CLAUDE.md')) === realpath(join(root, 'AGENTS.md'))) {
    return finding(kind, 'warning', 'CLAUDE.md', null, null, 'CLAUDE.md is a symlink to AGENTS.md: Claude Code may '
      + 'load the same text twice (double load). Suggestion: replace the symlink with a CLAUDE.md holding the line `@AGENTS.md`.');
  }
  if (agents && claude) {
    if (facts.claudeImportsAgents) return finding(kind, 'info', claude, null, null, `${claude} imports AGENTS.md; Claude sees both.`);
    if (facts.bothInstructionsSetting) {
      return finding(kind, 'info', claude, null, null, 'The claude-md-and-agents-md setting makes Claude read both files.');
    }
    return finding(kind, 'warning', claude, 1, null, `Claude does not see AGENTS.md: with ${claude} present, Claude Code only `
      + `reads AGENTS.md if ${claude} imports it. Suggestion: add the line \`${importLine(claude)}\` at the top of `
      + `${claude} (Keel applies it only with approval of the exact diff).`);
  }
  if (agents) {
    return finding(kind, 'info', 'AGENTS.md', null, null, 'Only AGENTS.md exists: Claude Code reads it natively when there is no '
      + 'CLAUDE.md. Keel does not create CLAUDE.md.');
  }
  if (claude) return finding(kind, 'info', claude, null, null, `Only ${claude} exists; Claude reads it.`);
  return finding(kind, 'info', null, null, null, 'There is no AGENTS.md or CLAUDE.md. Keel can offer the templates/agents.md template.');
}

function readPackageScripts(dirs) {
  const scripts = new Set();
  let found = false;
  for (const dir of dirs) {
    const path = join(dir, 'package.json');
    if (!existsSync(path)) continue;
    found = true;
    try { for (const name of Object.keys(JSON.parse(readFileSync(path, 'utf8')).scripts ?? {})) scripts.add(name); } catch { /* invalid */ }
  }
  return { found, scripts };
}

function makeTargets(dirs) {
  const targets = new Set();
  for (const dir of dirs) {
    for (const name of ['GNUmakefile', 'makefile', 'Makefile']) {
      const path = join(dir, name);
      if (!existsSync(path)) continue;
      for (const match of readFileSync(path, 'utf8').matchAll(/^([^\s#=:.][^:=#]*?)\s*:(?!=)/gm)) {
        for (const target of match[1].split(/\s+/)) targets.add(target);
      }
    }
  }
  return targets;
}

// Code snippets of a file: lines inside fences and `inline` spans, with the line number.
function codeSnippets(text) {
  const snippets = [];
  let fence = null;
  splitLines(text).forEach((line, index) => {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (marker[1][0] === fence) fence = null;
      return;
    }
    if (fence) snippets.push({ line: index + 1, code: line });
    else for (const match of line.matchAll(/`([^`]+)`/g)) snippets.push({ line: index + 1, code: match[1] });
  });
  return snippets;
}

function deadCommand(command, context) {
  const tokens = command.split(/\s+/).map((token) => token.replace(/^["']|["']$/g, ''));
  const [tool, first, second] = tokens;
  const placeholder = (value) => !value || /[<>{}$*]/.test(value);
  const script = (name) => !placeholder(name) && !context.scripts().scripts.has(name);
  if (tool === 'npm') {
    if (['run', 'run-script'].includes(first)) return script(second);
    return ['test', 't', 'start'].includes(first) && script(first === 't' ? 'test' : first);
  }
  if (tool === 'pnpm' || tool === 'yarn') {
    if (first === 'run') return script(second);
    const builtins = tool === 'pnpm' ? PNPM_BUILTINS : YARN_BUILTINS;
    return Boolean(first) && !first.startsWith('-') && !builtins.has(first) && script(first);
  }
  if (tool === 'make') {
    const target = tokens.slice(1).find((token) => !token.startsWith('-') && !token.includes('='));
    return Boolean(target) && !placeholder(target) && !context.targets().has(target);
  }
  if (tool === 'node' && first && /[/\\]|\.(m?js|cjs|m?ts)$/.test(first)) return !placeholder(first) && !context.exists(first);
  if (/^python3?$/.test(tool) && first?.endsWith('.py')) return !placeholder(first) && !context.exists(first);
  if (tool?.startsWith('./') && tool.length > 2) return !placeholder(tool) && !context.exists(tool);
  return false;
}

function deadCommands(root, path, text) {
  const dirs = [...new Set([dirname(join(root, path)), root])];
  let scripts;
  let targets;
  const context = {
    scripts: () => (scripts ??= readPackageScripts(dirs)),
    targets: () => (targets ??= makeTargets(dirs)),
    exists: (file) => dirs.some((dir) => existsSync(resolve(dir, file))),
  };
  const findings = [];
  for (const { line, code } of codeSnippets(text)) {
    for (const part of code.split(/&&|\|\||;|\|/)) {
      const command = part.trim().replace(/^\$\s+/, '');
      if (command && deadCommand(command, context)) {
        findings.push(finding('dead-command', 'warning', path, line, command,
          `dead command: \`${command}\` no longer exists in this project (missing script, target or file).`));
      }
    }
  }
  return findings;
}

function keelBlockFinding(file, text, templates) {
  const found = findBlock(text);
  if (found.state === 'none') return [];
  if (found.state === 'malformed') {
    return [finding('keel-block', 'warning', file, null, null, 'Malformed keel markers (unbalanced, duplicated or nested).')];
  }
  if (Object.values(templates).some((template) => templateBlock(template) === found.content)) return [];
  const line = text.slice(0, found.start).split('\n').length;
  return [finding('keel-block', 'warning', file, line, null, 'The keel block differs from the templates (pt-BR and en): it was edited by hand.')];
}

export function review(root, { templates = loadTemplates() } = {}) {
  const facts = scan(root);
  const findings = [visibility(root, facts)];
  const texts = [];
  if (facts.otherAgents.length) {
    findings.push(finding('other-agents', 'info', null, null, null, `Other agents read this repository `
      + `(${facts.otherAgents.join(', ')}). The optional keel block can guide them (default: no).`));
  }
  for (const file of distinctFiles(root, facts.files)) {
    const text = readFileSync(join(root, file.path), 'utf8');
    if (file.lines > MAX_FILE_LINES) {
      findings.push(finding('size', 'warning', file.path, null, null, `${file.lines} lines: the template goes up to about `
        + `${MAX_FILE_LINES} and Anthropic recommends under 200. Long detail goes to a linked doc.`));
    }
    const block = findBlock(text);
    const blockLines = block.state === 'ok'
      ? [text.slice(0, block.start).split('\n').length, text.slice(0, block.end).replace(/\r?\n$/, '').split('\n').length]
      : [0, -1];
    splitLines(text).forEach((line, index) => {
      if (index + 1 >= blockLines[0] && index + 1 <= blockLines[1]) return;
      if (CONFLICTS.some((pattern) => pattern.test(line))) {
        findings.push(finding('conflict', 'conflict', file.path, index + 1, line.trim(), CONFLICT_MESSAGE));
      }
    });
    findings.push(...deadCommands(root, file.path, text));
    findings.push(...proseFindings(file.path, text, blockLines));
    for (const name of file.otherBlocks) {
      findings.push(finding('other-tool', 'info', file.path, null, null,
        `Block ${name}: another tool's flow; decide which one drives the stories. Keel does not touch it.`));
    }
    findings.push(...keelBlockFinding(file.path, text, templates));
    texts.push({ path: file.path, text });
  }
  if (texts.length && !texts.some(({ text }) => codeSnippets(text).some(({ code }) => CHECK_COMMAND.test(code)))) {
    findings.push(finding('commands', 'warning', texts[0].path, null, null, 'No test, build or lint command in code '
      + '(`...` or a fence). Agents use the commands the file names and rarely find others; add them under "Commands".'));
  }
  findings.push(...missingSections(texts));
  return { findings };
}

// Lines outside fences and outside the keel block, without `inline` code.
function proseLines(text, [blockStart, blockEnd]) {
  const prose = [];
  let fence = null;
  splitLines(text).forEach((line, index) => {
    if (index + 1 >= blockStart && index + 1 <= blockEnd) return;
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (marker[1][0] === fence) fence = null;
      return;
    }
    if (!fence) prose.push(line.replace(/`[^`]*`/g, ''));
  });
  return prose;
}

function proseFindings(path, text, blockLines) {
  const prose = proseLines(text, blockLines);
  const findings = [];
  const emphasis = prose.reduce((sum, line) => sum + (line.match(EMPHASIS) ?? []).length, 0);
  if (emphasis > MAX_EMPHASIS) {
    findings.push(finding('emphasis', 'info', path, null, null, `${emphasis} emphasis words in capitals (IMPORTANT, NEVER, `
      + 'MUST...). Anthropic advises against it: piled-up emphasis makes Claude over-apply the rule. Plain text with the reason works better.'));
  }
  const items = prose.filter((line) => /^\s*([-*+]|\d+[.)])\s+\S/.test(line)).length;
  if (items > MAX_LIST_ITEMS) {
    findings.push(finding('rules', 'info', path, null, null, `${items} list items. Anthropic: at forty rules most are `
      + 'preferences. Suggestion: a checkable rule becomes a lint, test or hook and only its command stays; long detail goes to a linked doc.'));
  }
  return findings;
}

function missingSections(texts) {
  const main = MAIN_FILES.map((path) => texts.find((item) => item.path === path)).find(Boolean);
  if (!main) return [];
  const headings = splitLines(main.text).map((line) => line.match(/^##\s+(.+?)\s*$/)?.[1]).filter(Boolean);
  const missing = [...allowedHeadings()].filter((section) => {
    const synonym = SECTION_SYNONYMS[section];
    return !headings.some((heading) => heading.toLowerCase() === section.toLowerCase() || synonym?.test(heading));
  });
  if (!missing.length) return [];
  const advice = missing.length >= RESTRUCTURE_AT
    ? ' Suggestion: a restructuring into the template sections that only moves and removes lines (setup step 5).'
    : '';
  return [finding('sections', 'info', main.path, null, null,
    `Sections of templates/agents.md not found: ${missing.join(', ')}. Add only those the project needs.${advice}`)];
}

// ---- check ----

export function check(root, { templates = loadTemplates() } = {}) {
  const facts = scan(root);
  const errors = [];
  const withBlock = distinctFiles(root, facts.files).filter((file) => file.keelBlock !== 'none');
  if (withBlock.length > 1) errors.push(`keel block in more than one file: ${withBlock.map((file) => file.path).join(', ')}`);
  for (const file of withBlock) {
    const found = findBlock(readFileSync(join(root, file.path), 'utf8'));
    if (found.state !== 'ok') {
      errors.push(`${file.path}: malformed keel markers`);
      continue;
    }
    const size = blockSize(found.content);
    if (size.lines > MAX_BLOCK_LINES || size.bytes > MAX_BLOCK_BYTES) {
      errors.push(`${file.path}: keel block with ${size.lines} lines and ${size.bytes} bytes (maximum ${MAX_BLOCK_LINES} and ${MAX_BLOCK_BYTES})`);
    }
    if (!Object.values(templates).some((template) => templateBlock(template) === found.content)) {
      errors.push(`${file.path}: keel block differs from the template (pt-BR or en); redo it with block apply`);
    }
  }
  const warnings = review(root, { templates }).findings
    .filter((item) => item.severity === 'warning' && ['visibility', 'size'].includes(item.kind));
  return { ok: errors.length === 0, errors, warnings };
}

// ---- restructure-check ----

export function allowedHeadings(dir = TEMPLATES_DIR) {
  const path = join(dir, 'agents.md');
  if (!existsSync(path)) return new Set(FALLBACK_HEADINGS);
  const headings = splitLines(readFileSync(path, 'utf8'))
    .map((line) => line.match(/^#{1,6}\s+(.+?)\s*$/)?.[1])
    .filter((text) => text && !text.includes('<'));
  return new Set(headings);
}

export function restructureCheck(original, proposed, { headings = allowedHeadings(), templates = loadTemplates() } = {}) {
  const keelLines = new Set(Object.values(templates).flatMap((template) => templateBlock(template).split('\n')));
  const available = new Map();
  for (const line of splitLines(original)) if (line.trim()) available.set(line, (available.get(line) ?? 0) + 1);
  const used = new Map();
  const added = [];
  splitLines(proposed).forEach((line, index) => {
    if (!line.trim()) return;
    if ((available.get(line) ?? 0) > (used.get(line) ?? 0)) {
      used.set(line, (used.get(line) ?? 0) + 1);
      return;
    }
    const heading = line.match(/^#{1,6}\s+(.+?)\s*$/)?.[1];
    if ((heading && headings.has(heading)) || keelLines.has(line)) return;
    added.push({ line: index + 1, text: line });
  });
  const removed = [];
  splitLines(original).forEach((line, index) => {
    if (!line.trim()) return;
    if ((used.get(line) ?? 0) > 0) used.set(line, used.get(line) - 1);
    else removed.push({ line: index + 1, text: line });
  });
  return { ok: added.length === 0, added, removed };
}

// ---- writing (only after the dev's approval) ----

function insideRoot(root, path) {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function readExact(path) {
  const raw = readFileSync(path);
  const text = raw.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(raw)) throw new Error(`${path} is not valid UTF-8; nothing was written`);
  return text;
}

function target(root, file) {
  if (!file) throw new Error('give the file: --file <path>');
  const full = resolve(root, file);
  const path = toPosix(relative(root, full));
  if (!BLOCK_TARGETS.includes(path)) throw new Error(`the keel block only goes in ${BLOCK_TARGETS.join(', ')}; got ${path}`);
  const stat = lstat(full);
  const warnings = [];
  if (stat?.isSymbolicLink()) {
    const real = realpath(full);
    if (!real) throw new Error(`${path} is a broken symlink; nothing was written`);
    if (!insideRoot(realpath(root), real)) throw new Error(`${path} is a symlink to outside the project; nothing was written`);
    warnings.push(`${path} is a symlink to ${toPosix(relative(realpath(root), real))}: the write goes to the target and the `
      + 'symlink stays. Claude Code may load the text twice (double load).');
  }
  return { full, path, exists: Boolean(stat), warnings };
}

function blockApply(root, values, templates) {
  const { full, path, exists, warnings } = target(root, values.file);
  if (!exists) {
    if (CLAUDE_FILES.includes(path) && lstat(join(root, 'AGENTS.md'))) {
      throw new Error(`not creating ${path}: with AGENTS.md present, creating ${path} would make Claude Code stop reading AGENTS.md`);
    }
    if (!values.create) throw new Error(`${path} does not exist; creating the file requires --create (second consent from the dev)`);
  }
  const real = exists ? realpath(full) : null;
  const other = distinctFiles(root, scan(root).files)
    .find((file) => file.keelBlock !== 'none' && realpath(join(root, file.path)) !== real);
  if (other) throw new Error(`${other.path} already has the keel block; the block goes in a single file`);
  const text = exists ? readExact(full) : '';
  const lang = values.lang ?? detectLang(text);
  const updated = applyBlock(text, { lang, templates });
  const changed = !exists || updated !== text;
  if (changed) {
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, updated);
  }
  return { file: path, lang, created: !exists, changed, warnings };
}

function blockRemove(root, values) {
  const { full, path, exists, warnings } = target(root, values.file);
  if (!exists) throw new Error(`${path} does not exist`);
  const text = readExact(full);
  const updated = removeBlock(text);
  if (updated !== text) writeFileSync(full, updated);
  return { file: path, changed: updated !== text, warnings };
}

function importAgents(root, file = 'CLAUDE.md') {
  const path = toPosix(relative(root, resolve(root, file)));
  if (!CLAUDE_FILES.includes(path)) throw new Error(`import-agents only applies to ${CLAUDE_FILES.join(' or ')}; got ${path}`);
  const full = join(root, path);
  const stat = lstat(full);
  if (!stat) throw new Error(`${path} does not exist; Keel does not create CLAUDE.md`);
  if (stat.isSymbolicLink()) throw new Error(`${path} is a symlink; replace the symlink with a file before importing`);
  if (!existsSync(join(root, 'AGENTS.md'))) throw new Error('there is no AGENTS.md to import');
  const text = readExact(full);
  if (importsAgents(text, path)) throw new Error(`${path} already imports AGENTS.md`);
  const bom = text.startsWith(BOM) ? BOM : '';
  const line = importLine(path);
  writeFileSync(full, `${bom}${line}${newlineFor(text)}${text.slice(bom.length)}`);
  return { file: path, line, changed: true };
}

function quote(root, [file, line, text]) {
  if (!file || !line || text === undefined) throw new Error('usage: quote <file> <line> <text>');
  const full = resolve(root, file);
  if (!existsSync(full)) throw new Error(`${file} does not exist`);
  const actual = splitLines(readFileSync(full, 'utf8'))[Number(line) - 1];
  const ok = Number.isInteger(Number(line)) && actual !== undefined && text.trim() !== '' && actual.trim().includes(text.trim());
  return { output: { ok, file, line: Number(line), actual: actual ?? null }, code: ok ? 0 : 1 };
}

// ---- CLI ----

const USAGE = `usage: keel-context.mjs <command>
  scan                                   facts about the instruction files (JSON)
  review                                 findings (conflict, warning, info); writes nothing
  quote <file> <line> <text>             checks a quote (exit 0 if the line contains the text)
  block apply --file <path> [--lang pt-BR|en] [--create]
  block remove --file <path>
  import-agents [--file .claude/CLAUDE.md]   puts @AGENTS.md (or @../AGENTS.md) at the top of CLAUDE.md
  restructure-check <original> <proposed>
  check                                  keel block drift (exit 1 if any)`;

export function run(argv, root, { templates } = {}) {
  // The quote may start with "-" (list item): quote does not go through parseArgs.
  if (argv[0] === 'quote') return quote(root, argv.slice(1));
  const { values, positionals } = parseArgs({
    args: argv, allowPositionals: true,
    options: { file: { type: 'string' }, lang: { type: 'string' }, create: { type: 'boolean' } },
  });
  const [command, ...rest] = positionals;
  if (values.lang && !LANGS.includes(values.lang)) throw new Error(`--lang must be ${LANGS.join(' or ')}`);
  const loaded = () => (templates ??= loadTemplates());
  switch (command) {
    case 'scan': return { output: scan(root), code: 0 };
    case 'review': return { output: review(root, { templates: loaded() }), code: 0 };
    case 'block':
      if (rest[0] === 'apply') return { output: blockApply(root, values, loaded()), code: 0 };
      if (rest[0] === 'remove') return { output: blockRemove(root, values), code: 0 };
      throw new Error(USAGE);
    case 'import-agents': return { output: importAgents(root, values.file), code: 0 };
    case 'restructure-check': {
      const [original, proposed] = rest;
      if (!original || !proposed) throw new Error('usage: restructure-check <original> <proposed>');
      const output = restructureCheck(readFileSync(resolve(root, original), 'utf8'),
        readFileSync(resolve(root, proposed), 'utf8'), { templates: loaded() });
      return { output, code: output.ok ? 0 : 1 };
    }
    case 'check': {
      const output = check(root, { templates: loaded() });
      return { output, code: output.ok ? 0 : 1 };
    }
    default: throw new Error(command ? `unknown command "${command}"\n${USAGE}` : USAGE);
  }
}

function main() {
  try {
    const { output, code } = run(process.argv.slice(2), process.cwd());
    console.log(JSON.stringify(output, null, 2));
    return code;
  } catch (error) {
    console.error(error.message);
    return 1;
  }
}

// realpath on both sides: called through a symlink to the script, the CLI still runs.
if (process.argv[1] && realpath(process.argv[1]) === realpath(fileURLToPath(import.meta.url))) {
  process.exitCode = main();
}
