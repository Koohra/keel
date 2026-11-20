# ADR-005 — Documentos que o Keel lê ficam em keel/

## Status
Accepted by Miguel on 2026-11-20 (review do PR #9).

## Context
O product.md e as ADRs podiam ficar em `docs/` ou junto dos arquivos do Keel em `keel/`. Em projetos reais, `docs/` costuma ter muito conteúdo que o Keel não deve usar como fonte. [source: docs/specification.md#arquivos]

## Decision
Tudo o que o Keel lê como fonte do projeto fica numa pasta só:
- `keel/product.md`;
- `keel/adrs/ADR-NNN-*.md`;
- `keel/features/<KEY>-<slug>/`;
- `keel/architecture.json`.

O Keel não usa outros documentos do repo como fonte, a menos que o dev os aponte. Sem `keel/product.md`, a história não começa e o Keel oferece criá-lo (portão 1 da etapa 0).

## Consequences
- Fica claro quais documentos o Keel lê, e os scripts conferem caminhos fixos.
- Uma `docs/` existente convive sem conflito; a etapa 0 propõe migrar para `keel/` o que for fonte do projeto.
- product.md e ADRs ficam menos visíveis para quem procura em `docs/`; o README do projeto pode apontar para `keel/`.

## Confirmation
`test/repo.test.mjs` confere `keel/product.md` e `keel/adrs/`. A skill `setup` (parte 7) cria e verifica estes caminhos.
