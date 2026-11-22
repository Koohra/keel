# Tasks — KEEL-26

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: review task recusa arquivo fora do Files da task
Covers: R3 (AC-3.1, AC-3.2)
Files: `scripts/task-loop.mjs`, `scripts/keel-state.mjs`, `test/task-loop.test.mjs`, `test/stop.test.mjs`
New structure: none
Test first: `scope: review task refuses files outside the task's Files:` — arquivo fora recusa citando o arquivo; só arquivos da task grava
Verification: `node --test test/task-loop.test.mjs`
Done when: os testes passam
Depends on: —

## T2 — Recusa aponta os documentos do projeto para o fechamento
Covers: R2 (AC-2.1)
Files: `scripts/task-loop.mjs`, `test/task-loop.test.mjs`
New structure: none
Test first: `adr: approve commit points the project docs to the closing` — mudança em keel/adrs/ recusa citando o fechamento e adr-draft.md
Verification: `node --test test/task-loop.test.mjs`
Done when: os testes passam
Depends on: T1

## T3 — Design rascunha a ADR na pasta da história e o fechamento a escreve
Covers: R1 (AC-1.1)
Files: `skills/story/phases/design.md`, `skills/story/phases/closing.md`, `skills/story/phases/implementation.md`, `docs/specification.md`, `test/story-skill.test.mjs`
New structure: none
Test first: `adr: the design drafts the ADR in the story folder and the closing writes it` — design escreve adr-draft.md e não keel/adrs/; fechamento escreve keel/adrs/ a partir dele
Verification: `node --test test/story-skill.test.mjs`
Done when: os testes passam e `claude plugin validate .` aceita a skill
Depends on: T2
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test --test-name-pattern="scope: review task" test/task-loop.test.mjs` 1 falhou (Missing expected exception: review task gravava com `src/extra.js` fora do `Files:`).
GREEN evidence: `node --test test/task-loop.test.mjs` 20 de 20; `npm test` 204 de 204.
Review: no PR (sem revisor isolado nesta sessão).
### T2
Status: green
RED evidence: `node --test --test-name-pattern="adr: approve commit" test/task-loop.test.mjs` 1 falhou (a recusa não citava o fechamento nem `adr-draft.md`).
GREEN evidence: `node --test test/task-loop.test.mjs` 21 de 21.
Review: no PR (sem revisor isolado nesta sessão).
### T3
Status: green
RED evidence: `node --test --test-name-pattern="adr: the design" test/story-skill.test.mjs` 1 falhou (design.md escrevia o rascunho em `keel/adrs/`).
GREEN evidence: `npm test` 206 de 206; `claude plugin validate .` passou com o aviso que já existia na main.
Review: no PR (sem revisor isolado nesta sessão).

## Implementation notes
- T1: o teste do Stop hook (`test/stop.test.mjs`) consertava as checagens editando `keel/product.md`, fora do `Files:` de T1, e depois gravava o review, que agora recusa. O conserto do dev passou a ser commitado à parte e a task muda `src/login.js` para as checagens ficarem velhas; `test/stop.test.mjs` entrou no `Files:` de T1.
- T1: a conferência de `Files:` do `approve commit` virou uma função só, usada também pelo `review task`.
- T3: a primeira asserção "design não cita `keel/adrs/`" era estrita demais, porque o passo diz "Não escreva em `keel/adrs/`"; passou a exigir que o rascunho não vá para lá e que a proibição esteja escrita.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
