# Tasks — KEEL-4

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: campos obrigatórios das tasks
Covers: R1 (AC-1.1), R2 (AC-2.1)
Files: `scripts/validate-feature.mjs`, `test/validate-feature.test.mjs`, `test/fixtures.mjs`, `templates/tasks.md`, `test/templates.test.mjs`, `keel/features/*/tasks.md`
New structure: none
Test first: `test/validate-feature.test.mjs` — task sem Files, Done when, Depends on ou New structure; Test first sem "—"; T1 que não é esqueleto
Verification: `node --test test/validate-feature.test.mjs test/templates.test.mjs`
Done when: os testes passam e as histórias do Keel continuam válidas
Depends on: —

## T2 — Cobertura de AC e critério no nível trivial
Covers: R3 (AC-3.1, AC-3.2)
Files: `scripts/validate-feature.mjs`, `test/validate-feature.test.mjs`
New structure: none
Test first: `test/validate-feature.test.mjs` — AC inexistente citado; Covers sem GIVEN/WHEN/THEN sem requirements.md
Verification: `node --test test/validate-feature.test.mjs`
Done when: os testes passam
Depends on: T1

## T3 — Validação do design.md
Covers: R4 (AC-4.1, AC-4.2, AC-4.3, AC-4.4)
Files: `scripts/validate-feature.mjs`, `test/validate-feature.test.mjs`, `test/fixtures.mjs`, `templates/design.md`
New structure: none
Test first: `test/validate-feature.test.mjs` — gatilho desconhecido, linha de estrutura sem heurística, ADR sem Yes/No, regra inexistente na abordagem
Verification: `node --test test/validate-feature.test.mjs`
Done when: os testes passam
Depends on: T1

## T4 — Estrutura cruzada design ↔ tasks e uso no keel-state
Covers: R5 (AC-5.1, AC-5.2), R6 (AC-6.1)
Files: `scripts/validate-feature.mjs`, `scripts/keel-state.mjs`, `test/validate-feature.test.mjs`, `test/keel-state.test.mjs`
New structure: none
Test first: `test/validate-feature.test.mjs` e `test/keel-state.test.mjs` — elemento do design sem task, estrutura da task fora do design, approve recusado com regra inexistente
Verification: `node --test test/validate-feature.test.mjs test/keel-state.test.mjs`
Done when: os testes passam
Depends on: T2, T3

## T5 — Fases design e tasks na skill
Covers: R7 (AC-7.1)
Files: `skills/story/SKILL.md`, `skills/story/phases/design.md`, `skills/story/phases/tasks.md`, `test/story-skill.test.mjs`
New structure: none
Test first: `test/story-skill.test.mjs` — design e tasks têm instruções; comandos e scripts citados existem
Verification: `node --test test/story-skill.test.mjs`
Done when: os testes passam e `claude plugin validate .` aceita a skill
Depends on: T4

## T6 — Casos de eval das etapas 5 e 6
Covers: R8 (AC-8.1, AC-8.2, AC-8.3)
Files: `evals/phases/**`, `test/evals.test.mjs`
New structure: none
Test first: `test/evals.test.mjs` — casos das etapas 5 e 6 existem, com grader e scaffold
Verification: `claude plugin eval . --runs 1 --ablation none --trust-plugin --scaffold --allow-tools Bash Write Edit --case "design-*" --case "tasks-*"`
Done when: os três casos passam numa rodada, com custo registrado nas notas
Depends on: T5
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test test/validate-feature.test.mjs` 2 de 14 falharam (campos obrigatórios e T1 esqueleto) antes da mudança no validador.
GREEN evidence: `node --test test/validate-feature.test.mjs test/templates.test.mjs` passam; as histórias KEEL-1, 2, 3 e 7 ganharam `New structure:` (e os campos que faltavam nas tasks sem teste) e continuam válidas.
Review: ver T6.
### T2
Status: green
RED evidence: `node --test test/validate-feature.test.mjs` 2 de 16 falharam (AC inexistente, Covers sem GIVEN/WHEN/THEN no trivial).
GREEN evidence: `npm test` 103 de 103; o teste do nível trivial do keel-state passou a usar critério em todo `Covers:`.
Review: ver T6.
### T3
Status: green
RED evidence: `node --test test/validate-feature.test.mjs` 4 de 20 falharam (gatilho, tabela de estrutura, ADR, regras citadas).
GREEN evidence: `npm test` 107 de 107.
Review: ver T6.
### T4
Status: green
RED evidence: `node --test test/validate-feature.test.mjs test/keel-state.test.mjs` falhou com SyntaxError (faltava o export `checkStructure`) e o teste de AC-6.1 falhou.
GREEN evidence: `npm test` 110 de 110.
Review: ver T6.
### T5
Status: green
RED evidence: `node --test test/story-skill.test.mjs` falhou com "design: falta phases/design.md".
GREEN evidence: `node --test test/story-skill.test.mjs` 4 de 4; `claude plugin validate .` passa com os avisos que já existiam.
Review: ver T6.
### T6
Status: green
RED evidence: `node --test test/evals.test.mjs` 1 de 3 falhou antes dos casos existirem.
GREEN evidence: `node --test test/evals.test.mjs` 3 de 3. Rodada de 2026-11-20, Claude Code 2.1.329, modelo padrão do eval, uma run por caso, `--ablation none`: design-adr, tasks-plan e tasks-approval 3 de 3 (US$ 0,36).
Review: revisor isolado (subagente, só leitura) achou: progresso sem evidência (preenchido aqui); "nenhuma", "—" e "not applicable" não eram aceitos como vazio; o texto do modelo `New structure: ..., from the design.md table` virava elemento; AC-8.1 e AC-8.3 citavam APP-9 em vez de APP-10; AC de outra regra passava, plano sem T1 passava e o tipo `DTO` sozinho era recusado. Todos corrigidos com teste novo que falhou antes (`review fixes` em test/validate-feature.test.mjs). `npm test` 112 de 112.

## Implementation notes
- O `validateDoc` junta a checagem de um documento com o cruzamento com os outros (regras, AC, estrutura); o keel-state usa ele nos critérios `valid:` e no `approve`. A cobertura regra → task → teste continua num critério próprio.
- Com design.md, a tabela "New structure and rationale" e os `New structure:` das tasks precisam bater, pelo nome do elemento (sem crases e sem o tipo entre parênteses). Sem design.md a task só declara.
- `--case` repetido no `claude plugin eval` roda só o último padrão: rode um padrão por vez (ou um glob que pegue todos).
- Comando da rodada: `TMPDIR=$HOME/evaltmp claude plugin eval . --runs 1 --ablation none --trust-plugin --scaffold --allow-tools Bash Write Edit --case <caso>`.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
