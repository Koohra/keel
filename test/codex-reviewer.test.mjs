import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, read, listFiles } from './helpers.mjs';
import { reviewerToml } from '../scripts/codex-reviewer.mjs';

const script = join(root, 'scripts', 'codex-reviewer.mjs');
const agentPath = (project) => join(project, '.codex', 'agents', 'keel-reviewer.toml');

// Reads back the three fields of the generated TOML (the subset of TOML the generator writes).
function decode(toml) {
  const unescape = (text) => text.replace(/\\(["\\])/g, '$1');
  return {
    name: /^name = "(.*)"$/m.exec(toml)?.[1],
    description: unescape(/^description = "((?:[^"\\]|\\.)*)"$/m.exec(toml)?.[1] ?? ''),
    instructions: unescape(/^developer_instructions = """\n([\s\S]*)"""\n?$/m.exec(toml)?.[1] ?? ''),
  };
}

function frontmatterAndBody(markdown) {
  const match = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/.exec(markdown);
  return { description: /^description: (.*)$/m.exec(match[1])[1], body: match[2] };
}

function run(project, ...args) {
  return spawnSync(process.execPath, [script, ...args], { cwd: project, encoding: 'utf8' });
}

function emptyProject(t) {
  const project = mkdtempSync(join(tmpdir(), 'keel-codex-reviewer-'));
  t.after(() => rmSync(project, { recursive: true, force: true }));
  return project;
}

test('reviewer TOML carries the reviewer.md body byte for byte', () => {
  const markdown = read('agents/reviewer.md');
  const { description, body } = frontmatterAndBody(markdown);
  const decoded = decode(reviewerToml(markdown));
  assert.equal(decoded.name, 'keel-reviewer');
  assert.equal(decoded.description, description);
  assert.equal(decoded.instructions, body);
});

test('reviewer TOML escapes quotes and backslashes so the body cannot close the string', () => {
  const markdown = '---\nname: reviewer\ndescription: Diz "oi" \\ fim\n---\nTexto com """ e \\n literal e "aspas".\n';
  const decoded = decode(reviewerToml(markdown));
  assert.equal(decoded.description, 'Diz "oi" \\ fim');
  assert.equal(decoded.instructions, 'Texto com """ e \\n literal e "aspas".\n');
  assert.doesNotMatch(reviewerToml(markdown).split('developer_instructions = """')[1].slice(0, -4), /"""/);
});

test('no generated keel-reviewer.toml is versioned in the repo', () => {
  assert.deepEqual(listFiles().filter((file) => file.endsWith('keel-reviewer.toml')), []);
});

test('install writes the agent in an empty project and a second install changes nothing', (t) => {
  const project = emptyProject(t);
  const first = run(project, 'install');
  assert.equal(first.status, 0, first.stderr);
  const written = readFileSync(agentPath(project), 'utf8');
  assert.equal(written, reviewerToml(read('agents/reviewer.md')));
  const second = run(project, 'install');
  assert.equal(second.status, 0, second.stderr);
  assert.equal(readFileSync(agentPath(project), 'utf8'), written);
});

test('install refuses a different agent file without --force and overwrites it with --force', (t) => {
  const project = emptyProject(t);
  mkdirSync(join(project, '.codex', 'agents'), { recursive: true });
  writeFileSync(agentPath(project), 'name = "keel-reviewer"\n');
  const refused = run(project, 'install');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /differs/);
  assert.equal(readFileSync(agentPath(project), 'utf8'), 'name = "keel-reviewer"\n');
  const forced = run(project, 'install', '--force');
  assert.equal(forced.status, 0, forced.stderr);
  assert.equal(readFileSync(agentPath(project), 'utf8'), reviewerToml(read('agents/reviewer.md')));
});

test('check passes for the generated file and names a missing or outdated one', (t) => {
  const project = emptyProject(t);
  const missing = run(project, 'check');
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /missing/);
  assert.equal(existsSync(agentPath(project)), false);
  assert.equal(run(project, 'install').status, 0);
  assert.equal(run(project, 'check').status, 0);
  writeFileSync(agentPath(project), 'name = "keel-reviewer"\n');
  const outdated = run(project, 'check');
  assert.equal(outdated.status, 1);
  assert.match(outdated.stderr, /outdated/);
});
