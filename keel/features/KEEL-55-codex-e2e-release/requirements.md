# KEEL-55 — Codex: ponta a ponta, CI, release e README

Source: https://github.com/Koohra/keel/issues/55 · Folder: keel/features/KEEL-55-codex-e2e-release/ · Level: standard
Status: confirmed by Miguel on 2026-11-27

<!-- frozen after approval: start -->
## Original story
> Parte do épico #50. Fecha o épico.
>
> ## Contexto
>
> Hoje a validação do plugin é toda do Claude Code: CI roda `npm test` (Ubuntu e Windows) e `claude plugin validate .`; `docs/release.md` exige `claude plugin eval` (acionamento e fases, teto de US$ 35); o README diz "Ainda não cobre o Codex" e só ensina a instalar no Claude Code.
>
> ## O que fazer
>
> - Um teste ponta a ponta no Codex (`codex exec` não interativo) sobre `fixtures/node-mini`: história `standard` da triagem ao fechamento, ou pelo menos triagem, um bloqueio de código fora da fase e um commit bloqueado sem aprovação. Seguir a ADR-003 (testes enxutos, sem resultados no repo).
> - Validação do manifesto do Codex no CI, se houver comando para isso; se não houver, um teste em `test/manifest.test.mjs` com o schema da doc.
> - `docs/release.md`: passo de release para o Codex (instalar pelo marketplace, rodar o ponta a ponta), com teto de custo.
> - README: instalação no Codex (`codex plugin marketplace add Koohra/keel`), aprovação dos hooks em `/hooks`, diferenças conhecidas entre os dois agentes. `CHANGELOG.md` com a versão que traz o Codex.
>
> ## Critérios de aceite
>
> - [ ] O ponta a ponta no Codex passa e tem o comando registrado em `docs/release.md`.
> - [ ] CI continua verde no Ubuntu e no Windows, com a checagem do manifesto do Codex.
> - [ ] README sem "Ainda não cobre o Codex", com instalação e limitações no Codex.
> - [ ] CHANGELOG e versão atualizados nos manifestos dos dois agentes.
>
> ## Dependências
>
> Depende de #51, #52, #53 e #54.

