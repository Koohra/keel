# APP-8 — Cadastro com e-mail válido

Fonte: história colada pelo dev · Pasta: keel/features/APP-8-cadastro/ · Nível: padrão
Status: rascunho

<!-- congelado após aprovação: início -->
## História original
> Como visitante do clube, quero me cadastrar com nome e e-mail para receber os avisos das reuniões. O e-mail precisa ser válido; se não for, o cadastro é recusado com uma mensagem clara.

## Objetivo
Visitantes se cadastram com nome e e-mail válido para receber os avisos das reuniões; e-mail inválido é recusado com mensagem clara. [fonte: história]

## Fora de escopo
- Envio dos avisos das reuniões.
- Confirmação do e-mail por link.

## Regras e critérios de aceite
R1. WHEN o visitante envia nome e e-mail válido THE serviço SHALL cadastrar o usuário e responder 201 com os dados. [fonte: história]
  - AC-1.1 GIVEN nenhum usuário com ana@exemplo.com WHEN envio POST /usuarios com nome "Ana" e e-mail "ana@exemplo.com" THEN a resposta é 201 e o usuário fica salvo.
R2. IF o e-mail não tem formato válido THEN THE serviço SHALL recusar o cadastro com 400 e a mensagem "e-mail inválido". [fonte: história, keel/product.md#princípios-de-engenharia]
  - AC-2.1 GIVEN qualquer estado WHEN envio POST /usuarios com e-mail "ana-sem-arroba" THEN a resposta é 400 com { "erro": "e-mail inválido" } e nada é salvo.
R3. IF o e-mail já está cadastrado THEN THE serviço SHALL recusar o cadastro com 400 e a mensagem "e-mail já cadastrado". [fonte: dev em 2026-11-20]
  - AC-3.1 GIVEN ana@exemplo.com já cadastrada WHEN envio POST /usuarios com o mesmo e-mail THEN a resposta é 400 com { "erro": "e-mail já cadastrado" }.

## Obrigações explícitas
- Casos de borda: e-mail com espaços nas pontas; e-mail vazio.
- Invariantes (nunca pode acontecer): usuário salvo com e-mail inválido.
- Comportamento existente que não pode mudar: cadastro sem nome é recusado com "nome obrigatório". [fonte: src/usuarios.js:18]
- Erros e respostas esperadas: nenhum além de R2 e R3.

## Perguntas e suposições
- [SUPOSIÇÃO] "E-mail válido" é ter texto, um @ e um domínio com ponto; não há verificação de existência da caixa.

## Conflitos encontrados
- não se aplica

## Mudanças após a confirmação
- não se aplica
<!-- congelado após aprovação: fim -->
