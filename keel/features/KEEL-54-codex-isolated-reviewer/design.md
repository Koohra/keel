# Design — KEEL-54

Requirements: requirements.md · Status: draft

<!-- frozen after approval: start -->
Trigger: new structure — um módulo novo gera e instala o agente do Codex e decide o que o revisor pode rodar no shell; cross-cutting — o só leitura do revisor passa a ser garantido por hook.

## Approach
Um módulo novo, `scripts/codex-reviewer.mjs`, concentra o que é do revisor no Codex: gera o TOML a partir de `agents/reviewer.md` (R1), instala e confere `.codex/agents/keel-reviewer.toml` no projeto (R2), e decide se um comando de shell é só leitura (R3). O PreToolUse, que já recebe o evento normalizado do Codex (`event.mjs`), olha `agent_type` antes das regras atuais: se é `keel-reviewer`, bloqueia toda edição e todo comando fora da lista de leitura, em qualquer fase; senão segue como hoje (AC-3.4). O setup ganha um passo só para o Codex, e as fases de confirmação e implementação ganham uma frase para o Codex ao lado da chamada `keel:reviewer`, que não muda (R2, R4).

## Code map
| Path | What changes | Reuse / do not touch |
|---|---|---|
| `scripts/codex-reviewer.mjs` | novo: `reviewerToml(markdown)`, `isReadOnlyCommand(command)` (puras) e CLI `install [--force]` / `check` | nenhum script lê frontmatter hoje: leitura simples do bloco `---` no próprio módulo |
| `scripts/hooks/pre-tool-use.mjs:30` | antes de `shellCommand`, bloqueio do revisor | `editTargets`, `shellCommand` de `scripts/hooks/event.mjs` |
| `skills/setup/SKILL.md` | passo 6 "Revisor no Codex" com aprovação e `install` | passos 1 a 5 não mudam |
| `skills/story/phases/confirmation.md:5`, `skills/story/phases/implementation.md:40` | frase para o Codex: `check`, `agent_type: keel-reviewer`, `fork_turns: none`, quando gravar `unavailable` | a chamada `keel:reviewer` não muda; a #53 mexe nos caminhos destes arquivos |
| `agents/reviewer.md` | não muda | fonte única |
| `hooks/hooks.json` | não muda: o matcher já pega `apply_patch` (alias `Edit`/`Write`) e `Bash` | — |

## Contracts and data
`.codex/agents/keel-reviewer.toml`, gerado:
```
# Gerado pelo Keel a partir de agents/reviewer.md. Não edite: rode o setup de novo.
name = "keel-reviewer"
description = "<description do frontmatter>"
developer_instructions = """
<corpo do reviewer.md, com \ e " escapados>"""
```
`description` em string básica de uma linha; `developer_instructions` em string básica multilinha (`\` vira `\\`, `"` vira `\"`), assim nenhum texto do `.md` fecha a string. CLI na raiz do projeto: `install` sai 0 ao gravar ou se já está igual, 1 se o arquivo difere (sem `--force`); `check` sai 0 se igual, 1 com `missing` ou `outdated`.
Lista de leitura do shell: `cat`, `rg` (sem `--pre`), `grep`, `sed -n` (sem `-i` nem comando `w`/`e`), `ls`, `find` (sem `-delete`, `-exec*`, `-ok*`, `-fprint*`, `-fls`), `head`, `tail`, `wc`, `git diff|log|show|status` (sem `--output`), `cd`, `pwd`; trechos separados por `&&`, `||`, `;`, `|` ou quebra de linha; qualquer `>`, `` ` `` ou `$(` bloqueia.

## New structure and rationale
| Element | Kind (interface, layer, mapper/DTO, module, helper, dependency) | Rationale (R#, 2nd implementation, external port, published boundary, 3rd occurrence) | Simpler alternative and why not |
|---|---|---|---|
| `scripts/codex-reviewer.mjs` | module | R1, R2, R3: published boundary (o arquivo `.codex/agents/` é contrato com o Codex) | pôr em `keel-context.mjs`: ele trata AGENTS.md/CLAUDE.md, e o hook importaria um módulo de 684 linhas que não usa |

## Alternatives considered
| Option | For | Against | Why not |
|---|---|---|---|
| `codex exec --sandbox read-only` | sandbox de verdade | precisa do `codex` no PATH e de rede dentro do sandbox da sessão | dev escolheu o setup + hook [source: dev on 2026-11-23] |
| Lista de bloqueados no shell | revisor mais livre | comando desconhecido passaria | lista de permitidos (review dos requisitos, AC-3.3) |
| TOML versionado no repo e teste de divergência | o dev vê o arquivo | duas fontes | gerar na instalação deixa uma fonte só (AC-1.2) |
| Fonte: https://github.com/openai/codex `codex-rs/core-plugins/src/manifest.rs`, `codex-rs/core/src/agent/role.rs`, `codex-rs/hooks/schema/generated/pre-tool-use.command.input.schema.json` | | | |

## Cross-cutting concerns
Security: só leitura do revisor por hook, lista de permitidos; o hook só vale com os hooks do Keel aprovados em `/hooks` · Privacy: not applicable · Performance: not applicable · Observability: motivo do bloqueio no stderr · Migration/rollback: arquivo novo em `.codex/agents/`, removível à mão

## Risks and pattern breaks
- No Windows o Codex usa PowerShell, cujos comandos de leitura (`Get-Content`) ficam fora da lista e são bloqueados: o revisor pode não conseguir ler. Mitigação: ver no e2e (#55) e ampliar a lista se preciso.
- Conflito de texto com a #53 em `confirmation.md` e `implementation.md`: a mudança aqui é uma frase em cada; quem mergear depois resolve.

## ADR candidate?
No — segue ADR-004 (scripts sem dependência) e o mecanismo vale só para a distribuição no Codex, já decidida no épico #50.
<!-- frozen after approval: end -->
