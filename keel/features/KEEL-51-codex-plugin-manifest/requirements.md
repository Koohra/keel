# KEEL-51 — Manifesto e marketplace do plugin para o Codex

Source: https://github.com/Koohra/keel/issues/51 (épico #50) · Folder: keel/features/KEEL-51-codex-plugin-manifest/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> O repo tem só o layout do Claude Code: `.claude-plugin/plugin.json` e `.claude-plugin/marketplace.json` (plugins `keel` na raiz e `keel-docs` em `plugins/keel-docs`). O Codex usa um manifesto portátil `plugin.json` na raiz do plugin (ou o legado `.codex-plugin/plugin.json`) e lê marketplace em `.agents/plugins/marketplace.json`; ele também aceita `.claude-plugin/marketplace.json` como formato legado. A descrição do marketplace diz "for Claude Code".
> O que fazer: verificar na prática se `codex plugin marketplace add Koohra/keel` já funciona só com o `.claude-plugin/marketplace.json` atual; se não funcionar, adicionar o manifesto do Codex para `keel` e `keel-docs` e o `.agents/plugins/marketplace.json`, sem mexer no layout do Claude Code. Versão única nos dois manifestos. Descrições neutras ("for Claude Code and Codex").
> Critérios de aceite: `codex plugin marketplace add Koohra/keel` (e com `--ref <branch>`) lista `keel` e `keel-docs`, e os dois instalam no Codex; depois de instalar, o Codex lista as skills `setup`, `story` e `write`; `claude plugin validate .` e `claude plugin validate plugins/keel-docs` continuam passando; teste em `test/manifest.test.mjs` garante que a versão é a mesma em todos os manifestos.

## Goal
O Keel pode ser adicionado como marketplace no Codex e instalado de lá, sem mudar nada para quem usa o Claude Code. [source: issue #51; issue #50]

## Out of scope
- Hooks no Codex (`apply_patch`, `CLAUDE_PROJECT_DIR`): #52.
- Texto e caminhos das skills (`CLAUDE_SKILL_DIR`, `allowed-tools`): #53.
- Revisor como subagente do Codex: #54. README, CI e release: #55.

## Rules and acceptance criteria
R1. THE repo SHALL trazer um manifesto portátil `plugin.json` na raiz de `keel` e em `plugins/keel-docs`, com `$schema`, `name`, `version` e `description`. [source: issue #51; https://developers.openai.com/codex/plugins/build]
  - AC-1.1 GIVEN os arquivos do repo WHEN o teste lê `plugin.json` e `plugins/keel-docs/plugin.json` THEN os nomes são `keel` e `keel-docs` e o `$schema` aponta para `plugin.schema.json`.
R2. THE repo SHALL trazer `.agents/plugins/marketplace.json` catalogando `keel` (raiz) e `keel-docs` (`./plugins/keel-docs`), com `policy` e `category` em cada entrada. [source: issue #51; https://developers.openai.com/codex/plugins/build]
  - AC-2.1 GIVEN os arquivos do repo WHEN o teste lê o marketplace do Codex THEN as fontes são `local` em `./` e `./plugins/keel-docs`, com `policy.installation` `AVAILABLE`.
R3. THE version SHALL ser a mesma nos quatro manifestos (`.claude-plugin/plugin.json`, `plugin.json` e os dois de `keel-docs`). [source: issue #51]
  - AC-3.1 GIVEN os quatro manifestos WHEN o teste compara as versões THEN todas são iguais e semver.
R4. THE descrições SHALL não prender o Keel ao Claude Code. [source: issue #51]
  - AC-4.1 GIVEN os manifestos WHEN o teste lê as descrições THEN o marketplace do Claude Code diz "Claude Code and Codex" e nenhuma diz só "for Claude Code".
R5. WHEN o marketplace é adicionado no Codex THE Codex SHALL listar `keel` e `keel-docs`, instalar os dois e listar as skills `setup`, `story` e `write`. [source: issue #51]
  - AC-5.1 GIVEN o Codex CLI WHEN o dev roda `codex plugin marketplace add Koohra/keel --ref feat/codex-plugin-manifest` THEN os dois plugins aparecem e instalam, com as três skills. (manual)

## Explicit obligations
- Existing behavior that must not change: `.claude-plugin/` de `keel` e `keel-docs` fica como está (só a descrição do marketplace muda); `claude plugin validate .` e `claude plugin validate plugins/keel-docs` passam. [source: issue #51; issue #50]

## Conflicts found
- `docs/specification.md` (decisões) diz "Hosts: Só Claude Code; Codex adiado" (2026-11-18). O épico #50 retoma o Codex com prioridade média; a linha da spec fica para #55, que atualiza README e docs. [source: docs/specification.md; issue #50]

## Questions and assumptions
- [ASSUMPTION] Não deu para verificar na prática se o `.claude-plugin/marketplace.json` sozinho basta: o Codex CLI não pôde ser instalado neste ambiente. Os manifestos do Codex entram de qualquer forma; não mudam nada no Claude Code. [source: dev on 2026-11-23, sessão sem Codex]
- [ASSUMPTION] `source` local com `path: "./"` vale para o plugin na raiz do marketplace; a doc só exige que o caminho comece com `./` e fique dentro da raiz. AC-5.1 confirma. [source: https://developers.openai.com/codex/plugins/build]
- [ASSUMPTION] Sem `hooks` no manifesto portátil, o Codex descobre `hooks/hooks.json` sozinho; fazer esses hooks funcionarem no Codex é o #52. [source: https://developers.openai.com/codex/plugins/build]
- [ASSUMPTION] `category: "Coding"` e `authentication: "ON_INSTALL"`: a doc pede os campos; o Keel não tem autenticação. [source: https://developers.openai.com/codex/plugins/build]
<!-- frozen after approval: end -->

## Changes after confirmation
not applicable
