# Tasks — KEEL-29

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: fase tasks proíbe task sem RED possível
Covers: R1 (AC-1.1)
Files: `skills/story/phases/tasks.md`, `test/story-skill.test.mjs`
New structure: none
Test first: `red: the tasks phase plans no test-only task without Regression` — tasks.md proíbe task "só teste" sem Regression:, manda ampliar o Test first: da task que entrega o comportamento ou usar Regression e pede o RED de cada task na apresentação
Verification: `node --test test/story-skill.test.mjs`
Done when: os testes passam
Depends on: —

## T2 — Revisor e confirmação respeitam o objetivo e o fora de escopo
Covers: R2 (AC-2.1), R3 (AC-3.1)
Files: `agents/reviewer.md`, `skills/story/phases/confirmation.md`, `test/story-skill.test.mjs`
New structure: none
Test first: `scope: confirmation review keeps the story inside its goal` — reviewer lê Goal e Out of scope e marca achado fora da história; confirmação propõe pendência em vez de regra e mostra a contagem de regras
Verification: `node --test test/story-skill.test.mjs`
Done when: os testes passam e `claude plugin validate .` aceita o plugin
Depends on: T1
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test --test-name-pattern="red:" test/story-skill.test.mjs` 1 falhou (tasks.md não pedia RED possível nem proibia task "só teste").
GREEN evidence: `node --test --test-name-pattern="red:" test/story-skill.test.mjs` 1 de 1; `npm test` 204 de 204.
Review: findings (revisor isolado, as duas tasks juntas; 4 corrigidos, veja as notas).
### T2
Status: green
RED evidence: `node --test --test-name-pattern="scope: confirmation" test/story-skill.test.mjs` 1 falhou (reviewer.md não lia Goal e Out of scope).
GREEN evidence: `node --test --test-name-pattern="scope: confirmation" test/story-skill.test.mjs` 1 de 1; `npm test` 205 de 205; `claude plugin validate .` passou com o aviso que já existia na main.
Review: findings (revisor isolado, as duas tasks juntas; 4 corrigidos, veja as notas).

## Implementation notes
- Review: "junte o teste" contrariava um teste por task; a fase passou a mandar ampliar o `Test first:` da task que entrega o comportamento (regex do teste de T1 acompanhou).
- Review: a regra dos achados foi para dentro do resumo da confirmação, antes de "Pare e espere", com os três casos separados, `[QUESTION]` para resultado desconhecido e o conflito com o "Out of scope" em "Conflicts found".

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
| R1 | T1 `red: the tasks phase plans no test-only task without Regression` | met |
| R2 | T2 `scope: confirmation review keeps the story inside its goal` | met |
| R3 | T2 `scope: confirmation review keeps the story inside its goal` | met |
