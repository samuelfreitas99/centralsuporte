# PLANEJAMENTO ARQUITETURAL — FASE 8: INFRAESTRUTURA

## 1. Objetivo da Fase 8
Evoluir a camada arquitetural e a interface do módulo de Infraestrutura (Lojas, Departamentos, Equipamentos, Licenças e Estoque Operacional). O objetivo é quebrar o monólito do Frontend em componentes modulares com "Progressive Disclosure" (utilizando Drawers) e resolver dívidas arquiteturais severas no Backend, notavelmente as infrações à diretriz de Soft Delete e à segurança de tráfego das chaves de licença de software.

## 2. Estado atual
- O Frontend possui a página `InfrastructurePage.tsx` extremamente densa, aglomerando quase 1800 linhas, múltiplas abas e controlando dezenas de Modais (`Dialog`).
- O Backend expõe as rotas em `routers/infrastructure.py`.
- No Banco de Dados, os modelos existem (`Store`, `Equipment`, `License`, `StockItem`), possuindo campos como `status`.
- Atualmente, a política de exclusão não respeita a decisão registrada de "Soft Delete". Rotas de DELETE executam a exclusão física (`db.delete()`).
- As licenças de software (`License`) traficam sua chave primária (`license_key`) de forma aberta nos endpoints de listagem, violando regras básicas de "Least Privilege" e segurança de credenciais do produto.

## 3. Inventário funcional
1. **Lojas & Departamentos:** Cadastro geográfico/organizacional.
2. **Equipamentos:** Registro de ativos de TI, vínculos de alocação e Histórico de vida (`EquipmentHistory`).
3. **Licenças:** Controle de licenças de software (perpetua, SaaS, etc.) e distribuição dos "assentos" (`LicenseAssignment`).
4. **Estoque Operacional:** Estoque técnico leve para periféricos e componentes, focado na movimentação de rotina (`StockItem` e `StockMovement`).

## 4. Inventário técnico
- **Arquivos Core Analisados:**
  - `frontend/src/pages/InfrastructurePage.tsx`
  - `frontend/src/services/infrastructureService.ts`
  - `backend/app/models.py` (linhas 349-500)
  - `backend/app/schemas.py`
  - `backend/app/routers/infrastructure.py`
  - `backend/tests/test_infrastructure_endpoints.py`

## 5. Modelo de domínio atual
A modelagem relacional prevê:
- `Store` (1:N) `Department`.
- `Store` e `Department` (1:N) `Equipment`.
- `Equipment` (1:N) `EquipmentHistory` e `MaintenanceRecord`.
- `License` (1:N) `LicenseAssignment` (que pode se atrelar a um equipamento ou a um usuário externo).
- `StockItem` (1:N) `StockMovement`.

## 6. Problemas encontrados
- **Inconsistência de Soft Delete:** Apesar do `DECISIONS.md` prever soft delete/archive, a API aplica exclusões físicas diretas nas entidades `Store`, `Department`, `Equipment` e `License`. Isso causa risco grave de quebra de integridade em históricos passados (auditoria e manutenções atreladas desaparecem ou sofrem anulação via `SET NULL`).
- **Exposição de Dados Sensíveis:** A propriedade `license_key` é injetada em listas gerais e no estado do React de todos os usuários autenticados sem qualquer máscara de acesso ("Redaction").
- **UI Caótica e Acoplada:** O carregamento assíncrono inicial no Frontend (`Promise.all`) tenta preencher toda a carga de lojas, departamentos, equipamentos, licenças e estoque na montagem principal da página.
- **Ux Defasada:** Os formulários operam em Modais sobrepostos que contrastam fortemente com a nova estética de `Drawer` validada nas Fases 6 e 7.

