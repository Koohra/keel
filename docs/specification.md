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

1. **Fonte em todo fato.** Cada afirmação sobre o produto, uma decisão ou o código cita a origem (`product.md#seção`, `ADR-NNN`, `arquivo:linha`, `Jira`, `dev em AAAA-MM-DD`). Sem fonte, vira `[QUESTION]` ou `[ASSUMPTION]`.
2. **Nada inventado.** Se uma categoria não tem informação, o Keel escreve "sem orientação encontrada". Se o resultado esperado de um exemplo não é conhecido, é uma pergunta, não um critério.
3. **Evidência honesta.** Checagem que não rodou é `skipped`, nunca `passed`. Falha, waiver e indisponibilidade aparecem como o que são. "Todos os testes passam" sem comando e saída não conta.
4. **Escopo é contrato.** O Keel só toca o que a etapa e a task autorizam, termina o que foi pedido e não propõe trabalho extra. Trabalho fora do escopo é bloqueio reportado ou uma linha em "Implementation notes", não correção silenciosa nem oferta. O `review task` e o `approve commit` recusam arquivo fora do `Files:` da task, para que o dev não seja chamado a aprovar um commit que não pode acontecer.
5. **Decisão consequente é do dev.** Mudança de contrato externo, modelo de dados, dependência, garantia de consistência ou custo operacional para o fluxo até o dev escolher. O Keel apresenta opções, consequências e recomendação, em linguagem simples: cada opção começa pelo que muda para o produto ou para o usuário, com as palavras do glossário, e o termo técnico só aparece entre parênteses.
6. **Perguntas uma por vez**, cada uma com a opção recomendada, no máximo cerca de cinco por documento.
7. **Contexto mínimo.** Cada etapa carrega só as seções relevantes do product.md, as ADRs citadas e o código sob demanda. Nada de carregar a spec inteira em cada task.
8. **Mudança de entendimento é registrada.** O que muda depois de uma aprovação vai para a seção "Changes after confirmation" do requirements.md, com data, motivo e nova aprovação do dev. Nunca vai direto para o código.
9. **Checagem mecânica é script, não prosa.** Estrutura, IDs, cobertura e marcadores são verificados por script; o modelo não atesta isso sozinho.
10. **Responde no idioma do dev.**

## Arquivos

| Arquivo | Nível | Quem escreve | Versionado |
| --- | --- | --- | --- |
| `keel/product.md` | Projeto | Dev, opcionalmente com o agente de documentação | Sim |
| `keel/adrs/ADR-NNN-*.md` | Projeto, decisões que afetam o projeto inteiro | Dev | Sim |
| `keel/features/<KEY>-<slug>/requirements.md` | História, sempre | Dev, opcionalmente com o agente; o Keel completa obrigações, perguntas e conflitos | Sim |
| `keel/features/<KEY>-<slug>/design.md` | História, só com gatilho de design | Dev ou Keel, aprovado pelo dev | Sim |
| `keel/features/<KEY>-<slug>/tasks.md` | História | Keel, aprovado pelo dev | Sim |
| `keel/features/<KEY>-<slug>/state.json` | História, estado do fluxo lido pela IA | Só o script de estado do Keel, nunca à mão nem pelo modelo | Sim |
| `keel/architecture.json` | Projeto, regras de arquitetura em formato neutro | Keel, aprovado pelo dev | Sim |

`<KEY>` é o código da história no Jira ou ferramenta parecida, e `<slug>` é um slug curto (exemplo: `keel/features/STUD-142-login-google/`). Os arquivos da história são versionados junto com o código, então o PR mostra o que foi combinado, o plano e a evidência.

### Estado da história (state.json)

O `state.json` diz à IA em que etapa a história está e o que já foi gerado e aprovado. O Keel lê esse arquivo no início de toda interação, inclusive ao retomar uma história em outra sessão, e só avança de etapa se o estado permitir. Por isso a saída de requirements, confirmation, tasks e implementation, e cada task, terminam sugerindo uma conversa nova: retomar a mesma conversa fica mais caro a cada resposta (na segunda história de ponta a ponta, de US$ 0,05 para US$ 2 por resposta curta).

- **Quem escreve:** só o script de estado (`keel-state.mjs`), chamado pela skill com comandos como `next`, `advance` ou `approve requirements.md --by <dev>`. O modelo não edita o JSON diretamente.
- **Aprovação presa ao conteúdo:** ao aprovar um documento, o script grava o hash dele. Se o arquivo mudar depois, a aprovação vence e a história volta para a confirmação daquele documento.
- **Uma fonte de verdade por assunto:** o state.json guarda fase, portões e a task atual. O status de cada task continua no tasks.md, na seção "Progress", fora do bloco congelado, e o script confere que os dois batem.
- **Garantia por hook:** um `PreToolUse` lê o state.json e bloqueia edição de código-fonte enquanto a história não chegou na fase de implementação, e bloqueia escrita no state.json por edição ou por comando de terminal. Isso garante "nenhum código antes da aprovação".
- **Fases:** `triage` → `reading` → `requirements` → `confirmation` → `design` (pulada se não houver gatilho) → `tasks` → `implementation` → `closing` → `done`.

