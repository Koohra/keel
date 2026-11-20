# Keel 2: especificação do fluxo por etapa

Versão: 2 · Data: 2026-11-20 · Responsável: Miguel

Este documento diz, para cada etapa do fluxo, o que entra, o que o Keel deve e não deve fazer, quais práticas aplica, onde o dev aprova e o que sai. Ele é a fonte das skills do Keel 2: cada regra aqui vira instrução de skill, checagem de script ou caso de eval. O desenho visual está em [fluxo-keel2.md](fluxo-keel2.md) e as fontes estão em [Práticas de SDD para o Keel.md](Práticas%20de%20SDD%20para%20o%20Keel.md) e [Princípios de design para IA.md](Princípios%20de%20design%20para%20IA.md).

## Propósito

O Keel transforma documentação mínima e cuidadosa em código bom, uma história e uma task pequena por vez, com TDD em cada task e evidência verificável em cada passo.

## Papéis

| Papel | Faz | Não faz |
| --- | --- | --- |
| Dev | Escreve ou aprova os documentos, responde perguntas, aprova portões e commits | Não precisa revisar volume de texto, só intenção e critérios |
| Keel | Lê, valida, pergunta, planeja, implementa em TDD, verifica, propõe commit | Não decide trade-offs sozinho, não commita sem aprovação, não inventa fatos |
| Agente de documentação (plugin separado, opcional) | Ajuda a redigir product.md, ADRs, requirements.md e design.md | Não implementa nem aprova nada |
| Revisor isolado | Revisa documento ou diff sem o histórico da conversa | Não revisa o próprio trabalho de quem o chamou |
| Scripts (sem dependências) | Checam estrutura, IDs, cobertura regra → task → teste e marcadores abertos | Não julgam conteúdo |

## Regras que valem em todas as etapas

1. **Fonte em todo fato.** Cada afirmação sobre o produto, uma decisão ou o código cita a origem (`product.md#seção`, `ADR-NNN`, `arquivo:linha`, `Jira`, `dev em AAAA-MM-DD`). Sem fonte, vira `[PERGUNTA]` ou `[SUPOSIÇÃO]`.
2. **Nada inventado.** Se uma categoria não tem informação, o Keel escreve "sem orientação encontrada". Se o resultado esperado de um exemplo não é conhecido, é uma pergunta, não um critério.
3. **Evidência honesta.** Checagem que não rodou é `skipped`, nunca `passed`. Falha, waiver e indisponibilidade aparecem como o que são. "Todos os testes passam" sem comando e saída não conta.
4. **Escopo é contrato.** O Keel só toca o que a etapa e a task autorizam. Trabalho fora do escopo é bloqueio reportado, não correção silenciosa.
5. **Decisão consequente é do dev.** Mudança de contrato externo, modelo de dados, dependência, garantia de consistência ou custo operacional para o fluxo até o dev escolher. O Keel apresenta opções, consequências e recomendação.
6. **Perguntas uma por vez**, cada uma com a opção recomendada, no máximo cerca de cinco por documento.
7. **Contexto mínimo.** Cada etapa carrega só as seções relevantes do product.md, as ADRs citadas e o código sob demanda. Nada de carregar a spec inteira em cada task.
8. **Mudança de entendimento é registrada.** O que muda depois de uma aprovação vai para a seção "Mudanças após a confirmação" do requirements.md, com data, motivo e nova aprovação do dev. Nunca vai direto para o código.
9. **Checagem mecânica é script, não prosa.** Estrutura, IDs, cobertura e marcadores são verificados por script; o modelo não atesta isso sozinho.
10. **Responde no idioma do dev.**

## Arquivos

| Arquivo | Nível | Quem escreve | Versionado |
| --- | --- | --- | --- |
| `docs/product.md` | Projeto | Dev, opcionalmente com o agente de documentação | Sim |
| `docs/adrs/ADR-NNN-*.md` | Projeto, decisões que afetam o projeto inteiro | Dev | Sim |
| `keel/features/<CHAVE>-<descricao>/requirements.md` | História, sempre | Dev, opcionalmente com o agente; o Keel completa obrigações, perguntas e conflitos | Sim |
| `keel/features/<CHAVE>-<descricao>/design.md` | História, só com gatilho de design | Dev ou Keel, aprovado pelo dev | Sim |
| `keel/features/<CHAVE>-<descricao>/tasks.md` | História | Keel, aprovado pelo dev | Sim |
| `keel/features/<CHAVE>-<descricao>/state.json` | História, estado do fluxo lido pela IA | Só o script de estado do Keel, nunca à mão nem pelo modelo | Sim |
| `keel/architecture.json` | Projeto, regras de arquitetura em formato neutro | Keel, aprovado pelo dev | Sim |

`<CHAVE>` é o código da história no Jira ou ferramenta parecida, e `<descricao>` é um slug curto (exemplo: `keel/features/STUD-142-login-google/`). Os arquivos da história são versionados junto com o código, então o PR mostra o que foi combinado, o plano e a evidência.

### Estado da história (state.json)

O `state.json` diz à IA em que etapa a história está e o que já foi gerado e aprovado. O Keel lê esse arquivo no início de toda interação, inclusive ao retomar uma história em outra sessão, e só avança de etapa se o estado permitir.

