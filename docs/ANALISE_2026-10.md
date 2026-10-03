# Análise completa — Central de Suporte (2026-10-03)

Diagnóstico feito lendo código, banco e documentação. Ele é a base do
**Ciclo S — Simplificação** descrito em `ROADMAP.md`. Cada problema tem um código (`P-xx`)
que é citado no roadmap. Para saber o que já foi resolvido, veja o status no `ROADMAP.md`.

---

## 1. Resumo

O sistema tem **muita funcionalidade** (15 telas, ~40 tabelas, ~160 testes de backend),
mas cresceu fase a fase sem uma visão do **fluxo diário do técnico**. O resultado:

* módulos que deveriam conversar estão desconectados (atendimento não se liga ao equipamento);
* navegação longa e com nomes confusos (13 itens, grupos "Operação & Diagnóstico" / "Inventário & Sistema");
* funções repetidas em várias telas (lembretes em 3 lugares, banners do OTRS em 3 lugares);
* a busca global (Ctrl+K) leva para uma página que mistura busca e relatórios, e o resultado não abre o item;
* o dashboard mostra números errados;
* a base de testes escrevia **no banco real** (resolvido em 2026-10-03, ver P-01);
* a documentação tinha ~46 arquivos, com fases numeradas em duplicidade (Fase 10 do MVP e "Fase 10 Pós-MVP") e informações contraditórias.

Não é necessário reescrever o sistema. O backend é sólido (RBAC, auditoria, anexos seguros).
O trabalho é **reorganizar, conectar e simplificar**.

---

## 2. Problemas de base (fundação)

| Código | Problema | Impacto |
|---|---|---|
| P-01 | Os testes do backend usavam o mesmo banco da aplicação (`centralsuporte_db`). | Banco real tem ~578 usuários, ~564 perfis, ~8.000 lembretes, ~330 tarefas e ~120 artigos de teste misturados aos dados reais. Cada execução da suíte sujava mais. **Corrigido** com `backend/conftest.py` (banco `centralsuporte_test`). A limpeza dos dados já existentes ainda depende de decisão (ver P-02). |
| P-02 | Banco principal poluído por dados de teste. | Listas, buscas, relatórios e dashboard mostram lixo. Há dados reais misturados (ex.: comandos "Destravar caixa", "Cancelar Venda Corrente", "Conectar SSH"). Precisa de limpeza com backup e confirmação do responsável. |
| P-03 | Trabalho de paginação de tarefas deixado pela metade (build TypeScript quebrado, 3 testes falhando). | **Corrigido** (commit `feat(tasks): paginate task list`). |
| P-04 | Scripts soltos na raiz (`fix_prefix.py`, `fix_maintenance_test.py`) e testes fora de `tests/`. | **Corrigido**. |
| P-05 | `User(role_id=...)` abria uma segunda sessão de banco dentro do construtor. | Erros intermitentes de sessão. **Corrigido** (resolução no `before_flush`). |
| P-06 | Produção roda em modo desenvolvimento: `uvicorn --reload` e `vite` dev server; `SECRET_KEY` e senha `admin123` têm valores padrão no código. | Risco de segurança e desempenho. Precisa de `.env` com segredos reais e build de produção do frontend. |
| P-07 | Documentação inchada e contraditória (ex.: ROADMAP marcava 12.2 tarefas 3–5 como pendentes; PROJECT_STATE dizia concluídas). | Agentes de IA se perdiam e repetiam trabalho. **Corrigido** nesta reorganização (`docs/README.md`, histórico em `docs/history/`). |

---

## 3. Navegação e arquitetura de informação

### 3.1 Menu atual (antes do Ciclo S)

```
Operação & Diagnóstico            Inventário & Sistema
  Dashboard                         Infraestrutura & Parque  (abas: Equipamentos, Lojas, Licenças, Estoque)
  Pesquisa & Relatórios             Arquivos e Docs
  Projetos                          Usuários
  Tarefas e Checklists              Perfis e Permissões
  Manutenções                       Auditoria & Logs
  Base de Conhecimento
  Comandos e Respostas
  Atendimentos Internos
```

| Código | Problema |
|---|---|
| P-10 | 13 itens sem ordem de uso. "Atendimentos" (o fluxo mais usado) é o 8º item. |
| P-11 | "Pesquisa & Relatórios" junta duas coisas diferentes. Ctrl+K troca de página e o técnico perde o contexto da tela em que estava. |
| P-12 | Resultado da busca leva só para o módulo (`url_tab`), não abre o item encontrado. |
| P-13 | "Usuários" e "Perfis e Permissões" são telas separadas da mesma área administrativa. |
| P-14 | Restos de desenvolvimento visíveis: badges "Fase 8"/"Fase 6" nos títulos, tela genérica "Roadmap Futuro", mock de dashboard dentro de `services/`. |
| P-15 | Aviso do OTRS repetido em três lugares (card fixo na sidebar, banner no dashboard, tela "Roadmap Futuro"). Ocupa espaço sem ajudar no trabalho. |
| P-16 | Deep link (`#modulo?id=N`) só funciona em Atendimentos e Conhecimento (e em Atendimentos só se o item estiver na lista carregada). |

