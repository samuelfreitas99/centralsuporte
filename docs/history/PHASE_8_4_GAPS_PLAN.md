# FASE 8.4 — ANÁLISE DE LACUNAS FUNCIONAIS (INFRAESTRUTURA)

Este documento analisa as três lacunas funcionais identificadas na Fase 8 e estabelece o planejamento arquitetural e técnico para cada uma delas, servindo como base antes da implementação de qualquer código.

---

## 1. Locais Técnicos/Racks (Technical Locations)

**Situação atual**  
Atualmente, a infraestrutura física é representada geograficamente por Unidade (`Store`) e logicamente por Setor (`Department`). Os equipamentos (`Equipment`) possuem chaves estrangeiras diretas para `store_id` e `department_id`.

**Problema**  
Não há um conceito formal para modelar locais físicos delimitados dentro de um setor/loja, como Racks, CPDs, Almoxarifados TI ou Armários de Rede, que agreguem equipamentos sob um mesmo invólucro físico. Tentar utilizar o `Department` artificialmente para representar um Rack mistura o organograma organizacional (ex: Vendas, RH, TI) com o layout da planta física.

**Solução proposta**  
Introduzir uma nova entidade estrutural `TechnicalLocation` que represente estes espaços isolados, fazendo a ponte entre a unidade física e os hardwares ali contidos.

**Modelo de Dados**  
Criar nova tabela e entidade no SQLAlchemy:
```python
class TechnicalLocation(Base):
    __tablename__ = "technical_locations"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False) # Ex: Rack 01, CPD Principal
    location_type = Column(String(50)) # rack, cpd, armario_telecom, outro
    store_id = Column(Integer, ForeignKey('stores.id', ondelete="CASCADE"), nullable=False)
    department_id = Column(Integer, ForeignKey('departments.id', ondelete="SET NULL"), nullable=True)
    description = Column(String(255))
    notes = Column(Text)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
```
Atualizar `Equipment`:
- Adicionar coluna `technical_location_id = Column(Integer, ForeignKey('technical_locations.id', ondelete="SET NULL"), nullable=True)`.

**API**  
Criar a rota `/infrastructure/locations` contendo os métodos padrão de CRUD. Incluir no schema de saída do Equipamento os dados básicos de sua localização técnica.

**Frontend**  
A área visual de *Lojas & Departamentos* pode ser evoluída para uma visão estrutural em árvore ou com sub-tabelas para listar os `TechnicalLocations` daquela Unidade. Adicionar o campo "Local Técnico" nos selects de localização do form de `Equipment`.

**Migration**  
Criação da tabela `technical_locations` e adição do campo `technical_location_id` na tabela `equipment`. Seguro, aditivo, e compatível (dados antigos continuarão com NULL).

**Segurança**  
RBAC existente protegerá as rotas sob as roles designadas. Nenhuma preocupação sensível.

**Testes**  
- Backend: Pytest model associations e API CRUD tests.
- Frontend: Vitest validation no preenchimento do formulário de equipamentos.

**Impacto & Complexidade**  
- Impacto: Baixo. Extensão natural da infraestrutura sem refatoração destrutiva.
- Complexidade: Média (Demanda migração, schemas completos, CRUD de UI).

**Decisão de Escopo**  
- **O que pode ser implementado agora**: Migration, Backend Crud, e campo select no Equipamento. UI de lista em StoresTab.
- **O que deve ficar para uma fase futura**: Representação gráfica do Rack (DCIM) desenhando as posições em Us.

---

## 2. Edição de Estoque Operacional

**Situação atual**  
Temos a entidade `StockItem` e os schemas de Pydantic (`StockItemUpdate`). O endpoint `PUT /stock/items/{item_id}` já está mapeado, mas o `StockItemUpdate` permite a entrada do campo `current_quantity`. 

**Problema**  
O saldo do estoque é um dado derivativo e rastreável. Permitir sua edição direta em um PUT via API quebra o princípio de auditoria provido pelos `StockMovement` (Entrada/Saída/Ajuste). No frontend, a interface de usuário não possui botão ou formulário de edição para os metadados do item cadastrado (apenas para nova movimentação).

**Solução proposta**  
Blindar a edição direta da quantidade e prover a interface de alteração cadastral.

**Modelo de Dados**  
Nenhuma alteração de modelo necessária. O modelo atende perfeitamente aos requisitos de metadados de estoque.

