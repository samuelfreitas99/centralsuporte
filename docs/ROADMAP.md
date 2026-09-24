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
- [ ] Criação do Layout principal (`Sidebar`, `Header`, `Container`).
- [ ] Testes de renderização dos componentes principais.

---

## Fase 3 — Dashboard
**Entregas principais:**
- Visão geral com informações táticas rápidas (tarefas pendentes, lembretes, últimos atendimentos).
- Painel para organizar o início do turno do técnico.
**Checkpoints:**
- [ ] Criar estrutura do Dashboard no frontend.
- [ ] Implementar mock de dados se as fases seguintes ainda não estiverem prontas.
- [ ] Integração com os dados (após Fases 4, 5 e 7).

---

## Fase 4 — Organização (Tarefas, Checklists, Calendário)
**Entregas principais:**
- Entidades: `tasks`, `task_assignments`, `checklists`, `checklist_items`, `reminders`, `calendar_events`.
- Funcionalidades: Criar/atribuir tarefas, listas de checklists, lembretes pontuais e visualização de calendário.
**Checkpoints:**
- [ ] Migrations e models.
- [ ] Endpoints de CRUD e gestão de status.
- [ ] Telas de listagem, criação e edição.
- [ ] Testes de fluxo e testes unitários.

---

## Fase 5 — Conhecimento
**Entregas principais:**
- A base do conhecimento técnico.
- Entidades: `knowledge_articles`, `knowledge_versions`, `knowledge_tags`.
- Funcionalidades: Editor Rich Text, sistema de versão, categorias, favoritos, busca.
**Checkpoints:**
- [ ] Migrations, models e versionamento do conteúdo.
- [ ] Criação da interface de visualização e edição de artigos.
- [ ] Implementar funcionalidade de favoritar e gerenciar categorias.
- [ ] Testes de consistência de pesquisa e histórico de versões.

---

## Fase 6 — Comandos e Respostas
**Entregas principais:**
- Biblioteca de comandos úteis (apenas consulta/cópia).
- Respostas padrão para comunicação (não executa comandos remotos).
- Entidades: `commands`, `standard_responses`.
**Checkpoints:**
- [ ] Implementação do CRUD no backend.
- [ ] Implementação das telas focadas em rápida pesquisa e ação de "Copiar para área de transferência".
- [ ] Testes na API e UI.

---

## Fase 7 — Atendimentos
**Entregas principais:**
- Registro de suporte interno correlacionado ao OTRS.
- Entidades: `attendances`, `attendance_notes`, `attendance_attachments`.
- Funcionalidades: Associação manual com #chamado OTRS, registro de diagnóstico, comandos utilizados, equipamentos, e ação "Salvar como conhecimento".
**Checkpoints:**
- [ ] Regra Crítica: Garantir que não duplique a funcionalidade de chamados do OTRS.
- [ ] Endpoints de criação/leitura.
- [ ] Conversão automática de atendimento em rascunho de conhecimento.
- [ ] Testes de fluxo completo de registro.

---

## Fase 8 — Infraestrutura (Lojas e Equipamentos)
**Entregas principais:**
- Cadastro e organização do parque tecnológico.
- Entidades: `stores`, `departments`, `equipment`, `equipment_history`.
- Funcionalidades: Cadastro de equipamentos com vínculo a lojas, tracking de histórico (IP, MAC, problemas passados).
**Checkpoints:**
- [ ] Migrations e endpoints baseados nas estruturas de lojas e ativos.
- [ ] Telas de gerenciamento de inventário.
- [ ] Relacionar equipamentos em atendimentos.
- [ ] Testes unitários.

---

## Fase 9 — Manutenções
**Entregas principais:**
- Registros específicos para manutenção física/lógica.
- Entidades: `maintenance_records`.
- Funcionalidades: Relacionar manutenção a equipamento, checklists de manutenção, registro de resultados e anexos.
**Checkpoints:**
- [ ] Migrations e endpoints específicos.
- [ ] Integração com checklists e calendário.

---

## Fase 10 — Arquivos
**Entregas principais:**
- Repositório central de arquivos anexados (fotos, prints, PDFs).
- Entidades: `attachments`.
- Funcionalidades: Upload no servidor via API, armazenamento estruturado dos metadados no Postgres e gestão segura de acessos.
**Checkpoints:**
- [ ] Configuração do sistema de storage local no FastAPI.
- [ ] Refatoração das entidades que aceitam anexos (Tarefas, Atendimentos, Manutenções).

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
- Entidades: `audit_logs`.
- Funcionalidades: Logs automáticos de alterações sensíveis, bloqueio de soft-deletes onde aplicável e revisão robusta de regras no backend.
**Checkpoints:**
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
**Checkpoints:**
- [ ] Revisão de UX e acessibilidade.
- [ ] Cobertura de testes e correções finais de performance.
- [ ] Atualização final da documentação corporativa.
