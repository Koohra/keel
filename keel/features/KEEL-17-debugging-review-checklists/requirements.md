# KEEL-17 — Depuração, resposta ao review e checklists por gatilho

Source: https://github.com/Koohra/keel/issues/17 · Folder: keel/features/KEEL-17-debugging-review-checklists/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> Lacunas da fase de implementação levantadas em 2026-11-21, comparando o Keel com o guia de skills da Anthropic, o Superpowers e o Spec Kit. Itens 1 e 2 completos, item 3 em versão mínima. 1. Depuração sistemática com limite de três tentativas. 2. Resposta ao review: conferir cada achado, discordar com fonte, nunca afrouxar o teste; `approve commit` exige o destino de cada achado. 3. Checklists de segurança, dados e contrato, até 5 itens, carregados pelo gatilho do design.md.

## Goal
Quando o teste não passa, o modelo depura com método e para de tentar às cegas na terceira falha, chamando o dev; quando o revisor aponta algo, cada achado tem destino registrado antes do commit; e o revisor recebe itens específicos de segurança, dados e contrato só quando o design.md diz que a história toca nisso. [source: Miguel em 2026-11-21; https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices; https://claude.com/plugins/superpowers]

## Out of scope
- Checklists além de segurança, dados e contrato, e checklists por linguagem: ficam para depois do piloto.
- Comando para o dev destravar a task: o `block` continua sendo a parada; a próxima evidência gravada limpa o bloqueio, como hoje.
- Contar falhas do RED: falhar é o esperado no RED.

## Rules and acceptance criteria
R1. WHEN `evidence green` roda e o `Verification:` sai diferente de 0, ou `checks` roda e alguma checagem falha, THE keel-state.mjs SHALL gravar a tentativa falha da task aberta (quantas, comando, código de saída e o fim da saída) e o `next` SHALL mostrar as tentativas e apontar `phases/debugging.md`. [source: https://claude.com/plugins/superpowers "systematic-debugging"]
  - AC-1.1 GIVEN uma task com RED gravado e o teste ainda falhando WHEN rodo `evidence green` THEN o comando falha e o `next` traz `task.debugging` com `attempts: 1` e `instructions: phases/debugging.md`.
  - AC-1.2 GIVEN uma tentativa falha gravada WHEN o GREEN passa THEN `task.debugging` some do `next`.
R2. IF a task aberta tem 3 tentativas falhas e não está bloqueada THEN THE keel-state.mjs SHALL recusar `evidence green` e `checks` sem rodar o comando, pedindo `block --reason` com o que a depuração achou; o `block` zera as tentativas e `task start` também. [source: https://claude.com/plugins/superpowers "architectural review after three failed fix attempts"]
  - AC-2.1 GIVEN 3 tentativas falhas WHEN rodo `evidence green` THEN o comando falha citando as 3 tentativas e `block --reason`, sem rodar o `Verification:`.
  - AC-2.2 GIVEN 3 tentativas falhas WHEN rodo `block --reason "<achado>"` e depois `evidence green` THEN o comando roda de novo.
R3. WHEN o review da task gravado é `findings` THE keel-state.mjs SHALL recusar `approve commit` enquanto a linha `Review:` do "Progress" da task não disser, além do resultado, o que foi feito com os achados. [source: https://claude.com/plugins/superpowers "receiving-code-review"; skills/story/phases/implementation.md#6]
  - AC-3.1 GIVEN review `findings` e `Review: findings (isolated reviewer)` no Progress WHEN rodo `approve commit --by Ana` THEN o comando falha pedindo o destino de cada achado.
  - AC-3.2 GIVEN review `findings` e `Review: findings (isolated reviewer); R1 removido, R2 mantido — ADR-002` WHEN rodo `approve commit --by Ana` THEN a aprovação é gravada.
R4. WHEN a história tem design.md THE keel-state.mjs SHALL listar no `next`, na task aberta, os checklists do revisor que o design pede: `contract` com `Trigger: contract`, `data` com `Trigger: data/migration` ou "Migration/rollback" preenchido, `security` com "Security" preenchido; "not applicable", "não se aplica" ou vazio não contam. [source: https://www.mintlify.com/github/spec-kit/commands/overview "/speckit.checklist"; templates/design.md]
  - AC-4.1 GIVEN um design.md com `Trigger: contract — ...` e `Security: token no header` WHEN rodo `next` com uma task aberta THEN `task.checklists` é `checklists/contract.md` e `checklists/security.md`.
  - AC-4.2 GIVEN uma história sem design.md, ou com tudo "not applicable" WHEN rodo `next` THEN `task.checklists` é vazio.
R5. WHEN a implementação roda THE skill story SHALL ter a instrução de depuração (reproduzir, isolar, uma hipótese, uma mudança, nunca afrouxar o teste, parar na terceira tentativa), a resposta ao review (conferir no código, discordar com fonte, registrar o destino) e passar ao revisor os checklists do `next`; cada checklist SHALL ter no máximo 5 itens e o revisor SHALL responder cada item com sim ou não e evidência. [source: Miguel em 2026-11-21]
  - AC-5.1 GIVEN os arquivos da skill WHEN o teste lê `phases/implementation.md`, `phases/debugging.md`, `checklists/*.md` e `agents/reviewer.md` THEN as instruções existem, os comandos citados existem e cada checklist tem de 1 a 5 itens.
R6. WHEN o GREEN falha três vezes numa task THE fluxo SHALL terminar com a task bloqueada e uma pergunta ao dev, sem mudar o teste do RED. [source: issue #17 "Pronto quando"]
  - AC-6.1 GIVEN a fixture com uma task cujo teste exige um valor que o código não pode dar WHEN peço para continuar a história THEN o state.json tem `blocked` e o arquivo de teste não mudou.

## Explicit obligations
- Edge cases: task com `No test:` (só checagens contam); state.json de partes anteriores sem os campos novos; review `ok` ou `unavailable` não exige destino.
- Invariants (must never happen): tentativa contada sem o comando ter rodado; `approve commit` com achados sem destino; checklist carregado sem o gatilho no design.md.
- Existing behavior that must not change: RED, GREEN, checks, review e aprovação do commit como na parte 5; `blocked` limpo pela próxima evidência gravada; hook `Stop` deixa o turno acabar com a task bloqueada. [source: scripts/task-loop.mjs, test/task-loop.test.mjs]
- Errors and expected responses: cada recusa diz a task, quantas tentativas e o comando que resolve.

## Conflicts found
none

## Questions and assumptions
- [ASSUMPTION] O limite é 3 tentativas falhas somando GREEN e checagens da mesma task, igual ao do Superpowers; fixo no script, sem configuração. [source: https://claude.com/plugins/superpowers]
- [ASSUMPTION] O `block` zera a contagem: ele é a parada para o dev, e a próxima rodada tem mais 3 tentativas. A skill manda parar depois do `block`.
- [ASSUMPTION] O destino dos achados é texto livre depois de `Review: findings (isolated reviewer)`; o script só exige que exista.
- [ASSUMPTION] Os checklists ficam em `skills/story/checklists/` e o modelo passa o caminho ao revisor, que lê com Read.
<!-- frozen after approval: end -->

## Changes after confirmation
not applicable
