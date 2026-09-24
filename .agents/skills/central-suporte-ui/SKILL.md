---
name: central-suporte-ui
description: >-
  Skill obrigatória para desenvolvimento de UI no projeto Central de Suporte.
  Contém as regras de consistência visual, design premium, uso de glassmorphism, 
  framer-motion e Tailwind customizado, garantindo que o design não fique simplista.
---

# UI/UX Skill — Central de Suporte

Ao atuar no frontend deste projeto, você deve OBRIGATORIAMENTE seguir as seguintes diretrizes para garantir uma UI premium, moderna e coesa (conforme `docs/UI_UX.md`).

## 1. Diretriz Principal
O design atual estava visualmente simplista por usar apenas o padrão básico do `shadcn/ui` com cores chapadas e falta de profundidade. A partir de agora, **toda tela ou componente novo deve ser visualmente rico e altamente polido**.

## 2. Regras de Estilo (Tailwind + CSS)
* **Profundidade e Glassmorphism**: Use `bg-background/80`, `backdrop-blur-xl`, e bordas translúcidas (`border-white/10` ou `border-border/50`) em Cards, Modals e Dropdowns.
* **Gradientes**: Use gradientes sutis em fundos principais e em botões de destaque (CTA).
* **Hover States**: Sempre aplique hover states significativos (ex: `hover:bg-accent/50`, `hover:-translate-y-1`, `hover:shadow-lg`, `transition-all duration-300`).
* **Tipografia**: Garanta excelente hierarquia usando tamanhos contrastantes e cores atenuadas para subtítulos (`text-muted-foreground`).

## 3. Uso de Animações
* Integração de **framer-motion** é encorajada para transições de página, carregamento de listas e modais.
* Exemplo de wrapper animado:
```tsx
import { motion } from 'framer-motion';

export const FadeIn = ({ children }) => (
  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
    {children}
  </motion.div>
);
```

## 4. Consistência do shadcn/ui
Ao utilizar componentes do shadcn (já na pasta `components/ui`), não se limite ao visual out-of-the-box caso ele destoe do padrão premium exigido. Adicione classes Tailwind (ex: `className="bg-white/5 backdrop-blur border-white/10"`) quando instanciar o componente nas telas para alcançar a estética definida.

## 5. Proibições
* NÃO crie telas com fundos de uma única cor sólida chapada e cards da mesma cor sólida por cima, sem borda de contraste ou elevação.
* NÃO utilize cores genéricas (red-500, blue-500) para avisos. Utilize a paleta ajustada do tema, favorecendo badges com background de baixa opacidade e texto vivo.

**LEMBRE-SE:** O objetivo é impressionar o usuário, trazendo a sensação de um produto de altíssima tecnologia.
