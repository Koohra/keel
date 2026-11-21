# Tasks — KEEL-5

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: abrir a task, gravar RED e GREEN e ver no next
Covers: R2 (AC-2.1), R6 (AC-6.1)
Files: `scripts/task-loop.mjs`, `scripts/keel-state.mjs`, `test/task-loop.test.mjs`, `test/keel-state.test.mjs`, `docs/specification.md`
New structure: `scripts/task-loop.mjs` (module: regras puras do loop da task, para o keel-state.mjs não passar de ~600 linhas)
Test first: `test/task-loop.test.mjs` — task start, evidence red com saída diferente de 0, evidence green com 0 e next com a task e o que falta
Verification: `node --test test/task-loop.test.mjs test/keel-state.test.mjs`
Done when: os testes passam e o state.json de exemplo da especificação tem os campos novos
Depends on: —

## T2 — Regras do task start
Covers: R1 (AC-1.1, AC-1.2, AC-1.3)
Files: `scripts/task-loop.mjs`, `scripts/keel-state.mjs`, `test/task-loop.test.mjs`
New structure: none
Test first: `test/task-loop.test.mjs` — dependência pendente, task aberta e hash que não é commit
Verification: `node --test test/task-loop.test.mjs`
Done when: os testes passam
Depends on: T1

## T3 — Recusas do RED e do GREEN
Covers: R2 (AC-2.2, AC-2.3, AC-2.4)
Files: `scripts/task-loop.mjs`, `test/task-loop.test.mjs`
New structure: none
Test first: `test/task-loop.test.mjs` — RED que passa, RED por módulo ausente, GREEN sem RED e task com No test
Verification: `node --test test/task-loop.test.mjs`
Done when: os testes passam
Depends on: T1

## T4 — Checagens do product.md e impressão digital do código
Covers: R3 (AC-3.1, AC-3.2, AC-3.3)
Files: `scripts/task-loop.mjs`, `scripts/keel-state.mjs`, `test/task-loop.test.mjs`
New structure: none
Test first: `test/task-loop.test.mjs` — duas checagens com uma falhando, código mudado depois e product.md sem comando
Verification: `node --test test/task-loop.test.mjs`
Done when: os testes passam
Depends on: T1

## T5 — Review da task, aprovação do commit e git commit no PreToolUse
Covers: R4 (AC-4.1), R5 (AC-5.1, AC-5.2, AC-5.3, AC-5.4)
Files: `scripts/task-loop.mjs`, `scripts/keel-state.mjs`, `scripts/hooks/pre-tool-use.mjs`, `test/task-loop.test.mjs`, `test/pre-tool-use.test.mjs`
New structure: none
Test first: `test/task-loop.test.mjs` e `test/pre-tool-use.test.mjs` — approve commit sem review, git commit sem aprovação, com código mudado e com aprovação válida
Verification: `node --test test/task-loop.test.mjs test/pre-tool-use.test.mjs`
Done when: os testes passam
Depends on: T4

## T6 — Hook Stop e bloqueio
Covers: R7 (AC-7.1, AC-7.2, AC-7.3, AC-7.4)
Files: `scripts/hooks/stop.mjs`, `hooks/hooks.json`, `scripts/task-loop.mjs`, `scripts/keel-state.mjs`, `test/stop.test.mjs`
New structure: none
Test first: `test/stop.test.mjs` — sem RED, bloqueada, checagens vencidas que falham e stop_hook_active
Verification: `node --test test/stop.test.mjs`
Done when: os testes passam
Depends on: T5

## T7 — Métricas da task
Covers: R8 (AC-8.1)
Files: `scripts/task-metrics.mjs`, `test/task-metrics.test.mjs`
New structure: none
Test first: `test/task-metrics.test.mjs` — arquivo novo fora da task, tipo abstrato e dependência nova
Verification: `node --test test/task-metrics.test.mjs`
Done when: os testes passam
Depends on: T1

## T8 — Aviso de arquivo fora da task
Covers: R9 (AC-9.1)
Files: `scripts/hooks/post-tool-use.mjs`, `test/post-tool-use.test.mjs`
New structure: none
Test first: `test/post-tool-use.test.mjs` — edição fora do Files da task aberta vira aviso sem bloqueio
Verification: `node --test test/post-tool-use.test.mjs`
Done when: os testes passam
Depends on: T1

