# Fase: confirmação do entendimento

Objetivo: o dev concorda com o que vai ser construído antes de qualquer design, plano ou código.

1. Peça ao revisor isolado que procure bordas, exemplos e erros faltantes, com olhar de teste. Chame o agente `keel:reviewer` passando só o caminho do `requirements.md` e o pedido "revisão de requisitos"; não passe o histórico da conversa nem a sua opinião. Ele não reescreve o documento.
2. Registre o resultado, com o que de fato aconteceu:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" review requirements --result <ok|achados|unavailable>`
   Use `unavailable` se o agente não pôde rodar. Nunca chame a sua própria leitura de revisão independente.
3. Apresente ao dev um resumo curto:
   - objetivo em uma frase;
   - regras, uma linha cada (`R1 — ...`);
   - fora de escopo;
   - suposições que ele precisa aceitar;
   - conflitos, cada um com a decisão que você propõe;
   - achados do revisor e o que você sugere para cada um.
   Pergunte se ele aprova o requirements.md. Pare e espere.
4. Se o dev pedir mudança, edite o requirements.md, valide com `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-feature.mjs" <pasta>` e mostre de novo o que mudou.
5. Não avance com `[PERGUNTA]` aberta ou conflito sem decisão.
6. Só com a aprovação escrita do dev nesta conversa:
   - troque o cabeçalho para `Status: confirmado por <dev> em <AAAA-MM-DD>` (fora do bloco congelado);
   - registre: `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" approve requirements.md --by "<dev>"`;
   - avance: `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" advance`.

Depois da aprovação, mudança de entendimento vai para "Mudanças após a confirmação", com data, motivo e nova aprovação do dev. O script vence a aprovação se o bloco congelado mudar.
