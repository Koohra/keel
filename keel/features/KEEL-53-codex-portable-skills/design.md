# Design — KEEL-53

Requirements: requirements.md · Status: approved by Miguel on 2026-11-23

<!-- frozen after approval: start -->
Trigger: contract — muda a forma como toda skill do Keel cita os arquivos do plugin, e isso vale para as skills futuras.

## Approach
Cada SKILL.md ganha uma linha "Caminhos" que define `<plugin>`: no Claude Code é `${CLAUDE_PLUGIN_ROOT}`, que o Claude Code troca pelo caminho real ao carregar a skill; em outro agente é a pasta dois níveis acima deste SKILL.md, que o Codex já manda resolver a partir da pasta da skill. Todo comando e modelo passa a ser `<plugin>/scripts/...` e `<plugin>/templates/...`, e fases, checklists e guias são caminhos relativos à pasta da skill (`phases/triage.md`, `checklists/security.md`, `guides/adr.md`). O `<plugin>` não é sintaxe de shell, então o agente tem de trocá-lo pelo caminho antes de rodar; no Claude Code o caminho trocado é o mesmo que o `allowed-tools` libera (R1, R2). O texto ao dev marca `/doctor prompt-audit` como do Claude Code e mantém `/clear` (R3). No `keel-context.mjs`, `AGENTS.override.md` entra na lista de arquivos, e `visibility` passa a devolver o achado atual do Claude Code mais, no máximo, um achado `info` do Codex (R4, R5, R6). A seção "Visibilidade" da skill `setup` ganha os casos do Codex (R7).

## Code map
| Path | What changes | Reuse / do not touch |
|---|---|---|
| `skills/story/SKILL.md:4-29` | linha "Caminhos"; comandos com `<plugin>`; fase em `<instructions>` relativa à pasta da skill | frontmatter `allowed-tools` igual (R2); passos do fluxo iguais |
| `skills/story/phases/*.md` | `${CLAUDE_PLUGIN_ROOT}` → `<plugin>`; `${CLAUDE_SKILL_DIR}/x` → `x` (na pasta da skill) | texto das fases igual no resto |
| `skills/setup/SKILL.md:12-16, 37, 44-51` | linha "Caminhos", scripts e modelos com `<plugin>`; `/doctor prompt-audit` "do Claude Code"; visibilidade com Codex | passos 2 a 5 iguais |
| `plugins/keel-docs/skills/write/SKILL.md:4-17, 30` | linha "Caminhos"; tabela de guias e modelos; comando do `doc-check` | `allowed-tools` igual |
| `scripts/keel-context.mjs:188` `instructionPaths` | inclui `AGENTS.override.md` | varredura de subpastas igual |
| `scripts/keel-context.mjs:258` `visibility` | devolve lista: achado atual + achado do Codex; texto de "Only AGENTS.md" cita o Codex | demais textos, casos e severidades iguais |
| `scripts/keel-context.mjs:387` `review` | espalha a lista de `visibility` | `check` (linha 496) igual: só olha `warning` |
| `test/story-skill.test.mjs`, `setup-skill.test.mjs`, `docs-plugin.test.mjs`, `keel-context.test.mjs` | resolução de caminhos a partir da pasta da skill; casos do Codex | testes de hooks não mudam (#52) |
| `CHANGELOG.md` | uma linha em Unreleased | linha do #52 |

## Contracts and data
- Linha "Caminhos" (uma por SKILL.md, a única fora do frontmatter com `${CLAUDE_...}`): `` `<plugin>` é a pasta do plugin: no Claude Code, `${CLAUDE_PLUGIN_ROOT}`; em outro agente, a pasta dois níveis acima deste SKILL.md. Caminhos sem `<plugin>` (`phases/`, `checklists/`, `guides/`) são relativos à pasta deste SKILL.md. ``
- Achados novos de `review`, `kind: 'visibility'`, `severity: 'info'`: só `CLAUDE.md` sem `AGENTS.md`/override ("Codex does not read CLAUDE.md..."); `AGENTS.override.md` na raiz ("Codex reads AGENTS.override.md instead of AGENTS.md...; Claude Code does not read it").

## New structure and rationale
none

## Alternatives considered
| Option | For | Against | Why not |
|---|---|---|---|
| Placeholder `<plugin>` definido numa linha (escolhida) | um texto para os dois agentes; o Claude Code continua recebendo o caminho real | o agente precisa trocar o placeholder | — |
| Manter `${CLAUDE_PLUGIN_ROOT}` e explicar o Codex numa nota | diff menor | no Codex o modelo tende a rodar a variável literal; no shell sem ela vira `/scripts/...`, e no PowerShell a sintaxe é outra | falha calada no Codex |
| Script que imprime os caminhos | um ponto só | para rodar o script é preciso saber onde ele está | não resolve o problema |
| Caminho relativo `../../scripts` direto no comando | sem placeholder | os comandos rodam da raiz do projeto, não da pasta da skill | o caminho não existe a partir da raiz |
Fontes: Codex `codex-rs/ext/skills/src/catalog_prompt.rs` (resolve caminhos relativos à pasta do SKILL.md; sem substituição de variável), `codex-rs/skills/src/parser.rs` (frontmatter: só `name`, `description`, `metadata`; chave desconhecida é ignorada).

## Cross-cutting concerns
Security: o `allowed-tools` continua restrito aos scripts do plugin no Claude Code · Privacy: not applicable · Performance: not applicable · Observability: not applicable · Migration/rollback: só texto e um script; reverter o commit volta ao estado anterior

## Risks and pattern breaks
- O modelo do Claude Code pode manter `<plugin>` literal num comando; mitigação: a linha "Caminhos" vem antes de qualquer comando e o eval de acionamento do #55 confere.
- Conflito de arquivo com o #52 no `CHANGELOG.md`; mitigação: uma linha separada em Unreleased.

## ADR candidate?
Yes — a forma de citar arquivos do plugin nas skills vale para toda skill futura e sobrevive à história; rascunho em `adr-draft.md`.
<!-- frozen after approval: end -->
