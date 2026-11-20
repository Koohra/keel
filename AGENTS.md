# Working in this repository

Keel 2 is built with its own flow, by hand until the scripts exist. The source of truth is [docs/especificacao.md](docs/especificacao.md); the plan is GitHub issues #1 to #8, one per part. Docs are in Portuguese; code, scripts and this file are in English. Answer the user in their language.

- Work on one part (issue) per branch. Its story folder is `keel/features/KEEL-<issue>-<slug>/` with `requirements.md` and `tasks.md`.
- TDD per task: write the failing test first, record the RED and GREEN commands in `tasks.md`.
- Scripts are dependency-free Node.js `.mjs` using only `node:` modules. Write LF line endings and no byte-order mark. Tests must pass on Windows.
- Only `scripts/keel-state.mjs` writes `state.json`.
- Before a PR: `npm test` and `claude plugin validate .`.
- Keep tests lean (see ADR-003): no qualification records, no results in the repo.
- Commit only with explicit approval of the exact change.
