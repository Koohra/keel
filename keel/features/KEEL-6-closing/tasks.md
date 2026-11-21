# Tasks — KEEL-6

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: convergência no next e critério convergence:all-rules
Covers: R1 (AC-1.1), R2 (AC-2.1, AC-2.2)
Files: `scripts/closing.mjs`, `scripts/keel-state.mjs`, `test/closing.test.mjs`, `test/keel-state.test.mjs`, `test/story-repo.mjs`
New structure: `scripts/closing.mjs` (module: regras puras do fechamento e a coleta no git, para o keel-state.mjs não crescer)
Test first: `test/closing.test.mjs` — linhas met com task, teste e hash; advance recusado com tabela vazia e aceito com a tabela copiada
Verification: `node --test test/closing.test.mjs test/keel-state.test.mjs`
Done when: os testes passam e o critério deixa de dizer "checker does not exist yet"
Depends on: —

## T2 — Regra faltante na convergência
Covers: R1 (AC-1.2, AC-1.3)
Files: `scripts/closing.mjs`, `test/closing.test.mjs`
New structure: none
Test first: `test/closing.test.mjs` — AC sem task e hash que não é commit deixam a regra missing
Verification: `node --test test/closing.test.mjs`
Done when: os testes passam
Depends on: T1

## T3 — Arquitetura e baseline no fechamento
Covers: R3 (AC-3.1, AC-3.2)
Files: `scripts/closing.mjs`, `scripts/keel-state.mjs`, `test/closing.test.mjs`
New structure: none
Test first: `test/closing.test.mjs` — chave nova na baseline recusa o advance; sem architecture.json fica skipped
Verification: `node --test test/closing.test.mjs`
Done when: os testes passam
Depends on: T1

## T4 — Deltas de product.md e ADR
Covers: R4 (AC-4.1, AC-4.2, AC-4.3)
Files: `scripts/closing.mjs`, `scripts/keel-state.mjs`, `test/closing.test.mjs`
New structure: none
Test first: `test/closing.test.mjs` — delta sem aprovação, aprovação vencida pela edição e approve deltas sem delta
Verification: `node --test test/closing.test.mjs`
Done when: os testes passam
Depends on: T1

## T5 — check-feature.mjs
Covers: R5 (AC-5.1, AC-5.2, AC-5.3)
Files: `scripts/check-feature.mjs`, `test/check-feature.test.mjs`, `test/story-repo.mjs`
New structure: none
Test first: `test/check-feature.test.mjs` — história fechada passa, commit fora do Files falha e história no closing falha
Verification: `node --test test/check-feature.test.mjs`
Done when: os testes passam
Depends on: T2, T3, T4

## T6 — Descrição do PR
Covers: R6 (AC-6.1)
Files: `scripts/closing.mjs`, `scripts/check-feature.mjs`, `test/check-feature.test.mjs`
New structure: none
Test first: `test/check-feature.test.mjs` — --pr traz a regra, a linha da convergência e as seções do modelo
Verification: `node --test test/check-feature.test.mjs`
Done when: os testes passam
Depends on: T5

## T7 — Fase closing na skill e especificação
Covers: R7 (AC-7.1)
Files: `skills/story/phases/closing.md`, `skills/story/SKILL.md`, `test/story-skill.test.mjs`, `docs/specification.md`
New structure: none
Test first: `test/story-skill.test.mjs` — closing tem instruções e os comandos citados existem
Verification: `node --test test/story-skill.test.mjs`
Done when: os testes passam e `claude plugin validate .` aceita a skill
Depends on: T6

## T8 — Caso de eval da regra faltante no fechamento
Covers: R8 (AC-8.1)
Files: `evals/phases/closing-missing-rule/**`, `evals/phases/prepare.sh`, `evals/phases/data/**`, `test/evals.test.mjs`
New structure: none
Test first: `test/evals.test.mjs` — há caso da etapa 10 com scaffold
Verification: `claude plugin eval . --runs 1 --ablation none --trust-plugin --scaffold --allow-tools Bash Write Edit --case closing-missing-rule`
Done when: o caso passa numa rodada, com custo nas notas
Depends on: T7

## T9 — Primeira história de ponta a ponta na fixture
Covers: R9 (AC-9.1)
Files: `keel/features/KEEL-6-closing/tasks.md`
New structure: none
Test first: `check-feature.mjs` — a história conduzida numa sessão nova fecha com todos os itens ok
Verification: `node scripts/check-feature.mjs <workspace>/keel/features/<KEY>-<slug>`
Done when: `check-feature.mjs` sai com 0 na história conduzida
Depends on: T7

## T10 — Correções do review isolado
Covers: R1 (AC-1.3), R4 (AC-4.2), R5 (AC-5.1)
Files: `scripts/git.mjs`, `scripts/closing.mjs`, `scripts/check-feature.mjs`, `scripts/keel-state.mjs`, `scripts/task-loop.mjs`, `test/closing.test.mjs`, `test/check-feature.test.mjs`
New structure: `scripts/git.mjs` (module: leituras do git usadas por três bordas, terceira ocorrência)
Test first: `review fixes` — commit fora do histórico, base não achada, ADR com nome não ASCII, check-feature de outra pasta e dois hashes do mesmo commit
Verification: `node --test test/closing.test.mjs test/check-feature.test.mjs`
Done when: os testes passam
Depends on: T6

