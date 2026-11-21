# KEEL-6 — Fechamento da história

Source: https://github.com/Koohra/keel/issues/6 · Folder: keel/features/KEEL-6-closing/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> Parte 6 de 8 do plano de desenvolvimento do Keel 2 (ver `docs/especificacao.md`, etapa 10). Entrega: tabela de convergência por regra, deltas de product.md e ADR, descrição do PR e `check-feature.mjs`. Pronto quando: a primeira história de ponta a ponta passa na fixture. Depende de #5.

## Goal
Fechar a história com prova por script: cada regra com a evidência que a comprova, arquitetura sem violação nova nem baseline maior, mudança no product.md e nas ADRs aprovada pelo dev, e uma conferência de ponta a ponta que serve também de descrição do PR. [source: docs/specification.md#etapa-10, Como testar o Keel 2.md#camada-3]

## Out of scope
- Abrir o PR pelo script: o modelo abre com o `gh` quando o dev pede, ou entrega a descrição.
- Segunda história de ponta a ponta e piloto: release.
- Rodar de novo o `Verification:` de cada task no fechamento: a evidência de cada task já foi gravada no loop; o fechamento roda as checagens do projeto uma vez.
- Julgar se o teste prova a regra: isso é do modelo e do revisor; o script confere estrutura, commits e citações.

## Rules and acceptance criteria
R1. WHILE a história está na fase closing THE keel-state.mjs SHALL calcular a convergência a cada comando: para cada R# (ou cada task, no nível trivial), as tasks que o cobrem com o nome do teste e o hash do commit, e a situação `met` ou `missing — <motivo>`, devolvendo as linhas prontas da tabela "Convergence". [source: docs/specification.md#etapa-10]
  - AC-1.1 GIVEN a história no closing com T1 a T3 `done` com commits reais WHEN rodo `next` THEN a saída traz `closing.convergence` com uma linha por regra, cada uma com a task, o nome do teste, o hash e `met`.
  - AC-1.2 GIVEN uma regra com AC-3.1 que nenhuma task cita em `Covers:` WHEN rodo `next` THEN a linha de R3 é `missing` citando AC-3.1.
  - AC-1.3 GIVEN uma task com `Status: done (abc1234)` e abc1234 não é commit WHEN rodo `next` THEN as regras dela ficam `missing` citando o hash.
R2. IF uma regra não está `met` ou a tabela "Convergence" do tasks.md não tem as mesmas linhas do script THEN THE keel-state.mjs SHALL recusar `advance` pelo critério `convergence:all-rules`, dizendo o que falta. [source: docs/specification.md#etapa-10, #portões-em-resumo]
  - AC-2.1 GIVEN todas as regras `met` e a tabela vazia WHEN rodo `advance` THEN o comando falha citando `convergence:all-rules` e a tabela.
  - AC-2.2 GIVEN a tabela copiada da saída do script WHEN rodo `advance` THEN `convergence:all-rules` deixa de faltar.
R3. WHILE a história está na fase closing THE keel-state.mjs SHALL rodar o `arch-check.mjs` completo e comparar a baseline com a da base da história; `arch:baseline-not-grown` falha com violação nova ou chave nova na baseline, e sem `keel/architecture.json` fica `skipped` e só passa com a dispensa `Architecture: não se aplica` no "### Checks" do product.md. [source: docs/specification.md#etapa-10, KEEL-7 (verificador movido para a parte 6)]
  - AC-3.1 GIVEN uma chave a mais na baseline em relação à de antes do primeiro commit de task WHEN rodo `advance` THEN o comando falha citando `arch:baseline-not-grown` e a chave.
  - AC-3.2 GIVEN um projeto sem `keel/architecture.json` com `Architecture: não se aplica` no "### Checks" WHEN rodo `next` THEN `closing.arch.status` é `skipped` e `arch:baseline-not-grown` não falta.
  - AC-3.3 GIVEN um projeto sem `keel/architecture.json` e sem a dispensa WHEN rodo `next` THEN `arch:baseline-not-grown` falta citando `Architecture: não se aplica`, e o item architecture do `check-feature.mjs` falha.
R4. WHEN `keel/product.md` ou `keel/adrs/` mudaram desde a base da história (merge-base com o branch do `init --base`; sem ele, o pai do primeiro commit de task) THE keel-state.mjs SHALL listar os arquivos e o delta por seção do product.md e por arquivo de ADR (adicionado, modificado, removido) e exigir `approve deltas --by <dev>`, presa ao hash do conteúdo deles; sem mudança, a aprovação não é exigida. [source: docs/specification.md#etapa-10 "Portão: dev aprova os deltas"]
  - AC-4.1 GIVEN o product.md editado no closing sem aprovação WHEN rodo `advance` THEN o comando falha citando `approval:deltas`.
  - AC-4.2 GIVEN os deltas aprovados e o product.md editado depois WHEN rodo `next` THEN `approval:deltas` volta a faltar.
  - AC-4.3 GIVEN nenhum delta WHEN rodo `approve deltas --by Ana` THEN o comando falha dizendo que não há delta para aprovar.
  - AC-4.4 GIVEN o product.md com uma seção nova, uma mudada e uma removida e uma ADR nova WHEN o script calcula o delta THEN cada seção e a ADR aparecem como adicionado, modificado ou removido, e a descrição do PR lista esse delta.
  - AC-4.5 GIVEN a história iniciada com `--base main` e o product.md mudado num commit antes da primeira task WHEN rodo `next` THEN esse delta aparece em `closing.deltas`.
R5. WHEN o modelo ou o dev roda `check-feature.mjs <pasta>` THE script SHALL conferir e relatar, item por item: documentos válidos com cobertura; state.json em `done` com aprovações válidas pelo hash; um commit real e distinto por task; arquivos de cada commit de task dentro do `Files:` da task ou da pasta da história; checagens do product.md passando; convergência `met` e baseline sem crescer; e sair com 1 se algum item falha. [source: Como testar o Keel 2.md#camada-3, docs/specification.md#arquitetura-do-plugin]
  - AC-5.1 GIVEN uma história fechada pelo fluxo WHEN rodo `check-feature.mjs` THEN todos os itens saem `ok` e o código de saída é 0.
  - AC-5.2 GIVEN o commit da T1 com um arquivo fora do `Files:` da T1 WHEN rodo `check-feature.mjs` THEN o item de escopo falha citando o arquivo e a T1.
  - AC-5.3 GIVEN a história ainda no closing WHEN rodo `check-feature.mjs` THEN o item do state.json falha dizendo a fase.
  - AC-5.4 GIVEN a pasta da história por outra grafia do caminho da raiz (nome curto do Windows ou link simbólico) WHEN rodo `check-feature.mjs` THEN os itens saem `ok`.
R6. WHEN o modelo roda `check-feature.mjs <pasta> --pr` THE script SHALL imprimir a descrição do PR com a história, as regras, a evidência por regra, o resultado de cada item da conferência e os arquivos de delta, e as seções que o modelo preenche: desvios da spec e escopo contra a história original. [source: docs/specification.md#etapa-10]
  - AC-6.1 GIVEN uma história fechada WHEN rodo `check-feature.mjs --pr` THEN a saída tem o texto de R1, a linha de R1 da convergência e os títulos "Deviations from the spec" e "Scope against the original story".
R7. WHEN a história chega ao closing THE skill story SHALL ter instruções que copiam a convergência, transformam regra faltante em task nova sem corrigir código, listam desvios da spec e de escopo, conferem arquitetura e exemplares, propõem os deltas de product.md e a ADR candidata e só aprovam os deltas com a palavra do dev. [source: docs/specification.md#etapa-10]
  - AC-7.1 GIVEN os arquivos da skill WHEN o teste lê o workflow.json THEN a fase closing tem instruções e todo comando citado nelas existe.
R8. WHEN a fase closing roda com uma regra faltando THE skill story SHALL acrescentar uma task nova ao tasks.md em vez de mexer no código ou marcar a regra como `met`. [source: docs/specification.md#etapa-10 "Regra faltante vira task nova"]
  - AC-8.1 GIVEN a APP-8 no closing com AC-1.1 sem task WHEN peço para fechar a história THEN o tasks.md ganha uma task que cita AC-1.1, `src/` não muda e a história não chega a `done`.
R9. WHEN uma história nova é conduzida numa sessão nova na fixture, da triagem ao closing, THE fluxo SHALL terminar em `done` com `check-feature.mjs` saindo com 0. [source: issue #6 "Pronto quando"]
  - AC-9.1 GIVEN o node-mini e uma história nova sem design WHEN a sessão conduz a história até o fim THEN `check-feature.mjs` sai com 0.
R10. WHERE uma task tem `Regression: delivered by T<n>` THE keel-state.mjs SHALL aceitar o RED só com o código entregue sabotado (arquivo mudado fora do `Files:` da task) e o GREEN só com a sabotagem desfeita, e o validador SHALL exigir que T<n> exista e que a task tenha `Test first:`. [source: Miguel em 2026-11-21; Seemann, "Characterization tests"; Feathers, Working Effectively with Legacy Code]
  - AC-10.1 GIVEN uma task de regressão aberta sem sabotagem WHEN rodo `evidence red` THEN o comando falha pedindo a sabotagem; com a sabotagem, aceita e registra os arquivos; no `evidence green` com a sabotagem ainda lá, falha.
  - AC-10.2 GIVEN `Regression: delivered by T9` sem T9, ou sem `Test first:` WHEN valido o tasks.md THEN o validador aponta o erro.

## Explicit obligations
- Edge cases: nível trivial sem requirements.md (convergência por task); task com `No test:` (conta como evidência, mas a regra precisa de ao menos uma task com teste); projeto sem `keel/architecture.json`; história sem commit de task ainda (base = HEAD); state.json de partes anteriores com `closing` antigo.
- Invariants (must never happen): regra `met` sem commit real; fechamento com product.md ou ADR mudados sem aprovação presa ao conteúdo; script escrevendo no tasks.md ou no product.md.
- Existing behavior that must not change: fases, critérios e comandos existentes; aprovação vencida por hash manda a história de volta à fase do portão; o hook só deixa editar código na implementação. [source: scripts/keel-state.mjs, test/keel-state.test.mjs]
- Errors and expected responses: cada recusa diz o critério, a regra, task ou arquivo e o comando que resolve.

## Questions and assumptions
- [DECISION] Regra `met` exige que cada AC dela seja citado no `Covers:` de uma task feita; AC sem task vira `missing` (rastreabilidade do Spec Kit analyze). [source: Miguel em 2026-11-21]
- [DECISION] A base da história é o merge-base com o branch do `init --base` (padrão `origin/HEAD`), como o diff de três pontos de um PR no GitHub; sem ele, o pai do commit de task mais antigo no histórico. [source: Miguel em 2026-11-21]
- [DECISION] Os deltas são as próprias edições no `keel/product.md` e em `keel/adrs/`; o script mostra o delta por seção e por arquivo de ADR (ADDED/MODIFIED/REMOVED do OpenSpec), sem arquivo de delta separado. [source: Miguel em 2026-11-21]
- [DECISION] Sem `keel/architecture.json` o fechamento só passa com a dispensa explícita `Architecture: não se aplica` no "### Checks" do product.md. [source: Miguel em 2026-11-21]
- [DECISION] O ponta a ponta da parte 6 é conduzido pelo Claude no papel do dev; o Miguel conduz um piloto real antes do release. [source: Miguel em 2026-11-21]
- [DECISION] Regra já entregue por uma task anterior vira task de regressão com RED por sabotagem (R10). [source: Miguel em 2026-11-21]

## Conflicts found
- not applicable

## Changes after confirmation
- 2026-11-21, Miguel aprovou as propostas sobre as suposições ("gostei de tudo"): R3 (skipped só com dispensa, AC-3.3), R4 (base por merge-base e delta por seção, AC-4.4 e AC-4.5), AC-5.4 (falha do CI no Windows) e R10 (task de regressão). Pede nova aprovação no review do PR.
<!-- frozen after approval: end -->
