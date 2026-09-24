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

### 2026-09-24: Biblioteca de Motion (Fase de Planejamento UI)
- **Decisão**: Adoção exclusiva da biblioteca `motion/react` (e rejeição de `framer-motion` como dependência isolada).
- **Contexto**: Padronização da biblioteca recomendada atualizada para animações React, focada em performance, redução de bundles, e suporte nativo ao hook de acessibilidade `prefers-reduced-motion`.
- **Consequências**: Agentes e desenvolvedores não devem instalar a versão antiga ou pacotes paralelos.

### 2026-09-24: Segurança do Cofre de Senhas (Fase 12)
- **Decisão**: O Módulo de Cofre de Senhas está estritamente bloqueado de implementação até o estabelecimento e documentação prévia da arquitetura de segurança (Fase 12).
- **Contexto**: Prevenir vazamentos de credenciais administrativas críticas da empresa (roteadores, switches, instâncias).
- **Consequências**: A arquitetura deverá incluir obrigatoriamente criptografia sem senhas no banco em texto puro, logs imutáveis e exclusão de payloads visíveis em logs gerais.

### 2026-09-24: Arquitetura de Manutenções e Integração com Equipamentos (Fase 9)
- **Decisão**: Manutenções (`maintenance_records`) possuem ciclo de vida formal (`agendada`, `em_andamento`, `concluida`, `cancelada`), vinculam-se a equipamentos do parque tecnológico (`equipment_id`), reaproveitam o motor de checklists existente (`checklists` associado a `maintenance_id`), e registram automaticamente eventos na trilha de auditoria técnica (`equipment_history`). Ao concluir com sucesso uma manutenção em equipamento que estava `em_manutencao`, o status do equipamento é restaurado automaticamente para `ativo`.
- **Contexto**: Centralizar rotinas preventivas, corretivas e checklists operacionais mantendo o histórico de vida útil do hardware sempre atualizado e auditável.
- **Consequências**: Elimina duplicidade de estruturas de checklist, garante auditoria integrada das intervenções no parque de TI e simplifica o fluxo do técnico no frontend.

### 2026-09-24: Arquitetura de Armazenamento de Arquivos e Controle de Acesso (Fase 10)
- **Decisão**: Arquivos e anexos (`attachments`) têm seus metadados salvos no PostgreSQL com cálculo de integridade SHA-256 e nomes físicos sanitizados em UUID no disco local (`/app/uploads`), protegidos contra path traversal. Arquivos NÃO são servidos estaticamente de modo público; todo acesso (download ou preview inline) exige autenticação JWT e validação de permissões (`attachment:read`).
- **Contexto**: Resguardar evidências técnicas, prints com dados de clientes/sistemas e notas fiscais de equipamentos, em estrita conformidade com as seções 33 e 34 do `PRODUCT_SPEC.md`.
- **Consequências**: Segurança ponta a ponta sem vazamentos acidentais por tentativa de adivinhação de URLs ou caminhos no servidor.


