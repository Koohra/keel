---
name: setup
description: Prepara um projeto para o Keel, uma vez por projeto - revisa AGENTS.md e CLAUDE.md sem alterar, cria ou confere keel/product.md com a seção de princípios de engenharia, keel/adrs/ e keel/architecture.json com testes de arquitetura. Use quando o dev pedir para configurar, preparar ou instalar o Keel num projeto, ou quando uma história não puder começar por falta de keel/product.md.
---

# Setup do Keel (etapa 0)

Objetivo: o projeto ter o contexto durável antes da primeira história. Responda no idioma do dev.
Tudo aqui é proposta: nada é gravado sem o dev aprovar o trecho exato. Faça uma pergunta por vez,
com a opção recomendada.

Scripts (Node, sem dependências), rodados na raiz do projeto:
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-context.mjs" <comando>`: AGENTS.md e CLAUDE.md.
- `node "${CLAUDE_PLUGIN_ROOT}/scripts/arch-check.mjs"`: regras de `keel/architecture.json`.

Modelos: `${CLAUDE_PLUGIN_ROOT}/templates/principles.md`, `${CLAUDE_PLUGIN_ROOT}/templates/architecture.json`,
`${CLAUDE_PLUGIN_ROOT}/templates/agents.md`.

## 1. Revisão do AGENTS.md e do CLAUDE.md (sempre, sem alterar nada)

1. Rode `keel-context.mjs review`. É uma revisão que lê e não grava: não edite nenhum arquivo neste passo.
2. Leia os arquivos apontados e classifique cada regra que o script não pegou:
   - **conflita com o fluxo** (ex.: "commite direto", "pule testes", "não peça confirmação");
   - **comando do projeto** (teste, lint, build): vai para "Checagem" do product.md com a origem `(AGENTS.md:L<n>)`;
   - **princípio de engenharia**: fica onde está; a seção de princípios só aponta para ele. Se for checável,
     sugira virar lint ou teste do projeto;
   - o resto fica como está, sem comentário.
3. Antes de mostrar uma citação sua, confira com `keel-context.mjs quote <arquivo> <linha> "<trecho>"`.
   Citação que não confere não aparece.
4. Mostre o relatório: conflitos com arquivo e linha, comandos mortos, tamanho, visibilidade e fluxos de
   outras ferramentas. Para cada conflito o dev escolhe: (a) mudar o próprio arquivo (você mostra o texto
   sugerido e não aplica), (b) a regra vale só fora das histórias do Keel, ou (c) manter, sabendo que o hook
   bloqueia durante uma história.

Visibilidade (o relatório diz qual caso é):
- Só AGENTS.md: ok. Nunca crie CLAUDE.md nesse caso: com CLAUDE.md o Claude Code deixa de ler o AGENTS.md.
- Os dois sem import no CLAUDE.md: avise que o Claude não vê o AGENTS.md. Mostre a linha (`@AGENTS.md` no
  CLAUDE.md da raiz, `@../AGENTS.md` em `.claude/CLAUDE.md`) e só aplique com aprovação, com
  `keel-context.mjs import-agents [--file .claude/CLAUDE.md]`.
- CLAUDE.md symlink para AGENTS.md: avise da carga dupla e sugira trocar por um CLAUDE.md com `@AGENTS.md`.
- Nenhum dos dois: ofereça o modelo `templates/agents.md` (passo 5).

## 2. product.md e ADRs

- Confira se `keel/product.md` e `keel/adrs/` existem e se o product.md tem até cerca de 200 linhas.
- Sem product.md, ofereça criar com o dev: visão, o que faz, o que não faz, glossário, decisões e princípios.
  Não copie o que o código já diz. Documentação antiga: proponha destino ou descarte para cada fonte.
- ADRs no formato `keel/adrs/ADR-NNN-<slug>.md`, com Status, Contexto, Decisão, Consequências e Confirmação.

## 3. Princípios de engenharia (seção do product.md)

Parta de `templates/principles.md` e ajuste com o dev:
- No máximo 10 regras, cada uma marcada `[hook]` (checada por script) ou `[review]` (rubrica de design).
- Degrau de arquitetura de cada módulo, com motivo. Clean Architecture e DDD não são o padrão: a regra
  universal é a direção das dependências; o resto segue o degrau.
- Exemplares a seguir e caminhos que não se copia.
- Checagem: comandos de teste, lint com complexidade e arquitetura, cada um com a origem quando vier do AGENTS.md.

## 4. keel/architecture.json e testes de arquitetura

1. Proponha `keel/architecture.json` a partir das pastas reais, no formato de `templates/architecture.json`:
   componentes, regras com `fix`, `noCycles` e `baseline`. Mostre e espere aprovação.
2. Rode `arch-check.mjs`. Ele é um varredor de imports aproximado (JS/TS e Python); regra que casa com zero
   arquivos falha.
3. Prove cada regra com uma violação plantada: escreva um import proibido, rode `arch-check.mjs`, mostre a
   falha com a correção e remova o import. Regra que não falha está errada.
4. Código existente com violações: mostre a lista e, com aprovação, grave a baseline com
   `arch-check.mjs --write-baseline`. Assim só violação nova falha.
5. Ferramenta nativa da linguagem (ArchUnit, Konsist, NetArchTest/ArchUnitNET, dependency-cruiser,
   import-linter, go-arch-lint): proponha a tradução do architecture.json e só instale com autorização
   explícita. O comando escolhido vai para "Checagem".

## 5. AGENTS.md (opcional)

- Sem AGENTS.md: ofereça `templates/agents.md`. O dev preenche ou responde uma pergunta por seção; seção sem
  resposta sai. Não gere o conteúdo a partir do código.
- Com AGENTS.md: se o dev quiser, proponha uma reestruturação nas seções do modelo que só move e remove
  linhas, sem reescrever o texto do dev. Escreva a proposta num arquivo temporário, rode
  `keel-context.mjs restructure-check AGENTS.md <proposta>` e só mostre se passar. Mostre o diff e aplique
  só com aprovação.
- Bloco do Keel: o padrão é "não". Ofereça só se o relatório trouxer `outros-agentes` (Copilot, Cursor, Gemini).
  Com aprovação, `keel-context.mjs block apply --file <AGENTS.md ou CLAUDE.md>`: um arquivo só, até 6 linhas,
  nada fora do bloco muda. `block remove --file <arquivo>` tira.
- Depois de qualquer mudança nesses arquivos, rode `keel-context.mjs check`.

## Portão

O dev aprova o product.md e as ADRs iniciais. Sem isso, nenhuma história começa.
