# Tasks — KEEL-37

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: RED com asserção aceito mesmo com SyntaxError na saída
Covers: R1 (AC-1.1, AC-1.2)
Files: `scripts/task-loop.mjs`, `test/red-syntax-error.test.mjs`, `CHANGELOG.md`
New structure: none
Test first: `red: an assertion RED is accepted even when a child process prints SyntaxError (#37)` — `node --test` real com processo filho que imprime SyntaxError e falha numa asserção; o arquivo com erro de sintaxe continua recusado
Verification: `node --test test/red-syntax-error.test.mjs`
Done when: os testes passam e `claude plugin validate .` aceita o plugin
Depends on: —
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test test/red-syntax-error.test.mjs` 1 de 2 falhou: o RED com asserção foi recusado com "the test failed for the wrong reason" por causa do `SyntaxError: Unexpected token` do processo filho; o caso do arquivo que não compila já era recusado.
GREEN evidence: `node --test test/red-syntax-error.test.mjs` 2 de 2; `npm test` 211 de 211; `claude plugin validate .` passou com o aviso que já existia na main.
Review: no PR

## Implementation notes
not applicable

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
