# Fase: tasks

Objetivo: quebrar a história em tasks pequenas, sequenciadas e testáveis. Portão: o dev aprova a sequência de tasks e, no nível `with-design`, o design.

1. Leia o `requirements.md` confirmado e o `design.md`, se houver. No nível `trivial` não há requirements.md: use a história e as fontes da leitura.
2. Crie `keel/features/<KEY>-<slug>/tasks.md` a partir de `${CLAUDE_PLUGIN_ROOT}/templates/tasks.md`. No cabeçalho (fora do bloco congelado): `Requirements: requirements.md` (ou `none` no trivial), `Design: design.md` ou `none`, e `Approval: pending`.
3. A T1 é o esqueleto andante: `## T1 — Walking skeleton: <caminho mínimo de ponta a ponta>`, o menor caminho que atravessa todas as camadas que a história toca.
4. As próximas tasks são fatias verticais: uma regra ou uma variação por vez (caminho feliz, depois cada erro ou borda). Tasks de estrutura (preparar o terreno) ficam separadas das de comportamento.
5. Cada task, dentro do bloco congelado, com estes campos:
   - `Covers:` as regras e critérios, como `R2 (AC-2.1)`. No trivial, o próprio critério: `Covers: GIVEN ... WHEN ... THEN ...`.
   - `Files:` os arquivos que a task cria ou muda.
   - `New structure:` `none`, ou os elementos da tabela do design.md que a task cria, como `UserStore (interface)`. Sem design.md, declare o que for criado; estrutura que pede justificativa é gatilho de design: fale com o dev.
   - `Test first:` `<nome do teste> — <o que ele verifica>`. Task sem comportamento (configuração, scaffolding, migração simples) usa `No test: <motivo>` no lugar.
   - `Verification:` o comando entre crases, tirado de "Checks" do product.md quando existir.
   - `Done when:` a condição observável.
   - `Depends on:` `—` ou as tasks anteriores.
6. Cada task cabe num contexto limpo: se precisa de muito mais do que as regras que cita, são duas tasks.
7. Fora do bloco: `## Progress` com `### T<n>` e `Status: pending` para cada task, "Implementation notes" com "not applicable" e a tabela de "Convergence" só com o cabeçalho.
8. Não escreva testes nem código agora: só o plano. Os testes nascem um por vez, na implementação.
9. Valide por script e corrija até não haver erro (estrutura, cobertura regra → task → teste, AC citados, dependências sem ciclo e estrutura igual à do design):
   `node "${CLAUDE_PLUGIN_ROOT}/scripts/validate-feature.mjs" keel/features/<KEY>-<slug>`
10. Apresente ao dev, curto: uma linha por task (`T1 — título · Covers · Depends on`), e, se houver design, o gatilho, a estrutura nova e a candidata a ADR. Pergunte se ele aprova as tasks (e o design). Pare e espere.
11. Se o dev pedir mudança, edite, valide de novo e mostre o que mudou.
12. Só com a aprovação escrita do dev nesta conversa, e só do que ele aprovou:
    - troque os cabeçalhos: `Approved by <dev> on <YYYY-MM-DD>` no tasks.md e `Status: approved by <dev> on <YYYY-MM-DD>` no design.md;
    - se houver design: `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" approve design.md --by "<dev>"`;
    - `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" approve tasks.md --by "<dev>"`;
    - avance: `node "${CLAUDE_PLUGIN_ROOT}/scripts/keel-state.mjs" advance`.

Depois da aprovação, mudar o plano dentro do bloco congelado vence a aprovação e a história volta para esta fase. Status, evidências e notas ficam fora do bloco e podem mudar.
