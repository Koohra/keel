# Tasks — KEEL-32

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: conversa nova ao fim de cada fase com portão
Covers: R1 (AC-1.1)
Files: `skills/story/SKILL.md`, `test/story-skill.test.mjs`, `docs/release.md`, `docs/specification.md`, `CHANGELOG.md`
New structure: none
Test first: `session: each gated phase ends suggesting a new conversation, like each task` — passo 6 sugere `/clear` na saída de requirements, confirmation e tasks, e segue na mesma conversa nas outras; release com sessão nova por fase e por task
Verification: `node --test test/story-skill.test.mjs`
Done when: os testes passam e `claude plugin validate .` aceita a skill
Depends on: —
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test --test-name-pattern="session:" test/story-skill.test.mjs` 1 falhou (passo 6 do SKILL.md voltava ao passo 2 na mesma conversa).
GREEN evidence: `npm test` 204 de 204; `claude plugin validate .` passou com o aviso que já existia na main.
Review: no PR (revisor isolado: 1 BLOCK e 3 SUGGEST, todos atendidos; o passo 6 passou a listar as saídas)

## Implementation notes
not applicable

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
