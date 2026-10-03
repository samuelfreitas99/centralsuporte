# PLANEJAMENTO UX/UI — FASE 8.3: INFRAESTRUTURA

## 1. Visão Geral: O "Operations Center"

O objetivo desta fase é consolidar o domínio de Infraestrutura como um painel de controle técnico focado em altíssima eficiência. A estética afasta-se deliberadamente de sistemas ERP corporativos (excesso de caixas aninhadas, bordas múltiplas, modais intrusivos) e adota um design utilitário, com densidade de informação inteligente.

A interface fará uso intensivo de **Progressive Disclosure** (revelação progressiva através de Drawers laterais) e **Redução de Ruído** (substituição de badges coloridas por tipografia semântica, contraste funcional e linhas guia extremamente sutis).

---

## 2. Abordagem de "Racks" e Localidades (Lojas/Departamentos)

Respondendo à necessidade de gerenciar nós físicos de rede (Ex: "Rack Depósito CDI", "Rack Loja 02"), a abstração atual de `Department` será expandida em usabilidade para representar **Racks / Network Closets**.

- **Estratégia:** O Drawer de detalhes de um Departamento/Loja ganhará uma seção dedicada de "Documentação do Rack".
- O componente `AttachmentManager` será injetado nessa visão para que os técnicos fotografem a topologia (antes/depois da manutenção, fotos do patch panel, estabilizadores) e anexem diretamente ao local.
- Equipamentos pertencerão a esses locais e o Drawer do local exibirá um acesso rápido ("shortcut") aos ativos lá alocados.

---

## 3. Especificações Visuais por Módulo

### 3.1 EQUIPAMENTOS

**Diretrizes:**
- **Lista/Tabela:** Em vez de dezenas de cards pequenos, usar uma exibição tabular fluida ou list-items expansivos. Sem bordas verticais, com divisor horizontal em opacidade mínima (`border-border/40`).
- **Filtros Contextuais:** Barra de busca principal no topo e selects discretos alinhados horizontalmente ("Local/Rack", "Status", "Tipo").
- **Ações Diretas:** Visíveis via hover no desktop ou menu 'ellipsis'. As ações destrutivas nunca abrem formulários grandes na tela; a deleção exige apenas confirmação.
- **Detalhamento:** Migrado totalmente para um **Drawer Lateral**. 

**Comportamento do Drawer (Equipamento):**
- O Drawer concentra: *Detalhes Base*, *Configurações de Rede*, *Histórico de Vida (Manutenções)* e *Documentação (NFs/Termos)* em um só lugar vertical, organizados por separadores ou abas internas sem poluição visual.

**Wireframe Textual (Drawer de Equipamento):**
```text
+---------------------------------------------------------+
| [X] Cancelar                                [ Salvar ]  |
+---------------------------------------------------------+
| [Ícone] SRV-DC-01 (Servidor)                            |
| 📍 Rack Loja 02 - Shopping                              |
|---------------------------------------------------------|
| [ Info Base ]   [ Rede & SO ]   [ Histórico Técnico ]   |
|                                                         |
| Hostname *           IP de Rede                         |
| [ SRV-DC-01     ]    [ 10.0.0.10      ]                 |
|                                                         |
| MAC Address          Fabricante/Modelo                  |
| [ AA:BB:CC...   ]    [ Dell R740      ]                 |
|                                                         |
| Status Operacional                                      |
| (•) Ativo  ( ) Reserva  ( ) Em Manutenção               |
|                                                         |
| + Adicionar Histórico / Intervenção                     |
| Anexos > (1 arquivo encontrado)                         |
+---------------------------------------------------------+
```

---

### 3.2 LOJAS / DEPARTAMENTOS (Locais e Racks)

**Diretrizes:**
- **Estrutura:** Exibição em seções expansíveis (Accordions leves) ou em um Grid de cards minimalistas (shadow-sm, sem borda forte) onde a Loja é a raiz e os Racks/Departamentos são child-items textuais com contadores.
- **Relacionamento:** Clicar num Rack/Departamento abre o painel focando na documentação do ambiente.

