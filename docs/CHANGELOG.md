# CHANGELOG

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

## [Unreleased]
### Added
- **Fase 12.4**: Central de Arquivos. Workspace centralizado (`/files`) para acesso consolidado e busca de arquivos, com paginação via API e views otimizadas (lista e grade).
- **Fase 8.4C**: Preparação para integração com Password Vault. Adicionado `account_email` à entidade `License` para rastrear contas administrativas de software sem comprometer segurança. Modificação no frontend `LicensesTab` para permitir edição de metadados da licença sem alterar a chave por acidente.
- **Fase 8.4B**: Edição de Estoque Operacional. Permitida edição dos metadados de `StockItem`, mas com bloqueio estrito à alteração do campo `current_quantity`, protegendo a integridade do inventário logístico.
- **Fase 8.4A**: Locais Técnicos (Technical Locations). Adicionada hierarquia para representar racks, armários e CPDs, com gestão visual associada a lojas e equipamentos.
- **Fase 8.3**: Redesign Visual "Progressive Disclosure". Padronização de todas as abas técnicas com o uso inteligente de Drawers (gavetas laterais) e redução de animações conflitantes.

### Changed
- Comandos passam a ser multi-passo (Fase 8.2), permitindo consolidação estruturada de procedimentos operacionais.
- Migração de tabelas completada (Fase 8.1), quebrando o monolito `infrastructure.py` em sub-rotas.
