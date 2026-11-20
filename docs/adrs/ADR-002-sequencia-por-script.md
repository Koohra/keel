# ADR-002 — Sequência do fluxo controlada por script

## Status
Proposta em 2026-11-20; aguarda confirmação do Miguel neste PR (recomendada e sem objeção até aqui).

## Contexto
No Keel 1, portões e ordem do fluxo viviam em prosa de skill, e o modelo às vezes pulava etapas. Regras sem exceção pertencem a hooks e scripts, não à prosa. [fonte: especificacao.md#sequência-controlada-por-script-workflowjson]

## Decisão
A IA não decide o próximo passo. Ela pergunta ao script:
- `workflow/workflow.json`, dentro do plugin e igual para todo projeto, define fases, ordem, critérios de saída e o que cada fase permite;
- `state.json`, por história, guarda fase, portões e task atual;
- só `keel-state.mjs` escreve o `state.json`; ao aprovar um documento ele grava o hash, e a aprovação vence se o arquivo mudar;
- um hook `PreToolUse` bloqueia escrita em `state.json` e edição de código antes da fase `implementation`.

A IA continua com julgamento dentro de cada fase.

## Consequências
- Pular etapa vira recusa do script com a mensagem do que falta.
- A garantia é testada de graça com `node --test`, sem pass^k sobre o modelo.
- O formato exato dos critérios de saída é definido na parte 2.

## Confirmação
`test/workflow.test.mjs` confere fases, ordem e portões. A parte 2 testa transições válidas, inválidas e aprovação vencida.
