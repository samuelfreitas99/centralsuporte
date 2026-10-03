# PROJECT_STATE

> Documento curto: substitua o conteúdo a cada entrega. O histórico até 2026-10-02 está em
> `history/PROJECT_STATE_LOG_ate_2026-10-02.md`; o restante está no Git.

**Atualizado em:** 2026-10-03
**Ciclo S — Simplificação:** concluído (todos os itens de `ROADMAP.md` marcados).
**Diagnóstico de referência:** `ANALISE_2026-10.md`

## Situação

* Testes: backend 183 ✓ (banco isolado `centralsuporte_test`), frontend 157 ✓, `tsc -b` limpo, lint sem avisos novos (57 antigos).
* Banco principal recriado do zero em 2026-10-03 (era experimental); só existe o usuário `admin`.
* Migração mais recente: `a7c1e2d3f4b5` (`reminders.source`). Migrações sobem do zero; `alembic check` sem divergências.
* Rodando em modo desenvolvimento (`--reload`, Vite dev). Modo produção pronto em `docker-compose.prod.yml` (ver `DEVELOPMENT.md`).

## O que o Ciclo S entregou (resumo)

* Fundação: testes isolados, permissões RBAC exigidas em todos os módulos, `.env` fora do Git com `SECRET_KEY` própria.
* Navegação: menu por intenção, busca Ctrl+K com deep link (`#modulo?id=N`), Usuários e Permissões unificados.
* Fluxo central: atendimento completo e ligado ao equipamento; ficha do equipamento com "Ocorrências".
* Início com contagens reais e alertas de turno; lembretes pessoais separados de alertas automáticos.
* Componentes comuns: `PageHeader`, `FilterBar`/`FilterSelect`, `StatusBadge`/`PriorityBadge`, `ConfirmDialog`/`useConfirm`, `EquipmentPicker`.
* Listas leves e paginadas (tarefas, atendimentos, artigos, manutenções; equipamentos paginados na tela).
* Troca da própria senha em Meu Perfil.

## Próximo passo

O backlog do `ROADMAP.md` (Cofre de Senhas, Cotações, editor rich text, Arquivos N:N, integração OTRS)
**depende de decisão do responsável** antes de qualquer implementação. Enquanto isso, priorizar ajustes
vindos do uso real pela equipe.

## Pendências que dependem do responsável

* Trocar a senha padrão do `admin` (Meu Perfil → Alterar senha) e recriar os usuários da equipe.
* Decidir quando ativar o modo produção.
* Priorizar o backlog.

## Avisos para quem continuar

* Não rode testes sem o `backend/conftest.py` (ver `AGENTS.md`).
* `maintenance_records.equipment_id` e `commands.command` são colunas legadas mantidas por compatibilidade.
* Backups antigos do banco ficam em `~/centralsuporte_backups/` (fora do Git).
