# PROJECT_STATE

**Estado atual**: Fase 8.4B concluída (Edição de Estoque).
**Fase atual**: Fase 8.4B.
**Última implementação**:
- **Fase 8.4B — Edição do Cadastro de Estoque Operacional**:
  - Removido `current_quantity` do schema `StockItemUpdate` para evitar edições diretas do saldo.
  - Implementado o botão "Editar Cadastro" na aba `StockTab`.
  - Formulário reaproveita o design do Drawer para cadastro, desativando o input de saldo e informando que ele é controlado via movimentações.
- **Fase 8.4A — Locais Técnicos (Technical Locations)**:
  - Entidade `TechnicalLocation` criada e migrada.
  - CRUD na API REST com rotas `/infrastructure/locations`.
  - Frontend da Aba de Lojas e Equipamentos atualizados para gerir locais técnicos e alocar equipamentos em locais.
- **Fase 8.3 — Progressive Disclosure e Redesign Visual**:
  - Abas de Equipamentos, Estoque, Licenças e Lojas refatoradas seguindo os padrões "Modern Operations Center" e "Progressive Disclosure".
  - Tabelas modernas introduzidas com layout master-detail via `Drawer` para detalhes complexos, removendo o excesso de cards e modais gigantes.
  - Exposição de chaves de licença protegidas de forma inteligente com timeout (`/reveal` endpoint integrado no serviço).
  - Remoção de animações complexas (`motion/react`) que causavam inconsistência nos testes, mantendo interfaces limpas e responsivas.
  - Correção de bug no `CommandsPage` (`isSecureContext` e recursão infinita na cópia).
- **Testes Automatizados**:
  - Frontend Vitest (InfrastructurePage, CommandsPage) ajustado, mocks de ambiente configurados e 100% aprovados.
  - Frontend Build validado.
**Último commit**: feat(infrastructure): implement stock item edit
**Próxima tarefa**: Fase 8.4C — Associação de Licenças a Contas/Cofre.
**Bloqueios**: Nenhum.
**Pendências**: Nenhuma nesta unidade.
**Testes**: Todos testes (Backend/Frontend) aprovados.
**Problemas conhecidos**: Nenhum.
**Decisões recentes**:
- Utilização exclusiva de componentes Drawer do Radix UI para exibições de formulários/edição no módulo de infraestrutura para aliviar a carga visual da página principal.
- Chaves de licenças agora retornam truncadas no endpoint de listagem, sendo o endpoint `/reveal` acionado somente por demanda.
