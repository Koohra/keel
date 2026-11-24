# Fase: requisitos

Objetivo: transformar a história em obrigações explícitas e testáveis no `requirements.md` da pasta da história. Escreva o quê, nunca o como.

1. Regras em EARS, com as palavras-chave em inglês e o conteúdo no idioma do projeto, uma por linha, com fonte:
   - `R1. WHEN <trigger> THE <system> SHALL <response>. [source: ...]`
   - `IF <condition> THEN THE <system> SHALL <response>` (comportamento indesejado)
   - `WHILE <state> THE <system> SHALL <response>` · `WHERE <feature> THE <system> SHALL <response>` · `THE <system> SHALL <response>`
2. Cada regra com ao menos um critério de aceite, indentado sob ela:
   `  - AC-1.1 GIVEN <state> WHEN <action> THEN <observable result>.`
   IDs estáveis: não renumere regra que já existia.
3. Sem THEN, é pergunta: se a história, o product.md, uma ADR ou o código não dizem o resultado esperado, escreva `[QUESTION]` em "Questions and assumptions" com a opção que você recomenda, e não escreva o critério.
4. Preencha "Explicit obligations": casos de borda, invariantes (o que nunca pode acontecer), comportamento existente que não muda (com `arquivo:linha`), erros esperados ou "nenhum" explícito.
5. Preencha "Out of scope" com o que parece próximo mas esta história não faz.
6. Em "Conflicts found", liste cada divergência entre história, product.md, ADRs e código com as duas fontes. Seção sem conteúdo diz "not applicable"; não remova seção. Num conflito com uma ADR, se a recomendação for mudar a decisão, diga que o design a registra como candidata a ADR num rascunho `adr-draft.md` na pasta da história e que a ADR em `keel/adrs/` nasce no fechamento, com a aprovação dos deltas pelo dev; não diga que o design escreve a ADR.
7. `[ASSUMPTION]` é algo que você assumiu e o dev precisa aceitar; `[QUESTION]` bloqueia o avanço.
8. Valide por script e corrija até não haver erro:
   `node "<plugin>/scripts/validate-feature.mjs" keel/features/<KEY>-<slug>`
9. Faça as perguntas ao dev uma por vez, com a opção recomendada. Com a resposta, troque o `[QUESTION]` pela regra, critério ou decisão, com `[source: dev on YYYY-MM-DD]`.
10. Sem `[QUESTION]` aberto e com o validador limpo, avance:
    `node "<plugin>/scripts/keel-state.mjs" advance`

Orçamento: cerca de uma página. Não escreva arquitetura, classes, endpoints novos ou passos de implementação.
