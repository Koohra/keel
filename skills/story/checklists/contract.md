# Checklist: contrato

Use quando o design.md tem `Trigger: contract`. Responda cada item com sim, não ou não se aplica, e a evidência (`arquivo:linha`).

1. O formato publicado (campos, tipos, códigos de status, nomes de evento) bate com o que o design.md descreve em "Contracts and data"?
2. Quem já consome o contrato continua funcionando: nenhum campo removido, renomeado ou com tipo mudado sem versão nova ou aviso no design.md?
3. Cada erro esperado do requirements.md tem resposta definida (código e corpo) e um teste que a verifica?
4. Há teste no nível do contrato (request e resposta ou mensagem completa), não só da função interna?
5. Campo opcional ausente, campo desconhecido a mais e valor no limite têm comportamento definido e testado?
