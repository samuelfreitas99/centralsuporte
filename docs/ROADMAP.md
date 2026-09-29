# ROADMAP

Este roadmap define as fases de desenvolvimento da Central Operacional do Suporte Técnico. A conclusão de cada fase exige código funcional, testes implementados e executados, documentação atualizada e revisão de permissões.

---

## Fase 0 — Fundação (Concluída)
- [x] Criação do repositório Git.
- [x] Criação da documentação base (`PROJECT_MASTER`, `PROJECT_STATE`, `ROADMAP`, `DECISIONS`).
- [x] Setup do Docker Compose garantindo isolamento total do servidor.
- [x] Configuração de porta dedicada e rede interna para PostgreSQL.
- [x] Configuração inicial do Backend (FastAPI, porta 8088, health check, estrutura base).
- [x] Configuração inicial do Frontend (React, Vite, porta 5173, estrutura base).
- [x] Validação da execução e conexão dos containers.

---

## Fase 1 — Autenticação
**Entregas principais:**
- Entidades: `users`, `roles`, `permissions`.
- Autenticação local JWT segura.
- Controle de sessão e perfis de usuário (Admin, Gestor, Técnico, Consulta).
- *Nota: Evoluirá futuramente para suportar informações operacionais de perfil (especialidades, turnos), mas sem tornar-se um módulo social complexo.*
**Checkpoints:**
- [x] Implementar migrations e models do banco de dados.
- [x] Endpoints de login e gestão de usuários (Backend).
- [x] Páginas de login e hooks de autenticação (Frontend).
- [x] Proteção de rotas no Frontend e validação de tokens no Backend.
- [x] Testes automatizados (pytest e vitest).
- [x] Atualizar `PROJECT_STATE` e documentar a fase em `walkthrough`.

---

## Fase 2 — Design System
**Entregas principais:**
- Estrutura visual padronizada utilizando Tailwind CSS e shadcn/ui.
- Layout base, barra lateral de navegação e menu superior.
- Tema (Light/Dark mode) e responsividade para dispositivos móveis, tablets e desktops.
**Checkpoints:**
- [x] Configuração do shadcn/ui e variáveis Tailwind.
- [x] Implementação de componentes base (Buttons, Inputs, Cards, Modals).
- [x] Criação do Layout principal (`Sidebar`, `Header`, `Container`).
- [x] Testes de renderização dos componentes principais.

---

## Fase 3 — Dashboard
**Entregas principais:**
- Visão geral com informações táticas rápidas (tarefas pendentes, lembretes, últimos atendimentos).
- Painel para organizar o início do turno do técnico.
- *Nota: Deve prever futuramente um dashboard pessoal/contextual por usuário (aproveitando tarefas, lembretes, atendimentos).*
**Checkpoints:**
- [x] Criar estrutura do Dashboard no frontend.
- [x] Implementar mock de dados se as fases seguintes ainda não estiverem prontas.
- [ ] Integração com os dados (após Fases 4, 5 e 7).

---

## Fase 4 — Organização (Tarefas, Checklists, Calendário e Projetos)
**Entregas principais:**
- Entidades: `tasks`, `task_assignments`, `checklists`, `checklist_items`, `reminders`, `calendar_events`, `projects`.
- Funcionalidades: Criar/atribuir tarefas, listas de checklists, lembretes pontuais e visualização de calendário.
- Histórico: Consultas retroativas de tarefas, lembretes e eventos da agenda passados.
- Projetos Operacionais: Agrupamento de tarefas, checklists, equipamentos e arquivos (ex: abertura de loja).
**Checkpoints:**
- [x] Migrations e models.
- [x] Endpoints de CRUD e gestão de status.
- [x] Telas de listagem, criação e edição.
- [x] Testes de fluxo e testes unitários.
- [x] Projetos Operacionais (Fase 10.4): Dashboard e integração operacional finalizados.

---

