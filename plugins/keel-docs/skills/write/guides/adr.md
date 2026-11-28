# Guia: ADR

Uma decisão que afeta o projeto inteiro e sobrevive às histórias: estrutura, dependência, interface, técnica de construção ou algo que contraria uma ADR existente. Escolha de uma história só vai no design.md dela.

1. Liste `keel/adrs/` e use o próximo número livre: `keel/adrs/ADR-NNN-<slug>.md`, três dígitos e slug curto em minúsculas com hífen.
2. "Status": `Proposed`. Quem muda para `Accepted by <dev> on <data>` é o dev.
3. "Context": o problema e as forças, cada fato com fonte. Sem fonte, `[QUESTION]`.
4. "Decision": uma decisão, na voz ativa ("Vamos ..."). Se o dev ainda não escolheu, apresente as opções com consequências e a sua recomendação, na linguagem simples do SKILL.md (primeiro o que muda para o produto ou para o usuário, o termo técnico só entre parênteses), uma pergunta só, e espere.
5. "Consequences": o que fica mais fácil, o que fica mais difícil e o que precisa ser feito por causa dela.
6. "Confirmation": como se confere que a decisão é seguida (teste, script, regra em `keel/architecture.json`, review). Sem forma de conferir, "not applicable" e diga isso ao dev.
7. Se a ADR substitui outra, diga na nova e sugira ao dev marcar a antiga como `Superseded by ADR-NNN`; não edite a antiga sem ele pedir.
8. Acrescente a linha da ADR em "Decisions" do `keel/product.md` só se o dev concordar.
