# KEEL-29 — Tasks sempre com RED possível e review da confirmação que respeita o escopo

Source: https://github.com/Koohra/keel/issues/29 e https://github.com/Koohra/keel/issues/30 · Folder: keel/features/KEEL-29-red-tasks-and-review-scope/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> #29: O primeiro plano tinha 13 tasks, 5 delas marcadas "só teste", cujos testes passariam de cara porque a T1 já entregava o comportamento. Só depois que a dev pediu 3 tasks o agente refez o plano corretamente. `skills/story/phases/tasks.md` deveria proibir task que não consegue produzir RED (ou dizer como juntá-la a outra, ou usar `Regression: delivered by T<n>`).
>
> #30: Os 5 findings do revisor isolado na confirmação levaram a história de 4 para 10 regras: escrita atômica, cadastros simultâneos, PORT, permissão de leitura e `USERS_FILE` vazio. "Cadastros simultâneos" contraria em parte o "Fora de escopo: acesso concorrente" que o próprio agente tinha escrito. Duas ACs não podem ser testadas de verdade no ambiente (AC-9.1 pulada por rodar como root, AC-8.1 só simulada). O revisor ou a fase de confirmação deveria respeitar o fora de escopo e propor findings fora da história como pendência, não como regra nova.

## Goal
A fase tasks não planeja task cujo teste passaria antes do código dela, e o review da confirmação não faz a história crescer além do objetivo e do fora de escopo que ela já declara. [source: issues #29 e #30; /mnt/project-files/keel2/e2e-2/resultado.md achados 4 e 5]

## Out of scope
- Checagem por script de task "só teste": o validador não sabe se um teste passaria antes do código; fica como instrução da fase.
- Mudar o formato do requirements.md ou o validador: a pendência usa a seção "Out of scope" que já existe.
- O resto da fase de confirmação e da revisão de task.

## Rules and acceptance criteria
R1. WHEN a fase tasks planeja uma task com `Test first:` THE skill story SHALL exigir que o teste falhe antes do código da task; se passaria com o código de uma task anterior, o `Test first:` da task que entrega o comportamento passa a verificar também aquele critério ou a task vira `Regression: delivered by T<n>`, e nunca há task "só teste" sem `Regression:`. [source: issue #29]
  - AC-1.1 GIVEN os arquivos da skill WHEN o teste lê `phases/tasks.md` THEN a fase proíbe task "só teste" sem `Regression:`, manda ampliar o `Test first:` da task que entrega o comportamento ou usar `Regression: delivered by T<n>`, e a apresentação ao dev diz de onde vem o RED de cada task.
R2. WHEN o revisor isolado faz a revisão de requisitos THE reviewer SHALL ler o objetivo e o "Out of scope" e não reportar como falta o que está fora deles; borda fora do objetivo sai marcada como fora da história. [source: issue #30]
  - AC-2.1 GIVEN os arquivos do plugin WHEN o teste lê a "Revisão de requisitos" de `agents/reviewer.md` THEN ela manda ler "Goal" e "Out of scope", não reportar o que já está fora de escopo e marcar achado fora do objetivo como fora da história.
R3. WHEN a fase de confirmação apresenta os achados do revisor THE skill story SHALL propor regra nova só para achado dentro do objetivo e com resultado observável no ambiente de teste do projeto; o resto vira pendência em "Out of scope", e o resumo diz quantas regras a história tinha e quantas terá. [source: issue #30]
  - AC-3.1 GIVEN os arquivos da skill WHEN o teste lê `phases/confirmation.md` THEN a fase manda propor achado fora do objetivo, que contraria o "Out of scope" ou que não se testa de verdade no ambiente como pendência em "Out of scope", não como regra nova, e mostrar a contagem de regras antes e depois.

## Explicit obligations
- Edge cases: achado dentro do objetivo mas sem resultado esperado conhecido continua `[QUESTION]`, como na fase de requisitos; o dev ainda pode escolher transformar a pendência em regra.
- Invariants (must never happen): o agente acrescentar regra que contraria o "Out of scope" sem o dev decidir o conflito.
- Existing behavior that must not change: limite de 5 achados e formato da resposta do revisor; `Regression: delivered by T<n>` e o RED por sabotagem. [source: agents/reviewer.md, skills/story/phases/tasks.md, skills/story/phases/implementation.md]
- Errors and expected responses: none.

## Questions and assumptions
- [ASSUMPTION] "Pendência" é uma linha no "Out of scope" do requirements.md, marcada como achado do review, porque é a seção que já diz o que a história não faz. [source: issue #30]

## Conflicts found
not applicable
<!-- frozen after approval: end -->

## Changes after confirmation
not applicable
