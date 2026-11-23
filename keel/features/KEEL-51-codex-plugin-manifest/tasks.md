# Tasks — KEEL-51

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: manifestos portáteis e marketplace do Codex com versão única
Covers: R1 (AC-1.1), R2 (AC-2.1), R3 (AC-3.1), R4 (AC-4.1)
Files: `plugin.json`, `plugins/keel-docs/plugin.json`, `.agents/plugins/marketplace.json`, `.claude-plugin/marketplace.json`, `test/manifest.test.mjs`, `CHANGELOG.md`
New structure: `plugin.json` na raiz de cada plugin e `.agents/plugins/marketplace.json`
Test first: `codex: manifesto portátil na raiz de keel e de keel-docs` — nomes e `$schema`; no mesmo arquivo, o marketplace do Codex, a versão única e as descrições
Verification: `node --test test/manifest.test.mjs`
Done when: os testes passam e `claude plugin validate .` e `claude plugin validate plugins/keel-docs` passam
Depends on: —

## T2 — Verificação manual no Codex CLI
Covers: R5 (AC-5.1)
Files: `.agents/plugins/marketplace.json`
New structure: none
Test first: `manual: codex plugin marketplace add` — lista e instala `keel` e `keel-docs` e mostra as skills `setup`, `story` e `write`
Verification: `codex plugin marketplace add Koohra/keel --ref feat/codex-plugin-manifest`, instalar `keel` e `keel-docs`, conferir as skills `setup`, `story` e `write`
Done when: o dev confirma o resultado no Codex
Depends on: T1
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test test/manifest.test.mjs` 4 de 6 falharam (sem `plugin.json` na raiz, sem `.agents/plugins/marketplace.json`, versão não comparável, descrição "for Claude Code").
GREEN evidence: `node --test test/manifest.test.mjs` 6 de 6; `npm test` 220 de 220; `claude plugin validate .` passou com o aviso que já existia na main (CLAUDE.md na raiz); `claude plugin validate plugins/keel-docs` passou.
Review: no PR (sem revisor isolado nesta sessão)

### T2
Status: pending
RED evidence: not applicable
GREEN evidence: não rodou (Codex CLI indisponível nesta sessão)
Review: pending

## Implementation notes
- O Codex vai descobrir `hooks/hooks.json` do `keel` ao instalar; até o #52, os hooks podem falhar no Codex.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
