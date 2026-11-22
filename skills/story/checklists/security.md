# Checklist: segurança

Use quando o design.md preenche "Security" em "Cross-cutting concerns". Responda cada item com sim, não ou não se aplica, e a evidência (`arquivo:linha`).

1. Toda entrada que vem de fora (request, arquivo, fila, variável de ambiente) é validada na fronteira, antes de chegar à regra de negócio, e há teste com entrada inválida?
2. A checagem de permissão acontece no servidor, no caminho que a task mudou, e há teste de alguém sem permissão sendo recusado?
3. Segredo, token ou dado pessoal aparece em log, mensagem de erro, resposta ou arquivo versionado?
4. Consulta, comando ou caminho de arquivo é montado concatenando entrada do usuário em vez de parâmetro ou API segura?
5. A falha de autenticação ou autorização devolve o mesmo erro genérico, sem dizer se o usuário ou o recurso existe?
