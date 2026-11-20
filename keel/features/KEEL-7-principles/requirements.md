# KEEL-7 — Princípios de engenharia e setup

Source: https://github.com/Koohra/keel/issues/7 · Folder: keel/features/KEEL-7-principles/ · Level: standard
Status: draft (approval in the PR review)

<!-- frozen after approval: start -->
## Original story
> Skill `setup`, seção de princípios do product.md, `keel/architecture.json`, `arch-check.mjs` e hook `PostToolUse`. A skill `setup` lê o AGENTS.md e o CLAUDE.md do projeto e classifica cada regra; com aprovação, acrescenta um bloco curto e marcado; nunca reescreve o resto do arquivo; um script confere o bloco. Pronto quando: violação plantada é barrada em pelo menos duas linguagens; numa fixture com AGENTS.md que manda commitar direto, o setup aponta o conflito e não altera nada fora do bloco marcado.

## Goal
Dar ao projeto do dev, uma vez, os princípios de engenharia e as regras de arquitetura que o Keel checa por script, e convivir com o AGENTS.md e o CLAUDE.md do projeto sem reescrevê-los. [source: docs/specification.md#etapa-0, issue #7]

## Out of scope
- Critério `arch:baseline-not-grown` no `keel-state.mjs`: entra com o fechamento (parte 6), que já usa o `arch-check.mjs`.
- Portão de commit e hook `Stop`: parte 5.
- Tradução do architecture.json para cada ferramenta nativa: a skill propõe e só instala com autorização; o varredor próprio cobre JS/TS e Python.
- Casos de `claude plugin eval` do setup: entram quando houver falha real (ADR-003).

## Rules and acceptance criteria
R1. WHEN o setup roda num projeto THE keel-context.mjs SHALL revisar AGENTS.md e CLAUDE.md sem alterar nenhum arquivo, apontando conflito com o fluxo com arquivo, linha e citação literal, comando morto, tamanho e visibilidade. [source: Miguel 2026-11-20, issue #7]
  - AC-1.1 GIVEN um AGENTS.md que manda commitar direto WHEN rodo `review` THEN aparece um conflito com AGENTS.md, a linha e o texto, e o hash de todos os arquivos não muda.
  - AC-1.2 GIVEN AGENTS.md e CLAUDE.md sem `@AGENTS.md` WHEN rodo `review` THEN aparece o aviso de que o Claude não vê o AGENTS.md.
R2. IF o projeto só tem AGENTS.md THEN THE keel-context.mjs SHALL recusar criar CLAUDE.md. [source: pesquisa AGENTS.md e CLAUDE.md no Keel]
  - AC-2.1 GIVEN só AGENTS.md WHEN peço `block apply --file CLAUDE.md --create` THEN ele recusa e nada é criado.
R3. WHEN o dev aceita o bloco do Keel THE keel-context.mjs SHALL escrever um bloco de até 6 linhas entre `keel:start` e `keel:end` num arquivo só, preservando cada byte fora dele, e abortar sem escrever se os marcadores estiverem malformados. [source: pesquisa, decisão do Miguel 2026-11-20]
  - AC-3.1 GIVEN um AGENTS.md com CRLF e BOM WHEN aplico o bloco duas vezes THEN os bytes fora do bloco são os mesmos e a segunda aplicação não muda nada.
  - AC-3.2 GIVEN um bloco editado à mão WHEN rodo `check` THEN ele sai com código 1.
R4. WHEN o setup propõe reestruturar o AGENTS.md THE keel-context.mjs SHALL aceitar só uma proposta que move e remove linhas, sem texto novo além dos títulos do modelo. [source: Miguel 2026-11-20]
  - AC-4.1 GIVEN uma proposta com uma linha reescrita WHEN rodo `restructure-check` THEN ele sai com código 1 e mostra a linha.
R5. WHEN o projeto tem keel/architecture.json THE arch-check.mjs SHALL apontar import proibido e ciclo entre módulos, com arquivo, linha e a correção da regra, em JS/TS e em Python. [source: docs/specification.md#keelarchitecturejson]
  - AC-5.1 GIVEN um domínio JS que importa infra e express WHEN rodo `arch-check.mjs` THEN ele sai com código 1 e mostra a correção.
  - AC-5.2 GIVEN um domínio Python que importa sqlalchemy WHEN rodo `arch-check.mjs` THEN ele sai com código 1.
R6. IF uma regra casa com zero arquivos THEN THE arch-check.mjs SHALL falhar com erro de configuração, e violação listada na baseline SHALL deixar de falhar. [source: docs/specification.md#keelarchitecturejson]
  - AC-6.1 GIVEN uma regra sem arquivos WHEN rodo `arch-check.mjs` THEN ele sai com código 2.
  - AC-6.2 GIVEN uma violação na baseline e outra nova WHEN rodo `arch-check.mjs` THEN só a nova falha.
R7. WHEN o modelo edita um arquivo THE hook PostToolUse SHALL devolver ao modelo a violação de arquitetura nova daquele arquivo e a deriva do bloco quando o arquivo é AGENTS.md ou CLAUDE.md. [source: issue #7]
  - AC-7.1 GIVEN um Edit que planta um import proibido WHEN o hook roda THEN ele devolve `decision: block` com a correção.
R8. WHEN uma sessão começa, retoma ou compacta THE hook SessionStart SHALL injetar até 1.500 caracteres com a história ativa, a fase, o que falta, a skill a usar e a precedência, sem trecho do AGENTS.md. [source: pesquisa, decisão do Miguel 2026-11-20]
  - AC-8.1 GIVEN uma história em triage WHEN a sessão começa THEN o contexto cita a história, a fase, `approval:level` e `keel:story`.

## Explicit obligations
- Scripts sem dependências, LF, sem BOM, testes passando no Windows.
- Nenhum script grava AGENTS.md ou CLAUDE.md sem um comando explícito que a skill só chama com aprovação.

## Questions and assumptions
- [ASSUMPTION] A reestruturação do AGENTS.md faz parte do setup (passo opcional), não um comando separado: é o mais simples (decisão em aberto, nota do coordenador).
- [ASSUMPTION] Sem `keel/config.json`: o `check` aceita o bloco em qualquer um dos dois idiomas e exige que esteja num arquivo só.

## Conflicts found
- Nenhum.

## Changes after confirmation
- Nenhuma.
<!-- frozen after approval: end -->
