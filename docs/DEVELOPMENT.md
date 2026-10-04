# DEVELOPMENT — Como rodar, testar e escrever código

Guia prático. Para regras invioláveis, leia `AGENTS.md` (raiz). Para a visão técnica, `ARCHITECTURE.md`.

---

## 1. Ambiente

Tudo roda em Docker Compose, no servidor compartilhado (há outros containers em produção — **nunca** use `docker system prune`, `docker volume prune` etc.).

| Serviço | Container | Porta no host | Observação |
|---|---|---|---|
| PostgreSQL 16 | `centralsuporte_db` | — (só rede interna) | volume `centralsuporte_pgdata` |
| API FastAPI | `centralsuporte_backend` | `8088` | código montado em `/app`, `--reload` |
| Frontend Vite | `centralsuporte_frontend` | `5173` | código montado em `/app`, dev server |

```bash
docker compose up -d            # sobe só os serviços deste projeto
docker compose logs -f backend  # logs da API
```

Em produção o frontend chama a API em `/api` (mesma origem, via nginx). Em desenvolvimento chama `http://<host>:8088` (ver `frontend/src/services/api.ts`).
Login padrão criado no primeiro start: `admin` / `admin123` (ou `DEFAULT_ADMIN_PASSWORD`, se definido antes do primeiro start).

O `.env` (não versionado) define as credenciais do Postgres e a `SECRET_KEY` dos tokens JWT; modelo em `.env.example`.
Depois de alterar o `.env`, recrie só o backend: `docker compose up -d --no-deps backend`.

### Modo atual: PRODUÇÃO (desde 2026-10-03)

O servidor roda o override de produção:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build   # aplica mudanças (rebuild)
```

* Backend sem `--reload` (código da imagem), migrações aplicadas ao iniciar, IP real via proxy headers.
* Frontend compilado servido por nginx: **http :5173** e **https :8443**; a API fica em **/api** no mesmo endereço.
* Certificados em `deploy/certs/` (fora do Git), gerados por `./deploy/make-certs.sh <ip> <hostname>`.
  Rodar de novo renova o certificado do servidor reaproveitando a CA (os PCs não precisam reinstalar).
* Como a equipe acessa e instala o certificado/app: `GUIA_DA_EQUIPE.md`.

**Qualquer mudança de código só aparece depois do rebuild acima.** Para desenvolver com recarga
automática, volte ao modo dev (`docker compose up -d --build`) e, ao terminar, suba produção de novo.

### Ambiente de demonstração (revisão visual / screenshots)

Para revisar telas com dados realistas sem tocar no banco real:

```bash
docker exec centralsuporte_db psql -U suporte -d postgres -c "CREATE DATABASE centralsuporte_demo;"
docker run --rm --network centralsuporte_network -v $PWD/backend:/app -w /app \
  -e DATABASE_URL=postgresql://suporte:suporte_password@db:5432/centralsuporte_demo \
  -e UPLOAD_DIR=/tmp/demo_uploads centralsuporte-backend python -m scripts.seed_demo
