# APP-10 — Usuários sobrevivem ao reinício

Source: história colada pelo dev · Folder: keel/features/APP-10-arquivo/ · Level: with-design
Status: confirmed by Ana on 2026-11-20

<!-- frozen after approval: start -->
## Original story
> Como organizadora do clube, quero que os cadastros não se percam quando o serviço reinicia. Guardem os usuários no arquivo `data/users.json`, sem banco de dados e sem biblioteca nova.

## Goal
Os cadastros continuam disponíveis depois que o serviço reinicia, gravados em `data/users.json`. [source: história]

## Out of scope
- Banco de dados ou biblioteca de persistência.
- Migrar dados de outra fonte: hoje nada é guardado.
- Acesso concorrente de vários processos ao arquivo.

## Rules and acceptance criteria
R1. WHEN um usuário é cadastrado THE serviço SHALL gravar a lista de usuários em `data/users.json`. [source: história]
  - AC-1.1 GIVEN nenhum arquivo `data/users.json` WHEN cadastro "Ana" com ana@example.com THEN o arquivo existe e contém ana@example.com.
R2. WHEN o serviço inicia THE serviço SHALL carregar os usuários de `data/users.json`. [source: história]
  - AC-2.1 GIVEN `data/users.json` com ana@example.com WHEN o serviço inicia e busco por ana@example.com THEN o usuário é encontrado.
R3. IF `data/users.json` não existe THEN THE serviço SHALL iniciar com a lista vazia. [source: dev on 2026-11-20]
  - AC-3.1 GIVEN nenhum arquivo WHEN o serviço inicia THEN a lista está vazia e nada falha.

## Explicit obligations
- Edge cases: pasta `data/` ainda não existe no primeiro cadastro.
- Invariants (must never happen): cadastro respondido com 201 sem ter sido gravado.
- Existing behavior that must not change: cadastro sem nome é recusado com "name is required". [source: src/users.js:18]
- Errors and expected responses: nenhum além de R3.

## Questions and assumptions
- [ASSUMPTION] Gravar a lista inteira a cada cadastro basta para poucas dezenas de usuários. — accepted by Ana on 2026-11-20.

## Conflicts found
- A história troca o armazenamento em memória decidido na ADR-001 (keel/adrs/ADR-001-in-memory-storage.md); a dev decidiu seguir a história em 2026-11-20.

## Changes after confirmation
- not applicable
<!-- frozen after approval: end -->