## Fase 5 — Conhecimento
**Entregas principais:**
- A base do conhecimento técnico.
- Entidades: `knowledge_articles`, `knowledge_versions`, `knowledge_tags`.
- Funcionalidades: Editor Rich Text, sistema de versão, categorias, favoritos, busca.
**Checkpoints:**
- [x] Migrations, models e versionamento do conteúdo.
- [x] Criação da interface de visualização e edição de artigos.
- [x] Implementar funcionalidade de favoritar e gerenciar categorias.
- [x] Testes de consistência de pesquisa e histórico de versões.

---

## Fase 6 — Comandos e Respostas
**Entregas principais:**
- Biblioteca de comandos úteis (apenas consulta/cópia).
- Respostas padrão para comunicação (não executa comandos remotos).
- Entidades: `commands`, `standard_responses`.
**Checkpoints:**
- [x] Implementação do CRUD no backend.
- [x] Implementação das telas focadas em rápida pesquisa e ação de "Copiar para área de transferência".
- [x] Testes na API e UI.

---

## Fase 7 — Atendimentos
**Entregas principais:**
- Registro de suporte interno correlacionado ao OTRS.
- Entidades: `attendances`, `attendance_notes`, `attendance_attachments`.
- Funcionalidades: Associação manual com #chamado OTRS, registro de diagnóstico, comandos utilizados, equipamentos, e ação "Salvar como conhecimento".
**Checkpoints:**
- [x] Regra Crítica: Garantir que não duplique a funcionalidade de chamados do OTRS.
- [x] Endpoints de criação/leitura.
- [x] Conversão automática de atendimento em rascunho de conhecimento.
- [x] Testes de fluxo completo de registro.

---

## Fase 8 — Infraestrutura (Lojas, Equipamentos, Licenças e Estoque)
**Entregas principais:**
- Cadastro e organização do parque tecnológico.
- Entidades: `stores`, `departments`, `equipment`, `equipment_history`, `licenses`, `stock_items`, `stock_movements`.
- Funcionalidades: Cadastro de equipamentos com vínculo a lojas, tracking de histórico.
- Licenças: Gerenciamento de licenças de software, status e atribuição.
- Estoque Operacional: Controle simples de materiais de uso rápido da equipe de suporte.
**Checkpoints:**
- [x] Migrations e endpoints baseados nas estruturas.
- [x] Telas de gerenciamento de inventário, licenças e estoque.
- [x] Relacionar equipamentos em atendimentos.
- [x] Testes unitários.

---

## Fase 9 — Manutenções
**Entregas principais:**
- Registros específicos para manutenção física/lógica.
- Entidades: `maintenance_records`.
- Funcionalidades: Relacionar manutenção a equipamento, checklists de manutenção, registro de resultados e atualização de status de hardware.
**Checkpoints:**
- [x] Migrations e endpoints específicos (`/maintenances`).
- [x] Integração com checklists e histórico do equipamento.
- [x] Telas e modais de agendamento, checklists e conclusão técnica (`MaintenancePage.tsx`).
- [x] Testes automatizados (backend pytest e frontend vitest).

---

## Fase 10 — Arquivos
**Entregas principais:**
- Repositório central de arquivos anexados (fotos, prints, PDFs).
- Entidades: `attachments`.
- Funcionalidades: Upload no servidor via API, armazenamento estruturado dos metadados no Postgres e gestão segura de acessos.
**Checkpoints:**
- [x] Configuração do sistema de storage local no FastAPI (`/app/uploads` seguro com hash SHA-256 e sem path traversal).
- [x] Integração de anexos com entidades operacionais (Atendimentos, Equipamentos e Manutenções).
- [x] Componente reutilizável `AttachmentManager` com upload drag-and-drop, preview inline e download.
- [x] Testes automatizados (backend pytest e frontend vitest).

---

