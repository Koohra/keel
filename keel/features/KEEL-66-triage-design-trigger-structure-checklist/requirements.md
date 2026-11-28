# KEEL-66 — Triagem: gatilho automático de design e checklist de estrutura

Source: https://github.com/Koohra/keel/issues/66 · Folder: keel/features/KEEL-66-triage-design-trigger-structure-checklist/ · Level: with-design
Status: confirmed by Miguel on 2026-11-28

<!-- frozen after approval: start -->
## Original story
> Parte do épico #61. Prioridade 5.
>
> ## Contexto
>
> - O nível `with-design` exige um gatilho que a própria IA acha na triagem (`skills/story/phases/triage.md:6-15`). Um leigo não sabe contestar um "standard".
> - Na primeira história de projeto novo, o esqueleto andante é onde nascem pastas e camadas (`skills/story/phases/tasks.md:7-12`).
> - Não há checklist de arquitetura entre os de segurança, dados e contrato (`scripts/task-loop.mjs:215-225`).
>
> ## O que fazer
>
> - A triagem marca `with-design` sozinha quando o `arch-check` reporta componentes `pending` ou arquivos órfãos no escopo da história (depende da issue de componentes planejados), e quando é a primeira história que cria código-fonte.
> - Novo `skills/story/checklists/structure.md` com 5 itens, ativado pelo mesmo mecanismo do `task-loop.mjs` quando o `design.md` declara `New structure` ou mudança de degrau: a pasta nova pertence a um componente; o componente tem degrau e motivo; existe código parecido para reusar; a fronteira nova tem regra no `architecture.json`; o formato de erro e de dados segue o existente.
>
> ## Critérios de aceite
>
> - [ ] Triagem sobe para `with-design` nos dois casos, sem depender do julgamento da IA, com teste.
> - [ ] O checklist `structure.md` é entregue ao revisor quando o gatilho do `design.md` aparece, com teste em `test/`.
> - [ ] Nada muda para história sem componentes `pending`, sem órfãos e sem `New structure`.
> - [ ] `npm test` e `claude plugin validate .` passam.
>
> ## Dependências
>
> Depende da issue de componentes planejados e arquivos órfãos no `arch-check`.

