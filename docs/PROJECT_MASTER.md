# PROJECT_MASTER

## Central Operacional do Suporte Técnico

### Objetivo Principal
A Central de Suporte funciona como a memória operacional do departamento de TI. O objetivo é centralizar conhecimento técnico, documentação, procedimentos, comandos e organização interna da equipe, reduzindo a dependência de conhecimento não documentado.

### Regra Fundamental - OTRS
- O **OTRS** é o sistema oficial de chamados da empresa.
- A Central de Suporte **NÃO substitui o OTRS** e não recria seu fluxo.
- Integração no MVP: Referência manual (Número do Chamado e URL).
- Integração Futura: A arquitetura deve permitir a integração, mas não deve ser presumida no MVP.

### Princípio de Não Duplicação
Sempre avaliar se uma funcionalidade já existe no OTRS ou em outro sistema corporativo antes de implementá-la.

### Stack Tecnológica
- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui.
- **Backend**: Python, FastAPI, SQLAlchemy, Alembic.
- **Banco de Dados**: PostgreSQL.
- **Infraestrutura**: Docker, Docker Compose, Linux/Ubuntu.

### Isolamento no Servidor
O projeto deve rodar isolado no servidor Ubuntu, utilizando recursos (portas, volumes, redes) dedicados para evitar conflitos com outros containers existentes (ex: Portainer, Jellyfin).

### Arquitetura de Documentação
Para manter a consistência do desenvolvimento e guiar agentes de IA ou novos desenvolvedores, o projeto divide sua documentação em:
- **`PRODUCT_SPEC.md`**: A **fonte de verdade** absoluta para requisitos funcionais e escopo do MVP.
- **`AGENTS.md`**: Regras estritas e inegociáveis para agentes de desenvolvimento.
- **`ROADMAP.md`**: A ordem cronológica de implementação das funcionalidades descritas na especificação.
- **`PROJECT_STATE.md`**: O snapshot do momento atual do desenvolvimento.
- **`DECISIONS.md`**: O registro histórico das decisões arquiteturais relevantes.
