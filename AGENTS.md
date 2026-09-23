# REGRA CRÍTICA — OTRS E CENTRAL DE SUPORTE

A empresa utiliza o OTRS como sistema oficial de chamados.

O OTRS permanece como fonte oficial para abertura, comunicação, SLA, histórico e encerramento dos chamados.

A Central de Suporte é um sistema **interno e complementar**.

Nunca implementar a Central como substituta do OTRS.

Nunca recriar funcionalidades do OTRS sem necessidade claramente justificada.

Quando um atendimento interno estiver relacionado a um chamado OTRS, utilizar uma referência ao chamado, como número/protocolo e, quando disponível, URL.

A Central deve armazenar principalmente informações que agreguem valor interno:

* diagnóstico;
* solução;
* procedimentos;
* comandos;
* equipamentos;
* histórico técnico;
* documentação;
* tarefas;
* checklists;
* conhecimento;
* observações internas.

Uma futura integração com OTRS poderá existir, mas não deve ser presumida nem implementada no MVP sem confirmação da interface/API disponível.

**Regra de arquitetura: OTRS = chamado oficial. Central = operação e conhecimento interno.**

## REGRA CRÍTICA — SERVIDOR COMPARTILHADO

O projeto será desenvolvido em um Ubuntu Server que já possui outros containers Docker em produção/uso.

NUNCA:
- parar containers que não pertencem a este projeto;
- remover containers de outros projetos;
- remover volumes existentes;
- executar docker system prune;
- executar docker volume prune;
- executar docker network prune;
- apagar imagens indiscriminadamente;
- alterar configurações globais do Docker sem necessidade;
- alterar serviços do sistema sem necessidade.

O Docker Compose deste projeto deve utilizar nomes, volumes, redes e portas próprios.

Antes de criar ou alterar infraestrutura:
1. verificar containers existentes;
2. verificar portas utilizadas;
3. verificar redes Docker existentes;
4. verificar volumes;
5. identificar possíveis conflitos;
6. escolher recursos isolados para este projeto.

Qualquer ação que possa afetar outros projetos ou containers deve ser evitada.

O projeto deve ser isolado dos demais serviços do servidor.

## GIT E COMMITS

O projeto utiliza Git desde o início.

Após concluir uma unidade lógica de trabalho:

1. executar testes;
2. executar lint/typecheck/build quando aplicável;
3. verificar git diff;
4. verificar git status;
5. revisar alterações;
6. atualizar documentação;
7. criar um commit coerente.

Não acumular várias funcionalidades independentes em um único commit.

Preferir Conventional Commits.

Exemplos:

feat: add task management
fix: prevent unauthorized task access
refactor: extract attendance service
docs: update project state
test: add knowledge search tests

Nunca fazer commit de:
- secrets;
- senhas;
- tokens;
- arquivos .env reais;
- credenciais;
- dumps de banco;
- arquivos temporários.

Antes de cada commit, verificar explicitamente se nenhum segredo está sendo incluído.
