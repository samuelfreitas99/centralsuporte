# Princípios de UI/UX — Central de Suporte

Este documento estabelece as diretrizes e princípios de experiência do usuário (UX) e interface (UI) para a Central de Suporte.

As especificações visuais rigorosas, cores, tamanhos e definições de layout residem no documento oficial **`DESIGN_SYSTEM.md`**. Este documento complementa o Design System focando no **comportamento e na experiência** do usuário técnico.

## 1. Princípios de Experiência do Usuário (UX)

O usuário principal da aplicação é um analista/técnico de suporte, coordenador de TI ou administrador de infraestrutura. Sendo assim, o sistema deve favorecer a velocidade e eficiência operacional.

### 1.1 Fricção Mínima
* Ações recorrentes (ex: visualizar um comando, concluir tarefa, marcar checklist, criar nota) não devem exigir navegação por múltiplas páginas.
* A visualização rápida (`Drawers` / Modais de detalhe) é preferida ao invés de transições de página completas para leitura de dados curtos.
* Formulários complexos devem ser divididos ou utilizar campos não-obrigatórios ocultos de forma inteligente.

### 1.2 Densidade de Informação
A interface não pode ser excessivamente espaçada a ponto de exigir muita rolagem (scroll) para encontrar informações. O layout deve ser denso e organizado, balanceando espaço em branco com a visibilidade de dados operacionais (ex: painéis laterais de detalhes, abas de informações relacionais).

### 1.3 Previsibilidade e Status
* Feedback explícito: Qualquer ação destrutiva, demorada ou de alteração de estado (salvar, excluir, transferir, concluir) deve fornecer um *feedback* instantâneo (Toasts, troca de cor, mudança no ícone).
* Identificação clara: Não esconder botões de ação cruciais. Ações principais de um card ou página devem estar no topo à direita.

