# Depuração (dentro da implementação)

Carregue este arquivo quando o `next` trouxer `task.debugging`: o GREEN ou as checagens da task aberta falharam. O objetivo é achar a causa antes de mudar código, e não tentar de novo às cegas. O script conta as tentativas falhas da task; na terceira ele recusa `evidence green` e `checks` até você gravar o bloqueio.

## Antes de mudar qualquer coisa
1. Reproduza: leia a saída do comando que falhou (o script a devolve no erro do `evidence green` ou do `checks`) e ache a primeira linha de erro real (asserção, exceção, código de saída), não a última.
2. Isole: diga em uma frase qual arquivo e qual linha produzem o erro e o que o teste esperava. Leia o código em volta e compare com um caso parecido que funciona no projeto.
3. Levante uma hipótese só, escrita: "falha porque X; se eu mudar Y, o teste passa". Sem hipótese, investigue mais (logs, valores intermediários) e não mude código.

## A tentativa
1. Faça uma mudança, a menor que testa a hipótese, só nos arquivos de `Files:` da task.
2. Nunca mude, afrouxe ou apague o teste do RED para ele passar. Se a hipótese é que o teste está errado, pare e siga o GREEN passo 2 da implementação (bloqueio e pergunta ao dev).
3. Grave de novo: `node "<plugin>/scripts/keel-state.mjs" evidence green` (ou `checks`, se foi a checagem que falhou).
4. Se falhou, volte ao passo 1 com o que aprendeu; desfaça a mudança que não confirmou a hipótese antes da próxima.

## Depois de 3 tentativas
Três tentativas falhas na mesma task dizem que o problema é outro: requisito ambíguo, task grande demais, desenho errado ou dependência fora da task. Não tente uma quarta.
1. Grave o bloqueio com o que a depuração achou:
   `node "<plugin>/scripts/keel-state.mjs" block --reason "<causa provável; hipóteses testadas; pergunta>"`
2. Mostre ao dev a falha (comando e trecho da saída), as hipóteses testadas com o resultado de cada uma e as opções: mudar a task, dividir a task, revisar o requisito ou o design. Recomende uma. Pare e espere.
3. O `block` zera a contagem. Só tente de novo depois da resposta do dev.
