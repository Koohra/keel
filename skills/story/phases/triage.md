# Fase: triagem

Objetivo: dosar a cerimônia pelo tamanho e o risco da história. O dev confirma o nível; você não escolhe em silêncio.

1. Obtenha o texto da história como o dev mandou (colado, link ou arquivo). Se só veio o título, peça o texto. Guarde o texto original sem edição: ele vai para o requirements.md na leitura.
2. Procure gatilhos de design na história: trade-off real; mudança de contrato ou interface; dados ou migração; dependência nova; preocupação transversal (segurança, privacidade, desempenho); quebra deliberada de padrão; candidata a ADR; estrutura nova, uma peça a mais que o código passa a manter (fronteira, porta, módulo, mapper, dependência externa); módulo que passa a ser organizado de forma mais elaborada, mais fácil de mudar e mais cara de escrever (subida de degrau).
3. Leia `triage.designTriggers` no `next` (`node "<plugin>/scripts/keel-state.mjs" next`). São os gatilhos que o script acha sozinho: componente planejado que ainda não tem arquivo, arquivo novo fora de todo componente e a primeira história que cria código num projeto que já passou pelo setup. Com algum gatilho automático, o nível é `with-design`: proponha só esse e não ofereça nível menor, porque o script recusa `trivial` e `standard` enquanto o gatilho existir.
4. Proponha um nível:
   - `trivial`: uma regra, poucos arquivos, nenhum gatilho. Só tasks.md, com o critério na própria task.
   - `standard`: requirements.md e tasks.md.
   - `with-design`: requirements.md, design.md e tasks.md; exige ao menos um gatilho.
5. Se a história tem mais de cerca de 6 regras, ou uma regra com muitos exemplos, sugira fatiar e diga por onde (por regra, por variação de dado, por caminho feliz e exceções).
6. Mostre ao dev, curto: nível proposto, motivo, gatilhos encontrados, os automáticos primeiro (cada um com o trecho da história ou o item do `designTriggers` e uma frase simples sobre o que ele muda para o produto) ou "nenhum gatilho", e a sugestão de fatiar se houver. Pergunte se ele confirma ou quer outro nível. Pare e espere.
7. Só depois da resposta do dev, registre o nível que ele escolheu:
   `node "<plugin>/scripts/keel-state.mjs" level <trivial|standard|with-design> --by "<dev>"`
   e avance com `node "<plugin>/scripts/keel-state.mjs" advance`.

Não crie requirements.md nem tasks.md nesta fase.
