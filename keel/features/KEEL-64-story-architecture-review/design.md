# Design — KEEL-64

Requirements: requirements.md · Status: approved by Miguel on 2026-11-28

<!-- frozen after approval: start -->
Trigger: contract — o `keel-state.mjs` ganha o alvo `review story`, e a saída do fechamento ganha o critério `review:story` no `workflow.json`

## Approach
O resultado da revisão de história fica no `state.json` como os das outras revisões, só que no passo `closing`: `review story --result` grava `{ result, head, at }` com o HEAD do momento (R4). O `gatherClosing` passa a juntar também a base e o HEAD da história, que entram no `closing` do estado; o `closingView` mostra a base (AC-6.1). O critério novo `review:story` é uma função pura sobre o estado e o tasks.md: falta o review, o HEAD mudou desde ele (AC-4.3), ou, com `findings`, a linha `Review:` da seção "Story review" não tem destino depois do resultado (R5), a mesma leitura que o `approveCommit` faz do `Review:` da task (`scripts/task-loop.mjs:300`). O texto do modo novo do revisor e a rubrica de dois lados ficam no `agents/reviewer.md` (R1, R2, R3); a fase de fechamento ganha o passo que chama o revisor e trata os achados (R6); e um caso de eval sobre a node-mini com duplicação e uma porta justificada cobre o R7.

## Code map
| Path | What changes | Reuse / do not touch |
|---|---|---|
| `scripts/closing.mjs` | `recordStoryReview`, `storyReviewResult`; `gatherClosing` devolve `base` e `head`; `recordClosing` e `closingView` levam a base | reusa `storyBase` (`scripts/closing.mjs:164`) e `sections` do `validate-feature.mjs` |
| `scripts/keel-state.mjs` | `review story` no `run`, alvo `story` no critério `review`, mensagem e ajuda do `review` | não mexer em `recordReview` de requisitos nem em `recordTaskReview` |
| `workflow/workflow.json` | `review:story` na saída do fechamento | demais critérios iguais |
| `agents/reviewer.md` | seção "Revisão de história" | frontmatter e as outras seções iguais |
| `skills/story/phases/closing.md` | passo da revisão de história entre arquitetura e deltas | passos e "Nunca" existentes |
| `templates/tasks.md` | seção "Story review" com a linha `Review:` | resto do modelo |
| `evals/phases/closing-story-review/` | caso novo | `evals/phases/prepare.sh` sem mudança |
| `test/closing.test.mjs`, `test/story-repo.mjs`, `test/check-feature.test.mjs`, `test/story-skill.test.mjs`, `test/evals.test.mjs` | testes novos e o `review story` antes dos `advance` para `done` já existentes | — |

## Contracts and data
- CLI: `review <requirements|task|story> --result <ok|findings|unavailable>`; `story` só na fase `closing`. Alvo desconhecido: `unknown review of "<x>"; use requirements, task or story`.
- `state.json`: `steps.closing.review = { result, head, at }`; `steps.closing.base` e `steps.closing.head` vêm do `gatherClosing` a cada comando no fechamento. Estado antigo sem esses campos lê como `null`.
- `next` no fechamento: `closing.base` (hash completo ou `null`).
- tasks.md, fora do bloco congelado: `## Story review` com `Review: <ok|findings|unavailable> (isolated reviewer)[; destino de cada achado]`.

## New structure and rationale
none

## Alternatives considered
| Option | For | Against | Why not |
|---|---|---|---|
| Destino dos achados num arquivo novo da história | separa do tasks.md | artefato novo por história | o épico #61 proíbe artefato novo por história |
| Review vinculado ao hash do diff da história | pega mudança fora de commit | no fechamento o código não muda (hook) e os deltas de docs mudam depois do review | o HEAD basta: task nova vinda de achado sempre vira commit |

## Cross-cutting concerns
Security: not applicable · Privacy: not applicable · Performance: not applicable · Observability: not applicable · Migration/rollback: not applicable

## Risks and pattern breaks
- História já no fechamento quando a versão chega passa a pedir `review story` (suposição aceita no requirements.md).
- Mudar o `agents/reviewer.md` deixa o revisor do Codex `outdated` até rodar o setup de novo; a fase já grava `unavailable`.

## ADR candidate?
No — é um passo a mais dentro do fluxo por script da ADR-002, sem estrutura, dependência ou técnica nova
<!-- frozen after approval: end -->
