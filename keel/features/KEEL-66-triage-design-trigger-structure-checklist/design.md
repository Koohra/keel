# Design — KEEL-66

Requirements: requirements.md · Status: approved by Miguel on 2026-11-28

<!-- frozen after approval: start -->
Trigger: contract — o `level` do `keel-state.mjs` passa a recusar nível menor com gatilho automático, e o `next` da triagem ganha `triage.designTriggers`

## Approach
Os gatilhos automáticos são uma função pura sobre fatos do disco: o resultado do `runCheck` do `arch-check` (`pending` e `orphans`, já sem o baseline) e a presença de `keel/product.md` e de código-fonte fora de `keel/` (R1). A borda do `keel-state.mjs` junta esses fatos só na triagem, no `next` e no `level`; um `keel/architecture.json` inválido vira "sem gatilho de arquitetura" (AC-5.1). O `nextStep` mostra `triage: { designTriggers }` quando a fase é triagem, como já faz com `closing`. O `setLevel` recebe a lista recalculada, confere nível, `--by` e fase como hoje e só depois recusa `trivial` e `standard` com gatilho; grava a lista em `steps.triage.designTriggers` (R2, AC-2.2). A fase de triagem passa a ler a lista do `next` (R3). No `task-loop.mjs`, o `reviewChecklists` ganha `structure` depois de `security`, ligado pelo `Trigger: new structure` ou `rung change` ou por uma linha de dado na tabela "New structure and rationale" (R4, R5); o texto do checklist fica em `skills/story/checklists/structure.md`.

## Code map
| Path | What changes | Reuse / do not touch |
|---|---|---|
| `scripts/keel-state.mjs:169-208` | `nextStep` mostra `triage`; `setLevel` recebe e grava os gatilhos; função pura `designTriggers(facts)` | ordem das verificações de hoje em `setLevel` |
| `scripts/keel-state.mjs:390-440` | a borda junta os fatos da triagem para `next` e `level` | `runCheck` de `scripts/arch-check.mjs:531` |
| `scripts/arch-check.mjs:478-490` | exporta a contagem de arquivos de código do disco, pela varredura que já existe | `walk`, `SKIP_DIRS`, `isSourcePath` |
| `scripts/task-loop.mjs:213-225` | `reviewChecklists` ganha `structure` | `contract`, `data`, `security` como estão |
| `skills/story/checklists/structure.md` | checklist novo, 5 itens, no formato dos outros | `skills/story/checklists/contract.md` |
| `skills/story/phases/triage.md` | passo que lê `designTriggers` e propõe `with-design` | regra de linguagem simples (degrau, porta e mapper só entre parênteses) |
| `test/keel-state.test.mjs`, `test/task-loop.test.mjs`, `test/story-skill.test.mjs` | testes de R1 a R5 | `test/story-repo.mjs` sem mudança |

## Contracts and data
- `next` na triagem: `"triage": { "designTriggers": ["planned component without files: api", "orphan file: src/x.js", "first story that creates source code: keel/product.md and no source file outside keel/"] }`; fora da triagem, a chave não aparece.
- `state.json`: `steps.triage` ganha `designTriggers: string[]`, gravado pelo `level`. Estado antigo sem o campo continua válido.
- Erro do `level`: `level <x> refused: automatic design trigger(s): <lista>; use level with-design --by <dev>`.

## New structure and rationale
none

## Alternatives considered
| Option | For | Against | Why not |
|---|---|---|---|
| Só mostrar os gatilhos e deixar a IA propor | nenhuma recusa nova | depende do julgamento da IA | o critério 1 da issue pede "sem depender do julgamento da IA" |
| Varrer código pelo `git ls-files` | respeita `.gitignore` | fora do git conta zero | o revisor de requisitos apontou o falso gatilho; a varredura do `arch-check` já é a medida do projeto |

## Cross-cutting concerns
Security: not applicable · Privacy: not applicable · Performance: a varredura do disco roda só na triagem, uma vez por `next` ou `level` · Observability: not applicable · Migration/rollback: not applicable

## Risks and pattern breaks
- Histórias já com nível confirmado não mudam: o `level` só roda na triagem.
- Projeto com muitos órfãos novos fica sempre em `with-design` até declarar os componentes ou gravar o baseline; é o pedido da issue.

## ADR candidate?
No — muda um critério da triagem, não a estrutura nem uma dependência
<!-- frozen after approval: end -->
