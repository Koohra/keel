# ADR-001 — Fluxo por história e arquivos versionados

## Status
Aceita por Miguel em 2026-11-20.

## Contexto
O Keel 1 fazia coisas demais: muitas skills, pacotes por stack e avaliações caras, sem um fluxo central claro. A pesquisa de SDD (Spec Kit, Kiro, BMAD, OpenSpec) mostrou que o ganho vem de obrigações explícitas e testáveis por história, com cerimônia proporcional ao risco. [fonte: docs/especificacao.md#propósito]

## Decisão
O Keel 2 conduz uma história por vez. Cada história tem a pasta `keel/features/<CHAVE>-<descricao>/` com:
- `requirements.md` sempre (substitui o antigo feature.md), com regras em EARS (palavras-chave em inglês) e critérios Given/When/Then, IDs `R#` e `AC-#.#`;
- `design.md` só com gatilho de design;
- `tasks.md` com tasks pequenas, a primeira um esqueleto andante, cada uma em TDD (RED, GREEN, REFACTOR);
- `state.json` com fase e aprovações.

Os quatro arquivos são versionados junto com o código. Não existe research.md: pesquisa entra nas alternativas do design.md.

## Consequências
- O PR mostra o que foi combinado, o plano e a evidência.
- Bug pequeno usa o nível `trivial`, só com tasks.md.
- Mudança depois da aprovação é registrada e reaprovada, não proibida.

## Confirmação
Os testes de `test/templates.test.mjs` garantem que os modelos têm as seções e os IDs. A partir da parte 2, `validate-feature.mjs` confere cada história.
