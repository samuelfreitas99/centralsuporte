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

### 2026-09-24: Mecanismo Unificado de Busca Global e Métricas de Reincidência (Fase 11)
- **Decisão**: A busca global opera via endpoint único (`/search/global`) com consultas multi-entidade (artigos de conhecimento, comandos rápidos, atendimentos, equipamentos, manutenções e tarefas/checklists) em PostgreSQL através de correspondência flexível (ILIKE com normalização de termos e filtros por loja/tipo de entidade), devolvendo payloads padronizados (`SearchResultItem`) com badges de contexto e rotas de módulo de destino. O módulo de relatórios operacionais consolida taxas de resolução, custos de manutenção, produtividade técnica e identificação automatizada de ativos crônicos no parque de TI com geração de exportação em streaming CSV compatível com suítes de escritório (UTF-8 com BOM).
- **Contexto**: Elimina a necessidade de o analista de suporte pesquisar individualmente em cada módulo do sistema para localizar soluções técnicas já aplicadas anteriormente ou identificar equipamentos problemáticos recorrentes.
- **Consequências**: Facilita a tomada de decisão preventiva e agiliza substancialmente o diagnóstico de falhas operacionais pela equipe de TI.

### 2026-09-24: Trilhas de Auditoria e Sanitização Recursiva de Metadados (Fase 12)
- **Decisão**: Criação da entidade imutável `audit_logs` no PostgreSQL com índices otimizados por data, ação, usuário e entidade. Todas as operações críticas (criação, edição e exclusão de contas de usuário, login, login com falha, bloqueios de segurança e alterações de permissões) disparam registros automáticos via helper `record_audit_log`. Os metadados transitados passam por sanitização recursiva (`sanitize_audit_data`) que substitui senhas, hashes, chaves de API e tokens por `[REDACTED]` antes de qualquer persistência. A consulta dos registros é estritamente restrita a usuários com permissão `audit:read` (perfis Administrador e Gestor).
- **Contexto**: Cumprimento estrito da Seção 38 do `PRODUCT_SPEC.md` para governança, conformidade interna e rastreabilidade total de incidentes operacionais.
- **Consequências**: Histórico confiável e à prova de adulterações acidentais, sem risco de vazamento de credenciais na própria trilha de auditoria.

### 2026-09-24: Especificação Arquitetural de Segurança para o Futuro Cofre de Senhas (Fase 12)
- **Decisão**: Ficam formalmente estabelecidos os seguintes pré-requisitos técnicos mandatórios e irrevogáveis para qualquer implementação futura do módulo de Cofre de Senhas:
  1. **Criptografia Simétrica Autenticada (Envelope Encryption / AES-256-GCM)**: O texto plano de senhas e segredos JAMAIS será salvo no PostgreSQL. Toda credencial será cifrada com AES-256-GCM gerando ciphertext, initialization vector (nonce de 96 bits) e authentication tag (128 bits) para validação de integridade.
  2. **Segregação de Chave Mestra**: A chave mestra de decifragem (`CENTRAL_VAULT_KEY`) deve ser provisionada exclusivamente via variável de ambiente no servidor ou injetada por cofre externo dedicado (KMS/Vault), sendo expressamente proibido seu armazenamento no código-fonte, banco ou repositório Git.
  3. **Trilha Obrigatória de Revelação (`PASSWORD_REVEAL`)**: Toda descriptografia com revelação de senha no frontend exigirá chamada explícita autenticada que automaticamente registrará um log imutável de auditoria (`action="PASSWORD_REVEAL"`), contendo ID do usuário, identificador do ativo, timestamp e endereço IP.
  4. **Segregação entre Credenciais Privadas e Compartilhadas**: O cofre deverá diferenciar estritamente senhas particulares do técnico (privadas) de credenciais departamentais (compartilhadas por equipe/loja).
  5. **Higienização Geral de Logs**: Fica estritamente vedada a exibição de senhas em logs de aplicação, mensagens HTTP de erro, respostas de exceção ou dumps de memória.
- **Contexto**: O cofre de senhas armazenará credenciais de infraestrutura crítica (switches, roteadores de borda, firewalls e bancos de dados da rede de lojas).
- **Consequências**: Garante segurança de nível institucional antes do desenvolvimento de qualquer interface gráfica ou funcionalidade de credenciais.

