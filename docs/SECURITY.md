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
* **Proteção Antecipada de Download e Preview**: O acesso a arquivos físicos via download (`/download`) ou visualização inline (`/preview`) é precedido obrigatoriamente pela autorização contextual via `FileAccessService`. Sob nenhuma hipótese o `StorageAdapter` ou o sistema de arquivos são consultados antes da validação da regra de domínio da entidade pai. Requisições não autorizadas são abortadas com HTTP 403 sem interagir com a camada de storage.
* **Prevenção de Vazamento e Enumeração em Listagens**: A listagem (`GET /attachments`) impede enumeração de arquivos protegidos omitindo anexos pertencentes a entidades restritas. Filtros explícitos de entidade (`entity_type` + `entity_id`) exigem autorização antecipada, retornando 403 se o usuário não possuir acesso à entidade. Anexos soft-deletados nunca são retornados em consultas normais (404 para requisições diretas).
* **MIME AllowList e Validação de Extensões (Tarefa 5.1)**: Política estrita de formatos aceitos categorizada em:
  - Documentos: `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.ppt`, `.pptx`, `.txt`, `.csv`.
  - Imagens: `.png`, `.jpg`, `.jpeg`, `.webp`.
  - Arquivos Técnicos/Texto: `.json`, `.xml`, `.log`, `.yaml`, `.yml`, `.zip`.
* **Blocklist Estrita de Formatos Perigosos**: Rejeição imediata (HTTP 400) de executáveis e scripts perigosos (`.exe`, `.dll`, `.msi`, `.bat`, `.cmd`, `.com`, `.scr`, `.ps1`, `.psm1`, `.vbs`, `.vbe`, `.js`, `.jse`, `.jar`, `.sh`, `.bash`, `.apk`, `.deb`, `.rpm`, `.bin`), extensões desconhecidas e arquivos sem extensão.
* **Desconfiança de Content-Type e Validação Cruzada**: O cabeçalho `Content-Type` enviado pelo cliente nunca é considerado isoladamente. Se o MIME declarado for inconsistente com a extensão (ex: `.pdf` enviado como `image/png`), o upload é abortado com HTTP 400. Formatos legítimos enviados com MIME genérico (`application/octet-stream`) são aceitos e normalizados para o MIME canônico seguro da extensão.
* **Inspeção de Conteúdo e Magic Bytes**: Validação de assinaturas binárias contra executáveis (rejeição universal de cabeçalhos `MZ`, `\x7fELF`, etc.) e verificação de cabeçalhos de imagem e PDF válidos (`%PDF`, `\x89PNG`, `\xff\xd8\xff`, `RIFF`).
* **Limite Centralizado de Tamanho**: Configurado por variável de ambiente (`MAX_ATTACHMENT_SIZE_MB`, padrão: 25 MB; ou `MAX_ATTACHMENT_SIZE_BYTES`). A verificação é realizada durante o streaming sem sobrecarga de memória, disparando HTTP 413 Payload Too Large com cleanup físico imediato caso o limite seja excedido.
* **Sanitização de Nome de Arquivo**: Caracteres de path traversal (`../`, `..\`) em `original_filename` são removidos via extração estrita de nome base antes da persistência, e o arquivo físico em disco é nomeado com UUID único sanitizado.
* **Default-Deny e Bloqueio de Tipos Não Suportados**: Se um `entity_type` não estiver registrado no `AttachmentAccessRegistry`, o acesso é sumariamente rejeitado (400 Bad Request). Entidades inexistentes retornam 404. Usuários inativos recebem 403.
* **Isolamento de Armazenamento**: O caminho físico do arquivo no storage jamais é exposto na API ou no modelo de banco de dados. Os nomes físicos utilizam UUIDs criptograficamente seguros combinados com extensões sanitizadas. Path traversal é prevenido por resolução canônica (`realpath`) e contenção obrigatória no diretório base.

