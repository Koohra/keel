# Tasks — KEEL-7

Requisitos: requirements.md · Design: não há
Aprovação: no review do PR

<!-- congelado após aprovação: início -->
## T1 — Esqueleto andante: varredor de arquitetura em JS/TS
Cobre: R5 (AC-5.1), R6 (AC-6.1, AC-6.2)
Arquivos: `scripts/arch-check.mjs`, `test/arch-check.test.mjs`, `keel/architecture.json`, `keel/product.md`
Teste primeiro: `test/arch-check.test.mjs` — imports JS/TS, violação plantada com correção, ciclo, regra sem arquivos, baseline, o próprio Keel
Verificação: `node --test test/arch-check.test.mjs`
Pronto quando: os testes passam e `node scripts/arch-check.mjs` passa no próprio Keel
Depende de: —

## T2 — Segunda linguagem: Python
Cobre: R5 (AC-5.2)
Arquivos: `scripts/arch-check.mjs`, `test/arch-check.test.mjs`
Teste primeiro: `test/arch-check.test.mjs` — domínio Python que importa sqlalchemy e infra
Verificação: `node --test test/arch-check.test.mjs`
Pronto quando: a fixture Python sai com 1 e a limpa com 0
Depende de: T1

## T3 — Revisão de AGENTS.md e CLAUDE.md, bloco e reestruturação
Cobre: R1 (AC-1.1, AC-1.2), R2 (AC-2.1), R3 (AC-3.1, AC-3.2), R4 (AC-4.1)
Arquivos: `scripts/keel-context.mjs`, `test/keel-context.test.mjs`, `templates/keel-block.pt-BR.md`, `templates/keel-block.en.md`, `templates/agents.md`, `test/templates.test.mjs`
Teste primeiro: `test/keel-context.test.mjs` — conflito com linha e hash intacto, visibilidade, comando morto, bloco com CRLF e BOM, marcadores malformados, CLAUDE.md nunca criado, restructure-check, check
Verificação: `node --test test/keel-context.test.mjs test/templates.test.mjs`
Pronto quando: os testes passam
Depende de: —

## T4 — Hooks PostToolUse e SessionStart
Cobre: R7 (AC-7.1), R8 (AC-8.1)
Arquivos: `scripts/hooks/post-tool-use.mjs`, `scripts/hooks/session-start.mjs`, `hooks/hooks.json`, `test/post-tool-use.test.mjs`, `test/session-start.test.mjs`
Teste primeiro: `test/post-tool-use.test.mjs` e `test/session-start.test.mjs`
Verificação: `node --test test/post-tool-use.test.mjs test/session-start.test.mjs`
Pronto quando: os testes passam e `claude plugin validate .` aceita o hooks.json
Depende de: T1, T3

## T5 — Skill setup e especificação
Cobre: R1, R4
Sem teste: instruções em markdown; `test/setup-skill.test.mjs` só confere frontmatter, scripts citados e as garantias combinadas.
Depende de: T3, T4
<!-- congelado após aprovação: fim -->

## Andamento
### T1
Status: green
Evidência RED: `node --test test/arch-check.test.mjs` antes do script: ERR_MODULE_NOT_FOUND para `scripts/arch-check.mjs`.
Evidência GREEN: `node --test test/arch-check.test.mjs` 13 de 13 passam; `node scripts/arch-check.mjs` no Keel: 0 violações; com `scripts/zz-plant.mjs` importando `../test/helpers.mjs` saiu com 1 e a correção da regra (arquivo removido depois).
Review: revisor isolado (subagente, só leitura): componente de `forbid` ou padrão de `noCycles` sem arquivo passava em silêncio; `externals` substituía a lista padrão; `./infra/`, alias do tsconfig e comentário dentro de string escondiam import; CLI por symlink não rodava. Todos viraram teste que falhou antes e foram corrigidos; import não resolvido que parece local agora aparece como aviso. Review do PR pendente.
### T2
Status: green
Evidência RED: mesmo arquivo de teste, mesma falha de import (T1 e T2 escritas juntas).
Evidência GREEN: fixture Python com `import sqlalchemy` e `from app.infra import repo` sai com 1; a limpa sai com 0.
Review: revisor isolado: pacote Python abaixo de subpasta não resolvia (agora `roots` no architecture.json) e `import os; import requests` numa linha só escapava; corrigidos com teste. Review do PR pendente.
### T3
Status: green
Evidência RED: `node --test test/keel-context.test.mjs` antes do script: ERR_MODULE_NOT_FOUND. Na primeira implementação, 12 de 13: `quote` com trecho começando por `-` era lido como opção. `test/templates.test.mjs`: o teste do modelo de AGENTS.md falhou antes de `templates/agents.md` existir.
Evidência GREEN: `node --test test/keel-context.test.mjs` 14 de 14; `test/templates.test.mjs` 8 de 8.
Review: revisor isolado: BOM sumia com o bloco na primeira linha; `block remove` mudava a linha em branco do dev; `review` não citava outros agentes; `.claude/CLAUDE.md` recebia o import errado. Corrigidos com teste que falhou antes. Exceção documentada: arquivo sem quebra de linha final volta com uma. Review do PR pendente.
### T4
Status: green
Evidência RED: `node --test test/session-start.test.mjs` 0 de 3 antes do hook; `test/post-tool-use.test.mjs` 1 de 3 (só o registro no hooks.json, já feito) antes do hook.
Evidência GREEN: `test/session-start.test.mjs` 3 de 3; `test/post-tool-use.test.mjs` 4 de 4.
Review: revisor isolado: architecture.json inválido quebrava o PostToolUse em toda edição sem avisar o modelo; agora vira aviso (ou block ao editar o próprio architecture.json). Review do PR pendente.
### T5
Status: green
Review: revisor isolado: a skill citava `block remove` sem `--file` e mandava `import-agents` para `.claude/CLAUDE.md`, que não era suportado; corrigidos. Review do PR pendente.

## Notas de implementação
- A reestruturação do AGENTS.md ficou dentro do setup (passo 5 da skill), não como comando separado: é o mais simples e o `restructure-check` garante que a proposta só move e remove linhas.
- Sem `keel/config.json`: o `check` aceita o bloco em pt-BR ou en e exige um arquivo só. O padrão do bloco é "não"; a skill só oferece com outros agentes no repositório.
- `arch:baseline-not-grown` no `keel-state.mjs` passou a apontar a parte 6, que vai chamar o `arch-check.mjs`.
- O `arch-check.mjs` é aproximado: lê imports por expressão regular em JS/TS e Python. Ferramenta nativa só com autorização do dev.
- O `restructure-check` só conhece os títulos em português do modelo; AGENTS.md em inglês reestruturado com "## Commands" aparece como linha nova. Fica para quando houver modelo em inglês.
- Limites do varredor: regex literal não é reconhecido pelo removedor de comentários e o `extends` do tsconfig não é seguido.
- O SessionStart fica calado em projeto sem `keel/`, para o plugin instalado não poluir outros projetos.

## Convergência (preenchida no fim, conferida por script)
| Regra | Evidência | Situação |
|---|---|---|
