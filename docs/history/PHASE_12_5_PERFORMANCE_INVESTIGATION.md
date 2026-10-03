# Investigação de Performance e Correção de Loop (Fase 12.5.1)

## Contexto
Durante a auditoria de testes (Fase 12.4), identificamos que o teste de `AuditLogsPage` falhou e que páginas como `TasksPage`, `KnowledgePage` e `MaintenancePage` sofriam de um problema de performance envolvendo requisições em loop.

## Causa Raiz
O problema ocorria na interação entre a seleção de um item (ex: `selectedTask`) que abria um Drawer ou Modal, e a re-busca de dados (`loadTasks`).
O padrão de erro era:
1. `selectedTask` é passado como dependência no `useCallback(loadTasks)`.
2. O usuário clica para abrir os detalhes de um item, o que dispara `setSelectedTask(item)`.
3. Isso recria `loadTasks`, disparando o `useEffect` que faz o `getTasks()`.
4. O Backend retorna novos objetos (mesmo que com os mesmos dados).
5. O `loadTasks` atualiza o `selectedTask` iterando na nova lista para encontrar o selecionado.
6. `setSelectedTask(updated)` altera a referência do `selectedTask`, disparando novamente o `useEffect`.
7. Isso criava um **Loop Infinito de Requisições** ("Infinite Re-render/Fetch Loop").

## Solução Implementada
Para solucionar este problema de re-render sem quebrar o comportamento:
- A dependência direta do item selecionado (`selectedTask`, `selectedArticle`, `selectedMaintenance`) foi **removida** do array de dependências do `useCallback(loadTasks)`.
- A atualização do estado selecionado na conclusão do `getTasks` passou a usar a atualização funcional de estado (Functional State Update), `setSelectedTask(prev => ...)`.
- Se `prev` for nulo, a função imediatamente retorna `null`. Isso previne que a busca force um objeto indevido.
- Se o novo objeto não for encontrado, preserva-se o antigo (`return updated ?? prev;`).

## Arquivos Afetados (Fase 12.5.1)
*   `frontend/src/pages/TasksPage.tsx`: Implementado functional state update.
*   `frontend/src/test/TasksPage.test.tsx`: Removida causa de falso negativo por re-render extra na UI (Drawer do Vaul) e adicionado teste que garante estritamente que a abertura do modal **NÃO dispara requisições extra**.
*   `frontend/src/test/AuditLogsPage.test.tsx`: Corrigido teste frágil adicionando espera (`waitFor`) pela inicialização dos metadados da combobox de Ações.

## Resultados
- Testes locais do Vitest (117/117) passam com sucesso.
- Prevenção ativa de Loops validada nos cenários críticos sem adicionar frameworks pesados e mantendo o `StrictMode`.
