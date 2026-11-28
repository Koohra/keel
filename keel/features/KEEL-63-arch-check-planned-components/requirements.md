# KEEL-63 — arch-check: componentes planejados e arquivos órfãos

Source: https://github.com/Koohra/keel/issues/63 (épico #61) · Folder: keel/features/KEEL-63-arch-check-planned-components/ · Level: with-design
Status: confirmed by Miguel on 2026-11-28

<!-- frozen after approval: start -->
## Original story
> ## Contexto
>
> - O `arch-check.mjs` trata como erro de configuração uma regra que casa com zero arquivos (`scripts/arch-check.mjs:258-280`). Num projeto vazio não dá para declarar as regras antes das pastas.
> - O fechamento aceita "Architecture: não se aplica" (`scripts/closing.mjs:82-89`), e nada manda voltar ao `architecture.json` quando as pastas passam a existir (`skills/story/phases/closing.md:17`).
> - Ele pega violação de regra declarada, mas não deriva: pasta nova fora de qualquer componente passa em silêncio, e import local que não resolve não conta como violação (`scripts/arch-check.mjs:571-574`).
> - A detecção de dependência nova só lê o `package.json` (`scripts/task-metrics.mjs:20,39-62`).
>
> ## O que fazer
>
> - `"planned": true` num componente. Planejado que casa com zero arquivos dá status `pending` em vez de erro; quando o primeiro arquivo aparece, a regra passa a valer.
> - O fechamento deixa de aceitar a dispensa quando a história criou código-fonte e há componentes `pending` ou nenhum componente.
> - Campo `"coverage"` com globs (por exemplo `["src/**"]`). Arquivo coberto que não pertence a nenhum componente vira violação nova, com a dica "declare o componente ou mova o arquivo". No hook PostToolUse é só aviso; no fechamento vira delta do `architecture.json` e da tabela de degraus, para o dev aprovar. Encaixa na baseline existente.
> - `task-metrics.mjs` passa a ler também `requirements.txt`/`pyproject.toml`, `go.mod`, `*.csproj` e `pom.xml`.
> - Só `node:`, LF, sem BOM; testes passam no Windows.
>
> ## Critérios de aceite
>
> - [ ] Componente `planned` sem arquivos passa como `pending`, e vira regra ativa quando surge o primeiro arquivo.
> - [ ] Fechamento recusa "Architecture: não se aplica" se a história criou código-fonte e há `pending` ou nenhum componente.
> - [ ] Arquivo coberto fora de qualquer componente é apontado (aviso no hook, delta no fechamento) e respeita a baseline.
> - [ ] `task-metrics.mjs` detecta dependência nova nos manifests listados.
> - [ ] `architecture.json` existente, sem `planned` nem `coverage`, se comporta como hoje.
> - [ ] Testes TDD em `test/` com RED e GREEN registrados no `tasks.md`; `npm test` e `claude plugin validate .` passam.