Orçamento de tamanho: product.md até cerca de 200 linhas, requirements.md até cerca de 1 página, design.md até cerca de 2 páginas. Seção sem conteúdo diz "not applicable" em uma linha e não é removida, para o script achar a estrutura.

---

## Etapa 0. Preparar o projeto (uma vez por projeto)

**Objetivo:** ter o contexto durável do projeto antes da primeira história.

**Entradas:** repositório novo ou existente; documentação existente, se houver.

**Comportamentos**
- Deve verificar se `keel/product.md` e `keel/adrs/` existem e estão dentro do orçamento de tamanho.
- Deve, se houver documentação antiga, propor a migração para product.md e ADRs com uma linha de destino ou descarte para cada fonte (agente de documentação).
- Deve registrar no product.md a seção "Engineering principles" (no máximo 10 regras, cada uma marcada `[hook]` ou `[review]`), o degrau de arquitetura de cada módulo, os exemplares a seguir, o que não copiar e os comandos de checagem do projeto (teste, lint com complexidade, arquitetura). O modelo está no anexo.
- Deve propor testes de arquitetura na ferramenta nativa da linguagem (ArchUnit, Konsist, NetArchTest/ArchUnitNET, dependency-cruiser, import-linter, go-arch-lint), a partir de `keel/architecture.json`. Instala só com autorização explícita e prova que cada regra falha contra uma violação plantada antes de removê-la. Em código existente, gera uma baseline para que só violações novas falhem.
- Não deve tornar Clean Architecture ou DDD o padrão: a regra estrutural universal é a direção das dependências; o resto segue o degrau declarado por módulo.
- Não deve copiar para o product.md o que o código já diz.
- Não deve começar uma história sem product.md; sem ele, oferece criar.

**AGENTS.md e CLAUDE.md do projeto** (Miguel, 2026-11-20; base em `AGENTS.md e CLAUDE.md no Keel.md`)
- O Keel funciona sem tocar nesses arquivos. As instruções dele ficam na skill, nos hooks e num `SessionStart` curto (até 1.500 caracteres: história ativa, fase, o que falta, skill a usar e precedência), nunca no arquivo do dev.
- Deve sempre revisar sem alterar (`keel-context.mjs review`): conflito com o fluxo com arquivo, linha e citação conferida por script (`conflict`), comando morto (`dead-command`), tamanho acima de ~150 linhas (`size`), visibilidade (`visibility`), blocos de outras ferramentas (`other-tool`), outros agentes no repositório (`other-agents`) e deriva do bloco do Keel (`keel-block`). Também sugere estrutura, sem alterar: nenhum comando de teste, build ou lint (`commands`), seções do modelo que faltam no arquivo principal (`sections`, que oferece a reestruturação com 3 ou mais), 5 ou mais palavras de ênfase em maiúsculas (`emphasis`) e 40 ou mais itens de lista (`rules`). A skill acrescenta a visão geral que repete o README e o `/doctor prompt-audit`. Severidades: `conflict`, `warning`, `info`. Para cada conflito o dev escolhe mudar o arquivo, valer só fora das histórias ou manter sabendo que o hook bloqueia.
- Visibilidade: só AGENTS.md está certo e o Keel nunca cria CLAUDE.md nesse caso; com os dois, o CLAUDE.md precisa de `@AGENTS.md` (o Keel avisa e só aplica com aprovação); symlink gera aviso de carga dupla.
- Sem AGENTS.md, oferece `templates/agents.md`, que o dev preenche. Com AGENTS.md, pode propor no próprio setup uma reestruturação nas seções do modelo que só move e remove linhas (`restructure-check` confere) e só aplica com aprovação.
- Bloco do Keel opcional, padrão "não", num arquivo só, até 6 linhas entre `<!-- keel:start -->` e `<!-- keel:end -->`, no idioma do arquivo; nada fora dele muda e `keel-context.mjs check` confere a deriva.
- Precedência: durante uma história ativa, ordem do fluxo e portões vêm do Keel e são garantidos por hook; comandos, estilo e convenções vêm do AGENTS.md ou CLAUDE.md.
- `arch-check.mjs` é o varredor próprio (JS/TS e Python, aproximado); o hook `PostToolUse` devolve ao modelo a violação nova do arquivo editado e a deriva do bloco.

**Práticas:** product.md curto e sempre relevante (Anthropic, Radar Spec Kit); ADR no formato Nygard (`## Status`, `## Context`, `## Decision`, `## Consequences`) com a seção `## Confirmation` (MADR); regra de dependência (Martin, Cockburn, Fowler); arquitetura proporcional à complexidade (Fowler PoEAA, Evans, Vernon); testes de arquitetura como fitness functions com mensagem de correção e baseline (ArchUnit, import-linter); restrição arquitetural obrigatória reduz sucesso funcional (Constraint Decay, preprint).

