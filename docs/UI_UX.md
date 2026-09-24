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

### 2.2 Hierarquia Semântica e Visual (Consulte DESIGN_SYSTEM.md)
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
3. **Empty State:** O que acontece quando não há dados (ex: "Você não possui lembretes hoje"). É crucial que o Empty State inclua uma Call to Action útil ("Criar Lembrete") e um ícone ou imagem ilustrativa elegante (evitar fundos puramente em branco).
4. **Error State:** Caso a requisição falhe, apresentar mensagem legível (não o stack trace técnico, embora sejas para TI) com botão para tentar novamente.
