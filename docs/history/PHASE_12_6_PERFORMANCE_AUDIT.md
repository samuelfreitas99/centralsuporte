# PERFORMANCE AUDIT (Fase 12.6)

## Executive Summary
Esta auditoria avalia a performance geral da Central de Suporte. O foco central são os gargalos identificados durante o uso intensivo (Drawer lock, reflow e delay de cliques). Os problemas não estão no banco de dados isoladamente ou na camada visual isoladamente, mas sim na ausência de limites arquiteturais na transferência e renderização de grandes volumes de dados.

## Symptoms
- `[Violation] 'click' handler took 6390ms`: Tempo exagerado para processar interação em elementos clicáveis (como abrir o Drawer de detalhes).
- `[Violation] Forced reflow while executing JavaScript took 4929ms`: Congelamento do layout ("reflow") provocado pelo redesenho ou medição de uma DOM muito grande e pesada.

## Current Architecture
- Backend: FastAPI, SQLAlchemy, PostgreSQL.
- Frontend: React, TailwindCSS, Radix UI/Vaul.
- Integração: Requisições REST retornando listas completas sem sub-divisão nas telas principais.

## Page Inventory
* **DashboardPage**: Acesso unificado (LOW RISK - utiliza arrays limitados no frontend `slice(0,5)`).
* **TasksPage**: Exibe todas as tarefas (CRITICAL RISK).
* **AttendancePage**: Exibe todos os atendimentos (CRITICAL RISK).
* **KnowledgePage**: Exibe todos os artigos e suas variações (CRITICAL RISK).
* **MaintenancePage**: Exibe todas as manutenções (CRITICAL RISK).
* **EquipmentPage**: Exibe todos os equipamentos (CRITICAL RISK).
* **FilesPage**: Listagem paginada no backend/frontend (LOW RISK).
* **CommandsPage**: Exibe comandos e respostas (MEDIUM RISK).

## API Inventory
| Endpoint | Tipo | Limit/Offset DB | N+1 Identificado |
| :--- | :--- | :--- | :--- |
| `GET /tasks` | Lista completa | Não | Sim (Creator, Assignees, Checklists) |
| `GET /attendances` | Lista completa | Não | Sim (Technician, Notes) |
| `GET /knowledge` | Lista completa | Não | Sim (Category, Author, Tags) |
| `GET /maintenances` | Lista completa | Não | Sim (Equipment, Technician, Parts) |
| `GET /equipment` | Lista completa | Não | Sim (Store, Dept, Location) |
| `GET /audit` | Lista paginada | Sim | Não |
| `GET /attachments`| Lista paginada | Sim | Não |
| `GET /users` | Lista paginada | Sim | Não |

## Pagination Audit
**D) Nenhuma paginação/limite**: Tasks, Attendances, Knowledge, Maintenances, Equipment, Projects, Departments, Stores, Commands.
A maioria dos endpoints estratégicos dependem do fluxo "Database > JSON > Browser > React Map", sem limites no SQLAlchemy e sem virtualização no React.

## Dataset Audit
*Dados reais ausentes no ambiente local (contagem inconclusiva via script automático), mas o risco foi classificado via estrutura de Query:*
- **CRITICAL**: Tasks, Attendances, Knowledge Articles, Maintenance Records, Equipment. (São dados transacionais com crescimento contínuo e diário).
- **HIGH**: Commands, Checklists.
- **MEDIUM**: Projects, Departments.
- **LOW**: Users, Stores.

## Database Audit
* **Queries sem `limit` / `offset`**: Resultam em leitura integral das tabelas principais.
* **Filtros ILIKE (`%search%`)**: Causam Full Table Scans pois índices B-Tree não os suportam. Ausência de índices Full-Text (GIN/tsvector).
* **Filtros por Categoria/Status**: Não possuem índices explícitos nas Foreign Keys no schema atual, podendo causar sequencial scans dependendo do tamanho da tabela.

## N+1 Audit
Um problema estrutural crítico do SQLAlchemy quando combinado com FastAPI/Pydantic `ConfigDict(from_attributes=True)`:
Como `joinedload` ou `selectinload` não são usados nos endpoints `GET` principais, o FastAPI força o SQLAlchemy a emitir uma query extra para *cada* relação declarada na modelagem de resposta. 
* *Exemplo na `GET /tasks`*: Para 1.000 tarefas renderizadas, ocorrem até 3.001 queries no banco de dados.

