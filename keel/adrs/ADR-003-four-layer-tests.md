# ADR-003 — Testes enxutos em quatro camadas

## Status
Accepted by Miguel on 2026-11-20 (review do PR #9).

## Context
O Keel 1 versionou cerca de 292 mil linhas de resultados, manteve cinco runners próprios e uma matriz de qualificação que nunca rodou, e os defeitos reais vieram de fontes baratas. [source: docs/specification.md#estratégia-de-testes]

## Decision
Quatro camadas:
0. Scripts e hooks com `node --test`, em todo commit, local e CI (Linux e Windows).
1. Acionamento: cerca de 14 frases com `claude plugin eval`.
2. Uma ou duas por etapa: 12 a 15 casos na fixture com graders `regex` e `file_exists`.
3. Ponta a ponta em duas histórias na fixture e piloto numa história real.

Um caso novo só nasce de falha real, e antes se pergunta se um script ou hook resolve. Resultados ficam fora do repo (`results/` no .gitignore); cada rodada vira uma linha nas notas. Não há qualificação por hash, matriz de hosts nem runner próprio. Orçamento de release: cerca de US$ 26, teto de US$ 35.

## Consequences
- A camada 0 cresce à vontade; a camada de modelo encolhe à medida que o produto amadurece.
- O ponta a ponta continua precisando de tempo humano, porque o `plugin eval` não conduz aprovações em vários turnos.

## Confirmation
O CI roda a camada 0 em todo push. As camadas 1 a 3 rodam por disparo manual ou release.
