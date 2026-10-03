# Phase 11.4 - RBAC Administration & Identity Integrity Audit

## Objetivos da Fase
- Consolidar a administração de papéis M:N (RBAC).
- Auditar a integridade arquitetural introduzida pelas Fases 11.2 e 11.3 (Identity/Profile).
- Atualizar referências legacy de `user.role` para o modelo M:N usando a função `hasRole()`.
- Implementar uma página administrativa para gerenciar regras de acesso e permissões (Matriz de Permissões).
- Implementar proteção server-side garantindo a presença do "último administrador" do sistema.
- Adicionar logs de auditoria para alterações críticas no RBAC.

## Ações Realizadas

### 1. Auditoria e Correção Legacy (`user.role`)
- **Backend**: Em `models.py` e `routers/users.py`, o suporte `role_id` mantido por retrocompatibilidade para migrações passadas continua funcionando perfeitamente sem afetar novos sistemas M:N. Apenas dados mockados de teste (ex: `test_auth_and_users.py`) ainda usavam `role_id` estritamente, mas sem causar falhas nos testes.
- **Frontend**: Localizamos e corrigimos as validações em `AttendancePage.tsx` e `CommandsPage.tsx` que dependiam puramente de `user.role?.name === 'Administrador'`. As validações agora utilizam o hook nativo M:N `hasRole('Administrador')` provido pelo contexto de autenticação.

### 2. Proteção Server-Side do Último Administrador
- Adicionado o helper `check_last_admin` no backend em `app/routers/users.py`.
- O helper foi injetado nas rotas de `PUT /users/{user_id}` e `DELETE /users/{user_id}`.
- O sistema intercepta tentativas de remover o perfil `Administrador` ou desativar/excluir o último usuário administrativo ativo e aborta a operação emitindo `400 Bad Request`.
- Tentativas de renomear o papel interno do sistema chamado `Administrador` também são bloqueadas (`400 Bad Request`).

### 3. Matriz de Permissões e Administração (CRUD Roles)
- Adicionados os schemas `RoleCreate` e `RoleUpdate` em `schemas.py`.
- Adicionadas as rotas `POST /roles`, `PUT /roles/{role_id}`, e `GET /permissions` no router `users.py`.
- Incluído `roles:write` na matriz `INITIAL_PERMISSIONS` do banco de dados (que reflete no perfil de Administrador).
- Todos os logs de alteração e criação de Roles/Permissions agora são registrados no banco via `record_audit_log` (garantindo rastreabilidade do RBAC).
- No frontend, criado o serviço `roleService.ts` e a interface visual rica `RolesPage.tsx`.
- `RolesPage.tsx` foi injetado no `AuthenticatedView.tsx` e mapeado no `nav-items.ts`, exibindo visualmente todos os perfis e suas permissões unificadas.

### 4. Revisão Geral
- **Lint & Build**: `tsc -b && vite build` foi executado sem erros. `RolesPage.tsx` integrado de maneira tipada.
- **Backend Tests**: 69/69 testes integrados e unitários completados com sucesso no pytest (via Docker).
- **Frontend Tests**: 107/107 testes da suíte vitest (via jsdom e ResizeObserver polyfill) completados com sucesso.

## Próximos Passos
O modelo de Identidade, Usuários e RBAC está oficialmente completo, testado, validado e coberto com uma administração robusta em conformidade com as regras de produto (PRODUCT_SPEC). O sistema está preparado para a futura Fase 12.
