# PROJECT_STATE

**Estado atual**: Fase 1 (Autenticação) em andamento. Endpoints de autenticação JWT, gestão de usuários, verificação de perfis/permissões e suíte de testes backend concluídos e operacionais.
**Fase atual**: Fase 1 (Autenticação).
**Última implementação**: Implementação de endpoints de autenticação JWT (`/auth/login`, `/auth/me`), gestão de usuários (`/users`), listagem de perfis (`/roles`), restrições de permissões no backend e testes automatizados (pytest).
**Último commit**: "feat: add login, auth, and user management backend endpoints"
**Próxima tarefa**: Fase 1 — Páginas de login e hooks de autenticação (Frontend).
**Bloqueios**: Nenhum.
**Pendências**: Páginas de login e hooks no Frontend, proteção de rotas no Frontend, testes vitest.
**Testes**: 7 testes automatizados de autenticação, ciclo de vida de usuário e verificação de permissões executados e aprovados via pytest.
**Problemas conhecidos**: Nenhum.
**Decisões recentes**: Autenticação local JWT com expiração configurável, senhas protegidas com bcrypt e verificação de permissões (`require_permission`) implementada diretamente no backend.
