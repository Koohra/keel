# KEEL-3 — História: triagem até a confirmação

Source: https://github.com/Koohra/keel/issues/3 · Folder: keel/features/KEEL-3-story-to-confirmation/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> Parte 3 de 8 do plano de desenvolvimento do Keel 2 (ver `docs/specification.md`, etapas 1 a 4). Entrega: skill `story` com triagem, leitura e `repo-map.mjs`, escrita e validação dos requisitos e confirmação do entendimento. Pronto quando: casos de acionamento passam (camada 1); casos das etapas 1 a 4 passam (camada 2). Depende de #2.

## Goal
Dar ao dev uma skill que conduz a história da triagem até o requirements.md confirmado, perguntando ao `keel-state.mjs` qual é o próximo passo em vez de decidir, e um repo map gerado por script para achar onde a história toca. [source: docs/specification.md#etapa-1 a #etapa-4, ADR-002]

## Out of scope
- Fases design, tasks, implementação e fechamento (`phases/design.md` em diante): partes 4 a 6. A skill para e diz que a fase ainda não existe.
- Rubrica de design do revisor e review de task: parte 5. Aqui o revisor só lê requisitos.
- Skill `setup` e criação do product.md: parte 7. Sem product.md a skill para e oferece criar.
- Ler a história do Jira por conector: a história chega colada ou por link que o dev abre.

## Rules and acceptance criteria
R1. WHEN o dev pede para começar, retomar ou continuar uma história THE skill story SHALL ser acionada, conferir que `keel/product.md` existe e perguntar a fase ao `keel-state.mjs next` antes de qualquer outra ação. [source: docs/specification.md#sequência-controlada-por-script-workflowjson]
  - AC-1.1 GIVEN uma das 8 frases de acionamento WHEN o caso roda THEN a skill `keel:story` é chamada; GIVEN uma das 6 frases que não são de história WHEN o caso roda THEN ela não é chamada.
R2. THE skill story SHALL mudar o estado só por comandos do `keel-state.mjs` que existem e ler as instruções da fase que o `next` devolve. [source: docs/specification.md#estado-da-história-statejson]
  - AC-2.1 GIVEN os arquivos da skill WHEN o teste lista os comandos `keel-state.mjs` e os scripts citados THEN todos existem, e cada fase de triage a confirmation tem seu arquivo de instruções.
R3. WHEN a história está na triagem THE skill story SHALL propor um nível com o motivo e os gatilhos de design encontrados, sugerir fatiar acima de cerca de 6 regras e só registrar o nível depois que o dev confirmar. [source: docs/specification.md#etapa-1]
  - AC-3.1 GIVEN uma história com migração de dados WHEN a triagem roda THEN a resposta propõe `with-design` citando o gatilho e pede confirmação sem rodar `level`.
R4. WHEN a leitura roda THE repo-map.mjs SHALL listar arquivos com classes, funções e assinaturas e o número da linha, ordenados pelo grafo de referências e cortados pelo orçamento de tokens. [source: docs/specification.md#etapa-2]
  - AC-4.1 GIVEN um arquivo citado por outros dois e um que ninguém cita WHEN gero o mapa THEN o citado vem antes.
  - AC-4.2 GIVEN um orçamento menor que o projeto WHEN gero o mapa THEN a saída cabe no orçamento, um arquivo central grande entra com as primeiras definições e o mapa diz quantos arquivos ficaram de fora.
  - AC-4.3 GIVEN arquivos em JavaScript, TypeScript, Python, Go, C#, Java e Kotlin WHEN gero o mapa THEN as definições de cada um aparecem com `linha: assinatura`, e `node_modules` e `.git` ficam de fora.
R5. WHEN a leitura termina THE skill story SHALL ter o rascunho do requirements.md com a história original sem edição e as fontes citadas. [source: docs/specification.md#etapa-2]
  - AC-5.1 GIVEN a história na fase reading WHEN a leitura termina THEN o requirements.md existe com a história original copiada e o `generated repo-map` foi registrado.
R6. IF falta o resultado esperado de uma regra THEN THE skill story SHALL escrever `[QUESTION]` com a opção recomendada em vez de inventar o THEN. [source: docs/specification.md#etapa-3]
  - AC-6.1 GIVEN uma história que não diz o que acontece quando o e-mail já existe WHEN os requisitos são escritos THEN o requirements.md tem um `[QUESTION]` sobre isso e nenhum AC inventado para o caso.
R7. WHEN a história está na confirmação THE skill story SHALL chamar o revisor isolado, registrar o resultado e apresentar o resumo, e só aprovar o requirements.md com a aprovação escrita do dev. [source: docs/specification.md#etapa-4]
  - AC-7.1 GIVEN a história na fase confirmation WHEN o dev pede para seguir sem aprovar THEN o agente `keel:reviewer` é chamado, o resumo aparece e `approve requirements.md` não roda.
R8. THE agente reviewer SHALL ter só as ferramentas Read, Grep e Glob. [source: docs/specification.md#papéis]
  - AC-8.1 GIVEN `agents/reviewer.md` WHEN o teste lê o cabeçalho THEN as ferramentas são exatamente Read, Grep e Glob.

## Explicit obligations
- Edge cases: história sem state.json na branch atual (a skill cria com `init`); fase sem arquivo de instruções nesta versão (a skill para e diz qual parte entrega a fase); projeto sem product.md (para e oferece criar).
- Invariants (must never happen): a skill escreve state.json; a skill roda `level` ou `approve` sem a palavra do dev na conversa; o revisor edita arquivo.
- Existing behavior that must not change: comandos e critérios do `keel-state.mjs` e o hook PreToolUse da parte 2. [source: scripts/keel-state.mjs, scripts/hooks/pre-tool-use.mjs]
- Errors and expected responses: `advance` recusado mostra ao dev o que falta; repo-map num diretório sem código diz que não achou definições.

## Questions and assumptions
- [ASSUMPTION] O repo map vai para a saída padrão e não é gravado na pasta da história, porque é regenerado a cada história e ninguém o revisa; o registro fica no `generated repo-map`. — aceita no review do PR.
- [ASSUMPTION] O revisor isolado nasce aqui em `agents/reviewer.md` só com o olhar de requisitos; a parte 5 acrescenta a rubrica de design no mesmo agente. — aceita no review do PR.

## Conflicts found
- not applicable

## Changes after confirmation
- not applicable
<!-- frozen after approval: end -->
