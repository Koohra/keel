# KEEL-65 — Linguagem simples nas decisões com consequência

Source: https://github.com/Koohra/keel/issues/65 (épico #61) · Folder: keel/features/KEEL-65-plain-language-decisions/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> A regra "decisão com consequência é do dev: apresente opções, consequências e recomendação" (`skills/story/SKILL.md:44`) não diz como redigir. Para quem não é dev, a aprovação vira carimbo, porque as opções chegam em vocabulário de degrau, porta, mapper e agregado (`templates/principles.md:33-35`). Uma cláusula de forma na regra da `story` e na do `setup`: cada decisão com consequência traz uma frase sobre o que muda para o produto ou para o usuário, sem jargão de processo, seguida da recomendação. O termo técnico só aparece entre parênteses. Usar o vocabulário do glossário do `product.md`. Sem "modo leigo" configurável. O `keel-docs:write` herda a mesma regra nos guias.

## Goal
Quem decide entende o que cada opção muda no produto antes de escolher, porque toda decisão com consequência chega numa frase simples, com as palavras do glossário, seguida da recomendação. [source: https://github.com/Koohra/keel/issues/65; /mnt/project-files/pesquisas/Revisor de arquitetura para o Keel.md, prioridade 4]

## Out of scope
- "Modo leigo" ou nível de experiência configurável (o BMAD tentou com `user_skill_level` e removeu). [source: issue #65]
- Checar por script o texto das respostas do agente: fica como instrução, teste de presença e eval.
- O revisor isolado (`agents/reviewer.md`) e os modelos (`templates/`): não apresentam opções ao dev.
- As outras frentes do épico #61 (proposta de arquitetura no setup, `arch-check`, revisão da história, triagem).

## Rules and acceptance criteria
R1. WHEN o Keel apresenta uma decisão com consequência ao dev THE skills `story`, `setup` e `keel-docs:write` SHALL mandar escrever, para cada opção, primeiro uma frase sobre o que muda para o produto ou para o usuário, com as palavras do glossário do `keel/product.md` e sem jargão de processo, depois a recomendação, com o termo técnico só entre parênteses. [source: issue #65]
  - AC-1.1 GIVEN os arquivos das skills WHEN o teste lê `skills/story/SKILL.md`, `skills/setup/SKILL.md` e `plugins/keel-docs/skills/write/SKILL.md` THEN cada um tem a regra com "o que muda para o produto ou para o usuário", o glossário, a recomendação e "só entre parênteses".
R2. WHEN um texto de fase ou de guia cita degrau, porta ou mapper THE texto SHALL trazer o termo entre parênteses, depois da frase em linguagem simples. [source: issue #65, critério 2]
  - AC-2.1 GIVEN `skills/story/phases/*.md`, `skills/setup/SKILL.md` e os guias do `keel-docs:write` WHEN o teste procura "degrau", "porta" e "mapper" THEN toda ocorrência está dentro de parênteses.
R3. WHEN a fase de design apresenta uma decisão com consequência THE eval de etapa SHALL conferir que a resposta ao dev traz a recomendação e não usa degrau, porta, mapper, adaptador nem agregado fora de parênteses. [source: issue #65, critério 3; ADR-003]
  - AC-3.1 GIVEN o caso `design-decision-plain` rodado antes e depois da regra WHEN os graders leem a última mensagem THEN o resultado das duas rodadas fica numa linha cada em "Implementation notes".

## Explicit obligations
- Edge cases: "porta" de rede (porta 3000) não aparece nos textos verificados; se aparecer, também vai entre parênteses ou muda de palavra.
- Invariants (must never happen): opção de decisão que só diz o termo técnico.
- Existing behavior that must not change: a regra de decisão com consequência continua (opções, consequências, recomendação, uma pergunta por vez); os tipos de gatilho do design.md (`rung change`, `new structure`) continuam como estão, porque o `validate-feature.mjs` lê esses nomes. [source: skills/story/SKILL.md; skills/story/phases/design.md]
- Errors and expected responses: not applicable.

## Conflicts found
- not applicable

## Questions and assumptions
- [ASSUMPTION] "Nos guias" do `keel-docs:write` cobre a regra no SKILL.md da skill (lido sempre) e os guias que fazem pergunta com opções ao dev (`adr.md` e `product.md`).
<!-- frozen after approval: end -->

## Changes after confirmation
not applicable
