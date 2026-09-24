# Diretrizes de UI/UX — Central de Suporte

Este documento estabelece o novo padrão visual permanente para a Central de Suporte, garantindo que o design deixe de ser "visualmente simplista" e passe a ser moderno, profissional, tecnológico, premium e organizado.

## 1. Princípios de Design (O Novo Padrão)

A interface deve impressionar (fator "WOW") mantendo total funcionalidade operacional. 

*   **Moderno e Tecnológico:** Utilização de glassmorphism (fundos com blur), bordas translúcidas e superfícies que transmitem a sensação de um painel de controle avançado.
*   **Premium e Profissional:** Cores cuidadosamente selecionadas (Tailwind cores expandidas, HSL curado), fugindo das paletas padrão (vermelho puro, azul puro). Foco profundo em Dark Mode elegante.
*   **Hierarquia Visual:** Elevação clara através de luzes, sombras (dropshadows customizados) e contraste entre a superfície de fundo e os cards de conteúdo.
*   **Responsivo e Dinâmico:** Animações fluidas (micro-interações) em botões, cards e navegações, utilizando `framer-motion` para suavizar entradas e saídas.

## 2. Paleta de Cores e Tematização

O projeto utilizará uma paleta baseada no espectro Dark/Neon para o modo noturno (padrão principal da equipe de TI) e um modo claro limpo e de alto contraste.

*   **Backgrounds:** Tons profundos em vez de preto puro (ex: `#0d0e15`, `#1e202e` para cards). Utilização de `radial-gradient` sutil para quebrar o chapado.
*   **Acentos (Primary):** Roxo neon, azul ciano, e tons de índigo (`#9333ea`, `#a855f7`, `#06b6d4`).
*   **Bordas:** Translúcidas (`rgba(255,255,255, 0.08)`) para reforçar o glassmorphism.
*   **Texto:** Cores em gradiente para títulos principais e cinzas frios (`#94a3b8`, `#cbd5e1`) para parágrafos.

## 3. Tipografia

A tipografia deve afastar o sistema da aparência de "template padrão":
*   **Fonte Principal:** Inter ou Outfit (tipografia sem serifa moderna).
*   **Pesos:** Utilizar fontes em Bold (700) com letter-spacing negativo para títulos, e Medium (500) para legibilidade em tabelas e badges.

## 4. Componentes Chave

### Cards e Superfícies
*   Todos os cards devem utilizar background com opacidade reduzida e `backdrop-filter: blur()`.
*   Possuir bordas translúcidas e sombras suaves.
*   Ao passar o mouse (hover), os cards interativos devem transladar sutilmente (`translateY(-2px)`) e intensificar a sombra.

### Botões e Inputs
*   Botões principais devem usar gradientes de cor (ex: `bg-gradient-to-r from-purple-600 to-indigo-600`).
*   Efeitos de hover bem definidos e transição suave (`transition-all duration-200`).
*   Inputs não devem ser brancos chapados no dark mode; devem ser fundos escuros, com bordas que se acendem na cor primária ao receber `:focus`.

### Badges e Status
*   Utilizar badges com fundo colorido de baixa opacidade e texto vibrante (ex: background vermelho 10% com texto vermelho 80%) em vez de cores sólidas, para um visual mais refinado.

## 5. Ferramentas e Bibliotecas

*   **Tailwind CSS:** Para tokens de design, gradientes, blurs.
*   **shadcn/ui:** Como base de estrutura, porém **fortemente customizado** para abandonar o visual nativo.
*   **Framer Motion:** Para animações (`AnimatePresence`, layouts animados).
*   **Lucide Icons:** Para iconografia.

## 6. Proibido (O que evitar)

*   **Evitar branco absoluto (#fff) e preto absoluto (#000)** em superfícies grandes.
*   **Evitar componentes sem hover.** Toda superfície interativa deve reagir ao usuário.
*   **Evitar cards completamente achatados** sem borda diferenciada de contraste com o fundo.
