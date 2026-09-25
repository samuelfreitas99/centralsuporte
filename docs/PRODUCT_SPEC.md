# PRODUCT SPEC — Central de Suporte

**Produto:** Central Operacional do Suporte Técnico
**Nome curto:** Central de Suporte
**Status:** Especificação Arquitetural e Funcional Pós-MVP
**Versão:** 2.0
**Última atualização:** 2026-09-25

---

## 1. Visão do Produto

A Central de Suporte é uma aplicação web interna destinada à organização e operação da equipe de suporte técnico. 
O sistema atual é um **MVP funcional**. O objetivo principal não é reconstruí-lo, mas evoluí-lo mantendo a compatibilidade.

### O que o Produto É:
* Um hub operacional para a equipe de TI.
* Um sistema de retenção de conhecimento técnico (Base de Conhecimento e Comandos).
* Um registro auxiliar e complementar de atendimentos complexos.
* Uma ferramenta de inventário (Equipamentos, Licenças, Estoque operacional).
* Um orquestrador interno de organização (Tarefas, Lembretes, Manutenções).

### O que o Produto NÃO É:
* NÃO é um ERP contábil ou financeiro. (O estoque é operacional; cotações serão simplificadas).
* NÃO é um substituto ou concorrente do OTRS.
* NÃO é uma rede social corporativa.
* NÃO é uma plataforma de automação remota de terminais (não executa comandos remotos).

---

## 2. Fronteira Fundamental: Central vs OTRS

A regra de ouro arquitetural: **O OTRS continua sendo o sistema oficial de tickets.**

### Responsabilidades do OTRS:
* Abertura oficial e recebimento de chamados.
* Identificação e comunicação oficial com o usuário/solicitante.
* Histórico oficial de interações.
* Contagem e gerenciamento do SLA oficial.
* Encerramento oficial do chamado.

### Responsabilidades da Central de Suporte:
* Registro do **contexto operacional/técnico interno** (Diagnóstico, causa, solução técnica aplicada).
* Histórico de qual máquina física/equipamento esteve envolvido no chamado.
* Compartilhamento do "como resolvi" entre os técnicos da equipe.
* Vinculação a um chamado OTRS (armazenando apenas o protocolo/URL OTRS como referência).

---

## 3. Módulos e Domínios Atuais (MVP)

A plataforma atual consolidou os seguintes módulos:
1. **Autenticação:** Base JWT local.
2. **Dashboard:** Visão situacional da equipe.
3. **Tarefas, Checklists, Lembretes e Calendário:** Produtividade da equipe técnica.
4. **Base de Conhecimento:** Artigos técnicos, comandos rápidos e respostas padrão.
5. **Atendimentos Internos:** Acompanhamento técnico complementar ao OTRS.
6. **Infraestrutura:** Lojas, Departamentos, Equipamentos, Manutenções, Estoque e Licenças (parcialmente isoladas).
7. **Arquivos (Attachments):** Entidade polimórfica atrelada diretamente a registros.
8. **Auditoria Genérica e Pesquisa:** Logs de ações e busca Full-Text (Ctrl+K).

---

## 4. Domínios para Evolução Pós-MVP

Com base na auditoria profunda, os seguintes domínios existentes serão remodelados e evoluídos:

1. **Licenças:**
   - Evolução conceitual: Deverá mascarar as chaves originais e possuir trilhas fortes de atribuição.
2. **Arquivos (Biblioteca Documental):**
   - Evolução conceitual: Evoluir os arquivos de "anexos escondidos no final de um formulário" para uma verdadeira Biblioteca Documental, onde arquivos podem ser pesquisados globalmente e atrelados a mais de uma entidade (Ex: Uma nota fiscal atrelada a uma Loja e a três Equipamentos).
3. **Checklists (Reutilizáveis/Templates):**
   - Evolução conceitual: Implementar Checklists como *Templates* globais. Em vez de recriar um checklist de "Formatação de PC" a cada atendimento, o usuário puxará de uma matriz.
4. **Perfil Operacional de Usuário:**
   - Evolução conceitual: Diferenciar "Usuário do Banco" de "Perfil do Técnico" (incluindo cargo, turnos e quadro de produtividade).

---

## 5. Novos Módulos e Domínios (Pipeline)

A evolução do produto trará 3 novos domínios críticos:

### 5.1. Projetos Operacionais
* **Comportamento Esperado:** Agrupar escopos maiores do suporte (Ex: "Montagem da Infra da Loja 03").
* Um projeto amarrará Tarefas, Checklists, Lembretes, Eventos na Agenda e Ativos (Equipamentos/Licenças).

### 5.2. Cofre de Senhas (Password Vault)
* **Comportamento Esperado:** Guarda segura de segredos de infraestrutura (Switches, Roteadores, Bancos de Dados).
* Exige criptografia forte (Envelope Encryption). Senhas de autenticação de usuário continuam sendo hashes unidirecionais; mas os *secrets* do cofre devem ser recuperáveis mediante decifragem com chave em memória e auditoria imediata de "Revelação de Senha".

### 5.3. Cotações / Compras (Operacional)
* **Comportamento Esperado:** Módulo para formalizar solicitações de compras de peças (ex: memórias, monitores) aprovadas pela gestão da TI.
* NÃO envolve pagamentos, NF-e ou integração bancária. É apenas controle de aprovação operacional.
