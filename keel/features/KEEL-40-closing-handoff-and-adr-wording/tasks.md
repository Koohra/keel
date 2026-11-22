# Tasks — KEEL-40

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: fechamento sem arquivo solto, conversa nova antes dele e texto da pergunta de ADR
Covers: R1 (AC-1.1), R2 (AC-2.1), R3 (AC-3.1)
Files: `skills/story/phases/closing.md`, `skills/story/SKILL.md`, `skills/story/phases/implementation.md`, `skills/story/phases/requirements.md`, `docs/specification.md`, `test/closing-handoff.test.mjs`, `CHANGELOG.md`
New structure: none
Test first: `closing: the PR description is shown in the answer and never left in the project tree` — mais os testes de conversa nova na saída de implementation e da pergunta de ADR no mesmo arquivo
Verification: `node --test test/closing-handoff.test.mjs`
Done when: os testes passam e `claude plugin validate .` aceita a skill
Depends on: —
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test test/closing-handoff.test.mjs` 3 falharam (closing.md sem destino da descrição do PR, SKILL.md sem conversa nova na saída de implementation, requirements.md sem o caminho da ADR).
GREEN evidence: `node --test test/closing-handoff.test.mjs` 3 de 3; `npm test` 212 de 212; `claude plugin validate .` passou com o aviso que já existia na main.
Review: no PR (sem revisor isolado nesta sessão)

## Implementation notes
not applicable

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
