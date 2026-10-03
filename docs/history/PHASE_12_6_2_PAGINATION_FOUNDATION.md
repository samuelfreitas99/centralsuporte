# FASE 12.6.2 — PAGINATION FOUNDATION

## Objetivo
Implementar a fundação técnica estrutural de paginação conforme planejado na Fase 12.6.1, garantindo suporte nativo a carregamento controlado no Backend e navegação de estado no Frontend. Nenhuma entidade do sistema funcional foi modificada nesta fase; a estrutura está preparada para ser consumida nas próximas etapas.

## Backend Foundation
### 1. PaginatedResponse Generic Schema
Criado em `app/schemas.py`:
- `PaginatedResponse[T]`: Modelo genérico Pydantic para padronização unificada das respostas. Campos fixos: `items`, `page`, `limit`, `total`, `total_pages`, `has_next`, `has_prev`.

### 2. Utilitários de Paginação (`app/utils/pagination.py`)
- `PaginationParams`: Dependência de injeção (FastAPI `Depends()`) projetada para capturar os query parameters `page` e `limit`, limitando max-limit para 100 via validação. Ela já retorna também um offset pré-calculado.
- `paginate(items, page, limit, total)`: Helper function agnóstica a banco de dados que calcula o math para total_pages, e flags booleanas (next/prev).

## Frontend Foundation
### 1. Types
- `PaginatedResponse<T>` em `frontend/src/types/pagination.ts` como espelho fiel do contrato do Backend.

### 2. State e URL Sincronização
- `usePagination` Hook (`frontend/src/hooks/usePagination.ts`): Implementado usando Hash Routing (`window.location.hash`) puro, garantindo total desacoplamento e suporte nativo ao "Voltar/Avançar" do Browser. Ao mudar de limite, a página é nativamente reiniciada (reset) para 1. Evitou-se sobrecarga do router original.

### 3. Componente UI
- `<Pagination />` (`frontend/src/components/ui/Pagination.tsx`): 
  - Suporta estado Mobile enxuto (Apenas botões Próxima/Anterior).
  - Suporta Desktop (Range Numérico com elipses "..." para grandes variações, setas com Lucide Icons).
  - Plena acessibilidade via aria-labels.

## Testes
Foram adicionados novos testes focados unicamente nas novas funções de base:
- `backend/tests/test_pagination.py`: Cobertura de bounds (page vazia, limit extrapolado, offset calculation).
- `frontend/src/test/Pagination.test.tsx`: Interatividade UI, aria-roles e lógicas visuais de elipse.
- `frontend/src/test/usePagination.test.tsx`: Validação do Hook e atualização correta via browser events (`hashchange`).

## Decisões Técnicas
- Optamos pela implementação nativa do `usePagination` via Hash API nativa do JS porque a aplicação roda primariamente em HashRouter e não `react-router-dom` convencional.
- O limite máximo não foi encravado no PaginatedResponse. O `PaginationParams` provê validação flexível de request via FastAPI Query.

## Arquivos Criados/Modificados
**Criados**:
- `backend/app/utils/pagination.py`
- `backend/tests/test_pagination.py`
- `frontend/src/types/pagination.ts`
- `frontend/src/components/ui/Pagination.tsx`
- `frontend/src/hooks/usePagination.ts`
- `frontend/src/test/Pagination.test.tsx`
- `frontend/src/test/usePagination.test.tsx`
- `docs/PHASE_12_6_2_PAGINATION_FOUNDATION.md`

**Modificados**:
- `backend/app/schemas.py`
- `docs/PROJECT_STATE.md`

**Limitação Presente**:
Nenhum endpoint foi convertido (Tasks, Equipment, etc.). Este módulo será herdado pela próxima Fase (12.6.3 - Tasks).
