# Tasks — KEEL-55

Requirements: requirements.md · Design: none
Approved by Miguel on 2026-11-27

<!-- frozen after approval: start -->
## T1 — Walking skeleton: o CI instala o Keel no Codex e confere as skills
Covers: R1 (AC-1.1, AC-1.2, AC-1.3)
Files: `evals/codex/run.mjs`, `test/codex-e2e.test.mjs`, `.github/workflows/ci.yml`
New structure: `evals/codex/run.mjs` (module)
Test first: `codex install check names the missing skills` — com o texto de prompt com as três skills sai ok, sem uma delas diz qual falta; e o `ci.yml` tem o job do Codex no Ubuntu e no Windows com versão fixa
Verification: `node --test test/codex-e2e.test.mjs`
Done when: os testes novos passam e `node evals/codex/run.mjs install` passa com o Codex CLI 0.172.0
Depends on: —

## T2 — Ponta a ponta com codex exec: triagem, bloqueio fora da fase e commit sem aprovação
Covers: R2 (AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5)
Files: `evals/codex/run.mjs`, `test/codex-e2e.test.mjs`
New structure: none
Test first: `codex e2e grades each case by the workspace end state` — para cada caso, uma pasta e um log de sessão no estado esperado passam, e falham com o motivo: estado errado, nenhuma tentativa da ação, `codex exec` com erro ou sem `turn.completed`, e tempo esgotado; o preparo das fases de requisitos e de commit usa o `keel-state.mjs`; e o comando do `codex exec` usa `CODEX_HOME` temporário, `--dangerously-bypass-hook-trust` e `--json`
Verification: `node --test test/codex-e2e.test.mjs`
Done when: os testes novos passam; a rodada de verdade (`node evals/codex/run.mjs e2e`) fica para a máquina com o Codex logado
Depends on: T1

## T3 — Release, README, product.md, CHANGELOG e versão
Covers: R3 (AC-3.1), R4 (AC-4.1, AC-4.2), R5 (AC-5.1)
Files: `docs/release.md`, `README.md`, `keel/product.md`, `docs/specification.md`, `CHANGELOG.md`, `.claude-plugin/plugin.json`, `plugin.json`, `plugins/keel-docs/.claude-plugin/plugin.json`, `plugins/keel-docs/plugin.json`, `test/codex-e2e.test.mjs`
New structure: none
Test first: `docs treat Codex as supported and the version ships in the changelog` — release.md com o passo do Codex autocontido e o passo 6 com os quatro manifestos, README e product.md sem as frases antigas, visão com o Codex, README com instalação, `/hooks` e as quatro diferenças mínimas, specification.md com a linha nova dos hosts, e a versão dos manifestos como seção datada do CHANGELOG
Verification: `npm test` e `claude plugin validate .`
Done when: `npm test` passa e `claude plugin validate .` passa
Depends on: T2
<!-- frozen after approval: end -->

## Progress
### T1
Status: done (ffdb134)
RED evidence: `node --test test/codex-e2e.test.mjs` exited with 1 at 2026-11-27T16:59:52.374Z
GREEN evidence: `node --test test/codex-e2e.test.mjs` exited with 0 at 2026-11-27T17:02:32.223Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (caminho do repo sem barra no fim, que quebraria as aspas no Windows); F2 fixed (parâmetro `input` sem uso removido); F3 fixed (`git init` conferido); F4 fixed (exports sem uso removidos); F5 fixed in part (assert antes do slice; o slice até o fim do arquivo fica, o job codex é o último)
### T2
Status: done (e030d49)
RED evidence: `node --test test/codex-e2e.test.mjs` exited with 1 at 2026-11-27T17:19:39.377Z
GREEN evidence: `node --test test/codex-e2e.test.mjs` exited with 0 at 2026-11-27T17:37:03.840Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (timeout não vira "Codex não instalado": o caso falha por tempo, conferido numa rodada com chave falsa); F2 fixed (AC-2.2/2.3 leem o log da sessão, mudança aprovada por Miguel em 2026-11-27); F3 fixed (`head()` sem uso removida); F4 kept (o `CODEX_HOME` temporário é montado em `e2e()`, que precisa do Codex logado; o teste fica na parte pura); F5 kept (timeout no Windows anotado em Implementation notes)
### T3
Status: done (7f69043)
RED evidence: `npm test` exited with 1 at 2026-11-27T17:38:15.900Z
GREEN evidence: `npm test` exited with 0 at 2026-11-27T17:42:09.862Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (teste confere `3/3 cases passed` e a versão do Codex igual à do ci.yml); F2 fixed (assert fixo da versão antiga removido); F3 fixed (README: "por padrão, não lê o `CLAUDE.md`")

## Implementation notes
- Fora do escopo: `skills/setup/SKILL.md:54` diz que o Codex nunca lê o `CLAUDE.md`; é só por padrão (`project_doc_fallback_filenames`).
- No Windows, o `codex` do npm roda por um `.cmd` via shell; o timeout de 10 minutos mata o `cmd.exe` e talvez não o `codex` filho (não conferido). Se a rodada no Windows travar, rodar no Linux ou no macOS.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
| R1 | T1 `codex install check names the missing skills` (ffdb134) | met |
| R2 | T2 `codex e2e grades each case by the workspace end state` (e030d49) | met |
| R3 | T3 `docs treat Codex as supported and the version ships in the changelog` (7f69043) | met |
| R4 | T3 `docs treat Codex as supported and the version ships in the changelog` (7f69043) | met |
| R5 | T3 `docs treat Codex as supported and the version ships in the changelog` (7f69043) | met |
