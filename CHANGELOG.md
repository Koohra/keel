# Changelog

Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/). Versões: [SemVer](https://semver.org/lang/pt-BR/). Os dois plugins (`keel` e `keel-docs`) andam com a mesma versão.

## [Unreleased]

### Changed

- A skill `story` sugere uma conversa nova ao sair de requirements, confirmation e tasks, como já fazia a cada task, para retomar a história sem o custo da conversa longa (#32, KEEL-32).
- A proposta de commit da task traz o `git diff --stat` e o diff no próprio texto da resposta; saída de ferramenta e "o diff está acima" não contam (#38, KEEL-38).
- A marca `Status: done (<hash>)` vai num commit próprio, só da pasta da história, logo após o commit da task; o hook aceita esse commit quando não sobra código fora da pasta (#39, KEEL-38).
- O fechamento mostra a descrição do PR na resposta e não deixa arquivo solto no projeto; a saída de implementation também sugere conversa nova; a pergunta sobre conflito com ADR nos requisitos diz que o design só rascunha a ADR e que ela nasce no fechamento (#40, #41, KEEL-40).

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

[Unreleased]: https://github.com/Koohra/keel/compare/v2.0.0-beta.0...HEAD
[2.0.0-beta.0]: https://github.com/Koohra/keel/releases/tag/v2.0.0-beta.0
