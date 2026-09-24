# DESIGN SYSTEM

O presente documento define a identidade visual e os princípios de design (UI) definitivos da Central Operacional do Suporte Técnico.

## 1. Visão Geral

A interface deve ser moderna, profissional, tecnológica e premium. Deve transmitir a sensação de um "painel de controle" sofisticado sem parecer um CRUD administrativo genérico.

**Evitar:**
* Telas chapadas e excesso de bordas/linhas divisórias.
* Componentes padronizados do shadcn/ui sem customização.
* Tema claro sendo apenas a inversão do escuro.
* Excesso de efeitos ou animações desnecessárias.

**Princípio sobre Glassmorphism:** O uso de fundos translúcidos com blur (Glassmorphism) **não** é regra obrigatória para toda a aplicação. Deve ser utilizado de forma seletiva (ex: sidebars, navbars, cards em destaque ou modais) para criar profundidade e hierarquia, sem sobrecarregar a interface.

---

## 2. Cores e Identidade Visual

### Modo Escuro (Default/Principal)
O foco principal para a equipe de TI é o Dark Mode elegante (profundo, sem preto absoluto).
* **Fundo (Background):** `#0F172A` (Slate 900) ou `#0B0F19` com leves gradientes radiais.
* **Superfícies (Cards/Modais):** `#1E293B` (Slate 800) ou fundos levemente translúcidos `rgba(30, 41, 59, 0.7)` com `backdrop-blur`.
* **Cor Primária (Acentos):** Azul elétrico (`#3B82F6` ou `#2563EB`) e Indigo (`#6366F1`), transmitindo tecnologia.
* **Bordas:** Sutis, apenas para contraste leve (`rgba(255,255,255, 0.05)` ou `border-slate-800`).
* **Texto:** Principal em `#F8FAFC` (Slate 50), secundário em `#94A3B8` (Slate 400).

### Modo Claro
Deve possuir alto contraste, sem ofuscar a visão.
* **Fundo (Background):** `#F8FAFC` (Slate 50).
* **Superfícies:** `#FFFFFF` com sombras suaves e limpas (`shadow-sm` ou `shadow-md`).
* **Bordas:** `#E2E8F0` (Slate 200).

### Cores Semânticas
* **Sucesso:** `#10B981` (Emerald 500) com fundo de opacidade 15% para badges.
* **Aviso:** `#F59E0B` (Amber 500) com fundo de opacidade 15% para badges.
* **Erro:** `#EF4444` (Red 500) com fundo de opacidade 15% para badges.
* **Info:** `#0EA5E9` (Sky 500) com fundo de opacidade 15% para badges.

---

## 3. Tipografia

* **Fonte Principal:** `Inter` (para parágrafos, UI, densidade) ou `Outfit` / `Plus Jakarta Sans` (para cabeçalhos e destaques numéricos).
* **Escala:**
  * `text-2xl` a `text-4xl` para Page Headers, com `font-bold` e `tracking-tight`.
  * `text-sm` (14px) para a maior parte das listagens e cards operacionais.
  * `text-xs` (12px) para badges, metadados e breadcrumbs.

---

## 4. Componentes e Composição

### Superfícies e Hierarquia (Elevação)
* Cards não devem ter bordas fortes se o contraste de fundo já for suficiente.
* Utilizar `shadow-lg` combinado com bordas translúcidas em dropdowns e modais.
* Tabelas não devem possuir grids internos marcados. Utilize divisórias sutis horizontais (`border-b border-border/40`) e amplo espaçamento (`padding`).

### Inputs e Botões
* **Botões:** O CTA primário pode utilizar um gradiente sutil. Deve possuir efeito de hover claro (ex: `hover:brightness-110`, translação leve de -1px).
* **Inputs:** Fundo contrastante com a superfície. No dark mode, utilizar um tom ligeiramente mais claro ou mais escuro que o card, com border sutil. `focus:ring` deve ser evidente com a cor primária.

### Empty States e Loading
* **Skeletons:** Utilizar skeletons pulsantes (`animate-pulse`) ao invés de spinners agressivos.
* **Empty States:** Não mostrar tela em branco. Apresentar um ícone (Lucide) estilizado com baixa opacidade, um título claro e uma call-to-action primária se a permissão permitir criar o registro.

---

## 5. Motion (Animações)

O sistema de animações será provido exclusivamente pela biblioteca oficial:
**`motion/react`** (Não utilizar a importação antiga `framer-motion`).

* **Uso:** Discreto e funcional.
* **Quando usar:**
  * Modais, drawers e dropdowns (Entrada em escala/fade).
  * Hover em cards ou botões importantes.
  * Transições rápidas entre abas (Tabs) e mudanças de layout.
  * Feedback imediato (ex: Toast, sucesso).
* **Regra Fundamental:** Respeitar `prefers-reduced-motion` utilizando os hooks apropriados do framer/motion para cancelar translações de UI caso o SO do usuário requisite.

---

## 6. Acessibilidade e Responsividade

* Foco de teclado (`focus-visible`) deve ser impecável.
* Contraste de texto em backgrounds e badges.
* A interface desktop é prioridade, porém modais devem virar `Drawers` ou ocupar tela cheia em dispositivos menores (Tailwind `sm:` / `md:` breakpoints).
