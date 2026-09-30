# DATA MODEL CONCEITUAL — Central de Suporte

Este documento descreve o **modelo conceitual** das entidades para orientar a evolução e refatoração arquitetural.

## 1. Identidade e Acessos
* **User (Auth):** `id`, `username`, `email`, `hashed_password`, `is_active`, `role_id`
* **UserProfile (Perfil Operacional):** `id`, `user_id`, `specialty`, `shift_start`, `shift_end`, `avatar_url`, `status_message`
* **Role / Permission:** Relacionamento N:N de RBAC para acesso a endpoints e telas.

## 2. Produtividade e Agrupamentos
* **Project:** `id`, `title`, `description`, `status` (planejado, execução, concluído), `target_date`, `manager_id`. (Container Macro).
* **Task:** `id`, `title`, `priority`, `status`, `project_id` (opcional), `due_date`.
* **ChecklistTemplate:** `id`, `title`, `description`, `category`. (Matriz global reutilizável).
* **ChecklistTemplateItem:** Itens da matriz.
* **ChecklistInstance:** A execução real do checklist. Relaciona-se ao Template (cópia gerada) e à entidade alvo (`Task`, `Project`, ou `Maintenance`). Possui `project_id` opcional.

## 3. Atendimentos e Conhecimento
* **Attendance:** `id`, `technician_id`, `otrs_reference`, `problem`, `solution`, `equipment_id` (opcional), `project_id` (opcional).
* **KnowledgeArticle:** Versões, Tags, Categorias (inalterado em relação ao MVP).

## 4. Infraestrutura e Ativos
* **Store / Department:** Estrutura geográfica.
* **Equipment:** Hardware catalogado.
* **EquipmentHistory:** Trilha de vida do hardware.
* **MaintenanceRecord:** Intervenção física. Possui `project_id` (opcional).
* **StockItem / StockMovement:** Quantitativos materiais. Movimentações possuem `project_id` (opcional).

## 5. Novos Ativos Lógicos (Cofre e Licenças)
* **VaultSecret (Cofre):** 
  - `id`, `title`, `system_url`
  - `encrypted_username`, `encrypted_password`, `nonce`, `auth_tag`
  - `visibility` (pessoal, equipe), `owner_id`
  - Relacionamentos opcionais: `store_id`, `equipment_id`
* **License:**
  - `id`, `name`, `license_key` (Mascarada na UI, armazenada de forma segura), `account_email` (E-mail ou conta de ativação associada), `total_seats`
  - *Integração Futura*: `vault_secret_id` (opcional, caso a ativação exija login no portal do fornecedor - **A ser implementado somente quando o módulo Vault existir**).
* **LicenseAssignment:** Atribuição do "assento" da licença a um `user_id`, `equipment_id`, ou email genérico.

## 6. Arquivos e Anexos (Fase 12)
* **Attachment (Anexos e Documentos):**
  - `id`: Chave primária inteira.
  - `original_filename`: Nome original do arquivo informado no upload (apenas metadado).
  - `stored_filename`: Identificador único no storage (`UUID + extensão sanitizada`). Único e indexado.
  - `file_size`: Tamanho em bytes.
  - `mime_type`: Content-Type (ex: `application/pdf`, `image/jpeg`).
  - `file_hash`: Digest SHA-256 do arquivo físico.
  - `entity_type`: Tipo da entidade vinculada (`attendance`, `knowledge`, `maintenance`, `equipment`, `task`, `project`).
  - `entity_id`: ID da entidade vinculada.
  - `description`: Descrição opcional.
  - `uploader_id`: FK para `User` (on delete SET NULL).
  - `created_at`: Data e hora do upload.
  - `deleted_at`: Data e hora de soft delete (exclui de consultas ativas; arquivo físico mantido para Garbage Collection).
  - *Desacoplamento físico:* A coluna legada `file_path` (caminho absoluto) foi removida. A resolução de caminhos físicos e I/O é responsabilidade exclusiva do `StorageAdapter`.


## 7. Controle Operacional (Compras)
* **Quotation (Cotação):**
  - `id`, `title`, `reason`, `status` (pendente, aprovado, rejeitado), `requester_id`, `approver_id`.
* **QuotationItem:** Item orçado e valor.
* Após aprovado, pode gerar uma entrada no `StockMovement`.
