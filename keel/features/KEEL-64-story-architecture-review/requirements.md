# KEEL-64 — Revisor: revisão de arquitetura da história inteira no fechamento

Source: https://github.com/Koohra/keel/issues/64 · Folder: keel/features/KEEL-64-story-architecture-review/ · Level: with-design
Status: confirmed by Miguel on 2026-11-28

<!-- frozen after approval: start -->
## Original story
> Parte do épico #61. Prioridade 3.
>
> ## Contexto
>
> - O revisor isolado (`agents/reviewer.md`) olha um diff por vez e mede contra o que `product.md` e `design.md` declaram. Se o degrau declarado está errado, ou o módulo novo nasceu sem degrau, o item 6 da rubrica fica sem referência (`agents/reviewer.md:22-38`).
> - O fechamento roda o `arch-check` completo, mas não chama o revisor (`skills/story/phases/closing.md:16-18`).
> - Só há checklists de segurança, dados e contrato (`scripts/task-loop.mjs:215-225`).
> - O viés contra excesso de engenharia (`skills/story/phases/implementation.md:49`, `docs/specification.md:261`) não tem contrapeso para falta de estrutura. O dado mais medido de código de IA é duplicação e falta de consolidação (GitClear 2026).
>
> ## O que fazer
>
> - Um terceiro modo do revisor, além de requisitos e task, chamado no fechamento. Entrada: diff agregado da história (base até HEAD), repo map, `architecture.json`, "Quality goals", degraus e ADRs. Continua só leitura e sem histórico da conversa.
> - Rubrica curta com dois lados. Excesso: estrutura sem cenário que a justifique, costura sem segunda implementação. Falta: duplicação entre módulos, formatos incompatíveis para a mesma coisa (erro, data, dinheiro, autenticação), módulo que cresceu além do degrau declarado, mudança de estrutura, dependência ou fronteira sem ADR, invariante de produto sem verificação.
> - Saída no padrão atual: até 5 achados BLOQUEIA/REMOVER/SUGERIR, cada um citando a fonte, mais uma lista "Não julgado".
> - Os achados viram deltas ou tasks novas, nunca correção automática; a regra de não corrigir todo SUGERIR continua.
>
> ## Critérios de aceite
>
> - [ ] O fechamento chama o revisor no modo de história inteira e registra a disposição dos achados.
> - [ ] A rubrica cobre os dois lados (excesso e falta) e o revisor devolve "Não julgado".
> - [ ] No máximo 5 achados; revisor continua sem ferramenta de escrita.
> - [ ] Um eval enxuto (ADR-003) mostra o revisor apontando duplicação ou formato incompatível entre dois módulos e não apontando abstração justificada por cenário.
> - [ ] `npm test` e `claude plugin validate .` passam.
>
> ## Dependências
>
> Usa os "Quality goals" e a ADR-001 da issue de setup, mas funciona sem eles em projeto existente.

