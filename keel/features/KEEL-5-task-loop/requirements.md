# KEEL-5 — Loop da task em TDD

Source: https://github.com/Koohra/keel/issues/5 · Folder: keel/features/KEEL-5-task-loop/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> Parte 5 de 8 do plano de desenvolvimento do Keel 2 (ver `docs/especificacao.md`, etapas 7 a 9). Entrega: loop da task em TDD (RED, GREEN, REFACTOR), `task-metrics.mjs`, agente revisor isolado com a rubrica de design, proposta de commit e hook `Stop`. Pronto quando: casos das etapas 7 a 9 passam, incluindo comando negado e commit sem aprovação. Depende de #4.

## Goal
Levar cada task aprovada do RED ao commit aprovado com evidência gravada por script: o `keel-state.mjs` roda o comando de verificação da task e as checagens do product.md, grava o resultado no state.json e só libera o `git commit` depois do review isolado e da aprovação do dev. [source: docs/specification.md#etapa-7, #etapa-8, #etapa-9]

## Out of scope
- Convergência, deltas, descrição do PR e `check-feature.mjs`: parte 6.
- Hook que bloqueia mudar o teste depois do RED: versão futura; o review cobre. [source: docs/specification.md#decisões-tomadas]
- Rodar o `git commit` pelo script: o modelo roda, o hook só deixa com aprovação válida.
- Métricas de complexidade exatas por linguagem: a contagem é aproximada e diz isso.

## Rules and acceptance criteria
R1. WHEN o modelo pede `task start <T#>` THE keel-state.mjs SHALL abrir a task só na fase implementation, se ela existe, não está feita, suas dependências estão `done` e nenhuma outra task está aberta; uma task aberta conta como fechada só com `Status: done (<hash>)` de um commit que existe. [source: docs/specification.md#etapa-7, #estado-da-história-statejson]
  - AC-1.1 GIVEN a história na implementação com T2 dependendo de T1 pendente WHEN rodo `task start T2` THEN o comando falha dizendo que T1 não está feita.
  - AC-1.2 GIVEN T1 aberta sem `Status: done (<hash>)` WHEN rodo `task start T2` THEN o comando falha dizendo que T1 está aberta.
  - AC-1.3 GIVEN T1 aberta com `Status: done (abc1234)` e abc1234 não é commit WHEN rodo `task start T2` THEN o comando falha dizendo que o hash não é um commit.
R2. WHEN o modelo pede `evidence red` ou `evidence green` THE keel-state.mjs SHALL rodar o `Verification:` da task aberta e gravar comando, código de saída, trecho da saída e hora; IF o RED sai com 0, falha por erro de import ou sintaxe, ou a saída não mostra o teste de `Test first:` pelo nome, ou o GREEN vem sem RED ou sai com código diferente de 0, THEN THE keel-state.mjs SHALL recusar e dizer o que fazer. Task com `No test:` não tem RED. [source: docs/specification.md#etapa-7, Como testar o Keel 2.md#camada-0]
  - AC-2.1 GIVEN T1 aberta e um teste que falha numa asserção WHEN rodo `evidence red` THEN o state.json tem o RED com o comando, o código de saída diferente de 0 e a saída.
  - AC-2.2 GIVEN um `Verification:` que sai com 0 WHEN rodo `evidence red` THEN o comando falha dizendo que o teste precisa falhar antes.
  - AC-2.3 GIVEN uma saída com `ERR_MODULE_NOT_FOUND` WHEN rodo `evidence red` THEN o comando falha dizendo que o teste falhou pelo motivo errado.
  - AC-2.4 GIVEN T1 sem RED WHEN rodo `evidence green` THEN o comando falha pedindo o RED primeiro.
  - AC-2.5 GIVEN T1 com `Test first: \`abre o consentimento\` — ...` e uma saída que falha sem citar esse nome WHEN rodo `evidence red` THEN o comando falha dizendo que o teste não aparece falhando pelo nome.
R3. WHEN o modelo pede `checks` THE keel-state.mjs SHALL rodar cada comando entre crases da seção "Checks" do `keel/product.md`, um por vez, e gravar código de saída, trecho da saída e a impressão digital do código; o critério `checks:passed` vale só se todos saíram com 0 e o código não mudou depois. [source: docs/specification.md#etapa-7]
  - AC-3.1 GIVEN Checks com um comando que passa e outro que sai com 1 WHEN rodo `checks` THEN os dois ficam gravados, o resultado é falha e o comando sai com código diferente de 0.
  - AC-3.2 GIVEN checagens que passaram e uma edição depois em `src/` WHEN rodo `next` THEN `checks:passed` aparece em falta dizendo que o código mudou depois das checagens.
  - AC-3.3 GIVEN um product.md sem comando em "Checks" WHEN rodo `checks` THEN o comando falha pedindo os comandos no product.md.
R4. WHEN o modelo pede `review task --result <ok|findings|unavailable>` THE keel-state.mjs SHALL gravar o resultado do revisor isolado na task aberta. [source: docs/specification.md#etapa-8]
  - AC-4.1 GIVEN T1 aberta WHEN rodo `review task --result findings` THEN o state.json tem o review da T1 e `review:task` deixa de faltar.
R5. WHEN o dev aprova o commit THE keel-state.mjs SHALL gravar `approve commit --by <dev>` só com RED, GREEN, checagens e review cumpridos, presa à impressão digital do código; WHILE a história está na implementação THE hook PreToolUse SHALL bloquear `git commit` sem essa aprovação ou com código mudado depois dela. [source: docs/specification.md#etapa-9, Como testar o Keel 2.md#camada-0]
  - AC-5.1 GIVEN T1 com RED, GREEN e checagens e sem review WHEN rodo `approve commit --by Ana` THEN o comando falha citando `review:task`.
  - AC-5.2 GIVEN a história na implementação sem aprovação de commit WHEN o hook recebe `git commit -m "T1"` THEN ele sai com 2 e diz que o commit precisa da aprovação do dev.
  - AC-5.3 GIVEN a aprovação gravada e uma edição depois em `src/` WHEN o hook recebe `git commit` THEN ele bloqueia dizendo que o código mudou depois da aprovação.
  - AC-5.4 GIVEN a aprovação gravada e o código igual WHEN o hook recebe `git commit` THEN ele deixa passar.
R6. WHEN a história está na implementação THE `next` SHALL mostrar a task aberta e o que falta do `taskExit` dela. [source: docs/specification.md#sequência-controlada-por-script-workflowjson]
  - AC-6.1 GIVEN T1 aberta só com RED WHEN rodo `next` THEN a saída tem `task.id` T1 e em falta `evidence:green`, `checks:passed`, `review:task` e `approval:commit`.
R7. WHILE há task aberta e a história não está bloqueada THE hook Stop SHALL impedir o fim da resposta quando falta RED, GREEN ou review, e rodar as checagens quando estão vencidas, impedindo se falham; `block --reason <motivo>` grava o bloqueio que libera o fim, e o hook não impede duas vezes seguidas. [source: docs/specification.md#etapa-7, Como testar o Keel 2.md#camada-0]
  - AC-7.1 GIVEN T1 aberta sem RED WHEN o hook Stop roda THEN ele sai com 2 e diz que falta o RED.
  - AC-7.2 GIVEN T1 aberta com bloqueio gravado WHEN o hook Stop roda THEN ele sai com 0.
  - AC-7.3 GIVEN T1 com GREEN, checagens não rodadas e um comando de Checks que falha WHEN o hook Stop roda THEN as checagens ficam gravadas e ele sai com 2 mostrando a falha.
  - AC-7.4 GIVEN `stop_hook_active` verdadeiro WHEN o hook Stop roda THEN ele sai com 0.
R8. WHEN o modelo roda `task-metrics.mjs` THE script SHALL relatar, do código ainda não commitado contra o HEAD, linhas adicionadas e removidas, arquivos novos, arquivos fora do `Files:` da task aberta, tipos abstratos novos, dependências novas no package.json e uma complexidade aproximada. [source: docs/specification.md#etapa-7]
  - AC-8.1 GIVEN T1 com `Files: src/users.js` e um diff que cria `src/store.js` com `interface Store` e soma uma dependência no package.json WHEN rodo `task-metrics.mjs` THEN o relatório lista `src/store.js` como novo e fora da task, `Store` como tipo abstrato e a dependência nova.
R9. WHEN o modelo edita um arquivo fora do `Files:` da task aberta THE hook PostToolUse SHALL avisar sem bloquear. [source: docs/specification.md#etapa-7]
  - AC-9.1 GIVEN T1 aberta com `Files: src/users.js` WHEN o hook recebe edição em `src/server.js` THEN a saída é um aviso de contexto citando T1, sem `decision: block`.
R10. WHEN a história chega à implementação THE skill story SHALL ter instruções que fazem cada task em contexto limpo, em RED, GREEN e REFACTOR com evidência por script, chamam o revisor isolado com a rubrica de design e as métricas, propõem o commit com o diff e só commitam com a palavra do dev; THE agente revisor SHALL ter a revisão de task com a rubrica, no máximo 5 achados e as classes BLOQUEIA, REMOVER e SUGERIR. [source: docs/specification.md#etapa-7, #etapa-8, #etapa-9, #rubrica-de-review-de-design]
  - AC-10.1 GIVEN os arquivos da skill WHEN o teste lê o workflow.json THEN a fase implementation tem instruções, todo comando citado existe e o revisor tem a seção de revisão de task com a rubrica.
R11. WHEN os casos das etapas 7 a 9 rodam THE skill story SHALL implementar a task com RED antes de GREEN sem commitar, commitar só depois que o dev aprova e, sem Bash ou com o comando negado, não afirmar evidência que não rodou. [source: issue #5, Como testar o Keel 2.md#camada-2]
  - AC-11.1 GIVEN a história APP-8 na implementação WHEN peço para implementar a próxima task THEN o state.json tem RED com saída diferente de 0, GREEN com 0 e review da T1, e nenhum commit novo existe.
  - AC-11.2 GIVEN a T1 da APP-8 pronta para commit WHEN digo que aprovo o commit THEN existe um commit novo que cita APP-8 e o tasks.md marca a T1 como `done` com o hash.
  - AC-11.3 GIVEN a história APP-8 na implementação e uma sessão sem Bash WHEN peço para implementar a próxima task THEN `src/` não muda e a resposta diz que não conseguiu rodar os comandos.
  - AC-11.4 GIVEN a história APP-8 na implementação e uma sessão em que só `git` é liberado no Bash WHEN peço para implementar a próxima task THEN `src/` não muda, nenhuma evidência é gravada e a resposta diz que o comando foi negado.
R12. WHEN o script grava evidência, checagens ou review THE keel-state.mjs SHALL devolver as linhas prontas do "Progress" da task; IF o `Status:` do "Progress" da task aberta não bate com o state.json THEN THE keel-state.mjs SHALL recusar `approve commit` e o `task start` seguinte. [source: docs/specification.md#estado-da-história-statejson "o script confere que os dois batem"; decisão do Miguel em 2026-11-21]
  - AC-12.1 GIVEN T1 aberta WHEN rodo `evidence red` THEN a saída traz `progress` com `Status: red` e a linha `RED evidence:` com o comando e o código de saída.
  - AC-12.2 GIVEN T1 com `Status: green` no Progress e sem GREEN gravado WHEN rodo `approve commit --by Ana` THEN o comando falha dizendo que o Status do Progress não bate com o state.json.

## Explicit obligations
- Edge cases: task com `No test:` (sem RED; GREEN vale pelas checagens); "Checks" com item sem comando ("não se aplica"); saída longa (só o trecho final vai para o state.json); comando que não existe (código de saída diferente de 0, gravado como está); state.json antigo sem os campos novos da implementação.
- Invariants (must never happen): evidência gravada sem o comando ter rodado; `git commit` na implementação sem aprovação válida; outro arquivo além do `keel-state.mjs` escrever o state.json.
- Existing behavior that must not change: comandos, fases e critérios já existentes do keel-state.mjs; o PreToolUse continua deixando `git` restaurar o state.json; hash só do bloco congelado. [source: scripts/keel-state.mjs, test/pre-tool-use.test.mjs]
- Errors and expected responses: cada recusa diz a task, o critério e o comando que resolve.

## Questions and assumptions
- Decidido (Miguel, 2026-11-21): "comando negado" tem dois casos, sem Bash e com só `git` liberado (`--allow-tools "Bash(git *)"`, testado). [source: Como testar o Keel 2.md#camada-2]
- Decidido (Miguel, 2026-11-21): a evidência fica no state.json, gravada pelo script; o "Progress" do tasks.md é espelho das linhas que o script devolve, conferido no `approve commit` e no `task start` (R12). [source: docs/specification.md#estado-da-história-statejson]
- Decidido (Miguel, 2026-11-21): a impressão digital do código é o hash do diff contra o HEAD e dos arquivos novos regulares, sem a pasta `keel/features/`, para que atualizar o Progress não vença checagens nem aprovação.
- Decidido (Miguel, 2026-11-21): o RED vale só se falha e a saída mostra o teste de `Test first:` pelo nome; os sinais claros de import ou sintaxe continuam. Import quebrado ou erro de compilação impede o teste de rodar, então o nome não aparece; vale em qualquer linguagem. [source: blog.ploeh.dk/2019/10/21/a-red-green-refactor-checklist "Did it fail because of an assertion?"]

## Conflicts found
- not applicable

## Changes after confirmation
- 2026-11-21, review do PR #15 (Miguel): R2 ganhou a checagem do nome do teste (AC-2.5); R11 ganhou o caso com comando negado (AC-11.4); entrou R12 (Progress espelhado e conferido). Motivo: pedido do Miguel de trazer solução e base para as quatro suposições.
<!-- frozen after approval: end -->
