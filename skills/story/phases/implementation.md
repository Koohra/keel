# Fase: implementation

Objetivo: cada task do tasks.md entregue em TDD, revisada por um revisor isolado e commitada com a aprovação do dev. A evidência é gravada pelo script, nunca declarada por você. Portão: o dev aprova o commit de cada task.

## 1. Abrir a task
1. O `next` diz `task` (a task aberta e o que falta para ela) ou `nextTask` (a próxima a abrir). Sem task aberta:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" task start <T#>`
2. Carregue só o que a task pede: o texto dela no tasks.md, as regras e critérios do `Covers:` no requirements.md, a parte do design.md que ela toca e os arquivos de `Files:`. Nada da spec inteira.
3. Se a conversa já carrega outra task, sugira ao dev seguir numa conversa nova (`/clear`); o `next` retoma de onde parou.

## 2. RED
1. Escreva só o teste de `Test first:`, nos arquivos da task. Um teste por vez; não escreva os testes das próximas tasks.
2. Grave a evidência (o script roda o `Verification:` da task):
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" evidence red`
3. Se o script recusar porque o teste passou, o teste não verifica o comportamento novo: corrija o teste. Se recusar por import ou sintaxe, ou porque o teste não aparece pelo nome na saída, crie o módulo ou o export vazio que o teste usa e dê ao teste o nome de `Test first:`, para ele rodar e falhar numa asserção.
4. Task com `Regression: delivered by T<n>`: o teste passa de primeira porque o comportamento já existe. Sabote de propósito o código de T<n> (fora do `Files:` da task) para o teste falhar numa asserção, grave o `evidence red` (o script exige a sabotagem) e desfaça a sabotagem antes do `evidence green` (o script confere que o código voltou ao HEAD).
5. Task com `No test:` não tem RED: siga para o GREEN e a evidência dela são as checagens.
6. Copie para o "Progress" da task, no tasks.md, as linhas de `task.progress` da saída do script (`Status:` e `RED evidence:`). Não escreva evidência por conta própria: o `approve commit` confere que o Status bate com o state.json.

## 3. GREEN
1. Escreva o código mais simples que faz o teste passar, só nos arquivos de `Files:` e só com a estrutura de `New structure:`. Antes de escrever um helper, procure um que já exista e reutilize.
2. Não mude, não afrouxe e não apague o teste do RED para ele passar. Se o teste estava errado, pare, explique ao dev, grave o bloqueio e peça aprovação para mudar:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" block --reason "<motivo>"`
3. Grave a evidência:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" evidence green`
4. Copie de novo as linhas de `task.progress` para o "Progress".

## 4. REFACTOR
1. Limpe mantendo tudo verde, com foco em remover: sobras, código morto, primeira tentativa, prints, duplicação do que já existia e abstração que não se paga. Extraia código compartilhado só na terceira ocorrência do mesmo conhecimento.
2. Gere as métricas da task:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/task-metrics.mjs"`
   Arquivo em `outsideTask`, dependência nova ou tipo abstrato que a task não declarou: remova, ou explique na proposta de commit por que a task precisa.
3. Rode as checagens do projeto ("Checks" do product.md), cada uma isolada, gravadas pelo script:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" checks`
   Falha causada pela task: corrija na task e rode de novo. Falha fora do escopo da task: não corrija; grave com `block --reason` e reporte ao dev.
4. O que aprender e afetar as próximas tasks vai para "Implementation notes". Se mudar uma regra, siga "Changes after confirmation" do requirements.md e peça nova aprovação.

## 5. Review isolado
1. Chame o agente `keel:reviewer` pedindo "revisão de task" e passe: o diff exato (`git diff HEAD` e os arquivos novos), o texto da task, as regras citadas, o caminho da seção "Engineering principles" do `keel/product.md`, o `design.md` se houver e a saída do `task-metrics.mjs`. Não passe o histórico da conversa.
2. Grave o resultado:
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" review task --result <ok|findings|unavailable>`
   Sem o revisor disponível, grave `unavailable`; nunca chame a sua própria revisão de independente.
3. Achado BLOQUEIA ou relevante: volte ao GREEN, corrija e rode `checks` de novo. Achado menor pode ficar, com a justificativa em `Review:` no "Progress". Não corrija todo SUGERIR: abstração extra também é defeito.

## 6. Proposta de commit
1. Copie as linhas de `task.progress` para o "Progress" (o Status fica `in review` depois do review gravado) e acrescente em `Review:` o que foi feito com cada achado.
2. Mostre ao dev, curto:
   - o que entra: `git status --short` e o diff (`git diff HEAD` e os arquivos novos), não só a lista de arquivos;
   - a evidência gravada: RED e GREEN com comando e código de saída, e cada checagem com o código de saída;
   - o resultado do review;
   - a mensagem proposta: `<KEY> T<n>: <título da task> (R#)`.
3. Pergunte se ele aprova o commit. Pare e espere. Não commite antes: o hook bloqueia `git commit` sem a aprovação gravada.

## 7. Commit aprovado
Só com a aprovação escrita do dev nesta conversa, depois de ele ver a proposta:
1. `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" approve commit --by "<dev>"` (sozinho, num comando à parte: o hook confere o `git commit` antes de o comando todo rodar)
2. `git add` dos arquivos da task e da pasta da história, e `git commit -m "<mensagem>"`. Um commit por task, sem mudança alheia. Se o código mudar depois da aprovação, o hook bloqueia: mostre o novo diff e peça de novo.
3. Pegue o hash (`git rev-parse --short HEAD`) e marque no "Progress": `Status: done (<hash>)`.
4. Volte ao passo 1 para a próxima task. Quando todas estiverem `done`, peça para avançar com `advance`.

## Nunca
- Declarar teste ou checagem como passando sem o script ter gravado. Se um comando não pôde rodar (negado, ausente, sem permissão), diga que não rodou e pare; não escreva evidência à mão.
- Rodar `approve commit` sem o dev ter dito, nesta conversa, que aprova o commit que você mostrou.
- Misturar duas tasks num commit ou mexer fora da task sem dizer.
