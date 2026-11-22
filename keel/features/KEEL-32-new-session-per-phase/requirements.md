# KEEL-32 — Conversa nova a cada fase para retomar mais barato

Source: https://github.com/Koohra/keel/issues/32 · Folder: keel/features/KEEL-32-new-session-per-phase/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> Achado na segunda história de ponta a ponta (APP-21, 2026-11-22). Retomar a mesma sessão (`claude -p --resume`) custou de US$ 0,5 a 2 por resposta curta conforme o contexto crescia; só aprovar as tasks custou US$ 1,99. A rodada parou em US$ 11,06 na T1, e uma história with-design com 3 tasks não coube no orçamento de US$ 10 da spec. Vale medir quanto do contexto vem de cada fase carregada e encerrar a sessão a cada fase, como já se faz a cada task.

## Goal
A saída das fases cujo resultado já está nos arquivos da história termina sugerindo uma conversa nova, como a task já faz, para que a história não carregue o histórico de todas as fases anteriores. [source: issue #32; skills/story/phases/implementation.md passo 1.3]

## Medição
- Instruções carregadas por fase (bytes, commit 49cbce3): `SKILL.md` 4.115 em toda fase; triage 1.668, reading 1.782, requirements 2.116, confirmation 1.820, design 3.265, tasks 3.821, implementation 7.691, closing 4.869. Somadas, as oito fases dão cerca de 27 KB, uma fração pequena do contexto. [source: `wc -c skills/story/SKILL.md skills/story/phases/*.md`]
- Custo por resposta na mesma sessão do APP-21, da triagem à aprovação das tasks: 0,05, 0,13, 0,43, 0,51, 0,82, 1,11, 1,71, 1,89 e 1,99 (US$). A T1 numa sessão nova começou em 1,01. O que cresce é o histórico da conversa (arquivos lidos, saídas de script, respostas do revisor), não o texto das fases. [source: log da rodada e2e-2, 2026-11-22]

## Out of scope
- Encolher o texto das fases: a medição mostra que ele não é o que pesa.
- Mudar o `next`, o hook SessionStart ou o arquivo da fase de implementação: o `next` e o SessionStart já retomam a história numa conversa nova.

## Rules and acceptance criteria
R1. WHEN um `advance` é aceito na saída de requirements, confirmation ou tasks THE skill story SHALL terminar a resposta com a fase nova e a sugestão de seguir numa conversa nova (`/clear`), dizendo que o `next` retoma de onde parou; na saída de triage, reading e design SHALL seguir na mesma conversa. [source: issue #32]
  - AC-1.1 GIVEN os arquivos do repo WHEN o teste lê `skills/story/SKILL.md` e `docs/release.md` THEN o passo 6 do fluxo sugere a conversa nova nas três saídas e segue na mesma conversa nas outras, e o ponta a ponta da release usa uma sessão nova por fase e por task.

## Explicit obligations
- Existing behavior that must not change: a sugestão de conversa nova a cada task (implementation.md passo 1.3); o `next` como primeiro passo ao retomar. [source: skills/story/SKILL.md passo 2]

## Conflicts found
none

## Questions and assumptions
- [ASSUMPTION] Triage, reading e design seguem na mesma conversa: o texto original da história só vive na conversa até a leitura copiá-lo (o `init` grava só chave, título e link), os requisitos usam as fontes que a leitura abriu, e as tasks são aprovadas junto com o design. Closing termina a história, então não há fase nova. [source: skills/story/phases/triage.md; scripts/keel-state.mjs; skills/story/phases/design.md]
- [ASSUMPTION] Sair de requirements sem perguntas abertas agora para numa resposta ao dev, em vez de seguir direto para a confirmation; a confirmation só relê o requirements.md, então a conversa nova custa pouco. [source: skills/story/phases/confirmation.md]
<!-- frozen after approval: end -->

## Changes after confirmation
not applicable
