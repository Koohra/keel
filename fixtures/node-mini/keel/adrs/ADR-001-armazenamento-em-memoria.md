# ADR-001 — Armazenamento em memória

## Status
Aceita em 2026-11-01.

## Contexto
O clube tem poucas dezenas de usuários e o serviço é reiniciado raramente.

## Decisão
Usuários ficam em memória, em `RepositorioUsuarios`.

## Consequências
- Dados somem quando o processo reinicia.

## Confirmação
`test/usuarios.test.mjs` usa o repositório em memória.
