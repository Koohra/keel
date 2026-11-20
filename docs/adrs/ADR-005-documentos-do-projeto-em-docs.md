# ADR-005 — Documentos do projeto em docs/

## Status
Proposta em 2026-11-20; aguarda decisão do Miguel neste PR.

## Contexto
Os documentos do projeto (product.md e ADRs) podem ficar em `docs/` ou junto dos arquivos do Keel em `keel/`. [fonte: especificacao.md#arquivos]

## Decisão
`docs/product.md` e `docs/adrs/ADR-NNN-*.md` ficam em `docs/`. A pasta `keel/` guarda só o que é do fluxo: `keel/features/` e `keel/architecture.json`.

## Consequências
- product.md e ADRs servem a qualquer pessoa ou ferramenta, não só ao Keel, e ficam onde se costuma procurar documentação.
- Projetos que já têm `docs/` com outro conteúdo convivem com ele; a etapa 0 propõe a migração.

## Confirmação
A skill `setup` (parte 7) cria e verifica estes caminhos.
