---
name: setup
description: Prepara um projeto para o Keel, uma vez por projeto - revisa AGENTS.md e CLAUDE.md sem alterar, cria ou confere keel/product.md com a seção de princípios de engenharia, keel/adrs/ e keel/architecture.json com testes de arquitetura. Use quando o dev pedir para configurar, preparar ou instalar o Keel num projeto, ou quando uma história não puder começar por falta de keel/product.md.
---

# Setup do Keel (etapa 0)

Objetivo: o projeto ter o contexto durável antes da primeira história. Responda no idioma do dev.
Tudo aqui é proposta: nada é gravado sem o dev aprovar o trecho exato. Faça uma pergunta por vez,
com a opção recomendada.

Linguagem simples: em cada decisão com consequência e em cada pergunta com opções, escreva para quem não é dev, o que serve também ao dev (não há modo leigo). Cada opção começa com uma frase sobre o que muda para o produto ou para o usuário, com as palavras do glossário do `keel/product.md` e sem jargão de processo (degrau, porta, adaptador, mapper, agregado); depois das opções, a recomendação, com o porquê na mesma linguagem. O termo técnico aparece só entre parênteses, depois da frase simples.

Repositório sem código-fonte (passo 3.1): toda pergunta do setup, também as do passo 2 sobre o product.md, segue o formato da entrevista: uma frase "por que importa", as opções e a recomendação, uma por vez, aceita com "sim".

Caminhos: `<plugin>` é a pasta do plugin: no Claude Code, `${CLAUDE_PLUGIN_ROOT}`; em outro agente, a pasta dois níveis acima deste SKILL.md. Troque `<plugin>` pelo caminho antes de rodar um comando.

Scripts (Node, sem dependências), rodados na raiz do projeto:
- `node "<plugin>/scripts/keel-context.mjs" <command>`: AGENTS.md e CLAUDE.md.
- `node "<plugin>/scripts/arch-check.mjs"`: regras de `keel/architecture.json`.

Modelos: `<plugin>/templates/principles.md`, `<plugin>/templates/architecture.json`,
`<plugin>/templates/agents.md`.

## 1. Revisão do AGENTS.md e do CLAUDE.md (sempre, sem alterar nada)

1. Rode `keel-context.mjs review`. É uma revisão que lê e não grava: não edite nenhum arquivo neste passo.
2. Leia os arquivos apontados e classifique cada regra que o script não pegou:
   - **conflita com o fluxo** (ex.: "commite direto", "pule testes", "não peça confirmação");
   - **comando do projeto** (teste, lint, build): vai para "Checks" do product.md com a origem `(AGENTS.md:L<n>)`;
   - **princípio de engenharia**: fica onde está; a seção de princípios só aponta para ele. Se for checável,
     sugira virar lint ou teste do projeto;
   - o resto fica como está, sem comentário.
3. Antes de mostrar uma citação sua, confira com `keel-context.mjs quote <file> <line> "<text>"`.
   Citação que não confere não aparece.
4. Mostre o relatório: conflitos com arquivo e linha, comandos mortos, tamanho, visibilidade e fluxos de
   outras ferramentas. Para cada conflito o dev escolhe: (a) mudar o próprio arquivo (você mostra o texto
   sugerido e não aplica), (b) a regra vale só fora das histórias do Keel, ou (c) manter, sabendo que o hook
   bloqueia durante uma história.
5. Sugestões de estrutura, depois dos conflitos, uma linha cada, com a fonte. Só sugira; não edite:
   - `commands`: sem comando de teste, build ou lint; peça os comandos exatos para a seção "Commands".
   - `sections`: seções do modelo que faltam; o dev acrescenta só as que o projeto precisa. Se a mensagem
     sugerir reestruturação, ofereça o passo 5.
   - `emphasis` e `rules`: ênfase em maiúsculas ou itens demais; sugira texto simples com o motivo, e que
     regra checável vire lint, teste ou hook do projeto.
   - Compare a abertura do arquivo com o README: visão geral que o repete vira um link para o README.
   - Indique o `/doctor prompt-audit` do Claude Code para achar regras velhas ou contraditórias.

Visibilidade (o relatório diz qual caso é):
- Só AGENTS.md: ok. Nunca crie CLAUDE.md nesse caso: com CLAUDE.md o Claude Code deixa de ler o AGENTS.md.
- Os dois sem import no CLAUDE.md: avise que o Claude não vê o AGENTS.md. Mostre a linha (`@AGENTS.md` no
  CLAUDE.md da raiz, `@../AGENTS.md` em `.claude/CLAUDE.md`) e só aplique com aprovação, com
  `keel-context.mjs import-agents [--file .claude/CLAUDE.md]`.
