#!/usr/bin/env bash
# Builds a tiny course-registration project in the case workspace: keel/product.md, one ADR and src/.
# Usage (from a fixture.sh): "$(dirname "$0")/../project.sh" [with-draft]
set -euo pipefail
mkdir -p keel/adrs src
cat > keel/product.md <<'MD'
# Inscrições — produto

Responsável: Ana · Atualizado em: 2026-11-01

## Vision
App para alunos se inscreverem em turmas de cursos livres. [source: dev on 2026-11-01]

## What it does
- Inscreve alunos em turmas com vagas. [source: dev on 2026-11-01]
- Lista os inscritos de uma turma para a coordenação. [source: dev on 2026-11-01]

## What it does not do
- Pagamento.

## Glossary
| Term | Meaning |
|---|---|
| Turma | Oferta de um curso com data e número de vagas |
| Inscrição | Vaga ocupada por um aluno numa turma |

## Decisions
- [ADR-001](adrs/ADR-001-armazenamento.md) Inscrições em arquivo JSON.

## Engineering principles
1. Sem ciclos entre módulos. [hook]
MD
cat > keel/adrs/ADR-001-armazenamento.md <<'MD'
# ADR-001 — Inscrições em arquivo JSON

## Status
Accepted by Ana on 2026-11-01

## Context
Poucas turmas e um só servidor. [source: dev on 2026-11-01]

## Decision
Vamos guardar as inscrições em `data/inscricoes.json`.

## Consequences
- Sem banco para operar.

## Confirmation
not applicable
MD
cat > src/registrations.js <<'JS'
export function listByClass(registrations, classId) {
  return registrations.filter((r) => r.classId === classId);
}
JS
printf '// vazio\n' > src/export.js
git init -q -b main
git config user.name Ana
git config user.email ana@example.com
if [ "${1:-}" = with-draft ]; then
  mkdir -p keel/features/APP-30-exportar-csv
  cat > keel/features/APP-30-exportar-csv/requirements.md <<'MD'
# APP-30 — Exportar inscritos em CSV

Source: dev on 2026-11-20 · Folder: keel/features/APP-30-exportar-csv/ · Level: standard
Status: draft

<!-- frozen after approval: start -->
## Original story
> Como coordenação, quero baixar os inscritos de uma turma em CSV para mandar ao professor.

## Goal
A coordenação baixa os inscritos de uma turma em CSV. [source: dev on 2026-11-20]

## Out of scope
- Exportar em Excel.

## Rules and acceptance criteria
R1. WHEN a coordenação pede o CSV de uma turma THE app SHALL devolver uma linha por inscrito com nome e e-mail. [source: dev on 2026-11-20]
  - AC-1.1 GIVEN uma turma com 2 inscritos WHEN peço o CSV THEN recebo o cabeçalho e 2 linhas.

## Explicit obligations
- Existing behavior that must not change: listByClass [source: src/registrations.js:1]

## Questions and assumptions
- Nenhuma.

## Conflicts found
- Nenhum.

## Changes after confirmation
- Nenhuma.
<!-- frozen after approval: end -->
MD
fi
git add -A
git commit -qm "projeto inicial"
