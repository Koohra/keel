---
name: story
description: Conduz uma história (ticket do Jira ou de outra ferramenta) pelo fluxo do Keel, uma fase por vez, perguntando ao script qual é o próximo passo. Use quando o dev pedir para começar, retomar, continuar ou destravar uma história, feature ou ticket com o Keel, ou falar de requirements.md, design.md, tasks.md ou state.json em keel/features/. Não use para dúvidas gerais, explicar código ou mudanças fora de uma história.
allowed-tools: Bash(node "${CLAUDE_PLUGIN_ROOT}/scripts/*)
---

# Keel: história

Você conduz uma história do dev pelo fluxo do Keel. Quem decide a ordem das fases e os portões é o script de estado; você usa julgamento dentro de cada fase. Responda no idioma do dev.

## Como andar no fluxo

1. Rode tudo a partir da raiz do projeto. Se `keel/product.md` não existe, pare: diga que o Keel precisa do product.md antes da primeira história e ofereça criá-lo com o dev.
2. Pergunte a fase ao script, sempre antes de qualquer outra ação, inclusive ao retomar:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" next`
   A saída diz `phase`, `instructions` (arquivo da fase), `missing` (o que falta para sair dela) e `expired` (aprovação que venceu porque o documento mudou).
3. Se o `next` diz que não há história para a branch atual, é uma história nova. Confirme com o dev a chave (código do Jira ou parecido), um slug curto, o título, o link e a branch. A branch é criada pelo dev; se estiver na principal, peça que ele crie. Depois:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" init --key <KEY> --slug <slug> --title "<title>" [--source <link>]`
   Passe `--source` só se a história tiver link; não invente um.
4. Leia `${CLAUDE_SKILL_DIR}/<instructions>` (por exemplo `${CLAUDE_SKILL_DIR}/phases/triage.md`) e siga. Carregue só a fase atual. Se o arquivo da fase não existe nesta versão do Keel, diga ao dev em que fase a história está e pare.
5. Quando o trabalho da fase terminar, peça para avançar:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" advance`
   Se o script recusar, mostre ao dev o que falta, com o motivo que ele deu, e resolva dentro da fase. Não tente outro caminho.
6. Depois de cada `advance` aceito, volte ao passo 2.

Se `expired` não estiver vazio, diga ao dev qual documento mudou depois da aprovação e que ele precisa ser confirmado de novo.

## O que nunca fazer

- Escrever, copiar ou apagar `state.json`. Só o `keel-state.mjs` muda o estado; o hook bloqueia o resto.
- Rodar `level` ou `approve` (de documento, de commit ou de deltas) sem que o dev tenha dito, nesta conversa, que confirma o nível, aprova o documento, o commit ou os deltas. Pergunta sua sem resposta não é aprovação. Use o nome do dev em `--by` (pergunte ou use `git config user.name`).
- Editar código do projeto antes da fase de implementação, ou commitar sem a aprovação do commit gravada.
- Pular, reordenar ou declarar fase cumprida por conta própria.

## Regras de todas as fases

- Fonte em todo fato: `keel/product.md#seção`, `ADR-NNN`, `arquivo:linha`, link da história ou `dev on YYYY-MM-DD`. Sem fonte, é `[QUESTION]` ou `[ASSUMPTION]`.
- Nada inventado: categoria sem informação recebe "sem orientação encontrada"; resultado esperado desconhecido é pergunta, não critério.
- Perguntas ao dev uma por vez, cada uma com a opção que você recomenda, no máximo cerca de cinco por documento.
- Contexto mínimo: só as seções do product.md e as ADRs que a história toca; código sob demanda.
- Checagem que não rodou é "não rodou", nunca "passou".
- Decisão com consequência (contrato externo, modelo de dados, dependência, consistência, custo) é do dev: apresente opções, consequências e recomendação.
- Foco: faça só o que a fase e a task pedem, e termine. Não proponha nem comece trabalho que ninguém pediu (melhoria, refatoração vizinha, teste ou feature a mais, "posso também..."). Achado fora do escopo vira uma linha em "Implementation notes" do tasks.md, sem oferta. A resposta ao dev termina no resultado ou na pergunta do portão.
