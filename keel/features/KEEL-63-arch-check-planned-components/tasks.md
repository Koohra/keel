# Tasks — KEEL-63

Requirements: requirements.md · Design: design.md
Approved by Miguel on 2026-11-28

<!-- frozen after approval: start -->
## T1 — Walking skeleton: componente planejado sem arquivos fica pending
Covers: R1 (AC-1.1, AC-1.2, AC-1.3, AC-1.4)
Files: `scripts/arch-check.mjs`, `test/arch-check.test.mjs`
New structure: none
Test first: `planned component without files is pending and its rules wait` — mais a regra que vale com o primeiro arquivo, o alvo ativo cobrado ao lado de um alvo pendente, o componente comum com zero arquivos saindo com 2 e os erros de formato (`planned` não booleano, objeto sem `globs`)
Verification: `node --test test/arch-check.test.mjs`
Done when: os testes novos e os antigos do arch-check passam
Depends on: —

## T2 — Arquivo coberto fora de componente vira órfão, com baseline
Covers: R3 (AC-3.1, AC-3.2, AC-3.3)
Files: `scripts/arch-check.mjs`, `test/arch-check.test.mjs`
New structure: none
Test first: `covered file outside every component is an orphan` — mais exit 0 só com órfão, órfão na baseline como conhecido, `--write-baseline` gravando a chave, chave antiga como `stale`, arquivo de componente planejado que não é órfão e `coverage` inválido saindo com 2
Verification: `node --test test/arch-check.test.mjs`
Done when: os testes novos e os antigos do arch-check passam
Depends on: T1

## T3 — Hook avisa o órfão sem bloquear
Covers: R4 (AC-4.1, AC-4.2)
Files: `scripts/hooks/post-tool-use.mjs`, `test/post-tool-use.test.mjs`
New structure: none
Test first: `PostToolUse warns about an orphan file without blocking` — mais o arquivo órfão que viola regra: bloqueia e leva o aviso junto
Verification: `node --test test/post-tool-use.test.mjs`
Done when: os testes novos e os antigos do PostToolUse passam
Depends on: T2

## T4 — Fechamento recusa fonte criada sem componente ativo
Covers: R2 (AC-2.1, AC-2.2, AC-2.3, AC-2.4)
Files: `scripts/closing.mjs`, `scripts/arch-check.mjs`, `scripts/check-feature.mjs`, `test/closing.test.mjs`, `test/story-repo.mjs`, `test/check-feature.test.mjs`
New structure: none
Test first: `closing refuses the waiver when the story created source without an active component` — sem architecture.json com dispensa e `src/a.js` novo; só fonte existente mudada ou renomeada passa; só teste novo não passa; architecture.json só com pendentes não passa
Verification: `node --test test/closing.test.mjs`
Done when: os testes novos e os antigos do fechamento passam
Depends on: T1

## T5 — Fechamento pede o delta do architecture.json para órfão
Covers: R5 (AC-5.1, AC-5.2, AC-5.3)
Files: `scripts/closing.mjs`, `skills/story/phases/closing.md`, `test/closing.test.mjs`
New structure: none
Test first: `closing asks for the architecture.json delta for a new orphan` — mais `keel/architecture.json` mudado em `closing.deltas.files` pedindo `approve deltas`, e o texto do passo 3 do closing.md com órfão, `keel/architecture.json` e "Rungs per module"
Verification: `node --test test/closing.test.mjs`
Done when: os testes novos e os antigos do fechamento passam
Depends on: T2, T4

## T6 — task-metrics lê os outros manifests
Covers: R6 (AC-6.1, AC-6.2, AC-6.3)
Files: `scripts/task-metrics.mjs`, `test/task-metrics.test.mjs`
New structure: none
Test first: `new dependencies come from requirements.txt, pyproject.toml, go.mod, csproj and pom.xml` — um caso por formato com o nome esperado, manifest em subpasta, e o `package.json` igual a hoje
Verification: `node --test test/task-metrics.test.mjs`
Done when: os testes novos e os antigos do task-metrics passam
Depends on: —

## T7 — Especificação, template e CHANGELOG
Covers: R1, R3
Files: `docs/specification.md`, `templates/architecture.json`, `CHANGELOG.md`
New structure: none
No test: só texto; a regra já é provada por T1 e T2
Verification: `npm test`
Done when: `npm test` e `claude plugin validate .` passam
Depends on: T1, T2, T5
<!-- frozen after approval: end -->

## Progress
### T1
Status: done (a0079f2)
RED evidence: `node --test test/arch-check.test.mjs` exited with 1 at 2026-11-28T00:33:15.058Z
GREEN evidence: `node --test test/arch-check.test.mjs` exited with 0 at 2026-11-28T00:34:53.246Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (`planned: null` dá erro, com teste); F2 fixed (objeto sem `planned` testado como componente comum); F3 kept (`pending` é a lista ordenada da saída e `waiting` o Set da consulta)
### T2
Status: done (3191bad)
RED evidence: `node --test test/arch-check.test.mjs` exited with 1 at 2026-11-28T00:35:52.776Z
GREEN evidence: `node --test test/arch-check.test.mjs` exited with 0 at 2026-11-28T00:37:29.026Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (campo `orphan` removido, filtro por `rule`); F2 kept (o código 2 vem do mesmo `catch` testado em AC-1.3, como nos testes de `planned`)
### T3
Status: done (fb0b847)
RED evidence: `node --test test/post-tool-use.test.mjs` exited with 1 at 2026-11-28T00:38:16.431Z
GREEN evidence: `node --test test/post-tool-use.test.mjs` exited with 0 at 2026-11-28T00:39:00.742Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: ok (isolated reviewer)
### T4
Status: done (46403ab)
RED evidence: `node --test test/closing.test.mjs` exited with 1 at 2026-11-28T00:41:01.531Z
GREEN evidence: `node --test test/closing.test.mjs` exited with 0 at 2026-11-28T00:48:22.843Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (caso sem dispensa e sem fonte nova testado com a mensagem de hoje); F2 kept (`active` é campo aditivo do runCheck, usado só para o `noActive` que o design lista); F3 fixed (tamanho do trecho numa variável); F4 kept (rename e fonte existente provados no unitário de `createdSources`; a ordem status, antigo, novo é a do `git diff -z`)
### T5
Status: in review
RED evidence: `node --test test/closing.test.mjs` exited with 1 at 2026-11-28T00:49:43.129Z
GREEN evidence: `node --test test/closing.test.mjs` exited with 0 at 2026-11-28T00:53:24.940Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 removed (bloco repetido do teste da linha 130); F2 fixed (arquivo cortado em ` is covered by `); F3 fixed (passo 4 do closing.md e comentário citam o architecture.json); F4 kept (é a regra do design: arquivo inteiro para o que não é product.md)
### T6
Status: pending
### T7
Status: pending

## Implementation notes
- T4: o `closingRepo` de `test/story-repo.mjs` fecha histórias que criam `src/*.js` com a dispensa e sem `architecture.json`; com a R2 essa combinação é recusada, então o padrão do `closingRepo` passa a ter um `architecture.json` com componente ativo, e os testes do caso sem arquivo passam `architecture: null`. `test/story-repo.mjs` entrou no `Files:` da T4, com `scripts/check-feature.mjs` (o item de arquitetura passava a dispensa sem o `archResult`) e `test/check-feature.test.mjs` (tasks reaprovadas, aprovação do Miguel para o épico em 2026-11-28).

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
