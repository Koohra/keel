# Keel — produto

Versão 2 · Responsável: Miguel · Fonte detalhada: [docs/specification.md](../docs/specification.md)

## Vision
O Keel é um plugin do Claude Code que transforma documentação mínima e cuidadosa em código bom, uma história e uma task pequena por vez, com TDD em cada task e evidência verificável em cada passo. [source: docs/specification.md#propósito]

Para quem: devs que usam o Claude Code em projetos reais e querem que a IA siga um processo de engenharia sem gerar volume de texto para revisar.

## What it does
- Prepara o projeto uma vez: `keel/product.md` e `keel/adrs/`.
- Conduz cada história pelo fluxo: triagem, leitura das fontes, requisitos, confirmação, design (só com gatilho), tasks, implementação em TDD, review isolado, commit aprovado e fechamento.
- Decide a ordem do fluxo por script (`workflow/workflow.json` e `state.json` por história), não pela IA.
- Bloqueia por hook o que estiver fora da fase.

## What it does not do
- Não gera código a partir da spec como fonte única.
- Não cria pacote de muitos artefatos por história (research, data-model, contracts, checklists).
- Não commita sem aprovação nem decide trade-offs sozinho.
- Não escreve documentação para o dev: isso é do agente de documentação, um plugin separado e opcional (`plugins/keel-docs/`).
- Não cobre o Codex nesta versão.

## Glossary
| Termo | Significado |
|---|---|
| História | Unidade de trabalho vinda do Jira ou ferramenta parecida, identificada por `<KEY>` |
| Pasta da história | `keel/features/<KEY>-<slug>/` com requirements.md, design.md, tasks.md e state.json |
| Nível | `trivial`, `standard` ou `with-design`; dosa a cerimônia |
| Regra | Obrigação em EARS com ID `R#` |
| Critério de aceite | Exemplo Given/When/Then com ID `AC-#.#` |
| Portão | Ponto onde o dev aprova antes de o fluxo seguir |
| Fase | Etapa do `workflow.json`; o script diz qual é a atual e o que falta para sair |
| Evidência | Comando, código de saída e saída relevante registrados |

## Decisions
As decisões que afetam o projeto inteiro estão em [adrs/](adrs/):
- [ADR-001](adrs/ADR-001-per-story-flow.md) Fluxo por história e arquivos versionados.
- [ADR-002](adrs/ADR-002-script-driven-sequence.md) Sequência do fluxo controlada por script.
- [ADR-003](adrs/ADR-003-four-layer-tests.md) Testes enxutos em quatro camadas.
- [ADR-004](adrs/ADR-004-dependency-free-node-scripts.md) Scripts em Node sem dependências.
- [ADR-005](adrs/ADR-005-project-docs-in-keel.md) Documentos que o Keel lê ficam em `keel/`.
- [ADR-006](adrs/ADR-006-portable-skill-paths.md) Skills citam arquivos do plugin por `<plugin>` e por caminho relativo à skill.

## Engineering principles

Valem para código novo ou alterado. [hook] é checado automaticamente; [review] entra na
rubrica de design. Se uma regra daqui contradiz o código existente, aponte o conflito e
pergunte antes de escolher.

1. Toda garantia que código consegue dar fica em script ou hook, não em prosa de skill. [review]
2. Scripts são Node.js `.mjs` sem dependências externas; só módulos `node:`. [review]
3. Lógica de decisão (validação, transição de fase, cobertura) fica em funções puras que
   recebem dados; leitura de arquivo, processo e relógio ficam na borda do script. [review]
4. Só `scripts/keel-state.mjs` escreve `state.json`. [hook]
5. Sem ciclos entre módulos de `scripts/`; `scripts/` não importa hooks nem testes. [hook]
6. Nada para requisito hipotético: opção, parâmetro ou ponto de extensão só se uma regra
   ou um teste atual o usa. [review]
7. Antes de escrever um helper, procure e reutilize o existente. Extraia código compartilhado
   só na terceira ocorrência do mesmo conhecimento. [review]
8. Erros explícitos: entrada inválida falha com mensagem que diz o que corrigir; sem catch
   amplo nem fallback silencioso. [review]
9. Arquivos com LF e sem BOM; caminhos montados com `node:path`; tudo passa no Windows. [hook]
10. Cada skill carrega só as instruções da fase atual; nada de skill enorme sempre no contexto. [review]

### Rungs per module
| Module | Rung | Reason |
|---|---|---|
| `scripts/` | 2 — funções puras separadas do I/O | Regras de estado e validação são testadas sem disco |
| `scripts/hooks/` | 1 — script de transação | Lê o evento, chama `scripts/`, devolve código de saída |
| `skills/`, `agents/` | não se aplica | Instruções em markdown, sem código |

Degraus: 1 script de transação; 2 funções de domínio puras separadas do I/O; 3 modelo de
domínio; genérico (biblioteca pronta); organizacional.

### Exemplars and what not to copy
Follow: os modelos em `templates/` e o fluxo de `workflow/workflow.json`. Do not copy: o keel-dev
(Keel 1), exceto o que a especificação mandar reaproveitar, como o revisor e o commit.

### Checks
Architecture: `node scripts/arch-check.mjs` (regras em keel/architecture.json) · Lint/complexity: não se aplica ainda · Tests: `npm test`
