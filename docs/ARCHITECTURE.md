# ARCHITECTURE — Central de Suporte

A Central de Suporte é desenhada sobre um monolito ágil no backend (FastAPI) e uma SPA moderna no frontend (React). Esta arquitetura descreve como os domínios se comunicam e se separam.

## 1. Princípios Arquiteturais Base
* **Frontend:** SPA (Single Page Application) servida pelo Vite, baseada em React e Tailwind CSS. Composição modular via shadcn/ui.
* **Backend:** FastAPI (Python) com SQLAlchemy 2.0 assíncrono.
* **Banco de Dados:** PostgreSQL relacional.

## 2. Separação de Módulos e Domínios
O sistema evita o modelo de "uma grande teia de aranha" mantendo limites contextuais claros (Bounded Contexts):
* **Domain: Auth & Identity:** Gere usuários e RBAC.
* **Domain: Infrastructure:** Gere equipamentos, redes, estoques e licenças. (Independe do domínio de tarefas).
* **Domain: Operations (Produtividade):** Gere Projetos, Tarefas, Lembretes e Agendas.
* **Domain: Knowledge & Core:** O coração da Central (Atendimentos internos, Base de conhecimento, Comandos).
* **Cross-Cutting:** Auditoria, Storage (Arquivos), Motor de Busca.

## 3. Como os novos módulos se integram (Pós-MVP)

### Projetos Operacionais
* Funcionará como a camada hierárquica superior no domínio de `Operations`. Uma `Task` ou um `Attendance` poderão ter um `project_id` opcional. O Projeto agregará visualmente (dashboard próprio do projeto) as tarefas atreladas.

### Cofre de Senhas
* Pertencerá a um domínio de infraestrutura altamente isolado. Terá sua própria suíte de injeção de dependências para gerenciar a Chave de Criptografia Mestra (que ficará estritamente em `.env` do SO, nunca hardcoded).

### Camada de Storage e Arquivos (Fase 12)
* O armazenamento físico é estritamente isolado da API através da interface `StorageAdapter`. A implementação padrão é `LocalFileSystemStorage` (diretório persistente configurável, como `/app/uploads`). O banco de dados armazena apenas metadados lógicos e o identificador físico `stored_filename` (`UUID + extensão sanitizada`), sem persistir caminhos absolutos.
* **Upload com Autorização Antecipada**: A autorização contextual do usuário na entidade alvo via `FileAccessService` ocorre antes de qualquer escrita no disco, impedindo consumo indevido de IO e armazenamento. Caso ocorra erro ou falha no commit do registro no PostgreSQL, é executado rollback e limpeza física imediata (`cleanup`) exclusivamente do arquivo recém-gravado.
* **Ciclo de Vida e Soft Delete**: Deleções realizam soft delete (`deleted_at != NULL`), removendo o anexo das listagens e consultas normais da API sem remover o arquivo físico da mídia no momento da requisição. A exclusão física definitiva será delegada a rotinas assíncronas dedicadas de Garbage Collection.
* **Leitura, Download e Preview Contextuais**: Endpoints de leitura de metadados (`GET /{id}`), download (`GET /{id}/download`) e preview (`GET /{id}/preview`) exigem autorização contextual via `FileAccessService` **antes** de qualquer acesso ou verificação de arquivo no `StorageAdapter`. Ter a permissão global `attachment:read` não é suficiente para acessar arquivos de entidades às quais o usuário não tem direito (ex: tarefas privadas, atendimentos de outros técnicos ou artigos em rascunho).
* **Listagem Segura e Filtragem**: `GET /attachments` aplica política de ocultação contextual: se parâmetros de entidade (`entity_type` e `entity_id`) forem fornecidos, o acesso é validado de forma estrita; na listagem geral, cada anexo candidato é validado contextualmente, omitindo registros de entidades inacessíveis. Anexos soft-deleted são automaticamente excluídos de todas as consultas.
* A autorização é centralizada no `FileAccessService`, baseado no padrão **Registry** (`AttachmentAccessRegistry`). Cada entidade possui um validador contextual dedicado (`ProjectAttachmentValidator`, `TaskAttachmentValidator`, `MaintenanceAttachmentValidator`, `AttendanceAttachmentValidator`, `EquipmentAttachmentValidator`, `KnowledgeAttachmentValidator`) que implementa o contrato `AttachmentAccessValidator`. O acesso exige permissão global RBAC (`attachment:read/upload/delete`) combinada obrigatoriamente com autorização contextual na entidade pai, com política default-deny para tipos desconhecidos.


## 4. Evolução do Dashboard
* O Dashboard abandonará as "queries isoladas aleatórias" e passará a consumir um `DashboardService` que unificará KPIs de "Início de Turno" (Agenda do Dia, Tarefas Atrasadas, Licenças Vencendo nos próximos 7 dias).

## 5. Evolução da Agenda
* Passará de uma lista isolada para um calendário consolidado de turnos/squad. Terá integração visual com manutenções agendadas de infraestrutura.
