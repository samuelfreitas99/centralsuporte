# FASE 12.6.1 — PLANO TÉCNICO DE CORREÇÃO DE PERFORMANCE

## 1. Objetivo
Transformar a arquitetura da Central de Suporte de uma abordagem "Transferência Integral" (onde o Banco envia todos os registros e o React renderiza tudo simultaneamente) para uma arquitetura de **Carregamento Controlado e Escalável**. 
O objetivo primário é mitigar o travamento da Thread Principal (evidenciado pelos _Forced reflows_ de até 4.9s), eliminar as sobrecargas de consultas repetitivas (N+1) e otimizar drasticamente os payloads de rede sem sacrificar a integridade de permissões.

## 2. Estratégia de Paginação ("LIMIT 100" não é solução final)
Foi avaliada a adoção de diversas estratégias (Offset/Limit, Cursor-based, Infinite Scroll, etc.).
A recomendação técnica para a Central de Suporte é a **A) Offset + Limit (Paginação Tradicional)**.
* **Justificativa**: A Central é um sistema B2B focado em auditoria, controle operacional e infraestrutura. Usuários técnicos frequentemente necessitam de ordenações dinâmicas (ex: ordenar por última atualização) e navegação posicional (ex: ir para a página 5 buscar um ticket antigo). Cursor-based é ideal para *feeds* contínuos como redes sociais, mas impede "pular" para páginas específicas com facilidade. Infinite Scroll também prejudica a usabilidade de rodapés e a percepção de "quantidade total" do acervo para um gestor.
* **Resumo**: Paginação tradicional com `page` (calculado sobre offset) e `limit`, associado ao retorno estrito do `total_count`.

## 3. Arquitetura Unificada
O contrato padrão implementado via Generic Schema no Pydantic será:
`GET /resource?page=1&limit=50&sort=desc&search=foo`
```json
{
  "items": [...],
  "page": 1,
  "limit": 50,
  "total": 1234,
  "total_pages": 25,
  "has_next": true,
  "has_prev": false
}
```
* **Defaults**: `page=1`, `limit=50`.
* **Máximo permitido**: `limit=100` (rejeita com HTTP 400 ou ignora silenciando para 100 se superior).
* **Filtros e Busca**: Enviados em *Query Parameters* padronizados.
* **Estado Vazio**: Retornará HTTP 200 com `"items": []` e `"total": 0`.
* **Compatibilidade**: Endpoints existentes serão substituídos progressivamente para este envoltório.

## 4. Definição de Limites por Entidade
Não usaremos um número cego. Os limites padrão propostos:
* **Tasks, Attendances, Maintenances**: Padrão `50`, Máximo `100`. (Muitas colunas operacionais).
* **Knowledge**: Padrão `20`, Máximo `50`. (Cards maiores, leitura mais densa).
* **Commands, Equipment, Stores**: Padrão `50`, Máximo `100`.
* **Audit Logs**: Padrão `100`, Máximo `200`. (Leitura em tabela super compacta, como logs de servidor).
* **Dashboard (Carregamento Sob Demanda)**: Padrão `5` (Hardcoded no Request local do componente, sem paginação de UI).

## 5. Lista vs. Detalhe (DTO Separation)
Atualmente a lista devolve o modelo completo (`TaskResponse`, `KnowledgeArticleResponse`), forçando tráfego inútil.
Vamos criar `*ListResponse` (ou `*SimpleResponse`) isolado do `*DetailResponse`.
* **Tasks**: 
  * *Lista*: `id`, `title`, `status`, `priority`, `created_at`.
  * *Detalhe (Move)*: `checklists`, `description` (completo), arrays de relations profundas.
* **Knowledge**:
  * *Lista*: `id`, `title`, `category`, `status`, `updated_at`, `tags` (apenas nomes/cores).
  * *Detalhe (Move)*: `content` (markdown completo de KBs enormes), `versions`, `history`.
* **Attendance/Maintenance**:
  * *Lista*: `id`, `title`, `status`, `created_at`, `technician_name`.
  * *Detalhe (Move)*: `notes`, `solution`, `commands_used`, `parts_used` inteiras.

