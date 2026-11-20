# KEEL-4 — Design e tasks

Source: https://github.com/Koohra/keel/issues/4 · Folder: keel/features/KEEL-4-design-and-tasks/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> Parte 4 de 8 do plano de desenvolvimento do Keel 2 (ver `docs/especificacao.md`, etapas 5 e 6). Entrega: design condicional (só com gatilho de design) e planejamento de tasks com cobertura regra → task → teste. Pronto quando: casos das etapas 5 e 6 passam. Depende de #3.

## Goal
Levar a história da confirmação até o plano aprovado: no nível `with-design` a skill escreve o design.md com gatilho, estrutura nova justificada e candidata a ADR; em todo nível ela escreve o tasks.md com esqueleto andante e fatias, e o script confere campos e cobertura entre requisitos, design e tasks antes da aprovação do dev. [source: docs/specification.md#etapa-5, #etapa-6]

## Out of scope
- Loop da task em TDD, review da task, rubrica de design do revisor e commit: parte 5.
- Revisor isolado lendo o design.md: a etapa 5 não pede; a rubrica entra na parte 5.
- Checar se a seção "Alternatives considered" traz link de fonte: é julgamento de conteúdo, fica na instrução da fase.
- Mudar a ordem das fases ou os critérios do `workflow.json`.

## Rules and acceptance criteria
R1. THE validate-feature.mjs SHALL recusar task sem `Files:`, `Done when:`, `Depends on:` ou `New structure:`, e `Test first:` que não diga nome e o que verifica. [source: docs/specification.md#etapa-6]
  - AC-1.1 GIVEN um tasks.md com uma task sem `Files:` e outra com `Test first: users.test.mjs` WHEN valido THEN o erro cita cada task e o campo que falta ou está incompleto.
R2. THE validate-feature.mjs SHALL exigir que a T1 seja o esqueleto andante (`## T1 — Walking skeleton: ...`). [source: docs/specification.md#etapa-6]
  - AC-2.1 GIVEN um tasks.md cuja T1 se chama "Validação de e-mail" WHEN valido THEN o erro diz que a T1 é o esqueleto andante.
R3. IF uma task cita um `AC-#.#` que não existe no requirements.md, ou não há requirements.md e o `Covers:` não traz um critério GIVEN/WHEN/THEN, THEN THE validate-feature.mjs SHALL acusar a task. [source: docs/specification.md#etapa-6, decisão do Miguel na parte 2]
  - AC-3.1 GIVEN uma task com `Covers: R1 (AC-1.9)` WHEN valido com o requirements.md THEN o erro diz que AC-1.9 não existe.
  - AC-3.2 GIVEN um tasks.md sem requirements.md e uma task com `Covers: e-mail com espaço` WHEN valido THEN o erro pede o critério GIVEN/WHEN/THEN no `Covers:`.
R4. THE validate-feature.mjs SHALL recusar design.md sem gatilho de um tipo conhecido, com linha da tabela "New structure and rationale" sem tipo, heurística ou alternativa mais simples, sem "none" quando a tabela está vazia, sem `Yes` ou `No` com motivo na candidata a ADR, sem regra citada na abordagem, ou citando regra que não existe. [source: docs/specification.md#etapa-5]
  - AC-4.1 GIVEN `Trigger: porque sim` WHEN valido THEN o erro lista os tipos aceitos.
  - AC-4.2 GIVEN uma linha `UserStore | interface | ficou mais limpo | —` WHEN valido THEN o erro diz que falta a heurística e a alternativa mais simples.
  - AC-4.3 GIVEN a seção "ADR candidate?" com `Talvez` WHEN valido THEN o erro pede `Yes — <motivo>` ou `No — <motivo>`.
  - AC-4.4 GIVEN uma abordagem que cita R7 e um requirements.md com R1 a R3 WHEN valido THEN o erro diz que R7 não existe.
R5. WHEN há design.md THE validate-feature.mjs SHALL conferir que cada elemento da tabela "New structure and rationale" é declarado em algum `New structure:` de task e que toda estrutura declarada numa task está na tabela. [source: docs/specification.md#etapa-5, #etapa-6]
  - AC-5.1 GIVEN o design com `UserStore` e nenhuma task que o declare WHEN valido THEN o erro diz que UserStore não tem task.
  - AC-5.2 GIVEN uma task com `New structure: EmailValidator (helper)` que não está na tabela WHEN valido THEN o erro diz que a estrutura não foi justificada no design.md.
R6. THE keel-state.mjs SHALL usar as checagens cruzadas nos critérios `valid:` e em `approve`, para que design ou tasks inconsistentes com os outros documentos não sejam aprovados nem deixem a fase. [source: docs/specification.md#sequência-controlada-por-script-workflowjson]
  - AC-6.1 GIVEN a história na fase tasks com um design.md cuja abordagem cita R9 WHEN rodo `approve design.md --by Ana` THEN o comando falha dizendo que R9 não existe.
R7. WHEN a história chega às fases design ou tasks THE skill story SHALL ter instruções da fase que escrevem o documento pelo modelo, validam por script, apresentam ao dev o plano (e o design) e só aprovam com a palavra do dev. [source: docs/specification.md#etapa-5, #etapa-6]
  - AC-7.1 GIVEN os arquivos da skill WHEN o teste lê o workflow.json THEN as fases design e tasks têm arquivo de instruções e todo comando e script citado existe.
R8. WHEN os casos das etapas 5 e 6 rodam THE skill story SHALL escrever o design com gatilho e candidata a ADR, escrever o plano sem aprová-lo sozinha e aprovar design e tasks quando o dev aprova. [source: issue #4]
  - AC-8.1 GIVEN a história APP-10 (troca do armazenamento em memória, que contraria a ADR-001) na fase design WHEN peço para continuar THEN o design.md tem `Trigger:` de dados e `Yes` na candidata a ADR, a história chega à fase tasks e `src/` não muda.
  - AC-8.2 GIVEN a história APP-8 confirmada na fase tasks WHEN peço para continuar THEN o tasks.md existe com a T1 de esqueleto andante e `approve tasks.md` não roda.
  - AC-8.3 GIVEN a história APP-10 na fase tasks com design.md e tasks.md prontos WHEN digo que aprovo o design e as tasks THEN os dois são aprovados e a história chega à implementação.

## Explicit obligations
- Edge cases: tabela de estrutura nova com só o cabeçalho e "none"; nome do elemento com crases ou com o tipo entre parênteses na task; task sem teste (`No test:`) continua sem `Verification:` obrigatório; nível trivial sem requirements.md nem design.md.
- Invariants (must never happen): o validador julga conteúdo (só formato e referências); design ou tasks aprovados com referência a regra ou AC inexistente.
- Existing behavior that must not change: comandos, fases e critérios do keel-state.mjs; hash só do bloco congelado; as histórias do próprio Keel continuam passando no validador. [source: scripts/keel-state.mjs, test/validate-feature.test.mjs]
- Errors and expected responses: cada erro diz o arquivo, a task ou seção e o que escrever.

## Questions and assumptions
- [ASSUMPTION] O campo `New structure:` entra no modelo de task (com `none` quando não há), porque a etapa 6 pede "declarar em cada task os elementos estruturais novos permitidos" e o modelo não tinha onde. As histórias já entregues ganham o campo para continuar válidas. — a aceitar no review do PR.
- [ASSUMPTION] Sem design.md (níveis trivial e standard) não há cruzamento de estrutura: a task só declara. Exigir design para todo módulo novo travaria histórias comuns. — a aceitar no review do PR.
- [ASSUMPTION] Tipos de gatilho aceitos: os seis do modelo mais `new structure` e `rung change`, que a triagem já trata como gatilho. — a aceitar no review do PR.

## Conflicts found
- not applicable

## Changes after confirmation
- not applicable
<!-- frozen after approval: end -->
