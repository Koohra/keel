# Tasks — KEEL-52

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: apply_patch do Codex bloqueado no PreToolUse, com a raiz achada pelo git
Covers: R1 (AC-1.1, AC-1.2, AC-1.3), R2 (AC-2.1), R3 (AC-3.1)
Files: `scripts/hooks/event.mjs`, `scripts/hooks/pre-tool-use.mjs`, `test/pre-tool-use.test.mjs`, `test/hook-event.test.mjs`
New structure: `scripts/hooks/event.mjs` — normaliza o evento do Claude Code ou do Codex em raiz do projeto, arquivos alvo e comando, para as regras atuais (`checkEdit`, `checkCommand`, `checkGitCommit`) não se repetirem por agente.
Test first: `Codex apply_patch touching code outside the implementation is blocked like an Edit` — mais os casos de vários arquivos, criar, apagar, renomear, `state.json`, subpasta e `git commit` no mesmo arquivo
Verification: `node --test test/pre-tool-use.test.mjs test/hook-event.test.mjs`
Done when: os testes novos e os antigos do PreToolUse passam
Depends on: —

## T2 — PostToolUse, Stop e SessionStart com o evento do Codex
Covers: R2 (AC-2.2, AC-2.3), R4 (AC-4.1)
Files: `scripts/hooks/post-tool-use.mjs`, `scripts/hooks/stop.mjs`, `scripts/hooks/session-start.mjs`, `test/post-tool-use.test.mjs`, `test/stop.test.mjs`, `test/session-start.test.mjs`
New structure: none
Test first: `PostToolUse checks every file a Codex apply_patch leaves on disk` — mais Stop e SessionStart numa subpasta sem `CLAUDE_PROJECT_DIR`
Verification: `node --test test/post-tool-use.test.mjs test/stop.test.mjs test/session-start.test.mjs`
Done when: os testes novos e os antigos passam
Depends on: T1

## T3 — Matchers conferidos e README
Covers: R5 (AC-5.1), R6 (AC-6.1)
Files: `README.md`, `test/hook-event.test.mjs`, `CHANGELOG.md`
New structure: none
Test first: `hooks.json matchers catch the Codex aliases of apply_patch and the shell` — mais o README com `/hooks`
Verification: `npm test` e `claude plugin validate .`
Done when: `npm test` passa e `claude plugin validate .` passa
Depends on: T1
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test test/pre-tool-use.test.mjs test/hook-event.test.mjs` falhou: `scripts/hooks/event.mjs` não existia, e o `apply_patch` e o `git commit` do Codex passavam (exit 0).
GREEN evidence: `node --test test/pre-tool-use.test.mjs test/hook-event.test.mjs` 11 de 11.
Review: no PR (sem revisor isolado nesta sessão)
### T2
Status: green
RED evidence: `node --test test/post-tool-use.test.mjs test/stop.test.mjs test/session-start.test.mjs` 3 falharam (patch sem retorno de arquitetura; Stop e SessionStart numa subpasta sem `CLAUDE_PROJECT_DIR` não achavam a história).
GREEN evidence: o mesmo comando, 14 de 14.
Review: no PR (sem revisor isolado nesta sessão)
### T3
Status: green
RED evidence: `node --test test/hook-event.test.mjs` 1 falhou (README sem a seção dos hooks no Codex); o teste dos matchers passou de início, porque `Edit` e `Write` já estão nos matchers.
GREEN evidence: `npm test` 226 de 226; `claude plugin validate .` passou com os dois avisos que já existiam na main (CLAUDE.md na raiz, ícone).
Review: no PR (sem revisor isolado nesta sessão)

## Implementation notes
- O formato do `apply_patch` e a saída `exit 2` no Stop seguem a doc; a confirmação no Codex CLI real fica para o e2e (#55).

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
