#!/usr/bin/env bash
set -euo pipefail
"$(dirname "$0")/../prepare.sh" APP-10 arquivo "Usuários sobrevivem ao reinício" design with-design
