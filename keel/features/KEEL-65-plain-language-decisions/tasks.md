# Tasks — KEEL-65

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: regra de linguagem simples nas três skills
Covers: R1 (AC-1.1)
Files: `skills/story/SKILL.md`, `skills/setup/SKILL.md`, `plugins/keel-docs/skills/write/SKILL.md`, `docs/specification.md`, `test/story-skill.test.mjs`
New structure: none
Test first: `plain: decisions reach the dev in plain language, then the recommendation` — a regra está nas três skills, com o glossário e o termo técnico só entre parênteses
Verification: `node --test test/story-skill.test.mjs`
Done when: os testes passam
Depends on: —

## T2 — Textos de fase e guias com degrau, porta e mapper só entre parênteses
Covers: R2 (AC-2.1)
Files: `skills/story/phases/triage.md`, `skills/story/phases/design.md`, `skills/story/phases/closing.md`, `skills/setup/SKILL.md`, `plugins/keel-docs/skills/write/guides/adr.md`, `plugins/keel-docs/skills/write/guides/product.md`, `test/story-skill.test.mjs`
New structure: none
Test first: `plain: phase texts and guides put degrau, porta and mapper only in parentheses` — toda ocorrência dos três termos está entre parênteses
Verification: `node --test test/story-skill.test.mjs`
Done when: os testes passam
Depends on: T1

## T3 — Eval de decisão antes e depois da regra
Covers: R3 (AC-3.1)
Files: `evals/phases/design-decision-plain/case.yaml`, `evals/phases/design-decision-plain/fixture.sh`, `evals/phases/design-decision-plain/graders/*.md`, `evals/phases/data/APP-12-complete.md`, `test/evals.test.mjs`
New structure: none
Test first: `plain: a design case checks that the decision reaches the dev in plain language` — o caso existe, roda na fase de design e lê a última mensagem
Verification: `node --test test/evals.test.mjs`; `claude plugin eval . --case design-decision-plain --runs 1 --scaffold` na main e na branch
Done when: os testes passam e as duas rodadas estão em "Implementation notes"
Depends on: T1
<!-- frozen after approval: end -->

## Progress
### T1
Status: done (d446607)
RED evidence: `node --test --test-name-pattern="plain:" test/story-skill.test.mjs` 1 falhou (`skills/story/SKILL.md: no plain-language rule`).
GREEN evidence: `node --test test/story-skill.test.mjs test/setup-skill.test.mjs test/docs-plugin.test.mjs` 30 de 30.
### T2
Status: done (52bee1e)
RED evidence: `node --test --test-name-pattern="plain: phase" test/story-skill.test.mjs` 1 falhou (`guides/product.md`: "o degrau de cada módulo" fora de parênteses; também `design.md:11`, `triage.md:6` e `setup/SKILL.md:73-74`).
GREEN evidence: `node --test test/story-skill.test.mjs` 16 de 16.
### T3
Status: done (7701d26)
RED evidence: `node --test --test-name-pattern="plain:" test/evals.test.mjs` 1 falhou (caso `design-decision-plain` ausente).
GREEN evidence: `node --test test/evals.test.mjs` 8 de 8; `npm test` 248 de 248.
Review: revisor isolado (subagente, só leitura) nas três tasks: 5 achados; aplicados o grader mais estrito (termos em inglês, parênteses abertos por lookbehind), o grader de pergunta com opções, "adaptador" na lista e "depois das opções, a recomendação"; o passo 5 da triagem fica (ver nota de T2).

## Implementation notes
- T2: o passo 5 da triagem também passou a pedir uma frase simples por gatilho mostrado ao dev, porque é ali que o dev confirma o nível.
- T3, 2026-11-27, `claude plugin eval . --case design-decision-plain --runs 1 --scaffold`: antes da regra (main 93246fe) 3 de 3 graders, US$ 0,10, 11 turnos.
- T3, 2026-11-27, mesma rodada depois da regra (esta branch): 3 de 3 graders, US$ 0,10, 8 turnos.
- T3: os graders de regex não separam as duas rodadas, porque a resposta de antes já evitava degrau, porta e mapper. A diferença ficou na forma: antes, cada opção começava pelo nome técnico ("`nodemailer` com SMTP") e a resposta terminava em "`notifier` injetado em `register`"; depois, cada opção começa pelo que muda para o clube e o termo técnico vem entre parênteses. O caso fica como guarda contra regressão (jargão fora de parênteses), não como prova da melhora.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
| R1 | T1 `plain: decisions reach the dev in plain language, then the recommendation` (d446607) | met |
| R2 | T2 `plain: phase texts and guides put degrau, porta and mapper only in parentheses` (52bee1e) | met |
| R3 | T3 `plain: a design case checks that the decision reaches the dev in plain language` e as duas rodadas em "Implementation notes" (7701d26) | met |
