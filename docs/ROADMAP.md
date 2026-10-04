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
- [x] S0.5 Banco principal recriado do zero (banco era experimental; backup em `~/centralsuporte_backups/`) — P-02
- [x] S0.6 Configuração de produção — P-06
  - `.env` fora do Git, `SECRET_KEY` própria; troca da própria senha em Meu Perfil (`POST /users/me/password`)
  - `docker-compose.prod.yml` + `frontend/Dockerfile.prod` (nginx) prontos e validados; ativar quando sair do desenvolvimento
  - pendente do responsável: trocar a senha padrão do `admin`

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
- [x] S4.1 Componentes comuns — P-60, P-61
  - feito: `ConfirmDialog` + `useConfirm` (todas as 16 chamadas de `window.confirm` substituídas)
  - feito: `PageHeader` em todas as telas principais (mesmo tamanho, ícone e posição das ações; descrições curtas); banner OTRS repetido removido de Atendimentos
  - feito: `StatusBadge`/`PriorityBadge` + `lib/status.ts` substituindo 11 funções duplicadas (o card de atendimentos do Início mostrava status inexistentes)
  - feito: `FilterBar`/`FilterSelect` (busca com debounce, opções de status de `lib/status.ts`) em Atendimentos, Tarefas e Manutenções
  - opcional: Conhecimento, Comandos e Equipamentos têm filtros próprios (pílulas de categoria/sistema) e ficaram como estão
- [x] S4.2 Telas gigantes divididas: `AttendancePage` 1.058 → 475 linhas (`components/attendance/`), `CommandsPage` 1.356 → 726 (`components/commands/`) — P-51
- [x] S4.3 Listas leves e paginadas — P-62
  - feito: lista de equipamentos sem histórico embutido (`EquipmentListResponse`): 4 MB → 375 KB, 0,52 s → 0,04 s
  - feito: lista de manutenções usa `EquipmentListResponse` + eager loading: 17 MB → 2,3 MB, 1,39 s → 0,26 s
  - feito: atendimentos paginados (`PaginatedResponse[AttendanceListResponse]`, sem notas na lista; detalhe sempre via `GET /attendances/{id}`): 1,2 MB → ~78 KB por página (30 itens)
  - feito: artigos paginados e leves (`KnowledgeArticleListResponse`: sem conteúdo/versões, com `has_commands`/`versions_count`); edição carrega o artigo completo
  - feito: manutenções paginadas; Agenda usa `scheduled_from` (agendadas a partir de 7 dias atrás, em ordem cronológica); equipamentos/modelos/eventos carregados uma vez só
  - feito: equipamentos paginados na tela (50 por página); API continua completa e leve para os seletores (ver `DECISIONS.md`)
- [x] S4.4 Tabela de rotas única no lugar da cadeia de ternários em `AuthenticatedView.tsx` — P-63

---

## Ciclo U — Uso real e acabamento (2026-10-03, concluído)

Revisão tela a tela com dados realistas (ambiente de demonstração + screenshots) e colocação em produção.

- [x] U1 Bugs de contrato frontend × backend escondidos por mocks: Relatórios derrubava o app; prazo de projeto nunca era salvo
- [x] U2 Contador de Respostas Padrão, datas em formato único (`lib/format.ts`), rótulos humanos (tipos de manutenção, prioridades, auditoria)
- [x] U3 Cabeçalho padrão em Arquivos e Usuários e Permissões; filtros duplicados removidos da Base de Conhecimento; `FilterBar` em Projetos
- [x] U4 Tarefas: lista "Abertas" por prazo, concluir com um clique, atrasadas em destaque, responsáveis visíveis
- [x] U5 Início: sem busca/perfil duplicados, tarefas da equipe quando não há atribuídas, horários relativos, "Primeiros passos" para novos usuários
- [x] U6 Comandos: cartões compactos com passos copiáveis
- [x] U7 PWA (manifesto, ícones, service worker) e notificações do sistema a partir do sino de avisos
- [x] U8 Login na identidade visual do app; textos de ajuda revisados
- [x] U9 Produção: nginx com HTTPS (CA interna) e API na mesma origem (`/api`); guia da equipe (`GUIA_DA_EQUIPE.md`)

---

## Ciclo B — Backlog liberado pelo responsável (2026-10-04)

- [x] B1 Endurecimento para exposição na internet (limite de tentativas de login, docs da API fechadas, cabeçalhos de segurança, IP real via Cloudflare)
- [~] B2 Publicação em `suporte.voleidraft.top` pelo túnel Cloudflare existente (`deploy/cloudflare-tunnel.sh`, executado pelo responsável com sudo)
- [x] B3 Web Push: avisos com a Central fechada
- [x] B4 Contrato frontend × backend verificado no build (`api.gen.ts` + `contract.check.ts`)
- [x] B5 Cofre de Senhas (AES-256-GCM, revelação auditada, registros pessoais)
- [x] B6 Compras operacionais (orçamentos → aprovação → recebimento com entrada no estoque)
- [x] B7 Atendimento a partir do nº OTRS (aviso de chamado repetido, histórico do equipamento) e modelos de atendimento

---

## Backlog (não iniciar sem decisão registrada em `DECISIONS.md`)

* **Editor rich text** para a Base de Conhecimento (imagens inline) — `DOMAIN_RULES.md` §6.
* **Arquivos N:N** (um documento ligado a várias entidades).
* **Integração com OTRS** — somente após confirmar API disponível (`AGENTS.md`).

