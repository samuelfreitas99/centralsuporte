# ROADMAP

Define **o que fazer e em qual ordem**. O histórico detalhado das fases 0 a 12 está em
`docs/history/ROADMAP_FASES_0_A_12.md` — não continue a numeração antiga.

Legenda: `[x]` concluído · `[~]` em andamento · `[ ]` pendente · `[?]` aguarda decisão do responsável.

---

## Já entregue (fases 0–12, resumo)

Autenticação JWT e RBAC multi-perfil · Dashboard · Tarefas, checklists (com modelos), lembretes e agenda ·
Base de Conhecimento com versões e categorias · Comandos multi-passo e Respostas padrão ·
Atendimentos internos com notas e conversão em artigo · Infraestrutura (lojas, departamentos,
locais técnicos, equipamentos, licenças, estoque) · Manutenções com N equipamentos ·
Projetos operacionais · Usuários, perfis e matriz de permissões · Central de Arquivos com
anexos seguros · Busca global e relatórios com CSV · Auditoria · Automação de alertas ·
Paginação (fundação + tarefas).

---

## Ciclo S — Simplificação (atual)

Origem: `docs/ANALISE_2026-10.md` (códigos `P-xx`). Objetivo: deixar o sistema **simples,
conectado e intuitivo** para o dia a dia do suporte, sem adicionar módulos novos.

### S0 — Fundação
- [x] S0.1 Isolar a suíte de testes do banco real (`backend/conftest.py`) — P-01
- [x] S0.2 Concluir paginação de tarefas — P-03
- [x] S0.3 Remover scripts soltos, mover testes para `tests/`, corrigir `User(role_id=...)` — P-04, P-05
- [x] S0.4 Reorganizar documentação (`docs/README.md`, histórico em `docs/history/`) — P-07
- [x] S0.7 Exigir permissões RBAC em Atendimentos, Manutenções, Infraestrutura, Comandos e Respostas — P-08
- [?] S0.5 Limpar dados de teste do banco principal (com backup). **Precisa de confirmação do responsável** — P-02
- [ ] S0.6 Configuração de produção: `.env` com `SECRET_KEY`/`DEFAULT_ADMIN_PASSWORD`, sem `--reload`, frontend com build estático — P-06

### S1 — Navegação clara
- [x] S1.1 Menu reorganizado por intenção (Início / Dia a dia / Conhecimento / Inventário / Gestão) com nomes curtos — P-10
- [x] S1.2 Busca global em paleta flutuante (Ctrl+K) que abre o item; Relatórios em página própria — P-11, P-12
- [x] S1.3 Deep link `#modulo?id=N` padronizado para os resultados da busca — P-12, P-16
- [x] S1.4 Remover resíduos (badges "Fase X", tela "Roadmap Futuro", banners OTRS repetidos, mock fora de `services/`) — P-14, P-15
- [x] S1.5 Unificar "Usuários" e "Perfis e Permissões" em uma tela com abas — P-13

### S2 — Atendimento conectado ao equipamento (fluxo central)
- [x] S2.1 Formulário completo: problema, sintomas, URL OTRS, notas internas — P-20
- [x] S2.2 Equipamento e loja escolhidos de listas (vínculo real `equipment_id`), texto livre como alternativa — P-21
- [x] S2.3 Ficha do equipamento mostra atendimentos e manutenções do equipamento — P-22
- [x] S2.4 Ações a partir do equipamento: "Registrar atendimento" (`#attendance?new=true&equipment_id=N`) e "Agendar manutenção" (`#maintenances?new=true&equipment_id=N`) já preenchidos — P-23

### S3 — Início (Dashboard) útil
- [x] S3.1 Endpoint `GET /dashboard/summary` com contagens reais e alertas de início de turno — P-40, P-41, P-42
- [x] S3.2 Lembretes pessoais x alertas automáticos (`reminders.source`); listagem só do próprio usuário; sino mostra avisos com selo "Automático", Início e Tarefas mostram "Meus lembretes" — P-30, P-31, P-33

### S4 — Código compartilhado e manutenção
- [~] S4.1 Componentes comuns — P-60, P-61
  - feito: `ConfirmDialog` + `useConfirm` (todas as 16 chamadas de `window.confirm` substituídas)
  - falta: `PageHeader`, `FilterBar`, `StatusBadge`
- [ ] S4.2 Quebrar `CommandsPage.tsx` e `AttendancePage.tsx` em componentes menores — P-51
- [ ] S4.3 Paginação em atendimentos, equipamentos e artigos; lista de equipamentos sem histórico embutido — P-62
- [x] S4.4 Tabela de rotas única no lugar da cadeia de ternários em `AuthenticatedView.tsx` — P-63

---

## Backlog (não iniciar sem decisão registrada em `DECISIONS.md`)

* **Cofre de Senhas** — requisitos de segurança já definidos em `DECISIONS.md` (2026-09-24).
* **Cotações / Compras operacionais** — `PRODUCT_SPEC.md` §5.3.
* **Editor rich text** para a Base de Conhecimento (imagens inline) — `DOMAIN_RULES.md` §6.
* **Arquivos N:N** (um documento ligado a várias entidades).
* **Integração com OTRS** — somente após confirmar API disponível (`AGENTS.md`).
