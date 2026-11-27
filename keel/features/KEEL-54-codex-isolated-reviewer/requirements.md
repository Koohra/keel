# KEEL-54 — Codex: revisor isolado como subagente

Source: https://github.com/Koohra/keel/issues/54 (épico #50) · Folder: keel/features/KEEL-54-codex-isolated-reviewer/ · Level: with-design
Status: confirmed by Miguel on 2026-11-23

<!-- frozen after approval: start -->
## Original story
> `agents/reviewer.md` é um subagente do Claude Code (`keel:reviewer`, `tools: Read, Grep, Glob`), chamado na confirmação (revisão de requisitos) e na implementação (revisão de task), sem o histórico da conversa. O registro `review ... --result <ok|findings|unavailable>` no `keel-state.mjs` depende dessa resposta.
> No Codex: subagentes são arquivos TOML em `.codex/agents/` (projeto) ou `~/.codex/agents/` (usuário), com `name`, `description` e `developer_instructions`. Não há campo `tools` nem `sandbox_mode` por agente: o subagente herda sandbox e aprovação da sessão. Dá para desligar o shell (`features.shell_tool = false`), mas não há "só leitura" garantido para edição de arquivo. A documentação de plugins não diz se um plugin pode trazer subagentes. O subagente é chamado por pedido em linguagem natural ("spawn ..."), não por um nome com prefixo de plugin.
> O que fazer: verificar se plugin do Codex pode trazer agente; se não puder, decidir com o dev entre o `setup` instalar `.codex/agents/keel-reviewer.toml` no projeto (com aprovação) ou a skill rodar o revisor como `codex exec --sandbox read-only`. Uma fonte única para as instruções do revisor. Garantir só leitura no Codex por outro meio (hook `PreToolUse` com matcher por tipo de agente, ou sandbox read-only do `codex exec`). Ajustar `confirmation.md` e `implementation.md` para chamar o revisor no Codex.
> Critérios: no Codex, a confirmação e a revisão de task chamam o revisor sem passar o histórico da conversa, e a resposta começa com `Result: ok` ou `Result: findings`; uma tentativa de edição de arquivo pelo revisor no Codex é bloqueada (teste automatizado); as instruções do revisor têm uma fonte só, e um teste falha se o TOML e o `reviewer.md` divergirem; se o revisor não estiver disponível no Codex, o fluxo registra `unavailable` sem travar; nada muda no `keel:reviewer` do Claude Code.

