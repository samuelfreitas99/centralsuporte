# PROJECT_STATE

> Documento curto: substitua o conteúdo a cada entrega. O histórico até 2026-10-02 está em
> `history/PROJECT_STATE_LOG_ate_2026-10-02.md`.

**Atualizado em:** 2026-10-03
**Ciclo atual:** S — Simplificação (ver `ROADMAP.md`)
**Diagnóstico de referência:** `ANALISE_2026-10.md`

## Situação

* Todos os módulos do MVP e pós-MVP (fases 0–12) estão funcionando.
* Testes: backend 172 ✓ (banco isolado `centralsuporte_test`), frontend 137 ✓, `tsc -b` limpo, lint sem avisos novos (57 antigos).
* Paginação: tarefas e arquivos. Demais listas ainda carregam tudo (S4.3).

## Feito neste ciclo

* S0.1–S0.4, S0.7: testes isolados, paginação de tarefas, limpeza, documentação, permissões RBAC exigidas nos módulos operacionais.
* S1.1–S1.4, S4.4: menu por intenção, busca Ctrl+K em paleta com deep link, Relatórios em página própria, tabela de rotas, resíduos removidos.
* S2.1–S2.4: atendimento com formulário completo e vínculo real ao equipamento; ficha do equipamento com aba "Ocorrências" e ações de registrar atendimento / agendar manutenção.

## Próximo passo

Seguir o primeiro item `[ ]` do `ROADMAP.md`: S1.5 (unificar Usuários + Perfis), depois S3.1 (Início com `/dashboard/summary`).

## Pendências que dependem do responsável

* **S0.5 — Limpeza do banco principal.** O banco `centralsuporte_db` tem centenas de registros criados
  por testes antigos (usuários `*_test*`, ~8.000 lembretes, artigos "Configuração Scanner Honeywell xxxxxx" etc.)
  misturados a dados reais. Não limpar sem backup e confirmação.
* **S0.6 — Produção:** definir `SECRET_KEY` e `DEFAULT_ADMIN_PASSWORD` no `.env` e trocar a senha do `admin`.

## Avisos para quem continuar

* Não rode testes sem o `backend/conftest.py` (ver `AGENTS.md`).
* `maintenance_records.equipment_id` e `commands.command` são colunas legadas mantidas por compatibilidade.
