# Fase: closing

Objetivo: provar que a história está completa e levar o conhecimento durável para o projeto. O script calcula a convergência, roda a arquitetura e acha os deltas; você confere o que só a leitura pega e propõe. Portão: o dev aprova os deltas de product.md e ADR. Código não muda nesta fase: o hook bloqueia.

## 1. Convergência
1. Rode `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" next`. A saída traz `closing.convergence` (as linhas da tabela), `closing.arch` e `closing.deltas`.
2. Troque a tabela da seção "Convergence" do tasks.md pelas linhas de `closing.convergence`, sem editar. O `advance` confere que a tabela é a mesma do script.
3. Para cada regra `met`, leia o teste citado e confira que ele verifica a regra e os critérios dela. Se não verifica, trate como regra faltante.
4. Regra `missing` (ou que o teste não prova): não mexa no código e não marque `met`. Acrescente ao tasks.md uma task nova, dentro do bloco congelado, com todos os campos e o `Covers:` citando a regra e o AC que faltam, e a entrada `### T<n>` com `Status: pending` no "Progress". Isso vence a aprovação do tasks.md e a história volta à fase tasks: mostre a task nova ao dev, peça a aprovação e pare.

## 2. Desvios e escopo
1. Liste as escolhas de implementação que se afastaram do requirements.md ou do design.md, cada uma com o motivo (veja "Implementation notes" e `git log` dos commits das tasks). Se não houver, é "nenhum".
2. Compare o que foi entregue com a "Original story" do requirements.md: o que ficou de fora e o que foi além dela.
3. Isso vai para a descrição do PR (passo 6). Regra mudada depois da confirmação segue "Changes after confirmation" e pede nova aprovação.

## 3. Arquitetura
1. `closing.arch.status`: `ok`, `skipped` ou `fail`. `skipped` (sem `keel/architecture.json`) só passa se o "### Checks" do product.md diz `Architecture: não se aplica`, a dispensa explícita do dev; sem ela, diga ao dev que a checagem não rodou e ofereça rodar a skill de setup ou registrar a dispensa, com a palavra dele. Em `fail` (violação nova ou baseline maior que antes da primeira task), não corrija código nem a baseline: mostre ao dev a violação, com a correção da regra, e proponha uma task nova como no passo 1.4.
2. Confira se os exemplares e as regras de "Engineering principles" do `keel/product.md` ainda valem com o código entregue. Se não valem mais, é delta do product.md.

## 4. Deltas de product.md e ADR
1. Se a história mudou o produto (o que ele faz, glossário, módulos e degraus, checagens, exemplares), edite `keel/product.md` direto, só o que mudou, dentro do orçamento de cerca de 200 linhas e sem copiar o que o código já diz. Sem mudança no produto, não invente delta.
2. Se o design.md diz `ADR candidate?` Yes e a decisão afeta estrutura, dependência, interface ou técnica de construção e sobrevive à feature (Nygard), escreva `keel/adrs/ADR-NNN-<slug>.md` com `## Status` (proposed), `## Context`, `## Decision`, `## Consequences` e `## Confirmation`.
3. Rode `next` de novo: `closing.deltas.files` lista o que mudou desde a base da história e `closing.deltas.sections` traz o delta por seção do product.md e por arquivo de ADR (adicionado, modificado e removido). Mostre ao dev esse delta, com o `git diff` de cada seção modificada e o conteúdo das novas, e pergunte se aprova. Pare e espere.
4. Só com a aprovação escrita do dev nesta conversa, depois de ele ver o delta:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" approve deltas --by "<dev>"`
   Se o delta mudar depois, a aprovação vence: mostre de novo.

## 5. Avançar
`node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" advance`
Se recusar, mostre ao dev o que falta e resolva aqui. Aceito, a história fica `done`: siga para o passo 6 nesta fase, sem procurar instruções de `done`.

## 6. Conferência e PR
1. Rode a conferência de ponta a ponta e mostre o resultado ao dev:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/check-feature.mjs" <pasta-da-história>`
   Item `FAIL` é o que é: diga qual e por quê, sem chamar de passou.
2. Gere a descrição do PR e troque os dois comentários pelo que você levantou no passo 2:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/check-feature.mjs" <pasta-da-história> --pr`
3. Proponha o commit do fechamento (`<KEY>: fechamento`), com a pasta da história e os deltas aprovados, mostrando o diff. Commite só com a palavra do dev.
4. Entregue a descrição do PR ao dev. Abra o PR (por exemplo com `gh pr create --body-file`) só se o dev pedir.

## Nunca
- Corrigir código, teste ou baseline no fechamento, ou marcar `met` o que o script não marcou.
- Rodar `approve deltas` sem o dev ter dito, nesta conversa, que aprova o delta que você mostrou.
- Escrever a tabela de convergência ou a conferência à mão: copie do script.
