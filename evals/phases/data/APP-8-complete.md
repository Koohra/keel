# APP-8 — Cadastro com e-mail válido

Source: história colada pelo dev · Folder: keel/features/APP-8-cadastro/ · Level: standard
Status: draft

<!-- frozen after approval: start -->
## Original story
> Como visitante do clube, quero me cadastrar com nome e e-mail para receber os avisos das reuniões. O e-mail precisa ser válido; se não for, o cadastro é recusado com uma mensagem clara.

## Goal
Visitantes se cadastram com nome e e-mail válido para receber os avisos das reuniões; e-mail inválido é recusado com mensagem clara. [source: história]

## Out of scope
- Envio dos avisos das reuniões.
- Confirmação do e-mail por link.

## Rules and acceptance criteria
R1. WHEN o visitante envia nome e e-mail válido THE serviço SHALL cadastrar o usuário e responder 201 com os dados. [source: história]
  - AC-1.1 GIVEN nenhum usuário com ana@example.com WHEN envio POST /users com nome "Ana" e e-mail "ana@example.com" THEN a resposta é 201 e o usuário fica salvo.
R2. IF o e-mail não tem formato válido THEN THE serviço SHALL recusar o cadastro com 400 e a mensagem "e-mail inválido". [source: história, keel/product.md#engineering-principles]
  - AC-2.1 GIVEN qualquer estado WHEN envio POST /users com e-mail "ana-sem-arroba" THEN a resposta é 400 com { "error": "e-mail inválido" } e nada é salvo.
R3. IF o e-mail já está cadastrado THEN THE serviço SHALL recusar o cadastro com 400 e a mensagem "e-mail já cadastrado". [source: dev on 2026-11-20]
  - AC-3.1 GIVEN ana@example.com já cadastrada WHEN envio POST /users com o mesmo e-mail THEN a resposta é 400 com { "error": "e-mail já cadastrado" }.

## Explicit obligations
- Edge cases: e-mail com espaços nas pontas; e-mail vazio.
- Invariants (must never happen): usuário salvo com e-mail inválido.
- Existing behavior that must not change: cadastro sem nome é recusado com "name is required". [source: src/users.js:18]
- Errors and expected responses: nenhum além de R2 e R3.

## Questions and assumptions
- [ASSUMPTION] "E-mail válido" é ter texto, um @ e um domínio com ponto; não há verificação de existência da caixa.

## Conflicts found
- not applicable

## Changes after confirmation
- not applicable
<!-- frozen after approval: end -->
