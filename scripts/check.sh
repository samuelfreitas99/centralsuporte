#!/bin/sh
# Verificação completa (testes + typecheck + lint) com o código atual, em containers descartáveis.
# Não depende do modo (dev/produção) dos containers em execução. Uso: ./scripts/check.sh [backend|frontend]
set -eu
cd "$(dirname "$0")/.."
ROOT=$(pwd)
what="${1:-all}"

if [ "$what" = all ] || [ "$what" = backend ]; then
  echo "== Backend (pytest no banco isolado centralsuporte_test)"
  docker run --rm --network centralsuporte_network -v "$ROOT/backend:/app" -w /app \
    -e DATABASE_URL=postgresql://suporte:suporte_password@db:5432/centralsuporte_db \
    centralsuporte-backend python -m pytest -q -p no:warnings
fi

if [ "$what" = all ] || [ "$what" = frontend ]; then
  echo "== Frontend (tsc com verificação de contrato da API, vitest, oxlint)"
  docker run --rm -v "$ROOT/frontend:/app" -v centralsuporte_frontend_node_modules:/app/node_modules -w /app \
    node:20-alpine sh -c "npm ci --silent >/dev/null 2>&1 || npm install --silent >/dev/null; npx tsc -b && npx vitest run --reporter=dot && npx oxlint | tail -2"
fi
