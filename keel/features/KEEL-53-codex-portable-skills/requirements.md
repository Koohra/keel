# KEEL-53 — Skills sem dependência do Claude Code

Source: https://github.com/Koohra/keel/issues/53 · Folder: keel/features/KEEL-53-codex-portable-skills/ · Level: with-design
Status: confirmed by Miguel on 2026-11-23

<!-- frozen after approval: start -->
## Original story
> Parte do épico #50. Alta dentro do épico: sem isso a skill `story` não acha os scripts nem os arquivos de fase no Codex.
>
> ## Contexto
>
> As skills e as fases dependem de coisas que o Claude Code resolve e o Codex, pela documentação atual, não:
>
> - **`${CLAUDE_PLUGIN_ROOT}` no texto das skills** (todos os comandos de `skills/story/SKILL.md`, `skills/story/phases/*.md` e `skills/setup/SKILL.md`). No Codex essa variável existe para hooks, não há registro de substituição no texto da skill.
> - **`${CLAUDE_SKILL_DIR}`** para carregar `phases/<fase>.md` e os checklists.
> - **`allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/*)`** no frontmatter da `story`; a doc do Codex só cita `name` e `description`.
> - **Nome da skill**: o hook de `SessionStart` e o texto falam em `keel:story`; conferir como o Codex nomeia skills de plugin.
> - **Comandos do Claude Code** citados ao dev: `/clear` (conversa nova por fase e por task), `/doctor prompt-audit` no setup.
> - **Setup e instruções**: `skills/setup/SKILL.md` e `scripts/keel-context.mjs` tratam `CLAUDE.md`, `@AGENTS.md` e `.claude/CLAUDE.md`. O Codex lê só `AGENTS.md` (e `AGENTS.override.md`); a revisão precisa fazer sentido quando o projeto usa só o Codex ou os dois.
> - O mesmo vale para `plugins/keel-docs/skills/write`.
>
> ## O que fazer
>
> - Um jeito de a skill achar a raiz do plugin e a pasta da skill que funcione nos dois agentes (por exemplo, caminho relativo à pasta da skill ou um script que imprime os caminhos). A escolha vai num design curto ou ADR, se mudar a forma das skills.
> - Texto das skills neutro quanto ao agente, ou com a variante de cada um onde for inevitável (`/clear` no Claude Code, comando equivalente no Codex).
> - Setup: verificação de visibilidade das instruções considerando o Codex (`AGENTS.md`, `AGENTS.override.md`), sem nunca criar `CLAUDE.md`.
>
> ## Critérios de aceite
>
> - [ ] No Codex, a skill `story` roda `keel-state.mjs next`, lê o arquivo da fase indicado e avança, numa história do `fixtures/node-mini`.
> - [ ] No Codex, `setup` e `keel-docs:write` acham scripts e templates.
> - [ ] O Codex aciona a skill certa para os mesmos pedidos dos evals de acionamento (`evals/triggering`, `plugins/keel-docs/evals/triggering`), conferido à mão ou por eval (#55).
> - [ ] Nenhum texto mostrado ao dev no Codex manda usar comando que só existe no Claude Code.
> - [ ] Setup num projeto só com `AGENTS.md` não sugere criar `CLAUDE.md` e não acusa problema de visibilidade no Codex.
> - [ ] `test/story-skill.test.mjs`, `setup-skill.test.mjs` e `docs-plugin.test.mjs` cobrem os caminhos novos; tudo continua passando no Claude Code.
>
> ## Dependências
>
> Depende de #51. Pode andar em paralelo com #52. Bloqueia #54.

## Goal
Quem usa o Keel no Codex consegue rodar as skills `story`, `setup` e `keel-docs:write`: elas acham scripts, modelos, fases, guias e checklists sem depender de variável que só o Claude Code substitui, e o setup revisa as instruções pensando nos dois agentes. No Claude Code nada muda para o dev. [source: https://github.com/Koohra/keel/issues/53; https://github.com/Koohra/keel/issues/50]

## Out of scope
- Hooks no Codex (`apply_patch`, raiz do projeto, saída do `Stop`): issue #52.
- Manifesto e marketplace do Codex: issue #51.
- Revisor isolado (`keel:reviewer`) como subagente do Codex: issue #54.
- Rodar as skills e os evals de acionamento dentro do Codex CLI, CI e README: issue #55.
- `AGENTS.override.md` em subpastas: o review continua olhando a visibilidade só na raiz (pendência do review, fora desta história).
- Mudar o texto do `keel/product.md` ("Não cobre o Codex nesta versão"): fica para o fim do épico (#55).

## Rules and acceptance criteria
R1. THE skills `story`, `setup` e `keel-docs:write` SHALL citar cada arquivo do plugin (script, modelo, fase, checklist, guia) por um caminho que o agente resolve a partir da pasta do próprio SKILL.md, sem depender de o agente substituir `${CLAUDE_PLUGIN_ROOT}` ou `${CLAUDE_SKILL_DIR}` no texto. [source: issue #53 "O que fazer" item 1; Codex `codex-rs/ext/skills/src/catalog_prompt.rs` (caminhos relativos à pasta do SKILL.md, sem substituição)]
  - AC-1.1 GIVEN os arquivos do repo WHEN o teste lê `skills/story/SKILL.md`, `skills/story/phases/*.md`, `skills/setup/SKILL.md` e `plugins/keel-docs/skills/write/SKILL.md` THEN todo caminho de arquivo do plugin citado existe quando resolvido a partir da pasta do SKILL.md da skill, e `${CLAUDE_PLUGIN_ROOT}` e `${CLAUDE_SKILL_DIR}` só aparecem no frontmatter e numa única linha por SKILL.md, a que diz como achar a pasta do plugin.
  - AC-1.2 GIVEN os arquivos do repo WHEN o teste lê os `instructions` de `workflow/workflow.json` e os checklists que `next` pode citar THEN cada um existe a partir da pasta da skill `story`.
R2. WHILE o agente é o Claude Code THE skills SHALL manter o comportamento atual: o `allowed-tools` da `story` e da `write` continua liberando os scripts do plugin sem pedir permissão, e os passos do fluxo não mudam. [source: issue #50 "Critérios de aceite do épico"; keel/product.md#vision]
  - AC-2.1 GIVEN os arquivos do repo WHEN o teste lê o frontmatter da `story` e da `write` THEN o `allowed-tools` é o mesmo de hoje, e `npm test` e `claude plugin validate .` passam.
  - AC-2.2 GIVEN os arquivos do repo WHEN o teste lê a linha que diz como achar a pasta do plugin na `story` e na `write` THEN ela usa `${CLAUDE_PLUGIN_ROOT}`, que o Claude Code troca pelo caminho real, de modo que o comando montado com essa pasta casa com o padrão do `allowed-tools`. A ausência de prompt de permissão no Claude Code se confere no eval de acionamento, não em teste unitário.
R3. THE skills SHALL não mandar o dev usar comando que só existe no Claude Code sem dizer que é do Claude Code. [source: issue #53 critério 4]
  - AC-3.1 GIVEN os arquivos do repo WHEN o teste lê as skills e as fases THEN a linha que cita `/doctor prompt-audit` diz que é do Claude Code, e as que sugerem conversa nova citam `/clear`, que existe nos dois agentes. [source: Codex `codex-rs/tui/src/slash_command.rs` (`/clear`: "clear the terminal and start a new chat")]
R4. WHEN o setup revisa um projeto só com `AGENTS.md` THE `keel-context.mjs review` SHALL manter um único achado de visibilidade, dizer que o Claude Code e o Codex leem o arquivo e SHALL não sugerir criar `CLAUDE.md`. [source: issue #53 critério 5]
  - AC-4.1 GIVEN um projeto só com `AGENTS.md` WHEN roda `review` THEN há um único achado de visibilidade, `info`, que cita o Codex e não sugere criar `CLAUDE.md`.
R5. IF o projeto tem `CLAUDE.md` (ou `.claude/CLAUDE.md`) e não tem `AGENTS.md` nem `AGENTS.override.md` na raiz THEN THE `review` SHALL acrescentar ao achado atual do Claude Code um segundo achado de visibilidade que informa que o Codex não vê essas instruções, como `info`, sem criar nem mudar arquivo. [source: issue #53 "Setup e instruções"; Codex `codex-rs/core/src/agents_md.rs` (lê `AGENTS.override.md` ou `AGENTS.md`, nunca `CLAUDE.md`)]
  - AC-5.1 GIVEN um projeto só com `CLAUDE.md` WHEN roda `review` THEN há um achado `info` de visibilidade que cita o Codex e nenhum arquivo muda.
R6. IF existe `AGENTS.override.md` na raiz, com ou sem `AGENTS.md` THEN THE `review` SHALL listar o arquivo (as checagens de tamanho, comandos e blocos valem para ele como para os outros listados) e acrescentar um achado de visibilidade `info` dizendo que o Codex o lê no lugar do `AGENTS.md` da raiz e que o Claude Code não o lê. [source: Codex `codex-rs/core/src/agents_md.rs` `candidate_filenames`]
  - AC-6.1 GIVEN um projeto com `AGENTS.md` e `AGENTS.override.md` WHEN roda `review` THEN `files` inclui `AGENTS.override.md` e há um achado `info` de visibilidade sobre ele.
  - AC-6.2 GIVEN um projeto só com `AGENTS.override.md` WHEN roda `review` THEN há o achado `info` sobre o override e nenhum achado sugere criar `CLAUDE.md`.
R7. THE seção "Visibilidade" da skill `setup` SHALL explicar ao dev os casos do Codex: só `CLAUDE.md` (o Codex não vê), `AGENTS.override.md` (o Codex lê no lugar do `AGENTS.md`), e que o Keel nunca cria `CLAUDE.md`. [source: issue #53 "O que fazer" item 3; skills/setup/SKILL.md "Visibilidade"]
  - AC-7.1 GIVEN os arquivos do repo WHEN o teste lê `skills/setup/SKILL.md` THEN a seção de visibilidade cita o Codex, `AGENTS.override.md` e o caso só com `CLAUDE.md`.

## Explicit obligations
- Edge cases: projeto com `AGENTS.md` e `CLAUDE.md` que o importa (os dois agentes veem as regras); `CLAUDE.md` symlink para `AGENTS.md` (aviso atual continua).
- Invariants (must never happen): o Keel cria `CLAUDE.md` [source: skills/setup/SKILL.md "Visibilidade"]; o setup grava arquivo sem aprovação.
- Existing behavior that must not change: os achados atuais de visibilidade do Claude Code continuam com o mesmo caso, severidade e texto (`scripts/keel-context.mjs:258`), exceto o de "só AGENTS.md", que ganha a menção ao Codex (R4); o caso `AGENTS.md` + `CLAUDE.md` sem import não ganha achado do Codex, porque o Codex lê o `AGENTS.md`; nome `keel:story` no hook de `SessionStart` (`scripts/hooks/session-start.mjs:25`), que o Codex também usa para skill de plugin [source: Codex `codex-rs/ext/skills/src/loader/namespace.rs:179`]; sugestões de conversa nova com `/clear` (`skills/story/SKILL.md` passo 6).
- Errors and expected responses: none beyond R5.

## Questions and assumptions
- [ASSUMPTION] Esta história prova a portabilidade por teste no repo (caminhos que existem a partir da pasta da skill) e pela leitura do código do Codex; rodar as skills dentro do Codex CLI fica para o #55, porque este ambiente não tem o Codex autenticado.
- [ASSUMPTION] Os achados novos sobre o Codex são `info`, não `warning`: um projeto que usa só o Claude Code não deve ganhar aviso por causa do Codex.

## Conflicts found
- `keel/product.md#what-it-does-not-do` diz "Não cobre o Codex nesta versão", e o épico #50 muda isso. O texto do product.md fica como está até o fim do épico (#55).
- A issue sugere um comando do Codex equivalente ao `/clear`; o código do Codex mostra que o próprio `/clear` existe lá, então o texto continua citando `/clear`. [source: codex-rs/tui/src/slash_command.rs]

## Changes after confirmation
not applicable
<!-- frozen after approval: end -->
