# PROJECT_STATE

> Documento curto: substitua o conteúdo a cada entrega. Histórico até 2026-10-02 em
> `history/PROJECT_STATE_LOG_ate_2026-10-02.md`; o restante está no Git.

**Atualizado em:** 2026-10-04
**Ciclos concluídos:** S — Simplificação, U — Uso real e acabamento, B — Backlog (B2 depende do responsável; ver `ROADMAP.md`)

## Situação

* **Em produção** (`docker-compose.prod.yml`): https://10.0.29.220:8443 (principal) e http://10.0.29.220:5173.
  API em `/api` no mesmo endereço. Guia para a equipe: `GUIA_DA_EQUIPE.md`.
* Testes: backend 202 ✓ (banco isolado `centralsuporte_test`), frontend 170 ✓, `tsc -b` limpo, lint sem avisos novos (56 antigos).
* Banco recriado do zero em 2026-10-03; só existe o usuário `admin` (senha padrão `admin123`).
* Migração mais recente: `d1f4b5c6e7a8` (compras). Migrações sobem do zero; `alembic check` sem divergências.
* Certificados HTTPS em `deploy/certs/` (fora do Git). Backups do banco em `~/centralsuporte_backups/`.

## Próximo passo

Uso real pela equipe; ajustes vindos do uso têm prioridade. Backlog restante (`ROADMAP.md`): editor rich
text, Arquivos N:N e integração OTRS (só com API confirmada).

## Pendências do responsável

* Trocar a senha do `admin` (Meu Perfil → Alterar senha) e criar os usuários da equipe.
* Publicar em `https://suporte.voleidraft.top`: `sudo ./deploy/cloudflare-tunnel.sh` (B2).
* Guardar fora do servidor uma cópia de `~/centralsuporte_backups/CENTRAL_VAULT_KEY.txt` (sem ela as senhas do cofre se perdem).
* Instalar `https://10.0.29.220:8443/ca.crt` nos PCs da equipe (passo a passo em `GUIA_DA_EQUIPE.md`).

## Avisos para quem continuar

* **Mudanças de código só valem após rebuild**: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build`.
* Não rode testes sem `backend/conftest.py` (ver `AGENTS.md`).
* Revise telas com dados reais (ambiente de demonstração em `DEVELOPMENT.md`): testes com mock não pegam contrato errado.
* `maintenance_records.equipment_id` e `commands.command` são colunas legadas mantidas por compatibilidade.
