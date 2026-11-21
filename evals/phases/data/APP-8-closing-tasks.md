# Tasks — APP-8

Requirements: requirements.md · Design: none
Approved by Ana on 2026-11-20

<!-- frozen after approval: start -->
## T1 — Walking skeleton: e-mail inválido recusado no cadastro
Covers: R2 (AC-2.1)
Files: `src/users.js`, `test/users.test.mjs`
New structure: none
Test first: `recusa e-mail inválido` — register com "ana-sem-arroba" lança "e-mail inválido" e não salva
Verification: `npm test`
Done when: o teste passa e o POST /users responde 400 com a mensagem
Depends on: —

## T2 — E-mail já cadastrado
Covers: R3 (AC-3.1)
Files: `src/users.js`, `test/users.test.mjs`
New structure: none
Test first: `recusa e-mail duplicado` — o segundo register com o mesmo e-mail lança "e-mail já cadastrado"
Verification: `npm test`
Done when: o teste passa
Depends on: T1

## T3 — Cadastro válido responde 201
Covers: R1
Files: `src/server.js`, `test/server.test.mjs`
New structure: none
Test first: `POST /users responde 201` — o servidor devolve 201 com os dados e o usuário fica salvo
Verification: `npm test`
Done when: o teste passa
Depends on: T1
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
