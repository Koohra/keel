# KEEL-52 — Portões do Keel funcionando no Codex

Source: https://github.com/Koohra/keel/issues/52 (épico #50) · Folder: keel/features/KEEL-52-codex-hooks/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> `hooks/hooks.json` registra `PreToolUse`, `PostToolUse`, `SessionStart` e `Stop`. O formato é o mesmo no Codex, e o Codex define `CLAUDE_PLUGIN_ROOT` por compatibilidade. O que muda: edição de arquivo vem como `apply_patch` (o caminho está dentro do patch, em `tool_input.command`, e um patch pode tocar vários arquivos, inclusive criar, apagar e renomear); não há `CLAUDE_PROJECT_DIR` e o `cwd` é o da sessão, que pode ser uma subpasta; conferir a saída de bloqueio do `Stop` e do `PostToolUse`; hooks de plugin precisam ser aprovados em `/hooks`; `Bash` cobre `exec_command`.
> O que fazer: normalizar o evento num ponto só, raiz do projeto por `CLAUDE_PROJECT_DIR`, senão raiz git do `cwd`, senão `cwd`; matchers que pegam `apply_patch` sem quebrar o Claude Code; saída de bloqueio aceita pelos dois.

## Goal
Os portões do Keel (código fora da implementação, `state.json`, commit sem aprovação, task aberta no fim do turno, contexto da história) valem no Codex como valem no Claude Code, sem mudar nada para quem usa o Claude Code. [source: issue #52; issue #50]

## Out of scope
- Manifesto e marketplace do Codex (#51), texto das skills (#53), revisor como subagente (#54), e2e no Codex CLI, CI e release (#55).
- Tirar do README a frase "Ainda não cobre o Codex" (#55).

## Rules and acceptance criteria
R1. WHEN o Codex manda um `apply_patch` THE hook PreToolUse SHALL aplicar a cada arquivo do patch (criado, alterado, apagado, origem e destino de renomeação) a mesma regra de edição do Claude Code, e bloquear o patch inteiro se qualquer arquivo for proibido. [source: issue #52 item 1; https://learn.chatgpt.com/docs/hooks (tool_name `apply_patch`, patch em `tool_input.command`)]
  - AC-1.1 GIVEN uma história fora da implementação WHEN chega um `apply_patch` que altera `src/app.js` THEN o hook sai com 2 e o mesmo motivo do Claude Code.
  - AC-1.2 GIVEN uma história fora da implementação WHEN o patch adiciona um arquivo da história e apaga, cria ou renomeia um arquivo de código THEN o patch é bloqueado; um patch só com arquivos da história passa.
  - AC-1.3 GIVEN qualquer fase WHEN um `apply_patch` ou um comando de shell do Codex escreve `keel/features/*/state.json` THEN o hook bloqueia com o motivo do `keel-state.mjs`.
R2. WHEN o evento não traz `CLAUDE_PROJECT_DIR` THE hooks SHALL usar como raiz do projeto a raiz git acima do `cwd` e, sem git, o próprio `cwd`; os caminhos do patch são resolvidos a partir do `cwd`. [source: issue #52 item 2; https://learn.chatgpt.com/docs/hooks (hooks rodam no cwd da sessão; recomenda a raiz git)]
  - AC-2.1 GIVEN uma sessão aberta numa subpasta do projeto, sem `CLAUDE_PROJECT_DIR` WHEN chega um `apply_patch` com caminho relativo à subpasta THEN o hook acha a história ativa e decide pela fase dela.
  - AC-2.2 GIVEN uma sessão numa subpasta sem `CLAUDE_PROJECT_DIR` WHEN roda o `SessionStart` THEN o contexto da história é injetado.
  - AC-2.3 GIVEN uma task aberta sem RED e sessão numa subpasta sem `CLAUDE_PROJECT_DIR` WHEN roda o `Stop` THEN o hook sai com 2 e o motivo no stderr.
R3. WHEN o Codex pede um `git commit` pelo shell sem a aprovação gravada THE hook PreToolUse SHALL bloquear como no Claude Code. [source: issue #52 critério 3]
  - AC-3.1 GIVEN uma task em implementação sem `approve commit` WHEN chega `tool_name: Bash` do Codex com `git commit`, sem `CLAUDE_PROJECT_DIR` THEN o hook sai com 2.
R4. WHEN o Codex manda um `apply_patch` concluído THE hook PostToolUse SHALL dar a cada arquivo do patch que ainda existe o mesmo retorno de arquitetura, deriva do bloco e escopo da task que daria a um `Edit`. [source: issue #52 item 4]
  - AC-4.1 GIVEN uma violação de arquitetura WHEN um `apply_patch` cria o arquivo que a planta THEN a saída é `decision: block` com a violação; apagar um arquivo não gera retorno.
R5. WHEN o hook bloqueia THE saída SHALL ser uma que os dois agentes aceitam: `exit 2` com o motivo no stderr no PreToolUse e no Stop, JSON `decision: block` ou `additionalContext` no PostToolUse, `additionalContext` no SessionStart. [source: https://learn.chatgpt.com/docs/hooks (exit 2 aceito em PreToolUse, PostToolUse e Stop; motivo do Stop vira o novo prompt)]
  - AC-5.1 GIVEN os arquivos do repo WHEN o teste lê `hooks/hooks.json` THEN os matchers do PreToolUse e do PostToolUse aceitam `Edit` e `Write`, que o Codex usa como alias do `apply_patch`, e o do PreToolUse aceita `Bash`, sem mudar o que o Claude Code já registra.
R6. WHERE o dev usa o Keel no Codex THE README SHALL explicar a aprovação dos hooks em `/hooks` e que, sem ela, o Keel roda sem portões. [source: issue #52 último critério; https://learn.chatgpt.com/docs/hooks (confiança por hash)]
  - AC-6.1 GIVEN o README WHEN o teste o lê THEN há uma seção sobre os hooks no Codex que cita `/hooks` e o que acontece sem aprovação.

## Explicit obligations
- Existing behavior that must not change: os testes atuais de `pre-tool-use`, `post-tool-use`, `stop` e `session-start` passam sem mudar expectativa; `CLAUDE_PROJECT_DIR` continua tendo prioridade. [source: issue #52 critério 8]
- Scripts sem dependência, só `node:`; testes passam no Windows. [source: AGENTS.md]

## Conflicts found
- none

## Questions and assumptions
- [ASSUMPTION] O `Stop` continua com `exit 2` e motivo no stderr: a doc do Codex aceita `exit 2` no Stop e usa o motivo como prompt de continuação, então não é preciso trocar para JSON. A confirmação no CLI fica para o e2e (#55). [source: https://learn.chatgpt.com/docs/hooks]
- [ASSUMPTION] A gramática do `apply_patch` é a do Codex (`*** Begin Patch`, `*** Add File:`, `*** Update File:`, `*** Delete File:`, `*** Move to:`, `*** End Patch`); a doc dos hooks não a descreve. Um comando de shell que chama `apply_patch` com o patch inline passa pela mesma leitura. [source: formato do apply_patch do Codex, fora da doc dos hooks, a confirmar no e2e (#55); issue #52 item 1]
- [ASSUMPTION] Os matchers atuais já pegam o `apply_patch` (o Codex aplica o matcher ao nome da ferramenta e aos aliases, e `Edit|Write` casa com `apply_patch`), então `hooks/hooks.json` não muda. [source: https://learn.chatgpt.com/docs/hooks]
- [ASSUMPTION] A raiz git é achada subindo do `cwd` até a pasta com `.git` (pasta ou arquivo), sem rodar `git`: funciona com worktree e com os repositórios de teste. [source: scripts/keel-state.mjs currentBranch]
<!-- frozen after approval: end -->

## Changes after confirmation
not applicable
