import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { requirementsDoc } from './fixtures.mjs';
import { closingRepo, closingTasksDoc } from './story-repo.mjs';
import { convergenceRows, convergenceLines, sectionDelta } from '../scripts/closing.mjs';

const doneTasks = () => closingTasksDoc()
  .replace('### T1\nStatus: pending', '### T1\nStatus: done (aaa1111)')
  .replace('### T2\nStatus: pending', '### T2\nStatus: done (bbb2222)')
  .replace('### T3\nStatus: pending', '### T3\nStatus: done (ccc3333)');
const docs = () => ({ 'requirements.md': requirementsDoc(), 'tasks.md': doneTasks(), 'design.md': null });
const allCommits = () => true;

const json = (r) => JSON.parse(r.stdout);

test('walking skeleton: each rule is met with its task, test and commit (AC-1.1)', () => {
  assert.deepEqual(convergenceRows(docs(), allCommits), [
    { rule: 'R1', evidence: 'T1 `t1.test` (aaa1111)', outcome: 'met' },
    { rule: 'R2', evidence: 'T2 `t2.test` (bbb2222)', outcome: 'met' },
    { rule: 'R3', evidence: 'T3 `t3.test` (ccc3333)', outcome: 'met' },
  ]);
  assert.deepEqual(convergenceLines(convergenceRows(docs(), allCommits)).slice(0, 3), [
    '| Rule | Evidence | Outcome |', '|---|---|---|', '| R1 | T1 `t1.test` (aaa1111) | met |',
  ]);
});

test('closing: next shows the convergence; advance needs the table copied into tasks.md (AC-1.1, AC-2.1, AC-2.2)', () => {
  const repo = closingRepo();
  try {
    const next = json(repo.state('next'));
    assert.equal(next.phase, 'closing');
    assert.equal(next.closing.convergence.length, 5);
    assert.match(next.closing.convergence[2], /^\| R1 \| T1 `t1\.test` \([0-9a-f]{7,}\) \| met \|$/);
    const refused = repo.state('advance');
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /convergence:all-rules: .*Convergence table/);
    repo.copyConvergence();
    const after = json(repo.state('next'));
    assert.ok(!after.missing.some((m) => m.criterion === 'convergence:all-rules'), JSON.stringify(after.missing));
  } finally {
    repo.cleanup();
  }
});

test('a rule is missing when one of its ACs has no task or its task has no real commit (AC-1.2, AC-1.3)', () => {
  const uncited = { ...docs(), 'tasks.md': doneTasks().replace('Covers: R3 (AC-3.1)', 'Covers: R3') };
  assert.deepEqual(convergenceRows(uncited, allCommits)[2], {
    rule: 'R3', evidence: 'T3 `t3.test` (ccc3333)', outcome: 'missing — AC-3.1 is not covered by any task',
  });
  const rows = convergenceRows(docs(), (hash) => hash !== 'bbb2222');
  assert.equal(rows[1].outcome, "missing — T2: bbb2222 is not a commit in this branch's history");
  assert.equal(rows[0].outcome, 'met');
  const pending = { ...docs(), 'tasks.md': doneTasks().replace('Status: done (ccc3333)', 'Status: green') };
  assert.equal(convergenceRows(pending, allCommits)[2].outcome, 'missing — T3 is not done with a commit');
});

test('trivial level: one row per task, with the criterion of its Covers:', () => {
  const trivial = { 'requirements.md': null, 'design.md': null, 'tasks.md': doneTasks().replace(/^Covers: .*$/gm, 'Covers: GIVEN deslogado WHEN clica THEN vê o consentimento') };
  assert.deepEqual(convergenceRows(trivial, allCommits).map((r) => [r.rule, r.outcome]), [['T1', 'met'], ['T2', 'met'], ['T3', 'met']]);
});

