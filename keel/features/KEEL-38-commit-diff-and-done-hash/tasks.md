# Tasks — KEEL-38

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: hook permite o commit só da marca done
Covers: R2 (AC-2.1, AC-2.2)
Files: `scripts/task-loop.mjs`, `scripts/hooks/pre-tool-use.mjs`, `test/task-commit.test.mjs`
New structure: none
Test first: `done mark: hook allows a story-only commit after the task commit` — com só tasks.md mudado permite; com código mudado bloqueia
Verification: `node --test test/task-commit.test.mjs`
Done when: os testes passam
Depends on: —

## T2 — Proposta com o diff no texto e commit da marca na fase
Covers: R1 (AC-1.1), R3 (AC-3.1)
Files: `skills/story/phases/implementation.md`, `docs/specification.md`, `test/task-commit.test.mjs`
New structure: none
Test first: `proposal: the diff goes in the reply text and the done mark gets its own commit` — §6 exige diff --stat e diff no texto e recusa "acima"; §7 commita a pasta da história com done (<hash>)
Verification: `node --test test/task-commit.test.mjs`
Done when: os testes passam e `claude plugin validate .` aceita a skill
Depends on: T1
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test test/task-commit.test.mjs` 1 falhou (o hook bloqueava o commit só da marca: "code changed after the dev approved the commit").
GREEN evidence: `node --test test/task-commit.test.mjs test/pre-tool-use.test.mjs test/task-loop.test.mjs` 28 de 28.
Review: no PR (sem revisor isolado nesta sessão).
### T2
Status: green
RED evidence: `node --test test/task-commit.test.mjs` 1 falhou (§6 não exigia `git diff --stat` no texto da resposta).
GREEN evidence: `npm test` 211 de 211; `claude plugin validate .` passou com o aviso que já existia na main.
Review: no PR (sem revisor isolado nesta sessão).

## Implementation notes
- T1: o hook passa a receber os arquivos de código mudados (`changedFiles`); sem eles (`null`) a decisão continua só pelo fingerprint, como antes.
- O `approve commit` não confere se a proposta mostrou o diff: o script não vê o texto da resposta ao dev (fora do escopo no requirements.md).

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
