# Fase: confirmação do entendimento

Objetivo: o dev concorda com o que vai ser construído antes de qualquer design, plano ou código.

1. Peça ao revisor isolado que procure bordas, exemplos e erros faltantes, com olhar de teste. Chame o agente `keel:reviewer` passando só o caminho do `requirements.md` e o pedido "revisão de requisitos"; não passe o histórico da conversa nem a sua opinião. Ele não reescreve o documento.
2. Registre o resultado, com o que de fato aconteceu:
   `node "<plugin>/scripts/keel-state.mjs" review requirements --result <ok|findings|unavailable>`
   Use `unavailable` se o agente não pôde rodar. Nunca chame a sua própria leitura de revisão independente.
3. Apresente ao dev um resumo curto:
   - objetivo em uma frase;
   - regras, uma linha cada (`R1 — ...`);
   - fora de escopo;
   - suposições que ele precisa aceitar;
   - conflitos, cada um com a decisão que você propõe;
   - achados do revisor e o que você sugere para cada um. Achado não vira regra por padrão: sugira regra nova só para achado dentro do objetivo e com resultado observável no ambiente de teste do projeto (sem resultado esperado conhecido, é `[QUESTION]`). Achado fora do objetivo, achado que contraria o "Out of scope" e achado que não se testa de verdade no ambiente (só simulado, ou pulado): sugira como pendência em "Out of scope" (`- <achado> (pendência do review, fora desta história)`), não como regra nova. Se o dev quiser mesmo assim uma regra que contraria o "Out of scope", registre o conflito em "Conflicts found" com a decisão dele;
   - se sugerir regra nova, quantas regras a história tinha e quantas terá.
   Pergunte se ele aprova o requirements.md. Pare e espere.
4. Se o dev pedir mudança, edite o requirements.md, valide com `node "<plugin>/scripts/validate-feature.mjs" <pasta>` e mostre de novo o que mudou.
5. Não avance com `[QUESTION]` aberta ou conflito sem decisão.
6. Só com a aprovação escrita do dev nesta conversa:
   - troque o cabeçalho para `Status: confirmed by <dev> on <YYYY-MM-DD>` (fora do bloco congelado);
   - registre: `node "<plugin>/scripts/keel-state.mjs" approve requirements.md --by "<dev>"`;
   - avance: `node "<plugin>/scripts/keel-state.mjs" advance`.

Depois da aprovação, mudança de entendimento vai para "Changes after confirmation", com data, motivo e nova aprovação do dev. O script vence a aprovação se o bloco congelado mudar.
