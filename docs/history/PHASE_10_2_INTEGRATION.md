# Fase 10.2 — Integração de Projetos Operacionais

## Visão Geral
Esta fase focou na integração do domínio `Project` com os módulos operacionais existentes da Central de Suporte, permitindo que os registros sejam opcionalmente vinculados a um projeto.

## Módulos Integrados
As seguintes entidades e endpoints receberam suporte para `project_id`:
1. **Tasks** (Tarefas)
   - Adicionado `project_id` na criação, listagem e atualização.
   - Preserva `ON DELETE SET NULL`.
2. **Checklists**
   - Adicionado `project_id` na criação, listagem e atualização.
   - Preserva `ON DELETE SET NULL`.
3. **MaintenanceRecord** (Manutenções)
   - Adicionado `project_id` na criação, listagem e atualização.
   - Integrado de forma que o fluxo de equipamentos seja mantido.
4. **Attendance** (Atendimentos)
   - Adicionado `project_id` na criação, listagem e atualização.
   - Correção na passagem do ID para o ORM via payload.
5. **CalendarEvent** (Eventos do Calendário)
   - Adicionado `project_id` na criação, listagem e atualização.
6. **StockMovement** (Movimentações de Estoque)
   - Endpoint `GET /infrastructure/stock/movements` criado para listagem de todas as movimentações.
   - Endpoint `PUT /infrastructure/stock/movements/{id}` criado para atualização, permitindo vincular/desvincular o projeto.
   - A criação da movimentação via `/infrastructure/stock/items/{id}/movements` passou a aceitar o `project_id`.
7. **Equipment** (Equipamentos)
   - Já integrado nativamente pela fundação backend (Fase 10.1) usando a tabela associativa `project_equipment`.

## Regras e Decisões Aplicadas
- **Preservação de Dados (Data Integrity):** Todos os relacionamentos FK com projetos utilizam `ON DELETE SET NULL`. Isso significa que, ao apagar um Projeto, as tarefas, checklists ou movimentações não são removidas — elas apenas deixam de ter a associação.
- **Unsetting de Relacionamento:** Todos os endpoints `PUT` dos módulos integrados foram atualizados para permitir desvincular um registro de um projeto (ex: `"project_id": null`). O Pydantic realiza esse `unset` corretamente ao usar `exclude_unset=True` nos dumps.
- **Filtros por Projeto:** Adicionados filtros opcionais `?project_id=X` aos endpoints de `GET` de todos os módulos.
- **Isolamento de Domínio:** O projeto atua estritamente como **Agregador/Contextualizador** sem assumir posse dos dados (não há `cascade="all, delete-orphan"` a partir do Projeto).

## Testes Automatizados
O arquivo `backend/test_integration_phase10_2.py` cobre end-to-end as integrações.

O teste inclui:
- Criação de múltiplos projetos e registros avulsos.
- Criação de Tasks, Checklists, Maintenances, Attendances, CalendarEvents e StockMovements vinculados a um projeto.
- Alteração (Change) do relacionamento do projeto.
- Desvinculação (Unset) do relacionamento.
- Listagem dos recursos por projeto.
- Validação de regras de exclusão: o projeto é excluído, e todos os recursos vinculados anteriormente são mantidos perfeitamente, tendo seus `project_id` definidos como `null` via banco de dados (SQLite foreign keys com pragma ativo).

**Status do Teste:** `ALL TESTS PASSED SUCCESSFULLY!` (0 regressions).

## Conclusão e Próximos Passos
A Fase 10.2 está concluída. O backend está plenamente integrado e capaz de receber as funcionalidades front-end na Fase 10.3 (Workspace de Projetos e Dashboards).
