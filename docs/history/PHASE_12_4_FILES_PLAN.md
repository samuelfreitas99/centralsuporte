# Phase 12.4 — Files / Documents Center

## 1. Objetivo
O objetivo da Central de Arquivos (`/files`) é consolidar a visualização e busca de todos os documentos, anexos, manuais e comprovantes espalhados pelo sistema (Atendimentos, Manutenções, Projetos, etc.) em uma única interface eficiente e moderna. O usuário deve conseguir encontrar rapidamente os arquivos aos quais ele possui autorização de acesso, sem precisar navegar até a entidade de origem.

## 2. Estado Atual
- O frontend possui o `AttachmentManager` utilizado de forma isolada dentro das gavetas (Drawers) e páginas de detalhes das entidades.
- O backend possui o endpoint `GET /attachments` que lista os arquivos, mas atualmente suporta apenas filtros exatos por `entity_type` e `entity_id`. 
- O backend processa a autorização contextual (via `FileAccessService`) carregando os registros em memória e iterando sobre os anexos. Se chamado sem os filtros exatos de entidade, esse método itera por todos os arquivos não-deletados no banco, o que causa um severo risco de gargalo (N+1 queries) em uma listagem global.
- O frontend envia requisições e faz parsing de tamanhos/ícones através da interface local `AttachmentItem`.

## 3. Arquitetura Existente
- **Autoridade Final**: Backend `FileAccessService`. Nenhum arquivo é exposto sem verificar o acesso à entidade-mãe.
- **Frontend Storage**: A API retorna referências; o download ou preview é tratado em tempo real, exigindo o header de autenticação.
- **Isolamento de Entidades**: Tarefas, Projetos, Manutenções, Conhecimento, Equipamentos e Atendimentos já estão englobados e cobertos pelas regras de leitura e gravação.

## 4. UX Proposta
O Produto será posicionado como uma "Central de Conhecimento Físico" do Suporte.
A interface deve seguir a direção **Modern Operations Center**, evitando a aparência de "tabela de banco de dados genérica".
- Cabeçalho descritivo com totais (ex: "X arquivos carregados na última semana").
- Controle rápido para alternar a visualização entre **Grade de Cartões (Grid)** (para pré-visualizações de imagens) e **Lista Densa (List)** (para alta densidade de documentos em modo auditoria).

## 5. Layout
1. **Header Central**: Título "Central de Arquivos", descrição curta e campo de busca proeminente (estilo "Spotlight Search").
2. **Barra de Filtros Pílula**: Filtros rápidos para "Imagens", "PDFs", "Meus Uploads", "Últimos 7 dias".
3. **Área de Resultados**: 
   - Exibição de arquivos.
   - Cada arquivo deve exibir explicitamente a sua "Entidade Pai" de forma clicável (quando existir rota). Ex: `Projeto: Migração de Servidor`.
4. **Sidebar/Meta-Informações**: Um painel lateral, similar à pesquisa de OTRS/Knowledge, caso o usuário clique nos detalhes técnicos de um arquivo (tamanho exato, hash SHA256, data de upload, técnico uploader).

## 6. Busca
A barra principal deve pesquisar em tempo real:
- Nome do arquivo (`original_filename`)
- Descrição (`description`)
A busca depende de uma extensão do endpoint de listagem.

## 7. Filtros
Devem ser implementados controles laterais ou dropdowns (como na tela de Audit Logs):
- **Tipo de Extensão/MIME**: Imagem, Documento, PDF, Planilha.
- **Origem (Entity Type)**: Projeto, Tarefa, Equipamento, etc.
- **Uploader**: Buscar por técnico/usuário.
- **Período**: Filtro de data.

## 8. Ordenação
- Padrão: Mais recentes primeiro.
- Opções: Mais antigos, Ordem Alfabética, Tamanho do Arquivo (Maior -> Menor).

