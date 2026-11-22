# KEEL-21 — Foco: terminar o que foi pedido, sem trabalho extra

Source: https://github.com/Koohra/keel/issues/21 · Folder: keel/features/KEEL-21-finish-what-was-asked/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> Pedido do Miguel em 2026-11-22: o agente tem dificuldade de concluir e fica sugerindo fazer mais em vez de focar no que foi pedido. Hoje o Keel só barra arquivo fora do `Files:` da task no fechamento. Transformar em regra do Keel: terminar exatamente o que foi pedido, sem propor nem fazer trabalho extra.

## Goal
O agente que conduz uma história faz só o que a fase e a task pedem, termina e para no resultado ou na pergunta do portão, sem oferecer extras; e a mudança que sai do `Files:` da task é barrada no commit da task, não só no fechamento. [source: Miguel em 2026-11-22; docs/specification.md "Escopo é contrato"]

## Out of scope
- Checar por script o texto das respostas do agente (ofertas de trabalho extra): fica como instrução e revisão.
- Caso de eval novo: a regra de script tem teste unitário; a instrução tem teste de presença.
- Skill setup e README: outras frentes abertas mexem neles.

## Rules and acceptance criteria
R1. WHEN `approve commit` roda e a mudança da task aberta (arquivos diferentes do HEAD ou novos, fora da pasta da história) tem arquivo fora do `Files:` da task THE keel-state.mjs SHALL recusar a aprovação listando os arquivos e dizendo para desfazer a mudança ou, se a task precisa dela, propor ao dev a mudança do `Files:` no tasks.md. [source: docs/specification.md "Escopo é contrato"; scripts/check-feature.mjs scopeItem]
  - AC-1.1 GIVEN a task T1 com `Files: src/login.js` e mudança em `src/login.js` e `src/extra.js` WHEN rodo `approve commit --by Ana` THEN o comando falha citando `src/extra.js` e o `Files:` de T1.
  - AC-1.2 GIVEN a mesma task com mudança só em `src/login.js` WHEN rodo `approve commit --by Ana` THEN a aprovação é gravada.
R2. WHEN qualquer fase roda THE skill story SHALL mandar fazer só o que a fase e a task pedem e terminar; não propor nem começar trabalho fora disso; registrar achado fora do escopo em uma linha em "Implementation notes", sem oferta; e terminar a resposta ao dev no resultado ou na pergunta do portão. [source: Miguel em 2026-11-22]
  - AC-2.1 GIVEN os arquivos da skill WHEN o teste lê `SKILL.md` e `phases/implementation.md` THEN a regra de foco está nas regras de todas as fases e a implementação manda remover o que está fora do `Files:` antes do `approve commit`.

## Explicit obligations
- Edge cases: arquivo da pasta da história não conta; task de regressão desfaz a sabotagem antes do GREEN, então não sobra arquivo fora; glob no `Files:` vale como no fechamento.
- Invariants (must never happen): `approve commit` gravado com arquivo fora do `Files:` da task.
- Existing behavior that must not change: as outras recusas do `approve commit` (Status, evidência, checagens, review, destino dos achados); o item scope do `check-feature.mjs`. [source: scripts/task-loop.mjs, test/task-loop.test.mjs]
- Errors and expected responses: a recusa diz a task, os arquivos fora e o que fazer.

## Conflicts found
- `skills/story/phases/implementation.md` passo 4.2 permitia arquivo em `outsideTask` com explicação na proposta de commit, mas o fechamento já reprova o mesmo arquivo (`check-feature.mjs`, item scope). R1 alinha a implementação ao fechamento.

## Questions and assumptions
- [ASSUMPTION] Arquivo que a task precisa e não declarou é mudança do plano: o `Files:` muda no tasks.md, o que vence a aprovação do tasks.md e pede nova aprovação do dev. [source: skills/story/SKILL.md "Pular, reordenar ou declarar fase cumprida por conta própria"]
<!-- frozen after approval: end -->

## Changes after confirmation
not applicable
