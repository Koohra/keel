# KEEL-8 — Agente de documentação

Source: https://github.com/Koohra/keel/issues/8 · Folder: keel/features/KEEL-8-docs-agent/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> Parte 8 de 8 do plano de desenvolvimento do Keel 2 (ver `docs/especificacao.md`, "Papéis" e "Plano de desenvolvimento"). Entrega: plugin separado e opcional que ajuda a escrever product.md, ADRs, requirements.md e design.md. Não implementa nem aprova nada. Pronto quando: usado para escrever uma história real. Depende de #1.

## Goal
Dar ao dev um plugin opcional, `keel-docs`, que ajuda a redigir os quatro documentos que o Keel lê, com fonte em todo fato e perguntas uma por vez, sem implementar código e sem aprovar nada: aprovação e implementação continuam com o dev e com o fluxo do Keel. [source: docs/specification.md#papéis, issue #8]

## Out of scope
- Migrar documentação antiga para product.md e ADRs (etapa 0): continua com a skill `setup` do Keel; entra no agente só se houver falha real.
- tasks.md e state.json: são do Keel, não do dev.
- Aprovar documento, mudar fase ou commitar: só o dev, pelo `keel-state.mjs`.
- Plugin para o Codex.

## Rules and acceptance criteria
R1. THE marketplace do repo SHALL catalogar o plugin `keel-docs` em `plugins/keel-docs/`, separado do plugin `keel`, e nenhum arquivo do `keel-docs` SHALL depender de arquivo fora da própria pasta. [source: docs/specification.md#papéis, Miguel 2026-11-21 (plugin separado e opcional)]
  - AC-1.1 GIVEN o repo WHEN leio `.claude-plugin/marketplace.json` THEN há uma entrada `keel-docs` com `source: ./plugins/keel-docs` e `claude plugin validate` passa nas duas pastas.
  - AC-1.2 GIVEN os arquivos de `plugins/keel-docs/` WHEN procuro caminhos que sobem de pasta ou `scripts/keel-state.mjs` THEN não acho nenhum.
R2. THE plugin `keel-docs` SHALL trazer modelos de product.md, ADR, requirements.md e design.md, e os de requirements.md e design.md SHALL ser idênticos aos do Keel. [source: docs/specification.md#arquivos, docs/specification.md#etapa-0]
  - AC-2.1 GIVEN `templates/requirements.md` e `templates/design.md` do Keel WHEN comparo com os do `keel-docs` THEN os bytes são os mesmos.
  - AC-2.2 GIVEN o modelo de ADR WHEN leio os títulos THEN tem Status, Context, Decision, Consequences e Confirmation.
R3. WHEN o dev ou a skill roda `doc-check.mjs` num documento THE script SHALL apontar seção do modelo que falta ou está vazia, texto do modelo não preenchido, product.md acima de cerca de 200 linhas, regra sem fonte, as mesmas falhas de regra e critério que o `validate-feature.mjs` aponta (EARS, Given/When/Then, linha malformada, ID repetido) e nome de ADR fora de `ADR-NNN-<slug>.md`, saindo com código 1, e sair com 0 num documento limpo; requirements.md e design.md acima do orçamento geram só aviso. [source: docs/specification.md#regras-que-valem-em-todas-as-etapas]
  - AC-3.1 GIVEN um requirements.md com uma regra sem `[source:` WHEN rodo `doc-check.mjs` THEN ele sai com 1 e cita a regra.
  - AC-3.2 GIVEN um product.md com 230 linhas WHEN rodo `doc-check.mjs` THEN ele sai com 1 e cita o limite de cerca de 200 linhas.
  - AC-3.3 GIVEN uma ADR sem `## Confirmation` ou com nome `adr-1.md` WHEN rodo `doc-check.mjs` THEN ele sai com 1.
  - AC-3.4 GIVEN o product.md, as ADRs e os requirements.md das histórias KEEL-* do repo WHEN rodo `doc-check.mjs` THEN ele sai com 0 e não muda o hash de nenhum arquivo.
R4. WHEN o dev pede ajuda para escrever um dos quatro documentos THE skill `keel-docs:write` SHALL carregar só o guia daquele documento, partir do modelo, citar a fonte de cada fato ou marcar `[QUESTION]`/`[ASSUMPTION]`, perguntar uma coisa por vez com a opção recomendada, deixar `Status: draft` e rodar o `doc-check.mjs` antes de entregar. [source: docs/specification.md#regras-que-valem-em-todas-as-etapas]
  - AC-4.1 GIVEN uma história pobre sem resultado esperado para um caso WHEN peço o requirements.md THEN o arquivo tem regra em EARS com fonte, o caso vira `[QUESTION]` e o `doc-check.mjs` sai com 0.
R5. IF o dev pede ao agente para aprovar um documento ou implementar código THEN THE skill `keel-docs:write` SHALL recusar, dizer que isso é do dev pelo fluxo do Keel e não editar código, `state.json` nem `Status`. [source: issue #8]
  - AC-5.1 GIVEN um requirements.md pronto WHEN peço ao keel-docs para revisar, aprovar e já implementar THEN nenhum arquivo fora de `keel/` é escrito, nenhum `state.json` é escrito e o `Status` continua `draft`.
R6. WHEN o dev pede para escrever, revisar a redação ou criar um desses documentos THE skill `keel-docs:write` SHALL ser acionada, e WHEN o dev pede para conduzir uma história ou para algo sem documento THE skill SHALL não ser acionada. [source: docs/specification.md#como-testar (camada 1)]
  - AC-6.1 GIVEN os casos de acionamento do `keel-docs` WHEN rodo `claude plugin eval` THEN os que devem acionar acionam e os que não devem não acionam.

## Explicit obligations
- Scripts sem dependências, só módulos `node:`, LF, sem BOM; testes passam no Windows. [source: AGENTS.md]
- O plugin `keel` continua funcionando sem o `keel-docs`: nada no `keel` passa a depender dele.
- Resultados de eval e o texto da história real usada no "pronto quando" não entram no repo (ADR-003); vão na descrição do PR.

## Questions and assumptions
- [ASSUMPTION] "Plugin separado" = segundo plugin no mesmo repo e no mesmo marketplace (`plugins/keel-docs/`), instalado à parte com `/plugin install keel-docs`. Um repo só evita versões divergentes dos modelos.
- [ASSUMPTION] A garantia de "não implementa nem aprova" fica na skill, no eval de recusa e nos hooks do Keel (que já bloqueiam código fora da fase e escrita no state.json); o `keel-docs` não tem hook próprio, porque um hook de plugin vale na sessão inteira e não sabe quando a skill está ativa.
- [ASSUMPTION] O `doc-check.mjs` repete a checagem de EARS e Given/When/Then do `validate-feature.mjs` (segunda ocorrência), porque o plugin instalado não enxerga os scripts do Keel; um teste confere que os dois concordam nas histórias do repo.
- [ASSUMPTION] A história real do "pronto quando" é uma melhoria do backlog do próprio Keel, escrita com o plugin numa sessão nova (Miguel, 2026-11-21, no card).

## Conflicts found
- Nenhum.

## Changes after confirmation
- Nenhuma.
<!-- frozen after approval: end -->
