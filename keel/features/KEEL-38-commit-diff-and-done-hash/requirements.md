# KEEL-38 — Mostrar o diff na proposta de commit e commitar o done da task

Source: https://github.com/Koohra/keel/issues/38, https://github.com/Koohra/keel/issues/39 · Folder: keel/features/KEEL-38-commit-diff-and-done-hash/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> #38: `implementation.md` §6.2 pede mostrar o diff na pergunta de aprovação. Na T4, T5 e T7 do e2e-3 a proposta disse só "O diff completo está logo acima"; o diff tinha saído numa chamada de ferramenta que o dev não vê como texto da resposta. A dev aprovou três commits sem ver o código. Pronto quando a pergunta de aprovação sempre traz o diff (ou o `git diff --stat` mais o trecho alterado) no próprio texto da resposta, e a fase deixa explícito que referência a "acima" não conta. Vale avaliar se o `approve commit` pode exigir que a proposta tenha sido registrada com o diff.
> #39: depois do commit da task, o Keel escreve `Status: done (<hash>)` no `tasks.md`; essa marca entra no commit da próxima task e a da última no commit do fechamento. Cada commit de task carrega a contabilidade da anterior e a árvore fica suja entre tasks. Opções: um commit pequeno só da marca logo após o commit da task, ou registrar o hash de um jeito que o `check-feature` aceite sem depender do commit seguinte.

## Goal
O dev vê o código que aprova no próprio texto da pergunta de aprovação, e cada task termina com a árvore limpa: o commit da task e, logo depois, um commit só da marca `done (<hash>)`. [source: issues #38 e #39; /mnt/project-files/keel2/e2e-3/resultado.md]

## Out of scope
- Exigir no `approve commit` que a proposta tenha sido mostrada com o diff: o script não vê o texto da resposta ao dev, então não tem como conferir; a regra fica na fase e no portão humano.
- Registrar o hash fora do `tasks.md`: o `check-feature`, o `task start` e o fechamento já leem `Status: done (<hash>)` do tasks.md; o commit da marca resolve sem mudar esses leitores.
- Evidência RED (#37), PR e aviso de sessão nova no fechamento (#40), texto de ADR nos requisitos (#41): outras frentes.

## Rules and acceptance criteria
R1. WHEN a skill story propõe o commit de uma task THE fase implementation SHALL mandar pôr no próprio texto da resposta o `git diff --stat` e o trecho alterado (o diff de `git diff HEAD` e os arquivos novos), e SHALL dizer que saída de ferramenta e referência a "acima" não contam como mostrar o diff. [source: issue #38; skills/story/phases/implementation.md §6]
  - AC-1.1 GIVEN os arquivos da skill WHEN o teste lê `phases/implementation.md` THEN o passo da proposta exige `git diff --stat` e o diff no texto da resposta e diz que "acima" e saída de ferramenta não contam.
R2. WHEN o commit aprovado da task aberta já foi feito e não sobra mudança de código fora da pasta da história THE hook de PreToolUse SHALL permitir um `git commit` só da pasta da história, para a marca `Status: done (<hash>)` entrar num commit próprio logo após o commit da task. [source: issue #39; scripts/task-loop.mjs checkGitCommit]
  - AC-2.1 GIVEN T1 aprovada e commitada, com só `tasks.md` mudado (`Status: done (<hash>)`) WHEN o hook recebe `git commit` THEN o commit é permitido.
  - AC-2.2 GIVEN T1 aprovada e commitada, com mudança em `src/login.js` WHEN o hook recebe `git commit` THEN o commit é bloqueado dizendo que o código mudou depois da aprovação.
R3. WHEN a skill story marca `Status: done (<hash>)` no "Progress" THE fase implementation SHALL mandar commitar só a pasta da história com a mensagem `<KEY> T<n>: done (<hash>)` antes de abrir a próxima task. [source: issue #39; skills/story/phases/implementation.md §7]
  - AC-3.1 GIVEN os arquivos da skill WHEN o teste lê `phases/implementation.md` THEN o passo 7 manda commitar a pasta da história com `<KEY> T<n>: done (<hash>)` depois de marcar o hash.

## Explicit obligations
- Edge cases: commit da marca sem a aprovação da task aberta continua bloqueado; sem task aberta continua bloqueado; fora da implementation o hook não decide.
- Invariants (must never happen): código fora da pasta da história entrar num commit que o dev não aprovou.
- Existing behavior that must not change: o bloqueio antes da aprovação, o bloqueio por código mudado depois da aprovação, e o `check-feature` contando um commit por task pelo hash do `done`. [source: test/pre-tool-use.test.mjs, test/task-loop.test.mjs, scripts/check-feature.mjs]
- Errors and expected responses: as mensagens do hook continuam as mesmas.

## Conflicts found
- `skills/story/phases/implementation.md` §7.3 marcava o hash sem commitar, e a marca ia no commit seguinte; R3 manda commitá-la à parte.

## Questions and assumptions
- [ASSUMPTION] A mensagem do commit da marca é `<KEY> T<n>: done (<hash>)`, no mesmo padrão da mensagem da task. [source: skills/story/phases/implementation.md §6.2]
<!-- frozen after approval: end -->

## Changes after confirmation
not applicable
