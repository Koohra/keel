#!/usr/bin/env node
// Lê e revisa os arquivos de instrução do projeto (AGENTS.md, CLAUDE.md e parentes) para o
// setup do Keel. scan, review, quote, restructure-check e check só leem. Só três comandos
// escrevem, cada um depois da aprovação do dev: block apply/remove (o bloco keel opcional,
// entre <!-- keel:start --> e <!-- keel:end -->, num arquivo só) e import-agents (a linha
// @AGENTS.md no topo do CLAUDE.md). Nada fora do bloco muda: BOM e CRLF ficam como estão.
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
const FALLBACK_HEADINGS = ['Comandos', 'Convenções', 'Limites', 'Pronto quando', 'Armadilhas', 'Mais detalhes'];

const CONFLICT_MESSAGE = 'Conflita com o fluxo do Keel. O dev decide: (a) mudar o próprio arquivo (o Keel mostra o texto '
  + 'sugerido e não aplica); (b) a regra vale só fora das histórias do Keel; ou (c) manter, ciente de que o hook '
  + 'bloqueia durante uma história.';
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

// ---- fatos de um texto ----

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

// Acha o par de marcadores keel. ok traz os offsets: start no começo da linha do marcador de
// início, end depois da quebra de linha que segue o marcador de fim.
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
  // Um BOM no começo fica fora do bloco, mesmo com o marcador na linha 1.
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

// ---- modelos ----

export function loadTemplates(dir = TEMPLATES_DIR) {
  return Object.fromEntries(LANGS.map((lang) => [lang, readFileSync(join(dir, `keel-block.${lang}.md`), 'utf8')]));
}

const templateBlock = (template) => template.replace(/\r\n/g, '\n').replace(/\n+$/, '');

function blockSize(content) {
  const inner = content.split('\n').slice(1, -1).join('\n');
  return { lines: content.split('\n').length - 2, bytes: Buffer.byteLength(inner) };
}

// ---- bloco keel ----

export function applyBlock(text, { lang, templates = loadTemplates() }) {
  if (!templates[lang]) throw new Error(`idioma "${lang}" sem modelo; use ${LANGS.join(' ou ')}`);
  const nl = newlineFor(text);
  const block = templateBlock(templates[lang]).split('\n').join(nl) + nl;
  const found = findBlock(text);
  if (found.state === 'malformed') {
    throw new Error('marcadores keel desbalanceados, duplicados, aninhados ou fora de linha própria; nada foi escrito');
  }
  if (found.state === 'ok') return text.slice(0, found.start) + block + text.slice(found.end);
  const bom = text.startsWith(BOM) ? BOM : '';
  if (text.slice(bom.length) === '') return bom + block;
  // Sempre uma linha em branco própria antes do bloco: é o que remove desfaz.
  const out = text.endsWith('\n') ? text : text + nl;
  return out + nl + block;
}

