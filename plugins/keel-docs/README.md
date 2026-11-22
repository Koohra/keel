# keel-docs

Agente de documentação do Keel, opcional. Ajuda o dev a redigir os documentos que o Keel lê: `keel/product.md`, ADRs em `keel/adrs/`, e o `requirements.md` e o `design.md` de uma história. Não implementa código e não aprova nada: a aprovação é do dev, pelo fluxo do Keel.

```
/plugin install keel-docs --marketplace Koohra/keel
```

- Skill `keel-docs:write`: um guia por documento em `skills/write/guides/`.
- Modelos em `templates/`.
- Checagem de estrutura, só leitura: `node scripts/doc-check.mjs <arquivo>`.

Evals: `claude plugin eval plugins/keel-docs --runs 1 --ablation none --trust-plugin --scaffold --allow-tools Bash Write Edit`.
