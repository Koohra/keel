# Fase: leitura das fontes

Objetivo: juntar o que a história precisa, com a origem de cada coisa. Nenhum portão do dev aqui.

1. Gere o repo map, por script:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/repo-map.mjs" --budget 1500 --focus <term1,term2>`
   Use como foco duas a cinco palavras da história (entidades, telas, endpoints), separadas por vírgula e sem espaço. O mapa lista arquivos com definições e linhas, os mais referenciados primeiro. Ele é descartável: não grave nem resuma em arquivo.
2. Pelo mapa, escolha onde a história toca e abra só esses arquivos. Cite como `arquivo:linha`.
3. Leia os títulos do `keel/product.md` e carregue só as seções relevantes. Liste `keel/adrs/` e abra só as ADRs que a história toca. Se precisar de uma fonte de novo depois, releia o original em vez de confiar num resumo.
4. Identifique o comportamento existente que a história toca e que não pode mudar, com a fonte.
5. Se o nível não é `trivial`, crie `keel/features/<KEY>-<slug>/requirements.md` a partir de `${CLAUDE_PLUGIN_ROOT}/templates/requirements.md`, ou complete o que o dev já escreveu sem apagar o texto dele:
   - Cabeçalho: link da história, pasta, `Level:` confirmado na triagem e `Status: draft`.
   - "Original story": o texto da história copiado sem edição, como citação.
   - Anote nas seções o que já tem fonte (comportamento que não muda, conflitos achados). O resto fica para a fase de requisitos.
   No nível `trivial` não há requirements.md: guarde a história e as fontes para o tasks.md.
6. Registre o mapa e avance:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" generated repo-map`
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" advance`

Não escreva código nem proponha implementação nesta fase.