```

Depois suba um backend temporário apontando para esse banco (porta só em 127.0.0.1) e use-o com um
frontend dev (`VITE_API_URL`). Remova os containers e o banco `_demo` ao terminar.

---

## 2. Testes — leia antes de rodar

### Backend (pytest)

```bash
docker exec centralsuporte_backend sh -c "cd /app && python -m pytest -q -p no:warnings"
```

* `backend/conftest.py` redireciona os testes para o banco **`centralsuporte_test`**, que é
  **apagado e recriado a cada execução**, e usa um diretório temporário para uploads.
* O nome do banco de testes precisa terminar com `_test` (há trava de segurança).
* **Nunca** remova o `conftest.py` nem aponte os testes para `centralsuporte_db`.
* Novos testes ficam em `backend/tests/`. Podem usar `admin`/`admin123` (o conftest cria).

### Tudo de uma vez (recomendado)

```bash
./scripts/check.sh            # backend + frontend com o código atual, em containers descartáveis
./scripts/check.sh backend    # ou só um dos lados
```

### Frontend (vitest, typecheck, lint)

```bash
docker exec centralsuporte_frontend sh -c "npx tsc -b && npx vitest run && npx oxlint"
```

`npm run build` = `tsc -b && vite build`. O lint tem warnings antigos; não adicione novos.

---

## 3. Banco e migrações

* Modelos em `backend/app/models.py`; migrações Alembic em `backend/alembic/versions/`.
* Toda mudança de modelo precisa de migração:

```bash
docker exec centralsuporte_backend sh -c "cd /app && alembic revision --autogenerate -m 'descricao'"
docker exec centralsuporte_backend sh -c "cd /app && alembic upgrade head"
```

* Revise a migração gerada antes de aplicar. Os testes criam o schema com `create_all`, então
  uma migração esquecida **não** é detectada pelos testes.

---

## 4. Convenções de código

### Backend
* Um roteador por domínio em `backend/app/routers/`. Schemas Pydantic em `app/schemas.py`.
* Permissão por endpoint: `Depends(require_permission("modulo:acao"))` (lista em `app/initial_data.py`).
* Ações relevantes registram auditoria com `record_audit_log` (`app/services/audit.py`).
* Listagens novas devem ser paginadas: `PaginationParams` + `paginate` (`app/utils/pagination.py`),
  resposta `PaginatedResponse[XListResponse]` (DTO de lista enxuto, sem campos pesados).

### Frontend
* React 19 + TypeScript + Tailwind 4 + componentes próprios em `src/components/ui`.
* **Navegação por hash**: `#modulo` ou `#modulo?id=123`. A lista de módulos está em
  `src/components/layout/nav-items.ts`; o mapeamento módulo → página em `src/components/AuthenticatedView.tsx`.
  Para abrir um item de outra tela use `onSelectTab('modulo?id=123')` ou `window.location.hash = 'modulo?id=123'`.
* Chamadas HTTP somente via `src/services/*Service.ts` usando `request()` de `services/api.ts`.
* Tipos em `src/types/`. Permissões no front via `useAuth().hasPermission('...')`.
* Textos de interface em **português do Brasil**, curtos e diretos. Sem jargão de desenvolvimento
  ("Fase 8", "MVP", "Roadmap") na interface.
* Cabeçalho de tela: sempre `<PageHeader icon title description>{ações}</PageHeader>` (`components/ui/PageHeader.tsx`); título igual ao rótulo do menu.
* Busca e filtros de lista: `<FilterBar search onSearch placeholder>` + `<FilterSelect>` (`components/ui/FilterBar.tsx`); a busca já tem debounce.
* Datas: sempre `formatDate`/`formatTime`/`formatDateTime`/`formatRelative` (`lib/format.ts`), nunca `toLocaleString` direto.
* **Contrato com a API**: `src/types/api.gen.ts` é gerado do OpenAPI do backend (`./scripts/gen-api-types.sh`, rode após mudar `app/schemas.py` e faça commit). `src/types/contract.check.ts` faz o `tsc` falhar se um tipo das telas usar campo que a API não tem — ao criar um tipo novo de resposta, acrescente a linha correspondente lá.
* Status e prioridade: `<StatusBadge domain status>` / `<PriorityBadge priority>`; rótulos e cores só em `lib/status.ts`.
* Confirmações: `const confirm = useConfirm();` e `if (!(await confirm({ title: 'Excluir X?' }))) return;`
  (`hooks/useConfirm.ts`). Nunca use `window.confirm`.
* Abrir item de outra tela: deep link `#modulo?id=N`; na página use `useDeepLinkId` / `clearDeepLinkId` (`hooks/useDeepLink.ts`).
* Escolher equipamento: `components/infrastructure/EquipmentPicker`.
* Animações apenas com `motion/react`. Visual: `DESIGN_SYSTEM.md` e `UI_UX.md`.

---

## 5. Fluxo de trabalho (resumo do AGENTS.md)

1. Ler `docs/PROJECT_STATE.md` e o item do `docs/ROADMAP.md` que vai implementar.
2. Implementar uma unidade lógica pequena.
3. Rodar testes backend + frontend + typecheck.
4. Atualizar `ROADMAP.md` (status), `PROJECT_STATE.md` e, se houver decisão, `DECISIONS.md`.
5. Commit em Conventional Commits, sem segredos, uma funcionalidade por commit.
