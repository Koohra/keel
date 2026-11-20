# Fase: design

Objetivo: decidir o "como" quando há escolha real. Só existe no nível `with-design`. Não há portão aqui: o dev aprova o design junto com as tasks, na fase seguinte.

1. Leia o `requirements.md` confirmado, as ADRs que a história toca, a seção "Engineering principles" do `keel/product.md` e só os arquivos onde a história mexe. Se precisar achar o código de novo, rode o repo map (`node "${CLAUDE_PLUGIN_ROOT}/scripts/repo-map.mjs" --budget 1500 --focus <termos>`).
2. Crie `keel/features/<KEY>-<slug>/design.md` a partir de `${CLAUDE_PLUGIN_ROOT}/templates/design.md`, com `Status: draft` no cabeçalho (fora do bloco congelado).
3. `Trigger:` com o tipo e o motivo, por exemplo `Trigger: data/migration — usuários passam a ser gravados em arquivo`. Tipos: trade-off, contract, data/migration, new dependency, cross-cutting, pattern break, new structure, rung change.
4. "Approach": um parágrafo que cita as regras atendidas (R1, R2). Não repita o texto dos requisitos; cite os IDs.
5. "Code map": o que muda, o que reaproveitar e o que não mexer, com `arquivo:linha`.
6. "Contracts and data": só a parte relevante (formato, campos, migração). Sem definições completas de código.
7. "New structure and rationale": `none` é a resposta esperada na maioria das histórias. Cada interface, camada, mapper/DTO, módulo, helper ou dependência nova ganha uma linha com tipo, a heurística que a justifica (R#, 2nd implementation (o fake de teste conta), external port, published boundary, 3rd occurrence) e a alternativa mais simples com o motivo de não usá-la. Não crie interface com uma implementação, mapper que copia campo a campo nem helper antes da terceira ocorrência. Cada elemento da tabela vai depois no `New structure:` de uma task.
8. "Alternatives considered": para cada dúvida técnica (biblioteca, versão, compatibilidade, desempenho), pesquise em fonte primária e registre Decisão / Motivo / Alternativas com o link. Não existe research.md. Sem dúvida técnica, "not applicable".
9. "Cross-cutting concerns" e "Risks and pattern breaks": um item por linha; o que não se aplica diz "not applicable".
10. "ADR candidate?": `Yes — <motivo>` se a decisão afeta estrutura, dependência, interface ou técnica de construção e sobrevive à história, ou se contraria uma ADR existente; senão `No — <motivo>`. Com `Yes`, escreva o rascunho em `keel/adrs/ADR-NNN-<slug>.md` no formato das ADRs que já existem, com status proposto; quem aceita é o dev.
11. Decisão com consequência (contrato externo, modelo de dados, dependência, consistência, custo) que as fontes não resolvem é do dev: pergunte uma por vez, com opções, consequências e a sua recomendação, e registre a resposta com `[source: dev on YYYY-MM-DD]`. O que as fontes já decidem, cite e siga.
12. Valide por script e corrija até não haver erro (o script confere também as regras citadas contra o requirements.md):
    `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-feature.mjs" keel/features/<KEY>-<slug>`
13. Avance: `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" advance`. Diga ao dev que o design será aprovado junto com as tasks.

Orçamento: cerca de duas páginas. Não escreva código do projeto nesta fase.
