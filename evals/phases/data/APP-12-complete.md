# APP-12 — Aviso de novo cadastro por e-mail

Source: história colada pelo dev · Folder: keel/features/APP-12-aviso/ · Level: with-design
Status: confirmed by Ana on 2026-11-27

<!-- frozen after approval: start -->
## Original story
> Como organizadora do clube, quero receber um e-mail a cada novo cadastro, para dar as boas-vindas no mesmo dia. Não sei qual serviço de e-mail usar nem se vale uma biblioteca nova: me ajudem a escolher.

## Goal
A organizadora recebe um e-mail a cada novo cadastro, sem que uma falha no envio impeça o cadastro. [source: história; dev on 2026-11-27]

## Out of scope
- E-mail para o próprio usuário cadastrado.
- Reenvio automático de aviso que falhou.

## Rules and acceptance criteria
R1. WHEN um usuário é cadastrado THE serviço SHALL enviar um e-mail para a organizadora com o nome e o e-mail do usuário. [source: história]
  - AC-1.1 GIVEN o envio de e-mail funcionando WHEN cadastro "Ana" com ana@example.com THEN a organizadora recebe um e-mail com "Ana" e ana@example.com.
R2. IF o envio do e-mail falha THEN THE serviço SHALL concluir o cadastro com 201 e registrar a falha no log. [source: dev on 2026-11-27]
  - AC-2.1 GIVEN o envio de e-mail falhando WHEN cadastro "Ana" com ana@example.com THEN a resposta é 201 e o log tem a falha.

## Explicit obligations
- Edge cases: endereço da organizadora vem de variável de ambiente; sem ela, o serviço não inicia.
- Invariants (must never happen): cadastro recusado por causa do e-mail.
- Existing behavior that must not change: cadastro sem nome é recusado com "name is required". [source: src/users.js:18]
- Errors and expected responses: nenhum além de R2.

## Questions and assumptions
- not applicable

## Conflicts found
- not applicable

## Changes after confirmation
- not applicable
<!-- frozen after approval: end -->
