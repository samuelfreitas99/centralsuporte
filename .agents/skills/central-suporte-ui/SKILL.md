---
name: central-suporte-ui
description: >-
  Skill obrigatória e específica para o desenvolvimento frontend da Central de Suporte.
  Garante o alinhamento com a identidade visual premium, regras de UX, acessibilidade 
  e uso funcional de animações, evitando a criação de UIs genéricas.
---

# UI/UX Skill — Central de Suporte

Sempre que atuar no frontend (React/Tailwind) deste projeto, você deve OBRIGATORIAMENTE seguir estas diretrizes. O objetivo é manter o padrão estabelecido, sem criar "ilhas" de design com aparência genérica ou conflitante.

## 1. Documentação Obrigatória
Antes de implementar qualquer tela ou componente visual, você deve alinhar seu código lendo:
1. `docs/DESIGN_SYSTEM.md` (A fonte primária para estética, cores, tipografia e motion).
2. `docs/UI_UX.md` (Princípios de fricção, hierarquia e comportamento de tela).
3. `docs/PRODUCT_SPEC.md` (Para entender o escopo da funcionalidade).

## 2. Padrões de Implementação (O que Fazer)
* **Reutilização:** Sempre tente estender os componentes da pasta `components/ui` existentes antes de criar novos do zero.
* **Consistência:** Utilize os tokens de Tailwind definidos no tema (cores semânticas, bordas, background) para implementar o Light Mode e Dark Mode corretamente, preservando a identidade visual premium.
* **Estados da Tela:** Valide e implemente os 4 estados cruciais sempre que buscar dados do backend: Ideal, Loading (Skeletons), Empty State e Error.
* **Responsividade e Acessibilidade:** Garanta que a tela quebre suavemente em mobile/tablet e que o `focus-visible` do teclado esteja funcionando bem, mantendo alto contraste nos textos e badges.
* **Ícones:** Utilize a biblioteca de ícones (`lucide-react`) de forma consistente em termos de tamanho e `strokeWidth`.

## 3. Motion (Animações)
* Utilize **exclusivamente** a biblioteca `motion/react`.
* Aplique animações com **propósito** (indicadores de entrada/saída, modais, dropdowns, feedback de sucesso).
* **Obrigatório:** Respeite o `prefers-reduced-motion` utilizando os hooks adequados da biblioteca para cancelar movimentos se o usuário assim preferir.

## 4. O que NÃO Fazer (Evitar)
* NÃO crie UI com aparência de "template padrão" ou "CRUD genérico administrativo".
* NÃO adicione `framer-motion` nas dependências. Apenas use o `motion/react`.
* NÃO utilize excesso de efeitos (como blurs exagerados ou gradientes de arco-íris) nem faça uma tela parecer feita inteiramente de vidro (Glassmorphism apenas onde fizer sentido).
* NÃO crie soluções visuais isoladas que contradigam o `DESIGN_SYSTEM.md`. Se o componente precisar evoluir, a evolução deve servir para todo o projeto.
