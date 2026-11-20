# Tasks — APP-10

Requirements: requirements.md · Design: design.md
Approval: pending

<!-- frozen after approval: start -->
## T1 — Walking skeleton: cadastro gravado em arquivo
Covers: R1 (AC-1.1)
Files: `src/users.js`, `test/users.test.mjs`
New structure: none
Test first: `grava o usuário no arquivo` — depois do register, o arquivo tem o e-mail
Verification: `npm test`
Done when: o teste passa
Depends on: —

## T2 — Carregar no início
Covers: R2 (AC-2.1)
Files: `src/users.js`, `test/users.test.mjs`
New structure: none
Test first: `carrega os usuários do arquivo` — repositório novo encontra o e-mail gravado
Verification: `npm test`
Done when: o teste passa
Depends on: T1

## T3 — Arquivo ausente
Covers: R3 (AC-3.1)
Files: `src/users.js`, `test/users.test.mjs`
New structure: none
Test first: `começa vazio sem arquivo` — lista vazia e nenhum erro
Verification: `npm test`
Done when: o teste passa
Depends on: T2
<!-- frozen after approval: end -->

## Progress
### T1
Status: pending
### T2
Status: pending
### T3
Status: pending

## Implementation notes
- not applicable

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
