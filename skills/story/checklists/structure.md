# Checklist: estrutura

Use quando o design.md declara estrutura nova (linha em "New structure and rationale" ou `Trigger: new structure`) ou subida de degrau (`Trigger: rung change`). Responda cada item com sim, não ou não se aplica, e a evidência (`arquivo:linha`).

1. Cada pasta nova pertence a um componente do `keel/architecture.json`, e não fica órfã?
2. O componente que a task cria ou muda tem degrau e motivo em "Rungs per module" do `keel/product.md`?
3. Já existe código parecido no repositório que a task devia reusar em vez de escrever de novo?
4. Cada fronteira nova entre componentes tem regra no `architecture.json` (o que pode e o que não pode depender dela)?
5. O formato de erro e de dados (datas, dinheiro, identificadores, respostas de erro) segue o que o código já usa?