**Wireframe Textual (Drawer da Localidade/Rack):**
```text
+---------------------------------------------------------+
| [X] Fechar                                  [ Editar ]  |
+---------------------------------------------------------+
| 🏢 Loja 02 - Shopping Centro                            |
| ↳ Rack Principal (Nó de Rede)                           |
|---------------------------------------------------------|
| 📸 TOPOLOGIA E FOTOS (Dropzone)                         |
| [Thumb_Cable1.jpg] [Thumb_Nobreak.jpg] [+ Anexar Foto]  |
|                                                         |
| 🖥️ EQUIPAMENTOS ALOCADOS NESTE RACK (3):                |
| - FW-Pfsense-02  (10.0.2.1)   [Acessar]                 |
| - SW-Aruba-01    (10.0.2.2)   [Acessar]                 |
| - Ctrl-Unifi-01  (10.0.2.3)   [Acessar]                 |
+---------------------------------------------------------+
```

---

### 3.3 LICENÇAS

**Diretrizes:**
- **Visualização de Status e Expiração:** Não utilizar badges coloridas que agridem os olhos. Utilizar *Progress Bars* lineares (ex: 8 de 10 ocupados). Para expiração, a cor da fonte alerta o usuário sutilmente (vermelho para vencida, amarelo próximo de vencer).
- **Mascaramento e Cópia (Reveal):** 
  - A chave de licença ficará sempre mascarada na lista: `••••-••••-••••`.
  - O ícone "Olho" revelará a chave por 5 a 10 segundos, convertendo-se num texto legível e acionando o request à API, fechando automaticamente após o timeout para segurança de observação lateral (shoulder surfing).
  - O ícone "Copiar" fará o request silencioso em background injetando no `clipboard` sem expor a chave na tela.

**Wireframe Textual:**
```text
+---------------------------------------------------------------+
| PRODUTO          USO / ASSENTOS      VENCIMENTO   CHAVE       |
|---------------------------------------------------------------|
| Microsoft 365    [||||||||  ] 8/10   12/Dez/26    ••••-•••• 👁 📋 |
| Adobe CC         [||||||||||] 2/2!   Hoje (Urgent)••••-•••• 👁 📋 |
+---------------------------------------------------------------+
```

---

### 3.4 ESTOQUE OPERACIONAL

**Diretrizes:**
- **Foco:** Itens críticos e ações diretas. O layout não deve emular um ERP de suprimentos. 
- **Estrutura (Master-Detail View):** Na esquerda, a lista de itens. Ao selecionar um item, a direita atualiza sem modais para exibir as últimas entradas e saídas (Timeline rápida).
- **Alerta de Nível Mínimo:** Itens com quantidade abaixo do saldo mínimo ganham um realce sutil na linha inteira (`bg-amber-500/10`) em vez de criar caixas pesadas.
- **Movimentação Descomplicada:** Botão direto `[+/- Movimentar]` dispara um dialog minimalista ("Você está Retirando 1 Cabo. Motivo: Instalação Loja 02") e resolve em 2 cliques.

**Wireframe Textual (Split View de Estoque):**
```text
[   LISTA DE ITENS (ESQUERDA)  ] | [    DETALHE E MOVIMENTAÇÕES (DIREITA)   ]
                                 |
QTD  ITEM                 AÇÕES  | 📦 Switch 8P TPLink (Saldo: 0) [CRÍTICO]
[0]! Switch 8P TPLink    [+/-]   |
[12] Teclado USB         [+/-]   | ⏱ Últimas Movimentações:
[3]  Cabo de Rede        [+/-]   | - Saída (1x) - Hoje 09:00 - João
                                 | - Entrada (5x) - Ontem 14:00 - Maria
                                 |
                                 | [ Retirar Item ]  [ Adicionar Saldo ]
```

---

## 4. Práticas Fundamentais (Checklist de Refatoração UI)

1. **Drawers sobre Modais:** Formulários volumosos não podem ficar centralizados escurecendo o fundo e limitando rolagem. Drawers ancorados à direita aproveitam a verticalidade.
2. **Skeletons Confiáveis:** Para `InfrastructurePage`, durante o `isLoading`, exibir um Skeleton desenhado especificamente para a aba (ex: barra superior e formato de tabela), eliminando qualquer *Layout Shift*.
3. **Empty States Inteligentes:** Se não há licenças ou não há equipamentos com determinado filtro, uma ilustração limpa (`lucide-react` ampliada, tom de cinza) e o botão "Adicionar Primeiro" devem centralizar a página.
4. **Motion e Transições:** Utilizar `framer-motion` (motion/react) unicamente para os fades iniciais (`opacity: 0` para `opacity: 1`) e aparição lateral dos Drawers (`x: '100%'` para `x: 0`). Duração máxima de 200ms para fricção zero.
5. **Independência de Tema (Dark/Light):** Bordas sólidas brancas em dark mode são agressivas; no Dark Mode as bordas serão translúcidas (`border-border/30`). No Light mode podem ter shadow leve.
