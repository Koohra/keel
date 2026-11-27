import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { root, read, listFiles } from './helpers.mjs';
import { isReadOnlyCommand, reviewerToml } from '../scripts/codex-reviewer.mjs';

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

test('the reviewer shell allows only read commands (AC-3.2, AC-3.3)', () => {
  for (const command of [
    'cat agents/reviewer.md', 'rg -n "Result:" agents', 'grep -rn foo src', "sed -n '1,40p' scripts/x.mjs",
    'ls -la', 'find . -name "*.mjs"', 'head -5 a', 'tail -n 3 a', 'wc -l a', 'git diff HEAD', 'git log --oneline -5',
    'git show HEAD:a.js', 'git status --short', 'cd src && ls', 'pwd', 'git diff HEAD | head -80; git status',
    'rg -n a || grep -n a b', 'cat "a > b"', "rg -n 'f(x)' src",
  ]) assert.equal(isReadOnlyCommand(command), true, command);
  for (const command of [
    'rm a', 'mv a b', 'cp a b', 'tee a', 'awk 1 a', 'python -c 1', 'node -e 1', 'sh -c "ls"', 'bash', 'npm test',
    'git commit -m x', 'git stash', 'git checkout a', 'apply_patch', 'cat a > b', 'cat a >> b', 'ls 2>err',
    "sed -i 's/a/b/' a", "sed -n 'w out' a", "sed -n '1e date' a", "sed 's/a/b/' a",
    'find . -delete', 'find . -exec rm {} ;', 'find . -execdir rm {} +', 'find . -ok rm {} ;', 'find . -fprint out', 'find . -fls out',
    'git diff --output=out', 'git log --output out', 'rg --pre ./x a', 'cat $(echo a)', 'cat `echo a`', 'FOO=1 cat a',
    'ls && rm a', 'cat a | sh', '', 'cat <(touch x)', 'grep a <(rm -rf y)', 'cat =(touch x)', "ls *(e:'touch x':)", 'ls *(+cmd)',
    'cat a 3<>f', 'cat a &>f', 'cat a |& sh', 'cat a &',
  ]) assert.equal(isReadOnlyCommand(command), false, command);
});

test('setup and phases call keel-reviewer in Codex without the conversation (AC-2.3, AC-4.1, AC-4.2, AC-4.3)', () => {
  const setup = read('skills/setup/SKILL.md');
  const step = setup.slice(setup.indexOf('## 6.')).split('\n## ')[0];
  assert.ok(setup.includes('## 6.'), 'setup has no Codex reviewer step');
  assert.match(step, /codex-reviewer\.mjs" install/);
  assert.match(step, /Só com a aprovação do dev/);
  assert.match(step, /--force/);
  for (const phase of ['confirmation', 'implementation']) {
    const text = read(`skills/story/phases/${phase}.md`);
    assert.match(text, /Chame o agente `keel:reviewer`/, `${phase}: the Claude Code call changed`);
    const codex = text.split('\n').find((line) => line.includes('No Codex'));
    assert.ok(codex, `${phase}: no Codex instruction`);
    for (const required of ['codex-reviewer.mjs" check', '`keel-reviewer`', '`fork_turns`', '`none`', 'unknown agent_type', '`Result:`', '`unavailable`']) {
      assert.ok(codex.includes(required), `${phase}: Codex line misses ${required}`);
    }
  }
});
