# ADR-004 — Scripts em Node sem dependências

## Status
Accepted by Miguel on 2026-11-20.

## Context
O Keel roda na máquina do dev, inclusive no Windows, e os scripts precisam funcionar sem instalação. O Keel 1 teve testes intermitentes que só apareciam no Windows. [source: docs/specification.md#arquitetura-do-plugin]

## Decision
Scripts e hooks são Node.js `.mjs` que usam só módulos `node:`. Arquivos são gravados com LF e sem BOM, e o Git guarda os bytes exatos (`* -text`), porque aprovações dependem do hash do conteúdo. Os testes passam no Windows desde o primeiro dia.

## Consequences
- Sem `npm install` para usar o plugin.
- Algumas coisas que uma biblioteca faria (parse de YAML, glob) são escritas à mão, de forma mínima.

## Confirmation
`test/repo.test.mjs` recusa CR e BOM. O CI roda `node --test` em Linux e Windows.