const architecture = {
  components: { src: ['src/**'], tools: ['check.mjs'] },
  rules: [{ name: 'src-does-not-use-tools', from: 'src', forbid: ['tools'], fix: 'Do not import check.mjs from src.' }],
  baseline: 'keel/arch-baseline.txt',
};

test('closing runs the full arch-check: a new violation or a baseline key added since the story base blocks (AC-3.1)', () => {
  const repo = closingRepo({ architecture });
  try {
    let next = json(repo.state('next'));
    assert.equal(next.closing.arch.status, 'ok');
    assert.ok(!next.missing.some((m) => m.criterion === 'arch:baseline-not-grown'), JSON.stringify(next.missing));
    repo.write('keel/arch-baseline.txt', '# baseline\nsrc-does-not-use-tools|src/login.js|check.mjs\n');
    const refused = repo.state('advance');
    assert.match(refused.stderr, /arch:baseline-not-grown: .*src-does-not-use-tools\|src\/login\.js\|check\.mjs/);
    repo.write('keel/arch-baseline.txt', '# baseline\n');
    repo.write('src/session.js', "import '../check.mjs';\n");
    next = json(repo.state('next'));
    assert.equal(next.closing.arch.status, 'fail');
    assert.match(next.missing.find((m) => m.criterion === 'arch:baseline-not-grown').reason, /src\/session\.js:1 imports "\.\.\/check\.mjs"/);
  } finally {
    repo.cleanup();
  }
});

test('without keel/architecture.json the architecture check is skipped and does not block (AC-3.2)', () => {
  const repo = closingRepo();
  try {
    const next = json(repo.state('next'));
    assert.equal(next.closing.arch.status, 'skipped');
    assert.ok(!next.missing.some((m) => m.criterion === 'arch:baseline-not-grown'), JSON.stringify(next.missing));
  } finally {
    repo.cleanup();
  }
});

test('product.md or ADRs changed since the story base need approve deltas, tied to their content (AC-4.1, AC-4.2)', () => {
  const repo = closingRepo();
  try {
    repo.copyConvergence();
    repo.write('keel/product.md', `${readFileSync(join(repo.dir, 'keel/product.md'), 'utf8')}\n## Login\nLogin com Google.\n`);
    repo.write('keel/adrs/ADR-002-google.md', '# ADR-002\n');
    let next = json(repo.state('next'));
    assert.deepEqual(next.closing.deltas.files, ['keel/adrs/ADR-002-google.md', 'keel/product.md']);
    const refused = repo.state('advance');
    assert.match(refused.stderr, /approval:deltas\?: .*approve deltas --by/);
    repo.ok(repo.state('approve', 'deltas', '--by', 'Ana'));
    next = json(repo.state('next'));
    assert.deepEqual(next.missing, []);
    repo.write('keel/adrs/ADR-002-google.md', '# ADR-002 changed\n');
    next = json(repo.state('next'));
    assert.match(next.missing.find((m) => m.criterion === 'approval:deltas?').reason, /changed after the approval/);
    repo.ok(repo.state('approve', 'deltas', '--by', 'Ana'));
    assert.equal(json(repo.state('advance')).phase, 'done');
  } finally {
    repo.cleanup();
  }
});

test('without deltas there is nothing to approve and the gate does not apply (AC-4.3)', () => {
  const repo = closingRepo();
  try {
    repo.copyConvergence();
    const refused = repo.state('approve', 'deltas', '--by', 'Ana');
    assert.notEqual(refused.status, 0);
    assert.match(refused.stderr, /no product\.md or ADR delta to approve/);
    assert.equal(json(repo.state('advance')).phase, 'done');
  } finally {
    repo.cleanup();
  }
});

