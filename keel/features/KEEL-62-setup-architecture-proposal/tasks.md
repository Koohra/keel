# Tasks — KEEL-62

Requirements: requirements.md · Design: none
Approved by Miguel on 2026-11-28

<!-- frozen after approval: start -->
## T1 — Walking skeleton: o setup entrevista o repositório sem código-fonte
Covers: R1 (AC-1.1)
Files: `skills/setup/SKILL.md`, `test/setup-skill.test.mjs`
New structure: none
Test first: `setup: a repository without source code gets an interview of at most 6 questions` — a seção 3.1 fica entre os passos 3 e 4 e tem "no máximo 6 perguntas", "uma por vez", "por que importa", a recomendação, "sim" e os seis temas
Verification: `node --test test/setup-skill.test.mjs`
Done when: o teste novo passa
Depends on: —

## T2 — Quality goals no product.md e no modelo do keel-docs
Covers: R2 (AC-2.1, AC-2.2)
Files: `skills/setup/SKILL.md`, `plugins/keel-docs/templates/product.md`, `plugins/keel-docs/skills/write/guides/product.md`, `plugins/keel-docs/scripts/doc-check.mjs`, `test/setup-skill.test.mjs`
New structure: none
Test first: `setup: answers become 3 to 5 Quality goals scenarios` — o modelo tem "## Quality goals" antes de "## Engineering principles" com contexto, estímulo e métrica, o guia diz 3 a 5 cenários, e o setup cita a seção e completa até 3 com cenários do Keel; o `doc-check` aceita product.md sem a seção, como os de projetos existentes
Verification: `node --test test/setup-skill.test.mjs`
Done when: o teste novo passa e `node --test test/docs-plugin.test.mjs` segue passando
Depends on: T1

## T3 — Abordagens por postura, starter conferido na web e "tanto faz"
Covers: R3 (AC-3.1, AC-3.2), R6 (AC-6.1)
Files: `skills/setup/SKILL.md`, `test/setup-skill.test.mjs`
New structure: none
Test first: `setup: approaches by stance, a starter checked on the web and "tanto faz" as a Keel decision` — a seção 3.1 cita as três posturas, "o que custa depois", o starter conferido na web, a suposição sem web, a recusa de todas as abordagens, a costura só com cenário de mudança, "tanto faz" como decisão do Keel e a recusa da entrevista
Verification: `node --test test/setup-skill.test.mjs`
Done when: o teste novo passa
Depends on: T2

## T4 — ADR-001, degraus, architecture.json planejado e portão
Covers: R4 (AC-4.1), R5 (AC-5.1)
Files: `skills/setup/SKILL.md`, `docs/specification.md`, `test/setup-skill.test.mjs`
New structure: none
Test first: `setup: the new repository ends with ADR-001, rungs and a planned architecture.json` — a seção 3.1 cita "Rungs per module" com o cenário, ADR-001 com "Confirmation" e "Decisões adiadas", `"planned": true`, `coverage`, a dispensa que não vale, a aprovação de cada trecho, o `arch-check.mjs` com `pending` sem `noCycles` nem baseline e a violação plantada que espera o primeiro arquivo; o portão exige a ADR-001 em repositório sem código-fonte e mantém o texto de hoje; o passo 4 segue "a partir das pastas reais"; a Etapa 0 da especificação cita o ramo
Verification: `node --test test/setup-skill.test.mjs`
Done when: o teste novo passa
Depends on: T3

## T5 — Eval do setup em repositório vazio
Covers: R7 (AC-7.1)
Files: `evals/phases/setup-empty-repo/case.yaml`, `evals/phases/setup-empty-repo/fixture.sh`, `evals/phases/setup-empty-repo/graders/*.md`, `test/evals.test.mjs`
New structure: none
Test first: `stage 0 has a case: an empty repository gets one question at a time and no waiver` — o caso existe com tag `phase-0`, graders de "por que importa", de recomendação e `not_contains` da dispensa, e a fixture monta o repositório sem copiar a `node-mini`
Verification: `node --test test/evals.test.mjs`
Done when: o teste novo passa
Depends on: T4
<!-- frozen after approval: end -->

## Progress
### T1
Status: done (de73e5c)
RED evidence: `node --test test/setup-skill.test.mjs` exited with 1 at 2026-11-28T01:18:13.653Z
GREEN evidence: `node --test test/setup-skill.test.mjs` exited with 0 at 2026-11-28T01:19:43.930Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (o teste confere as opções)
### T2
Status: done (abd5b31)
RED evidence: `node --test test/setup-skill.test.mjs` exited with 1 at 2026-11-28T01:20:35.308Z
GREEN evidence: `node --test test/setup-skill.test.mjs` exited with 0 at 2026-11-28T01:25:01.517Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (o teste usa checkDoc sobre o product.md sem a seção); F2 fixed (o passo 2 do setup cita Quality goals)
### T3
Status: in review
RED evidence: `node --test test/setup-skill.test.mjs` exited with 1 at 2026-11-28T01:25:52.190Z
GREEN evidence: `node --test test/setup-skill.test.mjs` exited with 0 at 2026-11-28T01:27:27.922Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (o teste confere "o que falta" e "não do dev")
### T4
Status: pending
### T5
Status: pending

## Implementation notes
- 2026-11-28: a T2 ganhou `plugins/keel-docs/scripts/doc-check.mjs` no `Files:`: o doc-check exige toda seção do modelo, e "Quality goals" precisa ser opcional para product.md de projeto existente (Existing behavior). Tasks aprovadas de novo por Miguel (aprovação permanente do épico #61).

## Story review
Review: <ok | findings and what became of each one | unavailable> (filled in the closing)

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