**API**  
- Remover `current_quantity` do schema `StockItemUpdate` de forma explícita.
- Garantir no Service que o update afete exclusivamente metadados (nome, categoria, P/N, localização textual, limites).
- Caso um ajuste de saldo seja necessário (por contagem cíclica), o técnico deverá registrar um movimento específico com o evento do tipo "Ajuste de Inventário".

**Frontend**  
- Adicionar a ação primária "Editar Cadastro" à lista Master do Estoque ou dentro do detalhamento (Drawer).
- Reaproveitar o formulário de cadastro, injetando os valores padrão.

**Migration**  
Nenhuma.

**Segurança**  
Sem impactos novos.

**Testes**  
Testar no backend se requisições espúrias contendo `current_quantity` são ignoradas ou rejeitadas.

**Impacto & Complexidade**  
- Impacto: Muito baixo (apenas consistência de regras).
- Complexidade: Baixa. 

**Decisão de Escopo**  
- **O que pode ser implementado agora**: Todo o ajuste de schema e o formulário de edição.
- **O que deve ficar para uma fase futura**: Fluxos automáticos de aprovação de requisição de peças com integração a GLPI/OTRS.

---

## 3. Associação de Licenças (Vault Readiness)

**Situação atual**  
A entidade `License` suporta múltiplas alocações (`total_seats`) geridas na entidade `LicenseAssignment` 1:N. Uma atribuição liga a licença a um `equipment_id` e salva o utilizador na string `assigned_to`. A chave da licença (`license_key`) é encriptada e revelada por endpoint especial.

**Problema**  
Muitas licenças hoje são baseadas em contas de usuário (SaaS) ou são contas gerais corporativas vinculadas a uma credencial, ao invés de meros seriais. Não há um local estruturado na Licença para designar o e-mail administrativo ("conta associada") e não temos um "gancho" para um sistema de gestão de senhas (Password Vault), resultando no risco da equipe incluir senhas no campo de notas.

**Solução proposta**  
Modelar metadados na Licença para armazenar a conta sem tocar no armazenamento de credenciais sensíveis, preparando terreno arquitetural para o Password Vault futuro.

**Modelo de Dados**  
Atualizar a entidade `License`:
```python
    # Novo campo para conta master de administração da licença
    account_email = Column(String(255), nullable=True)
    # Referência opcional para o futuro cofre de senhas
    vault_credential_id = Column(Integer, nullable=True, index=True)
```
*Obs: `vault_credential_id` não terá Constraints de Foreign Key rígidas neste momento para não quebrar a arquitetura pela ausência do módulo Vault. Será uma chave lógica até a implementação plena do módulo.*

Para as atribuições de licença do tipo Seat (SaaS), o campo `LicenseAssignment.assigned_to` continuará sendo utilizado para registrar o email de destino alocado, mantendo o histórico flexível.

**API**  
Adicionar os campos aos Schemas e ao Service. Criar proteção para garantir que senhas não entrem inadvertidamente em notas. 

**Frontend**  
O formulário de Licenças passará a solicitar opcionalmente o "E-mail Associado/Conta Administradora". O frontend passará a exibir esse campo nos detalhes. Se existir o `vault_credential_id`, será exibido um placeholder "Credencial no Cofre (Em Breve)" ou ícone de cadeado.

**Migration**  
Migração aditiva, apenas adição de `account_email` (String) e `vault_credential_id` (Integer) na tabela `licenses`.

**Segurança**  
Evita a duplicidade de implementação de cofres seguros e instrui o desenvolvedor e o usuário a não salvar senhas nas notas.

**Testes**  
Testes de alteração nos payloads de licença verificando se as contas são armazenadas adequadamente.

**Impacto & Complexidade**  
- Impacto: Baixo.
- Complexidade: Baixa.

**Decisão de Escopo**  
- **O que pode ser implementado agora**: A migration, atualização de schemas, e o campo frontend de e-mail/conta. A lógica abstrata de referência ao vault via ID.
- **O que deve ficar para o Password Vault**: API real de acesso ao Vault, componentes Frontend para buscar, exibir e copiar a senha criptografada atrelada a este ID.
- **O que deve ficar para uma fase futura**: Sincronização automatizada LDAP/EntraID de licenças Microsoft.