### 2026-09-24: Mecanismo de Automação e Regras Reativas Leves (Fase 13)
- **Decisão**: A automação interna e agendamento de regras reativas (alertas de tarefas vencidas/próximas, lembretes de manutenções preventivas programadas e detecção preventiva de equipamentos crônicos) foi implementada como um worker assíncrono nativo gerenciado no ciclo de vida (`lifespan`) do FastAPI/AnyIO em vez de acoplar Celery/Redis ou mensagerias externas. O disparo das regras inclui salvaguarda de idempotência de 24 horas para tarefas e 48 horas para manutenções agendadas, prevenindo alertas redundantes. Adicionalmente, disponibilizou-se o endpoint `POST /automation/trigger` para verificação sob demanda disparável diretamente pela interface gráfica através do componente `NotificationsDropdown`.
- **Contexto**: Respeito estrito à regra crítica de servidor compartilhado de `AGENTS.md` (sem adição de containers pesados de mensageria nem consumo excessivo de memória do host Ubuntu), entregando os requisitos das seções 40 e 41 do `PRODUCT_SPEC.md`.
- **Consequências**: Operação autônoma, leve e resiliente com zero dependência de serviços externos, garantindo que o analista de suporte seja alertado tempestivamente sobre prazos iminentes.

### 2026-09-24: Polimento Final, Acessibilidade WCAG 2.1, Atalhos Operacionais e Otimização de Performance (Fase 15)
- **Decisão**: A consolidação final do MVP incorporou as seguintes otimizações de acessibilidade e performance técnica:
  1. **Acessibilidade de Movimento (`prefers-reduced-motion`)**: Envolvimento global da aplicação com `<MotionConfig reducedMotion="user">` do `motion/react` e inclusão de regra CSS `@media (prefers-reduced-motion: reduce)` que zera transições e animações quando solicitado pelo sistema operacional do analista.
  2. **Navegação Acessível e Teclado**: Inclusão de link "Skip to main content" (`#main-content`) conforme WCAG 2.1, anel de foco de alto contraste (`:focus-visible`), atributos `aria-current="page"` na navegação lateral e `aria-busy="true"` nos estados de carregamento.
  3. **Atalhos Operacionais de Alta Eficiência**: Suporte ao atalho global de teclado `Ctrl+K` / `Cmd+K` para acesso instantâneo ao módulo de Pesquisa Global e Relatórios, acompanhado de acionador visual com badge de tecla de atalho no cabeçalho.
  4. **Code-Splitting e Otimização de Bundle**: Divisão do bundle JavaScript com `React.lazy` e `Suspense` em todas as rotas secundárias, combinada ao componente `PageSkeleton.tsx`. O chunk principal foi reduzido em ~40% (de 738 kB para 446 kB), eliminando alertas de tamanho de chunk no build de produção.
  5. **Limpeza Visual de Estabilização**: Remoção de tags transitórias de fases anteriores na barra lateral, conferindo acabamento executivo e profissional de produção.
- **Contexto**: Exigência de conformidade com o `DESIGN_SYSTEM.md`, `UI_UX.md` e checkpoints da Fase 15 do `ROADMAP.md` para finalização e estabilização do MVP da Central Operacional.
- **Consequências**: Experiência de uso fluida, inclusiva e ágil para o time de suporte técnico, com carregamento otimizado mesmo em redes com restrição de largura de banda.

### 2026-09-25: Congelamento e Diretrizes Arquiteturais (Pós-MVP)
- **Decisão**: Estabelecimento formal de diretrizes para o próximo ciclo:
  1. **Soft Delete**: Entidades críticas operacionais (`Equipment`, `License`, `Store`) usarão estados inativos em vez de Hard Delete, preservando consistência de trilhas técnicas.
  2. **Arquivos como Biblioteca**: O acoplamento N:1 de arquivos passa a N:N (Tabelas de Junção `document_equipment`, etc.), elevando anexos a Documentos globais pesquisáveis.
  3. **Checklists como Templates**: Checklists deverão ter tabelas de `Template` para reuso contínuo.
  4. **Projetos Operacionais**: Tarefas complexas deixarão de viver isoladamente e serão agregadas sob a nova entidade pai `Project`.
- **Contexto**: Fechamento do MVP e documentação proveniente de auditoria exaustiva.
- **Consequências**: O escopo passa a suportar relacionamentos mais robustos, sem perder as regras de negócio consolidadas (OTRS permanece o canal oficial, Cofre usa Envelope Encryption, etc.).


### 2026-09-26: Evolução Arquitetural de Comandos (Multi-passo)
- **Decisão**: A entidade `Command` passa a suportar múltiplos passos ordenados através de relacionamento 1:N com a nova tabela `command_steps`. A persistência do código do comando foi migrada da coluna `command` na tabela `commands` para `command_text` em `command_steps`. A UI foi atualizada para permitir adicionar, reordenar, excluir e copiar passos individualmente, além de um botão para "Copiar Todos" que consolida os scripts de um procedimento.
- **Contexto**: A necessidade operacional em suporte técnico exige execução de procedimentos sequenciais.
- **Consequências**: Maior clareza e redução de erros ao seguir procedimentos compostos. Suporte a pesquisa aprimorado cobrindo o texto em todos os passos.