## Frontend Rendering Audit
O React renderiza cada card/row usando `.map()`.
Não existe paginação na interface para Tasks/Knowledge/Maintenance (apenas filtros lógicos).
Não existe Virtualization (`react-window`) ou Infinite Scroll.
Isso resulta em milhares de nós DOM simultâneos.

## React Rendering Audit
* Sem paginação, a alteração de um estado global ou filtro recalcula toda a árvore do componente que envelopa as listas inteiras (`TasksPage`, `AttendancePage`).
* Passagem de objetos inteiros desestruturados re-renderiza linhas que não sofreram alterações reais.

## Drawer/Modal Audit
* Os modais (`TaskDetailDrawer`, `MaintenanceDrawer`) são criados pela biblioteca Vaul ou Radix UI.
* Quando são ativados, a biblioteca calcula larguras, trava o scrollbar no corpo da página e gerencia Focus. 
* **Importante**: O problema de loop já foi corrigido (Fase 12.5.1), portanto, a lentidão ao abrir o Drawer hoje é reflexo do *DOM inflado*. O cálculo de overlay sobre 10.000 nós demora segundos.

## Forced Reflow Audit
O "Forced reflow while executing JavaScript took 4929ms" é categoricamente **C) consequência de uma lista gigante** e **D) consequência de Drawer/Dialog**.
As bibliotecas medem (`getBoundingClientRect`, `window.innerWidth`) elementos na página. Quando a página possui centenas de cards sem virtualização, o navegador trava o "Main Thread" recalculando o box model para garantir precisão do Drawer.

## Network Audit
| Página | Nº requests iniciais | Payload relevante | Possível gargalo |
| :--- | :--- | :--- | :--- |
| Tasks | 1 principal | Alto (todas tarefas + subobjetos) | Sem paginação, alto tráfego |
| Knowledge | 1 principal | Muito Alto (inclui conteúdo markdown) | Sem paginação, N+1 queries |
| Attendance | 1 principal | Alto | Sem paginação |

## Risk Classification
- **CRITICAL PERFORMANCE RISK**: Listagens transacionais puras (Tasks, Attendances, Maintenances, Knowledge, Equipment).

## Quick Wins
1. Adicionar limite arbitrário de segurança (ex: `limit(100)`) em todos os endpoints não paginados no Backend.
2. Aplicar `options(selectinload(...))` nas `query` do SQLAlchemy nos roteadores principais para sanar o gargalo N+1.
3. Omitir campos longos (ex: `content` do Knowledge) no modelo de resposta de listagem (`ArticleSimpleResponse`).

## Structural Problems
1. Ausência completa de arquitetura de paginação unificada (Offset/Limit ou Cursor-based) para dados transacionais.
2. Tabelas do frontend renderizam "Tudo" sem Virtualization ou paginação no Table Component.
3. Buscas de texto são feitas com varreduras completas no banco (`ILIKE %search%`) em vez de arquitetura de Search (ElasticSearch ou PostgreSQL Full Text Search).

## Recommended Correction Roadmap
1. Backend: Implementar função utilitária de paginação genérica (offset/limit + Total Count).
2. Backend: Otimizar Queries das tabelas principais adicionando Eager Loading (Joins) para eliminar N+1.
3. Frontend: Atualizar componentes de Grid/Lista para usar paginação remota real (`page=1&limit=50`).
4. Database: Estudar implantação de `tsvector` para buscas.

## Test Strategy
Atualmente os testes Vitest (117) e Pytest (150) garantem a correção lógica e comportamental. Qualquer alteração para paginação exigirá refatorar como os mock data são interceptados (msw) ou retornados na UI. Nenhuma alteração foi realizada nesta Fase 12.6.

## Open Questions
- A UI das tabelas (Data Tables) deve adotar paginação por páginas `[1] [2] [3]` ou sistema de "Carregar mais" (Infinite Scroll)?
- Há preferência por instalar biblioteca de Virtualização ou apenas usar paginação tradicional como resolvido na aba Files?