export function removeBlock(text) {
  const found = findBlock(text);
  if (found.state === 'malformed') {
    throw new Error('marcadores keel desbalanceados, duplicados, aninhados ou fora de linha própria; nada foi escrito');
  }
  if (found.state === 'none') return text;
  const nl = newlineFor(text);
  let before = text.slice(0, found.start);
  const after = text.slice(found.end);
  // Desfaz a linha em branco que o apply acrescenta antes do bloco no fim do arquivo. A quebra
  // de linha final que o apply põe num arquivo que não a tinha fica: não há como distingui-la.
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

// Um arquivo por conteúdo: um CLAUDE.md que é symlink para o AGENTS.md conta uma vez.
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
  const kind = 'visibilidade';
  const claudeLink = facts.files.find((file) => file.path === 'CLAUDE.md')?.symlink;
  if (agents && claudeLink && realpath(join(root, 'CLAUDE.md')) === realpath(join(root, 'AGENTS.md'))) {
    return finding(kind, 'aviso', 'CLAUDE.md', null, null, 'CLAUDE.md é symlink para AGENTS.md: o Claude Code pode '
      + 'carregar o mesmo texto duas vezes (carga dupla). Sugestão: trocar o symlink por um CLAUDE.md com a linha `@AGENTS.md`.');
  }
  if (agents && claude) {
    if (facts.claudeImportsAgents) return finding(kind, 'info', claude, null, null, `${claude} importa o AGENTS.md; o Claude vê os dois.`);
    if (facts.bothInstructionsSetting) {
      return finding(kind, 'info', claude, null, null, 'A configuração claude-md-and-agents-md faz o Claude ler os dois arquivos.');
    }
    return finding(kind, 'aviso', claude, 1, null, `o Claude não vê o AGENTS.md: com ${claude} presente, o Claude Code só `
      + `lê o AGENTS.md se ${claude} o importar. Sugestão: acrescentar a linha \`${importLine(claude)}\` no topo de `
      + `${claude} (o Keel só aplica com aprovação do diff exato).`);
  }
  if (agents) {
    return finding(kind, 'info', 'AGENTS.md', null, null, 'Só há AGENTS.md: o Claude Code o lê nativamente quando não há '
      + 'CLAUDE.md. O Keel não cria CLAUDE.md.');
  }
  if (claude) return finding(kind, 'info', claude, null, null, `Só há ${claude}; o Claude o lê.`);
  return finding(kind, 'info', null, null, null, 'Não há AGENTS.md nem CLAUDE.md. O Keel pode oferecer o modelo templates/agents.md.');
}

function readPackageScripts(dirs) {
  const scripts = new Set();
  let found = false;
  for (const dir of dirs) {
    const path = join(dir, 'package.json');
    if (!existsSync(path)) continue;
    found = true;
    try { for (const name of Object.keys(JSON.parse(readFileSync(path, 'utf8')).scripts ?? {})) scripts.add(name); } catch { /* inválido */ }
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

// Trechos de código de um arquivo: linhas dentro de cercas e spans `inline`, com o número da linha.
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
        findings.push(finding('comando-morto', 'aviso', path, line, command,
          `comando morto: \`${command}\` não existe mais neste projeto (script, alvo ou arquivo ausente).`));
      }
    }
  }
  return findings;
}

function keelBlockFinding(file, text, templates) {
  const found = findBlock(text);
  if (found.state === 'none') return [];
  if (found.state === 'malformed') {
    return [finding('bloco-keel', 'aviso', file, null, null, 'Marcadores keel malformados (desbalanceados, duplicados ou aninhados).')];
  }
  if (Object.values(templates).some((template) => templateBlock(template) === found.content)) return [];
  const line = text.slice(0, found.start).split('\n').length;
  return [finding('bloco-keel', 'aviso', file, line, null, 'O bloco keel difere dos modelos (pt-BR e en): foi editado à mão.')];
}

export function review(root, { templates = loadTemplates() } = {}) {
  const facts = scan(root);
  const findings = [visibility(root, facts)];
  if (facts.otherAgents.length) {
    findings.push(finding('outros-agentes', 'info', null, null, null, `Outros agentes leem este repositório `
      + `(${facts.otherAgents.join(', ')}). O bloco keel opcional pode orientá-los (padrão: não).`));
  }
  for (const file of distinctFiles(root, facts.files)) {
    const text = readFileSync(join(root, file.path), 'utf8');
    if (file.lines > MAX_FILE_LINES) {
      findings.push(finding('tamanho', 'aviso', file.path, null, null, `${file.lines} linhas: o modelo vai até cerca de `
        + `${MAX_FILE_LINES} e a Anthropic recomenda menos de 200. Detalhe longo vai para um doc linkado.`));
    }
    const block = findBlock(text);
    const blockLines = block.state === 'ok'
      ? [text.slice(0, block.start).split('\n').length, text.slice(0, block.end).replace(/\r?\n$/, '').split('\n').length]
      : [0, -1];
    splitLines(text).forEach((line, index) => {
      if (index + 1 >= blockLines[0] && index + 1 <= blockLines[1]) return;
      if (CONFLICTS.some((pattern) => pattern.test(line))) {
        findings.push(finding('conflito', 'conflito', file.path, index + 1, line.trim(), CONFLICT_MESSAGE));
      }
    });
    findings.push(...deadCommands(root, file.path, text));
    for (const name of file.otherBlocks) {
      findings.push(finding('outra-ferramenta', 'info', file.path, null, null,
        `Bloco ${name}: fluxo de outra ferramenta; decidir qual conduz as histórias. O Keel não toca nele.`));
    }
    findings.push(...keelBlockFinding(file.path, text, templates));
  }
  return { findings };
}

