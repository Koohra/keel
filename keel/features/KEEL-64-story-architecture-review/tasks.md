# Tasks — KEEL-64

Requirements: requirements.md · Design: design.md
Approved by Miguel on 2026-11-28

<!-- frozen after approval: start -->
## T1 — Walking skeleton: o fechamento só termina com a revisão de história gravada
Covers: R4 (AC-4.1, AC-4.2, AC-4.4)
Files: `scripts/closing.mjs`, `scripts/keel-state.mjs`, `workflow/workflow.json`, `test/closing.test.mjs`, `test/story-repo.mjs`, `test/check-feature.test.mjs`, `test/workflow.test.mjs`
New structure: none
Test first: `story review: advance needs review story in the closing` — no fechamento, o `advance` recusa sem `review story`, aceita depois de `--result ok` e de `--result unavailable`; fora do fechamento o comando é recusado, resultado inválido lista os três e alvo desconhecido diz "use requirements, task or story"
Verification: `node --test test/closing.test.mjs`
Done when: o teste novo passa e os testes que levam a história a `done` gravam o `review story` antes
Depends on: —

## T2 — O review vence quando o HEAD muda, e o next mostra a base
Covers: R4 (AC-4.3), R6 (AC-6.1)
Files: `scripts/closing.mjs`, `test/closing.test.mjs`
New structure: none
Test first: `story review: a new commit after the review asks for it again, and next shows the base` — depois de `review story`, um commit novo faz o `advance` pedir o review de novo e um segundo `review story` o substitui; `closing.base` é o commit antes da primeira task
Verification: `node --test test/closing.test.mjs`
Done when: o teste novo passa
Depends on: T1

## T3 — Achados da revisão de história precisam de destino no tasks.md
Covers: R5 (AC-5.1)
Files: `scripts/closing.mjs`, `templates/tasks.md`, `test/closing.test.mjs`
New structure: none
Test first: `story review: findings need a disposition in Story review` — com `findings`, o `advance` recusa sem a seção "Story review" e com `Review:` só com o resultado, e aceita com o destino de cada achado; o modelo do tasks.md tem a seção
Verification: `node --test test/closing.test.mjs`
Done when: o teste novo passa
Depends on: T1

## T4 — Modo de história no revisor e passo no fechamento
Covers: R1 (AC-1.1), R2 (AC-2.1), R3 (AC-3.1), R6 (AC-6.2)
Files: `agents/reviewer.md`, `skills/story/phases/closing.md`, `test/story-skill.test.mjs`
New structure: none
Test first: `o revisor tem a revisão de história com os dois lados e o fechamento a chama` — a seção "Revisão de história" tem as entradas, os itens de excesso e de falta, no máximo 5 achados, as três classes, a fonte e "Não julgado"; o revisor segue com `tools: Read, Grep, Glob`; o closing.md chama o `keel:reviewer` com "revisão de história", grava `review story --result`, escreve em "Story review" e não corrige código
Verification: `node --test test/story-skill.test.mjs`
Done when: o teste novo passa
Depends on: T3

## T5 — Eval da revisão de história: duplicação apontada, porta justificada mantida
Covers: R7 (AC-7.1)
Files: `evals/phases/closing-story-review/case.yaml`, `evals/phases/closing-story-review/fixture.sh`, `evals/phases/closing-story-review/graders/*.md`, `test/evals.test.mjs`
New structure: none
Test first: `stage 10 has a story review case: duplication is found and a justified port is kept` — o caso existe com tag `phase-10`, grader do `keel:reviewer` com "revisão de história", grader de duplicação ou formato na resposta e grader `not_contains` para REMOVER a porta
Verification: `node --test test/evals.test.mjs`
Done when: o teste novo passa
Depends on: T4
<!-- frozen after approval: end -->

## Progress
### T1
Status: done (954977b)
RED evidence: `node --test test/closing.test.mjs` exited with 1 at 2026-11-28T00:37:23.747Z
GREEN evidence: `node --test test/closing.test.mjs` exited with 0 at 2026-11-28T00:41:41.781Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (advance com unavailable vai a done); F2 kept (a lista de resultados repetida pede mexer em scripts/task-loop.mjs, fora do Files: da T1; anotado em Implementation notes); F3 kept (o head é da T2, AC-4.3); F4 kept (o despacho por alvo fica no run, que é quem lista os alvos)
### T2
Status: in review
RED evidence: `node --test test/closing.test.mjs` exited with 1 at 2026-11-28T00:43:02.390Z
GREEN evidence: `node --test test/closing.test.mjs` exited with 0 at 2026-11-28T00:45:33.558Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (o teste de histórico reescrito confere closing.base null)
### T3
Status: pending
### T4
Status: pending
### T5
Status: pending

## Implementation notes
- Fora do escopo: a lista `['ok', 'findings', 'unavailable']` aparece em `scripts/keel-state.mjs`, `scripts/task-loop.mjs` e `scripts/closing.mjs`; extrair pede mexer no `task-loop.mjs`.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
