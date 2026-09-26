# Plano Técnico e Arquitetural — Dashboard V2

**Documento de Planejamento para Implementação (Fase Visual 4)**
*Status:* Planejamento / Pronto para Execução

---

## 1. Visão Geral e Objetivos
O **Dashboard V2** deve transformar a tela inicial genérica atual em uma verdadeira **"Estação de Comando" (Modern Operations Center)** para a equipe de suporte técnico. 
O objetivo principal é maximizar a eficiência operacional, oferecendo clareza hierárquica, leitura instantânea do status do turno e acesso rápido a ações cotidianas, sem comprometer a estabilidade do MVP atual. O design será profissional, limpo e utilitário, abandonando o excesso de caixas ("box-within-a-box") e efeitos visuais pesados (glassmorphism/neon).

## 2. Restrições e Escopo
- **NÃO** alterar regras de negócio, banco de dados ou endpoints da API/backend.
- **NÃO** criar novas dependências funcionais (trabalhar com os dados e `hooks` de mock/API existentes).
- **MANTER** a compatibilidade com a separação atual em relação ao OTRS (Dashboard não deve tentar ser a fila do OTRS).

## 3. Hierarquia Visual e Estrutura de Informação
A interface será reestruturada na seguinte ordem de precedência vertical (do mais urgente para o menos urgente):

1. **Critical Alerts (Topo Absoluto):** Renderização condicional. Só aparece se houver alertas reais (ex: "3 Licenças Vencem Hoje", "Equipamento Offline"). Se vazio, não ocupa espaço.
2. **"O Meu Turno" & Ações Rápidas (Superior Esquerdo):** Saudação focada, listagem de tarefas urgentes do próprio usuário, manutenções alocadas e lembretes para o plantão. Integrado com botões de ação essenciais.
3. **Métricas de Performance da Equipe (Superior Direito):** Cards minimalistas com KPIs do suporte (Tarefas Pendentes, Atendimentos Recentes). Foco em números claros e tipografia forte (sem ícones decorativos enormes).
4. **Contexto Contínuo / Timeline (Meio/Inferior):** Visão unificada das atividades recentes (Atendimentos, novos Artigos de Conhecimento), funcionando como um log de passagem de turno para leitura rápida.
5. **Banner de Fronteira OTRS (Rodapé):** Mais sutil e integrado do que a versão atual, para servir de lembrete constante da arquitetura sem poluir o topo.

## 4. Estratégia de Componentes e Layout
- **Layout Base:** Uso de CSS Grid (`grid-cols-1 lg:grid-cols-3` ou `4`) para permitir que "O Meu Turno" assuma a proporção principal e "Contexto Contínuo" se expanda lateralmente.
- **Substituição de Cards Enclausurados:** Os componentes `TaskListSection`, `RecentAttendancesSection` e afins serão refatorados internamente para usar o formato "Ghost" ou "Flat" de Card estabelecido na Fase Visual 3. Eles perderão bordas redundantes para mesclar-se melhor com o fundo do AppShell.
- **Drawers vs Modais:** Qualquer interação originada no Dashboard que exija visualização de detalhes (ex: abrir um Atendimento recente) priorizará os painéis laterais (Drawers) e não Modais centrais que bloqueiam a visão.

## 5. Estratégia de Tema (Dark / Light Mode)
- **Dark Mode (`slate-950`):** Foco no conforto visual de longo prazo. Uso de superfícies sutis para separar o conteúdo. Evitar "verde neon" para sucesso ou "vermelho puro" para erro; utilizar variantes `muted` dos tokens de estado.
- **Light Mode (`slate-50`):** Superfícies quase brancas. O contraste de texto será reforçado (`slate-900` para destaque, `slate-600` para suporte). 

## 6. Acessibilidade (A11y) e UX
- **Focus Rings:** Todos os botões, links de atalho e cards interativos herdarão o `:focus-visible ring-2 ring-primary` da Fase 3.
- **Densidade:** Redução de margens excessivas em listas. Os itens da timeline devem estar próximos para leitura contínua, utilizando ícones Lucide (stroke 1.5) para guiar o olhar.
- **Progressive Disclosure:** Exibir no Dashboard apenas o essencial de cada entidade. O restante deve ser lido apenas se o usuário clicar.

## 7. Motion e Animações Funcionais
- **Framer Motion (`motion/react`):** Uso restrito a animações de montagem (Staggered fade-in ao carregar a página) e micro-interações de estado.
- **Duração:** Transições curtas (150ms a 200ms) sem efeitos de elástico (`spring` com bounce zero, ou `tween`).
- **Acessibilidade:** Suporte total a `prefers-reduced-motion: reduce`, desabilitando transições verticais ou horizontais automáticas.

## 8. Estratégia de Dados e Estado
- O `DashboardPage.tsx` continuará consumindo as mocks atuais (`mockDashboardMetrics`, `mockTasks`, `mockReminders`, etc.) via os serviços já implementados, garantindo que o backend não será demandado para novos cálculos de agregações complexas nesta fase visual.
- Eventuais estados locais (ex: abas ou filtros locais do Dashboard) usarão estado React padrão, evitando Redux ou dependências pesadas.

## 9. Roadmap de Implementação da Fase Visual 4
A execução da Fase 4 seguirá esta ordem estrita:

1. **Refatoração Estrutural (Grid):** Limpar a disposição atual do `DashboardPage.tsx` e aplicar o novo CSS Grid de hierarquia.
2. **Implementação de "Critical Alerts":** Criar barra superior condicional baseada nas métricas do Mock.
3. **Refatoração do Cabeçalho e Ações:** Simplificar a área de "Ações Rápidas" removendo botões pesados e usando atalhos utilitários mais orgânicos.
4. **Redesign de "Métricas":** Aplicar a estética "Flat/Ghost" aos números chave (Tarefas, Lembretes, etc.).
5. **Timeline de Contexto Contínuo:** Unificar Atendimentos Recentes, Tarefas e Conhecimento numa leitura de fluxo mais horizontal, reduzindo as "4 caixas" atuais.
6. **Validação e Ajuste de Tema:** Teste cruzado no Modo Claro/Escuro para confirmar supressão de bordas aninhadas e calibração de micro-animações.

---
**Status do Planejamento:** CONCLUÍDO. Aguardando aprovação para iniciar a modificação do arquivo `frontend/src/pages/DashboardPage.tsx`.