- CLAUDE.md symlink para AGENTS.md: avise da carga dupla e sugira trocar por um CLAUDE.md com `@AGENTS.md`.
- Nenhum dos dois: ofereça o modelo `<plugin>/templates/agents.md` (passo 5).

No Codex (o relatório traz um achado `info` a mais quando o caso pede):
- O Codex lê `AGENTS.md` (ou o override abaixo), nunca CLAUDE.md. Só AGENTS.md serve aos dois agentes.
- Só CLAUDE.md: o Codex não vê as instruções. Se o dev usa o Codex, sugira mover o texto para um AGENTS.md
  e deixar no CLAUDE.md só a linha `@AGENTS.md`; não aplique sem aprovação.
- `AGENTS.override.md` na raiz: o Codex lê esse arquivo no lugar do AGENTS.md, e o Claude Code não o lê.
  Avise o dev se as regras dos dois arquivos divergem.

## 2. product.md e ADRs

- Confira se `keel/product.md` e `keel/adrs/` existem e se o product.md tem até cerca de 200 linhas.
- Sem product.md, ofereça criar com o dev: visão, o que faz, o que não faz, glossário, decisões e princípios; "Quality goals" nasce no passo 3.1 em repositório sem código-fonte e, nos outros, só se o dev quiser.
  Não copie o que o código já diz. Documentação antiga: proponha destino ou descarte para cada fonte.
- ADRs no formato `keel/adrs/ADR-NNN-<slug>.md`, com Status, Contexto, Decisão, Consequências e Confirmação.

## 3. Engineering principles (seção do product.md)

Parta de `<plugin>/templates/principles.md` e ajuste com o dev:
- No máximo 10 regras, cada uma marcada `[hook]` (checada por script) ou `[review]` (rubrica de design).
- O quanto cada módulo é elaborado (degrau de arquitetura), com motivo, dito ao dev pelo que muda: mais barato
  de escrever agora ou mais fácil de mudar quando as regras crescerem. Clean Architecture e DDD não são o padrão:
  a regra universal é a direção das dependências; o resto segue o que foi declarado para o módulo (degrau).
- Exemplares a seguir e caminhos que não se copia.
- Checks: comandos de teste, lint com complexidade e arquitetura, cada um com a origem quando vier do AGENTS.md.

## 3.1 Repositório sem código-fonte: proposta de arquitetura

Use este ramo quando o repositório ainda não tem código-fonte (só README, licença, configuração ou documentos). Em repositório com código, pule para o passo 4.

1. Entrevista: no máximo 6 perguntas, uma por vez. Cada pergunta traz uma frase "por que importa" em linguagem simples, as opções e a sua recomendação; o dev aceita a recomendação com "sim". Temas, nesta ordem, pulando o que o dev já disse: quem usa e quantos; dado sensível (pessoal, financeiro, de saúde); serviços externos (pagamento, e-mail, login de terceiros); offline ou mobile; quem vai manter; o que o produto deve virar em 6 a 12 meses.
2. As respostas viram a seção "Quality goals" do `keel/product.md`: 3 a 5 cenários, cada um com contexto, estímulo e métrica. Se as respostas dão menos de 3, complete até 3 com cenários propostos pelo Keel, marcados como decisão do Keel. Mostre a seção e grave só com a aprovação do dev.
3. Abordagens: com os "Quality goals", apresente 2 ou 3 abordagens, uma por postura: mínima (o menos possível para a primeira versão), proporcional (o que os cenários pedem agora) e preparada para crescer (o que o cenário de 6 a 12 meses pede). Cada uma com uma frase sobre o que muda para o produto e uma linha sobre o que custa depois. A recomendação padrão é um starter conhecido da stack, conferido na web (documentação oficial do framework); sem acesso à web, diga que não conferiu e registre o starter na ADR-001 como `[ASSUMPTION]`. Costura entre partes do código (porta, adaptador) entra só quando um cenário de mudança dos "Quality goals" a justifica. Se o dev recusa todas as abordagens, faça uma pergunta sobre o que falta e proponha de novo.
4. "Tanto faz": quando o dev responde "tanto faz" a uma pergunta ou escolha, siga a recomendação e registre na ADR-001 ou nos "Quality goals" que foi decisão do Keel, não do dev. Se o dev recusa a entrevista, siga com as recomendações do Keel, registradas do mesmo jeito; o portão continua pedindo a ADR-001.
5. O que sai, com a abordagem aprovada. Mostre cada trecho e grave só com a aprovação do dev, um por vez:
   - a tabela "Rungs per module" do passo 3, agora com os módulos da abordagem e, no motivo de cada um, o cenário dos "Quality goals" que pede aquela quantidade de estrutura (o degrau);
   - a ADR-001 de arquitetura e stack em `keel/adrs/`: a abordagem e o starter escolhidos, com "Confirmation" apontando para as regras do `keel/architecture.json` que a conferem, e uma seção "Decisões adiadas", uma linha por decisão no formato "agora não, porque...";
   - o `keel/architecture.json` com os componentes da abordagem marcados `"planned": true` e `coverage` nas pastas onde o código vai nascer. A dispensa `Architecture: não se aplica` não vale neste ramo.
