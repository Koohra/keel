# KEEL-62 — Setup: proposta de arquitetura para repositório novo

Source: https://github.com/Koohra/keel/issues/62 · Folder: keel/features/KEEL-62-setup-architecture-proposal/ · Level: standard
Status: confirmed by Miguel on 2026-11-28

<!-- frozen after approval: start -->
## Original story
> Parte do épico #61. Prioridade 1: é o que impede a IA de fixar a estrutura do projeto sem ninguém ver.
>
> ## Contexto
>
> - O setup foi escrito para repositório existente. O passo 4 propõe o `keel/architecture.json` "a partir das pastas reais" (`skills/setup/SKILL.md:76-88`), e num repositório vazio não há pastas.
> - O `product.md` pergunta visão, o que faz, o que não faz, glossário, decisões e princípios (`skills/setup/SKILL.md:60-65`). O modelo (`plugins/keel-docs/templates/product.md`) não tem seção de stack, escala, usuários ou restrições não funcionais.
> - O portão do setup exige "ADRs iniciais", mas não diz quais (`skills/setup/SKILL.md:112-114`).
> - Não há eval de setup em repositório vazio.
>
> ## O que fazer
>
> - Um ramo explícito no setup para repositório sem código-fonte, entre os passos 3 e 4.
> - Entrevista de no máximo 6 perguntas, uma por vez, no formato do `/clarify` do Spec Kit: pergunta, uma frase "por que importa" em linguagem simples, opções e recomendação, aceita com "sim". Temas: quem usa e quantos, dado sensível, serviços externos, offline ou mobile, quem vai manter, o que o produto deve virar em 6 a 12 meses.
> - As respostas viram uma seção curta "Quality goals" no `product.md`, com 3 a 5 cenários no formato Q42 do arc42 (contexto, estímulo, métrica). É uma seção num documento que já existe, não um artefato novo.
> - Com isso, o setup apresenta 2 ou 3 abordagens por postura (mínima, proporcional, preparada para crescer), cada uma com uma linha sobre o que custa depois. A recomendação padrão é um starter conhecido da stack, verificado na web.
> - O resultado aprovado vira: a tabela "Rungs per module" com motivo ligado a um cenário; a **ADR-001 de arquitetura e stack**, com "Confirmation" apontando para regras do `architecture.json` e uma seção de decisões adiadas ("agora não, porque..."); e o `architecture.json` com componentes planejados (#2 do épico).
> - Costura (porta, adaptador) só quando um cenário de mudança declarado a justifica.
> - Quando o usuário responde "tanto faz", a escolha é registrada como decisão do Keel, não do usuário.
>
> ## Critérios de aceite
>
> - [ ] Setup num repositório vazio faz no máximo 6 perguntas, uma por vez, cada uma com "por que importa" e recomendação.
> - [ ] O `product.md` sai com "Quality goals" de 3 a 5 cenários, e o modelo do `keel-docs` tem a seção.
> - [ ] Sai uma ADR-001 de arquitetura e stack com "Confirmation" e decisões adiadas, e o portão de "ADRs iniciais" passa a exigi-la em repositório novo.
> - [ ] O `architecture.json` sai com componentes planejados, sem a dispensa "Architecture: não se aplica".
> - [ ] Setup em repositório existente continua como hoje.
> - [ ] Um eval enxuto (ADR-003) sobre uma fixture vazia cobre o ramo novo; `test/setup-skill.test.mjs` cobre o texto.
>
> ## Dependências
>
> Depende da issue de componentes planejados no `arch-check` (próxima sub-issue do épico).

## Goal
Quem começa um projeto do zero com o Keel, mesmo sem entender de desenvolvimento, passa a ver e aprovar a estrutura antes de a primeira task criá-la: o setup ganha um ramo para repositório sem código-fonte que entrevista, registra metas de qualidade, propõe abordagens e sai com ADR-001 de arquitetura e stack e `architecture.json` com componentes planejados. [source: https://github.com/Koohra/keel/issues/62; https://github.com/Koohra/keel/issues/61]

## Out of scope
- Mudança em script: o `arch-check` já aceita componentes planejados e o fechamento já recusa a dispensa quando a história cria código-fonte sem componente ativo (#63, `docs/specification.md` "Componente planejado"). [source: PR #69]
- Revisão de arquitetura no fechamento (#64) e gatilho automático de design na triagem (#66).
- Gerar o código do starter ou instalar dependências: o setup só propõe e registra; o código nasce na primeira história.
- Checagem por script de que o setup fez no máximo 6 perguntas: o setup não tem estado por script; a garantia fica no texto e no eval (ADR-003).

## Rules and acceptance criteria
R1. WHEN o repositório não tem código-fonte THE setup SHALL seguir um ramo próprio, entre os passos 3 e 4, com uma entrevista de no máximo 6 perguntas, uma por vez, cada uma com uma frase "por que importa" em linguagem simples, as opções e a recomendação, aceita com "sim", sobre: quem usa e quantos, dado sensível, serviços externos, offline ou mobile, quem vai manter e o que o produto deve virar em 6 a 12 meses. [source: issue #62 "O que fazer" itens 1 e 2]
  - AC-1.1 GIVEN o `skills/setup/SKILL.md` WHEN o teste o lê THEN há a seção do repositório sem código-fonte entre os passos 3 e 4, com "no máximo 6 perguntas", "uma por vez", "por que importa", a recomendação, "sim" e os seis temas.
R2. THE respostas da entrevista SHALL virar a seção "Quality goals" do `keel/product.md`, com 3 a 5 cenários no formato contexto, estímulo e métrica, e o modelo do `keel-docs` SHALL ter essa seção. [source: issue #62 "O que fazer" item 3 e critério 2]
  - AC-2.2 GIVEN respostas que não rendem 3 cenários (por exemplo, várias "tanto faz") WHEN o setup monta os "Quality goals" THEN o texto manda completar até 3 com cenários propostos pelo Keel, marcados como decisão do Keel.
  - AC-2.1 GIVEN o modelo `plugins/keel-docs/templates/product.md` e o guia `guides/product.md` WHEN o teste os lê THEN o modelo tem "## Quality goals" antes de "## Engineering principles", com um cenário de exemplo com contexto, estímulo e métrica, e o guia diz 3 a 5 cenários; o setup cita a seção.
R3. THE setup SHALL apresentar 2 ou 3 abordagens, uma por postura (mínima, proporcional, preparada para crescer), cada uma com uma linha sobre o que custa depois, e recomendar por padrão um starter conhecido da stack, conferido na web, com costura (porta, adaptador) só quando um cenário de mudança dos "Quality goals" a justifica. [source: issue #62 "O que fazer" itens 4 e 6]
  - AC-3.1 GIVEN a seção do repositório sem código-fonte WHEN o teste a lê THEN ela cita as três posturas, "o que custa depois", o starter conferido na web e a costura só com cenário de mudança.
  - AC-3.2 GIVEN o setup sem acesso à web WHEN recomenda o starter THEN o texto manda dizer que não conferiu e registrar isso na ADR-001 como `[ASSUMPTION]`; GIVEN o dev recusa todas as abordagens WHEN o setup segue THEN ele pergunta o que falta, uma pergunta, e propõe de novo.
R4. WHEN o dev aprova a abordagem THE setup SHALL mostrar e gravar, cada trecho só com a aprovação dele, a tabela "Rungs per module" com motivo ligado a um cenário, a ADR-001 de arquitetura e stack com "Confirmation" apontando para regras do `architecture.json` e uma seção "Decisões adiadas" ("agora não, porque..."), e o `keel/architecture.json` com os componentes planejados (`"planned": true`) e `coverage`, sem a dispensa "Architecture: não se aplica"; o `arch-check.mjs` roda e sai com 0 e os componentes `pending`, sem `noCycles` nem baseline enquanto não há código, e a prova por violação plantada fica para quando o primeiro arquivo do componente existir. [source: issue #62 "O que fazer" item 5 e critérios 3 e 4; `scripts/arch-check.mjs:296` (noCycles sem módulo falha)]
  - AC-4.1 GIVEN a seção do repositório sem código-fonte WHEN o teste a lê THEN ela cita "Rungs per module" com o cenário, a ADR-001 com "Confirmation" e "Decisões adiadas", `"planned": true`, `coverage`, que a dispensa "Architecture: não se aplica" não vale nesse ramo, que cada trecho é aprovado antes de gravar, que o `arch-check.mjs` roda com os componentes `pending`, sem `noCycles` nem baseline, e que a violação plantada espera o primeiro arquivo.
R5. THE portão do setup SHALL exigir, em repositório sem código-fonte, a ADR-001 de arquitetura e stack entre as ADRs iniciais, e manter o portão de hoje para repositório existente. [source: issue #62 critérios 3 e 5]
  - AC-5.1 GIVEN a seção "Portão" do setup WHEN o teste a lê THEN ela exige a ADR-001 de arquitetura e stack em repositório sem código-fonte e mantém "O dev aprova o product.md e as ADRs iniciais"; o passo 4 de repositório existente segue com "a partir das pastas reais".
R6. IF o dev responde "tanto faz" a uma pergunta ou escolha, ou recusa a entrevista, THEN THE setup SHALL registrar a escolha como decisão do Keel, não do dev, na ADR-001 ou nos "Quality goals". [source: issue #62 "O que fazer" item 7]
  - AC-6.1 GIVEN a seção do repositório sem código-fonte WHEN o teste a lê THEN ela diz que "tanto faz" vira decisão registrada como do Keel e que, se o dev recusa a entrevista, o setup segue com as recomendações do Keel, registradas como decisão do Keel, e o portão continua pedindo a ADR-001.
R7. THE Keel SHALL ter um eval enxuto sobre uma fixture sem código-fonte que mostra o setup fazendo uma pergunta por vez, com "por que importa" e recomendação, sem gravar a dispensa "Architecture: não se aplica". [source: issue #62 critério 6; ADR-003]
  - AC-7.1 GIVEN `evals/phases/` WHEN o teste lê os casos THEN há um caso de setup em repositório vazio com graders de "por que importa", de recomendação e `not_contains` da dispensa, e a fixture, montada no próprio `fixture.sh` e não a partir da `node-mini`, não tem código-fonte.

## Explicit obligations
- Edge cases: repositório com só README, licença ou `package.json` sem código conta como sem código-fonte; dev que recusa a entrevista segue com as recomendações do Keel (R6); sem web, o starter fica como suposição (AC-3.2); menos de 3 cenários, o Keel completa (AC-2.2); no ramo novo, o degrau de cada módulo do passo 3 é preenchido depois da entrevista, com o cenário (R4).
- Invariants (must never happen): o setup gravar arquivo sem a aprovação do trecho exato (`skills/setup/SKILL.md:9`); pacote de regras por stack (épico #61, critério 3); artefato novo por história (épico #61).
- Existing behavior that must not change: setup em repositório existente (passos 1 a 6 de `skills/setup/SKILL.md`), o número do passo 6 citado nas fases (`skills/story/phases/implementation.md:41`), a regra de linguagem simples do setup (#65).
- Errors and expected responses: none beyond R5.

## Questions and assumptions
- [ASSUMPTION] "Sem código-fonte" é decidido pelo setup lendo o repositório (sem arquivo de código fora de `keel/`, docs e configuração), sem script novo. — accepted by Miguel on 2026-11-28 (aprovação permanente do épico #61).
- [ASSUMPTION] O ramo fica numa seção "3.1" para não renumerar os passos 4 a 6, que outras fases citam pelo número. — accepted by Miguel on 2026-11-28 (aprovação permanente do épico #61).

## Conflicts found
- not applicable

## Changes after confirmation
- not applicable
<!-- frozen after approval: end -->
