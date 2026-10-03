# PROJECT_STATE

> Documento curto: substitua o conteúdo a cada entrega. O histórico até 2026-10-02 está em
> `history/PROJECT_STATE_LOG_ate_2026-10-02.md`.

**Atualizado em:** 2026-10-03
**Ciclo atual:** S — Simplificação (ver `ROADMAP.md`)
**Diagnóstico de referência:** `ANALISE_2026-10.md`

## Situação

* Todos os módulos do MVP e pós-MVP (fases 0–12) estão funcionando.
* Testes: backend 178 ✓ (banco isolado `centralsuporte_test`), frontend 144 ✓, `tsc -b` limpo, lint sem avisos novos (57 antigos).
* Paginação: tarefas, atendimentos e arquivos. Equipamentos, manutenções e artigos ainda carregam tudo, mas sem histórico embutido (S4.3).
* Migração mais recente: `a7c1e2d3f4b5` (`reminders.source`), já aplicada no banco principal.

## Feito neste ciclo

* S0.1–S0.4, S0.7: testes isolados, paginação de tarefas, limpeza, documentação, permissões RBAC exigidas nos módulos operacionais.
* S1.1–S1.4, S4.4: menu por intenção, busca Ctrl+K em paleta com deep link, Relatórios em página própria, tabela de rotas, resíduos removidos.
* S2.1–S2.4: atendimento com formulário completo e vínculo real ao equipamento; ficha do equipamento com aba "Ocorrências" e ações de registrar atendimento / agendar manutenção.
* S1.5: "Usuários e Permissões" em uma tela com abas.
* S3.1–S3.2: Início com `/dashboard/summary` (contagens reais + alertas de turno); lembretes pessoais x alertas automáticos (`reminders.source`), fim da enxurrada de alertas duplicados.
* S4.1 (parcial): `ConfirmDialog`/`useConfirm` no lugar de `window.confirm`.
* S4.3 (parcial): listas de equipamentos (4 MB → 375 KB) e manutenções (17 MB → 2,3 MB) sem histórico embutido; atendimentos paginados.

## Próximo passo

Itens pendentes do `ROADMAP.md`: S4.1 (resto: `PageHeader`, `FilterBar`, `StatusBadge`), S4.2 (quebrar `CommandsPage`/`AttendancePage`), S4.3 (paginar equipamentos, manutenções e artigos).

## Pendências que dependem do responsável

* **S0.5 — Limpeza do banco principal.** O banco `centralsuporte_db` tem centenas de registros criados
  por testes antigos (usuários `*_test*`, ~8.000 lembretes, artigos "Configuração Scanner Honeywell xxxxxx" etc.)
  misturados a dados reais. Não limpar sem backup e confirmação.
* Backup feito antes da migração de lembretes: `~/centralsuporte_backups/centralsuporte_db_2026-10-03_pre_reminder_source.dump` (`pg_restore`).
* **S0.6 — Produção:** definir `SECRET_KEY` e `DEFAULT_ADMIN_PASSWORD` no `.env` e trocar a senha do `admin`.

## Avisos para quem continuar

* Não rode testes sem o `backend/conftest.py` (ver `AGENTS.md`).
* `maintenance_records.equipment_id` e `commands.command` são colunas legadas mantidas por compatibilidade.
