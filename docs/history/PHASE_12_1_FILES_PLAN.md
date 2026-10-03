# Planejamento da Fase 12.1 — Arquitetura de Files / Attachments

## 1. Estado Atual Encontrado
Durante a auditoria, identificou-se que **já existe uma implementação parcial** de anexos introduzida anteriormente (Phase 10).
- **Modelo de Dados:** Existe a tabela `attachments` mapeada no `backend/app/models.py`.
- **Roteador:** Existe `backend/app/routers/attachments.py` com endpoints `POST /upload`, `GET`, `GET /{id}`, `GET /{id}/download`, `GET /{id}/preview`, e `DELETE /{id}`.
- **Armazenamento:** Arquivos são salvos fisicamente no filesystem local em `/app/uploads` usando `fastapi.UploadFile`.
- **Associação:** Utiliza associação polimórfica (`entity_type` e `entity_id`).
- **Usuários/Avatar:** O modelo `User` possui um campo simples `avatar_url` (String), não integrado à tabela de anexos.

## 2. Problemas/Duplicações Existentes
Apesar da base existir, ela não atende aos requisitos arquiteturais e de segurança para um sistema escalável e robusto (Fase 12):
- **Autorização Falha (Acesso Global):** Atualmente, qualquer usuário com permissão global de `attachment:read` pode baixar anexos de *qualquer* entidade. A autorização do anexo não respeita a visibilidade da entidade "pai" (ex: não verifica se o usuário tem acesso ao Projeto 10 antes de baixar o anexo do Projeto 10).
- **Acoplamento de Storage:** O router faz operações diretas com `os.path` e `open()`. A arquitetura atual não permite trocar o armazenamento (para S3, por exemplo) sem refatorar o endpoint inteiro.
- **Inconsistência de Caminhos:** O banco armazena o caminho absoluto (`file_path = /app/uploads/...`). Se o contêiner mudar de diretório de montagem, quebra todos os arquivos.
- **Risco Transacional:** No endpoint de DELETE, o arquivo físico é deletado antes do `db.commit()`. Se o commit falhar, o banco fica com um registro apontando para um arquivo físico que já não existe.
- **Auditoria Ausente:** Não há integração com o `AuditLog` para downloads sensíveis ou remoções.

## 3. Arquitetura Proposta
Para corrigir as falhas sem reinventar a roda, a arquitetura adotará os seguintes pilares:
1. **Camada de Serviço (StorageService):** Uma abstração para o armazenamento. A implementação inicial será `LocalFileSystemStorage`, mas preparada para `S3Storage`.
2. **FileAccessService:** Um serviço dedicado para centralizar as regras de autorização de forma extensível, acionando o validador correto dependendo do `entity_type`.
3. **Preservação da Associação Polimórfica:** Manter a estrutura `entity_type` + `entity_id` que já existe, visto que reverter para tabelas associativas por entidade exigiria muito esforço sem grande ganho imediato, contanto que as verificações de autorização sejam centralizadas no `FileAccessService`.

## 4. Decisão Attachment vs File (Nomenclatura)
- **Decisão:** Manter o conceito e a tabela atual como **`Attachment`** para o MVP, sem renomear para `File`.
- **Justificativa:** A separação arquitetural clara será: o modelo `Attachment` é responsável exclusivamente por armazenar os metadados e a associação lógica com a entidade. O `StorageAdapter` abstrato será o único responsável por lidar com o arquivo físico. Isso preserva o que já existe de estrutura, evita refatorações desnecessárias de nomenclatura, e dispensa a complexidade de ter tabelas N:M separadas para deduplicação física de um mesmo arquivo.

## 5. Modelo de Banco
Reaproveitar a tabela `attachments` existente, mas com refinamentos:
- Remover `file_path` (que grava o path absoluto) e usar apenas `stored_filename`.
- **Colunas sugeridas:**
  - `id`, `original_filename`, `stored_filename` (GUID + extensão).
  - `mime_type`, `file_size`, `file_hash` (SHA-256).
  - `entity_type`, `entity_id`.
  - `uploader_id` (FK User).
  - `created_at`, adicionar `deleted_at` (soft delete).
  - *Remover* `file_path`.
