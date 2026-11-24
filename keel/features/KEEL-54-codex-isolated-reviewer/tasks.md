# Tasks — KEEL-54

Requirements: requirements.md · Design: design.md
Approved by Miguel on 2026-11-24

<!-- frozen after approval: start -->
## T1 — Walking skeleton: TOML gerado do reviewer.md e instalado no projeto
Covers: R1 (AC-1.1, AC-1.2), R2 (AC-2.1, AC-2.2, AC-2.4)
Files: `scripts/codex-reviewer.mjs`, `test/codex-reviewer.test.mjs`
New structure: `scripts/codex-reviewer.mjs` (module)
Test first: `reviewer TOML carries the reviewer.md body byte for byte` — mais install num projeto vazio, install repetido, install sobre arquivo diferente com e sem `--force`, check com arquivo igual, ausente e diferente, e nenhum `keel-reviewer.toml` no repo
Verification: `node --test test/codex-reviewer.test.mjs`
Done when: os testes novos passam
Depends on: —

## T2 — Hook bloqueia edição e shell de escrita do revisor no Codex
Covers: R3 (AC-3.1, AC-3.2, AC-3.3, AC-3.4)
Files: `scripts/codex-reviewer.mjs`, `scripts/hooks/pre-tool-use.mjs`, `test/codex-reviewer.test.mjs`, `test/pre-tool-use.test.mjs`
New structure: none
Test first: `Codex keel-reviewer apply_patch is blocked in any phase` — mais a lista de leitura que passa, os comandos de escrita e as opções que gravam que bloqueiam, e o mesmo evento sem `agent_type` com a decisão de hoje
Verification: `node --test test/codex-reviewer.test.mjs test/pre-tool-use.test.mjs`
Done when: os testes novos e os antigos do PreToolUse passam
Depends on: T1

## T3 — Setup e fases chamam o revisor no Codex
Covers: R2 (AC-2.3), R4 (AC-4.1, AC-4.2, AC-4.3)
Files: `skills/setup/SKILL.md`, `skills/story/phases/confirmation.md`, `skills/story/phases/implementation.md`, `test/codex-reviewer.test.mjs`, `CHANGELOG.md`
New structure: none
Test first: `setup and phases call keel-reviewer in Codex without the conversation` — passo do setup com aprovação e `install`; nas duas fases `check`, `keel-reviewer`, `fork_turns` `none`, `unknown agent_type`, `Result:` e `unavailable`, e a frase do `keel:reviewer` igual
Verification: `npm test` e `claude plugin validate .`
Done when: `npm test` passa e `claude plugin validate .` passa
Depends on: T1
<!-- frozen after approval: end -->

## Progress
### T1
Status: done (1f2e8fa)
RED evidence: `node --test test/codex-reviewer.test.mjs` exited with 1 at 2026-11-24T08:15:16.205Z
GREEN evidence: `node --test test/codex-reviewer.test.mjs` exited with 0 at 2026-11-24T08:15:31.141Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (exports sem uso removidos); F2 fixed (pastas temporárias apagadas no t.after); F3 fixed (comando validado antes do I/O)
### T2
Status: in review
RED evidence: `node --test test/codex-reviewer.test.mjs test/pre-tool-use.test.mjs` exited with 1 at 2026-11-24T09:49:11.382Z
GREEN evidence: `node --test test/codex-reviewer.test.mjs test/pre-tool-use.test.mjs` exited with 0 at 2026-11-24T09:52:06.879Z
Checks: Architecture `node scripts/arch-check.mjs` exited with 0; Tests `npm test` exited with 0
Review: findings (isolated reviewer); F1 fixed (`(` e `)` fora de aspas bloqueiam: `<(cmd)`, `=(cmd)` e qualificador de glob do zsh, com teste); F2 kept [source: requirements.md Out of scope, ferramentas MCP]; F3 fixed (parênteses explícitos); F4 fixed (casos `3<>`, `&>`, `|&` no teste)
### T3
Status: pending

## Implementation notes
- `keel-state checks` falhava no repo do Keel: a linha Checks do `keel/product.md` tinha `keel/architecture.json` entre crases e o `checkCommands` roda cada trecho entre crases. Corrigido pelo commit da #53 (558df85), trazido para esta branch.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