**Portão:** dev aprova product.md e as ADRs iniciais.

**Saídas:** `keel/product.md`, `keel/adrs/`.

## Etapa 1. Triagem da história

**Objetivo:** dosar a cerimônia pelo tamanho e risco.

**Entradas:** história (Jira ou outra ferramenta, já refinada ou não), branch criada pelo dev.

**Comportamentos**
- Deve classificar a história em um de três níveis, mostrando o motivo:
  - **trivial**: uma regra, poucos arquivos, sem gatilho de design. Só tasks.md, com critérios na própria task.
  - **standard**: requirements.md e tasks.md.
  - **with-design**: requirements.md, design.md e tasks.md.
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
- Deve marcar o que falta: `[QUESTION]` bloqueia, `[ASSUMPTION]` exige aceite do dev. Perguntas uma por vez, com opção recomendada.
- Não deve inventar resultado esperado ("sem THEN, é pergunta").
- Não deve escrever como implementar; isso é design ou task.

**Práticas:** obrigações comportamentais explícitas (estudo de 2026, −47% de falhas); EARS (Mavin); Example Mapping (regras, exemplos, perguntas); clarify do Spec Kit; fora de escopo explícito (Ubl, Osmani).

**Checagem por script:** todas as seções presentes; toda regra com ao menos um AC; nenhum `[QUESTION]` aberto antes do portão.

**Portão:** nenhum ainda; segue para a confirmação.

**Saídas:** requirements.md completo.

## Etapa 4. Confirmar o entendimento

**Objetivo:** o dev concorda com o que vai ser construído antes de qualquer código.

**Entradas:** requirements.md completo.

**Comportamentos**
- Deve pedir a um revisor isolado que procure bordas, exemplos e erros faltantes (olhar de teste), sem reescrever o documento.
- Deve apresentar ao dev um resumo curto: objetivo, regras, fora de escopo, suposições e conflitos com a decisão proposta.
- Deve registrar a aprovação no cabeçalho (`confirmed by <dev> on <YYYY-MM-DD>`).
- Não deve avançar com `[QUESTION]` aberta ou conflito sem decisão.

**Práticas:** revisor separado do autor (Anthropic, "três amigos" adaptado); Definition of Ready como diretriz, bloqueando só pergunta aberta e dependência externa (Cohn).

**Portão:** **dev aprova o requirements.md.**

**Saídas:** requirements.md confirmado.

## Etapa 5. Design (só no nível `with-design`)

**Objetivo:** decidir o "como" quando há escolha real.

**Entradas:** requirements.md confirmado, código, ADRs.

**Comportamentos**
- Deve declarar o gatilho que exigiu o design (linha `Trigger:`).
- Deve preencher a tabela "New structure and rationale": cada interface, camada, mapper/DTO, módulo, helper ou dependência nova ligada a uma heurística (requisito, segunda implementação real, porta externa, fronteira publicada, terceira ocorrência) e com a alternativa mais simples registrada. "Nenhuma" é a resposta esperada na maioria das histórias.
- Quando houver dúvida técnica (escolha de biblioteca, versão, compatibilidade, desempenho), deve pesquisar e registrar na seção "Alternatives considered" no formato Decisão / Motivo / Alternativas, com o link da fonte. Não existe arquivo research.md separado.
- Deve trazer abordagem, mapa de código (o que muda, o que reaproveitar, o que não mexer), contratos e dados relevantes, alternativas consideradas, preocupações transversais e riscos.
- Deve dizer se a decisão é candidata a ADR: afeta estrutura, dependência, interface ou técnica de construção e sobrevive à feature.
- Não deve repetir requisitos; cita os IDs.
- Não deve trazer definições completas de código; só a parte relevante.

**Práticas:** mini design doc com não-objetivos e alternativas (Ubl); critério de ADR de Nygard; Decision/Rationale/Alternatives do research.md do Spec Kit, sem o arquivo extra; YAGNI (Fowler); interface só com mais de uma implementação (Seemann); "duplicação é mais barata que a abstração errada" (Metz).

**Portão:** aprovado junto com as tasks, para não criar mais uma parada.

**Saídas:** design.md; rascunho de ADR em `adr-draft.md` na pasta da história, se candidata (a ADR em `keel/adrs/` nasce no fechamento).

## Etapa 6. Planejar as tasks

**Objetivo:** quebrar a história em tasks pequenas, sequenciadas e testáveis.

**Entradas:** requirements.md confirmado, design.md (se houver), código.

