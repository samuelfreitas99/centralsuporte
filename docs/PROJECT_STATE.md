# PROJECT_STATE

**Estado atual**: Fase 10 (Arquivos e Anexos) concluída com sucesso. Sistema pronto para a Fase 11 (Pesquisa Global e Relatórios).
**Fase atual**: Fase 10 concluída -> Preparação para Fase 11 (Pesquisa Global e Relatórios).
**Última implementação**: 
- **Fase 10 — Arquivos e Anexos (`AttachmentManager.tsx`, `attachmentService.ts`, backend `routers/attachments.py`)**:
  - **Armazenamento e Modelo Estruturado**: Entidade `attachments` com metadados estruturados (nome original, nome físico com UUID, tamanho em bytes, MIME type, hash SHA-256 e uploader).
  - **Segurança de Acesso**: Proteção contra path traversal e isolamento de arquivos em `/app/uploads` (sem exposição estática desprotegida). Download e visualização inline (preview) protegidos por autenticação JWT e checagem de permissões.
  - **Componente Reutilizável `AttachmentManager`**: Upload drag & drop com validação de tamanho (25MB), barra de status, listagem detalhada com badges de extensão e modal lightbox de pré-visualização para imagens e PDFs.
  - **Integração com Entidades Operacionais**: Integrado diretamente ao modal de apontamentos de Atendimentos (`AttendancePage`), linha do tempo de Equipamentos (`InfrastructurePage`) e manutenções técnicas (`MaintenancePage`).
- **Testes Automatizados**:
  - 71 testes de frontend (Vitest) 100% aprovados (13 arquivos de teste).
  - 32 testes de backend (Pytest) 100% aprovados.
  - Build de produção (`tsc -b && vite build`) validado sem erros.
**Último commit**: Pendente de commit desta rodada.
**Próxima tarefa**: Fase 11 — Pesquisa e Relatórios (motor global de Full-Text Search no PostgreSQL, filtros avançados por loja/equipamento/técnico e tela central de pesquisa).
**Bloqueios**: Nenhum.
**Pendências**: Iniciar Fase 11 conforme `ROADMAP.md` e `PRODUCT_SPEC.md`.
**Testes**: 71 testes de frontend (vitest) e 32 testes de backend (pytest) executados e aprovados com 100% de sucesso.
**Problemas conhecidos**: Nenhum.
**Decisões recentes**:
- Todo arquivo físico anexado é protegido por endpoint autenticado com validação de permissão (`attachment:read`), sem rotas estáticas públicas.
- Metadados incluem hash SHA-256 e nomes físicos sanitizados com UUID.

