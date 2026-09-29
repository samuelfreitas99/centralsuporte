# PROJECT_STATE

**Estado atual**: Fase 11.4 Concluída e Auditada + Refinamentos Operacionais (Projetos/Manutenções/Atendimentos/Tarefas) Validados.
**Fase atual**: Aguardando definições para a próxima fase (Fase 12 - Knowledge Base ou Files/Uploads).
**Última implementação**:
- **Refinamentos Operacionais — Módulo Projetos, Manutenções, Atendimentos e Tarefas (Pós-Fase 11)**:
  - **Problema 1 (Manutenção para Múltiplos Equipamentos - N:N)**:
    - Criada migration Alembic segura `db576bdfff35_add_maintenance_equipment_m_to_n.py` criando a tabela de junção `maintenance_equipment` com chaves estrangeiras com `CASCADE`, migrando retroativamente os vínculos existentes em `maintenance_records.equipment_id`, e tornando a coluna `equipment_id` anulável para compatibilidade regressiva.
    - Modelos `MaintenanceRecord` e `Equipment` atualizados com relationship N:N bidirecional (`MaintenanceRecord.equipments` e `Equipment.maintenances`).
    - Schemas Pydantic atualizados para suportar `equipment_id` legada, `equipment_ids: Optional[List[int]]` e lista de `equipments: List[EquipmentResponse]`.
    - Backend router (`maintenances.py`) agora associa atomicamente múltiplos equipamentos na criação e atualização, emite eventos em `equipment_history` para cada ativo envolvido e sincroniza o status de todos os equipamentos (para `em_manutencao` e restauração para `ativo` na conclusão). Filtro por `equipment_id` agora verifica tanto o campo primário quanto a relação N:N.
    - Criado componente `EquipmentMultiSelect.tsx` no frontend com busca textual rápida (hostname, modelo, patrimônio), checkboxes com contagem visual, badges removíveis individualmente e fallback de lista.
    - Integrado na criação (`MaintenanceCreateDrawer`), visualização e edição (`MaintenanceDrawer`), e na listagem geral (`MaintenancePage`) com contagem compacta de múltiplos ativos.
    - Suporte pleno tanto dentro de Projetos quanto em manutenções avulsas fora de projetos.
  - **Problema 2 (Novo Atendimento a partir de Projeto com Contexto Bloqueado)**:
    - Verificado e consolidado o deep linking `#attendance?new=true&project_id=X&project_name=Y` a partir do `ProjectWorkspace`.
    - No `AttendancePage`, a leitura do hash captura o `project_id` e `project_name` (com fallback assíncrono para lookup na API caso o nome não venha na URL), fixa o estado `lockedProjectName` no `ProjectSelect` em modo somente leitura (exibindo selo "Vinculado"), limpa a URL para `#attendance` via `history.replaceState` preservando a aba, e preenche `attendanceForm.project_id`.
    - Ao submeter o atendimento, o vínculo `project_id` é persistido com sucesso na tabela `attendances`.
  - **Problema 3 (Clique na Tarefa no Projeto abre Visualização/Detalhes e Ação Explícita de Edição)**:
    - Desacoplado o clique direto de edição no `ProjectWorkspace`: tanto na aba "Visão Geral" quanto na aba "Tarefas", o clique em qualquer tarefa agora abre o `TaskDetailDrawer` em modo leitura rica (título, instruções completas, status, prioridade, responsável, datas e checklists associados).
    - O `TaskDetailDrawer` possui botão de ação explícito "Editar Detalhes" que aciona o formulário de edição (`TaskFormDialog`), mantendo o fluxo operacional fluido e evitando alterações acidentais.
  - **Validação de Testes**:
    - Backend: 74 testes aprovados no Pytest (incluindo suíte dedicada `tests/test_refinements_maintenance_attendance.py`).
    - Frontend: 111 testes aprovados no Vitest (incluindo testes dedicados em `RefinementsMaintenanceTaskAttendance.test.tsx`, `AttendancePage.test.tsx` e `MaintenancePage.test.tsx`).
    - Build: `tsc -b && vite build` finalizado com 0 erros.
- **Fase 11.4 — RBAC Administration & Identity Integrity Audit**:
  - Consolidação administrativa do RBAC M:N.
  - Atualizadas referências legacy frontend `user.role` nas páginas de Attendance e Commands para utilizar o `hasRole('Administrador')` que suporta a estrutura M:N.
  - Implementado o gerenciamento de Roles (CRUD de papéis e leitura da matriz de permissões disponíveis) no backend `users.py` com schema validado.
  - Adicionada trava (server-side protection) para garantir que o "último administrador" do sistema não pode ser desativado, deletado ou ter a role de admin removida.
  - Criação da página visual `RolesPage.tsx` na interface para gerenciamento de perfis e visualização efetiva da Matriz de Permissões (quem acessa o quê).
  - Adicionados Logs de Auditoria para `CREATE` e `UPDATE` em perfis.
  - 100% de passagem nos testes integrados frontend (107/107) e backend (69/69), além de sucesso no build (0 errors).