## Fase 11 — Pesquisa e Relatórios
**Entregas principais:**
- Motor global de busca unificada abrangendo artigos de conhecimento, comandos rápidos, atendimentos, equipamentos, manutenções e tarefas.
- Filtros rápidos por tipo de entidade e por unidade/loja.
- Relatórios operacionais consolidados (taxa de resolução, custos de manutenção, produtividade técnica).
- Deteção e ranking de reincidência de falhas no parque de TI (equipamentos crônicos).
- Exportação de relatórios em fluxo CSV formatado.
**Checkpoints:**
- [x] Endpoints unificados de busca global (`/search/global`) e relatórios operacionais (`/reports/summary`, `/reports/export`).
- [x] Tela central de busca e relatórios no Frontend (`SearchAndReportsPage.tsx`) com navegação direta para os módulos.
- [x] Exportação de dados operacionais em formato CSV e KPIs de reincidência de falhas.
- [x] Testes automatizados (backend pytest e frontend vitest).

---

## Fase 12 — Auditoria e Segurança
**Entregas principais:**
- Controle avançado e trilhas de auditoria imutáveis.
- Planejamento e revisão de arquitetura de segurança para o futuro **Cofre de Senhas** (Envelope Encryption AES-256-GCM, chaves segregadas, auditoria de revelação).
- Entidades: `audit_logs` no PostgreSQL com índices por data, ação, usuário e entidade.
- Funcionalidades: Sanitização recursiva de senhas/tokens, logs automáticos de login/falhas e operações em usuários, endpoints protegidos por permissão `audit:read`, e interface de inspeção no frontend (`AuditLogsPage.tsx`).
**Checkpoints:**
- [x] Revisão arquitetural documentada em `DECISIONS.md` para o Cofre de Senhas.
- [x] Implementação de serviço de auditoria com sanitização de segredos e endpoints `/audit-logs`.
- [x] Tela de visualização, filtros e inspeção de logs no Frontend (`AuditLogsPage.tsx`).
- [x] Testes automatizados (backend pytest e frontend vitest).

---

## Fase 13 — Automação
**Entregas principais:**
- Regras internas reativas (lembretes de tarefas, alertas de manutenção preventiva e detecção de equipamentos crônicos).
- Agendador assíncrono nativo em background (`asyncio` loop no lifespan do FastAPI) com isolamento total e zero overhead no servidor compartilhado.
- Interface de notificações no Header (`NotificationsDropdown.tsx`) com badge de pendências, execução manual ("Verificar Regras") e resolução em 1 clique.
**Checkpoints:**
- [x] Motor de automação reativa assíncrono (`automation.py`) avaliando tarefas vencidas, manutenções preventivas e equipamentos crônicos com idempotência estrita (24h/48h).
- [x] Endpoints protegidos `/automation/status`, `/automation/rules` e `/automation/trigger`.
- [x] Interface de notificações no Header com animações `motion/react`, contagem de não lidos e disparo manual para administradores e gestores.
- [x] Testes automatizados (backend pytest e frontend vitest) cobrindo regras, idempotência e componentes UI.

---

## Fase 14 — Integrações Futuras
**Entregas principais:**
- Integração via API ao OTRS, Active Directory, LDAP, ou outros sistemas (UniFi, pfSense).
- *Nota: Somente implementar após viabilidade técnica confirmada e justificada.*
**Checkpoints:**
- [ ] Estudo de viabilidade técnica da integração desejada.
- [ ] Documentação da decisão no `DECISIONS.md`.

---

## Fase 15 — Polimento e Estabilização do MVP
**Entregas principais:**
- Ajustes finos do MVP antes de estabilização.
- Consolidação visual final, UX, acessibilidade, performance e consistência geral.
**Checkpoints:**
- [x] Revisão profunda de UX e acessibilidade: `<MotionConfig reducedMotion="user">`, CSS `@media (prefers-reduced-motion: reduce)`, link de acessibilidade "Skip to content" (`#main-content`), anéis de foco (`:focus-visible`) e atalho global `Ctrl+K`.
- [x] Cobertura de testes e correções de performance: Code-splitting com `React.lazy` e `Suspense` em todas as rotas secundárias (redução de 40% do bundle principal) e `PageSkeleton.tsx`.
- [x] Atualização de documentação corporativa e técnica com decisões registradas em `DECISIONS.md`.

