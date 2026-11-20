# Tasks — KEEL-2

Requisitos: requirements.md · Design: não há
Aprovação: no review do PR

<!-- congelado após aprovação: início -->
## T1 — Esqueleto andante: validador dos documentos da história
Cobre: R1 (AC-1.1, AC-1.2), R2 (AC-2.1)
Arquivos: `scripts/validate-feature.mjs`, `test/validate-feature.test.mjs`, `test/fixtures.mjs`
Teste primeiro: `test/validate-feature.test.mjs` — seções, EARS, AC, IDs, campos da task, ciclo, cobertura e as histórias do próprio repo
Verificação: `node --test test/validate-feature.test.mjs`
Pronto quando: os 10 testes passam, inclusive KEEL-1 e KEEL-2 validados pelo script
Depende de: —

## T2 — Estado: next, advance, approve, hash e aprovação vencida
Cobre: R3 (AC-3.1), R4 (AC-4.1, AC-4.2, AC-4.3), R5 (AC-5.1), R6 (AC-6.1, AC-6.2), R9 (AC-9.1)
Arquivos: `scripts/keel-state.mjs`, `workflow/workflow.json`, `test/keel-state.test.mjs`, `test/workflow.test.mjs`
Teste primeiro: `test/keel-state.test.mjs` — transições válidas e inválidas, portões, níveis, hash e aprovação vencida, critérios conhecidos e CLI
Verificação: `node --test test/keel-state.test.mjs test/workflow.test.mjs`
Pronto quando: os testes passam e todo critério do workflow.json tem verificador ou parte futura
Depende de: T1

## T3 — Hook PreToolUse
Cobre: R7 (AC-7.1), R8 (AC-8.1, AC-8.2)
Arquivos: `scripts/hooks/pre-tool-use.mjs`, `hooks/hooks.json`, `test/pre-tool-use.test.mjs`
Teste primeiro: `test/pre-tool-use.test.mjs` — state.json bloqueado, código só em implementation, história achada pela branch, registro no hooks.json
Verificação: `node --test test/pre-tool-use.test.mjs`
Pronto quando: os 4 testes passam e `claude plugin validate .` aceita o hooks.json
Depende de: T2

## T4 — Formato dos critérios na especificação
Cobre: R9
Sem teste: documentação; o formato é conferido pelo teste de critérios da T2.
Depende de: T2

## T5 — Ajustes do review do PR: bloco congelado e portões não pulados
Cobre: R6 (AC-6.2), R7 (AC-7.2), R10 (AC-10.1)
Arquivos: `templates/*.md`, `scripts/validate-feature.mjs`, `scripts/keel-state.mjs`, `scripts/hooks/pre-tool-use.mjs`, `hooks/hooks.json`, `test/*.test.mjs`, `docs/especificacao.md`
Teste primeiro: bloco congelado nos três documentos, plano dentro e andamento fora, hash só do bloco, `checkCommand`, fase forjada volta ao primeiro portão, hook no Bash
Verificação: `npm test`
Pronto quando: `npm test` e `claude plugin validate .` passam
Depende de: T3
<!-- congelado após aprovação: fim -->

## Andamento
### T1
Status: green
Evidência RED: `npm test` com os testes escritos e sem o script: o arquivo falhou com ERR_MODULE_NOT_FOUND (falha de import, porque o módulo era novo); com o script, só "as histórias do próprio Keel" falhou com ENOENT em `keel/features/KEEL-2-validacao-estado/tasks.md`, que ainda não existia.
Evidência GREEN: `node --test test/validate-feature.test.mjs` 10 de 10 passam.
Review: revisor isolado (subagente, só leitura) achou que linha de regra ou AC malformada sumia em silêncio e que o teste da CLI não conferia as mensagens; os dois viraram teste novo (falharam antes da correção) e foram corrigidos. Review do PR pendente.
### T2
Status: green
Evidência RED: o arquivo falhou com ERR_MODULE_NOT_FOUND antes do script. Depois, "nível padrão pula design" falhou com TypeError por erro do próprio teste (avançava de `tasks` sem aprovar o tasks.md); corrigido para partir de `implementation`. O teste da parte 1 "só design é condicional" falhou depois da decisão do trivial e foi atualizado para a nova regra.
Evidência GREEN: `node --test test/keel-state.test.mjs test/workflow.test.mjs` 17 de 17 passam.
Review: revisor isolado sem achado nesta task além dos da T3. Review do PR pendente.
### T3
Status: green
Evidência RED: o arquivo falhou com ERR_MODULE_NOT_FOUND antes de `checkEdit` existir.
Evidência GREEN: `node --test test/pre-tool-use.test.mjs` 4 de 4 passam.
Review: revisor isolado achou três problemas, todos corrigidos com teste que falhou antes: o hook usava a fase gravada sem vencer aprovação (código liberado depois de mudar o requirements.md em implementation); um state.json ilegível de outra história bloqueava toda edição; `State.json` com outra caixa escapava do bloqueio no Windows. Review do PR pendente.
### T4
Status: green
### T5
Status: green
Evidência RED: com os testes novos e o código antigo, 6 de 42 testes falharam em `npm test`: bloco congelado ausente, Status dentro do plano, fase forjada aceita, `checkCommand` inexistente (falha de import no arquivo do hook) e "Cobre, teste e comando, status" (o Status mudou de lugar).
Evidência GREEN: `npm test` 47 de 47 passam.
Review: pedido por Miguel no PR #10; as quatro recomendações foram aceitas por ele.

## Notas de implementação
- O hash da aprovação cobre só o bloco congelado; o andamento de cada task fica em "Andamento". Antes era uma lista de linhas ignoradas escondida no script (trocada no review do PR #10).
- A volta de fase não depende mais de saber qual portão aprova cada documento: a fase atual só vale se toda fase anterior cumpre a saída. Isso cobre aprovação vencida e state.json alterado por fora.
- O bloqueio de terminal é por padrão de comando (redirecionamento, tee, cp, mv, rm, sed -i, writeFile, Set-Content); um comando ofuscado escapa, mas a conferência de portões impede que isso pule etapa.
- Quando uma aprovação vence, só aquele documento perde a aprovação. Se o requirements.md muda, o tasks.md continua aprovado pelo hash; o dev revê o plano ao reaprovar os requisitos.
- `advance` em `closing` recusa dizendo que o verificador é da parte 6 ou 7; o `taskExit` da implementação fica para a parte 5.
- O hook vence a aprovação na memória antes de decidir, sem gravar o state.json; quem grava a volta de fase é o próximo comando do keel-state.mjs.
- Um state.json ilegível só bloqueia edição de código quando nenhuma história casa com a branch; documentos em `keel/` e caminhos fora do projeto continuam liberados.
- A CLI acha a história pela branch atual (lendo `.git/HEAD`, sem processo git) quando não recebe `--story`.

## Convergência (preenchida no fim, conferida por script)
| Regra | Evidência | Situação |
|---|---|---|
