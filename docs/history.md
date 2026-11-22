# A história do Keel

O Keel é um projeto pessoal que já passou por duas vidas. Se você está lendo isto, provavelmente também usa IA para programar, e talvez se reconheça em algum trecho. Vou contar as duas vidas, porque o Keel 2 só existe do jeito que existe por causa do que o Keel 1 me ensinou.

## O Keel 1: querer cobrir tudo

O primeiro Keel, o keel-dev, existe há bastante tempo. A ideia já era a mesma de hoje: fazer a IA seguir um processo de engenharia de verdade, em vez de só gerar código.

Com o tempo, ele foi crescendo. Ganhou um núcleo (keel-core) e pacotes de regras por stack: um para Nest, outro para Angular, com planos para .NET e Python. Ganhou um plugin de documentação com modelos de PRD, HLD, FDD e ADR. E ganhou uma qualificação de release pesada: cada versão precisava passar por uma matriz de casos no Claude Code e no Codex, com resultados guardados no repositório e presos por hash às skills. Em outubro de 2026 ele chegou ao 1.0.0-rc.1.

Foi aí que os números começaram a contar outra história. A retrospectiva mostrou cerca de US$ 98 gastos em avaliações e 292 mil linhas de resultados guardadas, para 1.066 linhas de skill. A qualificação completa, com três rodadas em dois hosts, nunca chegou a rodar. E a maior parte dos defeitos reais (uns 25 a 30) apareceu barato, nas primeiras execuções. O pior deles, uma skill que simplesmente não era acionada, só apareceu no uso de verdade.

O Keel 1 fazia muita coisa, e por isso mesmo tinha perdido o foco. Já aconteceu com você? Um projeto que cresce tanto que você não lembra mais qual problema ele resolvia?

## A parada para repensar

Em 18 de novembro de 2026 eu parei e me fiz uma pergunta honesta: o que eu quero, de fato, quando uso a IA para programar?

Faça essa pergunta a si mesmo também. A minha resposta foi: desenvolver melhor por especificação. Escrever pouca documentação, mas com atenção total, e deixar que ela guie o código. Uma história por vez, com o entendimento confirmado antes de qualquer linha. E percebi outra coisa: separar regras por stack era demais. Bons princípios de engenharia são os mesmos em qualquer linguagem.

Dessa conversa saíram as decisões que formam o Keel 2:

- **Uma pasta por história**, com no máximo três documentos versionados: `requirements.md` sempre, `design.md` só quando a história pede, e `tasks.md`.
- **Requisitos em EARS e critérios de aceite em Given/When/Then**, os formatos que o mercado já usa, com o texto no idioma do projeto.
- **TDD obrigatório em cada task**: vermelho, verde, refatoração. Task sem comportamento declara por quê.
- **A ordem do fluxo vem de um script**, não da IA. Um `workflow.json` define as fases e um `state.json` por história guarda onde ela está. Hooks bloqueiam o que estiver fora da fase.
- **Princípios de engenharia no `product.md`** do projeto, com o que dá para checar virando teste de arquitetura em vez de prosa.
- **Testes enxutos em quatro camadas**, sem resultados guardados no repositório. É a lição mais cara do Keel 1.
- **Documentação é outro trabalho**: o ajudante de escrita virou um plugin separado e opcional, o keel-docs.

O keel-dev foi aposentado sem chegar à versão final, e o Keel 2 começou do zero, num repositório novo, com o mesmo nome.

## O Keel 2: construído com o próprio fluxo

O Keel 2 foi feito em oito partes, uma issue para cada, entre 20 e 22 de novembro de 2026. Cada parte virou uma história do próprio Keel, com `requirements.md` e `tasks.md`, e cada task foi escrita em TDD, com o comando do teste vermelho e do verde registrado. As histórias estão em [keel/features/](../keel/features/), e as decisões que valem para o projeto inteiro, em [keel/adrs/](../keel/adrs/).

Usar o Keel para construir o Keel foi o melhor teste possível: cada atrito apareceu cedo, no lugar onde mais dói.

Agora é a sua vez. [Instale o Keel](../README.md#instalar), pegue uma história pequena do seu projeto, rode o `/keel:story` e repare no que muda quando a IA precisa confirmar o entendimento antes de escrever a primeira linha. Depois me conte.