### 1.4 Acessibilidade Visual
O alto contraste e a legibilidade da tipografia são fundamentais. A equipe trabalhará com o sistema em ambientes com iluminação variada (Datacenters, CPDs, mesas de operação). O suporte aos Modos Escuro e Claro deve ser nativo e não deve cansar os olhos (evitando o preto #000 ou branco #FFF absoluto como fundo, conforme o *Design System*).

---

## 2. Padrões de Interface (UI) e Comportamento

### 2.1 Busca Orientada
Sendo a Central de Suporte um repositório de conhecimento, a Busca deve ser onipresente. Um usuário não deve navegar 4 cliques para achar um equipamento ou procedimento; ele deve conseguir acessá-lo globalmente.

### 2.2 Hierarquia Semântica e Visual
Não basta o dado existir na tela; a informação mais importante deve gritar para o usuário. 
* Em um card de Tarefa, o *Título*, o *Badge de Prioridade* e o *Status de Atraso* são imediatos.
* Em um equipamento, o *Status (Online/Offline/Em Manutenção)* e o *IP* têm preferência.

### 2.3 Utilização Funcional de Motion
Conforme o `DESIGN_SYSTEM.md`, as animações (usando `motion/react`) servem a propósitos de UX:
1. **Guiar a atenção:** Quando um novo registro entra na tabela ou lista, ele deve escorregar suavemente ao invés de aparecer de forma "dura".
2. **Contexto:** Se o usuário clica em um item e um Drawer se abre do lado direito, a animação indica de onde a informação veio, ajudando no modelo mental.
3. **Respeito cognitivo:** Respeitar o `prefers-reduced-motion`. O técnico não quer aguardar animações lentas, elas devem ser curtas e discretas (ex: 200ms de duração).

---

## 3. Estados de Exceção

Toda listagem, tela de detalhe e formulário deve prever 4 estados, sem exceção:
1. **Ideal State:** A tela completa com dados sendo populados.
2. **Loading State:** Esqueleto (`skeleton`) da tela enquanto os dados não chegam do FastAPI, preservando o layout sem causar "pulos" visuais.
3. **Empty State:** O que acontece quando não há dados (ex: "Você não possui lembretes hoje"). É crucial que o Empty State inclua uma Call to Action útil ("Criar Lembrete") e um ícone ilustrativo elegante.
4. **Error State:** Caso a requisição falhe, apresentar mensagem legível com botão para tentar novamente.

---

# Plano de Refatoração Visual Pós-MVP

Com base na auditoria visual executada no encerramento da fase de MVP, a Central de Suporte requer uma reestruturação estética profunda visando a premissa de um "Modern Operations Center / Premium Technical Dashboard".

O problema central do MVP foi a sobrecarga ("caixa dentro de caixa", excesso de blur, neon, tema escuro cansativo, densidade sufocante).

## 4. Estratégias Visuais e de UX (Pós-MVP)

### 4.1 Princípios Visuais
* **Profissional, não Gamer:** Remoção de tons neon, azuis saturados e efeitos de *glassmorphism* pesados.
* **Hierarquia Clara:** Redução dramática do uso de bordas. Agrupamento lógico por proximidade (Gestalt) e uso inteligente de superfícies discretas (`bg-muted`, `bg-card`).
* **Legibilidade Extrema:** Aumento de contraste útil e descarte do esquema onde o Light Mode era apenas "cores invertidas" de forma arbitrária.

### 4.2 Estratégias de Tema (Dark / Light)
* **Dark Mode:** O fundo não deve ser um gradiente brilhante nem preto puro. Deve adotar um fundo Slate bem opaco/fosco (`slate-950`). Bordas de cards devem ser sutis, apenas um realce imperceptível de 1px.
* **Light Mode:** Fundos off-white (`slate-50`), cards brancos (`white`). O texto não pode ser preto absoluto (`slate-900` para títulos, `slate-600` para descrições).
* *Nota:* A separação visual entre temas deve ser intencional, adaptando contrastes individualmente no Tailwind.

### 4.3 Estratégias de Estrutura e Motion
* **Responsividade:** Abordagem "Desktop-First" justificada, visto ser um sistema de suporte corporativo, com fallback de usabilidade para Mobile em plantões (sem quebrar tabelas).
* **Animações (`motion/react`):** Apenas micro-interações funcionais. Fade in e out sutis. Zero "overshoot" (efeito elástico). Respeito implacável a `prefers-reduced-motion`.
* **Acessibilidade:** WCAG AA como padrão base de constraste (texto sobre fundo). Focus ring visível e unificado (`:focus-visible ring-2 ring-primary`).

## 5. Regras de Componentes Base

* **Bordas:** Evitar bordas duplas ou múltiplas. Usar sombra leve (`shadow-sm` no light mode) ou borda subtil (`border border-border/50` no dark) para demarcar cards. Evitar bordas tracejadas pesadas.
* **Cards:** Não utilizar headers pesados para os cards. Títulos de cards devem fundir-se de forma leve com o corpo.
* **Badges:** Devem ser raras. O status "Ativo" não precisa ser uma badge verde vibrante gritando na tela; basta ser a ausência de cor, enquanto o status "Inativo/Crítico" usa badge. Eliminar badges genéricas decorativas (ex: "Fase 7").
* **Ícones (Lucide):** Devem ser utilitários, não enfeites ao lado de todo texto. Devem ter stroke-width fino (ex: 1.5 a 1.75) para não poluir.
* **Tabelas:** Linhas horizontais (`border-b`) muito sutis, remover bordas verticais, uso de paginação limpa.
* **Modais (Dialog):** Para fluxos de decisão (Confirmações, pequenos formulários destrutivos).
* **Drawers (Painel Lateral):** Para edição rica, exibição de grandes detalhes operacionais ou formulários de entidades complexas (ex: Detalhe de Equipamento, Criar Atendimento). Libera espaço horizontal e mantém o contexto anterior no fundo.
* **Progressive Disclosure:** Exibir campos complexos de formulário ("Configuração Avançada de Licença") apenas se o usuário ativar ou solicitar. Ocultar dados não-críticos de listagens.
* **Página Dedicada:** Reservar apenas para fluxos estendidos (Editor de Conhecimento, Visualização de Artigo Gigante, Dashboard Completo).

---

## 6. Inventário Visual (Telas Existentes) e Alvos da Refatoração

### 1. Dashboard (`/`)
* **Problema Atual:** Telas estáticas, caixas empilhadas, "tudo ao mesmo tempo" sem prioridade, presença de badges ruidosas, banners de OTRS redundantes.
* **Objetivo:** Refinar para ser uma verdadeira "Estação de Comando" de leitura rápida. Focar apenas em "O que eu, técnico, preciso saber AGORA?".
* **Componentes afetados:** Cards de resumo, Lists.

### 2. Atendimentos (`/attendances`)
* **Problema Atual:** Poluição de metadados, campos inúteis disputando espaço com o Diagnóstico (que é o core). Formulários de modal muito densos e pequenos.
* **Objetivo:** Progressive disclosure: Ocultar dados secundários, ampliar a legibilidade do código de terminal executado. Substituir modais por Drawers longos.

### 3. Tarefas (`/tasks`)
* **Problema Atual:** Tabulação visualmente estagnada, cards que não priorizam o status e prazo da tarefa. Excesso de cor nos níveis de prioridade.
* **Objetivo:** Descolorir prioridades baixas, centralizar alertas nas prioridades Urgentes. Listagem com maior espaçamento (breathing room).

### 4. Comandos (`/commands`)
* **Problema Atual:** Efeito "caixa de terminal repetitiva", textos descritivos embolados.
* **Objetivo:** Componente único limpo de código (`<code>` customizado), facilitando cópia sem ruído lateral.

### 5. Infraestrutura (`/infrastructure`)
* **Problema Atual:** Tela mais complexa do sistema, sofre com "Tabs" infinitas. Informações de Licenças ficam escondidas. Modais de equipamento têm dezenas de campos apertados.
* **Objetivo:** Elevar Licenças para status de navegação mais óbvio, migrar os pesados Modais de Gestão de Hardware para Drawers laterais estruturados.

### 6. Conhecimento (`/knowledge`)
* **Problema Atual:** Visualização de artigos sem respiro para leitura (Margens ruins), dificultando tutoriais.
* **Objetivo:** Transformar a leitura de conhecimento numa experiência focada, limpa (estilo documentação de grandes frameworks), com suporte a rich text nativo em largura restrita (max-w-prose).

### 7. Manutenções (`/maintenance`)
* **Problema Atual:** Interface mimetizada de tarefas, sem peso real de agendamento de HW.
* **Objetivo:** Distinguir visualmente o agendamento logístico de uma manutenção vs uma tarefa interna.

### 8. Busca/Relatórios (`/search`)
* **Problema Atual:** Apenas uma página de relatórios tabulares cansativa.
* **Objetivo:** Refinar a hierarquia da pesquisa Ctrl+K (Command Menu) com ícones discretos e atalhos de teclado fáceis.

### 9. Auditoria (`/audit`)
* **Problema Atual:** Tabela brutalista, dados brutos e massivos.
* **Objetivo:** Filtragem amigável de logs de "Revelação de Senha" vs "Logs rotineiros".

### 10. Login (`/login`)
* **Problema Atual:** Excesso de glassmorphism e tentativa de emular "app financeira".
* **Objetivo:** Tela limpa, corporativa, com branding sólido da operação técnica.

---

## 7. DASHBOARD V2 (Arquitetura Conceitual Visual)

O Dashboard abandonará os módulos isolados genéricos e servirá ao paradigma de **Central Operacional**.

**A Hierarquia (O que o usuário vê na ordem de importância):**
1. **Critical Alerts (Topo Absoluto):** Apenas se existirem (ex: "3 Licenças Vencem Hoje", "Toner de Impressão Abaixo do Mínimo", "Ativos Fora do Ar"). Se não houver, esta área some.
2. **"O Meu Turno" (Superior Esquerdo):** O que o técnico específico tem para o dia: Manutenções do seu nome, Tarefas Urgentes para hoje e Lembretes.
3. **Métricas de Performance da Equipe (Superior Direito):** Resumo enxuto e estético: N° de Atendimentos de Hoje, Taxa de Resolução.
4. **Contexto Contínuo (Meio/Inferior):** Visão cronológica (Timeline) das atividades recentes e fluxo dos novos conhecimentos inseridos na base, permitindo se atualizar sobre o turno anterior.
5. **Ações Rápidas Flutuantes / Fijas:** "Abrir Atendimento", "Cadastrar HW".

---

## 8. Auditoria de Toasts e Feedback

No MVP, o abuso de "Toasts" para qualquer clique gerou fadiga.

### Nova Estratégia de Feedback:
* **Sucesso Simples (Ex: "Copiado para área de transferência"):** Não usar Toast intrusivo de canto. Usar mudança discreta no ícone do próprio botão (ex: de Copy para Check verde com fade) por 2 segundos.
* **Sucesso Funcional (Ex: "Equipamento Atualizado"):** Um Toast verde suave, sem som, duração de 3 segundos, auto-dismiss.
* **Confirmação/Desfazer (Undo):** Para ações não-permanentes destrutivas ("Tarefa arquivada"). O Toast deve conter botão claro de `Desfazer`.
* **Aviso (Warning):** Toast amarelo exigindo atenção, sem bloqueio (ex: "Licença atualizada, mas faltam vagas").
* **Erro:** Toast de destaque alto, não some automaticamente se for falha crítica de backend. Requer fechamento manual.
* **Confirmações Destrutivas Irreversíveis (Hard Deletes e Ativos Críticos):** Não usar Toasts. Requer um `<Dialog>` no centro da tela ("Tem certeza que deseja inutilizar o equipamento?").
* **Loading Actions:** Evitar travar a tela inteira. Apenas o botão específico clicado deve ganhar um spinner ou estado de disabled/loading.

---

## 9. Estratégia Sugerida para Implementação Visual

*(Não formam o ROADMAP definitivo de negócio, mas a diretriz de trabalho do engenheiro frontend)*

1. **FASE VISUAL 1:** Ajuste de fundações: `DESIGN_SYSTEM.md`, limpeza profunda do `tailwind.config.js`, paleta de cores (eliminação de neon e ajuste de fundos Dark/Light).
2. **FASE VISUAL 2:** Refatoração do Shell: `Sidebar`, `Header`, App Layout base e Command Menu (`Ctrl+K`).
3. **FASE VISUAL 3:** Limpeza de Componentes Shadcn base: Atualização estrutural nos arquétipos dos modais (`Dialog`), `Drawers`, `Cards`, `Badges` e `Buttons`, matando excesso de borders.
4. **FASE VISUAL 4:** Reescrita completa do `Dashboard V2` sob as novas diretrizes.
5. **FASE VISUAL 5:** Refatoração paulatina das Telas de Domínio (Uma por vez: Tarefas, depois Infra, depois Atendimentos, trocando Modais densos por Drawers longos, e limpando as listas).
6. **FASE VISUAL 6:** Pente Fino: Acessibilidade final (Contrast Check WCAG), calibração final do `prefers-reduced-motion` e testes manuais nos modos Dark/Light de todas as rotas.
