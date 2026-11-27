# Tasks — KEEL-53

Requirements: requirements.md · Design: design.md
Approved by Miguel on 2026-11-23

<!-- frozen after approval: start -->
## T1 — Walking skeleton: skill story acha scripts e fases pela linha "Caminhos"
Covers: R1 (AC-1.1, AC-1.2), R2 (AC-2.1, AC-2.2)
Files: `skills/story/SKILL.md`, `skills/story/phases/triage.md`, `skills/story/phases/reading.md`, `skills/story/phases/requirements.md`, `skills/story/phases/confirmation.md`, `skills/story/phases/design.md`, `skills/story/phases/tasks.md`, `skills/story/phases/implementation.md`, `skills/story/phases/debugging.md`, `skills/story/phases/closing.md`, `test/story-skill.test.mjs`
New structure: none
Test first: `story skill cites plugin files by <plugin> or relative to the skill folder` — todo caminho citado em SKILL.md e nas fases existe a partir da pasta da skill, `${CLAUDE_...}` só no frontmatter e na linha "Caminhos", e os `instructions` do workflow e os checklists existem na pasta da skill
Verification: `node --test test/story-skill.test.mjs`
Done when: o teste passa, o `allowed-tools` da story é o mesmo e `claude plugin validate .` aceita
Depends on: —

## T2 — Skill setup: caminhos, /doctor do Claude Code e visibilidade com o Codex
Covers: R1 (AC-1.1), R3 (AC-3.1), R7 (AC-7.1)
Files: `skills/setup/SKILL.md`, `test/setup-skill.test.mjs`
New structure: none
Test first: `setup skill is agent-neutral: <plugin> paths, /doctor marked as Claude Code, Codex visibility cases` — caminhos com `<plugin>` existem, `/doctor prompt-audit` aparece com "Claude Code" na mesma linha e a seção de visibilidade cita Codex, `AGENTS.override.md` e o caso só com `CLAUDE.md`
Verification: `node --test test/setup-skill.test.mjs`
Done when: o teste passa
Depends on: T1

## T3 — Skill keel-docs:write: guias, modelos e doc-check pela linha "Caminhos"
Covers: R1 (AC-1.1), R2 (AC-2.1, AC-2.2)
Files: `plugins/keel-docs/skills/write/SKILL.md`, `test/docs-plugin.test.mjs`
New structure: none
Test first: `write skill cites guides relative to the skill and plugin files by <plugin>` — cada guia e modelo citado existe, `${CLAUDE_...}` só no frontmatter e na linha "Caminhos", `allowed-tools` igual
Verification: `node --test test/docs-plugin.test.mjs`
Done when: o teste passa e `claude plugin validate plugins/keel-docs` aceita
Depends on: T1

## T4 — Review: visibilidade do Codex com só AGENTS.md e com só CLAUDE.md
Covers: R4 (AC-4.1), R5 (AC-5.1)
Files: `scripts/keel-context.mjs`, `test/keel-context.test.mjs`
New structure: none
Test first: `review tells Codex visibility: AGENTS.md only is info for both agents, CLAUDE.md only adds a Codex info` — um achado de visibilidade `info` com Codex no caso só AGENTS.md; no caso só CLAUDE.md, o achado atual mais um `info` do Codex, sem arquivo mudado
Verification: `node --test test/keel-context.test.mjs`
Done when: o teste passa e os testes de visibilidade atuais continuam passando
Depends on: —

## T5 — Review: AGENTS.override.md na raiz
Covers: R6 (AC-6.1, AC-6.2)
Files: `scripts/keel-context.mjs`, `test/keel-context.test.mjs`, `CHANGELOG.md`
New structure: none
Test first: `review lists AGENTS.override.md and says Codex reads it instead of AGENTS.md` — `files` inclui o override e há um `info` de visibilidade sobre ele, com ou sem AGENTS.md, sem sugerir criar CLAUDE.md
Verification: `node --test test/keel-context.test.mjs`
Done when: o teste passa e `npm test` passa
Depends on: T4
<!-- frozen after approval: end -->

