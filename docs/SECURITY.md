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
