# Tasks — KEEL-20

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: review aponta os comandos que faltam
Covers: R1 (AC-1.1, AC-1.2)
Files: `scripts/keel-context.mjs`, `test/keel-context.test.mjs`
New structure: none
Test first: `review warns when no instruction file names a test, build or lint command` — só prosa dá `commands`; `npm test` ou `pytest` em código não
Verification: `node --test test/keel-context.test.mjs`
Done when: os testes passam
Depends on: —

## T2 — Seções do modelo que faltam
Covers: R2 (AC-2.1, AC-2.2)
Files: `scripts/keel-context.mjs`, `test/keel-context.test.mjs`
New structure: none
Test first: `review lists the template sections missing from the main file, with Portuguese synonyms` — títulos em português não dão achado; só `## Setup` lista as faltantes e sugere reestruturar
Verification: `node --test test/keel-context.test.mjs`
Done when: os testes passam
Depends on: —

## T3 — Ênfase e regras demais
Covers: R3 (AC-3.1, AC-3.2), R4 (AC-4.1)
Files: `scripts/keel-context.mjs`, `test/keel-context.test.mjs`
New structure: none
Test first: `review flags piled-up emphasis and too many list items` — 5 IMPORTANT dão `emphasis`, 4 ou em código não; 40 itens dão `rules`, 39 não
Verification: `node --test test/keel-context.test.mjs`
Done when: os testes passam
Depends on: —

## T4 — Instruções da skill e especificação
Covers: R5 (AC-5.1)
Files: `skills/setup/SKILL.md`, `test/setup-skill.test.mjs`, `docs/specification.md`
New structure: none
Test first: `setup skill turns the structure findings into suggestions` — a skill cita README, `/doctor prompt-audit` e o achado `sections`
Verification: `node --test test/setup-skill.test.mjs`
Done when: os testes passam, `npm test` passa e `claude plugin validate .` aceita a skill
Depends on: T1, T2, T3
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test --test-name-pattern="names a test" test/keel-context.test.mjs` 1 falhou (expected 1, actual 0: nenhum achado `commands`).
GREEN evidence: `node --test test/keel-context.test.mjs` 15 de 15.
Review: no PR (sem revisor isolado nesta sessão).
### T2
Status: green
RED evidence: `node --test --test-name-pattern="template sections" test/keel-context.test.mjs` 1 falhou (nenhum achado `sections`).
GREEN evidence: `node --test test/keel-context.test.mjs` 16 de 16.
Review: no PR (sem revisor isolado nesta sessão).
### T3
Status: green
RED evidence: `node --test --test-name-pattern="piled-up" test/keel-context.test.mjs` 1 falhou (nenhum achado `emphasis`).
GREEN evidence: `node --test test/keel-context.test.mjs` 17 de 17.
Review: no PR (sem revisor isolado nesta sessão).
### T4
Status: green
RED evidence: `node --test test/setup-skill.test.mjs` 1 falhou (a skill não citava `commands`, `sections`, README nem `/doctor prompt-audit`).
GREEN evidence: `npm test` 201 de 201; `claude plugin validate .` passou com os avisos que já existiam.
Review: no PR (sem revisor isolado nesta sessão).

## Implementation notes
- O título `## Setup` conta como "Commands"; os sinônimos são deliberadamente largos para não acusar seção que existe com outro nome.
- `commands` olha todos os arquivos de instrução juntos: um CLAUDE.md só com `@AGENTS.md` não dispara o aviso se o AGENTS.md tem os comandos.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
