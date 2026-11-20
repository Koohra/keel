# Keel

Plugin do Claude Code para desenvolvimento orientado a especificação: transforma documentação mínima e cuidadosa em código bom, uma história e uma task pequena por vez, com TDD em cada task e evidência verificável em cada passo.

> Em construção (Keel 2). O plano está nas issues #1 a #8; a especificação completa está em [docs/especificacao.md](docs/especificacao.md).

## Instalar

```
/plugin install keel --marketplace Koohra/keel
```

## Como funciona

1. O projeto tem `keel/product.md` (curto, com princípios de engenharia) e `keel/adrs/`.
2. Cada história ganha `keel/features/<CHAVE>-<descricao>/` com `requirements.md`, `design.md` (só com gatilho), `tasks.md` e `state.json`, tudo versionado.
3. A ordem das fases vem de [workflow/workflow.json](workflow/workflow.json) e do `state.json` da história; hooks bloqueiam o que estiver fora da fase.
4. Cada task segue TDD (RED, GREEN, REFACTOR), passa por review isolado e só vira commit com aprovação do dev.

Os modelos de documento estão em [templates/](templates/).

## Desenvolver

Requer Node.js 22 ou mais novo, sem dependências.

```
npm test
claude plugin validate .
```