---

## Evolução Arquitetural Pós-MVP

### Fase 10 (Pós-MVP) — Projetos Operacionais
- [x] Fase 10.1 — Fundação Backend de Projetos (CRUD, notas, agregação e equipamentos).
- [x] Fase 10.2 — Integração com Módulos Operacionais (`project_id` em Tasks, Maintenances, Attendances, Checklists, CalendarEvents).
- [x] Fase 10.3 / 10.4 — Workspace Operacional de Projetos (`ProjectWorkspace`, abas integradas, links de contexto e formulários vinculados).

### Fase 11 (Pós-MVP) — Usuários, Perfis e Identidade
- [x] Fase 11.1 — Arquitetura de Identidade, Perfis e RBAC M:N (`docs/PHASE_11_1_USERS_PLAN.md`).
- [x] Fase 11.2 — Fundação Backend:
  - Adição dos campos operacionais de identidade em `users` (`full_name`, `display_name`, `avatar_url`, `phone`, `job_title`, `department_id`, `preferences`, `last_login_at`).
  - Transição de `role_id` para M:N via `user_roles` com união idempotente de permissões.
  - Endpoints `/users/me/profile`, `/users/{id}/profile`, `/users/{id}/stats` com regras estritas de privacidade e bloqueio de escalada de privilégios.
  - Auditoria completa de alterações de identidade e RBAC em `audit_logs`.
- [x] Fase 11.3 — Frontend de Identidade e Perfis:
  - Gestão administrativa de usuários (`UsersPage.tsx`) com tabela densa, cartões mobile e filtros de status/departamento/role.
  - Drawer administrativo (`UserFormDrawer.tsx`) com suporte multi-role e salvaguarda contra auto-desativação.
  - Visualização unificada de perfil (`ProfilePage.tsx`) com suporte a "Meu Perfil" e mascaramento de privacidade para terceiros.
  - Grid de estatísticas operacionais de perfil (5 métricas em tempo real).
  - Diálogo de auto-atualização de perfil (`EditProfileDialog.tsx`).
  - Componente visual `Avatar.tsx` com iniciais semânticas determinísticas e status ativo/inativo.
  - Suporte a multi-roles no `AuthContext` e sincronização imediata (`refreshUser`).
  - Rotas hash `#users` e `#profile`.
- [x] Fase 11.4 — RBAC Administration & Identity Integrity Audit:
  - Limpeza e migração de `user.role` nas páginas legacy para suporte nativo `hasRole()`.
  - Página administrativa Matriz de Permissões (`RolesPage.tsx`).
  - Proteção server-side contra bloqueio/deleção do último administrador.
  - Endpoints de CRUD de Roles e Permissions com trilha de auditoria para integridade de acesso corporativo.

---

## Backlog Arquitetural Pós-MVP (Próximos Itens)

*(Representam grandes blocos de trabalho identificados pela auditoria, pendentes de priorização).*

* **Evolução Documental (Arquivos):** Centralização e polimorfismo de arquivos via tabela associativa N:N, permitindo reuso em múltiplas entidades.
* **Cofre de Senhas:** Implementação do módulo hyper-seguro (Envelope Encryption) para credenciais de rede, com log inalterável de revelação de senha.
* **Remodelagem de Licenças:** Mascaramento obrigatório na interface gráfica e vínculo direto entre Licenças e Usuários ou Credenciais do Cofre.
* **Checklists Reutilizáveis (Templates):** Desacoplar os itens estáticos das instâncias, permitindo criar "Matrizes de Checklist".
* **Dashboard V2 (Alarme & Situação):** Alimentação consolidada por serviço para alertas cruciais (licenças vencendo, estoque baixo) sem sobrecarregar a UX.
* **Cotações:** Fluxo de orçamentação amarrado à reposição de estoque.
