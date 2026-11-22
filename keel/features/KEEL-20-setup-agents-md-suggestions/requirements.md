# KEEL-20 — Sugestões do setup para AGENTS.md e CLAUDE.md existentes

Source: https://github.com/Koohra/keel/issues/20 · Folder: keel/features/KEEL-20-setup-agents-md-suggestions/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> Miguel em 2026-11-22: quando o projeto já tem CLAUDE.md e AGENTS.md o Keel não mexe neles; ele valida o conteúdo para ver se está bem estruturado e faz sugestões, ou só ignora? Resposta: valida visibilidade, conflitos, comandos mortos e tamanho, mas não a estrutura. Miguel aprovou ("ok") os cinco itens propostos: falta de comandos, seções do modelo, README repetido, excesso de ênfase e de regras, `/doctor prompt-audit`.

## Goal
Quando o projeto já tem AGENTS.md ou CLAUDE.md, o setup continua sem alterar nada, mas o relatório traz sugestões de estrutura com fonte: comandos que faltam, seções do modelo que faltam, ênfase e regras demais, visão geral que repete o README e o `/doctor prompt-audit` do Claude Code. [source: Miguel em 2026-11-22; https://github.com/Koohra/keel/issues/20]

## Out of scope
- Corrigir o arquivo: o setup só sugere; a reestruturação continua no passo 5, com `restructure-check` e aprovação.
- Detectar por script a visão geral que repete o README: fica com o modelo, na skill.
- Auditoria de conteúdo velho: o Keel só sugere o `/doctor prompt-audit`.

## Rules and acceptance criteria
R1. WHEN `review` roda e nenhum arquivo de instrução tem, em código, um comando de teste, build, lint ou checagem THE keel-context.mjs SHALL emitir um achado `commands` com severidade `warning`. [source: https://arxiv.org/html/2602.11988 "ferramenta citada no arquivo: 2,5 usos por instância, contra menos de 0,05 sem a citação"]
  - AC-1.1 GIVEN um AGENTS.md só com prosa WHEN rodo `review` THEN há um achado `commands` `warning`.
  - AC-1.2 GIVEN um AGENTS.md com `` `npm test` `` ou um bloco com `pytest` WHEN rodo `review` THEN não há achado `commands`.
R2. WHEN `review` roda THE keel-context.mjs SHALL comparar os títulos `##` do arquivo principal (AGENTS.md, senão CLAUDE.md, senão `.claude/CLAUDE.md`) com as seções de `templates/agents.md`, aceitando sinônimos em português e inglês, e emitir um achado `sections` `info` com as que faltam; com 3 ou mais faltando, a mensagem SHALL sugerir a reestruturação do passo 5. [source: templates/agents.md; skills/setup/SKILL.md passo 5]
  - AC-2.1 GIVEN um AGENTS.md com `## Comandos`, `## Convenções`, `## Limites`, `## Pronto quando`, `## Armadilhas` e `## Mais detalhes` WHEN rodo `review` THEN não há achado `sections`.
  - AC-2.2 GIVEN um AGENTS.md só com `## Setup` WHEN rodo `review` THEN o achado `sections` lista as que faltam e sugere a reestruturação.
R3. WHEN um arquivo de instrução tem 5 ou mais palavras de ênfase em maiúsculas (IMPORTANT, CRITICAL, MUST, NEVER, ALWAYS, IMPORTANTE, NUNCA, SEMPRE, OBRIGATÓRIO) fora de código e do bloco do Keel THE keel-context.mjs SHALL emitir um achado `emphasis` `info` com a contagem. [source: https://code.claude.com/docs/en/best-practices "piling on emphasis mostly makes Claude over-apply the rule"]
  - AC-3.1 GIVEN um AGENTS.md com 5 linhas "IMPORTANT: ..." WHEN rodo `review` THEN há um achado `emphasis` no arquivo.
  - AC-3.2 GIVEN `NEVER` só dentro de código ou 4 ocorrências WHEN rodo `review` THEN não há achado `emphasis`.
R4. WHEN um arquivo de instrução tem 40 ou mais itens de lista fora do bloco do Keel THE keel-context.mjs SHALL emitir um achado `rules` `info` sugerindo transformar regra checável em lint, teste ou hook e mover detalhe para doc linkado. [source: https://code.claude.com/docs/en/best-practices "If you ever find yourself at forty of them, most are probably preferences"]
  - AC-4.1 GIVEN um AGENTS.md com 40 itens de lista WHEN rodo `review` THEN há um achado `rules`; com 39, não.
R5. WHEN o setup mostra o relatório THE skill setup SHALL pedir ao modelo que compare a visão geral do arquivo com o README e sugira link no lugar de cópia, que sugira `/doctor prompt-audit` e que ofereça a reestruturação do passo 5 quando o achado `sections` pedir. [source: https://aaif.io/blog/writing-an-effective-agents-md "Avoid two sources that can disagree"; https://code.claude.com/docs/en/memory]
  - AC-5.1 GIVEN os arquivos da skill WHEN o teste lê `skills/setup/SKILL.md` THEN as instruções citam README, `/doctor prompt-audit` e `sections`.

## Explicit obligations
- Edge cases: só CLAUDE.md com `@AGENTS.md` (o principal é o AGENTS.md); nenhum arquivo de instrução (nenhum achado novo); CLAUDE.md symlink para AGENTS.md (conta uma vez).
- Invariants (must never happen): o `review` gravar qualquer arquivo; achado novo com severidade `conflict`.
- Existing behavior that must not change: achados de visibilidade, conflito, comando morto, tamanho, outras ferramentas e bloco do Keel; `check` só falha por bloco e só avisa por `visibility` e `size`. [source: test/keel-context.test.mjs]
- Errors and expected responses: nenhum; os achados são informação.

## Conflicts found
none

## Questions and assumptions
- [ASSUMPTION] Comando de checagem é um trecho em código com test, build, lint, check, verify, typecheck, pytest, jest, vitest, tsc, ruff, eslint ou clippy.
- [ASSUMPTION] Os limites 5 (ênfase) e 40 (itens de lista) são fixos no script; 40 vem da Anthropic, 5 é escolha minha.
- [ASSUMPTION] A comparação de seções usa sinônimos fixos; não é exigido o título exato do modelo.
<!-- frozen after approval: end -->

## Changes after confirmation
not applicable