## Goal
Provar que o Keel roda de verdade no Codex e deixar isso conferido a cada mudança: o CI instala o plugin pelo marketplace do Codex e confere que as skills aparecem, um ponta a ponta com `codex exec` mostra os portões funcionando, e README, release, product.md e CHANGELOG passam a tratar o Codex como agente suportado. [source: https://github.com/Koohra/keel/issues/55; https://github.com/Koohra/keel/issues/50]

## Out of scope
- História `standard` inteira da triagem ao fechamento no Codex: o ponta a ponta cobre o mínimo que a issue aceita (triagem, bloqueio fora da fase, commit sem aprovação). [source: issue #55 "O que fazer" item 1]
- Evals de acionamento e de fases (`claude plugin eval`) rodando no Codex: não há `plugin eval` no Codex; ficam só no Claude Code.
- Revisor isolado no ponta a ponta do Codex: entregue e testado no #54.
- Tag e release no GitHub: passo 9 do `docs/release.md`, depois do merge.

## Rules and acceptance criteria
R1. THE CI SHALL instalar o `keel` e o `keel-docs` pelo marketplace do Codex a partir do próprio repo, no Ubuntu e no Windows, e falhar se o Codex não listar as skills `keel:story`, `keel:setup` e `keel-docs:write`. [source: issue #55 critério 2; Codex CLI 0.172.0 não tem `plugin validate`, mas `plugin marketplace add`, `plugin add` e `debug prompt-input` rodam sem login, conferido em 2026-11-27]
  - AC-1.1 GIVEN o texto que o Codex mostra ao modelo (`codex debug prompt-input`) WHEN faltam uma ou mais das três skills THEN o script de checagem diz quais faltam e sai com código diferente de 0; com as três, sai com 0.
  - AC-1.2 GIVEN o `.github/workflows/ci.yml` WHEN o teste o lê THEN há um job no Ubuntu e no Windows que instala uma versão fixa do Codex CLI e roda a checagem. O job é um check como `test` e `plugin-validate`: falha de instalação do Codex ou de rede deixa o job vermelho, e quem olha decide se é do Keel.
  - AC-1.3 GIVEN o `npm test` numa máquina sem o Codex WHEN roda THEN os testes do AC-1.1 passam, porque testam a função que lê o texto do prompt, sem chamar o Codex.
R2. THE ponta a ponta no Codex SHALL rodar `codex exec` sobre cópias de `fixtures/node-mini`, com o plugin instalado pelo marketplace num `CODEX_HOME` temporário, e conferir três casos pelo estado final da pasta, não pelo texto da resposta. [source: issue #55 "O que fazer" item 1; ADR-003]
  - AC-2.1 Triagem: GIVEN a fixture numa branch `feat/APP-8-cadastro` sem história WHEN o dev pede para começar a APP-8 com o texto da história THEN existe `keel/features/APP-8-*/state.json` e o nível não foi confirmado (o agente para no portão).
  - AC-2.2 Bloqueio fora da fase: GIVEN a APP-8 na fase de requisitos WHEN o dev pede para mudar `src/users.js` direto THEN o `--json` do `codex exec` mostra uma tentativa de mudar `src/users.js` (edição ou comando) e o arquivo não muda. Sem tentativa, o caso falha: o portão não foi exercitado.
  - AC-2.3 Commit sem aprovação: GIVEN a T1 da APP-8 pronta para commit e sem aprovação gravada WHEN o dev pede o commit sem aprovar THEN o `--json` mostra um comando com `git commit`, o `HEAD` não muda e o `state.json` não tem aprovação de commit. Sem tentativa, o caso falha. Como o sandbox é `danger-full-access`, o que barra o commit é o hook do Keel.
  - AC-2.4 GIVEN uma rodada WHEN termina THEN o script imprime uma linha por caso (passou ou o que falhou), o total de tokens de entrada e de saída e sai com 0 só se os três passaram; `codex exec` que sai com erro, ou sem `turn.completed`, faz o caso falhar; nada é gravado no repo.
  - AC-2.5 GIVEN um caso WHEN o `codex exec` passa de 10 minutos THEN o script o interrompe e o caso falha por tempo.
R3. THE `docs/release.md` SHALL ter o passo do Codex: instalar pelo marketplace, rodar o ponta a ponta com o comando exato e o teto de custo da rodada. [source: issue #55 critério 1]
  - AC-3.1 GIVEN o `docs/release.md` WHEN o teste o lê THEN ele cita `codex plugin marketplace add`, o comando do ponta a ponta, um teto em US$ e os passos para quem não conhece o repo: `git clone`, instalar o Codex CLI na versão fixa, `codex login` e o que devolver.
R4. THE README e o `keel/product.md` SHALL tratar o Codex como agente suportado: sem "Ainda não cobre o Codex" nem "Não cobre o Codex nesta versão", com instalação no Codex (`codex plugin marketplace add Koohra/keel`), aprovação dos hooks em `/hooks` e as diferenças conhecidas entre os dois agentes. [source: issue #55 critério 3; coordenador em 2026-11-27 (tirar a linha do product.md)]
  - AC-4.1 GIVEN o README e o product.md WHEN o teste os lê THEN nenhuma das duas frases aparece, a visão do product.md cita o Codex, e o README tem a instalação no Codex, `/hooks` e uma seção de diferenças que cita no mínimo: aprovação dos hooks em `/hooks`, o revisor instalado pelo setup em `.codex/agents/keel-reviewer.toml`, o Codex não ler `CLAUDE.md` e os evals (`claude plugin eval`) existirem só no Claude Code.
  - AC-4.2 GIVEN o `docs/specification.md` WHEN o teste o lê THEN a tabela de decisões tem a linha nova dos hosts (Claude Code e Codex, épico #50) e mantém a antiga.
R5. THE quatro manifestos (`.claude-plugin/plugin.json`, `plugin.json`, `plugins/keel-docs/.claude-plugin/plugin.json`, `plugins/keel-docs/plugin.json`; os dois `marketplace.json` não têm versão) SHALL subir juntos para a versão que traz o Codex, e o `CHANGELOG.md` SHALL ter essa versão com data no lugar do `[Unreleased]`. [source: issue #55 critério 4; docs/release.md passos 6 e 7]
  - AC-5.1 GIVEN os manifestos e o CHANGELOG WHEN o teste os lê THEN a versão é a mesma nos quatro e o CHANGELOG tem uma seção `## [<versão>] - <data>` com ela e o link no fim; o passo 6 do `docs/release.md` passa a citar os quatro manifestos.

## Explicit obligations
- Edge cases: Windows (o Codex CLI do npm é um `.cmd`; caminhos com espaço); máquina sem login no Codex (o ponta a ponta para e diz como logar, sem gastar nada).
- Invariants (must never happen): o ponta a ponta mexe no `~/.codex` do dev (usa `CODEX_HOME` temporário e só copia o `auth.json`); resultado de rodada versionado no repo [source: ADR-003]; script de teste com dependência fora de `node:` [source: ADR-004].
- Existing behavior that must not change: jobs `test` e `plugin-validate` do CI; `npm test` sem o Codex instalado; passos do Claude Code no `docs/release.md`, exceto o passo 6, que ganha os manifestos do Codex (R5).
- Errors and expected responses: Codex ausente ou sem login → mensagem dizendo o que falta e código diferente de 0.

## Questions and assumptions
- [ASSUMPTION] A versão que traz o Codex é `2.0.0-beta.1`: o piloto numa história real ainda não aconteceu, então segue beta. [source: CHANGELOG.md `[2.0.0-beta.0]` "Falta o piloto numa história real antes da 2.0.0"]
- [ASSUMPTION] O ponta a ponta roda com `--dangerously-bypass-hook-trust` (a aprovação em `/hooks` é interativa) e com sandbox `danger-full-access` numa pasta temporária, para que o commit seja barrado pelo hook do Keel e não pelo sandbox, que protege o `.git` no `workspace-write`. [source: `codex exec --help` 0.172.0]
- [ASSUMPTION] A rodada de verdade do ponta a ponta precisa de um Codex logado; nem este ambiente nem o Miguel têm, então quem roda é uma pessoa de fora com o Codex, antes do merge. Por isso o passo do `docs/release.md` é autocontido: clonar a branch, instalar o Codex CLI, logar, rodar um comando e devolver a saída. [source: Miguel on 2026-11-27]
- [ASSUMPTION] Teto de US$ 5 por rodada do ponta a ponta no Codex (três casos curtos), além do teto de US$ 35 do Claude Code. É um valor de referência, sem fonte de preço: o Codex não informa custo no `--json`, o script imprime os tokens e quem roda confere no painel da OpenAI; passar do teto não muda o código de saída, mas vai na linha da rodada nas notas.

## Conflicts found
- `keel/product.md#what-it-does-not-do` ("Não cobre o Codex nesta versão") e a visão ("plugin do Claude Code") mudam nesta história, como o KEEL-53 deixou combinado.
- `docs/specification.md` (decisão "Hosts: Só Claude Code; Codex adiado", 2026-11-18) ganha uma linha nova com a decisão do épico #50, sem apagar a antiga.

## Changes after confirmation
not applicable
<!-- frozen after approval: end -->
