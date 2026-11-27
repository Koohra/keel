# ADR-006 — Skills citam arquivos do plugin por `<plugin>` e por caminho relativo à skill

## Status
Proposed (KEEL-53, issue #53).

## Context
As skills citavam scripts, modelos, fases e checklists por `${CLAUDE_PLUGIN_ROOT}` e `${CLAUDE_SKILL_DIR}`, que só o Claude Code troca no texto da skill. O Codex não troca variável no SKILL.md e manda o modelo resolver caminhos relativos à pasta do SKILL.md. [source: https://github.com/Koohra/keel/issues/53; openai/codex `codex-rs/ext/skills/src/catalog_prompt.rs`]

## Decision
- Cada SKILL.md tem uma linha "Caminhos" que define `<plugin>`: no Claude Code, `${CLAUDE_PLUGIN_ROOT}`; em outro agente, a pasta dois níveis acima do SKILL.md. É a única linha fora do frontmatter com variável do Claude Code.
- Scripts e modelos são citados como `<plugin>/scripts/...` e `<plugin>/templates/...`.
- Fases, checklists e guias são citados relativos à pasta da skill (`phases/triage.md`, `guides/adr.md`).
- Vale também para comandos que outras histórias acrescentarem às skills (por exemplo `<plugin>/scripts/codex-reviewer.mjs`, do #54).
- O `allowed-tools` do frontmatter continua com `${CLAUDE_PLUGIN_ROOT}`; o Codex ignora a chave.

## Consequences
- O mesmo texto serve ao Claude Code e ao Codex, sem cópia por agente.
- O agente precisa trocar `<plugin>` pelo caminho antes de rodar um comando; um comando com `<plugin>` literal falha na hora, em vez de rodar num caminho errado.
- Skill nova segue o mesmo formato, e os testes de skill conferem que todo caminho citado existe.

## Confirmation
`test/story-skill.test.mjs`, `test/setup-skill.test.mjs` e `test/docs-plugin.test.mjs` resolvem cada caminho citado a partir da pasta da skill e recusam `${CLAUDE_...}` fora do frontmatter e da linha "Caminhos".
