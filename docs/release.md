# Como lançar uma versão

Checklist curto, seguido a cada versão. Custos e camadas de teste estão em [specification.md](specification.md#estratégia-de-testes).

1. `npm test` passa e o CI está verde no Ubuntu e no Windows.
2. `claude plugin validate .` e `claude plugin validate plugins/keel-docs` passam.
3. Evals de acionamento e das etapas mudadas passam (`claude plugin eval`, 1 run, depois 3), dentro do teto de US$ 35 da release.
4. Ponta a ponta: duas histórias na fixture `fixtures/node-mini` chegam a `done` com `check-feature.mjs` saindo com 0, uma sessão nova por fase e por task.
5. Uma linha da rodada nas notas: data, commit, modelo, versão do Claude Code, casos passados e custo. Resultados ficam fora do repo.
6. A versão sobe junto nos quatro manifestos: `.claude-plugin/plugin.json`, `plugin.json`, `plugins/keel-docs/.claude-plugin/plugin.json` e `plugins/keel-docs/plugin.json` (SemVer; `-beta.N` antes do piloto). O `test/manifest.test.mjs` confere que são iguais.
7. `CHANGELOG.md`: a seção `[Unreleased]` vira a nova versão com a data, e os links do fim são atualizados.
8. Instalação conferida numa configuração limpa: `/plugin marketplace add Koohra/keel`, `/plugin install keel@keel` e `/plugin install keel-docs@keel`.
9. Codex: o job `codex` do CI passou (instala pelo marketplace e confere as skills) e o ponta a ponta no Codex passou, com teto de US$ 5 por rodada. Os passos estão em [Ponta a ponta no Codex](#ponta-a-ponta-no-codex); quem roda não precisa conhecer o repo.
10. Depois do merge, tag `v<versão>` na `main` e release no GitHub com o trecho do changelog.

## Ponta a ponta no Codex

Três casos com `codex exec` em cópias da `fixtures/node-mini`: triagem de uma história nova (para no portão do nível), edição de código fora da fase (o hook do Keel barra) e commit sem aprovação (o hook barra). O script instala o Keel pelo marketplace do Codex num `CODEX_HOME` temporário, copia de lá só o seu `auth.json` e não mexe no seu `~/.codex`. Nada é gravado no repo. Leva uns 10 minutos.

Precisa de Node.js 22 ou mais novo, git e uma conta que use o Codex (login do ChatGPT ou chave da API da OpenAI). Teto: US$ 5 por rodada; o Codex não informa custo, então confira no painel da OpenAI se usar chave. Com o login do ChatGPT, conta no limite do plano.

1. Clone a branch e entre na pasta:
   ```
   git clone --branch <branch> https://github.com/Koohra/keel.git
   cd keel
   ```
2. Instale o Codex CLI na versão do CI:
   ```
   npm install --global @openai/codex@0.172.0
   ```
3. Faça login (abre o navegador; ou defina `CODEX_API_KEY` com uma chave da API):
   ```
   codex login
   ```
4. Rode o ponta a ponta:
   ```
   node evals/codex/run.mjs e2e
   ```
5. Devolva a saída inteira do passo 4. Ela tem uma linha por caso (`ok` ou `fail` com o motivo) e uma linha final com os casos que passaram, a versão do Codex e os tokens. Passou se a linha final diz `3/3 cases passed`.

Para conferir só a instalação, sem login e sem custo: `node evals/codex/run.mjs install`, o mesmo comando do CI. O Keel também roda na mão com `codex plugin marketplace add Koohra/keel`, como no README.

No Windows, rode num terminal com o git no PATH (Git Bash ou PowerShell). Se um caso passar de 10 minutos e a rodada não terminar, rode no Linux ou no macOS.