## Progress
### T1
Status: done (66d8b1b)
RED evidence: `node --test test/story-skill.test.mjs` exited with 1 at 2026-11-23T22:33:39.862Z
GREEN evidence: `node --test test/story-skill.test.mjs` exited with 0 at 2026-11-23T22:36:47.654Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (laço morto de ${CLAUDE_PLUGIN_ROOT} removido do teste antigo); F2 fixed (checagem repetida dos instructions removida); F3 kept [source: R1 AC-1.2, os checklists que o next cita]; F4 fixed (vírgula em implementation.md)
### T2
Status: done (6fcb199)
RED evidence: `node --test test/setup-skill.test.mjs` exited with 1 at 2026-11-24T08:12:20.125Z
GREEN evidence: `node --test test/setup-skill.test.mjs` exited with 0 at 2026-11-24T08:13:49.892Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (4 modelos ganharam `<plugin>/` e o teste recusa `templates/` ou `scripts/` sem o prefixo); F2 kept, o setup só cita arquivos com `<plugin>/`, então a frase de caminhos relativos não se aplica [source: design.md Contracts and data]
### T3
Status: done (f535c63)
RED evidence: `node --test test/docs-plugin.test.mjs` exited with 1 at 2026-11-24T08:15:29.525Z
GREEN evidence: `node --test test/docs-plugin.test.mjs` exited with 0 at 2026-11-24T08:15:34.224Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 kept, as skills citam arquivos sempre entre crases e não há caso sem crase hoje [source: design.md Contracts and data]
### T4
Status: done (230484b)
RED evidence: `node --test test/keel-context.test.mjs` exited with 1 at 2026-11-24T09:47:58.811Z
GREEN evidence: `node --test test/keel-context.test.mjs` exited with 0 at 2026-11-24T10:51:32.660Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (`has`, `agents` e `claude` calculados uma vez em `visibility`); F2 kept para a T5, que inclui o override na condição e no texto [source: R5, R6]; F3 kept, a sugestão de mover para AGENTS.md é a mesma que a skill setup mostra [source: R7, skills/setup/SKILL.md]; F4 kept, a asserção foi trocada com aprovação do dev [source: dev on 2026-11-24]
### T5
Status: done (9c90dcd)
RED evidence: `node --test test/keel-context.test.mjs` exited with 1 at 2026-11-27T14:18:50.287Z
GREEN evidence: `node --test test/keel-context.test.mjs` exited with 0 at 2026-11-27T14:20:12.627Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (a frase sobre regras divergentes só sai quando AGENTS.md também existe); F2 kept, duas ocorrências do padrão de projeto temporário no teste, abaixo da terceira [source: keel/product.md#engineering-principles]

## Implementation notes
- T4: o RED usava `doesNotMatch(/creat(e|ing) CLAUDE.md/)`, que pegava a frase atual "Keel does not create CLAUDE.md"; trocado por `match` da frase, com aprovação do dev em 2026-11-24.
- T5 precisa tirar "it reads only AGENTS.md" do achado do Codex e excluir o override da condição do R5 (achado F2 da T4).

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
| R1 | T1 `story skill cites plugin files by <plugin> or relative to the skill folder` (66d8b1b); T2 `setup skill is agent-neutral: <plugin> paths, /doctor marked as Claude Code, Codex visibility cases` (6fcb199); T3 `write skill cites guides relative to the skill and plugin files by <plugin>` (f535c63) | met |
| R2 | T1 `story skill cites plugin files by <plugin> or relative to the skill folder` (66d8b1b); T3 `write skill cites guides relative to the skill and plugin files by <plugin>` (f535c63) | met |
| R3 | T2 `setup skill is agent-neutral: <plugin> paths, /doctor marked as Claude Code, Codex visibility cases` (6fcb199) | met |
| R4 | T4 `review tells Codex visibility: AGENTS.md only is info for both agents, CLAUDE.md only adds a Codex info` (230484b) | met |
| R5 | T4 `review tells Codex visibility: AGENTS.md only is info for both agents, CLAUDE.md only adds a Codex info` (230484b) | met |
| R6 | T5 `review lists AGENTS.override.md and says Codex reads it instead of AGENTS.md` (9c90dcd) | met |
| R7 | T2 `setup skill is agent-neutral: <plugin> paths, /doctor marked as Claude Code, Codex visibility cases` (6fcb199) | met |
