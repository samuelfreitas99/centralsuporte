# AUDITORIA PROFUNDA DE INVENTÁRIO FUNCIONAL E ARQUITETURA

**Projeto:** Central Operacional do Suporte Técnico (Central de Suporte)  
**Data da Auditoria:** 2026-09-25  
**Foco:** Inventário Real, Matriz Funcional, Cruzamento Frontend x Backend x Banco.

---

## 1. Resumo Executivo
Esta auditoria analisa a implementação real do MVP da Central de Suporte. Diferente da auditoria de UX, esta avaliação destrinchou o código fonte do frontend e do backend, identificando lacunas arquiteturais, duplicidades de conceitos e o real estado de maturidade de cada módulo frente ao que foi especificado ou subentendido nos requisitos.

## 2. Inventário de Telas (Frontend)

1. **DashboardPage.tsx** (`/`)
   - **Objetivo:** Visão panorâmica tática.
   - **Funcionalidades:** Métricas de tarefas/lembretes, lista rápida de atendimentos.
   - **Componentes:** DashboardHeader, MetricCard, TaskListSection, QuickKnowledgeSection.
2. **AttendancePage.tsx** (`/attendances`)
   - **Objetivo:** Registro de atendimentos paralelos ao OTRS.
   - **Modais:** Criação/Edição, Inserir Nota.
3. **TasksPage.tsx** (`/tasks`)
   - **Objetivo:** Tarefas de equipe, checklists, lembretes e calendário.
   - **Modais:** TaskDetailDialog, TaskFormDialog.
4. **CommandsPage.tsx** (`/commands`)
   - **Objetivo:** Comandos de terminal e respostas padrão.
5. **InfrastructurePage.tsx** (`/infrastructure`)
   - **Objetivo:** Inventário de equipamentos, lojas, licenças e estoque.
   - **Modais:** Gerenciamento de equipamento, atribuição de licenças, movimentação de estoque.
6. **KnowledgePage.tsx** (`/knowledge`)
   - **Objetivo:** Base de conhecimento.
   - **Modais:** ArticleViewDialog, ArticleFormDialog, CategoryManagementDialog.
7. **MaintenancePage.tsx** (`/maintenance`)
   - **Objetivo:** Manutenções preventivas/corretivas.
8. **SearchAndReportsPage.tsx** (`/search`)
   - **Objetivo:** Pesquisa global via Ctrl+K e relatórios de métricas.
9. **AuditLogsPage.tsx** (`/audit`)
   - **Objetivo:** Trilha de auditoria das ações do sistema.
10. **LoginPage.tsx** (`/login`)

## 3. Inventário de Rotas (Backend)

- `/auth` e `/users`: Gestão de JWT e credenciais.
- `/tasks`: CRUD de tarefas e atribuições.
- `/checklists`: Gerenciamento de itens de checklist.
- `/reminders`: CRUD de lembretes.
- `/calendar`: CRUD de eventos do calendário.
- `/knowledge`: Artigos, categorias, versões e tags.
- `/commands` e `/responses`: Comandos rápidos e respostas padrão.
- `/attendances`: Atendimentos e notas.
- `/infrastructure`: Agrupa roteadores para `stores`, `departments`, `equipment`, `licenses`, `stock_items` e `stock_movements`.
- `/maintenances`: Registros de manutenção.
- `/attachments`: Upload/Download de arquivos genéricos vinculados a entidades.
- `/search` e `/reports`: Buscas cruzadas e métricas.
- `/audit`: Leitura da trilha de auditoria.

## 4. Inventário de Componentes (Frontend Relevantes)
- **Layout:** `Sidebar`, `Header`, `NotificationsDropdown`, `AppLayout`, `Container`.
- **UI Base:** `button`, `input`, `card`, `dialog`, `badge`, `Toast`, `skeleton`.
- **Específicos:** `AttachmentManager` (upload de arquivos), `ArticleFormDialog` (com editor), `TaskDetailDialog`.

