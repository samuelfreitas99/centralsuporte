# PROJECT_STATE

**Estado atual**: Fase Visual 2 (App Shell / Sidebar / Header) concluída com sucesso. Estrutura de navegação global e layout operacional alinhados à identidade "Modern Operations Center".
**Fase atual**: Fase Visual 2 concluída -> Próxima: Fase Visual 3 (Componentes Base e Padrões de Superfície).
**Última implementação**: 
- **Fase Visual 2 — App Shell / Sidebar / Header (`AppLayout.tsx`, `Sidebar.tsx`, `Header.tsx`, `NotificationsDropdown.tsx`)**:
  - **Sidebar Técnica e Compacta**: Eliminação completa de gradientes e sombras neon gamer. Implementação de navegação com estado ativo refinado (`bg-primary/10 text-primary border-primary/20`), agrupamento operacional e do sistema com tipografia clara, ícones consistentes e aviso do OTRS reestruturado de forma neutra e técnica.
  - **Header Operacional Calibrado**: Altura compacta (h-14 / 56px) para maior foco na área de trabalho, ícone de terminal discreto, status operacional estável em esmeralda, gatilho ergonômico de busca global (`Ctrl+K`) e cápsula de usuário sem saturação excessiva.
  - **NotificationsDropdown Fluido**: Animação de entrada sutil via `motion/react` (`opacity`, `scale` e translação discreta), respeitando `prefers-reduced-motion`, com prioridades visualmente claras e painel em popover de alta legibilidade.
  - **App Layout e Superfícies Contínuas**: Relação contínua entre Sidebar, Header e área de conteúdo principal sem sobreposição de bordas pesadas. Preservação do link WCAG "Pular para o conteúdo principal" e suporte a atalhos de teclado.
  - **Responsividade e Acessibilidade**: Gaveta mobile deslizante com fechamento por clique fora ou tecla `Escape`, mantendo foco visível `:focus-visible` e conformidade WCAG AA.
- **Testes Automatizados**:
  - 87 testes de frontend (Vitest) 100% aprovados (17 arquivos de teste).
  - 44 testes de backend (Pytest) 100% aprovados.
  - Linter (`oxlint`) com 0 erros.
  - Build de produção (`tsc -b && vite build`) validado sem erros ou alertas.
**Último commit**: style(ui): redesign app shell navigation
**Próxima tarefa**: Fase Visual 3 — Componentes Base e Padrões de Superfície (Cards, Dialogs, Drawers, Badges, Tables).
**Bloqueios**: Nenhum.
**Pendências**: Nenhuma nesta unidade.
**Testes**: 87 testes de frontend (vitest) e 44 testes de backend (pytest) executados e aprovados com 100% de sucesso.
**Problemas conhecidos**: Nenhum.
**Decisões recentes**:
- Transição da navegação e header para o padrão operacional sem neon, com badges neutras e acentos de cor controlados.
- Uso de `motion/react` com AnimatePresence e respeito a `prefers-reduced-motion` no dropdown de alertas e notificações.
