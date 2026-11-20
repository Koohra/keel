// Documentos mínimos e válidos de uma história, para os testes alterarem um trecho por vez.

export function requirementsDoc() {
  return `# APP-1 — Login

Fonte: APP-1 · Pasta: keel/features/APP-1-login/ · Nível: padrão
Status: rascunho

## História original
> Quero entrar com Google.

## Objetivo
Dev entra com Google. [fonte: APP-1]

## Fora de escopo
- Pagamento.

## Regras e critérios de aceite
R1. WHEN o usuário escolhe Google THE app SHALL abrir o consentimento. [fonte: APP-1]
  - AC-1.1 GIVEN deslogado WHEN clica THEN vê o consentimento.
R2. IF a sessão expira THEN THE app SHALL pedir login. [fonte: APP-1]
  - AC-2.1 GIVEN sessão WHEN expira THEN pede login.
R3. WHILE offline THE app SHALL mostrar aviso. [fonte: APP-1]
  - AC-3.1 GIVEN offline WHEN abre THEN vê aviso.

## Obrigações explícitas
- Casos de borda: nenhum.

## Perguntas e suposições
- Nenhuma pergunta.

## Conflitos encontrados
- Nenhum.

## Mudanças após a confirmação
- Nenhuma.
`;
}

export function tasksDoc() {
  return `# Tasks — APP-1

Requisitos: requirements.md · Design: não há
Aprovado por Ana em 2026-11-20

## T1 — Esqueleto andante: botão até o consentimento
Cobre: R1 (AC-1.1)
Arquivos: \`src/login.js\`
Teste primeiro: \`login.test.js\` — abre o consentimento
Verificação: \`npm test\`
Pronto quando: teste passa
Depende de: —
Status: pendente
Evidência RED: —
Evidência GREEN: —
Review: —

## T2 — Sessão expirada
Cobre: R2 (AC-2.1)
Teste primeiro: \`session.test.js\` — pede login
Verificação: \`npm test\`
Pronto quando: expira e pede login
Depende de: T1
Status: pendente

## T3 — Aviso offline
Cobre: R3
Teste primeiro: \`offline.test.js\` — mostra aviso
Verificação: \`npm test\`
Pronto quando: aviso aparece
Depende de: T1
Status: pendente

## T4 — Configuração do provedor
Cobre: R1
Sem teste: só configuração
Depende de: T1
Status: pendente

## Notas de implementação
- Nenhuma.

## Convergência (preenchida no fim, conferida por script)
| Regra | Evidência | Situação |
|---|---|---|
`;
}

export function designDoc() {
  return `# Design — APP-1

Requisitos: requirements.md · Status: rascunho
Gatilho: dependência nova

## Abordagem
Usa o SDK do Google (R1).

## Mapa de código
Não se aplica.

## Contratos e dados
Não se aplica.

## Estrutura nova e justificativa
Nenhuma.

## Alternativas consideradas
Não se aplica.

## Preocupações transversais
Segurança: token no servidor.

## Riscos e quebras de padrão
- Nenhum.

## Candidata a ADR?
Não — local à história.
`;
}
