# Documentação — comece aqui

Este índice serve para pessoas **e agentes de IA** que vão continuar o projeto.
Leia nesta ordem antes de mudar qualquer coisa:

1. **`../AGENTS.md`** — regras invioláveis (OTRS, servidor compartilhado, Git, testes).
2. **`PROJECT_STATE.md`** — onde o projeto está *agora* e qual é o próximo passo.
3. **`ROADMAP.md`** — lista de trabalho com status. Pegue o próximo item pendente.
4. **`DEVELOPMENT.md`** — como rodar, testar e as convenções de código.

Consulte conforme a tarefa:

| Documento | Para quê |
|---|---|
| `PRODUCT_SPEC.md` | **O que** o produto deve fazer (fonte de verdade funcional). |
| `ANALISE_2026-10.md` | Diagnóstico de problemas de UX/fluxo (códigos `P-xx` citados no roadmap). |
| `ARCHITECTURE.md` | **Como** o sistema é construído (módulos, navegação, padrões). |
| `DATA_MODEL.md` | Entidades e relacionamentos. |
| `DOMAIN_RULES.md` | Regras de negócio (soft delete, projetos, arquivos, editor). |
| `API_CONTRACT.md` | Convenções de API (paginação, anexos, cofre). |
| `SECURITY.md` | Requisitos de segurança. |
| `DESIGN_SYSTEM.md` / `UI_UX.md` | Visual e comportamento da interface. |
| `DECISIONS.md` | Registro de decisões (adicione uma entrada por decisão relevante). |
| `CHANGELOG.md` | Mudanças notáveis por versão. |
| `history/` | Planos e auditorias das fases antigas (0–12). **Somente consulta**; não atualize. |

## Regras para manter a documentação útil

* `PROJECT_STATE.md` é curto (uma tela). Substitua o conteúdo, não acumule log — o histórico fica no Git.
* `ROADMAP.md` é a única lista de trabalho. Marque `[x]` só depois de testado e commitado.
* Não crie novos arquivos `PHASE_*`. Se um item precisar de plano detalhado, escreva uma seção
  curta no próprio roadmap ou um arquivo `docs/plans/<item>.md` e linke no item.
* Se dois documentos se contradisserem, aponte o conflito explicitamente e corrija na mesma mudança.