## Goal
Quem usa o Keel no Codex tem a mesma revisão isolada e só leitura que o Claude Code tem com `keel:reviewer`, nas fases de confirmação e implementação, sem mudar nada para quem usa o Claude Code. [source: issue #54; issue #50]

## Out of scope
- Manifesto (#51), hooks de edição e raiz do projeto (#52), texto portátil das skills e caminhos `${CLAUDE_*}` (#53), e2e no Codex CLI, CI e README "ainda não cobre o Codex" (#55).
- Instalar o revisor em `~/.codex/agents/` (nível do usuário): só o projeto.
- Rodar o revisor por `codex exec`.
- Ferramentas MCP e `spawn_agent` chamadas pelo revisor: o matcher do hook não as pega, e o `agents.max_depth` padrão (1) já impede o revisor de criar subagente (pendência do review, fora desta história).
- Agente de mesmo nome em outro arquivo de `.codex/agents/` ou em `~/.codex/agents/` (pendência do review, fora desta história).
- Conferir no Codex CLI real que o revisor recebe só o pedido, sem a conversa: fica no e2e (#55); aqui a garantia é o texto da skill.

## Rules and acceptance criteria
R1. THE Keel SHALL gerar o agente do Codex (`name`, `description`, `developer_instructions`) a partir de `agents/reviewer.md`, que continua sendo a única fonte das instruções. [source: issue #54 item 2; codex-rs/agent-roles/src/agent_role_config.rs (campos do TOML)]
  - AC-1.1 GIVEN o `agents/reviewer.md` do repo WHEN o gerador roda THEN o TOML tem `name = "keel-reviewer"`, a `description` do frontmatter e, em `developer_instructions`, o corpo do `.md` sem o frontmatter, byte a byte.
  - AC-1.2 GIVEN o repo WHEN `npm test` roda THEN não existe cópia do TOML versionada no repo que possa divergir do `reviewer.md`.
R2. WHERE o dev usa o Keel no Codex THE setup SHALL oferecer gravar `.codex/agents/keel-reviewer.toml` no projeto e só gravar com a aprovação do dev. [source: dev on 2026-11-23 (card); codex-rs/core-plugins/src/manifest.rs (manifesto sem agentes)]
  - AC-2.1 GIVEN um projeto sem o arquivo WHEN o comando de instalação roda THEN `.codex/agents/keel-reviewer.toml` existe com o conteúdo do gerador; rodar de novo não muda o arquivo.
  - AC-2.4 GIVEN um `.codex/agents/keel-reviewer.toml` diferente do gerado (Keel atualizado ou arquivo editado) WHEN o comando de instalação roda sem `--force` THEN sai com erro, diz que o arquivo difere e não grava; com `--force` (depois da aprovação do dev) grava o conteúdo do gerador.
  - AC-2.2 GIVEN um projeto com o arquivo igual ao gerado WHEN o comando de conferência roda THEN sai com 0; com o arquivo ausente ou diferente, sai com erro e diz qual dos dois.
  - AC-2.3 GIVEN o texto do `skills/setup/SKILL.md` WHEN o teste o lê THEN há um passo do revisor no Codex que pede aprovação antes de gravar e cita o comando de instalação.
R3. IF o revisor do Keel no Codex (`agent_type` `keel-reviewer`) tenta editar arquivo ou rodar comando de shell fora da lista de leitura THEN THE hook PreToolUse SHALL bloquear com `exit 2` e o motivo, em qualquer fase e mesmo sem história ativa. [source: issue #54 item 3; codex-rs/hooks/schema/generated/pre-tool-use.command.input.schema.json (`agent_type`)]
  - AC-3.1 GIVEN um evento com `agent_type: keel-reviewer` WHEN chega um `apply_patch` (ou `Edit`/`Write`) THEN o hook sai com 2 e o motivo cita o revisor só leitura.
  - AC-3.2 GIVEN o mesmo agente WHEN chega `Bash` em que cada trecho (separado por `&&`, `||`, `;`, `|`) é um comando da lista de leitura (`cat`, `rg`, `grep`, `sed -n`, `ls`, `find`, `head`, `tail`, `wc`, `git diff`, `git log`, `git show`, `git status`), sem redirecionamento `>` THEN passa.
  - AC-3.3 GIVEN o mesmo agente WHEN chega `Bash` com um comando fora da lista (`rm`, `mv`, `cp`, `tee`, `awk`, `python`, `node`, `sh -c`, `npm test`, `git commit`, `git stash`, `apply_patch`), com redirecionamento `>`, ou com opção de leitura que grava (`sed -i`, comando `w`/`e` do `sed`, `find -delete`/`-exec`/`-fprint`/`-fls`/`-ok`, `git ... --output`) THEN o hook sai com 2.
  - AC-3.4 GIVEN um evento sem `agent_type`, ou com outro `agent_type` WHEN chega o mesmo `apply_patch` ou comando THEN a decisão é a de hoje.
R4. WHEN a fase de confirmação ou de implementação roda no Codex THE skill SHALL pedir a revisão ao subagente `keel-reviewer` sem o histórico da conversa e, sem o agente instalado e atualizado, gravar `unavailable` e seguir. [source: issue #54 itens 4 e critérios 1 e 4; codex-rs/core/src/tools/handlers/multi_agents_spec.rs (`fork_context`/`fork_turns`)]
  - AC-4.1 GIVEN `confirmation.md` e `implementation.md` WHEN o teste os lê THEN cada um diz, para o Codex, conferir antes com o comando de conferência e chamar o agente `keel-reviewer` com `fork_turns` `none` (o padrão do Codex é `all`, que passa a conversa).
  - AC-4.3 GIVEN o texto das duas fases WHEN o teste os lê THEN eles mandam gravar `unavailable` e seguir quando a conferência falha, quando o Codex recusa o agente (`unknown agent_type`) ou quando a resposta não começa com `Result:`.
  - AC-4.2 GIVEN o texto das duas fases WHEN o teste os lê THEN a chamada `keel:reviewer` do Claude Code continua igual.

## Explicit obligations
- Edge cases: comando de shell com vários trechos (`&&`, `;`, `|`): todos precisam ser leitura; `reviewer.md` com `"""` ou `\` no corpo não pode quebrar o TOML.
- Invariants (must never happen): o revisor no Codex grava arquivo sem o hook bloquear; o setup grava `.codex/agents/` sem aprovação.
- Existing behavior that must not change: `agents/reviewer.md` (frontmatter e corpo) e o que o Claude Code faz com ele; os testes atuais de `pre-tool-use` passam sem mudar expectativa. [source: agents/reviewer.md; test/pre-tool-use.test.mjs]
- Scripts sem dependência, só `node:`, LF sem BOM; testes passam no Windows. [source: AGENTS.md]
- Errors and expected responses: conferência com arquivo ausente ou diferente sai com erro e o motivo; nenhum outro.

## Questions and assumptions
- [ASSUMPTION] Plugin do Codex não traz agente: o manifesto só lê `skills`, `mcpServers`, `apps`, `hooks` e `interface`. [source: codex-rs/core-plugins/src/manifest.rs RawPluginManifest; codex-rs/plugin/src/manifest.rs PluginManifestPaths]
- [ASSUMPTION] O TOML do agente não muda o sandbox: o Codex só aplica dele `developer_instructions`, modelo, esforço, personalidade e desligar features. O shell fica ligado porque o revisor lê arquivos pelo shell. [source: codex-rs/core/src/agent/role.rs apply_role_to_config_inner]
- [ASSUMPTION] Os hooks do plugin rodam nas chamadas de ferramenta do subagente e o evento traz `agent_type` com o nome do agente; a confirmação no CLI fica para o e2e (#55). [source: codex-rs/hooks/src/events/pre_tool_use.rs (`subagent`, `agent_type`)]
- [ASSUMPTION] Um comando liberado pelo hook pode receber entrada depois por `write_stdin`, que não passa pelo PreToolUse; com a lista de leitura (sem shell, `node` ou `python`), essa entrada não vira comando de escrita. [source: codex-rs/core/src/tools/handlers/unified_exec/write_stdin.rs:144]
- [ASSUMPTION] O Codex lê `.codex/agents/` do projeto só em projeto confiável e no início da sessão: agente instalado no meio da sessão só vale na próxima. [source: codex-rs/agent-roles/src/loader.rs (camadas de config)]

## Conflicts found
- not applicable

## Changes after confirmation
not applicable
<!-- frozen after approval: end -->