- **Ciclo de Vida de Deleção (Soft Delete & Storage):**
  1. O usuário solicita o DELETE de um anexo.
  2. O banco atualiza o registro do `Attachment`, injetando `deleted_at`.
  3. O anexo deixa de aparecer imediatamente nas consultas normais da API.
  4. O arquivo físico correspondente **NÃO** é apagado imediatamente dentro da transação do PostgreSQL, mitigando falhas na consistência transacional.
  5. A limpeza física do arquivo em disco (garbage collection) ocorrerá posteriormente por uma rotina assíncrona controlada.

## 6. Estratégia de Storage
- **Abstração:** Criação de um `StorageAdapter` (interface).
- **MVP (Local Storage):** Salvar em um volume persistente do Docker.
- Apenas a interface `StorageAdapter` lida com `os.path`. O router da API só enviará os bytes (via stream) e receberá o `stored_filename`.

## 7. Estratégia de Associação
- Manter polimórfica: `entity_type` (String) + `entity_id` (Integer).
- **Integridade:** Como não há chave estrangeira real, a responsabilidade de verificar se a entidade existe recai sobre a camada de serviço. O endpoint validará se a entidade mãe existe *antes* de autorizar o upload e realizar o vínculo.

## 8. Estratégia de Autorização e Validação (`FileAccessService`)
- A principal falha atual é a falta de controle contextual tanto no upload quanto no download.
- Solução: **`FileAccessService` baseado em Padrão de Registro (Registry/Adapters)**.
- **Autorização Abrangente (Upload/Download):** O upload também será estritamente protegido. Antes de salvar qualquer arquivo, o serviço validará dinamicamente:
  - Se a entidade raiz existe.
  - Se o usuário logado possui acesso a esta entidade.
  - Se o usuário possui permissão para alterar/anexar itens naquela entidade específica.
  - Se o `entity_type` é suportado e tem um validador registrado.
  *(Isso garante que ter a permissão genérica `attachment:write` jamais permita injetar arquivos em projetos de terceiros, por exemplo).*
- **Arquitetura Extensível:** Não construiremos um router gigante com múltiplos blocos `if entity_type == 'x'`. O `FileAccessService` atuará como um **Registry**. Cada módulo operacional (Project, Task, etc.) registrará o seu próprio validator (ex: `ProjectAttachmentValidator`). Assim, adicionar suporte a entidades futuras exige apenas plugar um novo adapter, mantendo o serviço OCP (Open-Closed Principle).

## 9. Estratégia de Auditoria
- **Upload / Deleção:** Registrados no `AuditLog` como `attachment.uploaded` e `attachment.deleted`.
- **Download:** Registrado apenas se a entidade pai for classificada como sensível (configurável), para não poluir os logs. O conteúdo (bytes) NUNCA vai para o log, apenas `attachment_id`, `filename` e `user_id`.

## 10. Estratégia de Segurança
- **MIME Sniffing & Extensão:** Confiar na extensão sanitizada no backend, mas validar contra uma *AllowList* pragmática (PDFs, Imagens, Docs Office, Texto). Negar explicitamente `.exe`, `.sh`, `.bat` ou arquivos sem extensão, bem como `.svg` (risco de XSS em preview).
- **Nome Físico Seguro:** Continuar usando `UUID + extensão sanitizada`. Nunca confiar no nome original fornecido pelo usuário.
- **Limites:** Manter o limite central no streaming, prevenindo ataques DOS na memória.
- **Acesso:** Arquivos ficam armazenados fora da pasta pública do front-end e não expostos estaticamente.

