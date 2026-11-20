# KEEL-1 — Base do repositório

Source: https://github.com/Koohra/keel/issues/1 · Folder: keel/features/KEEL-1-base/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> Repo, manifesto do plugin (`.claude-plugin/plugin.json` e `marketplace.json`), `docs/product.md` e ADRs iniciais do próprio Keel, modelos (requirements, design, tasks, seção de princípios, architecture.json), `workflow.json` inicial e CI com `node --test`. Pronto quando: `claude plugin validate` passa; CI verde.

## Goal
Dar ao Keel 2 a base sobre a qual as partes 2 a 8 são construídas: um plugin instalável, o contexto do próprio projeto, os modelos que o fluxo usa e um CI que roda a camada 0 em todo push. [source: docs/specification.md#plano-de-desenvolvimento]

## Out of scope
- Skills, agentes, hooks e scripts do fluxo (partes 2 a 7).
- Instruções por fase (`phases/*.md`), referenciadas pelo workflow.json mas escritas na parte 3.
- Formato exato dos critérios de saída do workflow.json (parte 2).
- `state.json` desta história: só o `keel-state.mjs` escreve esse arquivo, e ele nasce na parte 2.

## Rules and acceptance criteria
R1. THE plugin SHALL ter manifesto e catálogo de marketplace válidos na raiz do repo. [source: issue #1]
  - AC-1.1 GIVEN o repo WHEN rodo `claude plugin validate .` THEN o resultado é "Validation passed".
R2. THE repo SHALL ter `keel/product.md` com até 200 linhas e seção de princípios de engenharia, e ADRs iniciais no formato Nygard com seção de confirmação. [source: docs/specification.md#etapa-0]
  - AC-2.1 GIVEN o repo WHEN rodo `npm test` THEN os testes de product.md e ADRs passam.
R3. THE repo SHALL ter os modelos de requirements, design, tasks, princípios e architecture.json com as seções do anexo da especificação. [source: docs/specification.md#anexo-modelos]
  - AC-3.1 GIVEN um modelo sem uma seção obrigatória WHEN rodo `npm test` THEN o teste do modelo falha nomeando a seção.
R4. THE workflow.json SHALL listar as fases na ordem da especificação, cada uma com instruções e critério de saída, só design condicional e só implementation liberando edição de código. [source: docs/specification.md#sequência-controlada-por-script-workflowjson]
  - AC-4.1 GIVEN o workflow.json WHEN rodo `npm test` THEN os testes de fases, ordem e portões passam.
R5. WHEN há push na main ou um PR THE CI SHALL rodar `npm test` em Linux e Windows e `claude plugin validate .`. [source: docs/specification.md#estratégia-de-testes]
  - AC-5.1 GIVEN este PR WHEN o CI roda THEN os três jobs ficam verdes.
R6. IF um arquivo do repo tem CR ou BOM THEN THE suíte SHALL falhar. [source: ADR-004]
  - AC-6.1 GIVEN um arquivo com CRLF WHEN rodo `npm test` THEN o teste de LF falha nomeando o arquivo.

## Explicit obligations
- Edge cases: o `test/helpers.mjs` não pode ser contado como teste; o script usa o padrão `test/*.test.mjs`.
- Invariants (must never happen): dependência npm externa.
- Existing behavior that must not change: nenhum, o repo está vazio.
- Errors and expected responses: nenhum além de R3 e R6.

## Questions and assumptions
- product.md e ADRs ficam em `keel/` (ADR-005), escolhido por Miguel em 2026-11-20 no review do PR #9.
- Sequência por script (ADR-002) e testes em quatro camadas (ADR-003) aceitos por Miguel em 2026-11-20 no review do PR #9.

## Conflicts found
- A história original cita `docs/product.md`; a ADR-005 (2026-11-20) decidiu por `keel/product.md`.

## Changes after confirmation
- Nenhuma.
<!-- frozen after approval: end -->