- **Fase 11.3 — Users / Profiles / Identity Frontend**:
  - Construção da tela de gestão de usuários (`UsersPage.tsx`) com tabela operacional densa, cartões responsivos para mobile, barra de pesquisa, filtros rápidos por status (Todos/Ativos/Inativos), departamento e perfil/role.
  - Implementação do Drawer administrativo (`UserFormDrawer.tsx`) com suporte a criação e edição completa de usuários, seleção múltipla de papéis (M:N via checkboxes), campos de identidade e contato, e bloqueio de segurança contra auto-desativação do próprio administrador logado.
  - Criação da página de perfil unificada (`ProfilePage.tsx`) que atende tanto ao "Meu Perfil" quanto ao "Perfil de Terceiros", aplicando estrito mascaramento de privacidade em dados sensíveis (email, telefone e preferências mascarados como `[Informação restrita]`) para outros usuários quando não possuir `users:write`.
  - Grid de estatísticas operacionais de perfil consumindo `/users/{id}/stats` com 5 métricas em tempo real (Atendimentos, Manutenções, Tarefas Pendentes, Tarefas Concluídas e Projetos sob Responsabilidade).
  - Diálogo de auto-edição de perfil (`EditProfileDialog.tsx`) restrito exclusivamente aos campos permitidos ao próprio usuário (`display_name`, `avatar_url`, `phone`, `preferences`).
  - Criação do componente `Avatar.tsx` com fallback determinístico de iniciais baseado em paleta semântica HSL, tratamento seguro de falhas de imagem e indicador de status ativo/inativo.
  - Atualização do `AuthContext` com suporte nativo a múltiplos papéis (`roles: string[]`) em `hasPermission` e `hasRole`, além de método `refreshUser()` para sincronização instantânea do perfil no `Header` e na `Sidebar`.
  - Integração no `AuthenticatedView` utilizando navegação hash nativa (`#users`, `#profile`, `#profile?id=X`) sem dependência de React Router.
  - Suíte completa de testes automatizados: 107/107 testes Vitest no frontend e 69/69 testes Pytest no backend aprovados, com 0 erros de TypeScript e 0 erros de ESLint.
- **Fase 11.2 — Users / Profiles / Identity Backend Foundation**:
  - Migration Alembic executada com sucesso adicionando campos de identidade (`full_name`, `display_name`, `avatar_url`, `phone`, `job_title`, `department_id`, `last_login_at`, `preferences`) e tabela `user_roles`.
  - Migrados dados existentes de `role_id` para `user_roles` e removida coluna legada com integridade garantida.
  - Implementado RBAC M:N com união de permissões de múltiplos papéis sem duplicação.
  - Criados endpoints `/users/me/profile`, `/users/{id}/profile`, `/users/{id}/stats` com regras estritas de privacidade, restrição de acesso e bloqueio de escalada de privilégios.
  - Registrado `last_login_at` no fluxo real de login e trilha de auditoria completa em `audit_logs`.
  - Suíte completa de testes automatizados executada: 69/69 testes de backend e 95/95 testes de frontend aprovados.
- **Fase 11.1 (Planejamento) — Users / Profiles / Identity Foundation**:
  - Arquitetura estabelecida para integração de dados de identidade operacionais à tabela `User`.
  - Transição de `role_id` (1:N) para M:N (`user_roles`).
- **Fase 10.4.3 — Evolução do Project Workspace / Operational Project Dashboard**:
  - Transformado `ProjectWorkspace` em um painel operacional focado em produtividade.
  - Otimizado cabeçalho com metadados e ações rápidas.
  - Implementado lazy loading do progresso em `ProjectList` com novos cards compactos.
- **Fase 10.4.2 — Integração Operacional Completa do Project Workspace**:
  - Correção de GAP funcional na criação de novos atendimentos (`AttendancePage`) via Workspace do projeto.
  - Adição de `project_name` no payload da URL hash (`#attendance?new=true&project_id=X&project_name=Y`) no componente `ProjectWorkspace`.
  - Tratamento do estado `lockedProjectName` em `AttendancePage` para forçar o vínculo contextual obrigatório na seleção (`ProjectSelect`), impossibilitando falhas de associação.
  - Implementação de teste automatizado `test_attendance_project_association` assegurando a integridade do vínculo no backend.
  - Ajuste contextual no `ProjectSelect`: O dropdown é ocultado e substituído por uma visão bloqueada de escopo quando o `ProjectWorkspace` instancia formulários (UX limpa e estrita, conforme a regra de agregação).
  - Reescrito o _empty state_ de `ProjectList` para um formato focado em clareza com um CTA claro, além de instaurar uma ordenação semântica e operacional aos projetos para realçar itens "Em andamento".
  - Correção de contraste e tema global no formulário raiz (`ProjectFormDrawer`).
