# Design — KEEL-63

Requirements: requirements.md · Status: approved by Miguel on 2026-11-28

<!-- frozen after approval: start -->
Trigger: contract — o `keel/architecture.json` ganha o componente em objeto (`planned`) e o campo `coverage`, e a saída do arch-check e o `closing.arch` do state.json ganham campos novos.

## Approach
Tudo fica nos módulos que já existem. O `validateConfig` do arch-check normaliza cada componente para globs mais a marca de planejado; planejado sem arquivo vai para `pending`, a regra com `from` pendente não roda e o alvo pendente sai do `forbid` (R1). Com `coverage`, cada arquivo coberto sem componente vira órfão com chave `orphan|<arquivo>`, filtrado pela mesma baseline; órfão não muda o `status` (R3). O hook PostToolUse transforma o órfão do arquivo editado em aviso (R4). No fechamento, o `checkArch` junta os arquivos de fonte criados desde a base e os órfãos novos; o `archResult` recusa a dispensa quando há fonte criada e nenhum componente ativo (R2) e recusa órfão novo pedindo o delta do `architecture.json` e de "Rungs per module"; o `keel/architecture.json` entra nos deltas que o dev aprova (R5). O `task-metrics` lê os manifests mudados pela task, em qualquer pasta, com leitores de linha por formato (R6).

## Code map
| Path | What changes | Reuse / do not touch |
|---|---|---|
| `scripts/arch-check.mjs:240` (`validateConfig`) | componente em objeto, `planned`, `coverage`, `pending` | `globToRegExp`, `matches`; a mensagem de zero arquivos de hoje |
| `scripts/arch-check.mjs:345` (`checkArchitecture`) | regras sem alvo pendente, `orphans`, `pending`; órfão em `known`/`stale` pela baseline | `componentsOf`, `add` |
| `scripts/arch-check.mjs:494` (`runCheck`, `writeBaseline`, `main`) | filtro por `--files` nos órfãos; baseline grava órfão; texto lista `pending` e órfãos | exit 1 só com violação |
| `scripts/hooks/post-tool-use.mjs:30` | órfão do arquivo editado vira `additionalContext`, junto do bloqueio quando houver | `merge`, `combine` |
| `scripts/closing.mjs:150` (`checkArch`), `:82` (`archResult`), `:198` (`PROJECT_DOCS`), `:122` (`sectionDelta`), `:98` (`approveDeltas`) | `created`, `noActive`, `orphans` no `closing.arch`; recusas novas; `keel/architecture.json` como arquivo inteiro nos deltas | `gitPaths`, `baselineGrowth`; recusa de baseline que cresceu não muda |
| `scripts/task-metrics.mjs:39` | `newDependencies` também dos manifests mudados | `package.json` igual a hoje |
| `skills/story/phases/closing.md:17` | passo 3 com órfão e fonte criada sem componente ativo | resto da fase |
| `docs/specification.md:706`, `CHANGELOG.md`, `templates/architecture.json` | formato novo e exceção do planejado | — |

## Contracts and data
`keel/architecture.json` (campos novos opcionais):
```
"components": { "domain": ["src/domain/**"], "api": { "globs": ["src/api/**"], "planned": true } },
"coverage": ["src/**"]
```
Saída do `runCheck` (aditiva): `pending: ["api"]`, `orphans: [{ key: "orphan|src/x.js", file, message }]` (só os novos). `closing.arch` (aditivo): `created: [arquivos]`, `noActive: boolean`, `orphans: [mensagens]`; um `closing.arch` antigo sem esses campos vale como listas vazias.

## New structure and rationale
none

## Alternatives considered
| Option | For | Against | Why not |
|---|---|---|---|
| Lista `"planned": ["api"]` no topo | não muda o formato do componente | duas listas para manter em sincronia | objeto no próprio componente [source: dev on 2026-11-28] |
| Órfão em `violations` (exit 1) | um lugar só | o comando de "Checks" das tasks falharia | só aviso fora do fechamento [source: dev on 2026-11-28] |
| Parser TOML/XML completo | exato | dependência ou muito código | leitores de linha por formato bastam para nomes |

## Cross-cutting concerns
Security: not applicable · Privacy: not applicable · Performance: uma passada extra pelos arquivos para `coverage` · Observability: órfãos e `pending` na saída · Migration/rollback: campos opcionais; `architecture.json` de hoje não muda

## Risks and pattern breaks
- A recusa de fonte criada sem componente ativo pega projetos existentes com a dispensa que criam arquivo novo: é o que a issue pede; a mensagem diz como sair (declarar os componentes).
- Conflito de texto com a #65 em `skills/story/phases/closing.md`: mudança pequena no passo 3; atualizar com a main antes do PR.

## ADR candidate?
No — estende o formato do `architecture.json` com campos opcionais, sem estrutura, dependência ou técnica nova; segue ADR-004 (scripts sem dependência).
<!-- frozen after approval: end -->
