# Planejamento Fase 11.1 — Users / Profiles / Identity Foundation

## 1. Arquitetura Escolhida: USER x PROFILE

**Decisão:** Manter e expandir a entidade `User` atual (Opção A).

**Justificativa:** 
A tabela `users` já está profundamente enraizada no sistema através de mais de 15 chaves estrangeiras (`creator_id`, `author_id`, `technician_id`, `assigned_to`, etc.). O sistema é uma ferramenta operacional fechada, onde a identidade profissional (quem executa) é inseparável do contexto de autenticação. 
Criar uma tabela paralela `profiles` forçaria `JOINs` complexos em todas as listagens operacionais (ex: ver a foto do técnico em um chamado) apenas para satisfazer um purismo arquitetural, sem trazer benefícios reais de normalização. Portanto, adicionaremos as colunas de identidade diretamente na tabela `users`.

## 2. Identidade Operacional (Novos Campos em `User`)

A entidade `User` passará a diferenciar logicamente três escopos de dados (na mesma tabela):

- **Dados de Autenticação (Existentes):** `username`, `email`, `hashed_password`, `is_active`.
- **Dados de Identidade (Novos):**
  - `full_name` (String): Nome completo.
  - `display_name` (String): Nome curto para UI.
  - `avatar_url` (String): Caminho do anexo da foto.
  - `phone` (String): Contato corporativo.
  - `job_title` (String): Cargo/Função.
  - `department_id` (FK para `departments`): Setor ao qual o usuário pertence.
  - `last_login_at` (DateTime): Auditoria de último acesso.
  - `preferences` (JSON): Configurações futuras de UI (tema, layout do dashboard).
- **Dados de Autorização:** FKs para RBAC.

## 3. RBAC (Role-Based Access Control)

**Auditoria:** O modelo atual (`User -> Role -> role_permissions -> Permission`) é funcional, mas suporta apenas um `Role` por `User` (`role_id` na tabela `users`).
**Evolução:** Para suportar *múltiplos papéis* (ex: "Técnico N2" e "Gestor de Base de Conhecimento"), a arquitetura será alterada para **M:N**:
- Remoção da coluna `role_id` na tabela `users`.
- Criação da tabela associativa `user_roles` (`user_id`, `role_id`).
- *Nota:* Essa refatoração será feita garantindo retrocompatibilidade (migração de dados copiando o `role_id` atual para a tabela `user_roles`).
- A integração futura com AD/LDAP usará essa mesma base (mapeamento de Grupos AD para Roles).

## 4. Visibilidade vs. Permissão

**Regra:**
- **Permissão** (RBAC): "O usuário possui o direito de listar Manutenções?" (`read:maintenances`)
- **Visibilidade** (Filtro SQL): "Dentre as Manutenções, quais ele pode ver?"

A visibilidade continuará utilizando o campo `visibility` (presente em `tasks`, `knowledge_articles`, etc), padronizando os seguintes níveis lógicos:
1. `privado` (pessoal): Visível apenas para o `creator_id` / `author_id`.
2. `equipe` (setor): Visível para usuários cujo `department_id` seja igual ao da entidade, ou designados.
3. `todos` (global): Visível para qualquer usuário autenticado.
4. *Gestores/Admins bypassam regras de visibilidade via permissão explícita (`admin:all` ou `read:all`).*

## 5. Responsabilidade (Padrão de FKs)

As nomenclaturas atuais serão mantidas para não quebrar a base de dados, mas serão documentadas como convenção oficial:
- `creator_id`: Criador do registro no sistema (Auditoria base).
- `owner_id`: Responsável pelo ciclo de vida do agregado (ex: `projects`).
- `author_id`: Criador de conteúdo textual/intelectual (`knowledge_articles`, `project_notes`).
- `technician_id`: Executor braçal/técnico da operação (`attendances`, `maintenance_records`).
- `assigned_to` / `task_assignments`: Executores designados a concluir uma pendência.
- `uploader_id`: Responsável pela inserção de mídia (`attachments`).

## 6. Desativação de Usuários (`is_active = False`)

**Regras de Negócio:**
1. **Sem deleção:** Um usuário nunca é apagado (evita quebra de histórico e perda de dados).
2. **Autenticação bloqueada:** Rejeição imediata de novos logins e invalidação do contexto atual via `get_current_active_user`.
3. **Imunidade Histórica:** Continua aparecendo em relatórios passados, históricos de equipamentos, e chamados encerrados.
4. **Isolamento Futuro:** Filtros no frontend para designação (`ProjectSelect`, `UserSelect`) exigem `is_active=True`. O usuário inativo não pode receber novas Tasks ou Atendimentos.

## 7. Perfil e Estatísticas

As estatísticas operacionais não serão salvas na tabela `users` (evitando gatilhos e inconsistências). Serão providas por endpoints agregados dedicados:
- **`GET /users/{id}/profile`**: Retorna dados de identidade (públicos ou privados dependendo de quem pede) + histórico recente (`AuditLog`).
- **`GET /users/{id}/stats`**: Retorna contagens em tempo real via `GROUP BY`:
  - `open_tasks` (Tasks pendentes atribuídas).
  - `resolved_attendances` (Attendances concluídos no mês).
  - `published_articles` (Artigos criados).
  - `active_projects` (Projetos em andamento).

## 8. Auditoria e Privacidade

- **AuditLog:** Toda alteração nos campos de Identidade do `User` ou alteração de Roles gerará um log (`action=UPDATE`, `entity_type=user`).
- **Privacidade:** 
  - *Dados Pessoais* (`email`, `phone`, `preferences`): Visíveis apenas para o próprio usuário e usuários com permissão gerencial (`users:manage`).
  - *Dados Operacionais* (`display_name`, `avatar_url`, `job_title`, `department_id`): Visíveis publicamente (dentro da plataforma) para colaboração.
- **Edição:** O próprio usuário edita sua foto e preferências. Apenas Gestores/Admins alteram Cargos (`job_title`), Setores (`department_id`) e Papéis (`Roles`).

## 9. Próximos Passos (Para a Fase 11.2 - Implementação)
- [ ] Criar migração alembic para novos campos de `User`.
- [ ] Criar migração alembic para tabela `user_roles` e migrar dados de `role_id`.
- [ ] Atualizar Schemas Pydantic.
- [ ] Atualizar `auth.py` para iterar sobre lista de roles.
- [ ] Criar endpoints `/users/{id}/profile` e `/users/{id}/stats`.
- [ ] Atualizar UI (Settings/Profile).
