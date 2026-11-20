# ADR-001 — Armazenamento em memória

## Status
Accepted on 2026-11-01.

## Context
O clube tem poucas dezenas de usuários e o serviço é reiniciado raramente.

## Decision
Usuários ficam em memória, em `UserRepository`.

## Consequences
- Dados somem quando o processo reinicia.

## Confirmation
`test/users.test.mjs` usa o repositório em memória.