- **Quem escreve:** só o script de estado (`keel-state.mjs`), chamado pela skill com comandos como `generated requirements` ou `approve requirements --by <dev>`. O modelo não edita o JSON diretamente.
- **Aprovação presa ao conteúdo:** ao aprovar um documento, o script grava o hash dele. Se o arquivo mudar depois, a aprovação vence e a história volta para a confirmação daquele documento.
- **Uma fonte de verdade por assunto:** o state.json guarda fase, portões e a task atual. O status de cada task continua no tasks.md, e o script confere que os dois batem.
- **Garantia por hook:** um `PreToolUse` lê o state.json e bloqueia edição de código-fonte enquanto a história não chegou na fase de implementação. Isso garante "nenhum código antes da aprovação".
- **Fases:** `triage` → `reading` → `requirements` → `confirmation` → `design` (pulada se não houver gatilho) → `tasks` → `implementation` → `closing` → `done`.

Orçamento de tamanho: product.md até cerca de 200 linhas, requirements.md até cerca de 1 página, design.md até cerca de 2 páginas. Seção sem conteúdo diz "não se aplica" em uma linha e não é removida, para o script achar a estrutura.

---

## Etapa 0. Preparar o projeto (uma vez por projeto)

**Objetivo:** ter o contexto durável do projeto antes da primeira história.

**Entradas:** repositório novo ou existente; documentação existente, se houver.

**Comportamentos**
- Deve verificar se `docs/product.md` e `docs/adrs/` existem e estão dentro do orçamento de tamanho.
- Deve, se houver documentação antiga, propor a migração para product.md e ADRs com uma linha de destino ou descarte para cada fonte (agente de documentação).
- Deve registrar no product.md a seção "Princípios de engenharia" (no máximo 10 regras, cada uma marcada `[hook]` ou `[review]`), o degrau de arquitetura de cada módulo, os exemplares a seguir, o que não copiar e os comandos de checagem do projeto (teste, lint com complexidade, arquitetura). O modelo está no anexo.
- Deve propor testes de arquitetura na ferramenta nativa da linguagem (ArchUnit, Konsist, NetArchTest/ArchUnitNET, dependency-cruiser, import-linter, go-arch-lint), a partir de `keel/architecture.json`. Instala só com autorização explícita e prova que cada regra falha contra uma violação plantada antes de removê-la. Em código existente, gera uma baseline para que só violações novas falhem.
- Não deve tornar Clean Architecture ou DDD o padrão: a regra estrutural universal é a direção das dependências; o resto segue o degrau declarado por módulo.
- Não deve copiar para o product.md o que o código já diz.
- Não deve começar uma história sem product.md; sem ele, oferece criar.

**Práticas:** product.md curto e sempre relevante (Anthropic, Radar Spec Kit); ADR no formato Nygard com seção de confirmação (MADR); regra de dependência (Martin, Cockburn, Fowler); arquitetura proporcional à complexidade (Fowler PoEAA, Evans, Vernon); testes de arquitetura como fitness functions com mensagem de correção e baseline (ArchUnit, import-linter); restrição arquitetural obrigatória reduz sucesso funcional (Constraint Decay, preprint).

**Portão:** dev aprova product.md e as ADRs iniciais.

**Saídas:** `docs/product.md`, `docs/adrs/`.

## Etapa 1. Triagem da história

**Objetivo:** dosar a cerimônia pelo tamanho e risco.

**Entradas:** história (Jira ou outra ferramenta, já refinada ou não), branch criada pelo dev.

**Comportamentos**
- Deve classificar a história em um de três níveis, mostrando o motivo:
  - **trivial**: uma regra, poucos arquivos, sem gatilho de design. Só tasks.md, com critérios na própria task.
  - **padrão**: requirements.md e tasks.md.
  - **com design**: requirements.md, design.md e tasks.md.
- Gatilhos de design: trade-off real, mudança de contrato ou interface, dados ou migração, dependência nova, preocupação transversal (segurança, privacidade, desempenho), quebra deliberada de padrão, candidata a ADR, estrutura nova (fronteira, porta, módulo, mapper, dependência externa) ou subida de degrau de um módulo.
- Deve sugerir fatiar a história quando houver mais de cerca de 6 regras ou uma regra com muitos exemplos.
- Não deve escolher o nível em silêncio; o dev pode subir ou descer o nível.

**Práticas:** cerimônia proporcional ao risco (BMAD, Böckeler); sinais de fatiamento do Example Mapping; padrões de split de Lawrence e SPIDR.

**Portão:** dev confirma o nível (um clique, sem documento).

**Saídas:** nível registrado no cabeçalho do requirements.md ou do tasks.md.

## Etapa 2. Ler as fontes

**Objetivo:** juntar tudo o que a história precisa, com origem.

**Entradas:** história, product.md, ADRs, código.

