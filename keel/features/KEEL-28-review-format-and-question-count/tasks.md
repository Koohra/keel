# Tasks — KEEL-28

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: formato do Review: na recusa e na fase
Covers: R1 (AC-1.1), R2 (AC-2.1)
Files: `scripts/task-loop.mjs`, `test/task-loop.test.mjs`, `skills/story/phases/implementation.md`, `test/story-skill.test.mjs`
New structure: none
Test first: `review findings: approve commit needs what was done with them` — a recusa diz "same line" e mostra a linha de exemplo; a fase tem a mesma linha
Verification: `node --test test/task-loop.test.mjs test/story-skill.test.mjs`
Done when: os testes passam
Depends on: —

## T2 — next conta [QUESTION] e [ASSUMPTION] separado
Covers: R3 (AC-3.1)
Files: `scripts/validate-feature.mjs`, `scripts/keel-state.mjs`, `test/keel-state.test.mjs`
New structure: none
Test first: `an open question blocks leaving requirements` — motivo com "3 open [QUESTION](s)" e "2 [ASSUMPTION](s)" separados
Verification: `node --test test/keel-state.test.mjs`
Done when: os testes passam e `npm test` passa
Depends on: T1
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test --test-name-pattern="review findings: approve commit|a implementação grava" test/task-loop.test.mjs test/story-skill.test.mjs` 2 falharam (a recusa não dizia "same line" nem mostrava a linha; a fase não tinha o exemplo).
GREEN evidence: `node --test test/task-loop.test.mjs test/story-skill.test.mjs` 28 de 28.
Review: no PR (sem revisor isolado nesta sessão).
### T2
Status: green
RED evidence: `node --test --test-name-pattern="an open question blocks" test/keel-state.test.mjs` 1 falhou (motivo era só "3 open [QUESTION](s) in requirements.md", sem as suposições).
GREEN evidence: `node --test test/keel-state.test.mjs` passou; `npm test` 203 de 203.
Review: no PR (sem revisor isolado nesta sessão).

## Implementation notes
- T2: a soma de 5 vista na APP-21 não se reproduz: `openQuestions` já contava só `[QUESTION]`. A mudança deixa as duas contagens explícitas no motivo.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
