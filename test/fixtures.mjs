// Minimal valid documents of a story, for tests to change one piece at a time.

export function requirementsDoc() {
  return `# APP-1 — Login

Source: APP-1 · Folder: keel/features/APP-1-login/ · Level: standard
Status: draft

<!-- frozen after approval: start -->
## Original story
> Quero entrar com Google.

## Goal
Dev entra com Google. [source: APP-1]

## Out of scope
- Pagamento.

## Rules and acceptance criteria
R1. WHEN o usuário escolhe Google THE app SHALL abrir o consentimento. [source: APP-1]
  - AC-1.1 GIVEN deslogado WHEN clica THEN vê o consentimento.
R2. IF a sessão expira THEN THE app SHALL pedir login. [source: APP-1]
  - AC-2.1 GIVEN sessão WHEN expira THEN pede login.
R3. WHILE offline THE app SHALL mostrar aviso. [source: APP-1]
  - AC-3.1 GIVEN offline WHEN abre THEN vê aviso.

## Explicit obligations
- Edge cases: nenhum.

## Questions and assumptions
- Nenhuma pergunta.

## Conflicts found
- Nenhum.

## Changes after confirmation
- Nenhuma.
<!-- frozen after approval: end -->
`;
}

export function tasksDoc() {
  return `# Tasks — APP-1

Requirements: requirements.md · Design: none
Approved by Ana on 2026-11-20

<!-- frozen after approval: start -->
## T1 — Walking skeleton: botão até o consentimento
Covers: R1 (AC-1.1)
Files: \`src/login.js\`
New structure: none
Test first: \`login.test.js\` — abre o consentimento
Verification: \`npm test\`
Done when: teste passa
Depends on: —

## T2 — Sessão expirada
Covers: R2 (AC-2.1)
Files: \`src/session.js\`
New structure: none
Test first: \`session.test.js\` — pede login
Verification: \`npm test\`
Done when: expira e pede login
Depends on: T1

## T3 — Aviso offline
Covers: R3
Files: \`src/offline.js\`
New structure: none
Test first: \`offline.test.js\` — mostra aviso
Verification: \`npm test\`
Done when: aviso aparece
Depends on: T1

## T4 — Configuração do provedor
Covers: R1
Files: \`config/google.json\`
New structure: none
No test: só configuração
Done when: arquivo de configuração existe
Depends on: T1
<!-- frozen after approval: end -->

## Progress
### T1
Status: pending
RED evidence: —
GREEN evidence: —
Review: —
### T2
Status: pending
### T3
Status: pending
### T4
Status: pending

## Implementation notes
- Nenhuma.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
`;
}

export function designDoc() {
  return `# Design — APP-1

Requirements: requirements.md · Status: draft

<!-- frozen after approval: start -->
Trigger: new dependency

## Approach
Usa o SDK do Google (R1).

## Code map
Not applicable.

## Contracts and data
Not applicable.

## New structure and rationale
Nenhuma.

## Alternatives considered
Not applicable.

## Cross-cutting concerns
Security: token on the server.

## Risks and pattern breaks
- Nenhum.

## ADR candidate?
No — local to the story.
<!-- frozen after approval: end -->
`;
}
