#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$project_root"
command -v node >/dev/null 2>&1 || { echo 'Ai nevoie de Node.js 20 sau mai nou.' >&2; exit 1; }
command -v git >/dev/null 2>&1 || { echo 'Ai nevoie de Git. Rulează scriptul în Git Bash.' >&2; exit 1; }
exec node scripts/deploy-pages.js
