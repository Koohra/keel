# Tasks — KEEL-66

Requirements: requirements.md · Design: design.md
Approved by Miguel on 2026-11-28

<!-- frozen after approval: start -->
## T1 — Walking skeleton: componente planejado sem arquivo força with-design na triagem
Covers: R1 (AC-1.1), R2 (AC-2.1, AC-2.2), R5 (AC-5.1)
Files: `scripts/keel-state.mjs`, `test/keel-state.test.mjs`, `test/story-repo.mjs`
New structure: none
Test first: `triage: a planned component without files makes the level with-design` — com um componente `planned` sem arquivo, o `next` da triagem mostra o gatilho, `level standard` é recusado com o gatilho, `level foo`, sem `--by` e fora da triagem dão o erro de hoje, e `level with-design` grava os gatilhos; com código e sem `architecture.json`, ou com o JSON inválido, `designTriggers` é `[]` e `level standard` passa
Verification: `node --test test/keel-state.test.mjs`
Done when: o teste novo passa
Depends on: —

## T2 — Órfão novo e projeto sem código-fonte também são gatilhos
Covers: R1 (AC-1.2, AC-1.3)
Files: `scripts/keel-state.mjs`, `scripts/arch-check.mjs`, `test/keel-state.test.mjs`
New structure: none
Test first: `triage: a new orphan file and a project without source code are design triggers` — órfão fora do baseline aparece, órfão no baseline não; projeto com `keel/product.md` e sem código fora de `keel/`, também fora do git, tem o gatilho de primeira história, que some com um arquivo de código
Verification: `node --test test/keel-state.test.mjs`
Done when: o teste novo passa
Depends on: T1

## T3 — A fase de triagem lê os gatilhos automáticos
Covers: R3 (AC-3.1)
Files: `skills/story/phases/triage.md`, `docs/specification.md`, `test/story-skill.test.mjs`
New structure: none
Test first: `triage: the phase reads designTriggers and proposes with-design` — o `triage.md` cita `designTriggers`, diz que com gatilho automático o nível é `with-design` e que o script recusa nível menor
Verification: `node --test test/story-skill.test.mjs`
Done when: o teste novo passa
Depends on: T1

## T4 — Checklist de estrutura para o revisor de task
Covers: R4 (AC-4.1, AC-4.2), R5 (AC-5.2)
Files: `scripts/task-loop.mjs`, `skills/story/checklists/structure.md`, `docs/specification.md`, `test/task-loop.test.mjs`, `test/story-skill.test.mjs`
New structure: none
Test first: `checklists: new structure or a rung change brings the structure checklist` — `reviewChecklists` inclui `checklists/structure.md` com linha na tabela "New structure and rationale", `Trigger: new structure` e `Trigger: rung change`, depois de contrato; tabela vazia ou com placeholder não conta; o `structure.md` tem os 5 itens
Verification: `node --test test/task-loop.test.mjs test/story-skill.test.mjs`
Done when: o teste novo passa
Depends on: —
<!-- frozen after approval: end -->

## Progress
### T1
Status: done (a3f31b4)
RED evidence: `node --test test/keel-state.test.mjs` exited with 1 at 2026-11-28T02:11:12.259Z
GREEN evidence: `node --test test/keel-state.test.mjs` exited with 0 at 2026-11-28T02:15:53.873Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (o catch só aceita erro do keel/architecture.json); F2 fixed (gatilhos calculados uma vez por comando); F3 kept (design congelado; a mudança está em Implementation notes, T1); F4 fixed
### T2
Status: done (920b4ee)
RED evidence: `node --test test/keel-state.test.mjs` exited with 1 at 2026-11-28T02:16:51.578Z
GREEN evidence: `node --test test/keel-state.test.mjs` exited with 0 at 2026-11-28T02:18:41.357Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (sem keel/product.md não varre o código; com ele, a varredura do arch-check e a dos caminhos ficam separadas, sem mudar o arch-check); F2 fixed
### T3
Status: pending
### T4
Status: pending

## Implementation notes
- T1: o `Files:` ganhou `test/story-repo.mjs`. O `closingRepo` com componente só planejado ficava preso na triagem pelo gatilho novo; o fixture passa a gravar o `architecture.json` depois do `level`, e o tasks.md teve nova aprovação.

## Story review
Review: <ok | findings and what became of each one | unavailable> (filled in the closing)

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