## 5. Inventário de Endpoints (Visão Macro)
Cada módulo principal possui operações `GET` (listar com paginação/filtros), `GET /{id}` (detalhes), `POST` (criação), `PUT/PATCH` (atualização), `DELETE` (exclusão, geralmente física ou em cascata, não soft delete explícito generalizado). Endpoints extras incluem ativação/inativação e mudança de status.

## 6. Mapa de Entidades (Banco de Dados / Models)

- **Permission & Role & User:** Sistema de autenticação (Usuários sem perfil "operacional" denso, apenas Role genérico).
- **Task & Checklist & ChecklistItem & Reminder & CalendarEvent:** O ecossistema de produtividade pessoal/equipe.
- **KnowledgeCategory & Tag & Article & Version:** Base de conhecimento com versionamento real (KnowledgeVersion).
- **Command & StandardResponse:** Facilitadores de texto e terminal.
- **Attendance & AttendanceNote:** O core complementar ao OTRS.
- **Store & Department:** Agrupadores geográficos/lógicos de infraestrutura.
- **Equipment & EquipmentHistory:** O maquinário em si e sua trilha de vida.
- **License & LicenseAssignment:** Licenças e associação a equipamentos.
- **StockItem & StockMovement:** Estoque quantitativo focado em suprimentos/periféricos.
- **MaintenanceRecord:** Eventos de manutenção de equipamentos.
- **Attachment:** Entidade polimórfica para arquivos (vincula-se via `entity_type` e `entity_id`).
- **AuditLog:** Tabela genérica para rastreio imutável.

*(Observação: Soft delete nativo não está amplamente implementado nos models, a maioria depende de `ondelete="CASCADE"`).*

---

## 7. Matriz Funcional

| Módulo | Funcionalidade | Existe? | Onde fica | Frontend | Backend | Banco | Permissão | Estado |
|---|---|---|---|---|---|---|---|---|
| **Atendimentos** | Registro | Sim | `/attendances` | Sim | Sim | Sim | Sim | Completo |
| **Infraestrutura** | Equipamentos | Sim | `/infrastructure` | Sim | Sim | Sim | Sim | Completo |
| **Tarefas** | Gestão Equipe | Sim | `/tasks` | Sim | Sim | Sim | Sim | Completo |
| **Projetos** | Gestão | **Não** | - | Não | Não | Não | Não | **AUSENTE** |
| **Licenças** | Gestão | Parcial | `/infrastructure` | Sim | Sim | Sim | Sim | Parcial (ver item 9) |
| **Cofre/Senhas** | Gestão de Secrets| **Não** | - | Não | Não | Não | Não | **AUSENTE** |
| **Arquivos** | Storage | Parcial | Embutido (Modais)| Sim | Sim | Sim | Sim | Parcial (ver item 12) |
| **Estoque** | Consumíveis | Sim | `/infrastructure` | Sim | Sim | Sim | Sim | Completo |
| **Cotações** | Compras | **Não** | - | Não | Não | Não | Não | **AUSENTE** |

---

## 8. Mapa de Telas x Funcionalidades

| Funcionalidade | Tela principal | Outras telas | Duplicação | Local recomendado |
|---|---|---|---|---|
| Lembretes | TasksPage | DashboardPage | UI parcial | TasksPage (abas) |
| Calendário | TasksPage | - | Nenhuma | TasksPage (abas) |
| Checklists | TasksPage | MaintenancePage | Nível domínio | Depende do uso |
| Histórico | InfrastructurePage | MaintenancePage | Nível domínio | Aba específica em Equipamento |

---

## 9. LICENÇAS — Auditoria Profunda

As licenças atualmente ficam "escondidas" como uma aba dentro de `InfrastructurePage.tsx`.

