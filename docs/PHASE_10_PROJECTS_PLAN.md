# PHASE 10 - PROJECTS PLAN (PROJETOS OPERACIONAIS)

## 1. Visão Geral e Objetivo
O módulo de Projetos Operacionais atuará como um agregador e orquestrador de atividades. Ele não substitui as entidades já consolidadas (Tasks, Maintenances, Attendances, etc.), mas as agrupa sob um mesmo contexto (ex: "Abertura Loja 125", "Atualização de Switches Core"). O foco é manter a arquitetura simples e evitar a complexidade desnecessária de um ERP.

## 2. Modelo Conceitual e Novas Entidades

### Entidade Principal: `Project`
```python
class Project(Base):
    __tablename__ = "projects"
    
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(String(50), default="planejado", nullable=False)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    expected_end_date = Column(DateTime(timezone=True), nullable=True)
    
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    store_id = Column(Integer, ForeignKey("stores.id", ondelete="SET NULL"), nullable=True)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
```

### Entidade Secundária: `ProjectNote` (Histórico Qualitativo)
Para registrar o histórico e diário de bordo do projeto, sem sujar o `AuditLog` do sistema.
```python
class ProjectNote(Base):
    __tablename__ = "project_notes"
    
    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey('projects.id', ondelete="CASCADE"), nullable=False)
    author_id = Column(Integer, ForeignKey('users.id', ondelete="RESTRICT"), nullable=False)
    note = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow, nullable=False)
```

### Tabela Associativa: `project_equipment`
Para vincular equipamentos ao projeto sem torná-lo proprietário exclusivo.
```python
project_equipment = Table(
    'project_equipment',
    Base.metadata,
    Column('project_id', Integer, ForeignKey('projects.id', ondelete="CASCADE"), primary_key=True),
    Column('equipment_id', Integer, ForeignKey('equipment.id', ondelete="CASCADE"), primary_key=True),
    Column('added_at', DateTime(timezone=True), default=datetime.utcnow, nullable=False)
)
```

## 3. Relacionamentos e Impacto nas Tabelas Existentes

- **Project → Task**: FK direta (`project_id` em `tasks`). Como uma tarefa frequentemente pertence a um projeto, mas pode ser avulsa, uma FK nullable (SET NULL) resolve perfeitamente sem criar tabelas associativas. Adicionar também o campo `project_stage` (String) em `tasks` para agrupamento (ex: Infraestrutura, PDVs).
- **Project → Checklist**: FK direta (`project_id` em `checklists`). Permite checklists soltos que pertencem diretamente ao projeto e não apenas a uma task.
- **Project → Equipment**: Tabela associativa (`project_equipment`), pois equipamentos têm ciclo de vida infinito e passam por múltiplos projetos ao longo dos anos.
- **Project → Maintenance**: FK direta (`project_id` nullable em `maintenance_records`).
- **Project → Attendance**: FK direta (`project_id` nullable em `attendances`). Relação puramente passiva.
- **Project → Attachment**: Polimórfica. Adicionar 'project' como um `entity_type` válido em `Attachment`. Nenhuma alteração de DB necessária.
- **Project → Calendar**: FK direta (`project_id` nullable em `calendar_events`).
- **Project → Stock/Materials**: FK direta (`project_id` nullable em `stock_movements`). Permite ver o custo/consumo de materiais em um projeto específico (ex: saídas de cabos).

## 4. Estratégia de Etapas / Fases Internas
**Decisão:** Não criar entidade `ProjectPhase`.
**Abordagem:** Utilizar a própria tabela de `Task` acrescentando o campo `project_stage` (ex: "1. Infra", "2. PDV").
- O frontend irá agrupar as tarefas por este `project_stage`.
- Isso evita a complexidade de hierarquias infinitas de banco de dados e resolve a dor de organizar listas de tarefas para aberturas de lojas.

## 5. Regras de Domínio e Status

