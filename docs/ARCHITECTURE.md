# ARCHITECTURE — Central de Suporte

Como o sistema é construído **hoje**. O que o produto deve fazer está em `PRODUCT_SPEC.md`;
como rodar e testar, em `DEVELOPMENT.md`.

## 1. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, TypeScript, Vite, Tailwind CSS 4, componentes próprios em `src/components/ui`, `motion/react`, `lucide-react` |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2 (sessões **síncronas**), Pydantic 2, Alembic |
| Banco | PostgreSQL 16 |
| Infra | Docker Compose isolado (`centralsuporte_*`), ver `DEVELOPMENT.md` |

## 2. Estrutura do repositório

```
backend/
  app/
    main.py            # cria a app, registra roteadores, seed e agendador de automação
    models.py          # todos os modelos SQLAlchemy
    schemas.py         # todos os schemas Pydantic
    auth.py            # JWT, hash de senha, require_permission
    initial_data.py    # permissões, perfis padrão e usuário admin (seed idempotente)
    routers/           # um arquivo por domínio (ver §3)
    services/          # audit, automation, storage, attachment_security, file_access/
    utils/pagination.py
  alembic/versions/    # migrações
  conftest.py          # isola testes no banco centralsuporte_test
  tests/
frontend/src/
  components/
    AuthenticatedView.tsx  # "roteador": hash -> página
    layout/                # AppLayout, Header, Sidebar, nav-items.ts, NotificationsDropdown, CommandPalette
    ui/                    # componentes base (button, card, drawer, dialog, tabs, Pagination...)
    <dominio>/             # componentes de um domínio (tasks, maintenance, knowledge, ...)
  pages/               # uma página por módulo (algumas com subpastas: files/, projects/, infrastructure/tabs/)
  services/            # clientes HTTP por domínio (usam services/api.ts)
  types/               # tipos TypeScript por domínio
  hooks/               # useAuth, useTheme, usePagination
  test/                # testes vitest
docs/                  # ver docs/README.md
```

## 3. Domínios e módulos

| Domínio | Roteadores (backend) | Páginas (frontend, hash) |
|---|---|---|
| Identidade e acesso | `auth`, `users` (inclui roles/permissions) | `#users`, `#roles`, `#profile` |
| Operação diária | `attendances`, `tasks`, `checklists`, `checklist_templates`, `reminders`, `calendar`, `maintenances`, `projects` | `#attendance`, `#tasks`, `#maintenances`, `#projects` |
| Conhecimento | `knowledge`, `commands`, `responses` | `#knowledge`, `#commands` |
| Inventário | `infrastructure` (stores, departments, locations, equipment, licenses, stock) | `#equipment` (abas) |
| Transversal | `attachments`, `search`, `reports`, `dashboard`, `audit`, `automation` | `#files`, `#reports`, `#audit`, `#dashboard`; busca = paleta Ctrl+K |

Relações centrais:

* **Atendimento** → `equipment_id` (opcional), `project_id` (opcional), `knowledge_article_id` (quando convertido em artigo). Referência ao OTRS por `otrs_ticket`/`otrs_url` (nunca substitui o OTRS).
* **Manutenção** ↔ **Equipamento** é N:N (`maintenance_equipment`); `maintenance_records.equipment_id` é legado.
* **Projeto** agrega tarefas, manutenções, atendimentos, checklists, eventos e movimentos de estoque via `project_id` com `ON DELETE SET NULL`.
* **Anexo** é polimórfico (`entity_type` + `entity_id`, ou ambos nulos para "arquivo geral").

## 4. Frontend — navegação e padrões

* **Roteamento por hash**, sem biblioteca: `#modulo?param=valor`. `AuthenticatedView` lê o hash e
  renderiza a página (lazy-loaded). `nav-items.ts` define menu, grupos e permissões.
* **Deep link**: páginas aceitam `#modulo?id=N` para abrir o item (drawer/diálogo). A busca global usa isso.
* **Busca global**: `CommandPalette` (Ctrl+K / botão no topo) consulta `GET /search/global` e navega para `url_tab` + `id`.
* **Paginação**: hook `usePagination` (estado em `?page=&limit=` no hash) + componente `ui/Pagination`.
* **Permissões**: `useAuth().hasPermission(...)`; o backend é a autoridade, o front só esconde ações.

## 5. Serviços transversais (backend)

### 5.1 Autenticação e RBAC
JWT (`SECRET_KEY` via ambiente). Usuário tem N perfis (`user_roles`); perfil tem N permissões.
`Administrador` tem acesso total. Endpoints usam `require_permission("dominio:acao")`.