**Comportamentos**
- Deve fazer da T1 um esqueleto andante: o caminho mínimo de ponta a ponta.
- Deve fazer as próximas tasks como fatias verticais, uma regra ou variação por vez.
- Deve dar a cada task: `Covers: R#/AC-#`, `Files:`, `Test first:` (nome e o que verifica), `Verification:` (comando), `Done when:`, `Depends on:` e status em "Progress".
- Deve declarar em cada task os elementos estruturais novos permitidos, e separar tasks de estrutura (preparar o terreno) das tasks de comportamento.
- Deve marcar tasks sem comportamento (configuração, scaffolding, migração simples) como `No test: <reason>`.
- Regra que uma task anterior já entregou vira task de regressão (`Regression: delivered by T<n>`), com `Test first:` como qualquer outra.
- Deve garantir que cada task caiba num contexto limpo: se precisar de muito contexto além das regras citadas, provavelmente são duas tasks.
- Não deve gerar todos os testes de uma vez antes de implementar.

**Práticas:** walking skeleton (Cockburn); fatias verticais (Lawrence, SPIDR); rastreabilidade por IDs e cobertura (Spec Kit analyze); fase e task focadas por sessão (Osmani, Anthropic).

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
- GREEN ou checagem que falha entra na depuração (`phases/debugging.md`): reproduzir, isolar, uma hipótese escrita, uma mudança por vez, sem tocar no teste do RED. O script conta as tentativas falhas da task e, na terceira, recusa `evidence green` e `checks` sem rodar até o `block --reason` com a causa provável, as hipóteses testadas e a pergunta ao dev; o `block` zera a contagem.
- Deve registrar em "Implementation notes" o que aprender e afetar as próximas tasks; se mudar uma regra, segue a regra 8.
- Task sem comportamento pula RED e registra o motivo.
- Task de regressão (`Regression: delivered by T<n>`) prova o RED sabotando o código entregue (mudança fora do `Files:` da task); o GREEN só vale com a sabotagem desfeita (Seemann, Feathers).

