#!/usr/bin/env bash
set -euo pipefail
"$(dirname "$0")/../prepare.sh" APP-12 aviso "Aviso de novo cadastro por e-mail" design with-design
