# PROJECT_STATE

> Documento curto: substitua o conteúdo a cada entrega. O histórico até 2026-10-02 está em
> `history/PROJECT_STATE_LOG_ate_2026-10-02.md`.

**Atualizado em:** 2026-10-03
**Ciclo atual:** S — Simplificação (ver `ROADMAP.md`)
**Diagnóstico de referência:** `ANALISE_2026-10.md`

## Situação

* Todos os módulos do MVP e pós-MVP (fases 0–12) estão funcionando.
* Testes: backend 179 ✓ (banco isolado `centralsuporte_test`), frontend 148 ✓, `tsc -b` limpo, lint sem avisos novos (57 antigos).
* Paginação: tarefas, atendimentos, artigos e arquivos. Equipamentos e manutenções ainda carregam tudo, mas sem histórico embutido (S4.3).
* Migração mais recente: `a7c1e2d3f4b5` (`reminders.source`).
* **Banco principal zerado em 2026-10-03** (era experimental, autorizado pelo responsável): recriado pelas
  migrações (`alembic upgrade head`) + seed; só existe o usuário `admin` (senha padrão `admin123`).
  Anexos físicos de teste removidos. Backups anteriores em `~/centralsuporte_backups/` (fora do repositório).
* As migrações sobem do zero e `alembic check` não acusa divergência entre modelos e migrações.

## Feito neste ciclo

* S0.1–S0.4, S0.7: testes isolados, paginação de tarefas, limpeza, documentação, permissões RBAC exigidas nos módulos operacionais.
* S1.1–S1.4, S4.4: menu por intenção, busca Ctrl+K em paleta com deep link, Relatórios em página própria, tabela de rotas, resíduos removidos.
* S2.1–S2.4: atendimento com formulário completo e vínculo real ao equipamento; ficha do equipamento com aba "Ocorrências" e ações de registrar atendimento / agendar manutenção.
* S1.5: "Usuários e Permissões" em uma tela com abas.
* S3.1–S3.2: Início com `/dashboard/summary` (contagens reais + alertas de turno); lembretes pessoais x alertas automáticos (`reminders.source`), fim da enxurrada de alertas duplicados.
* S4.1 (parcial): `ConfirmDialog`/`useConfirm`, `PageHeader` em todas as telas, `StatusBadge`/`PriorityBadge` (`lib/status.ts`).
* S4.2: `AttendancePage` e `CommandsPage` divididas em componentes (`components/attendance/`, `components/commands/`).
* S0.5: banco principal recriado do zero. S0.6 (parcial): `.env` fora do Git, `SECRET_KEY` própria.
* S4.3 (parcial): listas de equipamentos (4 MB → 375 KB) e manutenções (17 MB → 2,3 MB) sem histórico embutido; atendimentos e artigos paginados.

## Próximo passo

Itens pendentes do `ROADMAP.md`: S4.1 (`FilterBar` comum), S4.3 (paginar equipamentos e manutenções), S0.6 (senha do `admin`; modo produção).

## Pendências que dependem do responsável

* **S0.6 — Produção:** `SECRET_KEY` já definida no `.env` (fora do Git). Falta trocar a senha do `admin` (padrão `admin123`) e, ao sair do desenvolvimento, rodar sem `--reload` e com build estático do frontend.

## Avisos para quem continuar

* Não rode testes sem o `backend/conftest.py` (ver `AGENTS.md`).
* `maintenance_records.equipment_id` e `commands.command` são colunas legadas mantidas por compatibilidade.
