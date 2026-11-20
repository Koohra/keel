# Tasks — KEEL-1

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: plugin válido com teste rodando no CI
Covers: R1 (AC-1.1), R5 (AC-5.1)
Files: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json`, `test/helpers.mjs`, `test/manifest.test.mjs`, `.github/workflows/ci.yml`
New structure: `test/helpers.mjs` (helper)
Test first: `test/manifest.test.mjs` — plugin `keel` com versão semver e catálogo apontando para `./`
Verification: `npm test` e `claude plugin validate .`
Done when: os dois comandos passam e o CI roda os três jobs
Depends on: —

## T2 — Modelos e workflow.json
Covers: R3 (AC-3.1), R4 (AC-4.1)
Files: `templates/*`, `workflow/workflow.json`, `test/templates.test.mjs`, `test/workflow.test.mjs`
New structure: none
Test first: `test/templates.test.mjs` e `test/workflow.test.mjs` — seções dos modelos, EARS, IDs, fases e portões
Verification: `npm test`
Done when: os testes de modelos e workflow passam
Depends on: T1

## T3 — product.md, ADRs e regra de bytes
Covers: R2 (AC-2.1), R6 (AC-6.1)
Files: `keel/product.md`, `keel/adrs/*`, `test/repo.test.mjs`, `.gitattributes`
New structure: none
Test first: `test/repo.test.mjs` — orçamento e princípios do product.md, formato das ADRs, LF e sem BOM
Verification: `npm test`
Done when: os testes de repo passam
Depends on: T1

## T4 — README, AGENTS.md e especificação no repo
Covers: R1
Files: `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/specification.md`
New structure: none
No test: documentação sem comportamento; o `claude plugin validate .` pediu a linha de instalação no README.
Done when: `claude plugin validate .` passa sem pedir a linha de instalação
Depends on: T1
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test` antes dos manifestos: 11 de 13 falharam, incluindo os 2 de manifesto (ENOENT em plugin.json).
GREEN evidence: `npm test` 16 de 16 passam; `claude plugin validate .` → "Validation passed".
Review: pending (PR review)
### T2
Status: green
RED evidence: falharam com ENOENT antes dos arquivos; o teste de princípios falhou depois por erro no próprio teste (separava a seção por "\n##" num arquivo que começa com o título), corrigido para regex com âncora de linha.
GREEN evidence: `npm test` 16 de 16 passam.
Review: pending (PR review)
### T3
Status: green
RED evidence: os testes de product.md e ADRs falharam (arquivos ausentes); o de LF passou desde o início, porque nenhum arquivo tinha CR.
GREEN evidence: `npm test` 16 de 16 passam.
Review: pending (PR review)
### T4
Status: done

## Implementation notes
- `node --test` sem padrão também executa `test/helpers.mjs`; por isso o script usa `"test/*.test.mjs"` (o Node expande o glob, funciona no Windows).
- A especificação foi copiada para `docs/specification.md` para que issues e ADRs citem um caminho do repo.
- Não há `state.json` nesta história: só o script de estado pode escrevê-lo, e ele nasce na parte 2.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
| R1 | `claude plugin validate .` → Validation passed | met |
| R2 | `test/repo.test.mjs` | met |
| R3 | `test/templates.test.mjs` | met |
| R4 | `test/workflow.test.mjs` | met |
| R5 | CI do PR #9: test (ubuntu-latest), test (windows-latest) e plugin-validate verdes | met |
| R6 | `test/repo.test.mjs` (LF e BOM) | met |
