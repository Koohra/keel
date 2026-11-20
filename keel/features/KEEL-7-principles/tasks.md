# Tasks — KEEL-7

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: varredor de arquitetura em JS/TS
Covers: R5 (AC-5.1), R6 (AC-6.1, AC-6.2)
Files: `scripts/arch-check.mjs`, `test/arch-check.test.mjs`, `keel/architecture.json`, `keel/product.md`
New structure: `scripts/arch-check.mjs` (module)
Test first: `test/arch-check.test.mjs` — imports JS/TS, violação plantada com correção, ciclo, regra sem arquivos, baseline, o próprio Keel
Verification: `node --test test/arch-check.test.mjs`
Done when: os testes passam e `node scripts/arch-check.mjs` passa no próprio Keel
Depends on: —

## T2 — Segunda linguagem: Python
Covers: R5 (AC-5.2)
Files: `scripts/arch-check.mjs`, `test/arch-check.test.mjs`
New structure: none
Test first: `test/arch-check.test.mjs` — domínio Python que importa sqlalchemy e infra
Verification: `node --test test/arch-check.test.mjs`
Done when: a fixture Python sai com 1 e a limpa com 0
Depends on: T1

## T3 — Revisão de AGENTS.md e CLAUDE.md, bloco e reestruturação
Covers: R1 (AC-1.1, AC-1.2), R2 (AC-2.1), R3 (AC-3.1, AC-3.2), R4 (AC-4.1)
Files: `scripts/keel-context.mjs`, `test/keel-context.test.mjs`, `templates/keel-block.pt-BR.md`, `templates/keel-block.en.md`, `templates/agents.md`, `test/templates.test.mjs`
New structure: `scripts/keel-context.mjs` (module)
Test first: `test/keel-context.test.mjs` — conflito com linha e hash intacto, visibilidade, comando morto, bloco com CRLF e BOM, marcadores malformados, CLAUDE.md nunca criado, restructure-check, check
Verification: `node --test test/keel-context.test.mjs test/templates.test.mjs`
Done when: os testes passam
Depends on: —

## T4 — Hooks PostToolUse e SessionStart
Covers: R7 (AC-7.1), R8 (AC-8.1)
Files: `scripts/hooks/post-tool-use.mjs`, `scripts/hooks/session-start.mjs`, `hooks/hooks.json`, `test/post-tool-use.test.mjs`, `test/session-start.test.mjs`
New structure: `scripts/hooks/post-tool-use.mjs` (module), `scripts/hooks/session-start.mjs` (module)
Test first: `test/post-tool-use.test.mjs` e `test/session-start.test.mjs` — PostToolUse barra violação nova; SessionStart injeta o contexto curto
Verification: `node --test test/post-tool-use.test.mjs test/session-start.test.mjs`
Done when: os testes passam e `claude plugin validate .` aceita o hooks.json
Depends on: T1, T3

## T5 — Skill setup e especificação
Covers: R1, R4
Files: `skills/setup/SKILL.md`, `test/setup-skill.test.mjs`, `docs/specification.md`
New structure: none
No test: instruções em markdown; `test/setup-skill.test.mjs` só confere frontmatter, scripts citados e as garantias combinadas.
Done when: `node --test test/setup-skill.test.mjs` passa
Depends on: T3, T4
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test test/arch-check.test.mjs` antes do script: ERR_MODULE_NOT_FOUND para `scripts/arch-check.mjs`.
GREEN evidence: `node --test test/arch-check.test.mjs` 13 de 13 passam; `node scripts/arch-check.mjs` no Keel: 0 violações; com `scripts/zz-plant.mjs` importando `../test/helpers.mjs` saiu com 1 e a correção da regra (arquivo removido depois).
Review: revisor isolado (subagente, só leitura): componente de `forbid` ou padrão de `noCycles` sem arquivo passava em silêncio; `externals` substituía a lista padrão; `./infra/`, alias do tsconfig e comentário dentro de string escondiam import; CLI por symlink não rodava. Todos viraram teste que falhou antes e foram corrigidos; import não resolvido que parece local agora aparece como aviso. Review do PR pendente.
### T2
Status: green
RED evidence: mesmo arquivo de teste, mesma falha de import (T1 e T2 escritas juntas).
GREEN evidence: fixture Python com `import sqlalchemy` e `from app.infra import repo` sai com 1; a limpa sai com 0.
Review: revisor isolado: pacote Python abaixo de subpasta não resolvia (agora `roots` no architecture.json) e `import os; import requests` numa linha só escapava; corrigidos com teste. Review do PR pendente.
### T3
Status: green
RED evidence: `node --test test/keel-context.test.mjs` antes do script: ERR_MODULE_NOT_FOUND. Na primeira implementação, 12 de 13: `quote` com trecho começando por `-` era lido como opção. `test/templates.test.mjs`: o teste do modelo de AGENTS.md falhou antes de `templates/agents.md` existir.
GREEN evidence: `node --test test/keel-context.test.mjs` 14 de 14; `test/templates.test.mjs` 8 de 8.
Review: revisor isolado: BOM sumia com o bloco na primeira linha; `block remove` mudava a linha em branco do dev; `review` não citava outros agentes; `.claude/CLAUDE.md` recebia o import errado. Corrigidos com teste que falhou antes. Exceção documentada: arquivo sem quebra de linha final volta com uma. Review do PR pendente.
### T4
Status: green
RED evidence: `node --test test/session-start.test.mjs` 0 de 3 antes do hook; `test/post-tool-use.test.mjs` 1 de 3 (só o registro no hooks.json, já feito) antes do hook.
GREEN evidence: `test/session-start.test.mjs` 3 de 3; `test/post-tool-use.test.mjs` 4 de 4.
Review: revisor isolado: architecture.json inválido quebrava o PostToolUse em toda edição sem avisar o modelo; agora vira aviso (ou block ao editar o próprio architecture.json). Review do PR pendente.
### T5
Status: green
Review: revisor isolado: a skill citava `block remove` sem `--file` e mandava `import-agents` para `.claude/CLAUDE.md`, que não era suportado; corrigidos. Review do PR pendente.

## Implementation notes
- A reestruturação do AGENTS.md ficou dentro do setup (passo 5 da skill), não como comando separado: é o mais simples e o `restructure-check` garante que a proposta só move e remove linhas.
- Sem `keel/config.json`: o `check` aceita o bloco em pt-BR ou en e exige um arquivo só. O padrão do bloco é "não"; a skill só oferece com outros agentes no repositório.
- `arch:baseline-not-grown` no `keel-state.mjs` passou a apontar a parte 6, que vai chamar o `arch-check.mjs`.
- O `arch-check.mjs` é aproximado: lê imports por expressão regular em JS/TS e Python. Ferramenta nativa só com autorização do dev.
- O `restructure-check` só conhece os títulos do modelo `templates/agents.md`, agora em inglês ("## Commands", "## Conventions", "## Boundaries", "## Done when", "## Pitfalls", "## More details"); AGENTS.md em português reestruturado com "## Comandos" aparece como linha nova. Fica para quando houver modelo em português.
- Limites do varredor: regex literal não é reconhecido pelo removedor de comentários e o `extends` do tsconfig não é seguido.
- O SessionStart fica calado em projeto sem `keel/`, para o plugin instalado não poluir outros projetos.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