## Goal
Num projeto que ainda não tem as pastas, o dev declara a arquitetura antes do código e o Keel passa a cobrar as regras quando os arquivos aparecem; arquivo novo fora de qualquer componente deixa de passar em silêncio, e dependência nova é vista em manifests além do `package.json`. Nada muda para quem já tem `architecture.json` sem os campos novos. [source: issue #63; issue #61]

## Out of scope
- A fase de proposta de arquitetura no setup (#62), a revisão de arquitetura da história inteira (#64), a linguagem simples (#65) e o gatilho automático de design na triagem (#66).
- Contar import local que não resolve como violação: continua só listado, como hoje (`scripts/arch-check.mjs:571-574`).
- Ler manifest fora dos arquivos que a task mudou, ou resolver versões e dependências transitivas.
- Traduzir `planned` e `coverage` para ferramenta nativa (ArchUnit, dependency-cruiser etc.).

## Rules and acceptance criteria
R1. WHERE um componente do `architecture.json` é marcado como planejado THE arch-check SHALL tratá-lo como `pending` enquanto ele casa com zero arquivos, sem erro de configuração; a regra cujo `from` está `pending` não roda, e o alvo `pending` de um `forbid` fica de fora enquanto os outros alvos continuam cobrados; a partir do primeiro arquivo, ele é componente comum a partir do primeiro arquivo. [source: issue #63]
  - AC-1.1 GIVEN um componente planejado sem arquivos e uma regra que o cita em `from` ou `forbid` WHEN o arch-check roda THEN sai com 0, sem violação, e a saída lista o componente como `pending` (no `--json`, em `pending`).
  - AC-1.2 GIVEN o mesmo componente com um arquivo que viola a regra WHEN o arch-check roda THEN a violação é apontada como hoje e o componente não está em `pending`.
  - AC-1.4 GIVEN uma regra de `from` ativo cujo `forbid` tem um alvo `pending` e um alvo ativo WHEN um arquivo do `from` importa o alvo ativo THEN a violação é apontada. [source: dev on 2026-11-28]
  - AC-1.3 GIVEN um componente não planejado que casa com zero arquivos numa regra WHEN o arch-check roda THEN sai com 2 e a mensagem de hoje.
R2. IF a história criou código-fonte e não há componente ativo (sem `architecture.json`, sem componentes ou só componentes `pending`) THEN THE fechamento SHALL recusar a arquitetura, mesmo com "Architecture: não se aplica", citando os arquivos criados e pedindo para declarar os componentes. [source: issue #63]
  - AC-2.1 GIVEN um projeto sem `architecture.json`, com a dispensa no product.md, e uma história que criou `src/a.js` WHEN o fechamento confere a arquitetura THEN não passa e o motivo cita `src/a.js` e `keel/architecture.json`.
  - AC-2.2 GIVEN o mesmo projeto e uma história que só mudou arquivos de fonte existentes ou arquivos que não são fonte WHEN o fechamento confere THEN passa com a dispensa, como hoje.
  - AC-2.3 GIVEN um `architecture.json` só com componentes `pending` e uma história que criou um arquivo de fonte WHEN o fechamento confere THEN não passa, com o mesmo motivo.
  - AC-2.4 GIVEN uma história que só criou um teste (`test/x.test.mjs`) WHEN o fechamento confere sem componente ativo THEN não passa; GIVEN uma história que só renomeou um arquivo de fonte THEN passa com a dispensa. [source: dev on 2026-11-28]
R3. WHERE o `architecture.json` tem `coverage` THE arch-check SHALL apontar como órfão cada arquivo de fonte coberto pelos globs que nenhum componente (planejado ou não) cobre, com a dica "declare o componente ou mova o arquivo", respeitando a baseline. [source: issue #63]
  - AC-3.1 GIVEN `coverage` `["src/**"]` e `src/novo/x.js` fora de todo componente WHEN o arch-check roda THEN a saída aponta o arquivo como órfão com a dica (no `--json`, em `orphans`).
  - AC-3.2 GIVEN o órfão já na baseline WHEN o arch-check roda THEN ele não é novo; `--write-baseline` grava a chave dele.
  - AC-3.3 GIVEN um arquivo coberto que casa com os globs de um componente planejado WHEN o arch-check roda THEN ele não é órfão e o componente deixa de ser `pending`.
R4. WHEN o arquivo editado é um órfão novo THE hook PostToolUse SHALL devolver um aviso ao modelo, sem bloquear. [source: issue #63]
  - AC-4.1 GIVEN um órfão novo WHEN o hook roda para a edição dele THEN a saída traz o aviso com a dica em `additionalContext` e não traz `decision: block`.
  - AC-4.2 GIVEN um arquivo que é órfão e viola uma regra WHEN o hook roda THEN bloqueia pela violação, como hoje, e o aviso do órfão vai junto.
R5. IF o fechamento acha órfão novo THEN THE fechamento SHALL recusar a arquitetura pedindo o delta do `architecture.json` e da tabela "Rungs per module" do product.md, e SHALL tratar mudança em `keel/architecture.json` desde a base como delta que o dev aprova. [source: issue #63]
  - AC-5.1 GIVEN um órfão novo no fechamento WHEN a arquitetura é conferida THEN não passa e o motivo cita o arquivo, `keel/architecture.json` e "Rungs per module".
  - AC-5.2 GIVEN `keel/architecture.json` mudado desde a base da história WHEN o fechamento calcula os deltas THEN ele está em `closing.deltas.files` e o avanço pede `approve deltas`.
  - AC-5.3 GIVEN o texto de `skills/story/phases/closing.md` WHEN o teste o lê THEN o passo de arquitetura manda propor o delta do `architecture.json` e da tabela de degraus para órfão e para história que criou fonte sem componente ativo.
R6. WHEN a task muda `requirements.txt`, `pyproject.toml`, `go.mod`, um `*.csproj` ou `pom.xml` THE task-metrics SHALL listar em `newDependencies` as dependências que não existiam no HEAD. [source: issue #63]
  - AC-6.1 GIVEN cada um desses manifests com uma dependência a mais que no HEAD WHEN as métricas são calculadas THEN o nome dela aparece em `newDependencies`.
  - AC-6.3 GIVEN os manifests WHEN o nome é lido THEN é `groupId:artifactId` no `pom.xml`; todo `require` do `go.mod`, inclusive `// indirect`; só `PackageReference` do `*.csproj`; `[project].dependencies`, `[project.optional-dependencies]` e as dependências e grupos do Poetry no `pyproject.toml` (sem `python`); e no `requirements.txt` o nome do pacote sem versão, extras nem marcador, ignorando `-r`, `-e`, opções e comentários; em qualquer pasta, quando a task mudou o arquivo. [source: dev on 2026-11-28]
  - AC-6.2 GIVEN só o `package.json` mudado WHEN as métricas são calculadas THEN o resultado é o de hoje.

## Explicit obligations
- Edge cases: componente planejado no `noCycles` não existe (o `noCycles` usa globs próprios); `coverage` sem arquivo coberto não é erro; arquivo em dois componentes não é órfão; manifest novo (sem versão no HEAD) conta todas as dependências como novas, como o `package.json` hoje.
- Baseline: "órfão novo" é o que não está na baseline atual, como as violações de hoje; órfão gravado na baseline durante a história cai na recusa de baseline que cresceu, com a mensagem de hoje; chave de órfão que deixou de ser órfão aparece como `stale`. [source: dev on 2026-11-28]
- Tabela de degraus: o script não confere "Rungs per module" (texto livre); ela entra no delta que o dev aprova, e a mensagem de `approve deltas` passa a citar `keel/architecture.json`. [source: dev on 2026-11-28]
- Invariants (must never happen): órfão bloquear uma edição no hook; componente não planejado com zero arquivos passar em silêncio.
- Existing behavior that must not change: `architecture.json` sem `planned` nem `coverage` (formato `nome: [globs]`) dá a mesma saída e o mesmo código de saída de hoje; os testes atuais de `arch-check`, `closing`, `post-tool-use` e `task-metrics` passam sem mudar expectativa. [source: scripts/arch-check.mjs:240-292; test/arch-check.test.mjs; test/closing.test.mjs]
- Scripts sem dependência, só `node:`, LF sem BOM; testes passam no Windows. [source: AGENTS.md]
- Errors and expected responses: `planned` que não é booleano, componente em objeto sem lista de globs e `coverage` que não é lista de globs saem com 2 e o motivo; nenhum outro.

## Questions and assumptions
- [ASSUMPTION] Componente planejado é escrito como objeto, `"nome": { "globs": [...], "planned": true }`; a lista simples continua valendo para componente comum. — accepted by Miguel on 2026-11-28.
- [ASSUMPTION] Órfão sozinho não muda o código de saída do arch-check (sai com 0 e lista o órfão): assim o comando de "Checks" das tasks não falha por ele e a cobrança fica no fechamento, como a issue pede ("no hook é só aviso"). — accepted by Miguel on 2026-11-28.
- [ASSUMPTION] "Há componentes pending ou nenhum componente" (R2) é lido como "nenhum componente ativo": com um componente ativo e outros `pending`, o fechamento segue a regra de hoje, e o arquivo novo fora de componente é pego pelo órfão (R3, R5) quando há `coverage`. — accepted by Miguel on 2026-11-28.
- [ASSUMPTION] "Código-fonte criado" é arquivo novo desde a base da história, fora de `keel/`, com as extensões que o arch-check lê (`.js`, `.ts`, `.py` e afins), testes incluídos; arquivo só renomeado não conta. — accepted by Miguel on 2026-11-28.

## Conflicts found
- docs/specification.md (anexo `keel/architecture.json`: "Uma regra que casa com zero arquivos falha") x issue #63 (planejado sem arquivos é `pending`): segue a issue; o texto da especificação ganha a exceção do componente planejado.

## Changes after confirmation
not applicable
<!-- frozen after approval: end -->