## T11 — Files: com caminhos entre crases
Covers: R9 (AC-9.1)
Files: `scripts/validate-feature.mjs`, `templates/tasks.md`, `docs/specification.md`, `test/validate-feature.test.mjs`
New structure: none
Test first: `Files: lists paths in backticks` — task com Files: sem crase é recusada e o modelo mostra a crase
Verification: `node --test test/validate-feature.test.mjs`
Done when: os testes passam
Depends on: —
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test test/closing.test.mjs test/keel-state.test.mjs` falhou primeiro com ERR_MODULE_NOT_FOUND (módulo novo); com `scripts/closing.mjs` vazio, 2 de 2 falharam (asserção das linhas e `next.closing` ausente).
GREEN evidence: `node --test test/closing.test.mjs` 2 de 2; `npm test` 139 de 139 depois de trocar o teste "closing refuses without a checker" pelo critério `convergence:all-rules`.
Review: ver T9.
### T2
Status: green
RED evidence: `node --test test/closing.test.mjs` 2 de 4 falharam (AC sem task, hash que não é commit, nível trivial).
GREEN evidence: `node --test test/closing.test.mjs` 4 de 4.
Review: ver T9.
### T3
Status: green
RED evidence: `node --test test/closing.test.mjs` 2 de 6 falharam (`closing.arch` ausente).
GREEN evidence: `node --test test/closing.test.mjs` 6 de 6; `npm test` 145 de 145.
Review: ver T9.
### T4
Status: green
RED evidence: `node --test test/closing.test.mjs` 2 de 8 falharam (`closing.deltas` ausente, `approve deltas` desconhecido).
GREEN evidence: `node --test test/closing.test.mjs` 8 de 8; `npm test` 145 de 145.
Review: ver T9.
### T5
Status: green
RED evidence: `node --test test/check-feature.test.mjs` 3 de 3 falharam com o script vazio (saída sem os itens).
GREEN evidence: `node --test test/check-feature.test.mjs` 3 de 3.
Review: ver T9.
### T6
Status: green
RED evidence: `node --test test/check-feature.test.mjs` 1 de 4 falhou (`--pr` sem descrição).
GREEN evidence: `npm test` 149 de 149.
Review: ver T9.
### T7
Status: green
RED evidence: `node --test test/story-skill.test.mjs` 2 de 7 falharam (falta `phases/closing.md`).
GREEN evidence: `node --test test/story-skill.test.mjs` 7 de 7; `npm test` 150 de 150; `claude plugin validate .` passa com os avisos que já existiam.
Review: ver T9.
### T8
Status: green
RED evidence: o teste de `test/evals.test.mjs` foi escrito depois do caso (desvio do TDD, registrado, como na parte 5).
GREEN evidence: `npm test` 151 de 151. Rodada de 2026-11-21, Claude Code 2.1.330, modelo padrão do eval, uma run, `--ablation none`: closing-missing-rule 4 de 4 (US$ 0,10, 11 turnos).
Review: ver T9.
### T9
Status: green
RED evidence: a primeira rodada (2026-11-21, Claude Code 2.1.330) parou no orçamento em US$ 8,85, de volta à fase tasks depois do RED e GREEN da T1: `check-feature.mjs` saiu com 1 (state em tasks, tasks sem commit). Achou a falha do `Files:` sem crase (T11).
GREEN evidence: retomada em sessões novas (uma por task e uma para o fechamento), mais US$ 6,51: `node scripts/check-feature.mjs keel/features/APP-20-listar-inscritos` saiu com 0, com documents, state, commits (2), scope, checks, convergence (4 regras) e deltas (product.md aprovado) ok e architecture skipped. Custo total do ponta a ponta: cerca de US$ 15,36.
Review: a história foi conduzida por mim no papel da dev Ana, com `claude -p --resume`. Achados para depois: a convergência cita só o `Test first:` de cada task, mesmo quando a regra é provada por um teste de regressão; regra já atendida por uma task anterior não tem caminho (o RED é obrigatório e `No test:` quebra a cobertura); `approve commit && git commit` num comando só é barrado pelo hook (a fase de implementação agora diz para rodar separado).
### T10
Status: green
RED evidence: `node --test test/closing.test.mjs test/check-feature.test.mjs` 4 de 16 falharam (hash reescrito aceito, ADR não ASCII com hash `<deleted>`, check-feature lendo o repositório da cwd, hashes abreviados diferentes do mesmo commit).
GREEN evidence: `npm test` 155 de 155.
Review: os 5 achados do revisor isolado (subagente, só leitura): 2 BLOQUEIA (base e convergência com hashes fora do histórico; raiz do check-feature pela cwd), 1 SUGERIR de nome com aspas do git, 1 REMOVER de três helpers git e 1 SUGERIR de hashes abreviados e merge commit. Todos corrigidos.
### T11
Status: green
RED evidence: `node --test test/validate-feature.test.mjs` 1 de 24 falhou (Files: sem crase aceito).
GREEN evidence: `npm test` 156 de 156.
Review: achado da primeira rodada de ponta a ponta: o modelo de tasks tinha `Files: <paths>` sem crase, o validador aceitava e o loop não lia os caminhos, então todo arquivo da T1 saiu fora da task.

## Implementation notes
- not applicable

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