6. Rode `arch-check.mjs`: ele sai com 0 e mostra os componentes `pending`. Sem código, o arquivo fica sem `noCycles` nem baseline, que entram pelo delta do fechamento quando as pastas existirem. A prova por violação plantada do passo 4 fica para quando o primeiro arquivo do componente existir, e a ferramenta nativa do passo 4.5, para quando houver código; até lá, "Checks" usa o `arch-check.mjs` na linha Architecture. Depois siga para o passo 5.

## 4. keel/architecture.json e testes de arquitetura

1. Proponha `keel/architecture.json` a partir das pastas reais, no formato de `<plugin>/templates/architecture.json`:
   componentes, regras com `fix`, `noCycles` e `baseline`. Mostre e espere aprovação.
2. Rode `arch-check.mjs`. Ele é um varredor de imports aproximado (JS/TS e Python); regra que casa com zero
   arquivos falha.
3. Prove cada regra com uma violação plantada: escreva um import proibido, rode `arch-check.mjs`, mostre a
   falha com a correção e remova o import. Regra que não falha está errada.
4. Código existente com violações: mostre a lista e, com aprovação, grave a baseline com
   `arch-check.mjs --write-baseline`. Assim só violação nova falha.
5. Ferramenta nativa da linguagem (ArchUnit, Konsist, NetArchTest/ArchUnitNET, dependency-cruiser,
   import-linter, go-arch-lint): proponha a tradução do architecture.json e só instale com autorização
   explícita. O comando escolhido vai para "Checks".

## 5. AGENTS.md (opcional)

- Sem AGENTS.md: ofereça `<plugin>/templates/agents.md`. O dev preenche ou responde uma pergunta por seção; seção sem
  resposta sai. Não gere o conteúdo a partir do código.
- Com AGENTS.md: se o dev quiser, proponha uma reestruturação nas seções do modelo que só move e remove
  linhas, sem reescrever o texto do dev. Escreva a proposta num arquivo temporário, rode
  `keel-context.mjs restructure-check AGENTS.md <proposal>` e só mostre se passar. Mostre o diff e aplique
  só com aprovação.
- Bloco do Keel: o padrão é "não". Ofereça só se o relatório trouxer `other-agents` (Copilot, Cursor, Gemini).
  Com aprovação, `keel-context.mjs block apply --file <AGENTS.md or CLAUDE.md>`: um arquivo só, até 6 linhas,
  nada fora do bloco muda. `block remove --file <file>` tira.
- Depois de qualquer mudança nesses arquivos, rode `keel-context.mjs check`.

## 6. Revisor no Codex (só para quem usa o Codex)

Plugin do Codex não traz subagente: o revisor isolado vai para o projeto, em `.codex/agents/keel-reviewer.toml`, gerado de `agents/reviewer.md` do Keel.
1. Pergunte se o dev usa o Codex neste projeto. Se não, pule.
2. Mostre o caminho e diga que o arquivo é gerado e não deve ser editado à mão. Só com a aprovação do dev, rode
   `node "<plugin>/scripts/codex-reviewer.mjs" install`.
3. Se o comando disser que o arquivo difere, mostre isso ao dev; só com nova aprovação rode o mesmo comando com `--force`.
4. Diga que o Codex carrega o agente na próxima sessão e só em projeto confiável, e que o hook do Keel o mantém só leitura.

## Portão

O dev aprova o product.md e as ADRs iniciais. Sem isso, nenhuma história começa.
Em repositório sem código-fonte, as ADRs iniciais incluem a ADR-001 de arquitetura e stack do passo 3.1.
