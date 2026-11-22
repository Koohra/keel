# Guia: requirements.md

O que a história deve fazer, nunca como. Cerca de uma página. É o rascunho do dev: o Keel completa e confirma depois, na fase de requisitos.

1. Pasta `keel/features/<KEY>-<slug>/`: confirme com o dev a chave (código do Jira ou parecido), o slug e o link. Não invente link; sem link, a fonte é `dev on YYYY-MM-DD`.
2. Cabeçalho: `Source:`, `Folder:`, `Level:` (`standard` ou `with-design`; na dúvida, pergunte) e `Status: draft`.
3. "Original story": o texto da história copiado sem edição, como citação.
4. "Goal": para quem, o que muda e por quê, em até três frases, com fonte.
5. "Rules and acceptance criteria": regras em EARS com as palavras-chave em inglês e o conteúdo no idioma do projeto, uma por linha, com ID e fonte:
   - `R1. WHEN <trigger> THE <system> SHALL <response>. [source: ...]`
   - `IF <condition> THEN THE <system> SHALL <response>` · `WHILE <state> THE <system> SHALL <response>` · `WHERE <feature> THE <system> SHALL <response>` · `THE <system> SHALL <response>`
   Cada regra com ao menos um critério indentado: `  - AC-1.1 GIVEN <state> WHEN <action> THEN <observable result>.`
6. Sem resultado esperado conhecido, é pergunta: `[QUESTION]` em "Questions and assumptions" com a opção recomendada, e nada de critério inventado.
7. "Explicit obligations": casos de borda, invariantes, comportamento existente que não muda (com `arquivo:linha`) e erros esperados, ou "nenhum" explícito.
8. "Out of scope": o que parece próximo mas esta história não faz.
9. "Conflicts found": divergências entre história, product.md, ADRs e código, com as duas fontes. "Changes after confirmation": "Nenhuma." num documento novo.
10. Mais de cerca de 6 regras, ou uma regra com muitos exemplos: sugira ao dev fatiar a história.
