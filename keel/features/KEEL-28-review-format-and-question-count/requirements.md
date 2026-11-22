# KEEL-28 — Formato do Review: e contagem de [QUESTION] no next

Source: https://github.com/Koohra/keel/issues/28 e https://github.com/Koohra/keel/issues/31 · Folder: keel/features/KEEL-28-review-format-and-question-count/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> #28: o `approve commit` recusou com "write in Review: of the Progress what was done with each one". O agente tinha escrito as disposições dos findings em linhas separadas, mas o script só lê o texto na mesma linha de `Review: findings (isolated reviewer)`. A mensagem de erro ou `skills/story/phases/implementation.md` deveria mostrar o formato esperado.
> #31: na fase requirements, `keel-state next` mostrou "5 open [QUESTION](s)", mas o documento tinha 3 `[QUESTION]` e 2 `[ASSUMPTION]`. Deveria contar separado ou nomear os dois.

## Goal
O agente acerta o `Review:` de primeira, porque o formato (tudo na mesma linha) está na fase e na recusa; e o `next` nomeia `[QUESTION]` e `[ASSUMPTION]` em contagens separadas. [source: issues #28 e #31, achados 3 e 6 da história e2e APP-21]

## Out of scope
- Mudar o que bloqueia a fase requirements: só `[QUESTION]` bloqueia, como hoje.
- Aceitar o `Review:` em várias linhas.
- O `doc-check.mjs` do keel-docs.

## Rules and acceptance criteria
R1. IF a task teve review com `findings` e o `Review:` do Progress não diz o destino dos achados na mesma linha THEN THE keel-state.mjs SHALL recusar o `approve commit` dizendo que o destino vai na mesma linha de `Review:` e mostrando um exemplo da linha. [source: issue #28; scripts/task-loop.mjs approveCommit]
  - AC-1.1 GIVEN uma task com review `findings` e `Review: findings (isolated reviewer)` WHEN rodo `approve commit --by Ana` THEN a recusa diz "same line" e mostra `Review: findings (isolated reviewer); ...` com um achado corrigido e um mantido com fonte.
R2. WHEN a fase de implementação registra o destino dos achados THE skill story SHALL mostrar o formato da linha `Review:`, com o destino na mesma linha do resultado. [source: issue #28]
  - AC-2.1 GIVEN `skills/story/phases/implementation.md` WHEN o teste lê o arquivo THEN ele tem a linha de exemplo `Review: findings (isolated reviewer); ...` e diz que tudo vai na mesma linha.
R3. IF o requirements.md tem `[QUESTION]` aberta THEN THE keel-state.mjs SHALL dizer no `next` quantas `[QUESTION]` estão abertas e, à parte, quantas `[ASSUMPTION]` aguardam o aceite do dev, dizendo que essas não bloqueiam. [source: issue #31]
  - AC-3.1 GIVEN um requirements.md com 3 `[QUESTION]` e 2 `[ASSUMPTION]` sem aceite WHEN rodo `next` THEN o motivo diz "3 open [QUESTION](s)" e "2 [ASSUMPTION](s)" sem somar as duas.

## Explicit obligations
- Edge cases: `[ASSUMPTION]` com "accepted by" não conta como aguardando aceite; sem `[ASSUMPTION]` pendente, o motivo não cita suposições.
- Invariants (must never happen): `[ASSUMPTION]` somada às `[QUESTION]`.
- Existing behavior that must not change: só `[QUESTION]` bloqueia a saída de requirements; o `approve commit` aceita a linha `Review: findings (isolated reviewer); <destino>`. [source: test/keel-state.test.mjs, test/task-loop.test.mjs]
- Errors and expected responses: as recusas de R1 e R3.

## Conflicts found
- O `openQuestions` de `scripts/validate-feature.mjs` só conta `[QUESTION]`; a soma de 5 vista na APP-21 não se reproduz com o código da main. R3 deixa as duas contagens explícitas no motivo, para o dev ver a diferença.

## Questions and assumptions
- [ASSUMPTION] `[ASSUMPTION]` aguardando aceite é a que não tem "accepted by", como no modelo `templates/requirements.md`. [source: templates/requirements.md]
<!-- frozen after approval: end -->

## Changes after confirmation
not applicable