- **Onde está:** Rota `/infrastructure`, entidade `License` e `LicenseAssignment`.
- **Campos:** `name`, `license_type` (perpetua, saas, oem), `vendor`, `license_key`, `total_seats`, `cost`, `expiration_date`, `status`, `notes`.
- **Chave Completa:** Sim, `license_key` armazena a chave integralmente no banco em plain text (String).
- **Exibição:** Frontend renderiza na tabela sem máscara de segurança forte.
- **Cópia de Chave:** Disponível apenas via seleção manual de texto, sem botão nativo "Copiar secreto".
- **Proteção de Acesso:** Usa as permissões gerais da rota, sem restrição adicional para ver chaves.
- **Associações permitidas:** Apenas a `Equipment` via `LicenseAssignment` (`equipment_id`). A coluna `assigned_to` é uma string livre, não é ForeignKey para usuário. Não associa a Loja/Departamento diretamente.
- **Falta:** Histórico de licenciamento (movimentação de chave), associação real a conta de usuário (`User`), importação em lote, mascaramento de segurança.

## 10. COFRE DE SENHAS (PASSWORD VAULT)

**Status Geral:** **AUSENTE.**
- Entidade, banco, backend, endpoint, CRUD, página, componente: **Tudo Ausente.**
- Não há sistema para guardar senhas de servidores, painéis, Wi-Fi ou chaves de API.

## 11. USUÁRIOS E PERFIS

- **O que existe hoje:** Um sistema de "Usuário para autenticação".
- **Entidades:** `User`, `Role`, `Permission`.
- **O que falta:** Perfil operacional real (cargo técnico, equipe/squad, foto de avatar, dashboard analítico individual, estatísticas pessoais na visão de perfil). A visão de "minhas ações" é misturada com o log genérico.

## 12. ARQUIVOS E DOCUMENTOS

- **Status Geral:** Existe a entidade `Attachment` e o backend gerencia arquivos (armazenamento local/file path), mas **NÃO EXISTE UM MÓDULO CENTRAL**.
- **Onde aparecem:** Como componentes inseridos nos modais de Conhecimento, Atendimento e Tarefas (`AttachmentManager.tsx`).
- **Problemas:** Arquivos não são pesquisáveis globalmente, não possuem tela própria de "Biblioteca de Arquivos", dependem estritamente da entidade pai (`entity_type` e `entity_id`).

## 13. PROJETOS OPERACIONAIS

**Status Geral:** **AUSENTE.**
- Não existe conceito de "Projeto" para agrupar tarefas complexas que envolvem equipamentos, viagens, múltiplas tarefas e múltiplos técnicos (ex: "Migração da Loja 05").

## 14. AGENDA, LEMBRETES E HISTÓRICO

- **Agenda/Calendário:** Existe (`CalendarEvent`), fica isolado dentro da aba em `TasksPage`. É um simples CRUD de eventos com data início/fim. Não amarra equipamentos ou chamados diretamente.
- **Lembretes:** Entidade `Reminder`, simples alarme de data. Fica solto na aba de tarefas e aparece no dashboard.
- **Histórico:** Entidade `EquipmentHistory` (exclusiva de equipamentos) e `AuditLog` (global, mas técnico demais). Não há histórico de tarefas, por exemplo.

## 15. CHECKLISTS

- Existe de forma forte (`Checklist` e `ChecklistItem`).
- Podem ser vinculados a `Task` (tarefas) ou `MaintenanceRecord` (manutenções).
- **Problema:** Não são reutilizáveis (Templates). Cada checklist é recriado do zero para cada tarefa/manutenção.

## 16. EQUIPAMENTOS E INFRAESTRUTURA

- Completo em relação a campos principais (MAC, IP, Hostname).
- Relaciona-se com `Store` e `Department`.
- Falta relacionamento lógico direto com Arquivos (ex: upload de nota fiscal de compra de um equipamento específico no card do equipamento).

## 17. ESTOQUE OPERACIONAL

