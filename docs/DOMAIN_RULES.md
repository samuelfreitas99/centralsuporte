# DOMAIN RULES — Central de Suporte

Este documento estabelece as **Regras de Negócio Fundamentais** que governam as entidades e processos do produto na arquitetura Pós-MVP.

## 1. Princípios de Preservação de Histórico (Soft Delete vs Hard Delete)

* **Entidades Históricas Não Devem Sumir:** Ativos cruciais operacionais devem sofrer **Soft Delete** (Inativação ou Arquivamento), e não Hard Delete (`DELETE FROM`). 
* **Aplicam-se a Soft Delete / Arquivamento:** 
  - `Equipment` (Status = "descartado" / "inativo")
  - `License` (Status = "cancelada")
  - `Store` / `Department` (Status = "inativa")
  - `User` (is_active = False)
* **Permitem Hard Delete:** 
  - `Tasks`, `Reminders`, `CalendarEvents` (Se o criador optar por excluir, não há impacto em infraestrutura crítica).

## 2. Regras de Histórico e Auditoria Técnica
* A **Auditoria de Sistema** (`AuditLog`) é imutável e destina-se a fins de segurança e compliance (Quem logou, quem alterou permissões, quem deletou).
* O **Histórico Operacional** (`EquipmentHistory`) destina-se ao ciclo de vida do ativo. Manutenções geram histórico; mudanças de IP geram histórico. São entidades visualizadas rotineiramente pelos técnicos.
* **Regra de Separação:** A tela do Equipamento deve mostrar o *Histórico Técnico*, nunca despejar *Audit Logs genéricos* para o técnico.

## 3. Modelo Conceitual do Cofre de Senhas (Secrets)
* As chaves (secrets) armazenadas devem utilizar algoritmos de criptografia reversível autenticada (Ex: AES-256-GCM).
* A master-key NUNCA deve residir no banco de dados. 
* Sempre que um usuário solicitar a descriptografia para "Visualizar" ou "Copiar" uma senha, o evento deve ser compulsoriamente gravado no `AuditLog` com a flag de `PASSWORD_REVEAL`.

## 4. Regras do Estoque Operacional e Cotações
* O Estoque (`StockItem`) não movimenta dinheiro em espécie nem gera contabilidade no backend. Seu objetivo é garantir suprimento logístico.
* Cotações devem representar o estágio de aprovação: "Estou sem mouse, fiz 3 orçamentos, gestor aprova o do Fornecedor B". Concluída a cotação, a entrada no `StockItem` é realizada.

## 5. Regras de Licenças e Credenciais
* **Associação Administrativa (account_email)**: O campo `account_email` da Licença reflete unicamente qual e-mail foi usado no registro do software (ex: conta do portal do fornecedor) e não deve armazenar senhas.
* **Integração com Vault (Futura):** Se uma licença necessita de um usuário e senha para ativação no portal da fabricante, esses dados entram no *Cofre*. O registro da *Licença* deverá ter um relacionamento referencial à credencial do cofre (a ser implementado quando o Vault existir), e não duplicar o input de senha em seu próprio formulário nem em notas.

## 6. Estratégia de Editor de Texto
A Central usará a seguinte regra para interfaces de texto longo:
* **Textarea Comum:** Para descrições rápidas, notas curtas, resumos, sintomas (ex: Formulários de Atendimento e Tarefas comuns).
* **Rich Text (HTML seguro via TipTap/Draft):** Exclusivo para Base de Conhecimento e possivelmente nos laudos ricos de Atendimentos. Permite upload e visualização inline de imagens.
* **Markdown Simples/Bloco de Código:** Para exibição restrita a Comandos (`CommandService`) e scripts automatizados.

## 7. Projetos Operacionais (Fase 10)
* **Agregadores Opcionais:** Projetos são "contextualizadores" para trabalhos maiores (ex: Abertura de Loja, Implantação). Eles agrupam itens operacionais (Tasks, Maintenances, Checklists, etc.).
* **Preservação de Dados (No Cascade Delete):** O Projeto **não é dono** dos registros operacionais e simélides. Excluir um Projeto *nunca* deve excluir as tarefas, checklists, movimentações de estoque, manutenções, e atendimentos associados (garantido por `ON DELETE SET NULL`).
* **Desvinculação Flexível:** Deve ser possível vincular ou desvincular um registro de um Projeto a qualquer momento sem impactar seu ciclo de vida principal.

## 8. Central de Arquivos / Attachments
* **Arquivos Gerais (NULL / NULL):** Arquivos podem existir de forma independente (sem vínculo a projetos, tarefas, etc.). Nestes casos, o `entity_type` e o `entity_id` são persistidos como `NULL`.
* **Autorização de Arquivos Gerais:** A leitura e manipulação de arquivos gerais não exige permissão contextual (pois não há contexto), sendo restrita exclusivamente pelas permissões RBAC globais (`attachment:read`, `attachment:upload`, `attachment:delete`).
* **Seleção Dinâmica (EntitySearch):** A vinculação manual de arquivos a entidades durante o upload global ocorre através da interface dinâmica `EntitySearch`, que substitui IDs soltos por pesquisas textuais (autocomplete) contextualizadas por domínio (Projetos, Tarefas, Equipamentos).
* **Ausência de N+1 (Paginação Contextual):** A autorização baseada em contexto (ex: um arquivo numa tarefa privada) é resolvida no banco de dados, utilizando projeção otimizada (`SQLAlchemy or_` com `Subqueries`) para garantir paginação fluida e prevenir consumo excessivo de memória, eliminando a dependência de loops em Python (`N+1`).
