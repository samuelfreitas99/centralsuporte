# API CONTRACT — Princípios e Padronizações

Este documento define os princípios contratuais que governam a comunicação Frontend-Backend na Central de Suporte, especialmente focando nas novas entidades do Pós-MVP.

## 1. Convenção Base
* Todos os payloads trafegam em `application/json`.
* Requisições autenticadas exigem cabeçalho `Authorization: Bearer <token>`.
* Códigos de Retorno Padronizados:
  - `200 OK` e `201 Created` para sucesso.
  - `400 Bad Request` para erros de validação (com payload detalhando qual campo falhou).
  - `401 Unauthorized` e `403 Forbidden` para controle de acesso.
  - `404 Not Found` (Sem forçar stack traces genéricos).

## 2. Contratos de Paginação e Listagem
Toda listagem (`GET /collection`) deve suportar, nativa ou conceitualmente:
* `page`, `size` (paginação padrão baseada em limit/offset).
* Filtros multi-campos (`?status=ativo&store_id=5`).
* Payloads de resposta contendo a listagem `items[]` e os `total_results`.

## 3. Contratos de Arquivos (Upload e Preview)
Como os arquivos se transformarão em Documentos independentes:
* `POST /documents/upload` - Aceita `multipart/form-data`, retorna o objeto `Document` gerado.
* `POST /documents/{id}/link` - Associa um documento a uma entidade específica enviando o target (ex: `{"target_type": "project", "target_id": 10}`).
* `GET /documents/{id}/download` - Stream binário seguro. Exige token JWT.

## 4. Segurança no Tráfego do Cofre (Secrets)
* `GET /vault` nunca deve retornar senhas descriptografadas nos payloads listados em tabela. Deve retornar apenas os metadados (Título, URL, dono).
* `POST /vault/{id}/reveal` - Endpoint exclusivo e atômico que descriptografa, devolve o segredo em JSON temporário `{"secret": "..."}` e aciona o log da trilha de auditoria na mesma transação.
* O frontend é responsável por apagar a string revelada do estado do React imediatamente após uso ou ocultação da tela.

## 5. Cotações e Estoque
* `POST /quotations/{id}/approve` - Processamento lógico que marca a cotação como aprovada e, se estipulado, pode automaticamente triggar a injeção do quantitativo no endpoint `POST /stock/movements`.

## 6. Licenças
* A criação e edição de licenças via `POST /infrastructure/licenses` e `PUT /infrastructure/licenses/{id}` permitem o envio de `account_email` como metadado administrativo opcional.
* Senhas ou credenciais de ativação **nunca** devem trafegar em requisições de Licenças; futuras implementações do Cofre (Vault) deverão usar `vault_credential_id` como referência.
* O `license_key` pode ser omitido do payload de `PUT` para preservar a chave existente sem reescrevê-la.

## 7. Projetos Operacionais (Fase 10)
* O `project_id` é opcional e foi adicionado em schemas de criação (`POST`) e atualização (`PUT`) de recursos como Tasks, Checklists, Maintenances, Attendances, CalendarEvents e StockMovements.
* **Unset de Campos:** Os endpoints `PUT` usam `exclude_unset=True` nos schemas Pydantic. Para desvincular um projeto, o payload JSON deve enviar explicitamente `"project_id": null`. Se o campo não for enviado (omisso), o relacionamento atual é mantido (nem atualiza, nem limpa).
* Todos os endpoints de listagem de módulos (GET /tasks, GET /maintenances, etc) suportam filtro opcional via query param `?project_id=X`.
