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
- Motor global utilizando Full Text Search nativo do PostgreSQL.
- Filtros por loja, equipamento, tipo, tags ou técnico.
**Checkpoints:**
- [ ] Criação dos índices Full Text no PostgreSQL.
- [ ] Tela central de busca no Frontend.
- [ ] Testes de performance nas buscas.

---

## Fase 12 — Auditoria e Segurança
**Entregas principais:**
- Controle avançado e trilhas de auditoria.
- Planejamento e revisão de arquitetura de segurança para o futuro **Cofre de Senhas** (armazenamento de senhas sem logs/texto puro, com criptografia adequada).
- Entidades: `audit_logs`.
- Funcionalidades: Logs automáticos de alterações sensíveis, bloqueio de soft-deletes onde aplicável e revisão robusta de regras no backend.
**Checkpoints:**
- [ ] Revisão arquitetural documentada em `DECISIONS.md` para o Cofre.
- [ ] Implementação de middlewares de auditoria.
- [ ] Revisão geral de proteção de rotas e segurança (backend).

---

## Fase 13 — Automação
**Entregas principais:**
- Regras internas reativas (lembretes de tarefas, alertas pontuais).
**Checkpoints:**
- [ ] Tarefas assíncronas/cron jobs (ex: via Celery ou APScheduler) para enviar lembretes aos técnicos ou gerar alertas.

---

## Fase 14 — Integrações Futuras
**Entregas principais:**
- Integração via API ao OTRS, Active Directory, LDAP, ou outros sistemas (UniFi, pfSense).
- *Nota: Somente implementar após viabilidade técnica confirmada e justificada.*
**Checkpoints:**
- [ ] Estudo de viabilidade técnica da integração desejada.
- [ ] Documentação da decisão no `DECISIONS.md`.

---

## Fase 15 — Polimento
**Entregas principais:**
- Ajustes finos do MVP antes de estabilização.
- Consolidação visual final, UX, acessibilidade, performance e consistência geral.
**Checkpoints:**
- [ ] Revisão profunda de UX e acessibilidade (`prefers-reduced-motion`, contraste).
- [ ] Cobertura de testes e correções finais de performance.
- [ ] Atualização final da documentação corporativa.
