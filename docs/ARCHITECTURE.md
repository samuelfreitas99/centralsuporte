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
* Deleções realizam soft delete (`deleted_at`), preservando a consistência transacional e mantendo os arquivos físicos para futura rotina assíncrona de Garbage Collection. A autorização contextual é centralizada no `FileAccessService`.

## 4. Evolução do Dashboard
* O Dashboard abandonará as "queries isoladas aleatórias" e passará a consumir um `DashboardService` que unificará KPIs de "Início de Turno" (Agenda do Dia, Tarefas Atrasadas, Licenças Vencendo nos próximos 7 dias).

## 5. Evolução da Agenda
* Passará de uma lista isolada para um calendário consolidado de turnos/squad. Terá integração visual com manutenções agendadas de infraestrutura.