## T9 — Fase de implementação na skill e revisão de task no revisor
Covers: R10 (AC-10.1)
Files: `skills/story/SKILL.md`, `skills/story/phases/implementation.md`, `agents/reviewer.md`, `test/story-skill.test.mjs`
New structure: none
Test first: `test/story-skill.test.mjs` — implementation tem instruções, comandos citados existem e o revisor tem a rubrica
Verification: `node --test test/story-skill.test.mjs`
Done when: os testes passam e `claude plugin validate .` aceita a skill
Depends on: T6, T7

## T10 — Casos de eval das etapas 7 a 9
Covers: R11 (AC-11.1, AC-11.2, AC-11.3)
Files: `evals/phases/**`, `test/evals.test.mjs`
New structure: none
Test first: `test/evals.test.mjs` — casos das etapas 7 a 9 existem, com grader e scaffold
Verification: `claude plugin eval . --runs 1 --ablation none --trust-plugin --scaffold --allow-tools Bash Write Edit --case "implementation-*"`
Done when: os três casos passam numa rodada, com custo registrado nas notas
Depends on: T9

## T11 — RED exige o teste de Test first: pelo nome
Covers: R2 (AC-2.5)
Files: `scripts/task-loop.mjs`, `test/task-loop.test.mjs`, `test/story-repo.mjs`, `evals/phases/data/APP-8-T1-test.mjs`
New structure: none
Test first: `test/task-loop.test.mjs` — RED que falha sem citar o nome do teste é recusado
Verification: `node --test test/task-loop.test.mjs`
Done when: os testes passam e os casos de eval continuam com o nome do teste na saída
Depends on: T3

## T12 — Progress espelhado e conferido
Covers: R12 (AC-12.1, AC-12.2)
Files: `scripts/task-loop.mjs`, `scripts/keel-state.mjs`, `test/task-loop.test.mjs`, `skills/story/phases/implementation.md`
New structure: none
Test first: `test/task-loop.test.mjs` — linhas do Progress na saída e approve commit recusado com Status divergente
Verification: `node --test test/task-loop.test.mjs`
Done when: os testes passam
Depends on: T5