## 7. Riscos
- Mudar para "Soft Delete" pode quebrar os Endpoints de Listagem se não formos rigorosos em aplicar `.filter(status != descartado)` onde for pertinente.
- Mascarar a `license_key` nas rotas pode dificultar a interface de edição (PUT). O backend terá que ignorar `license_key` no PUT se o valor postado for `********`.
- Desmembrar um componente de 1800 linhas e seus N estados aninhados exige extremo controle na injeção de dependências ou particionamento coerente do contexto para evitar regressões visuais.

## 8. Decisões arquiteturais necessárias
- **[DECISÃO TOMADA] - Reforço do Soft Delete:** `DELETE /equipment/{id}` passará a alterar o status para `descartado`. `DELETE /stores/{id}` alterará o status para `inativa`.
- **[DECISÃO TOMADA] - Mascaramento de Tráfego:** Endpoint de GET Listagem blindará as licenças com a string `[REDACTED]` no lugar da chave original.
- **[DECISÃO PENDENTE] - Estratégia de Criptografia em Banco:** A criptografia profunda (AES-GCM) das licenças já deve ser implementada no banco nesta etapa ou aguardaremos o amadurecimento completo do Cofre na Fase 12 (Vault)? *Sugestão:* Aguardar a Fase 12. Focar agora apenas no mascaramento do trânsito na API.

## 9. Escopo da Fase 8
1. **Backend API:** Remover `db.delete()` nos endpoints de `Store`, `Equipment` e `License` e aplicar `Soft Delete` no atributo de status correspondente.
2. **Backend Security:** Remover `license_key` visível dos schemas de GET, introduzindo um novo endpoint `POST /licenses/{id}/reveal` de acesso atômico e auditável.
3. **Frontend Architecture:** Decompor `InfrastructurePage.tsx` em submódulos (`EquipmentTab`, `LicensesTab`, `StockTab`, `StoresTab`).
4. **Frontend UI:** Migrar todos os popups (Modais de criação/edição) para o componente de `Drawer` da lateral direita.
5. **Frontend Perf:** Refatorar o fetch global. Carregar apenas a aba ativa (`Lazy Fetch`), ganhando velocidade perceptível no dashboard.
6. **Testes:** Adequação dos testes da API para garantir as respostas `[REDACTED]` e validações dos soft deletes.

## 10. Fora do escopo
- ERP de compras complexas (Cotações, Ordens de Serviço Externas).
- Autenticação e descoberta automática em rede (SNMP, WMI, Zabbix).
- Vault Password Encryption Complex (Fica reservado para a Fase 12).
- Integração de relatórios exportáveis com o OTRS.

## 11. Estratégia de UX/UI
O design continuará focado no "Modern Operations Center":
- Menos ruído visual, maior hierarquia nos Cards ou Tabelas.
- A navegação entre Equipamentos, Lojas e Estoque fará uso dos componentes `Tabs` e `TabsList` refinados.
- Não usar `glassmorphism` extremo; aplicar tabelas clássicas mas esteticamente agradáveis para leitura técnica pesada.

## 12. Estratégia para Equipamentos
- Tabela rica (`DataTable` ou lista de alto contraste). 
- Indicadores visuais do status (`ativo` em verde sutil, `reserva` em azul, `manutenção` em âmbar).
- Ação "Visualizar" abre um Drawer que agrupa o hardware, a tabela de Histórico de Intervenções e os Documentos no mesmo "Painel de Vida Útil" do ativo.

## 13. Estratégia para Lojas/Departamentos
- Cards de visualização rápida resumindo: "Loja Central - 15 Equipamentos", com ícones correspondentes.
- Ação de soft delete terá um alerta duplo, avisando que os equipamentos da loja passarão a ser listados em um filtro de legado inativo.

## 14. Estratégia para Licenças
- Barra de Progresso ("Progress Bar") para assentos: "Usos: 8 / 10". Ficando vermelha (alerta) quando chegar a 100%.
- Chave Mascarada: Na listagem aparece `••••-••••-••••`.
- Botão "Revelar Chave" faz request específico, exibe no Frontend de forma momentânea.

