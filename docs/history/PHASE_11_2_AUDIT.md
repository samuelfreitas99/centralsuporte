# Auditoria de Implementação: Fase 11.2 — Users / Profiles / Identity Backend Foundation

## 1. Migrations Executadas
- **Arquivo de Migração:** `alembic/versions/c1a2f3e4d5b6_add_user_identity_and_user_roles.py`.
- **Tabela `user_roles`:** Criada com chaves estrangeiras `user_id` -> `users.id` (CASCADE) e `role_id` -> `roles.id` (CASCADE), com chave primária composta `(user_id, role_id)`.
- **Campos de Identidade Adicionados à tabela `users`:**
  - `full_name` (`VARCHAR(150)`, nullable=True)
  - `display_name` (`VARCHAR(100)`, nullable=True)
  - `avatar_url` (`VARCHAR(512)`, nullable=True)
  - `phone` (`VARCHAR(50)`, nullable=True)
  - `job_title` (`VARCHAR(100)`, nullable=True)
  - `department_id` (`INTEGER`, FK para `departments.id` com `ON DELETE SET NULL`, indexado)
  - `last_login_at` (`TIMESTAMP WITH TIME ZONE`, nullable=True)
  - `preferences` (`TEXT`, nullable=True)
- **Migração de Dados Validada:**
  - Usuários existentes inspecionados: 10/10 com `role_id` válido.
  - Migrados 10 vínculos para `user_roles`.
  - A coluna antiga `role_id` e a FK `users_role_id_fkey` foram removidas do banco de forma segura.

## 2. RBAC e Multi-Role (M:N)
- **Modelo:** `User` agora se relaciona com `Role` via tabela associativa `user_roles`.
- **União de Permissões:** `require_permission` unifica todas as permissões de todos os papéis do usuário (`user_permissions = {p.name for r in current_user.roles for p in r.permissions}`). Não há duplicação.
- **Administrador:** Usuários com o papel `Administrador` mantêm bypass nativo em permissões.
- **Retrocompatibilidade Python & API:**
  - Implementadas as properties `user.role` e `user.role_id` no modelo `User` para garantir que leituras de compatibilidade (ex: frontend esperando `user.role?.name`) continuem funcionando sem falhas.
  - Métodos utilitários `user.has_role(*names)` e `user.has_permission(name)` adicionados para facilitar checagens limpas e unificadas.
  - Endpoints de criação e atualização aceitam tanto `role_ids: List[int]` quanto `role_id: int`.

## 3. Endpoints Implementados e Ajustados
- **`GET /users`:** Adicionado suporte ao parâmetro de consulta `is_active: Optional[bool]` para permitir que seletores no frontend filtrem apenas usuários ativos.
- **`POST /users`:** Criação administrativa com suporte aos novos campos de identidade, validação de departamento ativo e atribuição de múltiplos perfis.
- **`PUT /users/{user_id}`:** Edição administrativa protegida por `users:write`. Bloqueia autodesativação do usuário autenticado.
- **`GET /users/me/profile`:** Retorna o perfil completo do usuário autenticado (incluindo dados privados).
- **`PUT /users/me/profile`:** Atualização do próprio perfil. Permite alterar apenas campos autorizados (`display_name`, `avatar_url`, `phone`, `preferences`). Bloqueia tentativa de *privilege escalation* (ignora roles, cargo, setor, status ativo).
- **`GET /users/{user_id}/profile`:** Consulta de perfil com regras estritas de privacidade:
  - Próprio usuário ou Administradores/Gestores recebem dados completos (incluindo `email`, `phone`, `preferences`).
  - Colegas comuns recebem campos operacionais (`display_name`, `avatar_url`, `job_title`, `department`), com dados privados mascarados (`None`).
- **`GET /users/{user_id}/stats`:** Agregação de métricas reais sem N+1:
  - `open_tasks`: tarefas pendentes/em andamento atribuídas ao usuário.
  - `resolved_attendances`: chamados resolvidos pelo usuário como técnico.
  - `active_projects`: projetos ativos sob custódia do usuário.
  - `completed_maintenances`: intervenções preventivas/corretivas concluídas pelo usuário.
  - `authored_articles`: artigos publicados pelo usuário.
- **`POST /auth/login`:** Atualiza o campo `last_login_at` com o timestamp UTC no momento exato de autenticação bem-sucedida.

## 4. Segurança e Privacidade
- **Bloqueio de Inativos:** Usuário com `is_active=False` é imediatamente rejeitado no login (HTTP 403) e quaisquer tokens previamente emitidos são bloqueados em tempo real na verificação de `get_current_active_user`.
- **Integridade Histórica:** Vínculos com tabelas de domínio (`Attendance`, `Task`, `MaintenanceRecord`, etc.) permanecem intactos. A regra de negócio não permite perda de registros de auditoria e trabalho técnico passado.
- **AuditLog:** Todas as criações, edições administrativas e autoatualizações de perfil geram registros em `audit_logs` sem expor senhas, hashes ou tokens.

## 5. Testes Executados
- **Backend (Pytest):** 69/69 testes passaram (100% de sucesso), incluindo os 9 novos testes de integração exaustivos em `tests/test_phase11_users_and_identity.py`.
- **Frontend (Vitest):** 95/95 testes passaram (100% de sucesso).
- **Frontend Build & Tipagem (`tsc -b && vite build`):** Compilação bem-sucedida com 0 erros.
- **Frontend Lint (`npm run lint`):** 0 erros.

## 6. Problemas Encontrados e Resolvidos
1. **Ambiguidade em `.join(Role)` na Automação:** Na regra 3 do serviço de automação (`services/automation.py`), uma query utilizava `.join(Role)` que, com a transição para N:N, tornou-se ambígua para o SQLAlchemy. Foi corrigida para `.join(User.roles)`.
2. **`DetachedInstanceError` e `NotNullViolation` em testes:** O teardown de testes unitários que criavam atendimentos e tarefas para usuários de teste precisava limpar as dependências com chave estrangeira restrita (`Attendance.technician_id RESTRICT`) antes da remoção do usuário temporário. Ajustado com sucesso.

## 7. Dívidas Técnicas
- **Frontend UI de Perfil (Fase 11.3):** A camada visual de edição e visualização de perfil ainda precisa ser desenvolvida no frontend nas próximas fases.
- **Cache de Estatísticas:** Atualmente o endpoint `GET /users/{id}/stats` roda agregações SQL pontuais com `func.count()`. Atende com ótima performance para a escala atual, mas poderá receber cache de curta duração caso o número de acessos simultâneos ao perfil cresça.

**Status:** APPROVED AND COMPLETED.
EOF