- Entidade `StockItem` (inventário quantitativo: mouses, cabos).
- Entidade `StockMovement` (entrada, saída, transferência).
- **Problema:** Não conversa fortemente com cotação/compra, apenas controle de consumo.

## 18. COTAÇÕES E COMPRAS

**Status Geral:** **AUSENTE.**
- Nenhuma funcionalidade de controle de orçamento ou solicitações de compra de equipamentos/licenças.

## 19. EDITORES

- **Textareas:** Usado em quase todo o sistema (descrições, notas internas).
- **Problema:** Base de conhecimento (`KnowledgePage`) parece usar `Text` simples (com Markdown via frontend), mas o sistema carece de um editor Rich Text padronizado com upload inline de imagens, essencial para criar bons tutoriais.

## 20. DASHBOARD (Auditoria Funcional)

**O que aparece:**
- Tarefas Pendentes, Em andamento, Lembretes, Atendimentos recentes.
- Conhecimentos recentes.
**O que NÃO aparece mas deveria:**
- Notificações de Licenças vencendo.
- Alertas de estoque mínimo atingido (`is_low_stock` de `StockItem`).
- Manutenções agendadas para o dia (`MaintenanceRecord`).
- Equipamentos inativos há X dias.

## 21. DUPLICAÇÕES

1. **Ações de Lembrete:** O Dashboard exibe lembretes e a aba Tasks também. O fluxo de dar "Baixa" ocorre nos dois.
2. **Atendimentos e Notas:** O OTRS possui histórico, a Central também (duplicidade cognitiva, se o técnico registrar nas duas plataformas).

## 22. RECURSOS MAL LOCALIZADOS

1. **Licenças:** Estar dentro de Infraestrutura faz sentido, mas licenças de software (ex: Adobe, Office 365) nem sempre se vinculam a hardware. Licenças deveriam ser um módulo primário (ou sub-módulo de Gestão de Ativos Lógicos).
2. **Calendário:** Estar agrupado com Tarefas limita seu uso para, por exemplo, visualizar escalas de técnicos ou grandes manutenções preventivas (que ficam em `MaintenancePage`).

## 23. FLUXOS (Análise Rápida)

- **Criar Tarefa:** Rápido.
- **Atendimento + Conhecimento:** Fluxo excepcional. Há botão de converter atendimento em artigo, minimizando fricção e evitando retrabalho.

---

## 24. RECURSOS INCOMPLETOS E AUSENTES (Resumo)

- **Ausentes:** Cofre de Senhas, Módulo de Projetos, Módulo de Compras/Cotações, Templates de Checklists.
- **Incompletos:** Licenças (chaves descriptografadas, sem vínculo direto a usuários via ForeignKey), Arquivos (polimorfismo fraco sem centralização).

## 25. DECISÕES QUE PRECISAM SER TOMADAS (PRÓXIMOS PASSOS)

Para as próximas fases e antes de alterar o `PRODUCT_SPEC.md`, a gestão precisará decidir:

1. **Módulo Projetos:** O suporte realmente cria "Projetos" ou apenas Tarefas Complexas? Adicionar projetos muda radicalmente a arquitetura (exigirá relacionar tarefas, orçamentos, arquivos a projetos).
2. **Cofre de Senhas:** Vamos implementar um cofre com criptografia real (Fernet/AES) no banco, gerenciar chaves de criptografia e master passwords, ou usaremos integrações externas?
3. **Licenças:** Vamos criar máscara de segurança e controle rigoroso de acesso para quem visualiza a chave real das licenças?
4. **Arquivos (Biblioteca):** O sistema precisará de uma tela unificada de "Arquivos da TI" ou continuarão apenas anexados no fundo de chamados/tarefas?
5. **Dashboard V2:** Aprova-se a inclusão de alertas críticos no dashboard (Estoque baixo, Licenças expirando, Manutenções do dia)?

---
**Fim da Auditoria Funcional e de Arquitetura.**
(Nenhuma alteração de código ou funcionalidade foi realizada).
