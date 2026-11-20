<!-- Modelo do Keel para AGENTS.md. O dev preenche; o Keel não gera o conteúdo a partir do código.
     Só o que o agente não deduz lendo o código. Seção sem resposta sai do arquivo.
     Até cerca de 150 linhas; detalhe longo vai para um doc linkado em "More details".
     Regra checável vira lint, teste ou hook, e aqui só aparece o comando.
     Cada regra com o motivo em meia frase quando não for óbvio. Apague estes comentários. -->
# <Project name>

<One or two sentences: what the project is and the main stack. Link to the README, without repeating it.>

## Commands
<!-- Comandos exatos, copiáveis. O Keel usa estes em "Checks" do keel/product.md. -->
- Install: `<command>`
- Test everything: `<command>` · one file: `<command>`
- Lint and formatting: `<command>`
- Run locally: `<command>`

## Conventions
<!-- Só o que difere do padrão da linguagem ou que o código não mostra. -->
- <convention> (<reason>)
- Commits: <format>. Branches: <pattern>.

## Boundaries
<!-- O que o agente nunca faz e o que pergunta antes. -->
- Ask before: <e.g.: adding a dependency, changing the database schema, deleting a file>.
- Never: <e.g.: editing generated files in `<folder>`, committing secrets, changing `<file>` by hand>.

## Done when
<!-- Definição de pronto de qualquer mudança. -->
- <e.g.: tests and lint pass with the commands above; new test for new behavior>.

## Pitfalls
<!-- Coisas que já fizeram o agente ou uma pessoa errar. Remova quando deixarem de valer. -->
- <pitfall> (<how to avoid it>)

## More details
- Architecture and principles: `keel/product.md`
- Decisions: `keel/adrs/`
- <other doc>: `<path>`
