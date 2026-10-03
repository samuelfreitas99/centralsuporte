# PROJECT_STATE

> Documento curto: substitua o conteúdo a cada entrega. O histórico até 2026-10-02 está em
> `history/PROJECT_STATE_LOG_ate_2026-10-02.md`.

**Atualizado em:** 2026-10-03
**Ciclo atual:** S — Simplificação (ver `ROADMAP.md`)
**Diagnóstico de referência:** `ANALISE_2026-10.md`

## Situação

* Todos os módulos do MVP e pós-MVP (fases 0–12) estão funcionando.
* Testes: backend 156 ✓ (banco isolado `centralsuporte_test`), frontend 127 ✓, `tsc -b` limpo.
* Paginação: tarefas e arquivos. Demais listas ainda carregam tudo (S4.3).

## Feito neste ciclo

* S0.1–S0.4: testes isolados do banco real, paginação de tarefas concluída, limpeza de scripts soltos, documentação reorganizada.

## Próximo passo

Seguir o primeiro item `[ ]` do `ROADMAP.md`, na ordem.

## Pendências que dependem do responsável

* **S0.5 — Limpeza do banco principal.** O banco `centralsuporte_db` tem centenas de registros criados
  por testes antigos (usuários `*_test*`, ~8.000 lembretes, artigos "Configuração Scanner Honeywell xxxxxx" etc.)
  misturados a dados reais. Não limpar sem backup e confirmação.
* **S0.6 — Produção:** definir `SECRET_KEY` e `DEFAULT_ADMIN_PASSWORD` no `.env` e trocar a senha do `admin`.

## Avisos para quem continuar

* Não rode testes sem o `backend/conftest.py` (ver `AGENTS.md`).
* `maintenance_records.equipment_id` e `commands.command` são colunas legadas mantidas por compatibilidade.
