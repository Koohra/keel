#!/usr/bin/env bash
# A repository with no source code: only a README that says what the product is.
set -euo pipefail
cat > README.md <<'MD'
# Clube do livro

Site para um clube de leitura marcar encontros e votar no próximo livro.
MD
git init -q -b main
git config user.name Ana
git config user.email ana@example.com
git add -A
git commit -q -m "README"
