# Tasks — KEEL-3

Requirements: requirements.md · Design: none
Approval: in the PR review

<!-- frozen after approval: start -->
## T1 — Walking skeleton: repo-map.mjs
Covers: R4 (AC-4.1, AC-4.2, AC-4.3)
Files: `scripts/repo-map.mjs`, `test/repo-map.test.mjs`
New structure: `scripts/repo-map.mjs` (module)
Test first: `test/repo-map.test.mjs` — assinaturas com linha por linguagem, ordem pelo grafo, orçamento, pastas ignoradas, foco e CLI
Verification: `node --test test/repo-map.test.mjs`
Done when: os testes passam no Linux e no Windows
Depends on: —

## T2 — Skill story, fases 1 a 4 e revisor isolado
Covers: R2 (AC-2.1), R8 (AC-8.1), R3, R5, R6, R7
Files: `skills/story/SKILL.md`, `skills/story/phases/{triage,reading,requirements,confirmation}.md`, `agents/reviewer.md`, `test/story-skill.test.mjs`
New structure: none
Test first: `test/story-skill.test.mjs` — fases com instruções, comandos e scripts citados existem, revisor só leitura
Verification: `node --test test/story-skill.test.mjs`
Done when: os testes passam e `claude plugin validate .` aceita a skill e o agente
Depends on: T1

## T3 — Casos de eval: acionamento e etapas 1 a 4
Covers: R1 (AC-1.1), R3 (AC-3.1), R5 (AC-5.1), R6 (AC-6.1), R7 (AC-7.1)
Files: `evals/**`, `fixtures/node-mini/**`, `test/evals.test.mjs`
New structure: none
Test first: `test/evals.test.mjs` — 8 casos que acionam e 6 que não, todo caso com grader
Verification: `claude plugin eval . --runs 1 --ablation none --allow-tools Bash Write Edit --scaffold --trust-plugin`
Done when: os casos passam numa rodada, com custo registrado nas notas
Depends on: T2
<!-- frozen after approval: end -->

## Progress
### T1
Status: green
RED evidence: `node --test test/repo-map.test.mjs` falhou com ERR_MODULE_NOT_FOUND antes do script (módulo novo).
GREEN evidence: `node --test test/repo-map.test.mjs` 8 de 8 passam.
Review: revisor isolado (subagente, só leitura) achou quatro problemas, todos com teste novo que falhou antes da correção: arquivo central grande sumia inteiro quando não cabia no orçamento (agora entra com as primeiras definições e `… +K definições`); `git ls-files` sem `-z` escapava caminho com acento e o arquivo sumia; termos de `--focus` separados por espaço viravam pasta (a CLI agora recusa e a fase diz "separadas por vírgula"); rodapé estourava orçamento muito pequeno (mínimo de 50 tokens).
### T2
Status: green
RED evidence: `node --test test/story-skill.test.mjs` falhou primeiro com SyntaxError (faltava o export `COMMANDS` no keel-state.mjs) e, depois do export, 3 de 4 falharam porque SKILL.md, as fases e o agente não existiam.
GREEN evidence: `node --test test/story-skill.test.mjs` 4 de 4 passam; `claude plugin validate .` passa, com os avisos que já existiam (CLAUDE.md na raiz e ícone).
Review: revisor isolado: `--source` aparecia como obrigatório no `init` (agora opcional, "não invente") e R1 dizia `next` antes de tudo enquanto a skill confere o product.md primeiro (R1 ajustada). Sem teste novo: texto de instrução.
### T3
Status: green
RED evidence: `node --test test/evals.test.mjs` 2 de 2 falharam antes dos casos existirem.
GREEN evidence: `node --test test/evals.test.mjs` 2 de 2 passam. Rodada de 2026-11-20, Claude Code 2.1.329, modelo padrão do eval (claude-sonnet-5-5), uma run por caso, `--ablation none`: acionamento 14 de 14 (US$ 0,50); etapas 1 a 4, 4 de 4 (US$ 0,44, com `TMPDIR` fora de /tmp). Depois do review, só `reading-draft` rodou de novo (a fase de leitura mudou): passou, US$ 0,15. Gasto total da parte, com sondas e rodadas refeitas: cerca de US$ 1,65.
Review: revisor isolado sem achado nos graders.

## Implementation notes
- O repo map vai para a saída padrão; não é gravado. Ordem por PageRank sobre "arquivo usa nome definido em outro arquivo" (como o Aider), extração por regex por linguagem (JS/TS, Python, Go, C#, Java, Kotlin), sem tree-sitter para manter o script sem dependências. Arquivo grande que não cabe no orçamento é pulado e os menores seguintes ainda entram. Usa `git ls-files` quando há repositório, para respeitar o .gitignore.
- A skill usa `${CLAUDE_PLUGIN_ROOT}` para scripts e modelos e `${CLAUDE_SKILL_DIR}` para as fases; `allowed-tools` pré-autoriza só `node "${CLAUDE_PLUGIN_ROOT}/scripts/*`.
- O revisor nasce em `agents/reviewer.md` só com a revisão de requisitos; a parte 5 acrescenta a rubrica de design no mesmo agente. A fase de confirmação chama `keel:reviewer` (confirmado no eval: o Agent tool aceita esse nome).
- Casos de etapa: o `scaffold_script` recebe o caminho absoluto em `$0`, então `evals/phases/prepare.sh` copia `fixtures/node-mini`, cria a branch e leva o state.json até a fase com o próprio keel-state.mjs. Precisa de `--scaffold --allow-tools Bash Write Edit`.
- Para rodar os casos de etapa no Linux: o sandbox do eval precisa de `bubblewrap` e `socat`, e o workspace não pode ficar sob /tmp (o sandbox nega escrita em //tmp e isso vence o allowWrite). Rode com `TMPDIR` fora de /tmp, por exemplo `TMPDIR=$HOME/evaltmp`. Sem isso o Bash do caso não grava o state.json e os graders de estado falham.
- Comando da rodada: `claude plugin eval . --runs 1 --ablation none --trust-plugin --scaffold --allow-tools Bash Write Edit --max-cost-usd 8`.
- Próximo passo: parte 4 (fases design e tasks) parte desta branch ou da main depois do merge.

## Convergence (filled at the end, checked by script)
| Rule | Evidence | Outcome |
|---|---|---|
