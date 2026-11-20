#!/usr/bin/env bash
# Prepara o workspace de um caso: copia fixtures/node-mini, cria a branch da história e leva
# o state.json até a fase pedida usando o próprio keel-state.mjs.
# Uso (de um fixture.sh): "$(dirname "$0")/../preparar.sh" <CHAVE> <slug> <título> <fase>
set -euo pipefail
key="$1"; slug="$2"; title="$3"; phase="$4"
plugin="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
dados="$plugin/evals/etapas/dados"
state() { node "$plugin/scripts/keel-state.mjs" "$@" > /dev/null; }

cp -R "$plugin/fixtures/node-mini/." .
git init -q -b "feat/$key-$slug"
git config user.name Ana
git config user.email ana@exemplo.com
state init --key "$key" --slug "$slug" --title "$title"
folder="keel/features/$key-$slug"
if [ "$phase" != triage ]; then
  state level padrao --by Ana
  state advance
fi
if [ "$phase" = requirements ] || [ "$phase" = confirmation ]; then
  state generated repo-map
  state advance
fi
if [ "$phase" = requirements ]; then
  cp "$dados/$key-rascunho.md" "$folder/requirements.md"
fi
if [ "$phase" = confirmation ]; then
  cp "$dados/$key-completo.md" "$folder/requirements.md"
  state advance
fi
git add -A
git commit -q -m "Fixture na fase $phase"
