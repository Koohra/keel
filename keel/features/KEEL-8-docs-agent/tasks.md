# Tasks — KEEL-8

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: plugin keel-docs no marketplace
Covers: R1 (AC-1.1, AC-1.2)
Files: `plugins/keel-docs/.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `test/docs-plugin.test.mjs`
New structure: `plugins/keel-docs/` (module)
Test first: `test/docs-plugin.test.mjs` — entrada `keel-docs` no marketplace, plugin.json com nome e versão, nenhum caminho que sai da pasta do plugin
Verification: `node --test test/docs-plugin.test.mjs`
Done when: o teste passa e `claude plugin validate plugins/keel-docs` passa
Depends on: —

## T2 — Modelos dos quatro documentos
Covers: R2 (AC-2.1, AC-2.2)
Files: `plugins/keel-docs/templates/product.md`, `plugins/keel-docs/templates/adr.md`, `plugins/keel-docs/templates/requirements.md`, `plugins/keel-docs/templates/design.md`, `test/docs-plugin.test.mjs`
New structure: none
Test first: `test/docs-plugin.test.mjs` — cópias idênticas às do Keel; títulos do modelo de ADR e de product.md
Verification: `node --test test/docs-plugin.test.mjs`
Done when: o teste passa
Depends on: T1

## T3 — doc-check.mjs
Covers: R3 (AC-3.1, AC-3.2, AC-3.3, AC-3.4)
Files: `plugins/keel-docs/scripts/doc-check.mjs`, `test/doc-check.test.mjs`
New structure: `plugins/keel-docs/scripts/doc-check.mjs` (module)
Test first: `test/doc-check.test.mjs` — regra sem fonte, product.md longo, ADR sem Confirmation e com nome errado, seção vazia, histórias KEEL-* limpas e hash intacto, concordância com o validate-feature
Verification: `node --test test/doc-check.test.mjs`
Done when: o teste passa
Depends on: T2

## T4 — Skill write com um guia por documento
Covers: R4, R5
Files: `plugins/keel-docs/skills/write/SKILL.md`, `plugins/keel-docs/skills/write/guides/product.md`, `plugins/keel-docs/skills/write/guides/adr.md`, `plugins/keel-docs/skills/write/guides/requirements.md`, `plugins/keel-docs/skills/write/guides/design.md`, `test/docs-plugin.test.mjs`
New structure: none
No test: instruções em markdown; `test/docs-plugin.test.mjs` só confere frontmatter, guias citados que existem, o comando do doc-check e as proibições combinadas.
Done when: `node --test test/docs-plugin.test.mjs` passa
Depends on: T3

## T5 — Evals do keel-docs
Covers: R4 (AC-4.1), R5 (AC-5.1), R6 (AC-6.1)
Files: `plugins/keel-docs/evals/`, `test/docs-plugin.test.mjs`
New structure: none
Test first: `test/docs-plugin.test.mjs` — casos de acionamento (que acionam e que não acionam), caso de redação e caso de recusa, cada um com grader
Verification: `claude plugin eval plugins/keel-docs --runs 1 --ablation none --trust-plugin --scaffold --allow-tools Bash Write Edit`
Done when: todos os casos passam numa rodada
Depends on: T4

## T6 — Especificação, README e história real
Covers: R1, R4
Files: `docs/specification.md`, `README.md`, `keel/product.md`
New structure: none
No test: documentação; a história real escrita com o plugin numa sessão nova vai na descrição do PR (ADR-003).
Done when: a história real passa no `doc-check.mjs` e no `validate-feature.mjs`
Depends on: T5
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test test/docs-plugin.test.mjs` falhou 2 de 4: `keel-docs missing from the marketplace` e plugin.json ausente.
GREEN evidence: `node --test test/docs-plugin.test.mjs` 4 de 4; `claude plugin validate .` e `claude plugin validate plugins/keel-docs` passam (o aviso do CLAUDE.md na raiz já existia).
Review: revisor isolado (subagente, só leitura), 8 achados, todos corrigidos com teste que falhou antes (T3) ou grader novo (T5); ver T3 e T5.
### T2
Status: green
RED evidence: `node --test test/docs-plugin.test.mjs` falhou os 3 testes novos (modelos ausentes).
GREEN evidence: `node --test test/docs-plugin.test.mjs` 7 de 7.
Review: revisor isolado, sem achado próprio desta task.
### T3
Status: green
RED evidence: `node --test test/doc-check.test.mjs`: ERR_MODULE_NOT_FOUND para `plugins/keel-docs/scripts/doc-check.mjs`.
GREEN evidence: `node --test test/doc-check.test.mjs` 12 de 12; as ADRs e os requirements.md do repo passam no `doc-check.mjs`.
Review: revisor isolado: product.md do Keel reprovado (títulos em português), texto do modelo copiado passava, faltavam linha malformada, ID repetido e AC sob outra regra, CLI parava no primeiro arquivo desconhecido, `adrs/README.md` virava ADR, comentário de várias linhas contava como conteúdo. 5 testes novos falharam antes; corrigido, e os títulos do `keel/product.md` passaram para o inglês (Vision, What it does, What it does not do, Glossary, Decisions). R3 e AC-3.4 ajustados (orçamento do requirements.md e do design.md é aviso). `node --test test/doc-check.test.mjs` 17 de 17.
### T4
Status: green
RED evidence: `node --test test/docs-plugin.test.mjs` falhou os 3 testes da skill (SKILL.md ausente).
GREEN evidence: `node --test test/docs-plugin.test.mjs` 10 de 10.
Review: revisor isolado, sem achado próprio desta task.
### T5
Status: green
RED evidence: rodada 1 (`claude plugin eval plugins/keel-docs --runs 1 --ablation none --trust-plugin --scaffold --allow-tools Bash Write Edit`): acionamento 6 de 6; `refuse-approve` 0 (o pedido não acionava a skill, então o Claude aprovou e implementou fora dela) e `requirements-question` 0,75 (pergunta do CSV vazio não casou). O teste do `test/docs-plugin.test.mjs` foi escrito depois dos casos, não antes.
GREEN evidence: prompt do `refuse-approve` passou a pedir a revisão com o keel-docs; rodada 2 com `--case "re*"`: os dois casos 1,00. Custo total das rodadas: cerca de US$ 0,73.
Review: revisor isolado: AC-4.1 e AC-5.1 sem grader para state.json, escrita fora de `keel/` e doc-check. Graders `tool_used` novos (no-state-*, only-keel-*, ran-doc-check); rodada 3 com `--case "re*"`: os dois casos 1,00 (US$ 0,23).
### T6
Status: green
RED evidence: não se aplica (documentação).
GREEN evidence: história real KEEL-9 (migração de documentação antiga, etapa 0) escrita com o plugin numa sessão nova (`claude -p --plugin-dir plugins/keel-docs`, US$ 0,60, 17 turnos) numa cópia do repo: 3 regras em EARS com fonte, 5 `[QUESTION]` com recomendação, `Status: draft`, nenhum outro arquivo mudou; `doc-check.mjs` e `validate-feature.mjs` dizem ok. O texto vai na descrição do PR (ADR-003).
Review: revisor isolado, sem achado próprio desta task.

## Implementation notes
- not applicable

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
