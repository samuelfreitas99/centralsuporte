# SECURITY POLICIES — Central de Suporte

Este documento estabelece as diretrizes de segurança aplicadas ao desenvolvimento da Central de Suporte.

## 1. Cofre de Senhas e Licenças
* **Isolamento de Credenciais**: A entidade `License` não atua como cofre. Ela armazena unicamente a `license_key` (ofuscada em interface) e metadados auxiliares de ativação como o e-mail (`account_email`).
* **Vault Preparation**: Todas as senhas requeridas para acessar portais de ativação, roteadores e serviços serão abrigadas num futuro domínio de Vault (Cofre), sob criptografia baseada em envelope (AES-GCM). Nenhuma chave estrangeira falsa ou coluna de senha em texto plano deve ser instanciada como atalho prévio.

## 2. Auditoria de Segredos
* Ações de exposição de senhas ou chaves (`/reveal`) exigem registro rigoroso via `AuditLog`, indicando data, usuário e registro.
* Segredos nunca trafegam nos payloads de listagem GET.

## 3. Logs de Sistema
* Os logs do backend e stdout nunca devem conter representações em texto plano de campos sensíveis, como senhas e `license_key`.

## 4. Segurança e Autorização de Arquivos e Anexos (Fase 12)
* **Autorização em Dois Níveis**: Permissões globais RBAC (`attachment:read`, `attachment:upload`, `attachment:delete`) nunca concedem acesso irrestrito por si sós. Cada requisição é obrigatoriamente submetida ao validador contextual da entidade no `FileAccessService`.
* **Validação Pré-Upload (Early Rejection)**: A verificação de permissão e regras de domínio contextuais (ex: projetos cancelados, tarefas privadas) ocorre antes de salvar o arquivo no storage, prevenindo ataques de esgotamento de disco (denial of storage) ou uploads órfãos.
* **Resiliência a Falhas de Persistência (Cleanup)**: Em caso de falha transacional entre a gravação no storage e o commit no PostgreSQL, o sistema executa rollback no banco e invoca cleanup do arquivo físico recém-gravado para evitar lixo não rastreado no filesystem.
* **Isolamento de Soft Delete**: A deleção não remove arquivos físicos no fluxo HTTP da API, prevenindo inconsistências de transação distribuída (banco vs filesystem) e garantindo auditabilidade.
* **Default-Deny e Bloqueio de Tipos Não Suportados**: Se um `entity_type` não estiver registrado no `AttachmentAccessRegistry`, o acesso é sumariamente rejeitado (400 Bad Request). Entidades inexistentes retornam 404. Usuários inativos recebem 403.
* **Isolamento de Armazenamento**: O caminho físico do arquivo no storage jamais é exposto na API ou no modelo de banco de dados. Os nomes físicos utilizam UUIDs criptograficamente seguros combinados com extensões sanitizadas. Path traversal é prevenido por resolução canônica (`realpath`) e contenção obrigatória no diretório base.

