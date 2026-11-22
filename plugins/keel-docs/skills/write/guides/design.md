# Guia: design.md

O "como" de uma história, só quando há escolha real (nível `with-design`). Cerca de duas páginas. Precisa de um `requirements.md` na mesma pasta; sem ele, comece pelo guia `requirements.md`.

1. Cabeçalho `Status: draft`. Leia o requirements.md, as ADRs que a história toca, "Engineering principles" do `keel/product.md` e só os arquivos onde a história mexe.
2. `Trigger:` com o tipo e o motivo. Tipos: trade-off, contract, data/migration, new dependency, cross-cutting, pattern break, new structure, rung change. Sem gatilho, diga ao dev que a história não precisa de design.md.
3. "Approach": um parágrafo que cita as regras atendidas (R1, R2), sem repetir o texto delas.
4. "Code map": o que muda, o que reaproveitar e o que não mexer, com `arquivo:linha`.
5. "Contracts and data": só a parte relevante; nada de código completo.
6. "New structure and rationale": `none` é a resposta esperada. Cada elemento novo com tipo, a heurística que o justifica (R#, 2nd implementation, external port, published boundary, 3rd occurrence) e a alternativa mais simples com o motivo de não usá-la.
7. "Alternatives considered": cada dúvida técnica com Decisão / Motivo / Alternativas e o link da fonte primária. Escolha com consequência (contrato externo, modelo de dados, dependência, custo) é do dev: uma pergunta, com opções e recomendação.
8. "Cross-cutting concerns" e "Risks and pattern breaks": um item por linha; "not applicable" no que não se aplica.
9. "ADR candidate?": `Yes — <motivo>` se a decisão sobrevive à história; aí ofereça escrever a ADR com o guia `adr.md`. Senão `No — <motivo>`.
