# KEEL-37 — RED legítimo com SyntaxError de um processo filho

Source: https://github.com/Koohra/keel/issues/37 · Folder: keel/features/KEEL-37-red-syntax-error-child-output/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> A regex `WRONG_REASON` em `scripts/task-loop.mjs:59` casa `SyntaxError: Unexpected` em qualquer linha da saída do teste. Na T6 o teste sobe o servidor como processo filho e verifica que um `data/users.json` corrompido gera erro; o filho imprime um `SyntaxError: Unexpected token` de verdade (é o comportamento esperado), e o script tomou isso como erro de sintaxe do próprio teste, recusando a evidência.
>
> Pronto quando: um RED cuja falha é uma asserção, mesmo com `SyntaxError` na saída de um processo filho, é aceito; um RED causado por erro de sintaxe no próprio arquivo de teste continua recusado. Teste de regressão no `node --test` com as duas saídas.

## Goal
O `evidence red` aceita o RED que falhou numa asserção mesmo quando a saída traz um `SyntaxError` de outro processo, e continua recusando o RED de um arquivo de teste que nem compila. [source: issue #37; /mnt/project-files/keel2/e2e-3/resultado.md achado 1]

## Out of scope
- Mudar os sinais de erro de import e de sintaxe já reconhecidos (`WRONG_REASON`).
- O fluxo de commit e os textos de fechamento e requisitos (issues #38 a #41).

## Rules and acceptance criteria
R1. WHEN a saída do comando de Verification mostra uma asserção que falhou THE `evidence red` SHALL aceitar o RED mesmo que a saída traga um `SyntaxError`; sem asserção, um `SyntaxError` continua sendo motivo errado. [source: issue #37]
  - AC-1.1 GIVEN um teste `node --test` que roda um processo filho que imprime `SyntaxError: Unexpected token` e falha numa asserção WHEN roda `evidence red` THEN o RED é gravado.
  - AC-1.2 GIVEN um arquivo de teste com erro de sintaxe (`SyntaxError: Unexpected token`) WHEN roda `evidence red` THEN o RED é recusado por motivo errado e não é gravado.

## Explicit obligations
- Existing behavior that must not change: RED por módulo ausente ou export ausente continua recusado; o RED precisa mostrar o nome do `Test first:`. [source: test/task-loop.test.mjs]

## Conflicts found
none

## Questions and assumptions
- [ASSUMPTION] "Falhou numa asserção" é reconhecido por `AssertionError`, `ERR_ASSERTION` (node, vitest, chai, pytest) ou `expect(received)` (jest). Um arquivo que não compila nunca chega a rodar uma asserção, então a presença dela basta para separar os dois casos. [source: saída do `node --test` 22 nos dois casos]
<!-- frozen after approval: end -->

## Changes after confirmation
not applicable