## T13 — Caso de eval com comando negado
Covers: R11 (AC-11.4)
Files: `evals/phases/implementation-denied/**`, `evals/phases/implementation-no-bash/graders/says-not-run.md`, `test/evals.test.mjs`
New structure: none
Test first: `test/evals.test.mjs` — há caso da etapa 7 que libera só git no Bash
Verification: `claude plugin eval . --runs 1 --ablation none --trust-plugin --scaffold --allow-tools "Bash(git *)" Write Edit --case implementation-denied`
Done when: o caso passa numa rodada, com custo nas notas
Depends on: T10
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test test/task-loop.test.mjs` falhou primeiro com ERR_MODULE_NOT_FOUND (módulo novo); com o módulo vazio, 3 de 3 falharam nas asserções.
GREEN evidence: `node --test test/task-loop.test.mjs` 3 de 3; `npm test` 115 de 115. state.json da especificação com os campos novos.
Review: ver T10.
### T2
Status: green
RED evidence: `node --test test/task-loop.test.mjs` 1 de 4 falhou (task start sem regras).
GREEN evidence: `node --test test/task-loop.test.mjs` 4 de 4.
Review: ver T10.
### T3
Status: green
RED evidence: `node --test test/task-loop.test.mjs` 1 de 5 falhou (RED que passa, módulo ausente, GREEN sem RED, No test).
GREEN evidence: `node --test test/task-loop.test.mjs` 5 de 5.
Review: ver T10.
### T4
Status: green
RED evidence: `node --test test/task-loop.test.mjs` 2 de 7 falharam (checagens e impressão digital).
GREEN evidence: `node --test test/task-loop.test.mjs` 7 de 7; o `next` calcula a impressão digital só com task aberta (repositório sem commit não quebra o avanço).
Review: ver T10.
### T5
Status: green
RED evidence: `node --test test/task-loop.test.mjs test/pre-tool-use.test.mjs` 3 de 15 falharam (approve commit, git commit no hook).
GREEN evidence: `npm test` 122 de 122.
Review: ver T10.
### T6
Status: green
RED evidence: `node --test test/stop.test.mjs` 3 de 3 falharam (hook inexistente, hooks.json sem Stop).
GREEN evidence: `npm test` 125 de 125.
Review: ver T10.
### T7
Status: green
RED evidence: `node --test test/task-metrics.test.mjs` 3 de 3 falharam com o módulo vazio.
GREEN evidence: `node --test test/task-metrics.test.mjs` 3 de 3.
Review: ver T10.
### T8
Status: green
RED evidence: `node --test test/post-tool-use.test.mjs` 1 de 5 falhou (sem aviso fora da task).
GREEN evidence: `npm test` 129 de 129.
Review: ver T10.
### T9
Status: green
RED evidence: `node --test test/story-skill.test.mjs` 3 de 6 falharam (falta phases/implementation.md e a revisão de task no revisor).
GREEN evidence: `node --test test/story-skill.test.mjs` 6 de 6; `claude plugin validate .` passa com os avisos que já existiam.
Review: ver T10.
### T10
Status: green
RED evidence: o teste de `test/evals.test.mjs` foi escrito depois dos casos (desvio do TDD, registrado); a primeira rodada dos casos falhou de verdade: `implementation-tdd` 2 de 5 e `implementation-commit` 0 de 3, porque o sandbox do eval mascara dotfiles com /dev/null só dentro dele, e a impressão digital do código mudava entre o Bash (dentro) e o hook (fora).
GREEN evidence: `npm test` 134 de 134. Rodada de 2026-11-21, Claude Code 2.1.330, modelo padrão do eval, uma run por caso, `--ablation none`: implementation-tdd 5 de 5 (US$ 0,19), implementation-commit 3 de 3 (US$ 0,10), implementation-no-bash 3 de 3 (US$ 0,04). Custo total das rodadas desta parte, com as que falharam: cerca de US$ 1,06.
Review: revisor isolado (subagente, só leitura) achou 8: RED por motivo errado não era detectado em saída longa (a regex via só as 20 últimas linhas); `Status: done` sem hash fechava a task para o Stop e as dependências; `task start` aceitava qualquer commit antigo como hash; `isGitCommit` não pegava `(git commit)`, `VAR=x git commit`, `bash -c "git commit"`, `$(...)`, `/usr/bin/git`, `--git-dir x` nem merge/cherry-pick/revert/am; RED novo não zerava o GREEN; só o primeiro comando de cada item de Checks rodava; graders do caso sem Bash fracos; Stop rodava as checagens depois do commit aprovado. Todos corrigidos com teste que falhou antes (`review fixes` e `a real node --test run` em test/task-loop.test.mjs) e o Stop ganhou `timeout` de 900 s.
### T11
Status: green
RED evidence: `node --test test/task-loop.test.mjs` 1 de 12 falhou (RED sem o nome do teste era aceito).
GREEN evidence: `npm test` 135 de 135; as saídas de teste dos fixtures passaram a citar o nome de `Test first:`.
Review: decisão do Miguel no review do PR (2026-11-21), base no checklist do Seemann.
### T12
Status: green
RED evidence: `node --test test/task-loop.test.mjs` 1 de 13 falhou (sem `progress` no next e sem conferência do Status).
GREEN evidence: `npm test` 136 de 136; os testes que aprovam commit passaram a pôr `Status: in review` antes.
Review: decisão do Miguel no review do PR (2026-11-21).
### T13
Status: green
RED evidence: `node --test test/evals.test.mjs` 1 de 5 falhou (não havia o caso implementation-denied).
GREEN evidence: `npm test` 137 de 137. Rodada de 2026-11-21, uma run por caso: implementation-denied 4 de 4 (US$ 0,06; a rodada de teste antes custou mais US$ 0,06), e de novo implementation-tdd 5 de 5 (US$ 0,23), implementation-commit 3 de 3 (US$ 0,11) e implementation-no-bash 3 de 3 (US$ 0,04). Custo total da parte: cerca de US$ 1,55.
Review: decisão do Miguel no review do PR (2026-11-21).

## Implementation notes
- A evidência do loop (RED, GREEN, checagens, review e aprovação do commit) fica no state.json, gravada pelo `keel-state.mjs`, que roda os comandos; o "Progress" do tasks.md continua com Status e um resumo para o dev.
- A impressão digital do código ignora `keel/features/` e arquivos que não são regulares: o sandbox do `plugin eval` põe dotfiles como /dev/null dentro do Bash, e os hooks rodam fora dele.
- `isGitCommit` erra para o lado do "sim": `echo git commit` também é barrado na implementação; o custo é uma mensagem do hook.
- O caso com comando negado roda com `--allow-tools "Bash(git *)" Write Edit`: o `node` é negado de verdade (modo don't ask) e o git continua liberado.
- O caso sem Bash roda sem `Bash` no `--allow-tools`: `TMPDIR=$HOME/evaltmp claude plugin eval . --runs 1 --ablation none --trust-plugin --scaffold --allow-tools Write Edit --case implementation-no-bash`. Os outros dois com `--allow-tools Bash Write Edit`, um `--case` por vez.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
