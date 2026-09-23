# DECISIONS

## Registro de Decisões Arquiteturais

### 2026-09-23: Isolamento de Infraestrutura (Fase 0)
- **Decisão**: Mapear portas 8088 para a API e 5173 para o Frontend. O PostgreSQL rodará na porta 5432 interna à rede do Docker e não será exposto no host.
- **Contexto**: O servidor já possui containers em execução utilizando portas comuns (ex: 80, 3000, 8000, 9000, 3306). Evitar conflitos é crítico.
- **Consequências**: Os desenvolvedores e usuários da equipe deverão acessar os serviços utilizando as portas específicas.

### 2026-09-23: Banco de Dados (Fase 0)
- **Decisão**: Utilizar PostgreSQL 16 com volume nomeado (`centralsuporte_pgdata`).
- **Contexto**: Garantir persistência dos dados independentemente do ciclo de vida dos containers.

### 2026-09-23: Estrutura do Repositório
- **Decisão**: Utilizar abordagem de monorepo dividida em `backend/` e `frontend/` na raiz do projeto `/srv/centralsuporte`.
- **Contexto**: Facilita gerenciar o código-fonte num servidor SSH direto com Docker Compose gerenciando ambos.
