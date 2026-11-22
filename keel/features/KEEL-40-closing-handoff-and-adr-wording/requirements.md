# KEEL-40 — Fechamento sem arquivo do PR solto, conversa nova antes dele e texto da pergunta de ADR

Source: https://github.com/Koohra/keel/issues/40 e https://github.com/Koohra/keel/issues/41 · Folder: keel/features/KEEL-40-closing-handoff-and-adr-wording/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> #40: O fechamento gravou a descrição do PR (`check-feature.mjs --pr`) em `APP-21-pr.md` na raiz do projeto, que ficou sem rastrear depois do commit do fechamento. `skills/story/phases/closing.md` deveria dizer onde a descrição fica. `skills/story/SKILL.md` passo 6 sugere conversa nova na saída de requirements, confirmation, tasks e a cada task, mas não na passagem de implementation para closing.
> #41: Na fase requirements, a pergunta sobre o conflito com a ADR-001 recomendou "ADR escrita na fase de design". Depois do #34, o design escreve só `adr-draft.md` na pasta da história, e a ADR em `keel/adrs/` nasce no fechamento. Conferir `requirements.md`, `confirmation.md` e a spec para alinhar a redação.

## Goal
O fechamento não deixa arquivo solto no projeto e começa numa conversa nova, e a pergunta sobre conflito com ADR descreve o caminho atual da ADR. [source: issues #40 e #41; /mnt/project-files/keel2/e2e-3/resultado.md achados 4 a 6]

## Out of scope
- `evidence red` (#37) e o fluxo de proposta e `approve commit` (#38, #39).
- Mudar `check-feature.mjs --pr`: ele só imprime; quem gravou o arquivo foi o agente.

## Rules and acceptance criteria
R1. WHEN o fechamento gera a descrição do PR THE skill story SHALL mostrá-la na resposta e, se o dev pedir `gh pr create --body-file`, gravar o arquivo fora da árvore do projeto, nunca na raiz nem na pasta da história. [source: issue #40 item 1]
  - AC-1.1 GIVEN os arquivos do repo WHEN o teste lê `skills/story/phases/closing.md` THEN o passo 6.4 mostra a descrição na resposta e manda gravar o arquivo fora da árvore do projeto.
R2. WHEN um `advance` de implementation para closing é aceito THE skill story SHALL sugerir seguir numa conversa nova (`/clear`). [source: issue #40 item 2]
  - AC-2.1 GIVEN os arquivos do repo WHEN o teste lê `SKILL.md`, `implementation.md` e a spec THEN os três sugerem a conversa nova na saída de implementation.
R3. WHEN os requisitos registram um conflito com uma ADR e recomendam mudar a decisão THE skill story SHALL dizer que o design rascunha a ADR em `adr-draft.md` e que ela nasce em `keel/adrs/` no fechamento. [source: issue #41; skills/story/phases/design.md passo 10]
  - AC-3.1 GIVEN os arquivos do repo WHEN o teste lê `requirements.md` THEN o passo 6 cita `adr-draft.md` e o fechamento, e não diz "ADR escrita na fase de design".

## Explicit obligations
- Existing behavior that must not change: a conversa nova nas saídas de requirements, confirmation e tasks e a cada task; triage, reading e design seguem na mesma conversa. [source: skills/story/SKILL.md passo 6]

## Conflicts found
- KEEL-32 assumiu que o fechamento não precisava de conversa nova por terminar a história; o e2e-3 mostrou que a passagem para ele carrega o histórico das tasks. Esta história acrescenta a saída de implementation. [source: keel/features/KEEL-32-new-session-per-phase/requirements.md; issue #40]

## Questions and assumptions
- [ASSUMPTION] `confirmation.md` e a spec não precisam de mudança para o #41: nenhum dos dois diz que o design escreve a ADR (spec, saídas do design e fechamento, já citam `adr-draft.md`). [source: docs/specification.md; skills/story/phases/confirmation.md]
- [ASSUMPTION] A descrição do PR fica na resposta, e não na pasta da história: um arquivo ali entraria no commit do fechamento ou ficaria solto depois dele. [source: skills/story/phases/closing.md passo 6.3]
<!-- frozen after approval: end -->

## Changes after confirmation
not applicable
