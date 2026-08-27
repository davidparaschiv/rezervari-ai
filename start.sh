#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
cd "$project_root"
command -v node >/dev/null 2>&1 || { echo 'Instalează Node.js (versiunea 20 sau mai nouă), apoi rulează din nou ./start.sh.' >&2; exit 1; }
command -v npm >/dev/null 2>&1 || { echo 'npm nu este disponibil. Reinstalează Node.js cu npm.' >&2; exit 1; }
echo 'Instalez dependențele…'
if ! npm install; then
  echo 'Instalarea a eșuat. Serverul și browserul nu au fost pornite.' >&2
  exit 1
fi
exec node scripts/start-local.js