## Goal
Quem não sabe contestar o nível que a IA propõe passa a ter o design garantido por script quando o projeto ainda vai criar a estrutura: a triagem mostra os gatilhos automáticos e o `level` só aceita `with-design` com eles. E o revisor de task ganha um checklist de estrutura quando o design declara estrutura nova ou subida de degrau. [source: https://github.com/Koohra/keel/issues/66; https://github.com/Koohra/keel/issues/61]

## Out of scope
- Medir o escopo da história na triagem: o escopo só existe depois dos requisitos e das tasks; a triagem olha o repositório inteiro (ver [ASSUMPTION]).
- Mudar o que o `arch-check.mjs` verifica: a triagem usa o resultado que ele já dá (`pending` e `orphans`, `scripts/arch-check.mjs:466-471`) e a mesma varredura de código do disco (`scripts/arch-check.mjs:478-490`).
- Revisão de história no fechamento e proposta de arquitetura do setup: são da #64 e da #62.
- Gatilhos que dependem de julgamento (trade-off, contrato, dados): continuam com a IA e o dev (`skills/story/phases/triage.md` item 2).

## Rules and acceptance criteria
R1. WHILE a história está na triagem THE `keel-state.mjs` SHALL mostrar no `next` os gatilhos automáticos de design achados no repositório: componente planejado sem arquivo (`pending`), arquivo órfão novo (fora do baseline) e projeto com `keel/product.md` e sem nenhum arquivo de código-fonte fora de `keel/`, contado no disco como o `arch-check` conta (com ou sem git). [source: issue #66 "O que fazer" item 1; `scripts/arch-check.mjs:466-471`]
  - AC-1.1 GIVEN um repositório com `keel/architecture.json` que tem um componente `planned` sem arquivo WHEN roda `next` na triagem THEN a saída traz `triage.designTriggers` com um item que nomeia o componente pendente.
  - AC-1.2 GIVEN um repositório com um arquivo coberto por `coverage` fora de todo componente e fora do baseline WHEN roda `next` na triagem THEN `triage.designTriggers` traz um item que nomeia o arquivo órfão; com esse arquivo listado no baseline do `arch-check`, ou com o componente planejado já com arquivo, a lista fica vazia.
  - AC-1.3 GIVEN um repositório com `keel/product.md` e sem arquivo de código-fonte fora de `keel/` WHEN roda `next` na triagem THEN `triage.designTriggers` traz o item de primeira história que cria código-fonte, também fora do git; com um arquivo de código fora de `keel/`, o item some.
R2. WHILE há gatilho automático de design THE `level` SHALL recalcular os gatilhos na hora, recusar `trivial` e `standard`, dizendo os gatilhos e que o nível é `with-design`, e SHALL gravar os gatilhos que recalculou junto com o nível confirmado. [source: issue #66 critério 1]
  - AC-2.1 GIVEN um gatilho automático WHEN roda `level standard --by Ana` THEN o script sai com erro que nomeia o gatilho e pede `with-design`; `level with-design --by Ana` é aceito e o `state.json` tem em `steps.triage.designTriggers` a mesma lista que o `next` mostra; sem gatilho, a lista gravada é `[]`.
  - AC-2.2 GIVEN um gatilho automático WHEN roda `level foo`, `level standard` sem `--by` ou `level standard` fora da triagem THEN o erro é o de hoje (nível inválido, `--by`, fase), nessa ordem, antes da recusa por gatilho.
R3. THE fase de triagem SHALL mandar ler `triage.designTriggers` do `next`, mostrar cada gatilho automático ao dev em linguagem simples e propor `with-design` sem oferecer nível menor quando há algum. [source: issue #66 "O que fazer" item 1; `skills/story/phases/triage.md`]
  - AC-3.1 GIVEN o `skills/story/phases/triage.md` WHEN o teste o lê THEN ele cita `designTriggers`, diz que com gatilho automático o nível é `with-design` e que o script recusa nível menor.
R4. WHEN o `design.md` declara estrutura nova (linha na tabela "New structure and rationale" ou `Trigger: new structure`) ou subida de degrau (`Trigger: rung change`) THE `task-loop.mjs` SHALL entregar `checklists/structure.md` ao revisor de task, e o checklist SHALL ter 5 itens: a pasta nova pertence a um componente; o componente tem degrau e motivo; existe código parecido para reusar; a fronteira nova tem regra no `architecture.json`; o formato de erro e de dados segue o existente. [source: issue #66 "O que fazer" item 2 e critério 2; `scripts/task-loop.mjs:215-225`]
  - AC-4.1 GIVEN um design.md com uma linha na tabela "New structure and rationale" WHEN o teste chama `reviewChecklists` THEN a lista inclui `checklists/structure.md`; o mesmo com `Trigger: new structure` e com `Trigger: rung change`. Com `Trigger: contract` e uma linha na tabela, a lista é `checklists/contract.md` e `checklists/structure.md`, nessa ordem (contrato, dados, segurança, estrutura). A tabela só com cabeçalho, ou com linha de placeholder do modelo (célula que começa com `<`), não conta.
  - AC-4.2 GIVEN `skills/story/checklists/structure.md` WHEN o teste o lê THEN ele tem 5 itens numerados com os cinco temas da regra.
R5. IF não há componente `pending`, nem órfão novo, nem projeto sem código-fonte, e o design.md não declara estrutura nova nem subida de degrau THEN THE Keel SHALL manter o comportamento de hoje: `triage.designTriggers` vazio, qualquer nível aceito e os mesmos checklists. [source: issue #66 critério 3]
  - AC-5.1 GIVEN um repositório com código e sem `keel/architecture.json` WHEN roda `next` na triagem e depois `level standard` THEN `designTriggers` é `[]` e o nível é aceito; o mesmo com `keel/architecture.json` inválido.
  - AC-5.2 GIVEN um design.md com "New structure and rationale" em `none` e `Trigger: contract` WHEN o teste chama `reviewChecklists` THEN a lista é só `checklists/contract.md`.

## Explicit obligations
- Edge cases: `keel/architecture.json` inválido na triagem: o `next` e o `level` não quebram e não há gatilho de arquitetura; o erro aparece no `arch-check` das fases seguintes (AC-5.1). Repositório fora do git: a contagem de código é a do disco (AC-1.3); sem `keel/product.md` não há gatilho de código-fonte. Subida de degrau só conta pelo `Trigger: rung change`, não por texto solto no design.md.
- Invariants (must never happen): `state.json` escrito por outro que não o `keel-state.mjs` [source: keel/product.md#engineering-principles item 4]; o script escolher o nível sozinho sem o `--by` do dev.
- Existing behavior that must not change: `level` fora da triagem e nível inválido continuam recusados como hoje (`scripts/keel-state.mjs:203-207`); os checklists de contrato, dados e segurança (`scripts/task-loop.mjs:215-225`).
- Errors and expected responses: `level trivial|standard` com gatilho automático → erro com os gatilhos e `use with-design` (R2).

## Questions and assumptions
- [ASSUMPTION] "No escopo da história" vira "no repositório": na triagem ainda não há requisitos nem tasks; os órfãos que contam são só os novos (fora do baseline do `arch-check`), então dívida conhecida não força design. — accepted by Miguel on 2026-11-28 (aprovação permanente do épico #61).
- [ASSUMPTION] "Primeira história que cria código-fonte" é o projeto com `keel/product.md` (o setup já rodou) e sem arquivo de código-fonte fora de `keel/`, pela mesma definição e varredura de código do `arch-check` (`isSourcePath`, no disco). — accepted by Miguel on 2026-11-28 (aprovação permanente do épico #61).

## Conflicts found
- not applicable

## Changes after confirmation
- not applicable
<!-- frozen after approval: end -->