**Práticas:** Canon TDD, um teste por vez (Beck); depuração sistemática com parada na terceira tentativa ([Superpowers](https://claude.com/plugins/superpowers), systematic-debugging); pedir evidência, não declaração (Anthropic, Willison); reinjetar o plano por task (Liu et al.); regras viradas em checagem com feedback (ContextCov, preprint: 88% de patches limpos contra 67% só com instruções); hooks determinísticos para o que não tem exceção (Anthropic).

**Hooks:** um `PostToolUse` em edições roda a checagem de arquitetura nos arquivos tocados e bloqueia violação nova, devolvendo a mensagem de correção da regra. Um `Stop` roda os comandos de checagem antes de a task ser dada como pronta. Um terceiro, só de aviso, aponta arquivos fora da task ou dependência nova no manifesto. Bloquear edição do teste depois do RED fica para uma versão futura; até lá, o review pega teste alterado.

**Portão:** nenhum dentro do ciclo; segue para o review.

**Saídas:** diff da task; evidência RED e GREEN; checagens registradas.

## Etapa 8. Review isolado da task

**Objetivo:** alguém que não escreveu o código confere a task contra os requisitos.

**Entradas:** diff exato da task, requirements.md (regras citadas), teste da task.

**Comportamentos**
- Deve chamar um revisor isolado, só com leitura (Read, Grep, Glob), que recebe o diff, a task, as regras citadas, a seção de princípios do product.md, o design.md (se houver) e o relatório de métricas.
- O revisor deve procurar bugs concretos, regras não atendidas, teste afrouxado e mudança fora do escopo, e aplicar a rubrica de design do anexo; deve ignorar estilo e reportar no máximo 5 achados.
- Quando o design.md pede (`Trigger: contract`; `Trigger: data/migration` ou "Migration/rollback" preenchido; "Security" preenchido), o `next` lista em `task.checklists` os checklists de contrato, dados ou segurança (`skills/story/checklists/`, até 5 itens cada), e o revisor responde cada item com sim ou não e evidência ([Spec Kit](https://www.mintlify.com/github/spec-kit/commands/overview), `/speckit.checklist`).
- Cada achado é conferido no código antes de mexer; achado que não se confirma ou contraria o product.md, uma ADR ou o requisito recebe discordância com a fonte; nunca se afrouxa o teste para atender um achado. O destino de cada achado (corrigido, removido, mantido com a fonte) vai em `Review:` no "Progress", e o `approve commit` recusa review `findings` sem esse destino (Superpowers, receiving-code-review).
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
- Deve mostrar ao dev, no próprio texto da resposta, o que entra no commit (`git diff --stat` e o diff), a evidência e o resultado do review; saída de ferramenta e referência a "acima" não contam.
- Deve marcar a task como feita no tasks.md com o hash do commit e commitar essa marca à parte, só a pasta da história (`<KEY> T<n>: done (<hash>)`), para a árvore ficar limpa entre tasks.
- Não deve commitar sem aprovação, nem misturar duas tasks, nem incluir mudança alheia.

**Portão:** **dev aprova o commit.**

**Saídas:** commit; tasks.md atualizado. Volta à etapa 7 enquanto houver task.

## Etapa 10. Fechar e entregar a história

**Objetivo:** provar que a história está completa e levar o conhecimento durável para o projeto.

**Entradas:** todas as tasks feitas, requirements.md, product.md, ADRs.

**Comportamentos**
- Deve montar a tabela de convergência: para cada `R#`, o teste ou saída que comprova, e a situação (`met` ou falta). A tabela é gerada ou conferida por script.
- Deve listar escolhas de implementação que se afastaram da spec.
- Regra faltante vira task nova, acrescentada ao tasks.md; o Keel não corrige em silêncio.
- Deve comparar o entregue com a história original para apontar desvio de escopo.
- Deve rodar a checagem de arquitetura completa e confirmar que a baseline não cresceu, e que exemplares e regras do product.md ainda valem. Sem `keel/architecture.json`, só passa com a dispensa `Architecture: não se aplica` no "### Checks" do product.md.
- Se a história mudou o produto, deve editar o product.md direto; o script mostra o delta por seção (adicionado, modificado, removido) contra a base da história.
- Se o design gerou candidata a ADR que atende o critério de Nygard, deve propor a ADR, escrita em `keel/adrs/` a partir do `adr-draft.md` da pasta da história.
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
| 3 | requirements.md confirmado | 4 | `[QUESTION]` aberta ou conflito sem decisão |
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
      "exit": ["approval:level"] },
    { "id": "reading", "instructions": "phases/reading.md",
      "exit": ["generated:repo-map"] },
    { "id": "requirements", "instructions": "phases/requirements.md", "skipUnless": "level=standard,with-design",
      "exit": ["valid:requirements.md", "noOpenQuestions"] },
    { "id": "confirmation", "instructions": "phases/confirmation.md", "skipUnless": "level=standard,with-design",
      "exit": ["review:requirements", "approval:requirements.md"] },
    { "id": "design", "instructions": "phases/design.md", "skipUnless": "level=with-design",
      "exit": ["valid:design.md"] },
    { "id": "tasks", "instructions": "phases/tasks.md",
      "exit": ["valid:tasks.md", "coverage:rules->tasks->tests", "approval:tasks.md", "approval:design.md?"] },
    { "id": "implementation", "instructions": "phases/implementation.md",
      "allowSourceEdits": true, "loop": "tasks",
      "exit": ["tasks:all-done"],
      "taskExit": ["evidence:red", "evidence:green", "checks:passed", "review:task", "approval:commit"] },
    { "id": "closing", "instructions": "phases/closing.md",
      "exit": ["convergence:all-rules", "arch:baseline-not-grown", "approval:deltas?"] },
    { "id": "done" }
  ]
}
```

Cada critério tem o formato `<tipo>[:<alvo>][?]`. O `?` final faz o critério valer só quando o documento é exigido pelo nível (design.md só em `with-design`). `skipUnless: level=a,b` pula a fase quando o nível não está na lista: o trivial vai da leitura direto para as tasks, com o critério escrito no `Covers:` da task (Miguel, 2026-11-20).

| Critério | Passa quando |
| --- | --- |
| `approval:level` | o dev confirmou o nível (`level <level> --by <dev>`) |
| `generated:repo-map` | o repo map foi registrado (`generated repo-map`) |
| `valid:<doc>` | o `validate-feature.mjs` não acha erro no documento |
| `noOpenQuestions` | nenhum `[QUESTION]` no requirements.md |
| `review:requirements` | o resultado do revisor isolado foi registrado (`ok`, `findings` ou `unavailable`) |
| `approval:<doc>` | o dev aprovou e o hash do documento ainda é o aprovado |
| `coverage:rules->tasks->tests` | toda regra tem task com teste e toda task cobre regra existente |
| `tasks:all-done` | toda task do tasks.md está com `Status: done` |
| `convergence:all-rules` | toda regra está `met` (cada task que a cobre tem `Status: done (<hash>)` de um commit real e cada AC dela é citado no `Covers:` de uma task) e a tabela "Convergence" do tasks.md tem as mesmas linhas que o script devolveu |
| `arch:baseline-not-grown` | o `arch-check.mjs` completo não acha violação nova e a baseline não ganhou chave desde a base da história; sem `keel/architecture.json` fica `skipped` e só passa com `Architecture: não se aplica` no "### Checks" do product.md |
| `approval:deltas?` | vale só se `keel/product.md` ou `keel/adrs/` mudaram desde a base da história; então o dev aprovou (`approve deltas --by <dev>`) e o hash do conteúdo ainda é o aprovado |

Na fase closing, cada comando do `keel-state.mjs` recalcula e grava em `steps.closing` a convergência, a arquitetura e os deltas, e o `next` devolve as linhas prontas da tabela. A base da história é o merge-base com o branch dado no `init --base` (padrão `origin/HEAD`), como o diff de três pontos de um PR; sem ele, é o pai do commit de task mais antigo do "Progress" que está no histórico, e sem commit de task é o HEAD. O `check-feature.mjs <pasta>` confere a história fechada item por item (documentos, state.json em `done` com aprovações válidas, um commit real por task, cada commit dentro do `Files:` da task ou da pasta da história, checagens do product.md, convergência, arquitetura e deltas) e, com `--pr`, imprime a descrição do PR com a evidência por regra.

O `taskExit` da implementação é conferido pelo loop da task, na parte 5. O hash da aprovação cobre só o bloco entre `<!-- frozen after approval: start -->` e `<!-- frozen after approval: end -->`, como o `<frozen-after-approval>` do BMAD. No tasks.md o plano das tasks fica dentro do bloco, e o andamento (`## Progress` com Status, evidências e review de cada task), as notas e a convergência ficam fora; assim marcar uma task como feita não vence a aprovação. No requirements.md e no design.md o cabeçalho com `Status:` fica fora e o resto dentro, inclusive "Changes after confirmation", que pede reaprovação.

A cada comando, e no hook, o script confere que toda fase anterior à atual cumpre os critérios de saída; se não cumpre, a história volta para a primeira que falta. Assim um state.json alterado por fora do script não pula portão. O hook também bloqueia comando de terminal que grava `state.json` (redirecionamento, `tee`, `cp`, `mv`, `rm`, `sed -i`, `writeFile`, `Set-Content`), exceto o `keel-state.mjs` e o `git`.

## Arquitetura do plugin

```text
keel/                                  # repo novo
├── .claude-plugin/plugin.json         # manifesto
├── .claude-plugin/marketplace.json    # catálogo para instalar
├── skills/
│   ├── setup/SKILL.md                 # etapa 0: product.md, ADRs, architecture.json
│   └── story/
│       ├── SKILL.md                   # entra no fluxo, pergunta ao script o próximo passo
│       ├── phases/*.md                # instruções de cada fase, carregadas só quando a fase chega (e debugging.md, quando o GREEN falha)
│       └── checklists/*.md            # segurança, dados e contrato, passados ao revisor pelo gatilho do design.md
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
│   ├── keel-context.mjs               # revisa AGENTS.md/CLAUDE.md, bloco opcional e deriva
│   ├── check-feature.mjs              # conferência de ponta a ponta de uma história
│   └── hooks/*.mjs                    # implementação dos hooks
├── test/                              # node --test dos scripts e hooks
├── evals/                             # casos do claude plugin eval
├── fixtures/node-mini/                # projeto mínimo para casos e ponta a ponta
└── keel/product.md, keel/adrs/        # o próprio Keel usando o fluxo
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

## Agente de documentação (keel-docs)

Plugin separado e opcional em `plugins/keel-docs/`, no mesmo marketplace (`/plugin install keel-docs@keel`, depois de `/plugin marketplace add Koohra/keel`). O Keel funciona sem ele, e ele não depende de nenhum arquivo do Keel.

- **Skill `keel-docs:write`:** ajuda o dev a redigir `keel/product.md`, uma ADR, ou o requirements.md ou o design.md de uma história. Carrega só o guia do documento pedido (`skills/write/guides/`), parte do modelo do plugin, cita fonte em todo fato ou marca `[QUESTION]`/`[ASSUMPTION]` e pergunta uma coisa por vez, com a opção recomendada.
- **Modelos:** `templates/product.md` (termina com a seção de princípios do Keel), `templates/adr.md` (Nygard com `## Confirmation`), e cópias de `requirements.md` e `design.md` idênticas às do Keel; um teste confere que não divergem.
- **`scripts/doc-check.mjs`:** só lê. Aponta seção do modelo que falta ou está vazia, linha do modelo não preenchida, regra sem `[source:`, regra fora de EARS, critério fora de Given/When/Then, nome de ADR fora de `ADR-NNN-<slug>.md` e product.md acima de cerca de 200 linhas (requirements.md e design.md longos são aviso). Sai com 1 se houver erro.
- **Não implementa nem aprova:** o documento que ele cria fica `Status: draft` (ADR `Proposed`); ele não muda `Status` existente, não escreve código, tasks.md nem state.json e não roda scripts do Keel. Pedido de aprovar ou implementar é recusado e apontado para `keel:story`. A garantia é da skill e do eval de recusa; os hooks do Keel continuam bloqueando código fora da fase.
- **Fora desta versão:** migração de documentação antiga (etapa 0), que continua com a skill `setup`.

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

- [x] Criar o repo novo e adicionar ao projeto.
- [x] product.md e ADRs ficam em `keel/` (ADR-005, 2026-11-20).
- [x] `workflow.json` e estratégia de testes confirmados (ADR-002 e ADR-003, 2026-11-20).

## Decisões tomadas

| Decisão | Escolha | Data |
| --- | --- | --- |
| Arquivos por história | requirements.md sempre; design.md só com gatilho; tasks.md | 2026-11-20 |
| Pasta | `keel/features/<KEY>-<slug>/` | 2026-11-20 |
| Versionamento | requirements.md, design.md e tasks.md versionados | 2026-11-20 |
| Documentos do projeto | `keel/product.md` e `keel/adrs/`, junto de `keel/features/`; o Keel só lê fontes de `keel/` (ADR-005) | 2026-11-20 |
| research.md | Não existe; pesquisa entra nas alternativas do design.md | 2026-11-20 |
| Princípios de design | Seção no product.md, rubrica de review, testes de arquitetura e hooks | 2026-11-20 |
| EARS e critérios | Palavras-chave em inglês (WHEN/IF/THEN/WHILE/WHERE ... SHALL) e Given/When/Then; IDs R# e AC-#.# | 2026-11-18 |
| TDD | Obrigatório por task: RED, GREEN, REFACTOR | 2026-11-18 |
| Hook que protege o teste do RED | Versão futura; o review cobre na versão 1 | 2026-11-20 |
| Estado da história | `state.json` por história, escrito só por script, aprovações presas a hash | 2026-11-20 |
| Agente de documentação | Segundo plugin no mesmo repo e marketplace (`plugins/keel-docs/`), sem hook próprio | 2026-11-21 |
| Sequência do fluxo | `workflow.json` no plugin; a IA pergunta o próximo passo ao script em vez de decidir | 2026-11-20 |
| Testes | Quatro camadas enxutas, sem qualificação por hash nem resultados no repo | 2026-11-20 |
| Regra já entregue | Task de regressão com RED por sabotagem do código entregue (Seemann, Feathers) | 2026-11-21 |
| Base da história no fechamento | merge-base com o branch do `init --base`, como o diff de três pontos do PR | 2026-11-21 |
| Delta de product.md e ADR | Edição direta; o script mostra o delta por seção e por arquivo de ADR (OpenSpec) | 2026-11-21 |
| Sem architecture.json | Bloqueia o fechamento, salvo dispensa `Architecture: não se aplica` no product.md | 2026-11-21 |
| Hosts | Só Claude Code; Codex adiado | 2026-11-18 |
| Hosts | Claude Code e Codex, com os mesmos scripts, skills e hooks (épico #50) | 2026-11-27 |
| Repo | Repo novo, do zero, com o nome Keel; keel-dev depreciado, sem tag rc.1 | 2026-11-18 |

---

## Anexo: modelos

### requirements.md

```markdown
# <KEY> — <short title>

Source: <story link> · Folder: keel/features/<KEY>-<slug>/ · Level: trivial | standard | with-design
Status: draft | confirmed by <dev> on <YYYY-MM-DD>

<!-- frozen after approval: start -->
## Original story
> Texto da história copiado sem edição.

## Goal
Para quem, o que muda e por quê, em até três frases. [source: ...]

## Out of scope
- <what this story does not do, even if it looks close>

## Rules and acceptance criteria
R1. WHEN <trigger> THE <system> SHALL <response>. [source: ...]
  - AC-1.1 GIVEN <state> WHEN <action> THEN <observable result>.
R2. IF <unwanted condition> THEN THE <system> SHALL <response>. [source: ...]
  - AC-2.1 GIVEN ... WHEN ... THEN ...
R3. WHILE <state> THE <system> SHALL <response>. [source: ...]

## Explicit obligations
- Edge cases: <...>
- Invariants (must never happen): <...>
- Existing behavior that must not change: <...> [source: <file>]
- Errors and expected responses: <or "none beyond R2">

## Questions and assumptions
- [QUESTION] <question> — recommended option: <...>
- [ASSUMPTION] <assumption> — accepted by <dev> on <date>.

## Conflicts found
- <source A x source B, decision taken>

## Changes after confirmation
- <YYYY-MM-DD> <what changed, why, who re-approved>
<!-- frozen after approval: end -->
```

### design.md

```markdown
# Design — <KEY>

Requirements: requirements.md · Status: draft | approved by <dev> on <date>

<!-- frozen after approval: start -->
Trigger: <trade-off | contract | data/migration | new dependency | cross-cutting | pattern break | new structure | rung change> — <why>

## Approach
Um parágrafo; cite as regras atendidas (R1, R2).

## Code map
| Path | What changes | Reuse / do not touch |
|---|---|---|

## Contracts and data
Só a parte relevante.

## New structure and rationale
none — a resposta esperada na maioria das histórias. Senão, uma linha por elemento; cada um vai no `New structure:` de uma task.

| Element | Kind (interface, layer, mapper/DTO, module, helper, dependency) | Rationale (R#, 2nd implementation, external port, published boundary, 3rd occurrence) | Simpler alternative and why not |
|---|---|---|---|

## Alternatives considered
Para cada dúvida técnica: Decisão / Motivo / Alternativas, com o link da fonte.
| Option | For | Against | Why not |
|---|---|---|---|

## Cross-cutting concerns
Security: <or "not applicable"> · Privacy: · Performance: · Observability: · Migration/rollback:

## Risks and pattern breaks
- <risk, mitigation>

## ADR candidate?
Yes | No — <reason>
<!-- frozen after approval: end -->
```

### tasks.md

```markdown
# Tasks — <KEY>

Requirements: requirements.md · Design: design.md | none
Approved by <dev> on <date>

<!-- frozen after approval: start -->
## T1 — Walking skeleton: <minimal end-to-end path>
Covers: R1 (AC-1.1)
Files: `<path>`, `<glob>`
New structure: none | <element> (<kind>)
Test first: <test name> — <what it checks>
Verification: `<command>`
Done when: <observable condition>
Depends on: —

## T2 — <one rule or variation at a time>
Covers: R2 (AC-2.1)
...

## T3 — <task with no behavior>
Covers: R1
No test: <reason>
...

## T4 — <rule already delivered by an earlier task>
Covers: R3 (AC-3.1)
Regression: delivered by T2
Test first: <test name> — <what it checks>
...
<!-- frozen after approval: end -->

## Progress
### T1
Status: pending | red | green | in review | done (<hash>)
RED evidence: <command and failure excerpt>
GREEN evidence: <command and result>
Review: <ok | findings and what was done | review unavailable>
### T2
Status: pending
### T3
Status: pending

## Implementation notes
- <learning that applies to the next tasks>

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
| R1 | <test> | met |
```

### Seção "Engineering principles" do product.md

```markdown
## Engineering principles

Valem para código novo ou alterado. [hook] é checado automaticamente; [review] entra na
rubrica de design. Se uma regra daqui contradiz o código existente, aponte o conflito e
pergunte antes de escolher, exceto nos caminhos listados em "Do not copy".

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

### Rungs per module
| Module | Rung | Reason |
|---|---|---|
| <src/registration> | 1 — script de transação | CRUD sem invariantes entre campos |
| <src/billing> | 3 — modelo de domínio | core: regras mudam com frequência |
| <authentication> | genérico — <library> | não diferencia o produto |

Degraus: 1 script de transação; 2 funções de domínio puras separadas do I/O; 3 modelo de
domínio (entidades com comportamento, agregados, repositório por raiz); genérico (biblioteca
pronta); organizacional (vários deployables, só com muitos times).

### Exemplars and what not to copy
Follow: <path> (<why>). Do not copy: <path/**> (<why>).

### Checks
Architecture: `<command>` · Lint/complexity: `<command>` · Tests: `<command>`
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
    "domain": ["src/billing/domain/**"],
    "application": ["src/billing/application/**"],
    "infra": ["src/billing/infra/**", "src/billing/web/**"]
  },
  "rules": [
    {
      "name": "domain-does-not-depend-on-outside",
      "from": "domain",
      "forbid": ["application", "infra", "external:web", "external:db", "external:http"],
      "fix": "Declare a port in the domain and implement it in infra; pass it as a parameter."
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
    "branch": "feat/STUD-142-login-google",
    "base": "origin/main"
  },
  "level": "standard",
  "phase": "confirmation",
  "steps": {
    "triage":       { "done": true, "confirmedBy": "Miguel", "at": "2026-11-20T11:30:00Z" },
    "reading":      { "repoMap": true },
    "requirements": { "review": { "result": "ok", "at": "2026-11-20T11:40:00Z" }, "approved": false, "approvedBy": null, "approvedAt": null, "hash": null },
    "design":       { "approved": false, "approvedBy": null, "approvedAt": null, "hash": null },
    "tasks":        { "approved": false, "approvedBy": null, "approvedAt": null, "hash": null },
    "implementation": { "currentTask": null, "blocked": null, "red": null, "green": null, "checks": null, "review": null, "commit": null },
    "closing":      { "convergence": null, "arch": null, "deltas": null, "deltasApproved": null, "pullRequest": null }
  },
  "updatedAt": "2026-11-20T11:42:00Z"
}
```

Valores de `level`: `trivial`, `standard`, `with-design`. Na implementação, `red` e `green` guardam comando, código de saída, trecho da saída e hora do `Verification:` da task aberta (o `red` de uma task de regressão guarda também os arquivos sabotados); `checks` guarda o resultado de cada comando de "Checks" do product.md e a impressão digital do código; `review` e `commit` guardam o review isolado e a aprovação do commit; `failedAttempts` guarda quantas vezes o GREEN ou as checagens falharam e a última falha (tipo, comando, código de saída, trecho da saída), e zera no GREEN ou nas checagens que passam e no `block`. Tudo isso é da task aberta e zera no `task start` seguinte. No fechamento, `convergence` guarda as linhas da tabela (regra, evidência, situação), `arch` o status (`ok`, `fail` ou `skipped`), as violações novas e as chaves que a baseline ganhou, `deltas` os arquivos de `keel/product.md` e `keel/adrs/` mudados desde a base, o delta por seção e o hash do conteúdo deles, e `deltasApproved` quem aprovou, quando e o hash aprovado. `blocked` traz o motivo quando a história está parada (pergunta aberta, checagem fora do escopo, decisão pendente). O state.json não repete o que os arquivos já dizem (perguntas abertas, documento gerado, design exigido): o script lê os arquivos.