test('review fixes: task commits must be in the branch history, and a rewritten history has no story base', () => {
  const repo = closingRepo();
  try {
    repo.sh('git', ['commit', '-q', '--amend', '-m', 'APP-1 T3 amended']);
    let next = json(repo.state('next'));
    assert.match(next.closing.convergence[4], /missing — T3: [0-9a-f]+ is not a commit in this branch's history/);
    repo.sh('git', ['stash', '-q']);
    // A new message per commit: --force-rebase alone can recreate the same hashes within one second.
    repo.sh('git', ['rebase', '-q', '--exec', 'git commit -q --amend -m rewritten', 'HEAD~3']);
    repo.sh('git', ['stash', 'pop', '-q']);
    next = json(repo.state('next'));
    assert.equal(next.closing.arch.status, 'fail');
    assert.match(next.missing.find((m) => m.criterion === 'approval:deltas?').reason, /story base not found/);
  } finally {
    repo.cleanup();
  }
});

test('review fixes: an ADR with a non-ASCII name is hashed by content, so editing it expires the approval', () => {
  const repo = closingRepo();
  try {
    repo.copyConvergence();
    repo.write('keel/adrs/ADR-002-decisão.md', '# ADR-002\n');
    assert.deepEqual(json(repo.state('next')).closing.deltas.files, ['keel/adrs/ADR-002-decisão.md']);
    repo.ok(repo.state('approve', 'deltas', '--by', 'Ana'));
    repo.write('keel/adrs/ADR-002-decisão.md', '# ADR-002 mudou\n');
    assert.match(json(repo.state('next')).missing.find((m) => m.criterion === 'approval:deltas?').reason, /changed after the approval/);
  } finally {
    repo.cleanup();
  }
});

test('decisions: the story base is the merge-base with the base branch given at init', () => {
  const repo = closingRepo({ base: 'main', beforeTasks: (r) => {
    r.sh('git', ['branch', 'main']);
    r.write('keel/product.md', `${readFileSync(join(r.dir, 'keel/product.md'), 'utf8')}\n## Cadastro\nNovo.\n`);
    r.sh('git', ['commit', '-q', '-am', 'product before the first task']);
  } });
  try {
    const next = json(repo.state('next'));
    assert.deepEqual(next.closing.deltas.files, ['keel/product.md']);
    assert.deepEqual(next.closing.deltas.sections, { added: ['keel/product.md#Cadastro'], modified: [], removed: [] });
  } finally {
    repo.cleanup();
  }
});

test('decisions: delta by section and ADR file, added, modified and removed', () => {
  const before = '# P\n\n## Visão\nA.\n\n## Glossário\nX.\n\n### Checks\nTests: `t`\n';
  const after = '# P\n\n## Visão\nB.\n\n### Checks\nTests: `t`\n\n## Login\nNovo.\n';
  assert.deepEqual(sectionDelta('keel/product.md', before, after), {
    added: ['keel/product.md#Login'], modified: ['keel/product.md#Visão'], removed: ['keel/product.md#Glossário'],
  });
  assert.deepEqual(sectionDelta('keel/adrs/ADR-002-x.md', null, '# ADR'), { added: ['keel/adrs/ADR-002-x.md'], modified: [], removed: [] });
  assert.deepEqual(sectionDelta('keel/adrs/ADR-001-x.md', '# ADR', null), { added: [], modified: [], removed: ['keel/adrs/ADR-001-x.md'] });
});

test('decisions: without architecture.json, skipped blocks unless Checks says Architecture: não se aplica', () => {
  const repo = closingRepo({ checks: 'Tests: `node -e 0`' });
  try {
    let next = json(repo.state('next'));
    assert.equal(next.closing.arch.status, 'skipped');
    assert.match(next.missing.find((m) => m.criterion === 'arch:baseline-not-grown').reason, /Architecture: não se aplica/);
    const product = join(repo.dir, 'keel/product.md');
    repo.write('keel/product.md', readFileSync(product, 'utf8').replace('Tests: `node -e 0`', 'Tests: `node -e 0` · Architecture: não se aplica'));
    next = json(repo.state('next'));
    assert.ok(!next.missing.some((m) => m.criterion === 'arch:baseline-not-grown'), JSON.stringify(next.missing));
  } finally {
    repo.cleanup();
  }
});