**Comportamentos**
- Deve copiar a história original sem edição para o requirements.md (serve para medir desvio de escopo no fim).
- Deve carregar só as seções do product.md e as ADRs relevantes, e ler o código sob demanda, citando caminhos.
- Deve gerar um **repo map** por script (sem passar pelo modelo): arquivos, classes, funções e assinaturas mais importantes, ordenados pelo grafo de dependências e limitados por orçamento de tokens (referência: [Aider repo map](https://aider.chat/docs/repomap.html)). O mapa é regenerado a cada história, não é revisado nem mantido por pessoas, e serve para o Keel achar onde a história toca antes de abrir arquivos.
- Deve identificar o comportamento existente que a história toca e que não pode mudar.
- Não deve resumir uma fonte e depois trabalhar só com o resumo; relê a fonte original quando precisar.

**Práticas:** contexto com fonte e regra contra invenção (BMAD); leitura sob demanda (Anthropic).

**Portão:** nenhum.

**Saídas:** rascunho de requirements.md com história original e fontes.

## Etapa 3. Escrever e validar os requisitos

**Objetivo:** transformar a história pobre em obrigações explícitas e testáveis.

**Entradas:** rascunho da etapa 2; requirements.md já escrito pelo dev, se houver.

**Comportamentos**
- Deve garantir que cada regra tenha ID estável (`R1`, `R2`) e ao menos um critério de aceite (`AC-1.1`) em Given/When/Then (Gherkin).
- Deve redigir regras no padrão EARS com as palavras-chave em inglês, como no mercado: `WHEN <trigger> THE <system> SHALL <response>` (event-driven), `IF <condition> THEN THE <system> SHALL <response>` (unwanted behavior), `WHILE <state> THE <system> SHALL <response>` (state-driven), `WHERE <feature> THE <system> SHALL <response>` (optional feature) e `THE <system> SHALL <response>` (ubiquitous). O conteúdo entre as palavras-chave fica no idioma do projeto.
- Deve preencher a seção de obrigações explícitas: casos de borda, invariantes (o que nunca pode acontecer), comportamento existente que não muda, erros esperados (ou "nenhum" explícito).
- Deve preencher fora de escopo.
- Deve listar conflitos entre história, product.md, ADRs e código, cada um com as duas fontes.
- Deve marcar o que falta: `[PERGUNTA]` bloqueia, `[SUPOSIÇÃO]` exige aceite do dev. Perguntas uma por vez, com opção recomendada.
- Não deve inventar resultado esperado ("sem THEN, é pergunta").
- Não deve escrever como implementar; isso é design ou task.

**Práticas:** obrigações comportamentais explícitas (estudo de 2026, −47% de falhas); EARS (Mavin); Example Mapping (regras, exemplos, perguntas); clarify do Spec Kit; fora de escopo explícito (Ubl, Osmani).

**Checagem por script:** todas as seções presentes; toda regra com ao menos um AC; nenhum `[PERGUNTA]` aberto antes do portão.

**Portão:** nenhum ainda; segue para a confirmação.

**Saídas:** requirements.md completo.

## Etapa 4. Confirmar o entendimento

**Objetivo:** o dev concorda com o que vai ser construído antes de qualquer código.

**Entradas:** requirements.md completo.

**Comportamentos**
- Deve pedir a um revisor isolado que procure bordas, exemplos e erros faltantes (olhar de teste), sem reescrever o documento.
- Deve apresentar ao dev um resumo curto: objetivo, regras, fora de escopo, suposições e conflitos com a decisão proposta.
- Deve registrar a aprovação no cabeçalho (`confirmado por <dev> em <data>`).
- Não deve avançar com `[PERGUNTA]` aberta ou conflito sem decisão.

**Práticas:** revisor separado do autor (Anthropic, "três amigos" adaptado); Definition of Ready como diretriz, bloqueando só pergunta aberta e dependência externa (Cohn).

**Portão:** **dev aprova o requirements.md.**

**Saídas:** requirements.md confirmado.

## Etapa 5. Design (só no nível "com design")

**Objetivo:** decidir o "como" quando há escolha real.

**Entradas:** requirements.md confirmado, código, ADRs.

**Comportamentos**
- Deve declarar o gatilho que exigiu o design.
- Deve preencher a tabela "Estrutura nova e justificativa": cada interface, camada, mapper/DTO, módulo, helper ou dependência nova ligada a uma heurística (requisito, segunda implementação real, porta externa, fronteira publicada, terceira ocorrência) e com a alternativa mais simples registrada. "Nenhuma" é a resposta esperada na maioria das histórias.
- Quando houver dúvida técnica (escolha de biblioteca, versão, compatibilidade, desempenho), deve pesquisar e registrar na seção "Alternativas consideradas" no formato Decisão / Motivo / Alternativas, com o link da fonte. Não existe arquivo research.md separado.
- Deve trazer abordagem, mapa de código (o que muda, o que reaproveitar, o que não mexer), contratos e dados relevantes, alternativas consideradas, preocupações transversais e riscos.
- Deve dizer se a decisão é candidata a ADR: afeta estrutura, dependência, interface ou técnica de construção e sobrevive à feature.
- Não deve repetir requisitos; cita os IDs.
- Não deve trazer definições completas de código; só a parte relevante.

**Práticas:** mini design doc com não-objetivos e alternativas (Ubl); critério de ADR de Nygard; Decision/Rationale/Alternatives do research.md do Spec Kit, sem o arquivo extra; YAGNI (Fowler); interface só com mais de uma implementação (Seemann); "duplicação é mais barata que a abstração errada" (Metz).

**Portão:** aprovado junto com as tasks, para não criar mais uma parada.

**Saídas:** design.md; rascunho de ADR, se candidata.

## Etapa 6. Planejar as tasks

**Objetivo:** quebrar a história em tasks pequenas, sequenciadas e testáveis.

**Entradas:** requirements.md confirmado, design.md (se houver), código.

**Comportamentos**
- Deve fazer da T1 um esqueleto andante: o caminho mínimo de ponta a ponta.
- Deve fazer as próximas tasks como fatias verticais, uma regra ou variação por vez.
- Deve dar a cada task: `Cobre: R#/AC-#`, arquivos, teste a escrever primeiro (nome e o que verifica), comando de verificação, condição de pronto, dependências e status.
- Deve declarar em cada task os elementos estruturais novos permitidos, e separar tasks de estrutura (preparar o terreno) das tasks de comportamento.
- Deve marcar tasks sem comportamento (configuração, scaffolding, migração simples) como `Sem teste: <motivo>`.
- Deve garantir que cada task caiba num contexto limpo: se precisar de muito contexto além das regras citadas, provavelmente são duas tasks.
- Não deve gerar todos os testes de uma vez antes de implementar.

**Práticas:** walking skeleton (Cockburn); fatias verticais (Lawrence, SPIDR); rastreabilidade por IDs e cobertura (Spec Kit analyze); task focada por sessão (Osmani, Anthropic).

**Checagem por script:** toda regra coberta por ao menos uma task; toda task cobre ao menos uma regra; toda task com comportamento tem teste e comando; dependências sem ciclo.

**Portão:** **dev aprova a sequência de tasks** (e o design, se houver).

**Saídas:** tasks.md aprovado.

## Etapa 7. Implementar cada task em TDD

**Objetivo:** cada task entregue com prova de que o teste falhou antes e passa depois.

**Entradas:** uma task do tasks.md, as regras que ela cita, o design relevante.

**Comportamentos**
- Deve começar cada task em contexto limpo, carregando só o texto da task, as regras citadas e os arquivos indicados.
- **RED:** deve escrever o teste da task e rodá-lo; o teste precisa falhar pelo motivo certo (não por erro de compilação ou import). Registra comando e saída.
- **GREEN:** deve escrever o código mais simples que passa, só no escopo da task, sem estrutura que a task não declarou. Antes de escrever um helper, procura e reutiliza o que já existe.
- Não deve alterar, enfraquecer ou apagar o teste escrito no RED para fazê-lo passar. Se o teste estava errado, para, explica e pede aprovação para mudar.
- **REFACTOR:** deve limpar mantendo tudo verde, com foco em remover: sobras, código morto, duplicação de algo que já existia e abstração que não se paga. Extrai código compartilhado só na terceira ocorrência do mesmo conhecimento. Gera o relatório de métricas da task (linhas, arquivos novos, arquivos fora da task, tipos abstratos novos, dependências novas, complexidade).
- Deve rodar todas as checagens do projeto declaradas no product.md (testes, lint, tipo), cada uma como comando isolado, registrando comando, código de saída e saída relevante.
- Falha causada pela task é corrigida na task; falha fora do escopo é bloqueio reportado.
- Deve registrar em "Notas de implementação" o que aprender e afetar as próximas tasks; se mudar uma regra, segue a regra 8.
- Task sem comportamento pula RED e registra o motivo.

**Práticas:** Canon TDD, um teste por vez (Beck); pedir evidência, não declaração (Anthropic, Willison); reinjetar o plano por task (Liu et al.); regras viradas em checagem com feedback (ContextCov, preprint: 88% de patches limpos contra 67% só com instruções); hooks determinísticos para o que não tem exceção (Anthropic).

**Hooks:** um `PostToolUse` em edições roda a checagem de arquitetura nos arquivos tocados e bloqueia violação nova, devolvendo a mensagem de correção da regra. Um `Stop` roda os comandos de checagem antes de a task ser dada como pronta. Um terceiro, só de aviso, aponta arquivos fora da task ou dependência nova no manifesto. Bloquear edição do teste depois do RED fica para uma versão futura; até lá, o review pega teste alterado.

**Portão:** nenhum dentro do ciclo; segue para o review.

**Saídas:** diff da task; evidência RED e GREEN; checagens registradas.

## Etapa 8. Review isolado da task

**Objetivo:** alguém que não escreveu o código confere a task contra os requisitos.

**Entradas:** diff exato da task, requirements.md (regras citadas), teste da task.

**Comportamentos**
- Deve chamar um revisor isolado, só com leitura (Read, Grep, Glob), que recebe o diff, a task, as regras citadas, a seção de princípios do product.md, o design.md (se houver) e o relatório de métricas.
- O revisor deve procurar bugs concretos, regras não atendidas, teste afrouxado e mudança fora do escopo, e aplicar a rubrica de design do anexo; deve ignorar estilo e reportar no máximo 5 achados.
- Cada achado é BLOQUEIA (só se violar regra `[hook]` ou requisito), REMOVER (preferido) ou SUGERIR. O revisor não propõe abstração nova sem citar a heurística que a justifica.
- Deve corrigir achados relevantes voltando ao GREEN; achados menores podem ser registrados e não corrigidos, com justificativa.
- Sem revisor isolado disponível, registra `review unavailable`; nunca chama a própria revisão de independente.

**Práticas:** revisor com contexto limpo, sem exigir corrigir tudo, porque corrigir todo achado gera "camadas de abstração extras" (Anthropic); Google: revisores "especialmente atentos a overengineering".

**Portão:** nenhum; segue para o commit.

**Saídas:** resultado do review registrado na task.

## Etapa 9. Commit da task

**Objetivo:** um commit por task, com significado e aprovado.

**Entradas:** task revisada, evidência.

**Comportamentos**
- Deve propor um commit que representa a task inteira, com mensagem que cita a história e a regra.
- Deve mostrar ao dev o que entra no commit, a evidência e o resultado do review.
- Deve marcar a task como feita no tasks.md com o hash do commit.
- Não deve commitar sem aprovação, nem misturar duas tasks, nem incluir mudança alheia.

**Portão:** **dev aprova o commit.**

**Saídas:** commit; tasks.md atualizado. Volta à etapa 7 enquanto houver task.

## Etapa 10. Fechar e entregar a história

**Objetivo:** provar que a história está completa e levar o conhecimento durável para o projeto.

**Entradas:** todas as tasks feitas, requirements.md, product.md, ADRs.

**Comportamentos**
- Deve montar a tabela de convergência: para cada `R#`, o teste ou saída que comprova, e a situação (atendida ou falta). A tabela é gerada ou conferida por script.
- Deve listar escolhas de implementação que se afastaram da spec.
- Regra faltante vira task nova, acrescentada ao tasks.md; o Keel não corrige em silêncio.
- Deve comparar o entregue com a história original para apontar desvio de escopo.
- Deve rodar a checagem de arquitetura completa e confirmar que a baseline não cresceu, e que exemplares e regras do product.md ainda valem.
- Se a história mudou o produto, deve propor a mudança no product.md como delta (adicionado, modificado, removido).
- Se o design gerou candidata a ADR que atende o critério de Nygard, deve propor a ADR.
- Deve preparar a descrição do PR com resumo dos requisitos e a evidência por regra.

**Práticas:** convergência com evidência (Spec Kit converge, SatisFix); deltas (OpenSpec); critério de ADR (Nygard, MADR).

**Portão:** **dev aprova os deltas de product.md e ADR**, e abre o PR.

**Saídas:** product.md e ADRs atualizados (se aplicável); PR com evidência.

---

## Portões em resumo

| # | Portão | Etapa | Bloqueia se |
| --- | --- | --- | --- |
| 1 | product.md e ADRs iniciais | 0 | Projeto sem product.md |
| 2 | Nível da história | 1 | Nível não confirmado |
| 3 | requirements.md confirmado | 4 | `[PERGUNTA]` aberta ou conflito sem decisão |
| 4 | tasks.md (e design.md) aprovados | 6 | Regra sem task, task sem teste ou comando |
| 5 | Commit de cada task | 9 | RED sem evidência, checagem falhando, review não feito |
| 6 | Deltas de produto e ADR | 10 | Regra sem evidência na convergência |

## O que o Keel 2 evita

- Gerar código a partir da spec como fonte única (spec-as-source).
- Pacote de muitos artefatos por história (research, data-model, contracts, checklists).
- Gerar todos os testes antes de implementar.
- Fluxo completo para bug pequeno.
- product.md crescendo sem limite.
- Portões e regras só em prosa enfática; o que é mecânico vai para script ou hook.
- Congelar a spec contra aprendizado legítimo; mudança é registrada e reaprovada, não proibida.

## Sequência controlada por script (workflow.json)

A IA não decide qual é o próximo passo. Ela pergunta ao script, e o script responde com base em dois arquivos:

- **`workflow.json`**, dentro do plugin e igual para todo projeto: as fases, a ordem, o que cada fase exige para começar e para terminar, e o que é permitido fazer em cada uma.
- **`state.json`**, por história: em que fase a história está e o que já foi gerado e aprovado.

`keel-state.mjs next` devolve a fase atual, o que falta para sair dela e o arquivo de instruções daquela fase. `keel-state.mjs advance` só muda de fase quando os critérios de saída passam (arquivos válidos pelo validador, aprovações com hash válido, checagens registradas). Se a IA tentar pular etapa, o script recusa com a mensagem do que falta, e o hook `PreToolUse` bloqueia edições que a fase não permite.

A IA continua usando julgamento dentro de cada fase: que regras escrever, como quebrar as tasks e que código fazer. O que é fixo é a ordem e os portões.

```json
{
  "schema": 1,
  "phases": [
    { "id": "triage", "instructions": "phases/triage.md",
      "exit": ["state.level", "approval:level"] },
    { "id": "reading", "instructions": "phases/reading.md",
      "exit": ["file:repo-map"] },
    { "id": "requirements", "instructions": "phases/requirements.md",
      "exit": ["valid:requirements.md", "noOpenQuestions"] },
    { "id": "confirmation", "instructions": "phases/confirmation.md",
      "exit": ["review:requirements", "approval:requirements.md"] },
    { "id": "design", "instructions": "phases/design.md", "skipUnless": "level=com-design",
      "exit": ["valid:design.md"] },
    { "id": "tasks", "instructions": "phases/tasks.md",
      "exit": ["valid:tasks.md", "coverage:rules->tasks->tests", "approval:tasks.md", "approval:design.md?"] },
    { "id": "implementation", "instructions": "phases/implementation.md",
      "allowSourceEdits": true, "loop": "tasks",
      "taskExit": ["evidence:red", "evidence:green", "checks:passed", "review:task", "approval:commit"] },
    { "id": "closing", "instructions": "phases/closing.md",
      "exit": ["convergence:all-rules", "arch:baseline-not-grown", "approval:deltas?"] },
    { "id": "done" }
  ]
}
```

O formato exato dos critérios é definido na parte 2 do desenvolvimento; o exemplo mostra a forma.

## Arquitetura do plugin

```text
keel/                                  # repo novo
├── .claude-plugin/plugin.json         # manifesto
├── .claude-plugin/marketplace.json    # catálogo para instalar
├── skills/
│   ├── setup/SKILL.md                 # etapa 0: product.md, ADRs, architecture.json
│   └── story/
│       ├── SKILL.md                   # entra no fluxo, pergunta ao script o próximo passo
│       └── phases/*.md                # instruções de cada fase, carregadas só quando a fase chega
├── agents/reviewer.md                 # revisor isolado, só leitura (Read, Grep, Glob)
├── hooks/hooks.json                   # PreToolUse, PostToolUse, Stop
├── workflow/workflow.json             # fases e portões
├── templates/                         # requirements, design, tasks, seção de princípios, architecture.json
├── scripts/                           # Node .mjs sem dependências
│   ├── keel-state.mjs                 # next, advance, approve, generated; único que escreve state.json
│   ├── validate-feature.mjs           # estrutura, IDs, EARS, cobertura regra → task → teste, marcadores
│   ├── repo-map.mjs                   # mapa do código com orçamento de tokens
│   ├── task-metrics.mjs               # linhas, arquivos, abstrações e dependências novas, complexidade
│   ├── arch-check.mjs                 # lê architecture.json, chama a ferramenta nativa ou o varredor
│   ├── check-feature.mjs              # conferência de ponta a ponta de uma história
│   └── hooks/*.mjs                    # implementação dos hooks
├── test/                              # node --test dos scripts e hooks
├── evals/                             # casos do claude plugin eval
├── fixtures/node-mini/                # projeto mínimo para casos e ponta a ponta
└── docs/product.md, docs/adrs/        # o próprio Keel usando o fluxo
```

As instruções por fase ficam em arquivos separados para que cada fase carregue só o que precisa, em vez de uma skill enorme sempre no contexto.

## Estratégia de testes

Detalhes e fontes em [Como testar o Keel 2.md](Como%20testar%20o%20Keel%202.md). Regra geral: toda garantia que código consegue dar vai para script ou hook e é testada de graça; o modelo só é testado no que só ele pode errar.

| Camada | O que cobre | Ferramenta | Quando | Custo |
| --- | --- | --- | --- | --- |
| 0. Scripts e hooks | Validador, estado e hash, repo map, métricas, arquitetura, hooks bloqueando o que devem | `node --test` | Todo commit, local e CI | US$ 0 |
| 1. Acionamento | ~14 frases em português: 8 devem acionar o Keel, 6 não | `claude plugin eval`, grader `tool_used` | Mudança de skill e release | ~US$ 1 |
| 2. Uma ou duas por etapa | 12 a 15 casos na fixture com armadilhas plantadas; graders `regex` e `file_exists` sobre os arquivos gerados; até 3 juízes consultivos | `claude plugin eval` | Caso da etapa mudada (1 run, depois 3) | ~US$ 5 por rodada |
| 3. Ponta a ponta e piloto | 2 histórias na fixture conduzidas numa sessão nova + `check-feature.mjs`; piloto numa história real | Sessão + script | Release | ~US$ 11 |

- **Release:** cerca de US$ 26, teto de US$ 35 com `--max-cost-usd`.
- **Um caso novo só nasce de falha real**, e antes se pergunta se um script ou hook resolve. Regressão limitada a 20 casos.
- **Resultados fora do repo** (`results/` no .gitignore); cada rodada vira uma linha nas notas: data, commit, modelo, versão do Claude Code, casos passados e custo.
- **Não há** qualificação por hash, matriz de hosts, juiz com vários critérios nem runner próprio.
- **Primeiro caso a escrever:** confirmar que os hooks do plugin disparam dentro do `claude plugin eval`.
- Os testes da camada 0 precisam passar no Windows desde o primeiro dia.

## Plano de desenvolvimento

Cada parte é desenvolvida com TDD e, desde a parte 1, usando o próprio fluxo do Keel à mão (product.md, requirements, tasks).

| # | Parte | Entrega | Pronto quando |
| --- | --- | --- | --- |
| 1 | Base | Repo, manifesto, product.md e ADRs do Keel, modelos, `workflow.json` inicial, CI com `node --test` | `claude plugin validate` passa; CI verde |
| 2 | Validação e estado | `validate-feature.mjs`, `keel-state.mjs` (next, advance, approve, hash), hook que bloqueia escrita em `state.json` e código fora da fase | Camada 0 cobre transições válidas e inválidas e aprovação vencida |
| 3 | Fluxo, parte 1 | Skill `story` com triagem, leitura e `repo-map.mjs`, requisitos e confirmação | Casos de acionamento e das etapas 1 a 4 passam |
| 4 | Fluxo, parte 2 | Design condicional e tasks com cobertura | Casos das etapas 5 e 6 passam |
| 5 | Fluxo, parte 3 | Loop da task em TDD, `task-metrics.mjs`, agente revisor com a rubrica, proposta de commit, hook `Stop` | Casos das etapas 7 a 9 passam, incluindo comando negado e commit sem aprovação |
| 6 | Fechamento | Convergência, deltas, descrição do PR, `check-feature.mjs` | Primeira história de ponta a ponta passa na fixture |
| 7 | Princípios | Skill `setup`, seção de princípios, `architecture.json`, `arch-check.mjs`, hook `PostToolUse` | Violação plantada é barrada em pelo menos duas linguagens |
| 8 | Agente de documentação | Plugin separado que ajuda a escrever product.md, ADRs, requirements e design | Usado para escrever uma história real |
| — | Release | Segunda história ponta a ponta e piloto no my-duo-finance | Registro de uma linha da rodada |

## Pendências antes de começar

- [ ] Criar o repo novo e adicionar ao projeto.
- [ ] product.md e ADRs ficam em `docs/` ou vão para `keel/`?
- [ ] Confirmar `workflow.json` (sequência por script) e a estratégia de testes.

## Decisões tomadas

| Decisão | Escolha | Data |
| --- | --- | --- |
| Arquivos por história | requirements.md sempre; design.md só com gatilho; tasks.md | 2026-11-20 |
| Pasta | `keel/features/<CHAVE>-<descricao>/` | 2026-11-20 |
| Versionamento | requirements.md, design.md e tasks.md versionados | 2026-11-20 |
| research.md | Não existe; pesquisa entra nas alternativas do design.md | 2026-11-20 |
| Princípios de design | Seção no product.md, rubrica de review, testes de arquitetura e hooks | 2026-11-20 |
| EARS e critérios | Palavras-chave em inglês (WHEN/IF/THEN/WHILE/WHERE ... SHALL) e Given/When/Then; IDs R# e AC-#.# | 2026-11-18 |
| TDD | Obrigatório por task: RED, GREEN, REFACTOR | 2026-11-18 |
| Hook que protege o teste do RED | Versão futura; o review cobre na versão 1 | 2026-11-20 |
| Estado da história | `state.json` por história, escrito só por script, aprovações presas a hash | 2026-11-20 |
| Sequência do fluxo | `workflow.json` no plugin; a IA pergunta o próximo passo ao script em vez de decidir (recomendado, a confirmar) | 2026-11-20 |
| Testes | Quatro camadas enxutas, sem qualificação por hash nem resultados no repo (recomendado, a confirmar) | 2026-11-20 |
| Hosts | Só Claude Code; Codex adiado | 2026-11-18 |
| Repo | Repo novo, do zero, com o nome Keel; keel-dev depreciado, sem tag rc.1 | 2026-11-18 |

---

## Anexo: modelos

### requirements.md

```markdown
# <CHAVE> — <título curto>

Fonte: <link da história> · Pasta: keel/features/<CHAVE>-<descricao>/ · Nível: trivial | padrão | com design
Status: rascunho | confirmado por <dev> em <AAAA-MM-DD>

## História original
> Texto da história copiado sem edição.

## Objetivo
Para quem, o que muda e por quê, em até três frases. [fonte: ...]

## Fora de escopo
- <o que esta história não faz, mesmo parecendo próximo>

## Regras e critérios de aceite
R1. WHEN <gatilho> THE <sistema> SHALL <resposta>. [fonte: ...]
  - AC-1.1 GIVEN <estado> WHEN <ação> THEN <resultado observável>.
R2. IF <condição indesejada> THEN THE <sistema> SHALL <resposta>. [fonte: ...]
  - AC-2.1 GIVEN ... WHEN ... THEN ...
R3. WHILE <estado> THE <sistema> SHALL <resposta>. [fonte: ...]

## Obrigações explícitas
- Casos de borda: <...>
- Invariantes (nunca pode acontecer): <...>
- Comportamento existente que não pode mudar: <...> [fonte: <arquivo>]
- Erros e respostas esperadas: <ou "nenhum além de R2">

## Perguntas e suposições
- [PERGUNTA] <pergunta> — opção recomendada: <...>
- [SUPOSIÇÃO] <suposição> — aceita por <dev> em <data>.

## Conflitos encontrados
- <fonte A x fonte B, decisão tomada>

## Mudanças após a confirmação
- <AAAA-MM-DD> <o que mudou, por quê, quem reaprovou>
```

### design.md

```markdown
# Design — <CHAVE>

Requisitos: requirements.md · Status: rascunho | aprovado por <dev> em <data>
Gatilho: <trade-off | contrato | dados/migração | dependência nova | transversal | quebra de padrão>

## Abordagem
Um parágrafo; cite as regras atendidas (R1, R2).

## Mapa de código
| Caminho | O que muda | Reaproveita / não mexer |
|---|---|---|

## Contratos e dados
Só a parte relevante.

## Estrutura nova e justificativa
| Elemento | Tipo (interface, camada, mapper/DTO, módulo, helper, dependência) | Justificativa (R#, 2ª implementação, porta externa, fronteira publicada, 3ª ocorrência) | Alternativa mais simples e por que não |
|---|---|---|---|

## Alternativas consideradas
Para cada dúvida técnica: Decisão / Motivo / Alternativas, com o link da fonte.
| Opção | A favor | Contra | Por que não |
|---|---|---|---|

## Preocupações transversais
Segurança: <ou "não se aplica"> · Privacidade: · Desempenho: · Observabilidade: · Migração/rollback:

## Riscos e quebras de padrão
- <risco, mitigação>

## Candidata a ADR?
Sim | Não — <motivo>
```

### tasks.md

```markdown
# Tasks — <CHAVE>

Requisitos: requirements.md · Design: design.md | não há
Aprovado por <dev> em <data>

## T1 — Esqueleto andante: <caminho mínimo de ponta a ponta>
Cobre: R1 (AC-1.1)
Arquivos: <caminhos>
Teste primeiro: <nome do teste> — <o que verifica>
Verificação: `<comando>`
Pronto quando: <condição observável>
Depende de: —
Status: pendente | red | green | em revisão | feita (<hash>)
Evidência RED: <comando e trecho da falha>
Evidência GREEN: <comando e resultado>
Review: <ok | achados e o que foi feito | review unavailable>

## T2 — <uma regra ou variação por vez>
Cobre: R2 (AC-2.1)
...

## T3 — <task sem comportamento>
Cobre: R1
Sem teste: <motivo>
...

## Notas de implementação
- <aprendizado que vale para as próximas tasks>

## Convergência (preenchida no fim, conferida por script)
| Regra | Evidência | Situação |
|---|---|---|
| R1 | <teste> | atendida |
```

### Seção "Princípios de engenharia" do product.md

```markdown
## Princípios de engenharia

Valem para código novo ou alterado. [hook] é checado automaticamente; [review] entra na
rubrica de design. Se uma regra daqui contradiz o código existente, aponte o conflito e
pergunte antes de escolher, exceto nos caminhos listados em "Não copiar".

1. Regra de negócio (validação de domínio, cálculo, decisão) não fica em handler HTTP,
   componente de UI, consulta SQL ou configuração de ORM. [review]
2. Código em pastas de domínio não importa framework web, driver de banco, cliente de rede,
   sistema de arquivos nem relógio do sistema; recebe isso por parâmetro ou porta. [hook]
3. Sem ciclos entre módulos de primeiro nível. [hook]
4. Cada módulo fica no degrau declarado abaixo. Subir de degrau exige design.md e ADR. [review]
5. Interface ou porta só com duas implementações reais (o fake usado em teste conta),
   fronteira com sistema externo ou fronteira publicada. Nunca espelho de uma classe. [review]
6. Mapper ou DTO só onde os formatos diferem de fato (contrato externo, esquema de
   persistência) ou a fronteira precisa ficar estável. Cópia campo a campo não entra. [review]
7. Antes de escrever um helper, procure e reutilize o existente. Extraia código novo
   compartilhado só na terceira ocorrência do mesmo conhecimento, nunca com flag de modo. [review]
8. Nada para requisito hipotético: parâmetro, opção, ponto de extensão ou genérico só se
   um requisito ou teste atual o usa. [review]
9. Erros explícitos: valide nas fronteiras; sem catch amplo, fallback silencioso ou
   tratamento de cenário impossível. [review]
10. Complexidade cognitiva por função até 15 [hook]; refatoração e mudança de comportamento
    em commits separados. [review]

### Degraus por módulo
| Módulo | Degrau | Motivo |
|---|---|---|
| <src/cadastro> | 1 — script de transação | CRUD sem invariantes entre campos |
| <src/cobranca> | 3 — modelo de domínio | core: regras mudam com frequência |
| <autenticação> | genérico — <biblioteca> | não diferencia o produto |

Degraus: 1 script de transação; 2 funções de domínio puras separadas do I/O; 3 modelo de
domínio (entidades com comportamento, agregados, repositório por raiz); genérico (biblioteca
pronta); organizacional (vários deployables, só com muitos times).

### Exemplares e o que não copiar
Siga: <caminho> (<por quê>). Não copie: <caminho/**> (<por quê>).

### Checagem
Arquitetura: `<comando>` · Lint/complexidade: `<comando>` · Testes: `<comando>`
```

### Rubrica de review de design

```markdown
Revise apenas design. Ignore estilo e formatação. Responda cada item com sim/não e a
evidência (arquivo:linha). Reporte no máximo 5 achados, do mais grave ao menos grave.

1. Regra de negócio fora do lugar: alguma decisão de domínio ficou em handler, UI ou SQL?
2. Estrutura sem justificativa: cada interface, camada, mapper/DTO, módulo ou helper novo
   aparece na tabela do design.md ou atende à regra 5, 6 ou 7? Se não, proponha remover.
3. Reuso: existe no repositório helper, componente ou padrão que foi duplicado?
4. Escopo e sobra: arquivos fora da task, código morto, primeira tentativa deixada,
   prints, testes para casos impossíveis?
5. Erros: catch amplo, fallback silencioso ou validação longe da fronteira?
6. Degrau: o módulo continua no degrau declarado?
7. Legibilidade: função longa, muito aninhada ou com nomes que não são os do domínio?

Classifique cada achado como BLOQUEIA (só se violar regra [hook] ou requisito),
REMOVER (preferido) ou SUGERIR. Não proponha nova abstração sem citar a heurística
que a justifica.
```

### keel/architecture.json

```json
{
  "components": {
    "dominio": ["src/cobranca/dominio/**"],
    "aplicacao": ["src/cobranca/aplicacao/**"],
    "infra": ["src/cobranca/infra/**", "src/cobranca/web/**"]
  },
  "rules": [
    {
      "name": "dominio-nao-depende-de-fora",
      "from": "dominio",
      "forbid": ["aplicacao", "infra", "external:web", "external:db", "external:http"],
      "fix": "Declare uma porta no domínio e implemente-a em infra; passe-a por parâmetro."
    }
  ],
  "noCycles": ["src/*"],
  "baseline": "keel/arch-baseline.txt"
}
```

O Keel traduz esse arquivo para a ferramenta nativa (ArchUnit, Konsist, NetArchTest/ArchUnitNET, dependency-cruiser ou eslint-plugin-boundaries, import-linter, go-arch-lint). Sem ferramenta para a linguagem, usa um varredor de imports próprio, marcado como aproximado. Uma regra que casa com zero arquivos falha, para evitar passe vazio.

### state.json

```json
{
  "schema": 1,
  "story": {
    "key": "STUD-142",
    "title": "Login com Google",
    "source": "https://<jira>/browse/STUD-142",
    "folder": "keel/features/STUD-142-login-google",
    "branch": "feat/STUD-142-login-google"
  },
  "level": "padrao",
  "phase": "confirmation",
  "steps": {
    "triage":       { "done": true,  "confirmedBy": "Miguel", "at": "2026-11-20T11:30:00Z" },
    "requirements": { "generated": true,  "openQuestions": 0, "approved": false, "approvedBy": null, "approvedAt": null, "hash": null },
    "design":       { "required": false, "generated": false, "approved": false, "approvedBy": null, "approvedAt": null, "hash": null },
    "tasks":        { "generated": false, "approved": false, "approvedBy": null, "approvedAt": null, "hash": null },
    "implementation": { "currentTask": null, "blocked": null },
    "closing":      { "convergence": false, "deltasApproved": false, "pullRequest": null }
  },
  "updatedAt": "2026-11-20T11:42:00Z"
}
```

Valores de `level`: `trivial`, `padrao`, `com-design`. `blocked` traz o motivo quando a história está parada (pergunta aberta, checagem fora do escopo, decisão pendente).
