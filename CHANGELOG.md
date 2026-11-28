# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versões: [SemVer](https://semver.org/lang/pt-BR/). Os dois plugins (`keel` e `keel-docs`) andam com a mesma versão.

## [Unreleased]

### Added

- `keel/architecture.json` aceita componente planejado (`{ "globs": [...], "planned": true }`): sem arquivos fica `pending` em vez de erro, e a regra passa a valer com o primeiro arquivo; com `coverage`, arquivo coberto fora de todo componente é órfão, aviso no hook e delta do `architecture.json` no fechamento, dentro da baseline (#63, KEEL-63).
- `task-metrics.mjs` acha dependência nova também em `requirements.txt`, `pyproject.toml`, `go.mod`, `*.csproj` e `pom.xml` mudados pela task (#63, KEEL-63).

### Changed

- O fechamento recusa a dispensa `Architecture: não se aplica` quando a história criou código-fonte e não há componente ativo, e mudança em `keel/architecture.json` entra nos deltas que o dev aprova (#63, KEEL-63).

## [2.0.0-beta.1] - 2026-11-27

O Keel passa a rodar no Codex, além do Claude Code.

### Added

- Manifesto portátil `plugin.json` para `keel` e `keel-docs` e marketplace do Codex em `.agents/plugins/marketplace.json`, sem mudar o layout do Claude Code; a versão é a mesma nos quatro manifestos (#51, KEEL-51).
- Os hooks valem no Codex: o `apply_patch` é lido arquivo por arquivo (criar, alterar, apagar e renomear) com as mesmas regras do `Edit`, a raiz do projeto vem da raiz git do `cwd` quando falta `CLAUDE_PROJECT_DIR`, e o README explica a aprovação dos hooks em `/hooks` (#52, KEEL-52).
- Revisor isolado no Codex: o setup instala `.codex/agents/keel-reviewer.toml`, gerado de `agents/reviewer.md` (`scripts/codex-reviewer.mjs install|check`); o PreToolUse mantém o `keel-reviewer` só leitura (edição bloqueada, shell só com comandos de leitura); as fases de confirmação e implementação chamam o agente com `fork_turns` `none` e gravam `unavailable` quando ele não roda (#54, KEEL-54).
- Codex no CI e na release: o job `codex` (Ubuntu e Windows) instala o Keel pelo marketplace do Codex e confere que as skills aparecem (`node evals/codex/run.mjs install`); o ponta a ponta `node evals/codex/run.mjs e2e` roda `codex exec` em três casos (triagem, código fora da fase e commit sem aprovação barrados pelo hook); `docs/release.md` traz os passos para quem roda sem conhecer o repo (#55, KEEL-55).

### Changed

- README, `keel/product.md` e especificação tratam o Codex como agente suportado: instalação no Codex, aprovação dos hooks em `/hooks` e as diferenças entre os dois agentes (#55, KEEL-55).
- A skill `story` sugere uma conversa nova ao sair de requirements, confirmation e tasks, como já fazia a cada task, para retomar a história sem o custo da conversa longa (#32, KEEL-32).
- A proposta de commit da task traz o `git diff --stat` e o diff no próprio texto da resposta; saída de ferramenta e "o diff está acima" não contam (#38, KEEL-38).
- A marca `Status: done (<hash>)` vai num commit próprio, só da pasta da história, logo após o commit da task; o hook aceita esse commit quando não sobra código fora da pasta (#39, KEEL-38).
- O fechamento mostra a descrição do PR na resposta e não deixa arquivo solto no projeto; a saída de implementation também sugere conversa nova; a pergunta sobre conflito com ADR nos requisitos diz que o design só rascunha a ADR e que ela nasce no fechamento (#40, #41, KEEL-40).
- As skills `story`, `setup` e `keel-docs:write` citam os arquivos do plugin por `<plugin>` (no Claude Code, `${CLAUDE_PLUGIN_ROOT}`) e por caminhos relativos à pasta da skill, e funcionam no Codex; o review do setup diz o que o Codex lê (`AGENTS.md`, `AGENTS.override.md`, nunca `CLAUDE.md`) (#53, KEEL-53).

### Fixed

- `evidence red` aceita o RED que falha numa asserção mesmo quando um processo filho do teste imprime `SyntaxError`; o arquivo de teste que não compila continua recusado (#37, KEEL-37).

## [2.0.0-beta.0] - 2026-11-22

Primeira versão completa do Keel 2: as 8 partes do plano estão na `main`. Falta o piloto numa história real antes da 2.0.0.

### Added

- Base do repo: manifesto, marketplace, `keel/product.md`, ADRs, modelos e CI no Ubuntu e no Windows (#9, parte 1).
- `validate-feature.mjs`, `keel-state.mjs` com aprovação por hash e hook que bloqueia escrita em `state.json` e código fora da fase (#10, parte 2).
- Skill `keel:story` com triagem, leitura com `repo-map.mjs`, requisitos e confirmação; agente revisor isolado (#11, parte 3).
- Princípios de engenharia: skill `keel:setup`, `architecture.json`, `arch-check.mjs` para JS/TS e Python, hooks `PostToolUse` e `SessionStart` (#12, parte 7).
- Design condicional e tasks com cobertura regra → task → teste (#14, parte 4).
- Loop da task em TDD (RED, GREEN, REFACTOR), `task-metrics.mjs`, review isolado, proposta de commit e hook `Stop` (#15, parte 5).
- Fechamento: convergência, deltas de product.md e ADRs, descrição do PR e `check-feature.mjs`; primeira história de ponta a ponta na fixture (#16, parte 6).
- Depuração com limite de 3 tentativas, regras para responder ao review e checklists de segurança, dados e contrato (#18).
- Plugin opcional `keel-docs` com a skill `keel-docs:write` e `doc-check.mjs` (#19, parte 8).
- Regra de foco na skill `story`: fazer só o que foi pedido; `approve commit` recusa arquivo fora do `Files:` da task (#23, KEEL-21).
- Licença MIT (#22).

### Changed

- Nomes estruturais (pastas, arquivos, marcadores, seções) em inglês; o texto dos documentos continua em português (#13).
- README reescrito, com a história do Keel e o comando de instalação correto: `/plugin marketplace add Koohra/keel` e `/plugin install keel@keel` (#22).

[Unreleased]: https://github.com/Koohra/keel/compare/v2.0.0-beta.1...HEAD
[2.0.0-beta.1]: https://github.com/Koohra/keel/compare/v2.0.0-beta.0...v2.0.0-beta.1
[2.0.0-beta.0]: https://github.com/Koohra/keel/releases/tag/v2.0.0-beta.0