- **Fase 10.3.3 — Auditoria de Integração e Contexto do Projeto**:
  - Testes end-to-end de integração no backend (`test_integration_phase10_3_3.py`) comprovaram o funcionamento perfeito da agregação (`project_id` repassado, e persistido via `ON DELETE SET NULL`, cascata em `project_equipment`).
  - Investigado o fluxo do frontend: O estado `initialProjectId` foi corretamente implementado na 10.3.2, e o bloqueio de UI foi documentado como requisito e sanado na 10.4.1.
  - Integração visual de projetos nos módulos operacionais finalizada.
  - O componente `ProjectSelect` foi devidamente injetado nos modais `TaskFormDialog`, `MaintenanceDrawer`, `MaintenanceCreateDrawer` e na página `AttendancePage`.
  - Tratamento adequado para "desvincular" entidades de projetos, enviando `project_id: null` para backend tratar via `exclude_unset=True`.
  - Construído e finalizado o `ProjectWorkspace`, renderizando abas separadas de *Visão Geral*, *Tarefas*, *Equipamentos*, e *Manutenções* filtrados e consultados dinamicamente via backend.
  - Correção de lints de `BadgeProps` e `react/jsx-runtime` (erros de TS configurado).
- **Fase 10.2.1 — Auditoria da Integração de Projetos**:
  - Implementado suporte funcional a `project_id` em Tasks, Checklists, Maintenances, Attendances, CalendarEvents e StockMovements.
  - Testes de integração E2E criados (`test_integration_phase10_2.py`) cobrindo ciclo completo de vínculos e desvínculos.
  - Adicionado suporte a `unset` (nullifier) via `exclude_unset=True` nos payloads.
- **Fase 10.1.1 — Auditoria da Fundação Backend de Projetos**:
  - Auditoria concluída. Regra crítica de Preserve Data (ON DELETE SET NULL) testada e validada em integração.
  - Endpoints adicionados para gerenciamento de Equipment em Projetos.
- **Fase 10.1 — Fundação Backend de Projetos Operacionais**:
  - Geração de migração para tabelas de `projects`, `project_notes` e `project_equipment`.
  - Inclusão do campo `project_id` em Tarefas, Manutenções, Atendimentos, Eventos, Checklists e Movimentações de Estoque (`ON DELETE SET NULL`).
  - Implementação do roteador de Projetos (CRUD, Resumo, Notas e Timeline).
  - Testes automatizados escritos com 100% de aprovação (pytest).
- **Fase 10.0 — Arquitetura de Projetos Operacionais**:
  - Criação do plano arquitetural detalhado em `docs/PHASE_10_PROJECTS_PLAN.md` definindo que os projetos atuarão como agregadores de entidades preexistentes sem invasão de responsabilidades.
- **Fase 9.5.1 — Fechamento Funcional (Testes UI)**:
  - Testes do Frontend (Vitest) atualizados para refletir corretamente o novo modelo de Drawer/Progressive Disclosure.
  - Cobertura de testes e2e UI restaurada (95/95 passed).
- **Fase 9.5 — Auditoria Final da Fase 9**:
  - Auditoria completa confirmando a robustez do banco de dados, snapshots, integração de Status, permissões e refatoração visual.
- **Fase 9.4 — Redesign do Painel de Manutenções**:
  - `MaintenancePage` reescrita com padrão de Workspace Operacional.
  - Implementado alternador de visualização Lista (Tabela densa) vs Calendário.
  - Substituído formulário modal complexo por `MaintenanceCreateDrawer` com divulgação progressiva (Progressive Disclosure).
  - Substituído `MaintenanceEditDialog` por `MaintenanceDrawer` atuando como visão consolidada de detalhes e edição.
  - Ações de atualização rápida de status embutidas na visualização de detalhes.

**Último commit**: feat: implement phase 11.4 rbac administration
**Próxima tarefa**: Iniciar Fase 12 (Knowledge Base ou Files/Uploads, aguardando user).
**Bloqueios**: Nenhum.
**Pendências**: Nenhuma.
**Testes**: 
- Backend Pytest: 69/69 passed (100%)
- Frontend Vitest: 107/107 passed (100% em 18 arquivos de teste)
- TypeScript / Vite build: 0 erros
- ESLint: 0 erros
**Problemas conhecidos**: Nenhum.
**Decisões recentes**:
- Preservação da tabela `User` para identidade operacional, sem criação de tabela `Profile` separada.
- RBAC M:N implementado via tabela associativa `user_roles` com retrocompatibilidade e união de permissões de múltiplos papéis.
- Endpoints e telas de visualização de perfil (`/users/{id}/profile`) com mascaramento obrigatório de dados sensíveis para terceiros quando sem permissão `users:write`.
- Navegação hash nativa (`#users`, `#profile`, `#profile?id=X`) respeitando a arquitetura existente da aplicação.
- Componente `Avatar` independente de APIs externas (Gravatar/Unsplash), priorizando estabilidade e segurança corporativa.
- Adicionada tela de Roles (Matriz de Permissões) para facilitar administração, protegendo severamente o último administrador contra falhas humanas (auto-bloqueio, desativação acidental e perda de permission `roles:write`).
