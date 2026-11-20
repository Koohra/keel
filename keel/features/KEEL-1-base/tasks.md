# Tasks — KEEL-1

Requisitos: requirements.md · Design: não há
Aprovação: no review do PR

<!-- congelado após aprovação: início -->
## T1 — Esqueleto andante: plugin válido com teste rodando no CI
Cobre: R1 (AC-1.1), R5 (AC-5.1)
Arquivos: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `package.json`, `test/helpers.mjs`, `test/manifest.test.mjs`, `.github/workflows/ci.yml`
Teste primeiro: `test/manifest.test.mjs` — plugin `keel` com versão semver e catálogo apontando para `./`
Verificação: `npm test` e `claude plugin validate .`
Pronto quando: os dois comandos passam e o CI roda os três jobs
Depende de: —

## T2 — Modelos e workflow.json
Cobre: R3 (AC-3.1), R4 (AC-4.1)
Arquivos: `templates/*`, `workflow/workflow.json`, `test/templates.test.mjs`, `test/workflow.test.mjs`
Teste primeiro: `test/templates.test.mjs` e `test/workflow.test.mjs` — seções dos modelos, EARS, IDs, fases e portões
Verificação: `npm test`
Pronto quando: os testes de modelos e workflow passam
Depende de: T1

## T3 — product.md, ADRs e regra de bytes
Cobre: R2 (AC-2.1), R6 (AC-6.1)
Arquivos: `keel/product.md`, `keel/adrs/*`, `test/repo.test.mjs`, `.gitattributes`
Teste primeiro: `test/repo.test.mjs` — orçamento e princípios do product.md, formato das ADRs, LF e sem BOM
Verificação: `npm test`
Pronto quando: os testes de repo passam
Depende de: T1

## T4 — README, AGENTS.md e especificação no repo
Cobre: R1
Sem teste: documentação sem comportamento; o `claude plugin validate .` pediu a linha de instalação no README.
<!-- congelado após aprovação: fim -->

## Andamento
### T1
Status: green
Evidência RED: `node --test` antes dos manifestos: 11 de 13 falharam, incluindo os 2 de manifesto (ENOENT em plugin.json).
Evidência GREEN: `npm test` 16 de 16 passam; `claude plugin validate .` → "Validation passed".
Review: pendente (review do PR)
### T2
Status: green
Evidência RED: falharam com ENOENT antes dos arquivos; o teste de princípios falhou depois por erro no próprio teste (separava a seção por "\n##" num arquivo que começa com o título), corrigido para regex com âncora de linha.
Evidência GREEN: `npm test` 16 de 16 passam.
Review: pendente (review do PR)
### T3
Status: green
Evidência RED: os testes de product.md e ADRs falharam (arquivos ausentes); o de LF passou desde o início, porque nenhum arquivo tinha CR.
Evidência GREEN: `npm test` 16 de 16 passam.
Review: pendente (review do PR)
### T4
Status: feita

## Notas de implementação
- `node --test` sem padrão também executa `test/helpers.mjs`; por isso o script usa `"test/*.test.mjs"` (o Node expande o glob, funciona no Windows).
- A especificação foi copiada para `docs/especificacao.md` para que issues e ADRs citem um caminho do repo.
- Não há `state.json` nesta história: só o script de estado pode escrevê-lo, e ele nasce na parte 2.

## Convergência (preenchida no fim, conferida por script)
| Regra | Evidência | Situação |
|---|---|---|
| R1 | `claude plugin validate .` → Validation passed | atendida |
| R2 | `test/repo.test.mjs` | atendida |
| R3 | `test/templates.test.mjs` | atendida |
| R4 | `test/workflow.test.mjs` | atendida |
| R5 | CI do PR #9: test (ubuntu-latest), test (windows-latest) e plugin-validate verdes | atendida |
| R6 | `test/repo.test.mjs` (LF e BOM) | atendida |