### 3.2 Menu proposto (por intenção de uso)

```
                Início
DIA A DIA       Atendimentos · Tarefas e Agenda · Manutenções · Projetos
CONHECIMENTO    Base de Conhecimento · Comandos e Respostas · Arquivos
INVENTÁRIO      Equipamentos e Lojas (abas: Equipamentos, Lojas, Licenças, Estoque)
GESTÃO          Relatórios · Usuários e Permissões · Auditoria
```

Busca global vira uma **paleta flutuante** (Ctrl+K ou botão no topo) que abre o item direto.

---

## 4. Fluxos principais

### 4.1 Atendimento interno (fluxo central do produto)

O produto existe para guardar "como resolvi" e "em qual máquina" (PRODUCT_SPEC §2).

| Código | Problema |
|---|---|
| P-20 | O formulário não tem campos para **descrição do problema**, **sintomas**, **URL do OTRS** e **notas internas** — eles existem no banco e na API, mas o técnico não consegue preencher. A lista mostra "Sem descrição detalhada" quando falta diagnóstico. |
| P-21 | Equipamento é **texto livre** (`equipment_name`), apesar de existir `equipment_id`. Loja/Depto também é texto livre. Resultado: o histórico do equipamento não mostra os atendimentos feitos nele. |
| P-22 | A ficha do equipamento mostra só o "histórico técnico" (`equipment_history`). Não mostra atendimentos nem manutenções diretamente. |
| P-23 | Do equipamento não dá para "registrar atendimento" ou "agendar manutenção" já com ele selecionado. |

### 4.2 Tarefas, lembretes e agenda

| Código | Problema |
|---|---|
| P-30 | Lembretes aparecem em três lugares (sino de notificações, dashboard, painel lateral de Tarefas) com dois componentes diferentes de mesmo nome (`components/dashboard/RemindersSection.tsx` e `components/tasks/RemindersSection.tsx`). |
| P-31 | A automação cria "alertas" como registros de `Reminder`. Não está errado, mas o técnico não distingue lembrete próprio de alerta automático. |
| P-32 | Agenda (`CalendarEvent`) fica escondida no painel lateral de Tarefas, enquanto Manutenções tem a sua própria visão de calendário. |

### 4.3 Dashboard (Início)

| Código | Problema |
|---|---|
| P-40 | Métricas "Pendentes" e "Em curso" contam apenas as **10 primeiras** tarefas carregadas. |
| P-41 | "Atendimentos — Total hoje" mostra o total geral, não o de hoje. "Base — Artigos" carrega todos os artigos só para contar. |
| P-42 | Não mostra o que o PRODUCT_SPEC pede para o início de turno: tarefas atrasadas, manutenções do dia, estoque baixo, licenças vencendo. |

### 4.4 Conhecimento e comandos

| Código | Problema |
|---|---|
| P-50 | Conhecimento e Comandos são módulos separados, mas os dois são "como fazer". Manter separados é aceitável (comandos são copiáveis, artigos são texto), mas a busca precisa cobrir os dois — e cobre. Sem ação imediata. |
| P-51 | `CommandsPage.tsx` tem 1.353 linhas e `AttendancePage.tsx` 983 — difíceis de manter. |

---

## 5. Código compartilhado

| Código | Problema |
|---|---|
| P-60 | Cada página reimplementa cabeçalho, barra de filtros, badges de status/prioridade e estados de carregamento/vazio/erro. |
| P-61 | Exclusões usam `window.confirm` nativo (feio e inconsistente com o design). |
| P-62 | Listas grandes ainda carregam tudo de uma vez (atendimentos, equipamentos com histórico completo, artigos). Só tarefas e arquivos são paginados. |
| P-63 | Roteamento por hash feito à mão em `AuthenticatedView.tsx` com uma cadeia de ternários; cada página lê `window.location.hash` do seu jeito. |

---

## 6. O que está bom e deve ser mantido

* Backend organizado por roteadores, RBAC com permissões finas, auditoria com sanitização de segredos.
* Anexos com `StorageAdapter`, autorização contextual, allowlist de tipos e soft delete.
* Conversão de atendimento em artigo de conhecimento.
* Comandos multi-passo com "copiar tudo".
* Projetos como agregadores opcionais (sem cascade delete).
* Tema claro/escuro, atalhos de teclado, code-splitting.
