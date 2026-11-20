# Design — APP-10

Requirements: requirements.md · Status: draft

<!-- frozen after approval: start -->
Trigger: data/migration — usuários passam da memória para `data/users.json`, contrariando a ADR-001.

## Approach
O `UserRepository` recebe o caminho do arquivo, carrega a lista ao ser criado (R2, R3) e grava a lista inteira a cada `save` (R1), com `node:fs` síncrono.

## Code map
| Path | What changes | Reuse / do not touch |
|---|---|---|
| src/users.js:2 | construtor recebe o caminho; `save` grava | `register` e a regra do nome não mudam |
| src/server.js:5 | cria o repositório com `data/users.json` | rotas não mudam |

## Contracts and data
`data/users.json`: lista JSON de `{ name, email, createdAt }`.

## New structure and rationale
none

## Alternatives considered
not applicable

## Cross-cutting concerns
Security: not applicable · Privacy: e-mails ficam em arquivo local · Performance: gravação inteira serve para dezenas de usuários · Observability: not applicable · Migration/rollback: apagar o arquivo volta ao estado vazio

## Risks and pattern breaks
- Contraria a ADR-001; mitigação: nova ADR substitui a ADR-001.

## ADR candidate?
Yes — muda a decisão de armazenamento da ADR-001 e vale para o projeto todo.
<!-- frozen after approval: end -->