### 5.2 Auditoria
`record_audit_log` grava em `audit_logs` (imutável) com sanitização de chaves sensíveis.
Histórico técnico de equipamento (`equipment_history`) é separado da auditoria (ver `DOMAIN_RULES.md` §2).

### 5.3 Arquivos e anexos
* O armazenamento físico é estritamente isolado da API através da interface `StorageAdapter`. A implementação padrão é `LocalFileSystemStorage` (diretório persistente configurável, como `/app/uploads`). O banco de dados armazena apenas metadados lógicos e o identificador físico `stored_filename` (`UUID + extensão sanitizada`), sem persistir caminhos absolutos.
* **Upload com Autorização Antecipada**: A autorização contextual do usuário na entidade alvo via `FileAccessService` ocorre antes de qualquer escrita no disco, impedindo consumo indevido de IO e armazenamento. Caso ocorra erro ou falha no commit do registro no PostgreSQL, é executado rollback e limpeza física imediata (`cleanup`) exclusivamente do arquivo recém-gravado.
* **Ciclo de Vida e Soft Delete**: Deleções realizam soft delete (`deleted_at != NULL`), removendo o anexo das listagens e consultas normais da API sem remover o arquivo físico da mídia no momento da requisição. A exclusão física definitiva será delegada a rotinas assíncronas dedicadas de Garbage Collection.
* **Leitura, Download e Preview Contextuais**: Endpoints de leitura de metadados (`GET /{id}`), download (`GET /{id}/download`) e preview (`GET /{id}/preview`) exigem autorização contextual via `FileAccessService` **antes** de qualquer acesso ou verificação de arquivo no `StorageAdapter`. Ter a permissão global `attachment:read` não é suficiente para acessar arquivos de entidades às quais o usuário não tem direito (ex: tarefas privadas, atendimentos de outros técnicos ou artigos em rascunho).
* **Listagem Segura e Filtragem**: `GET /attachments` aplica política de ocultação contextual: se parâmetros de entidade (`entity_type` e `entity_id`) forem fornecidos, o acesso é validado de forma estrita; na listagem geral, cada anexo candidato é validado contextualmente, omitindo registros de entidades inacessíveis. Anexos soft-deleted são automaticamente excluídos de todas as consultas.
* **MIME AllowList e Hardening de Upload (Tarefa 5.1)**: Camada de segurança centralizada (`attachment_security.py`) validando extensões permitidas (documentos, imagens, textos técnicos), rejeitando executáveis/scripts perigosos e arquivos sem extensão. Validação cruzada com o `Content-Type` declarado e inspeção prévia de assinaturas binárias (magic bytes) para prevenir arquivos maliciosos disfarçados. Limite de tamanho configurável via ambiente (`MAX_ATTACHMENT_SIZE_MB`, padrão: 25 MB) com verificação em streaming.
* **Auditoria de Eventos de Ciclo de Vida (Tarefa 5.2)**: A rastreabilidade é integrada ao serviço unificado `record_audit_log` (`backend/app/services/audit.py`), emitindo eventos `attachment.uploaded` e `attachment.deleted`. O registro é executado na camada de roteamento (`attachments.py`) dentro da mesma transação do banco relacional via `flush()` antes de `commit()`. Isso garante atomicidade transacional: caso a persistência falhe, tanto o anexo quanto o log sofrem rollback e a limpeza física no storage é acionada. O soft delete registra o evento mantendo o arquivo físico no storage, sem disparar exclusão física precipitada.
* A autorização é centralizada no `FileAccessService`, baseado no padrão **Registry** (`AttachmentAccessRegistry`). Cada entidade possui um validador contextual dedicado (`ProjectAttachmentValidator`, `TaskAttachmentValidator`, `MaintenanceAttachmentValidator`, `AttendanceAttachmentValidator`, `EquipmentAttachmentValidator`, `KnowledgeAttachmentValidator`) que implementa o contrato `AttachmentAccessValidator`. O acesso exige permissão global RBAC (`attachment:read/upload/delete`) combinada obrigatoriamente com autorização contextual na entidade pai, com política default-deny para tipos desconhecidos.



### 5.4 Automação
Worker assíncrono no `lifespan` da API (a cada 60 min) gera alertas como registros de `Reminder`
(tarefas vencendo, manutenções agendadas, equipamentos com falhas recorrentes), com idempotência.
Disparo manual: `POST /automation/trigger`.

## 6. Futuro (não implementado)

* **Cofre de senhas**: domínio isolado, AES-256-GCM, chave mestra só em variável de ambiente, auditoria `PASSWORD_REVEAL` (ver `DECISIONS.md`).
* **Integração OTRS**: só após confirmar API disponível.