## 9. Preview
- Ao clicar no arquivo, imagens e PDFs devem ser abertos em um Modal/Dialog sobreposto utilizando as URLs temporárias (`blob:`) geradas pelo `attachmentService.fetchPreviewBlobUrl`.
- Para outros tipos, o clique resulta apenas em download.

## 10. Download
Ação primária ou secundária na lista/grid. Aciona o `attachmentService.downloadAttachment` sem expor a URL real do servidor.

## 11. Delete
- Disponível condicionalmente através de `useAuth().hasPermission('attachment:delete')`.
- Segue a regra atual do `AttachmentManager`: Soft Delete.
- A exclusão na Central atualizará o estado local e removerá o item da grade/lista, exibindo um Toast de sucesso.

## 12. Upload
**Fora de Escopo nesta fase**.
A Central de Arquivos servirá como um visualizador (Read-Only com capacidade de deleção se autorizado). Para anexar um arquivo, o usuário deve continuar acessando a entidade específica, garantindo o preenchimento semântico de `entity_type` e `entity_id`. Um botão genérico "Upload" solto na Central exigiria uma UI complexa de seleção de origem que foge ao escopo atual.

## 13. Autorização
O backend continua responsável por garantir que as linhas retornadas para o frontend já estejam limpas e autorizadas. O frontend apenas exibe. Não implementaremos re-checagem de permissões `entity:read` no frontend para os arquivos mostrados.

## 14. API Necessária
*O frontend ficará estagnado se o backend não for adaptado.*
O endpoint `GET /attachments` necessita de uma **Mudança Estrutural (Classe C)**:
1. **Adição de Query Params**: `skip`, `limit`, `search`, `mime_category`, `uploader_id`.
2. **Refatoração de Performance (Paginação / N+1)**: A filtragem contextual atual em memória (loop Python usando `FileAccessService.can_read`) é perigosa para grandes volumes globais. O backend precisará delegar as regras contextuais para condições SQLAlchemy (`join` ou subqueries) para permitir `limit/offset` seguro e eficiente a nível de banco de dados.

## 15. Estados da Interface
- **Loading**: Skeleton loaders imitando a Grade e a Lista de arquivos.
- **Vazio Global**: Ilustração sutil "Ainda não existem documentos no seu sistema".
- **Vazio em Busca**: "Nenhum arquivo encontrado para esta combinação de filtros".
- **Erro**: Tela de fallback caso a requisição falhe (com botão "Tentar Novamente").

## 16. Responsividade
Em dispositivos menores:
- A visualização em Grade será de 1 ou 2 colunas.
- A visualização em Lista ocultará colunas complexas (Tamanho, Data exata) deixando apenas Ícone, Nome, e Origem.

## 17. Acessibilidade
- Uso de `aria-label` nas ações de download/preview/delete.
- Foco de teclado nos cartões e linhas com `tabIndex={0}`.

## 18. Testes
Será coberto por:
- Testes Vitest na nova `FilesPage.test.tsx`.
- Mock extensivo do `attachmentService.getAttachments` suportando paginação local.
- Validação do comportamento UI de busca, filtro, deleção e renderização das origens.

## 19. Dependências
1. Refatoração e extensão de `GET /attachments` no Backend. Sem isso, a página será inviável do ponto de vista de performance e funcionalidade de busca/filtro.

## 20. Fora de Escopo
- Upload Genérico (sem vínculo a entidade).
- Geração de links públicos de compartilhamento (Share Links).
- Edição do conteúdo de arquivos dentro do sistema (ex: editor de texto embutido).
- Viewers customizados para tipos não nativos do browser (DOCX, XLSX).

## 21. Roadmap de Implementação
**Fase 12.5**: Backend — Extensão e otimização do `GET /attachments` e `FileAccessService` para queries em massa e paginação.
**Fase 12.6**: Frontend — Componentização de itens da lista/grade (`AttachmentCard`, `AttachmentListItem`).
**Fase 12.7**: Frontend — Construção da `FilesPage` com gerenciamento de estado da busca, filtros e consumo da nova API paginada.

---
**PLANNING COMPLETE — READY FOR IMPLEMENTATION**