## 15. Estratégia para Estoque
- Manter focado em materiais de desgaste diário: teclado, mouse, SSD, cabos de rede.
- Destacar via Badge de Atenção (Warning) quando "Quantidade Atual < Quantidade Mínima".
- Ação de "Nova Movimentação" simplificada (Apenas Entrada ou Saída com um Motivo).

## 16. Relacionamentos entre entidades
Nenhuma alteração drástica necessária no modelo atual, pois ele já suporta adequadamente: Lojas <- Equipamentos -> Históricos. A coesão do modelo está correta, bastando refinar o acesso da API.

## 17. Impactos em API
- Atualização em `routers/infrastructure.py` (Múltiplos `DELETE` refatorados para simularem Update de Status).
- Criação de `POST /infrastructure/licenses/{license_id}/reveal`.
- Adição de lógica em `/equipment` e `/stores` para omitir os descartados por padrão (a não ser que tenha filtro explícito).

## 18. Impactos em banco/migrations
Não há necessidade de uma nova Migration estrutural caso decidamos não introduzir colunas novas de `archived_at`. O reuso das colunas `status="inativa"` e `status="descartado"` é perfeitamente legal e suportado pelas colunas atuais no SQL. 

## 19. Impactos em frontend
- Criação de `frontend/src/pages/infrastructure/` agrupando os componentes filhos da nova topologia.
- Refatoração dos fluxos de submit das promessas de edição e fetch.
- Deleção drástica das +1700 linhas da view monolítica original `InfrastructurePage.tsx`.

## 20. Estratégia de testes
- Ajustar os mocks e expectativas de retorno JSON (`license_key` será negada nos asserts de listagem).
- Inserir testes específicos confirmando que um Equipment deletado via API ainda pode ser acessado caso seu ID seja consultado diretamente ou filtrado com status="descartado".

## 21. Critérios de aceitação
- O Frontend não carrega todos os domínios da infra no momento de inicialização.
- O Backend nunca executa a query pura de DROP/DELETE row no banco para Ativos operacionais Críticos.
- O Frontend funciona 100% livre de Modal Dialog, apenas com Side Drawers.
- Chaves de licença não podem ser extraídas do Payload JSON global, precisando de permissão e rota dedicada de `reveal`.

## 22. Ordem segura de implementação
1. **[Backend]** Bloquear e corrigir os Endpoints de Deleção introduzindo as lógicas transacionais de Soft-Delete.
2. **[Backend]** Reescrever os Schemas Pydantic de Licença, criar a rota `/reveal` e atualizar `infrastructure.py`. Atualizar Testes.
3. **[Frontend]** Modificar `infrastructureService.ts` com suporte as novas assinaturas de soft-delete e de licença.
4. **[Frontend]** Quebrar `InfrastructurePage.tsx` criando os subcomponentes organizacionais (`Stores`, `Equipment`, etc).
5. **[Frontend]** Substituir sistematicamente todos os formulários e Modais de alerta pelos Drawer panels responsivos.
6. **[Integração]** Homologar e Testar os Drawers sem vazamento de memory leaks/renders desnecessários.

## 23. Pontos que exigem decisão humana antes de implementar
- `[DECISÃO PENDENTE]` A Criptografia da chave de licença já deve ser aplicada no Banco em AES nesta fase (pré-Vault) ou só o Mascaramento na API basta por enquanto e a criptografia robusta entra na Fase 12 com o Cofre?
*Recomendação do agente: Deixar a criptografia pesada para Fase 12, focando agora apenas no mascaramento do tráfego (API).*

## 24. Backlog posterior
- Criptografia profunda (AES GCM) das chaves de licenças no banco de dados.
- Integração da Licença com Credenciais Departamentais (Fase 12).
- Dashboard analítico dos equipamentos críticos (Fase Pós-MVP).
