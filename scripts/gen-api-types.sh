#!/bin/sh
# Gera frontend/src/types/api.gen.ts a partir do OpenAPI do backend (fonte da verdade do contrato).
# Rode depois de mudar qualquer schema em backend/app/schemas.py e faça commit do arquivo gerado.
set -eu
cd "$(dirname "$0")/.."
ROOT=$(pwd)
docker run --rm -v "$ROOT/backend:/app" -w /app -e DATABASE_URL=postgresql://x:x@localhost/none \
  centralsuporte-backend python -c "import json; from app.main import app; print(json.dumps(app.openapi()))" \
  > "$ROOT/frontend/openapi.json"
docker run --rm -v "$ROOT/frontend:/app" -v centralsuporte_frontend_node_modules:/app/node_modules -w /app \
  node:20-alpine npx -y openapi-typescript@7.13.0 openapi.json -o src/types/api.gen.ts
rm -f "$ROOT/frontend/openapi.json"
echo "Gerado: frontend/src/types/api.gen.ts"
