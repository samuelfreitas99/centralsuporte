# FASE 8.2 — PLANEJAMENTO DE REFATORAÇÃO DO FRONTEND
*(InfrastructurePage)*

## 1. Estrutura Atual
O arquivo `frontend/src/pages/InfrastructurePage.tsx` é um componente monolítico com quase 1800 linhas. Ele concentra o roteamento visual de 4 abas, carrega todo o estado de 5 domínios via `Promise.all` e hospeda os formulários, modais (`Dialog`), handlers de requisições de mutação, e lógicas complexas de busca em memória. 
A página está difícil de dar manutenção, mas está funcional e estabilizada de acordo com as regras de negócios vigentes.

## 2. Dependências
- **APIs:** Todo o tráfego depende do `infrastructureService.ts`.
- **Componentes Base:** Tabs implícitas (state string), Cards, Badges e `Dialog` (ui/dialog).
- **Dados Cruzados:** Equipamentos dependem de Lojas e Departamentos para popular seus `selects`.

## 3. Componentes Propostos
A divisão confirmada (e recomendada pela auditoria arquitetural) segue a fronteira de domínios das abas:

- `frontend/src/pages/infrastructure/InfrastructurePage.tsx` (Container Root)
- `frontend/src/pages/infrastructure/tabs/EquipmentTab.tsx`
- `frontend/src/pages/infrastructure/tabs/StoresTab.tsx`
- `frontend/src/pages/infrastructure/tabs/LicensesTab.tsx`
- `frontend/src/pages/infrastructure/tabs/StockTab.tsx`

*(Justificativa: Esta decomposição em 4 abas reflete com exatidão a separação visual atual, permitindo isolamento do código sem ferir dependências ou alterar o comportamento para o usuário).*

## 4. Responsabilidade de Cada Módulo
- **Container (`InfrastructurePage.tsx`):** Controlar o cabeçalho, a barra de pesquisa global (opcionalmente) e efetuar a busca massiva na API (preservando o comportamento non-lazy atual).
- **Tabs (`*Tab.tsx`):** Renderizar a lista filtrada do seu domínio correspondente, exibir os Modais pertinentes e invocar os métodos de CRUD (Salvar/Excluir/Editar).

## 5. Estado que Permanece no Container
Para **evitar** a introdução de Lazy Fetching nesta fase e manter a regra comportamental intacta, o Container deverá reter:
- `activeTab`
- `isLoading` e `errorMessage`
- O `useEffect` com `loadData()` que baixa as 5 promises juntas.
- Os estados de dados reais: `stores`, `departments`, `equipmentList`, `licenses`, `stockItems`.

## 6. Estado que Deve Ser Movido para as Tabs
Todo o peso de interface deve ser empurrado para dentro dos seus respectivos arquivos de aba:
- **EquipmentTab:** `eqForm`, `isEquipmentModalOpen`, `viewingHistoryEquipment`, `searchQuery` (local da aba), `selectedTypeFilter`, etc.
- **StoresTab:** `storeForm`, `isStoreModalOpen`, `deptForm`, `isDeptModalOpen`.
- **LicensesTab:** `licForm`, `isLicenseModalOpen`, `isAssignSeatModalOpen`, `assigneeName`.
- **StockTab:** `stockForm`, `isStockModalOpen`, `movementForm`, `isMovementModalOpen`.

*Lógica:* Modais não precisam ficar flutuando no Virtual DOM do Container Root. Eles pertencem estritamente à experiência daquela aba.

## 7. Serviços Utilizados
- `infrastructureService`: Continuará sendo importado localmente pelas `Tabs` para efetuar requisições pontuais de PUT/POST/DELETE. Após o sucesso da chamada `service.createX`, a aba chamará o Dispatch/SetState passado pelo pai para atualizar a visualização em memória instantaneamente.

## 8. Tipos Compartilhados
- Uso integral do `types/infrastructure.ts`.
- Serão criadas interfaces restritas para as props de cada aba. 
  Exemplo:
  ```ts
  interface EquipmentTabProps {
    equipmentList: EquipmentItem[];
    setEquipmentList: React.Dispatch<React.SetStateAction<EquipmentItem[]>>;
    stores: StoreItem[];
    departments: DepartmentItem[];
    isLoading: boolean;
  }
  ```

## 9. Riscos Mapeados
1. **Quebra de Prop Drilling:** Como o React destrói e recria componentes ao trocar a condicional `{activeTab === 'x' && <XTab />}`, estados de formulários digitados (e não salvos) serão perdidos ao trocar de aba. (Isso já ocorre atualmente, então é um risco mitigado pela continuidade comportamental).
2. **Duplicação de Toasts/Erros:** Handlers assíncronos extraídos precisarão instanciar seu próprio `useToast()` dentro de cada Aba.

## 10. Estratégia para Evitar Regressões
- Não alterar nomes de propriedades Pydantic/Tipos TS.
- Não introduzir o novo padrão de `Drawer` agora. Os `Dialog` legados serão extraídos exatamente como estão ("Lift and Shift").
- Preservar os botões, badges e colunas idênticos (Cópia fiel do JSX).

## 11. Estratégia de Testes
- A refatoração é neutra (apenas movimento de código React). 
- O arquivo `CommandsPage.test.tsx` (se existir equivalente na Infraestrutura) deve ser executado antes e depois para garantir que o Container ainda monta com sucesso.
- Foco em rodar `npm run typecheck` severamente para garantir que as novas interfaces de Props estejam injetando as coleções sem erros TS de assinatura nula.

## 12. Ordem de Extração Recomendada
Trabalhar de fora para dentro (do mais independente ao mais dependente):
1. Extrair e validar **StockTab** (Nenhuma dependência além de si mesmo).
2. Extrair e validar **LicensesTab** (Depende de si mesmo).
3. Extrair e validar **StoresTab** (Contém as lógicas acopladas de Store e Department).
4. Extrair e validar **EquipmentTab** (É o core, exige repasse das variáveis `stores` e `departments` por Props para renderizar o Select de Localização).
5. Limpar o **InfrastructurePage** transformando-o puramente em um Orchestrator de Layout e provedor de Dados.

## 13. Critérios de Aceitação
- O arquivo `frontend/src/pages/InfrastructurePage.tsx` sofre redução de tamanho superior a 70% (de ~1800 para cerca de 250 linhas).
- Ao final, as quatro abas operam com idêntico desempenho visual.
- Adições e Deleções em tela refletem os dados imediatamente sem precisar atualizar a página (via Props state update).
- A aplicação compila no `oxlint` e no `tsc` perfeitamente, garantindo nenhuma prop vazando para o abismo.