## 6. N+1 — Plano Real
A auditoria identificou N+1 crônico resultante das serializações Pydantic sobre Lazy Loads do SQLAlchemy.
A solução orquestrada para cada endpoint não será um blind `selectinload`, mas:
* **`GET /tasks`**: Utilizar `joinedload(Task.creator)` e `selectinload(Task.assigned_users)` se necessário na lista resumida. `checklists` será retirado do DTO de listagem, exterminando o N+1 principal.
* **`GET /attendances`**: Utilizar `joinedload(Attendance.technician)`. `notes` será extraído do modelo da listagem. N+1 eliminado.
* **`GET /knowledge`**: Utilizar `joinedload(KnowledgeArticle.category)` e `joinedload(KnowledgeArticle.author)`. `selectinload(KnowledgeArticle.tags)`. `versions` será removido da lista principal.
* **`GET /equipment`**: Utilizar `joinedload` simples para Store e Department (tabelas pequenas, baixo custo em JOIN). `history` será excluído da lista principal.
* **`GET /maintenances`**: `joinedload` para Equipamento atrelado.
* **Regra Geral**: Relacionamento 1:1 ou N:1 = `joinedload`. Relacionamento 1:N restrito necessário na lista = `selectinload`. Arrays grandes e blobs = removidos do endpoint de lista.

## 7. Paginação no Frontend
Para "Data Tables" e Grids do sistema:
* **Visual Behavior**: Paginação Tradicional por blocos numéricos (ex: Componente nativo de Pagination do Radix/UI `[<] [1] [2] [3] [>]`).
* **Estado e URL**: Parâmetros de página e filtros residirão em URL Query Params (`?page=2&status=pendente`). Permite Deep Linking (compartilhar o link exato da listagem) e preserva o estado natural de recarregamento e navegação de histórico ("Voltar").
* **Busca e Teclado**: O atalho `Ctrl+K` para abrir buscas será focado no Input principal, que sofrerá Debounce (300-500ms) antes de acionar a recarga Server-Side com reset automático para `page=1`.

## 8. Virtualização
A avaliação técnica é **DESNECESSÁRIA** se os Quick Wins e a Paginação forem respeitados.
A introdução de bibliotecas como `react-window` traria um custo altíssimo de complexidade (medir alturas variáveis de cards flexíveis, quebrar acessibilidade natural e navegação de teclado) que só se justifica quando renderizamos listas imensas de uma vez.
Como o Payload da página trará rigidamente no máximo 50 (ou 100) nós limpos de textos complexos, o DOM ficará purgado e as renderizações React não extrapolarão a Thread Principal. A complexidade do Drawer não impactará pois a raiz do documento estará enxuta.

## 9. Busca e Filtros
Todos os métodos encadeados de frontend `.filter(…).sort(…)` em grandes listas serão extintos e migrados.
O Frontend só passará o valor na Query URL. O Backend orquestrará as cláusulas SQLAlchemy `query.filter()`.
O estado de carregamento exibirá um `Skeleton` transparente ao usuário enquanto a busca processa.

## 10. Banco de Dados e Índices
Evitaremos blind `ILIKE` transformations imediatas para Full-Text Search. O plano:
* **Índices Essenciais B-Tree**: Adicionar índices nas colunas comumente filtradas e onde se aplica restrições (ex: `Tasks.status`, `Attendances.project_id`, `Knowledge.category_id`).
* **Tratamento de ILIKE**: Inicialmente mantido em colunas de títulos (ex: `Task.title`), dado que agora será associado com um `LIMIT 50`. O banco aborta a varredura ao encontrar a página de registros, não esgotando recursos.
* **Roadmap de Longo Prazo**: Se a tabela `knowledge_articles` ou `tasks` exceder a performance paginada, então sim avaliaremos a adoção restrita do GIN `tsvector` nativo do PostgreSQL.

## 11. Dashboard
As Views da Dashboard que se beneficiam dos `slice(0, 5)` para dados rápidos e consolidados não devem ser impactadas na UX.
O plano é criar funções específicas como `get_dashboard_tasks(limit=5)` ou manter chamadas aos `list_*` injetando `limit=5`. Assim a API processará as 5 mais importantes (`order_by desc`) e retornará exatamente 5 objetos no JSON. 