// ---- check ----

export function check(root, { templates = loadTemplates() } = {}) {
  const facts = scan(root);
  const errors = [];
  const withBlock = distinctFiles(root, facts.files).filter((file) => file.keelBlock !== 'none');
  if (withBlock.length > 1) errors.push(`bloco keel em mais de um arquivo: ${withBlock.map((file) => file.path).join(', ')}`);
  for (const file of withBlock) {
    const found = findBlock(readFileSync(join(root, file.path), 'utf8'));
    if (found.state !== 'ok') {
      errors.push(`${file.path}: marcadores keel malformados`);
      continue;
    }
    const size = blockSize(found.content);
    if (size.lines > MAX_BLOCK_LINES || size.bytes > MAX_BLOCK_BYTES) {
      errors.push(`${file.path}: bloco keel com ${size.lines} linhas e ${size.bytes} bytes (máximo ${MAX_BLOCK_LINES} e ${MAX_BLOCK_BYTES})`);
    }
    if (!Object.values(templates).some((template) => templateBlock(template) === found.content)) {
      errors.push(`${file.path}: bloco keel difere do modelo (pt-BR ou en); refaça com block apply`);
    }
  }
  const warnings = review(root, { templates }).findings
    .filter((item) => item.severity === 'aviso' && ['visibilidade', 'tamanho'].includes(item.kind));
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

// ---- escrita (só depois da aprovação do dev) ----

function insideRoot(root, path) {
  const rel = relative(root, path);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

function readExact(path) {
  const raw = readFileSync(path);
  const text = raw.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(raw)) throw new Error(`${path} não é UTF-8 válido; nada foi escrito`);
  return text;
}

function target(root, file) {
  if (!file) throw new Error('informe o arquivo: --file <caminho>');
  const full = resolve(root, file);
  const path = toPosix(relative(root, full));
  if (!BLOCK_TARGETS.includes(path)) throw new Error(`o bloco keel só vai em ${BLOCK_TARGETS.join(', ')}; recebi ${path}`);
  const stat = lstat(full);
  const warnings = [];
  if (stat?.isSymbolicLink()) {
    const real = realpath(full);
    if (!real) throw new Error(`${path} é um symlink quebrado; nada foi escrito`);
    if (!insideRoot(realpath(root), real)) throw new Error(`${path} é symlink para fora do projeto; nada foi escrito`);
    warnings.push(`${path} é symlink para ${toPosix(relative(realpath(root), real))}: a escrita vai no alvo e o symlink `
      + 'fica. O Claude Code pode carregar o texto duas vezes (carga dupla).');
  }
  return { full, path, exists: Boolean(stat), warnings };
}

function blockApply(root, values, templates) {
  const { full, path, exists, warnings } = target(root, values.file);
  if (!exists) {
    if (CLAUDE_FILES.includes(path) && lstat(join(root, 'AGENTS.md'))) {
      throw new Error(`não crio ${path}: com AGENTS.md presente, criar ${path} faria o Claude Code deixar de ler o AGENTS.md`);
    }
    if (!values.create) throw new Error(`${path} não existe; criar o arquivo exige --create (segundo consentimento do dev)`);
  }
  const real = exists ? realpath(full) : null;
  const other = distinctFiles(root, scan(root).files)
    .find((file) => file.keelBlock !== 'none' && realpath(join(root, file.path)) !== real);
  if (other) throw new Error(`${other.path} já tem o bloco keel; o bloco vai em um arquivo só`);
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
  if (!exists) throw new Error(`${path} não existe`);
  const text = readExact(full);
  const updated = removeBlock(text);
  if (updated !== text) writeFileSync(full, updated);
  return { file: path, changed: updated !== text, warnings };
}

function importAgents(root, file = 'CLAUDE.md') {
  const path = toPosix(relative(root, resolve(root, file)));
  if (!CLAUDE_FILES.includes(path)) throw new Error(`import-agents só vale para ${CLAUDE_FILES.join(' ou ')}; recebi ${path}`);
  const full = join(root, path);
  const stat = lstat(full);
  if (!stat) throw new Error(`${path} não existe; o Keel não cria CLAUDE.md`);
  if (stat.isSymbolicLink()) throw new Error(`${path} é symlink; troque o symlink por um arquivo antes de importar`);
  if (!existsSync(join(root, 'AGENTS.md'))) throw new Error('não há AGENTS.md para importar');
  const text = readExact(full);
  if (importsAgents(text, path)) throw new Error(`${path} já importa o AGENTS.md`);
  const bom = text.startsWith(BOM) ? BOM : '';
  const line = importLine(path);
  writeFileSync(full, `${bom}${line}${newlineFor(text)}${text.slice(bom.length)}`);
  return { file: path, line, changed: true };
}

function quote(root, [file, line, text]) {
  if (!file || !line || text === undefined) throw new Error('uso: quote <arquivo> <linha> <texto>');
  const full = resolve(root, file);
  if (!existsSync(full)) throw new Error(`${file} não existe`);
  const actual = splitLines(readFileSync(full, 'utf8'))[Number(line) - 1];
  const ok = Number.isInteger(Number(line)) && actual !== undefined && text.trim() !== '' && actual.trim().includes(text.trim());
  return { output: { ok, file, line: Number(line), actual: actual ?? null }, code: ok ? 0 : 1 };
}

// ---- CLI ----

const USAGE = `uso: keel-context.mjs <comando>
  scan                                   fatos dos arquivos de instrução (JSON)
  review                                 achados (conflito, aviso, info); não escreve nada
  quote <arquivo> <linha> <texto>        confere uma citação (exit 0 se a linha contém o texto)
  block apply --file <caminho> [--lang pt-BR|en] [--create]
  block remove --file <caminho>
  import-agents [--file .claude/CLAUDE.md]   põe @AGENTS.md (ou @../AGENTS.md) no topo do CLAUDE.md
  restructure-check <original> <proposto>
  check                                  deriva do bloco keel (exit 1 se houver)`;

export function run(argv, root, { templates } = {}) {
  // A citação pode começar com "-" (item de lista): quote não passa pelo parseArgs.
  if (argv[0] === 'quote') return quote(root, argv.slice(1));
  const { values, positionals } = parseArgs({
    args: argv, allowPositionals: true,
    options: { file: { type: 'string' }, lang: { type: 'string' }, create: { type: 'boolean' } },
  });
  const [command, ...rest] = positionals;
  if (values.lang && !LANGS.includes(values.lang)) throw new Error(`--lang deve ser ${LANGS.join(' ou ')}`);
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
      if (!original || !proposed) throw new Error('uso: restructure-check <original> <proposto>');
      const output = restructureCheck(readFileSync(resolve(root, original), 'utf8'),
        readFileSync(resolve(root, proposed), 'utf8'), { templates: loaded() });
      return { output, code: output.ok ? 0 : 1 };
    }
    case 'check': {
      const output = check(root, { templates: loaded() });
      return { output, code: output.ok ? 0 : 1 };
    }
    default: throw new Error(command ? `comando "${command}" desconhecido\n${USAGE}` : USAGE);
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

// realpath dos dois lados: chamado por um symlink do script, a CLI ainda roda.
if (process.argv[1] && realpath(process.argv[1]) === realpath(fileURLToPath(import.meta.url))) {
  process.exitCode = main();
}