## Goal
Quem fecha uma história com o Keel passa a ter um olhar isolado sobre a estrutura que a história inteira deixou, e não só sobre cada diff de task: o revisor ganha um modo de história, com rubrica de excesso e de falta de estrutura, e o fechamento só termina com esse review gravado e com o destino de cada achado escrito. [source: https://github.com/Koohra/keel/issues/64; https://github.com/Koohra/keel/issues/61]

## Out of scope
- "Quality goals" no `product.md` e a ADR-001 de arquitetura do setup: são da #62; o modo de história só os lê quando existem. [source: issue #64 "Dependências"]
- Componentes planejados, `coverage` e arquivos órfãos no `arch-check`: são da #63.
- Checklist de estrutura e gatilho automático de design na triagem: são da #66.
- Correção automática de achado no fechamento: o hook já bloqueia código no fechamento (`skills/story/phases/closing.md:3`).
- Revisor no Codex com outro texto: o `.codex/agents/keel-reviewer.toml` continua gerado do `agents/reviewer.md` (`scripts/codex-reviewer.mjs:3`).

## Rules and acceptance criteria
R1. THE revisor isolado SHALL ter um modo "revisão de história", além de requisitos e task, só leitura e sem o histórico da conversa, que recebe o diff da base da história até o HEAD, o repo map, o `keel/architecture.json`, as seções "Quality goals" e "Rungs per module" do `product.md` e as ADRs, e funciona quando "Quality goals" ou `architecture.json` não existem. [source: issue #64 "O que fazer" item 1; `agents/reviewer.md:4`]
  - AC-1.1 GIVEN o `agents/reviewer.md` WHEN o teste o lê THEN há a seção "Revisão de história" com as entradas listadas, o frontmatter continua com `tools: Read, Grep, Glob` e o texto diz que a falta de "Quality goals" ou de `architecture.json` vira item de "Não julgado", não achado, e que "Não julgado" aparece sempre, com "nada" quando tudo foi avaliado.
R2. THE rubrica da revisão de história SHALL cobrir os dois lados: excesso (estrutura sem cenário ou regra que a justifique, costura sem segunda implementação) e falta (duplicação entre módulos, formatos incompatíveis para a mesma coisa, como erro, data, dinheiro e autenticação, módulo além do degrau declarado, mudança de estrutura, dependência ou fronteira sem ADR, invariante de produto sem verificação). [source: issue #64 "O que fazer" item 2]
  - AC-2.1 GIVEN a seção "Revisão de história" WHEN o teste a lê THEN ela tem os itens de excesso e de falta citados na regra.
R3. THE revisão de história SHALL devolver no máximo 5 achados classificados como BLOQUEIA, REMOVER ou SUGERIR, cada um com a fonte, e uma lista "Não julgado" com o que não pôde avaliar. [source: issue #64 "O que fazer" item 3]
  - AC-3.1 GIVEN a seção "Revisão de história" WHEN o teste a lê THEN ela diz "no máximo 5 achados", as três classes, a fonte em cada achado e "Não julgado".
R4. WHEN a história está no fechamento THE `keel-state.mjs` SHALL gravar o resultado da revisão de história com `review story --result <ok|findings|unavailable>`, e o `advance` do fechamento SHALL recusar sem esse resultado. [source: issue #64 critério 1; `workflow/workflow.json` fase closing]
  - AC-4.1 GIVEN uma história no fechamento com convergência, arquitetura e deltas atendidos WHEN o `advance` roda sem `review story` gravado THEN ele recusa dizendo para rodar `review story --result`; depois de `review story --result ok`, o `advance` leva a `done`.
  - AC-4.2 GIVEN uma história fora do fechamento WHEN roda `review story` THEN o script recusa dizendo que o comando é só do fechamento; resultado fora de ok, findings e unavailable é recusado com a lista dos três; alvo desconhecido de `review` é recusado com "use requirements, task or story".
  - AC-4.3 GIVEN `review story` gravado num HEAD WHEN o HEAD muda (por exemplo, uma task nova vinda de um achado foi commitada) e a história volta ao fechamento THEN o `advance` recusa dizendo para rodar `review story` de novo; um segundo `review story` substitui o primeiro.
  - AC-4.4 GIVEN `review story --result unavailable` gravado no HEAD atual WHEN o `advance` roda com os outros critérios atendidos THEN ele aceita, como nas outras revisões.
R5. IF a revisão de história teve `findings` THEN THE `advance` do fechamento SHALL recusar enquanto a linha `Review:` da seção "Story review" do tasks.md não disser o destino de cada achado (task nova, delta ou mantido com a fonte). [source: issue #64 critério 1 e "O que fazer" item 4; `scripts/task-loop.mjs:300-302`]
  - AC-5.1 GIVEN `review story --result findings` gravado WHEN o tasks.md não tem "Story review" ou a linha `Review:` só tem o resultado THEN o `advance` recusa com o formato esperado; com `Review: findings (isolated reviewer); F1 new task T4; F2 kept [source: ADR-001]` ele aceita. Como no `approve commit`, o script confere só que há destino escrito depois do resultado, não a lista de achados nem as referências.
R6. THE fase de fechamento SHALL mandar chamar o revisor na revisão de história, depois da convergência e da arquitetura, passando a base da história que o `next` mostra, e transformar cada achado em task nova, delta do product.md ou ADR, ou mantido com a fonte, sem corrigir código e sem corrigir todo SUGERIR. [source: issue #64 "O que fazer" itens 1 e 4; `skills/story/phases/closing.md`]
  - AC-6.1 GIVEN o `next` no fechamento WHEN o teste lê a saída THEN `closing.base` traz o commit base da história, ou `null` quando a base não foi achada (nesse caso a arquitetura já sai `fail` com o motivo e a revisão espera a correção).
  - AC-6.2 GIVEN o `skills/story/phases/closing.md` WHEN o teste o lê THEN ele chama o `keel:reviewer` com "revisão de história", grava com `review story --result`, escreve o destino na seção "Story review" e diz que achado não vira correção de código.
R7. THE Keel SHALL ter um eval enxuto que mostra o revisor, na revisão de história, apontando duplicação ou formato incompatível entre dois módulos e não pedindo para remover uma abstração justificada por um cenário de "Quality goals". [source: issue #64 critério 4; ADR-003]
  - AC-7.1 GIVEN `evals/phases/` WHEN o teste lê os casos THEN há um caso de revisão de história com grader de uso do `keel:reviewer`, grader que procura duplicação ou formato na resposta e grader `not_contains` para REMOVER a abstração justificada.

## Explicit obligations
- Edge cases: história sem nenhuma task com código (só docs): o revisor ainda roda e pode responder `Result: ok`; revisor indisponível grava `unavailable` e o `advance` aceita, como nas outras revisões [source: `skills/story/phases/implementation.md` 5.2]; projeto sem "Quality goals", sem `architecture.json` ou sem "Rungs per module" vira "Não julgado".
- Invariants (must never happen): o revisor ganhar ferramenta de escrita; o fechamento corrigir código por causa de achado; `state.json` escrito por outro que não o `keel-state.mjs` [source: keel/product.md#engineering-principles item 4].
- Existing behavior that must not change: revisões de requisitos e de task (`agents/reviewer.md`) e seus comandos; critérios de saída já existentes do fechamento (`workflow/workflow.json`); geração do TOML do Codex a partir do `agents/reviewer.md` (`scripts/codex-reviewer.mjs:17`). Como toda mudança do `agents/reviewer.md`, projeto no Codex com o revisor já instalado passa a ter `codex-reviewer.mjs check` em `outdated` até rodar de novo o passo 6 do setup; a fase já diz isso e grava `unavailable` (`skills/story/phases/implementation.md` 5.1).
- Errors and expected responses: `review story` fora do fechamento, com resultado inválido ou alvo desconhecido → erro que diz o que usar (AC-4.2); `advance` sem review ou sem destino → recusa com o que falta (R4, R5).

## Questions and assumptions
- [ASSUMPTION] O destino dos achados fica numa seção nova "Story review" do tasks.md, fora do bloco congelado, como o `Review:` do "Progress" das tasks; não é um artefato novo por história (épico #61, critério 4). — accepted by Miguel on 2026-11-28 (aprovação permanente do épico #61).
- [ASSUMPTION] Histórias que já estão no fechamento quando esta versão chega passam a precisar do `review story` antes do `advance`. — accepted by Miguel on 2026-11-28 (aprovação permanente do épico #61).

## Conflicts found
- not applicable

## Changes after confirmation
- not applicable
<!-- frozen after approval: end -->
