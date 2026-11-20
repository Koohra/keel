<!-- Modelo do Keel para AGENTS.md. O dev preenche; o Keel não gera o conteúdo a partir do código.
     Só o que o agente não deduz lendo o código. Seção sem resposta sai do arquivo.
     Até cerca de 150 linhas; detalhe longo vai para um doc linkado em "Mais detalhes".
     Regra checável vira lint, teste ou hook, e aqui só aparece o comando.
     Cada regra com o motivo em meia frase quando não for óbvio. Apague estes comentários. -->
# <Nome do projeto>

<Uma ou duas frases: o que é o projeto e a stack principal. Link para o README, sem repetir.>

## Comandos
<!-- Comandos exatos, copiáveis. O Keel usa estes na "Checagem" do keel/product.md. -->
- Instalar: `<comando>`
- Testar tudo: `<comando>` · um arquivo: `<comando>`
- Lint e formatação: `<comando>`
- Rodar localmente: `<comando>`

## Convenções
<!-- Só o que difere do padrão da linguagem ou que o código não mostra. -->
- <convenção> (<motivo>)
- Commits: <formato>. Branches: <padrão>.

## Limites
<!-- O que o agente nunca faz e o que pergunta antes. -->
- Pergunte antes de: <ex.: adicionar dependência, mudar esquema do banco, apagar arquivo>.
- Nunca: <ex.: editar arquivos gerados em `<pasta>`, commitar segredos, mudar `<arquivo>` à mão>.

## Pronto quando
<!-- Definição de pronto de qualquer mudança. -->
- <ex.: testes e lint passam com os comandos acima; teste novo para comportamento novo>.

## Armadilhas
<!-- Coisas que já fizeram o agente ou uma pessoa errar. Remova quando deixarem de valer. -->
- <armadilha> (<como evitar>)

## Mais detalhes
- Arquitetura e princípios: `keel/product.md`
- Decisões: `keel/adrs/`
- <outro doc>: `<caminho>`
