# Tasks — KEEL-72

Requirements: none · Design: none
Approved by Miguel on 2026-11-28

<!-- frozen after approval: start -->
## T1 — Walking skeleton: changelog completo e versão 2.0.0-beta.2
Covers: GIVEN as pastas de `keel/features/` e a versão dos manifestos WHEN o teste lê o `CHANGELOG.md` THEN toda chave `KEEL-N` aparece numa entrada, a versão tem seção com data, o link dela compara com a versão anterior e `[Unreleased]` compara a partir de `v<versão>`
Files: `CHANGELOG.md`, `test/changelog.test.mjs`, `test/validate-feature.test.mjs`, `.claude-plugin/plugin.json`, `plugin.json`, `plugins/keel-docs/.claude-plugin/plugin.json`, `plugins/keel-docs/plugin.json`, `keel/features/KEEL-72-versions-changelog-releases/tasks.md`
New structure: none
Test first: `changelog: every story in keel/features has an entry` — cada `KEEL-N` de `keel/features/` está no changelog; `changelog: the manifest version closes Unreleased with compare links` — seção da versão, link `compare/v<anterior>...v<versão>` e `[Unreleased]` a partir de `v<versão>`
Verification: `npm test`; `claude plugin validate .`; `claude plugin validate plugins/keel-docs`
Done when: os testes passam e os quatro manifestos dizem `2.0.0-beta.2`
Depends on: —
<!-- frozen after approval: end -->

## Progress
### T1
Status: done (9c9db31)
RED evidence: `npm test` exited with 1 at 2026-11-28T11:16:16.494Z
GREEN evidence: `npm test` exited with 0 at 2026-11-28T15:28:51.401Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 kept (tags e releases saem nesta versão, issue #72); F2 fixed (triagem propõe `with-design`, não marca sozinha); F3 kept (seções antigas mantêm a numeração delas); F4 fixed (pula requirements só com `Requirements: none`); F5 fixed (tasks reaprovadas depois da mudança do `Files:`)

## Implementation notes
- Primeira história `trivial` do repo: o teste "Keel's own stories pass the validator" exigia `requirements.md` em toda pasta; o `Files:` ganhou `test/validate-feature.test.mjs`, reaprovado por Miguel em 2026-11-28.

## Story review
Review: (filled in the closing)

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
