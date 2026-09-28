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

## 6. Documentos
* **Document (Nova visão para Arquivos):**
  - `id`, `title`, `mime_type`, `file_hash`, `stored_path`, `upload_by`
  - *Diferença:* Substitui o acoplamento fixo (`entity_type` e `entity_id`). Utilizará tabelas associativas N:N (`document_equipment`, `document_attendance`, `document_project`), permitindo que a cópia da Nota Fiscal seja atrelada simultaneamente à Loja, ao Equipamento e ao Projeto.

## 7. Controle Operacional (Compras)
* **Quotation (Cotação):**
  - `id`, `title`, `reason`, `status` (pendente, aprovado, rejeitado), `requester_id`, `approver_id`.
* **QuotationItem:** Item orçado e valor.
* Após aprovado, pode gerar uma entrada no `StockMovement`.
