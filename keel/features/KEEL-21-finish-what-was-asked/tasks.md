# Tasks — KEEL-21

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: approve commit recusa arquivo fora do Files da task
Covers: R1 (AC-1.1, AC-1.2)
Files: `scripts/task-loop.mjs`, `scripts/keel-state.mjs`, `test/task-loop.test.mjs`, `test/story-repo.mjs`
New structure: none
Test first: `scope: approve commit refuses files outside the task's Files:` — arquivo fora recusa citando o arquivo; só arquivos da task aprova
Verification: `node --test test/task-loop.test.mjs`
Done when: os testes passam
Depends on: —

## T2 — Regra de foco na skill e na especificação
Covers: R2 (AC-2.1)
Files: `skills/story/SKILL.md`, `skills/story/phases/implementation.md`, `test/story-skill.test.mjs`, `docs/specification.md`
New structure: none
Test first: `focus: the skill finishes what was asked without extra work` — regra de foco nas regras de todas as fases e remoção do que está fora do Files: antes do approve commit
Verification: `node --test test/story-skill.test.mjs`
Done when: os testes passam e `claude plugin validate .` aceita a skill
Depends on: T1
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test --test-name-pattern="scope: approve commit" test/task-loop.test.mjs` 1 falhou (Missing expected exception: approve commit aceitava `src/extra.js` fora do `Files:`).
GREEN evidence: `node --test test/task-loop.test.mjs` 19 de 19; `npm test` 198 de 198.
Review: no PR (sem revisor isolado nesta sessão).
### T2
Status: green
RED evidence: `node --test --test-name-pattern="focus:" test/story-skill.test.mjs` 1 falhou (regra de foco ausente no SKILL.md).
GREEN evidence: `npm test` 199 de 199; `claude plugin validate .` passou com o aviso que já existia na main.
Review: no PR (sem revisor isolado nesta sessão).

## Implementation notes
- T1: o `closingRepo` de `test/story-repo.mjs` criava o commit fora do `Files:` antes do `approve commit`, que agora recusa; o arquivo extra passou a ser escrito depois da aprovação, simulando o commit que escapou dela. `test/story-repo.mjs` entrou no `Files:` de T1.
- T2: depois do primeiro GREEN, a asserção "não proponha" do teste passou a ignorar maiúscula, porque a regra começa a frase com "Não"; o que ela exige não mudou.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
