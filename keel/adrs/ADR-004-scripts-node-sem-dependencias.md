# ADR-004 — Scripts em Node sem dependências

## Status
Aceita por Miguel em 2026-11-20.

## Contexto
O Keel roda na máquina do dev, inclusive no Windows, e os scripts precisam funcionar sem instalação. O Keel 1 teve testes intermitentes que só apareciam no Windows. [fonte: docs/especificacao.md#arquitetura-do-plugin]

## Decisão
Scripts e hooks são Node.js `.mjs` que usam só módulos `node:`. Arquivos são gravados com LF e sem BOM, e o Git guarda os bytes exatos (`* -text`), porque aprovações dependem do hash do conteúdo. Os testes passam no Windows desde o primeiro dia.

## Consequências
- Sem `npm install` para usar o plugin.
- Algumas coisas que uma biblioteca faria (parse de YAML, glob) são escritas à mão, de forma mínima.

## Confirmação
`test/repo.test.mjs` recusa CR e BOM. O CI roda `node --test` em Linux e Windows.
