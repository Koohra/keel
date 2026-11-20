# Tasks — KEEL-2

Requisitos: requirements.md · Design: não há
Aprovação: no review do PR

## T1 — Esqueleto andante: validador dos documentos da história
Cobre: R1 (AC-1.1, AC-1.2), R2 (AC-2.1)
Arquivos: `scripts/validate-feature.mjs`, `test/validate-feature.test.mjs`, `test/fixtures.mjs`
Teste primeiro: `test/validate-feature.test.mjs` — seções, EARS, AC, IDs, campos da task, ciclo, cobertura e as histórias do próprio repo
Verificação: `node --test test/validate-feature.test.mjs`
Pronto quando: os 10 testes passam, inclusive KEEL-1 e KEEL-2 validados pelo script
Depende de: —
Status: green
Evidência RED: `npm test` com os testes escritos e sem o script: o arquivo falhou com ERR_MODULE_NOT_FOUND (falha de import, porque o módulo era novo); com o script, só "as histórias do próprio Keel" falhou com ENOENT em `keel/features/KEEL-2-validacao-estado/tasks.md`, que ainda não existia.
Evidência GREEN: `node --test test/validate-feature.test.mjs` 10 de 10 passam.
Review: revisor isolado (subagente, só leitura) achou que linha de regra ou AC malformada sumia em silêncio e que o teste da CLI não conferia as mensagens; os dois viraram teste novo (falharam antes da correção) e foram corrigidos. Review do PR pendente.

## T2 — Estado: next, advance, approve, hash e aprovação vencida
Cobre: R3 (AC-3.1), R4 (AC-4.1, AC-4.2, AC-4.3), R5 (AC-5.1), R6 (AC-6.1, AC-6.2), R9 (AC-9.1)
Arquivos: `scripts/keel-state.mjs`, `workflow/workflow.json`, `test/keel-state.test.mjs`, `test/workflow.test.mjs`
Teste primeiro: `test/keel-state.test.mjs` — transições válidas e inválidas, portões, níveis, hash e aprovação vencida, critérios conhecidos e CLI
Verificação: `node --test test/keel-state.test.mjs test/workflow.test.mjs`
Pronto quando: os testes passam e todo critério do workflow.json tem verificador ou parte futura
Depende de: T1
Status: green
Evidência RED: o arquivo falhou com ERR_MODULE_NOT_FOUND antes do script. Depois, "nível padrão pula design" falhou com TypeError por erro do próprio teste (avançava de `tasks` sem aprovar o tasks.md); corrigido para partir de `implementation`. O teste da parte 1 "só design é condicional" falhou depois da decisão do trivial e foi atualizado para a nova regra.
Evidência GREEN: `node --test test/keel-state.test.mjs test/workflow.test.mjs` 17 de 17 passam.
Review: revisor isolado sem achado nesta task além dos da T3. Review do PR pendente.

## T3 — Hook PreToolUse
Cobre: R7 (AC-7.1), R8 (AC-8.1, AC-8.2)
Arquivos: `scripts/hooks/pre-tool-use.mjs`, `hooks/hooks.json`, `test/pre-tool-use.test.mjs`
Teste primeiro: `test/pre-tool-use.test.mjs` — state.json bloqueado, código só em implementation, história achada pela branch, registro no hooks.json
Verificação: `node --test test/pre-tool-use.test.mjs`
Pronto quando: os 4 testes passam e `claude plugin validate .` aceita o hooks.json
Depende de: T2
Status: green
Evidência RED: o arquivo falhou com ERR_MODULE_NOT_FOUND antes de `checkEdit` existir.
Evidência GREEN: `node --test test/pre-tool-use.test.mjs` 4 de 4 passam.
Review: revisor isolado achou três problemas, todos corrigidos com teste que falhou antes: o hook usava a fase gravada sem vencer aprovação (código liberado depois de mudar o requirements.md em implementation); um state.json ilegível de outra história bloqueava toda edição; `State.json` com outra caixa escapava do bloqueio no Windows. Review do PR pendente.

## T4 — Formato dos critérios na especificação
Cobre: R9
Sem teste: documentação; o formato é conferido pelo teste de critérios da T2.
Depende de: T2
Status: green

## Notas de implementação
- O hash da aprovação ignora linhas de andamento (Status, Aprovado por, evidências, Review) e as seções de notas e convergência; sem isso, marcar uma task como feita venceria a aprovação do tasks.md.
- Quando uma aprovação vence, só aquele documento perde a aprovação. Se o requirements.md muda, o tasks.md continua aprovado pelo hash; o dev revê o plano ao reaprovar os requisitos.
- `advance` em `closing` recusa dizendo que o verificador é da parte 6 ou 7; o `taskExit` da implementação fica para a parte 5.
- O hook vence a aprovação na memória antes de decidir, sem gravar o state.json; quem grava a volta de fase é o próximo comando do keel-state.mjs.
- Um state.json ilegível só bloqueia edição de código quando nenhuma história casa com a branch; documentos em `keel/` e caminhos fora do projeto continuam liberados.
- A CLI acha a história pela branch atual (lendo `.git/HEAD`, sem processo git) quando não recebe `--story`.

## Convergência (preenchida no fim, conferida por script)
| Regra | Evidência | Situação |
|---|---|---|