**Status propostos:**
1. `planejado`: Projeto criado, recursos sendo alocados.
2. `em_andamento`: Pelo menos uma tarefa em andamento.
3. `pausado`: Suspensa a execução, sem consumo de recursos.
4. `concluido`: Todas as etapas/validações realizadas.
5. `cancelado`: Abortado definitivamente.

**Cálculo de Progresso:**
- Fórmula Simples: `(Tarefas Concluídas / Total de Tarefas vinculadas ao Projeto) * 100`.
- Se não houver tarefas, o progresso é 0% (ou 100% se o status for `concluido`).
- Evitar pesos dinâmicos e cálculos baseados em checklist interno de task, para manter a clareza e performance da API.

## 6. Estratégia de Histórico
- **AuditLog**: Modificações de status, datas, dono do projeto, etc. (Automático, para rastreabilidade).
- **ProjectNote**: Diário de obra/projeto. Usado pelos técnicos para registrar andamento qualitativo, decisões, problemas e logs manuais diários.
- Essa separação mantém as responsabilidades claras e reaproveita o que já funciona bem nos Attendances.

## 7. Estratégia de Permissões
- Reutilizar a arquitetura atual de RBAC.
- Criar permissões: `project:create`, `project:read`, `project:update`, `project:delete`.
- Atribuir por padrão `project:read` e `project:update` aos técnicos e todas às roles de Admin/Gestor.

## 8. API Proposta
- `GET /projects`: Lista todos (com paginação e filtros de status/store).
- `POST /projects`: Cria novo projeto.
- `GET /projects/{id}`: Detalhes do projeto (e agregações básicas).
- `PUT /projects/{id}`: Atualiza status/dono/datas.
- `GET /projects/{id}/timeline`: Retorna um merge do `AuditLog` + `ProjectNote` ordenado por data.
- `GET /projects/{id}/summary`: Retorna totais de tarefas, percentual de progresso, total de custos (via maintenances + stock).

## 9. Impacto no Frontend
**Nova Rota e Layout:**
- `/projects` (Lista estilo Kanban ou Tabela Dinâmica).
- `/projects/:id` (Dashboard do Projeto):
  - **Header**: Título, Status Badge, Progresso e Botões de Ação.
  - **Tabs (Progressive Disclosure)**:
    - *Visão Geral*: Descrição, Lembretes, Datas.
    - *Cronograma (Tarefas)*: Board agrupado pelo `project_stage`.
    - *Equipamentos*: Lista vinculada.
    - *Histórico*: Timeline unificando `ProjectNote` e `AuditLog`.
    - *Relacionados*: Attendances, Maintenances, Stock.
    - *Anexos*: Instância do `AttachmentManager`.

## 10. Ordem Recomendada de Implementação
1. **Migrations**:
   - Adicionar FKs `project_id` (Task, Checklist, Maintenance, Attendance, CalendarEvent, StockMovement).
   - Adicionar campo `project_stage` em Task.
   - Criar tabelas `projects`, `project_equipment`, `project_notes`.
2. **Backend Models & Schemas**: Refletir alterações do banco no Pydantic/SQLAlchemy.
3. **Backend API Core**: CRUD de Projects e ProjectNotes.
4. **Backend API Agregada**: Endpoints de sumário e timeline.
5. **Frontend Core**: Lista de projetos e modal de criação.
6. **Frontend Details**: Dashboard do projeto com abas.
7. **Integração nas Entidades Existentes**: Incluir seletor de "Vincular a Projeto" nos modais de criação de Task, Manutenção, Atendimento e Movimentação de Estoque.

## 11. Riscos
- **Cascateamento e Performance**: Carregar a aba de "Projeto" pode envolver fazer joins com 8 tabelas. Risco mitigado garantindo que endpoints como `/projects/{id}` tragam apenas os IDs e sumários básicos, delegando as buscas detalhadas para sub-rotas (ex: `/tasks?project_id={id}`).
- **Concorrência OTRS**: A vinculação do projeto a um Attendance deve permanecer passiva, o OTRS dita o ciclo de vida do Attendance, enquanto o Projeto só serve como tag agrupadora.

---
**Status da Análise:** READY FOR IMPLEMENTATION
