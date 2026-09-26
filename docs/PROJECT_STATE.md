# PROJECT_STATE

**Estado atual**: Fase Visual 5 (Atendimentos) refinada e concluída com sucesso. O módulo de atendimentos recebeu Drawer para listagens ricas e o roteamento foi aprimorado com Deep Linking via History API.
**Fase atual**: Fase Visual 5 concluída -> Próxima: Fase Visual 6 (Refatoração de Telas de Domínio - Base de Conhecimento, Infraestrutura e Manutenções).
**Última implementação**: 
- **Fase Visual 5 — Refinamento (AttendancePage)**:
  - **Componente Drawer**: Substituição do Modal antigo pelo Drawer, permitindo progressive disclosure. 
  - **Deep Linking Integrado**: Implementação de `popstate` e escuta do `window.location.hash` em `AuthenticatedView`, `AttendancePage` e `KnowledgePage`, permitindo recarregamento e uso do botão Voltar do navegador sem quebrar o fluxo SPA.
- **Fase Visual 4 — Refinamento (Dashboard V2)**:
  - **Integração de Dados Reais**: Substituição dos mocks estáticos (`dashboardMock.ts`) por requisições aos serviços existentes (`organizationService`, `attendanceService`, `knowledgeService`), trazendo integridade operacional ao Dashboard.
  - **Recuperação de Profundidade Visual**: Ajuste no uso de superfícies, bordas e sombras (Cards alterados de `ghost` para `default`), eliminando o aspecto excessivamente "flat" em ambos os modos (Dark e Light), sem reintroduzir poluição visual.
  - **Hierarquia Visual e Acessibilidade**: Aprimoramento da distinção de backgrounds nas listas e separação clara entre as ações rápidas ("O Meu Turno") e métricas.
- **Fase Visual 3 — Sistema de Componentes Base**:
  - **Botões Padronizados**: Eliminação definitiva de gradientes neon (`from-blue-600 to-indigo-600`) e sombras azuis saturadas; integração direta aos tokens semânticos (`bg-primary`, `bg-destructive`, etc.), com suporte nativo a indicador de `loading` acessível.
  - **Superfícies e Resolução de "Box dentro de Box"**: Suporte a variantes no `Card` (`default`, `flat`, `outline`, `ghost`), garantindo que seções internas possam ser agrupadas sem acúmulo de bordas duplas ou triplas.
  - **Badges Semânticas**: Cores equilibradas de baixa saturação em esmeralda, âmbar, carmesim e cobalto, evitando poluição visual decorativa e preservando uso exclusivo para estados operacionais reais.
  - **Dialogs e Drawers Estruturados**: Modais compactos com limites verticais (`max-h-[88vh]`), cabeçalho e rodapé fixos; criação da primitiva `Drawer` deslizante lateral para comportar formulários ricos e progressive disclosure.
  - **Controles de Formulário Unificados**: `Input`, `Textarea`, `Select` e `Label` com anéis de foco consistentes (`:focus-visible:ring-2`), estados de erro semânticos e tipografia técnica.
  - **Tabs e Tabelas Operacionais**: Primitiva `Tabs` (variantes `pills` e `underline`) e componentes semânticos de `Table` com densidade compacta e divisórias horizontais suaves.
  - **Toasts, EmptyState e ErrorState**: Toasts adaptados aos tokens do tema nos modos Dark e Light; introdução de componentes canônicos para telas vazias e tratamento amigável de falhas com botão de nova tentativa.
- **Testes Automatizados**:
  - 96 testes de frontend (Vitest) 100% aprovados (17 arquivos de teste, incluindo 16 testes abrangentes de componentes UI).
  - 44 testes de backend (Pytest) 100% aprovados.
  - Linter (`oxlint`) com 0 erros em 108 arquivos.
  - Build de produção (`tsc -b && vite build`) validado sem erros ou alertas de compilação.
**Último commit**: fix(ui): fix deep linking back button reactivity
**Próxima tarefa**: Fase Visual 6 — Refatoração das Telas de Domínio (ex: Tarefas, Infraestrutura).
**Bloqueios**: Nenhum.
**Pendências**: Nenhuma nesta unidade.
**Testes**: 96 testes de frontend (vitest) e 44 testes de backend (pytest) executados e aprovados com 100% de sucesso.
**Problemas conhecidos**: Nenhum.
**Decisões recentes**:
- Adoção de variante `Drawer` e sistema de hash/roteamento `window.location.hash` e `popstate` nativos para suportar Deep Linking, sem acoplar a uma biblioteca pesada de rotas (já que a SPA é simples).
- Adoção de variantes no Card (`flat`, `ghost`) para resolver estruturalmente o problema de "caixa dentro de caixa".
