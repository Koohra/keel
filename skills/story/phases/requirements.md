# Fase: requisitos

Objetivo: transformar a história em obrigações explícitas e testáveis no `requirements.md` da pasta da história. Escreva o quê, nunca o como.

1. Regras em EARS, com as palavras-chave em inglês e o conteúdo no idioma do projeto, uma por linha, com fonte:
   - `R1. WHEN <gatilho> THE <sistema> SHALL <resposta>. [fonte: ...]`
   - `IF <condição> THEN THE <sistema> SHALL <resposta>` (comportamento indesejado)
   - `WHILE <estado> THE <sistema> SHALL <resposta>` · `WHERE <recurso> THE <sistema> SHALL <resposta>` · `THE <sistema> SHALL <resposta>`
2. Cada regra com ao menos um critério de aceite, indentado sob ela:
   `  - AC-1.1 GIVEN <estado> WHEN <ação> THEN <resultado observável>.`
   IDs estáveis: não renumere regra que já existia.
3. Sem THEN, é pergunta: se a história, o product.md, uma ADR ou o código não dizem o resultado esperado, escreva `[PERGUNTA]` em "Perguntas e suposições" com a opção que você recomenda, e não escreva o critério.
4. Preencha "Obrigações explícitas": casos de borda, invariantes (o que nunca pode acontecer), comportamento existente que não muda (com `arquivo:linha`), erros esperados ou "nenhum" explícito.
5. Preencha "Fora de escopo" com o que parece próximo mas esta história não faz.
6. Em "Conflitos encontrados", liste cada divergência entre história, product.md, ADRs e código com as duas fontes. Seção sem conteúdo diz "não se aplica"; não remova seção.
7. `[SUPOSIÇÃO]` é algo que você assumiu e o dev precisa aceitar; `[PERGUNTA]` bloqueia o avanço.
8. Valide por script e corrija até não haver erro:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-feature.mjs" keel/features/<CHAVE>-<slug>`
9. Faça as perguntas ao dev uma por vez, com a opção recomendada. Com a resposta, troque o `[PERGUNTA]` pela regra, critério ou decisão, com `[fonte: dev em AAAA-MM-DD]`.
10. Sem `[PERGUNTA]` aberto e com o validador limpo, avance:
    `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" advance`

Orçamento: cerca de uma página. Não escreva arquitetura, classes, endpoints novos ou passos de implementação.