## 12. Files
O módulo consolidado na Fase 12.4.4 (`GET /attachments` usando offset/limit subqueries) é a prova de conceito de Sucesso de Performance.
A única alteração necessária será adotar a estrutura Pydantic padronizada de resposta envoltória em vez de um Array bruto (para comunicar as numerações de páginas aos clientes uniformemente).

## 13. Drawers sob Demanda
Ao invés de carregar o Draw passando um Objeto DTO completo que sobreviveu do `.map()` da tabela, a arquitetura pivotará para:
* A tabela gerencia a lista base, e ao clicar exibe o Drawer.
* O Drawer recebe via Props estritamente o `id` da entidade clicada (ex: `<TaskDetailDrawer taskId={id} />`).
* Quando o `open` for verdadeiro, o Drawer fará um request limpo e isolado `GET /tasks/{id}` para colher toda a riqueza de detalhes e relações profundas.
* *Vantagem Suprema*: O Load da listagem não trafega descrições ou arrays complexos e a abertura inicial não sobrecarrega a rede de outros registros jamais abertos pelo operador.

## 14. Performance Budget
| Métrica | Antes (Current Measured base) | Meta (Target) |
| :--- | :--- | :--- |
| **Initial List Payload** | 100% de Registros (+ de Megabytes eventuais) | Máximo `50` registros; \< 50KB trafegados. |
| **Drawer Open Time** | `6390ms` (Main Thread Locked) | `< 200ms` (Instantâneo UI render + Skeleton). |
| **Database Queries (per Endpoint)**| > `3N + 1` (N+1 queries infinitas na rede) | Estável: 1 Query count + 1 Query Select c/ JOINs. |

## 15. Migração Sem Quebrar o Sistema
O roll-out será faseado por entidade para reduzir risco e manter compatibilidade com consumidores remotos/Dashboards.
* **Fase 12.6.2**: *Pagination Foundation*. (Criação do Pydantic `PaginatedResponse`, Componentes de UI de base).
* **Fase 12.6.3**: *Tasks Performance Fix*. (Aplicação do Foundation, split de Detail vs List, Drawer Update).
* **Fase 12.6.4**: *Attendance & Maintenance Performance Fix*.
* **Fase 12.6.5**: *Knowledge Base Performance Fix*.
* **Fase 12.6.6**: *Equipment & Infrastructure Fixes*.
* **Fase 12.6.7**: *Validation & Audit*.

## 16. Compatibilidade
Não iremos quebrar relatórios administrativos ou integrações que dependam de listagens sem limites até o upgrade dos seus clientes. A migração das UIs internas será atrelada à mudança de contrato API de forma coordenada.

## 17. Testes
* **Backend**: Afirmar que páginas com Request `page=9999` reajam corretamente (lista vazia), `limit=2000` reajam com 400 Bad Request. Checar em `test_tasks.py` se count_queries de SQL emitido equivale a 2 e não dezenas via `pytest-sqlalchemy`.
* **Frontend**: Simular navegação e assegurar que Query da API é emitida adequadamente (ex: garantir que debounce impediu dezenas de `fetch()` em uma digitação de busca).
* **Drawer**: Teste específico confirmando a chamada ao endpoint de Detalhe.

## 18. Observabilidade
A melhoria de performance poderá ser validada inspecionando novamente o Google Chrome Performance Profiler buscando por:
* Redução crítica ou eliminação da tag de *Warning* `[Violation] Forced reflow`.
* Queda sensível do tempo agregado de JS Compilation/Execution no Main Thread de >4.0s para milissegundos.
* `Total Payload Size` nos inspecionadores de rede de tabelas gigantescos.

## 19. Segurança
Paginação nunca é sinônimo de Bypass de Tenancy ou Contextos. 
Como verificado durante a Fase 12.4 de arquivos contextuais, e como regra fundamental aqui, os predicados de Filtro baseados em Autenticação (`creator_id == current_user` e `visibility_rules`) serão combinados nativamente **antes** da execução de `.count()` total e do `.offset().limit()`. Qualquer usuário que forçar limites paginados só vislumbrará fatias de dados já sancionados.

## 20. Conclusão e Documentação
Este planejamento detalhado servirá de roteiro prático e inviolável durante a refatoração, minimizando achismos experimentais. 
*Aguardando luz verde da gerência para inicio da Fase 12.6.2.*
