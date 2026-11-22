# Guia: keel/product.md

Contexto durável do projeto, lido em toda história. Curto e sempre relevante: até cerca de 200 linhas.

1. Comece pelas perguntas que só o dev responde: para quem é o produto, o que ele faz e o que fica de fora. Uma por vez, com a sua proposta a partir do README, do código e da documentação existente, citando a fonte.
2. "Vision": até três frases, com fonte.
3. "What it does" e "What it does not do": um item por linha, no nível de capacidade, não de tela ou endpoint. Não copie para cá o que o código já diz (rotas, campos, versões).
4. "Glossary": só termos do domínio que aparecem nas histórias e podem ser confundidos.
5. "Decisions": um link por ADR existente em `keel/adrs/`, com uma linha. Decisão nova que afeta o projeto inteiro vira ADR (guia `adr.md`), não parágrafo aqui.
6. "Engineering principles": parta da seção do modelo. No máximo 10 regras, cada uma marcada `[hook]` (checada por script) ou `[review]` (rubrica). Ajuste com o dev, uma regra por vez quando houver dúvida. Clean Architecture e DDD não são o padrão: a regra universal é a direção das dependências.
7. "Rungs per module": o degrau de cada módulo de primeiro nível, com motivo. Pergunte ao dev quando o código não mostrar.
8. "Checks": os comandos de teste, lint e arquitetura que o projeto já tem, com a origem (`package.json`, `AGENTS.md:L<n>`). Sem comando, "não se aplica ainda"; não invente comando.
