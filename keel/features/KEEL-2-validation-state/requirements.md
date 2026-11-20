# KEEL-2 — Validação e estado

Source: https://github.com/Koohra/keel/issues/2 · Folder: keel/features/KEEL-2-validation-state/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> `validate-feature.mjs`, `keel-state.mjs` (next, advance, approve, hash) e hook `PreToolUse` que bloqueia escrita em `state.json` e edição de código fora da fase. Define o formato exato dos critérios do `workflow.json`. Pronto quando: a camada 0 (`node --test`) cobre transições válidas e inválidas; a camada 0 cobre aprovação vencida (arquivo mudou depois do hash).

## Goal
Tirar da IA a decisão de qual é o próximo passo e a checagem mecânica dos documentos: um script valida a pasta da história, outro guarda o estado e só avança quando os critérios do `workflow.json` passam, e um hook impede pular etapa. [source: docs/specification.md#sequência-controlada-por-script-workflowjson, ADR-002]

## Out of scope
- Loop da task na implementação (`taskExit`, task atual, evidência RED e GREEN, commit): parte 5.
- Critérios de fechamento (`convergence`, `arch`, `approval:deltas`): partes 6 e 7. Até lá o script recusa avançar de `closing` dizendo que o verificador ainda não existe.
- `repo-map.mjs`: parte 3. Aqui só o registro `generated repo-map`.
- Skill que chama os scripts e `phases/*.md`: parte 3.

## Rules and acceptance criteria
R1. WHEN o validador recebe uma pasta de história THE validador SHALL apontar seção ausente ou vazia, regra fora de EARS, regra sem critério de aceite, ID repetido e task sem `Covers:`, sem teste e comando ou com dependência inexistente ou em ciclo. [source: docs/specification.md#etapa-3, #etapa-6]
  - AC-1.1 GIVEN um requirements.md com uma regra sem AC WHEN rodo o validador THEN ele falha nomeando a regra.
  - AC-1.2 GIVEN um tasks.md com T1 e T2 dependendo uma da outra WHEN rodo o validador THEN ele falha apontando o ciclo.
R2. WHEN o validador confere a cobertura THE validador SHALL exigir que toda regra tenha ao menos uma task com teste e que toda task cubra só regras existentes. [source: docs/specification.md#etapa-6]
  - AC-2.1 GIVEN R2 coberta só por uma task `No test:` WHEN confiro a cobertura THEN R2 aparece como sem teste.
R3. WHEN a skill pede `next` THE keel-state.mjs SHALL devolver a fase atual, as instruções da fase e cada critério de saída que falta, com o motivo. [source: docs/specification.md#sequência-controlada-por-script-workflowjson]
  - AC-3.1 GIVEN uma história recém-criada WHEN rodo `next` THEN a fase é `triage` e falta `approval:level`.
R4. IF um critério de saída da fase atual não passa THEN THE keel-state.mjs SHALL recusar o `advance` e listar o que falta, sem mudar o state.json. [source: ADR-002]
  - AC-4.1 GIVEN a fase `requirements` com `[QUESTION]` aberta WHEN rodo `advance` THEN ele sai com código 1 e cita `noOpenQuestions`.
  - AC-4.2 GIVEN todos os critérios atendidos WHEN rodo `advance` THEN a fase muda para a seguinte, pulando `design` quando o nível não é `with-design`.
  - AC-4.3 GIVEN o nível `trivial` WHEN a leitura termina e rodo `advance` THEN a fase vai direto para `tasks`, e a cobertura aceita o critério escrito no `Covers:` da task.
R5. WHEN o dev aprova um documento THE keel-state.mjs SHALL gravar quem aprovou, quando e o hash do conteúdo, e só aceitar a aprovação na fase que tem esse portão e com o documento válido. [source: docs/specification.md#estado-da-história-statejson]
  - AC-5.1 GIVEN a fase `requirements` WHEN rodo `approve requirements.md` THEN ele recusa porque o portão é da fase `confirmation`.
R6. IF um documento aprovado muda depois da aprovação THEN THE keel-state.mjs SHALL vencer a aprovação e voltar a história para a fase do portão daquele documento. [source: docs/specification.md#estado-da-história-statejson]
  - AC-6.1 GIVEN a história em `implementation` WHEN uma regra do requirements.md muda e rodo `next` THEN a fase volta para `confirmation` e `requirements.md` aparece como aprovação vencida.
  - AC-6.2 GIVEN a história em `implementation` WHEN só o "Progress", as notas ou o cabeçalho do tasks.md mudam THEN a aprovação do tasks.md continua valendo, porque o hash cobre só o bloco congelado após aprovação.
R7. IF a IA tenta escrever um `state.json` de história, por ferramenta de edição ou comando de terminal, THEN THE hook PreToolUse SHALL bloquear e indicar o keel-state.mjs. [source: docs/specification.md#estado-da-história-statejson]
  - AC-7.1 GIVEN qualquer fase WHEN chega um Write em `keel/features/X/state.json` THEN o hook sai com código 2.
  - AC-7.2 GIVEN qualquer fase WHEN chega um Bash `echo {} > keel/features/X/state.json` THEN o hook sai com código 2; `cat`, `git checkout` e o keel-state.mjs passam.
R8. WHILE a história da branch atual não está numa fase com `allowSourceEdits` THE hook PreToolUse SHALL bloquear edição de arquivos do projeto fora de `keel/`. [source: docs/specification.md#estado-da-história-statejson]
  - AC-8.1 GIVEN a história em `tasks` WHEN chega um Edit em `src/app.js` THEN o hook sai com código 2 citando a fase.
  - AC-8.2 GIVEN a mesma história WHEN chega um Edit em `keel/features/X/tasks.md` THEN o hook libera.
R9. THE workflow.json SHALL usar só critérios no formato `<tipo>[:<alvo>][?]` com tipo conhecido pelo keel-state.mjs. [source: issue #2]
  - AC-9.1 GIVEN o workflow.json WHEN rodo `npm test` THEN todo critério tem verificador ou está marcado como pendente de uma parte futura.

R10. IF o state.json diz uma fase cujos portões anteriores não estão cumpridos THEN THE keel-state.mjs SHALL voltar a história para a primeira fase que falta, a cada comando e no hook. [source: review do PR #10, Miguel em 2026-11-20]
  - AC-10.1 GIVEN um state.json com `phase: implementation` gravado à mão e nenhum portão cumprido WHEN o hook recebe um Edit em `src/app.js` THEN ele bloqueia citando a fase `triage`.

## Explicit obligations
- Edge cases: história sem branch correspondente à atual não bloqueia nada; caminho fora do projeto não é bloqueado; arquivo com CRLF tem o mesmo hash que com LF.
- Invariants (must never happen): `advance` mudar de fase com critério falhando; o modelo gravar state.json por ferramenta de edição; aprovação valer para conteúdo diferente do aprovado.
- Existing behavior that must not change: testes da parte 1 continuam passando. [source: test/*.test.mjs]
- Errors and expected responses: comando ou argumento inválido sai com código 1 e mensagem do que corrigir; state.json ilegível bloqueia a edição de código e diz como restaurar.

## Questions and assumptions
- O hash da aprovação cobre só o bloco `<!-- frozen after approval -->`, como o BMAD; o andamento das tasks fica na seção "Progress", fora dele. Escolhido por Miguel em 2026-11-20 no review do PR #10.
- O state.json não guarda o que o arquivo já diz (contagem de perguntas, `generated` dos documentos, `design.required`): o script lê os arquivos. Aceito por Miguel em 2026-11-20 no review do PR #10, assim como `closing` recusar avançar até as partes 6 e 7.
- Fluxo da história trivial: Miguel escolheu em 2026-11-20 pular requirements e confirmação; o critério fica no `Covers:` da task.

## Conflicts found
- docs/specification.md diz que o trivial tem só tasks.md, mas o workflow.json da parte 1 não pulava nenhuma fase para ele. Decisão de Miguel (2026-11-20): `requirements` e `confirmation` ganham `skipUnless: level=standard,with-design`.
- docs/specification.md mostra `state.level` e `file:repo-map` no exemplo do workflow.json; o formato exato fica `approval:level` (o comando `level` grava nível e confirmação juntos) e `generated:repo-map`, porque o lugar do repo map é decidido na parte 3.

## Changes after confirmation
- Nenhuma.
<!-- frozen after approval: end -->
