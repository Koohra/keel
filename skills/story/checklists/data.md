# Checklist: dados e migração

Use quando o design.md tem `Trigger: data/migration` ou preenche "Migration/rollback". Responda cada item com sim, não ou não se aplica, e a evidência (`arquivo:linha`).

1. A migração roda sobre dados que já existem (linhas antigas, campo nulo, valor fora do formato novo) e há teste com esse dado?
2. Existe caminho de volta (migração reversa ou passo descrito no design.md) e ele foi exercitado num teste ou registrado como não testado?
3. O código novo funciona durante a transição, com o esquema antigo e o novo, se o deploy não for atômico?
4. Escritas que precisam acontecer juntas estão na mesma transação, e há teste da falha no meio?
5. Campo novo obrigatório tem valor padrão ou preenchimento para os registros existentes?