## 11. Estratégia de Backup / Restore
- Exige snapshot de 2 componentes: Banco PostgreSQL + Volume Docker (`/app/uploads`).
- **Scripts Utilitários:** Como os recursos não estão no mesmo banco, propor scripts via CLI no futuro para auditar orfanatos (ex: "Find orphaned files" - no disco sem db; "Find missing files" - no db sem disco) no caso de crashes graves de servidor durante commits.

## 12. API Proposta
Os endpoints existentes estão próximos da necessidade. Ajustes previstos:
- `POST /attachments/upload`
- `GET /attachments` (Aplicar paginação rigourosa e filtros mais inteligentes)
- `GET /attachments/{id}`
- `GET /attachments/{id}/download`
- `GET /attachments/{id}/preview`
- `DELETE /attachments/{id}` (Migrar para Soft Delete)

## 13. Estratégia de Testes
- **Backend:** Usar pytest com `TempDirectory` mockado para o `StorageService`. Garantir testes de autorização atestando que usuários não participantes de um Projeto restrito não conseguem baixar seus anexos.
- **Frontend:** Testar componentes de upload isolados, com validação de formato e tamanho antes de bater na API.

## 14. Integrações Futuras
- **Base de Conhecimento:** Os artigos apenas apontarão para `entity_type='knowledge_article'`.
- **Avatar de Usuários:** Atualmente o `User.avatar_url` persistirá como string simples. Futuramente, quando priorizado, a lógica migra para a estrutura de anexos sem impacto imediato.

## 15. Riscos
- Falha na lógica de `FileAccessService` pode gerar Data Leakage (ex: acesso a arquivos confidenciais ignorando regras de tenant/projeto).
- Lixo residual no disco físico caso os uploads falhem frequentemente e a limpeza assíncrona falhe.

## 16. Débitos Técnicos (Para resolver nesta Fase)
- Refatorar o router atual (`attachments.py`) que fere princípios S.O.L.I.D. introduzindo a camada `StorageService`.
- Atualizar o modelo de banco (remover path absoluto e incluir soft_delete).

## 17. Divisão Final da Fase 12.2 (Tarefas de Implementação)
Com base na arquitetura aprovada, a Fase 12.2 será estruturada nas seguintes tarefas:
- **Tarefa 1 - StorageAdapter e Banco de Dados:** Criar a interface de Storage, implementar o `LocalFileSystemStorage`, atualizar o model `Attachment` (adicionar `deleted_at`, remover `file_path`) e gerar migration.
- **Tarefa 2 - FileAccessService (Registry Pattern):** Criar a estrutura base do `FileAccessService` em formato Registry. Implementar os validadores inaugurais de escopo para as entidades mapeadas.
- **Tarefa 3 - Refatoração de Endpoints (Upload & Delete):** Atualizar o `POST /upload` e `DELETE /{id}` para consumirem o `StorageAdapter` e passarem estritamente pelos validadores contextuais de escrita no novo serviço, aplicando soft delete.
- **Tarefa 4 - Refatoração de Endpoints (Leitura):** Atualizar endpoints de listagem e download, integrando a autorização de leitura por validador e limitando resultados.
- **Tarefa 5 - Segurança e UI Setup (Opcional):** Implementar o envio ao `AuditLog` para acessos críticos, configurar limitadores MIME e disponibilizar a API finalizada para a Fase 12.4 de front-end.

## 18. Riscos Restantes
- O ciclo de vida do soft delete requer uma rotina para apagar arquivos órfãos (com `deleted_at`) do disco posteriormente. Sem esta rotina de *garbage collection*, o sistema não liberará efetivamente o espaço em disco. Este utilitário de limpeza poderá ser acoplado nativamente na engine assíncrona já criada (Fase 13).

## 19. Aprovação da Fase 12.1
As validações arquiteturais foram revisadas e documentadas com sucesso, não sendo necessária intervenção de código adicional. A infraestrutura para a Fase 12.2 está prancha e perfeitamente amarrada.
