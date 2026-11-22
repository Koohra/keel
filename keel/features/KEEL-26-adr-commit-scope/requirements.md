# KEEL-26 — Destravar o commit de histórias com ADR

Source: https://github.com/Koohra/keel/issues/26, https://github.com/Koohra/keel/issues/27 · Folder: keel/features/KEEL-26-adr-commit-scope/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> #26: `design.md` (passo 10) manda escrever o rascunho da ADR em `keel/adrs/` durante o design, mas o `approve commit` recusa qualquer arquivo fora do `Files:` da task e isenta só a pasta da história; nenhuma task da história consegue commitar. `closing.md` (§4.2) também escreve a ADR, então as duas fases discordam sobre quando ela nasce.
> #27: a checagem de `Files:` só roda no `approve commit`, depois do OK do dev; o dev é chamado a aprovar um commit que não pode acontecer.

## Goal
Uma história cujo design gera candidata a ADR commita as tasks normalmente, a ADR nasce em um só momento (o fechamento, sob a aprovação dos deltas), e arquivo fora do `Files:` da task é barrado antes da pergunta de aprovação ao dev. [source: issues #26 e #27; /mnt/project-files/keel2/e2e-2/resultado.md achados 1 e 2]

## Out of scope
- Formato do `Review:` e mensagem de erro dele (#28), contagem de `[ASSUMPTION]` no `next` (#31), fase tasks e review da confirmação (#29, #30): outras frentes.
- Isentar `keel/adrs/` ou `keel/product.md` no `approve commit`: o rascunho fica na pasta da história, que já é isenta, e o fechamento continua sendo o único lugar que escreve os documentos do projeto.

## Rules and acceptance criteria
R1. WHEN o design.md diz `ADR candidate?` Yes THE skill story SHALL mandar escrever o rascunho em `adr-draft.md` na pasta da história, e o fechamento SHALL escrever a ADR em `keel/adrs/ADR-NNN-<slug>.md` a partir desse rascunho, sob a aprovação dos deltas. [source: issue #26; docs/specification.md, design "Saídas" e closing "Portão"]
  - AC-1.1 GIVEN os arquivos da skill WHEN o teste lê `phases/design.md` e `phases/closing.md` THEN o design escreve o rascunho em `adr-draft.md` da pasta da história e não em `keel/adrs/`, e o fechamento escreve `keel/adrs/ADR-NNN-<slug>.md` a partir do `adr-draft.md`.
R2. IF a mudança da task aberta tem `keel/product.md` ou arquivo de `keel/adrs/` fora do `Files:` THEN THE keel-state.mjs SHALL recusar o `approve commit` dizendo que esses documentos só mudam no fechamento e que o rascunho de ADR fica em `adr-draft.md` na pasta da história. [source: issue #26; scripts/task-loop.mjs approveCommit]
  - AC-2.1 GIVEN a task T1 com `Files: src/login.js` e mudança em `keel/adrs/ADR-002-x.md` WHEN rodo `approve commit --by Ana` THEN o comando falha citando o arquivo, o fechamento e `adr-draft.md`.
R3. WHEN `review task` roda e a mudança da task aberta tem arquivo fora do `Files:` da task THE keel-state.mjs SHALL recusar gravar o review, listando os arquivos e dizendo para desfazer a mudança ou propor ao dev a mudança do `Files:`, para que a pergunta de aprovação não chegue ao dev com um commit que o `approve commit` recusaria. [source: issue #27]
  - AC-3.1 GIVEN a task T1 com `Files: src/login.js` e mudança em `src/login.js` e `src/extra.js` WHEN rodo `review task --result ok` THEN o comando falha citando `src/extra.js` e o `Files:` de T1.
  - AC-3.2 GIVEN a mesma task com mudança só em `src/login.js` WHEN rodo `review task --result ok` THEN o review é gravado.

## Explicit obligations
- Edge cases: arquivo da pasta da história não conta (inclusive `adr-draft.md`); glob no `Files:` vale como no `approve commit`; task que declara `keel/product.md` no `Files:` continua podendo mudá-lo.
- Invariants (must never happen): review gravado ou commit aprovado com arquivo fora do `Files:` da task.
- Existing behavior that must not change: as outras recusas do `approve commit` e do `review task`; a recusa do `approve commit` para arquivo fora do `Files:` (KEEL-21); os deltas do fechamento por `keel/product.md` e `keel/adrs/`. [source: test/task-loop.test.mjs, scripts/closing.mjs]
- Errors and expected responses: a recusa diz a task, os arquivos fora e o que fazer.

## Conflicts found
- `skills/story/phases/design.md` passo 10 escrevia em `keel/adrs/` e `skills/story/phases/closing.md` §4.2 também; R1 deixa só o fechamento escrever em `keel/adrs/`.

## Questions and assumptions
- [ASSUMPTION] O nome do rascunho é `adr-draft.md`, um por história: o design.md tem um só campo `ADR candidate?`. [source: templates/design.md]
<!-- frozen after approval: end -->

## Changes after confirmation
not applicable
