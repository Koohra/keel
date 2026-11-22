# Como lançar uma versão

Checklist curto, seguido a cada versão. Custos e camadas de teste estão em [specification.md](specification.md#estratégia-de-testes).

1. `npm test` passa e o CI está verde no Ubuntu e no Windows.
2. `claude plugin validate .` e `claude plugin validate plugins/keel-docs` passam.
3. Evals de acionamento e das etapas mudadas passam (`claude plugin eval`, 1 run, depois 3), dentro do teto de US$ 35 da release.
4. Ponta a ponta: duas histórias na fixture `fixtures/node-mini` chegam a `done` com `check-feature.mjs` saindo com 0, uma sessão nova por task.
5. Uma linha da rodada nas notas: data, commit, modelo, versão do Claude Code, casos passados e custo. Resultados ficam fora do repo.
6. A versão sobe junto em `.claude-plugin/plugin.json` e `plugins/keel-docs/.claude-plugin/plugin.json` (SemVer; `-beta.N` antes do piloto).
7. `CHANGELOG.md`: a seção `[Unreleased]` vira a nova versão com a data, e os links do fim são atualizados.
8. Instalação conferida numa configuração limpa: `/plugin marketplace add Koohra/keel`, `/plugin install keel@keel` e `/plugin install keel-docs@keel`.
9. Depois do merge, tag `v<versão>` na `main` e release no GitHub com o trecho do changelog.
