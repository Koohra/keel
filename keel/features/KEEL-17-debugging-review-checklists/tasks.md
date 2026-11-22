# Tasks — KEEL-17

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: GREEN falho gravado e next aponta a depuração
Covers: R1 (AC-1.1, AC-1.2)
Files: `scripts/task-loop.mjs`, `scripts/keel-state.mjs`, `test/task-loop.test.mjs`
New structure: none
Test first: `failed attempts: a failing GREEN is recorded and next points to debugging` — GREEN falho conta 1 e o next traz task.debugging; GREEN que passa tira
Verification: `node --test test/task-loop.test.mjs`
Done when: os testes passam
Depends on: —

## T2 — Limite de três tentativas
Covers: R2 (AC-2.1, AC-2.2)
Files: `scripts/task-loop.mjs`, `scripts/keel-state.mjs`, `test/task-loop.test.mjs`
New structure: none
Test first: `failed attempts: the third failure refuses GREEN and checks until block` — 3 falhas (GREEN e checks) recusam sem rodar; block zera
Verification: `node --test test/task-loop.test.mjs`
Done when: os testes passam
Depends on: T1

## T3 — Destino dos achados do review
Covers: R3 (AC-3.1, AC-3.2)
Files: `scripts/task-loop.mjs`, `test/task-loop.test.mjs`
New structure: none
Test first: `review findings: approve commit needs what was done with them` — Review: só com o resultado recusa; com o destino aprova
Verification: `node --test test/task-loop.test.mjs`
Done when: os testes passam
Depends on: —

## T4 — Checklists do revisor pelo design.md
Covers: R4 (AC-4.1, AC-4.2)
Files: `scripts/task-loop.mjs`, `scripts/keel-state.mjs`, `test/task-loop.test.mjs`
New structure: none
Test first: `checklists: next lists the reviewer checklists the design asks for` — contract e security pelo Trigger e pelo Security; nada sem design ou com not applicable
Verification: `node --test test/task-loop.test.mjs`
Done when: os testes passam
Depends on: —

## T5 — Instruções da skill, checklists e revisor
Covers: R5 (AC-5.1)
Files: `skills/story/phases/implementation.md`, `skills/story/phases/debugging.md`, `skills/story/checklists/*.md`, `agents/reviewer.md`, `test/story-skill.test.mjs`, `docs/specification.md`
New structure: none
Test first: `debugging, review answer and checklists are in the skill` — depuração com o limite, resposta ao review, checklists de 1 a 5 itens e revisor que responde cada item
Verification: `node --test test/story-skill.test.mjs`
Done when: os testes passam e `claude plugin validate .` aceita a skill
Depends on: T2, T3, T4

## T6 — Caso de eval: GREEN que não passa termina em block
Covers: R6 (AC-6.1)
Files: `evals/phases/implementation-stuck/**`, `evals/phases/prepare.sh`, `evals/phases/data/**`, `test/evals.test.mjs`
New structure: none
Test first: `test/evals.test.mjs` — há caso da implementação travada com scaffold
Verification: `claude plugin eval . --runs 1 --ablation none --trust-plugin --scaffold --allow-tools Bash Write Edit --case implementation-stuck`
Done when: o caso passa numa rodada, com custo nas notas
Depends on: T5
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test test/task-loop.test.mjs` 1 falhou (TypeError: `failedAttempts` ausente no state.json depois do GREEN falho).
GREEN evidence: `node --test test/task-loop.test.mjs` 15 de 15; `npm test` 164 de 164.
Review: no PR (sem revisor isolado nesta sessão).
### T2
Status: green
RED evidence: `node --test test/task-loop.test.mjs` 1 falhou (o terceiro `evidence green` ainda rodava o comando).
GREEN evidence: `node --test test/task-loop.test.mjs` 16 de 16.
Review: no PR (sem revisor isolado nesta sessão).
### T3
Status: green
RED evidence: `node --test test/task-loop.test.mjs` 1 falhou (Missing expected exception: approve commit aceitava achados sem destino).
GREEN evidence: `npm test` 166 de 166, depois de dar destino aos achados em dois testes antigos que aprovavam review `findings` sem ele.
Review: no PR (sem revisor isolado nesta sessão).
### T4
Status: green
RED evidence: `node --test test/task-loop.test.mjs` falhou pelo import de `reviewChecklists` ainda inexistente (motivo errado: não passei pelo export vazio antes de implementar).
GREEN evidence: `npm test` 167 de 167; depois restrito à seção "Cross-cutting concerns", 167 de 167.
Review: no PR (sem revisor isolado nesta sessão).
### T5
Status: green
RED evidence: `node --test test/story-skill.test.mjs` 1 falhou (ENOENT em `skills/story/phases/debugging.md`).
GREEN evidence: `npm test` 168 de 168; `claude plugin validate .` passou com o aviso que já existia na main (CLAUDE.md na raiz).
Review: no PR (sem revisor isolado nesta sessão).
### T6
Status: green
RED evidence: `node --test test/evals.test.mjs` 1 falhou (caso implementation-stuck ausente).
GREEN evidence: `claude plugin eval . --runs 1 --ablation none --trust-plugin --scaffold --allow-tools Bash Write Edit --case implementation-stuck` 4 de 4 graders, US$0,12 em 21 s (uma rodada antes parou no limite de uso, sem custo). A sessão viu que o teste do RED estava errado, gravou o `block` e perguntou ao dev sem tentar o GREEN; o contador de tentativas não foi exercitado no eval, só nos testes de `test/task-loop.test.mjs`.
Review: no PR (sem revisor isolado nesta sessão).

## Implementation notes
- O RED da T4 falhou por import, não por asserção; registrado como está.
- O hook `Stop` passou a pedir o `block` quando a task tem 3 tentativas falhas, em vez de pedir o GREEN que o script recusa (dentro da T2).
- Dois testes antigos de `test/task-loop.test.mjs` aprovavam review `findings` sem destino; ganharam o destino, como pede R3.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
