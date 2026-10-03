# PROJECT_STATE

> Documento curto: substitua o conteúdo a cada entrega. Histórico até 2026-10-02 em
> `history/PROJECT_STATE_LOG_ate_2026-10-02.md`; o restante está no Git.

**Atualizado em:** 2026-10-03
**Ciclos concluídos:** S — Simplificação, U — Uso real e acabamento (ver `ROADMAP.md`)

## Situação

* **Em produção** (`docker-compose.prod.yml`): https://10.0.29.220:8443 (principal) e http://10.0.29.220:5173.
  API em `/api` no mesmo endereço. Guia para a equipe: `GUIA_DA_EQUIPE.md`.
* Testes: backend 185 ✓ (banco isolado `centralsuporte_test`), frontend 163 ✓, `tsc -b` limpo, lint sem avisos novos (57 antigos).
* Banco recriado do zero em 2026-10-03; só existe o usuário `admin` (senha padrão `admin123`).
* Migração mais recente: `a7c1e2d3f4b5`. Migrações sobem do zero; `alembic check` sem divergências.
* Certificados HTTPS em `deploy/certs/` (fora do Git). Backups do banco em `~/centralsuporte_backups/`.

## Próximo passo

Uso real pela equipe. Ajustes vindos do uso têm prioridade sobre o backlog. O backlog (`ROADMAP.md`)
depende de decisão do responsável: Cofre de Senhas, Cotações, editor rich text, Arquivos N:N,
integração OTRS, Web Push e testes de contrato (tipos gerados do OpenAPI).

## Pendências do responsável

* Trocar a senha do `admin` (Meu Perfil → Alterar senha) e criar os usuários da equipe.
* Instalar `https://10.0.29.220:8443/ca.crt` nos PCs da equipe (passo a passo em `GUIA_DA_EQUIPE.md`).

## Avisos para quem continuar

* **Mudanças de código só valem após rebuild**: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`.
* Não rode testes sem `backend/conftest.py` (ver `AGENTS.md`).
* Revise telas com dados reais (ambiente de demonstração em `DEVELOPMENT.md`): testes com mock não pegam contrato errado.
* `maintenance_records.equipment_id` e `commands.command` são colunas legadas mantidas por compatibilidade.
