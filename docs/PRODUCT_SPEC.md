# PRODUCT SPEC — Central de Suporte

**Produto:** Central Operacional do Suporte Técnico
**Nome curto:** Central de Suporte
**Status:** Especificação funcional de referência
**Versão:** 1.0
**Última atualização:** 2026-09-23

---

# 1. Propósito deste documento

Este documento é a especificação funcional permanente da Central de Suporte.

Ele existe para preservar, de forma estruturada e independente do histórico de conversas, todas as principais decisões sobre o que o produto deve ser, quais problemas deve resolver, quais funcionalidades deve possuir, quais regras deve obedecer e quais funcionalidades estão fora do escopo do MVP.

A IA/agente de desenvolvimento deve consultar este documento antes de implementar funcionalidades relevantes.

Este documento é a fonte de verdade para **requisitos e comportamento do produto**.

O `ROADMAP.md` define a ordem de implementação.

O `PROJECT_MASTER.md` define visão, princípios e arquitetura geral.

O `AGENTS.md` define regras obrigatórias para o agente.

Nenhum desses documentos deve ser interpretado isoladamente.

---

# 2. Visão do produto

A Central de Suporte é uma aplicação web interna destinada à organização e operação da equipe de suporte técnico.

Seu objetivo é centralizar informações, conhecimento técnico, tarefas, procedimentos, registros internos de atendimento, equipamentos, manutenções, arquivos e organização operacional que atualmente ficam dispersos em diferentes meios.

A Central deve funcionar como uma ferramenta operacional utilizada diariamente pelos técnicos e gestores.

Ela deve ajudar a equipe a:

* organizar o trabalho;
* encontrar rapidamente informações técnicas;
* registrar soluções e procedimentos;
* consultar comandos e respostas padrão;
* acompanhar tarefas;
* organizar checklists;
* controlar lembretes;
* registrar atendimentos internos;
* relacionar problemas a equipamentos;
* manter histórico técnico;
* documentar manutenções;
* pesquisar informações;
* preservar conhecimento adquirido pela equipe;
* acompanhar a operação da equipe.

A Central deve reduzir dependência de memória individual e informações espalhadas.

---

# 3. Princípio fundamental: a Central não substitui o OTRS

O OTRS continua sendo o sistema oficial de chamados da empresa.

A Central de Suporte é um sistema complementar.

A Central NÃO deve recriar ou substituir funcionalidades oficiais do OTRS.

O OTRS continua sendo responsável por:

* abertura oficial de chamados;
* identificação oficial do solicitante;
* comunicação oficial com o solicitante;
* histórico oficial do chamado;
* SLA oficial;
* acompanhamento oficial do chamado;
* encerramento oficial;
* demais processos que pertençam ao fluxo oficial de chamados.

A Central pode registrar informações internas relacionadas a um chamado do OTRS.

Exemplo:

```text
OTRS:
Chamado #123456

Central:
Atendimento interno relacionado ao chamado #123456

Diagnóstico:
...

Solução:
...

Equipamento:
...

Comandos utilizados:
...

Observações:
...
```

A referência ao OTRS deve ser manual no MVP.

Pode existir:

* número/protocolo do chamado;
* URL do chamado, quando desejado;
* observações relacionadas.

A Central não deve assumir que possui acesso à API do OTRS.

Uma futura integração via API poderá ser estudada em fase posterior.

---

# 4. Público e usuários

A aplicação será utilizada principalmente pela equipe interna de suporte técnico.

A arquitetura deve suportar diferentes níveis de acesso.

Perfis iniciais previstos:

* Administrador;
* Gestor;
* Técnico;
* Consulta.

Os perfis não devem ser implementados como regras rígidas espalhadas pelo código.

A autorização deve ser baseada em usuários, papéis/roles e permissões.

A arquitetura deve permitir evolução futura.

---

# 5. Autenticação

O MVP utilizará autenticação local.

Requisitos:

* login;
* senha protegida por hash seguro;
* gerenciamento de sessão/token;
* expiração de autenticação;
* logout;
* proteção das rotas;
* validação da autenticação no backend.

A autenticação deve ser separada da autorização.

A autorização deve determinar o que o usuário pode fazer.

A arquitetura deve permanecer preparada para futura utilização de um provedor corporativo de identidade, como AD/LDAP/SSO, caso isso seja necessário no futuro.

Não implementar AD/LDAP/SSO no MVP.

Não criar dependência de infraestrutura externa para autenticação inicial.

---

# 6. Autorização e permissões

A autorização deve ser obrigatoriamente validada no backend.

Ocultar um botão no frontend não constitui proteção.

Um usuário sem permissão não pode acessar diretamente um endpoint protegido simplesmente alterando a URL ou realizando uma requisição manual.

A aplicação deve possuir:

* usuários;
* roles/perfis;
* permissões;
* relacionamento entre usuários e roles;
* possibilidade de regras por recurso quando necessário.

A visibilidade de determinados registros também deve ser considerada.

Visibilidades previstas:

* Privado;
* Equipe;
* Todos;
* Usuários específicos.

As regras exatas de cada entidade devem ser definidas em `DOMAIN_RULES.md`.

---

# 7. Dashboard

O Dashboard é a tela operacional inicial.

Ele não deve ser apenas uma coleção de cards decorativos.

Deve apresentar informações úteis para o início e acompanhamento do trabalho.

Exemplos de informações:

* tarefas pendentes;
* tarefas em andamento;
* tarefas atrasadas;
* lembretes próximos;
* eventos próximos;
* atendimentos recentes;
* conhecimentos recentes;
* informações relevantes para o técnico;
* atividades da equipe quando permitido.

O Dashboard deve evoluir conforme os módulos do sistema forem implementados.

Não deve ficar artificialmente bloqueado esperando todos os módulos futuros existirem.

Quando dados reais ainda não existirem, podem ser utilizados estados vazios ou dados simulados temporários durante o desenvolvimento.

---

# 8. Organização pessoal e operacional

A Central deve possuir recursos para organizar o trabalho diário.

Módulos:

* Minhas tarefas;
* Tarefas da equipe;
* Checklists;
* Lembretes;
* Calendário.

---

# 9. Tarefas

As tarefas representam atividades internas da equipe.

Uma tarefa pode conter:

* título;
* descrição;
* responsável;
* criador;
* equipe;
* prioridade;
* status;
* prazo;
* data de criação;
* data de conclusão;
* visibilidade;
* tags;
* anexos;
* checklist;
* observações;
* histórico.

Status previstos:

* Pendente;
* Em andamento;
* Concluída;
* Cancelada.

A tarefa pode ser atribuída a um ou mais usuários quando necessário.

O sistema deve registrar alterações importantes.

Tarefas não são chamados oficiais do OTRS.

Uma tarefa pode eventualmente fazer referência a um atendimento ou chamado OTRS, mas não deve substituí-lo.

---

# 10. Checklists

Checklists permitem organizar procedimentos repetitivos.

Exemplos:

* manutenção preventiva;
* configuração de equipamento;
* instalação;
* preparação de computador;
* atendimento técnico;
* conferência de infraestrutura;
* procedimentos internos.

Um checklist possui itens.

Cada item deve permitir acompanhamento de conclusão.

Deve ser possível associar checklists a outras entidades quando fizer sentido, especialmente:

* tarefas;
* atendimentos;
* manutenções.

O sistema deve preservar o resultado do checklist quando isso fizer parte de um registro histórico.

---

# 11. Lembretes

Lembretes servem para lembrar o técnico ou equipe de atividades futuras.

Devem permitir informações como:

* título;
* descrição;
* data;
* horário quando aplicável;
* usuário;
* status;
* prioridade;
* referência opcional a outra entidade.

Exemplos:

* retornar contato;
* verificar equipamento;
* realizar manutenção;
* acompanhar problema;
* revisar procedimento.

---

# 12. Calendário

O calendário deve centralizar eventos internos.

Pode conter:

* atividades;
* manutenções;
* compromissos;
* lembretes;
* tarefas com prazo;
* eventos da equipe.

O calendário não deve tentar substituir sistemas corporativos externos.

Seu objetivo é organização interna da equipe.

---

# 13. Mural

O Mural é um espaço para comunicação interna da equipe.

Pode ser utilizado para:

* avisos;
* comunicados;
* informações operacionais;
* alertas internos;
* orientações temporárias;
* novidades da equipe.

O Mural não substitui comunicação oficial corporativa.

A visibilidade deve respeitar permissões.

---

# 14. Atendimentos internos

O módulo de Atendimentos registra o trabalho técnico realizado pela equipe.

Um atendimento interno pode estar relacionado a:

* chamado OTRS;
* equipamento;
* loja;
* departamento;
* usuário;
* tarefa;
* manutenção.

Um atendimento pode registrar:

* título;
* descrição do problema;
* solicitante;
* técnico responsável;
* data/hora;
* referência ao OTRS;
* equipamento envolvido;
* diagnóstico;
* causa;
* solução;
* comandos utilizados;
* observações;
* checklist;
* anexos;
* conhecimento relacionado;
* histórico.

O registro é interno.

O atendimento não substitui o chamado oficial no OTRS.

---

# 15. Referência ao OTRS

No MVP, a relação com OTRS será manual.

Um atendimento poderá conter:

* número do chamado;
* URL do chamado;
* observações.

A Central não deve tentar consultar automaticamente o OTRS.

Não criar:

* SLA próprio;
* fila oficial;
* status oficial duplicado;
* solicitante oficial duplicado;
* encerramento oficial;
* sistema de comunicação com solicitante;
* workflow equivalente ao OTRS.

Uma futura integração deverá ser tratada separadamente.

---

# 16. Registro técnico do atendimento

O atendimento deve privilegiar conhecimento técnico útil.

Deve ser possível registrar:

## Problema

O que estava acontecendo.

## Sintomas

Comportamentos observados.

## Diagnóstico

Como o problema foi identificado.

## Causa

Quando conhecida.

## Solução

O que foi realizado para resolver.

## Comandos

Comandos utilizados durante o diagnóstico ou solução.

## Equipamento

Equipamento afetado.

## Observações

Informações adicionais.

Isso transforma atendimentos em uma fonte potencial de conhecimento para a equipe.

---

# 17. Salvar atendimento como conhecimento

Um atendimento pode originar um artigo de conhecimento.

O sistema deve permitir uma ação semelhante a:

**Salvar como conhecimento**

Essa ação não deve simplesmente copiar tudo de forma cega.

O sistema deve permitir transformar o conteúdo do atendimento em um rascunho de artigo.

O artigo deverá poder ser revisado antes de ser publicado.

Isso permite transformar problemas reais solucionados pela equipe em conhecimento reutilizável.

---

# 18. Base de conhecimento

A Base de Conhecimento é um dos principais módulos da Central.

Seu objetivo é armazenar conhecimento técnico estruturado.

Artigos podem documentar:

* problemas;
* sintomas;
* causas;
* diagnóstico;
* soluções;
* procedimentos;
* comandos;
* configurações;
* observações;
* boas práticas;
* orientações internas.

A busca deve permitir encontrar conhecimento rapidamente.

---

# 19. Estrutura dos artigos

Um artigo pode possuir:

* título;
* resumo;
* conteúdo;
* problema;
* sintomas;
* causa;
* diagnóstico;
* solução;
* comandos relacionados;
* categoria;
* tags;
* autor;
* responsável pela publicação;
* data de criação;
* data de atualização;
* status;
* visibilidade;
* favoritos;
* versões;
* anexos;
* relacionamentos.

O conteúdo deve suportar edição rica quando apropriado.

---

# 20. Versionamento da base de conhecimento

Artigos importantes devem possuir histórico de versões.

Deve ser possível identificar:

* versão;
* autor da alteração;
* data;
* alterações;
* versão publicada.

Uma alteração não deve destruir silenciosamente o histórico anterior.

A estratégia detalhada de versionamento deve ser documentada em `DOMAIN_RULES.md` e `ARCHITECTURE.md`.

---

# 21. Publicação e visibilidade do conhecimento

Um artigo pode possuir estados apropriados, como:

* rascunho;
* publicado;
* arquivado.

O sistema deve impedir que conteúdo que não deveria estar disponível seja exibido indevidamente.

A visibilidade deve respeitar as regras de autorização.

---

# 22. Categorias, tags e favoritos

A base de conhecimento deve suportar:

* categorias;
* tags;
* favoritos.

As categorias ajudam na navegação.

As tags ajudam na pesquisa e classificação.

Favoritos permitem acesso rápido aos conteúdos mais utilizados por cada usuário.

---

# 23. Central de comandos

A Central deve possuir uma biblioteca de comandos técnicos.

Exemplos de categorias:

* Windows;
* PowerShell;
* Linux;
* rede;
* impressoras;
* diagnóstico;
* UniFi;
* pfSense;
* Active Directory;
* utilitários;
* outros.

Os comandos devem possuir:

* título;
* descrição;
* comando;
* sistema;
* categoria;
* tags;
* observações;
* riscos/avisos quando necessário;
* autor;
* visibilidade.

---

# 24. Regra crítica da Central de Comandos

No MVP, a Central de Comandos é somente uma biblioteca de consulta.

O usuário pode:

* pesquisar;
* visualizar;
* copiar.

A aplicação NÃO deve executar comandos remotamente.

Não implementar execução remota de comandos no MVP.

Não criar shell remoto dentro da aplicação.

Não permitir que um comando armazenado seja executado automaticamente pelo backend.

---

# 25. Respostas padrão

A Central deve possuir biblioteca de respostas padrão.

Pode conter:

* mensagens para usuários;
* orientações;
* respostas técnicas;
* instruções;
* modelos de comunicação;
* mensagens internas.

Deve permitir:

* pesquisa;
* visualização;
* cópia;
* organização por categoria;
* tags.

O objetivo é acelerar comunicações repetitivas.

---

# 26. Infraestrutura

A Central deve possuir um módulo de infraestrutura para organizar o ambiente técnico.

Principais entidades:

* lojas;
* departamentos;
* equipamentos;
* histórico de equipamentos.

---

# 27. Lojas

Uma loja representa uma unidade da empresa.

Deve permitir informações relevantes como:

* nome;
* código;
* identificação;
* endereço ou informações necessárias;
* status;
* observações;
* departamentos;
* equipamentos relacionados;
* atendimentos relacionados;
* manutenções relacionadas.

A modelagem deve permitir evolução futura sem amarrar a aplicação a uma quantidade fixa de lojas.

---

# 28. Departamentos

Departamentos representam setores internos ou áreas organizacionais.

Podem estar relacionados a:

* lojas;
* equipamentos;
* usuários;
* atendimentos;
* tarefas.

---

# 29. Equipamentos

A Central deve permitir inventariar equipamentos importantes para o suporte técnico.

Tipos possíveis incluem:

* computador;
* notebook;
* PDV;
* impressora;
* switch;
* access point;
* roteador;
* firewall;
* servidor;
* monitor;
* nobreak/UPS;
* outros equipamentos de infraestrutura.

Um equipamento pode possuir informações como:

* patrimônio;
* hostname;
* tipo;
* fabricante;
* modelo;
* número de série;
* endereço IP;
* endereço MAC;
* sistema operacional;
* localização;
* loja;
* departamento;
* responsável;
* status;
* observações;
* histórico.

---

# 30. Histórico de equipamentos

Alterações importantes de equipamentos devem poder ser registradas.

Exemplos:

* alteração de IP;
* alteração de MAC;
* mudança de localização;
* troca de componente;
* substituição;
* manutenção;
* problema identificado;
* atendimento relacionado;
* mudança de configuração;
* alteração de responsável.

O objetivo é criar histórico técnico útil.

---

# 31. Relacionamento entre equipamentos e atendimentos

Um atendimento pode estar associado a um equipamento.

Isso permite responder posteriormente:

* quais problemas esse equipamento já teve;
* quais atendimentos ocorreram;
* quais manutenções foram feitas;
* quais soluções foram aplicadas;
* qual histórico técnico existe.

Esse relacionamento é importante para transformar registros isolados em histórico técnico.

---

# 32. Manutenções

O módulo de Manutenções deve registrar atividades de manutenção física ou lógica.

Tipos previstos:

* preventiva;
* corretiva;
* substituição;
* atualização;
* configuração;
* instalação;
* outros tipos relevantes.

Uma manutenção pode possuir:

* equipamento;
* loja;
* técnico;
* data;
* tipo;
* descrição;
* diagnóstico;
* procedimento realizado;
* resultado;
* checklist;
* anexos;
* observações.

Manutenções podem estar relacionadas ao calendário.

---

# 33. Arquivos e anexos

A Central deve possuir suporte a arquivos relacionados às entidades.

Exemplos:

* fotos;
* screenshots;
* PDFs;
* documentos;
* relatórios;
* arquivos técnicos.

O arquivo físico deve ser armazenado no servidor.

Os metadados devem ser armazenados no PostgreSQL.

Os metadados podem incluir:

* nome original;
* nome físico;
* tamanho;
* MIME type;
* entidade relacionada;
* usuário que enviou;
* data;
* hash quando apropriado.

---

# 34. Segurança de arquivos

Arquivos não podem ser acessados simplesmente porque alguém conhece ou adivinha o caminho físico.

O acesso aos arquivos deve respeitar as permissões da entidade à qual o arquivo está associado.

Exemplo:

Se um usuário não pode visualizar um atendimento, também não deve conseguir acessar diretamente um arquivo anexado àquele atendimento.

O backend deve validar autorização antes de entregar arquivos protegidos.

---

# 35. Pesquisa global

A Central deverá possuir pesquisa global.

A primeira estratégia deve utilizar PostgreSQL Full-Text Search e filtros estruturados.

Não adicionar Elasticsearch, OpenSearch ou outro mecanismo externo sem necessidade técnica comprovada.

A pesquisa deverá evoluir para encontrar informações como:

* problemas;
* soluções;
* comandos;
* artigos;
* lojas;
* equipamentos;
* hostname;
* patrimônio;
* número de série;
* IP;
* MAC;
* PDV;
* técnico;
* chamado OTRS;
* atendimento;
* tags;
* datas.

---

# 36. Filtros

A pesquisa deverá suportar filtros conforme a entidade.

Exemplos:

* loja;
* departamento;
* equipamento;
* tipo;
* técnico;
* categoria;
* tag;
* status;
* período;
* OTRS;
* tipo de atendimento.

Os filtros devem ser combináveis quando fizer sentido.

---

# 37. Relatórios

Relatórios devem ajudar na análise operacional.

Possíveis informações:

* tarefas;
* atendimentos;
* manutenções;
* equipamentos;
* atividades da equipe;
* conhecimento;
* problemas recorrentes.

Os relatórios devem ser implementados conforme necessidade real.

Não criar uma grande quantidade de relatórios artificiais apenas para preencher o módulo.

---

# 38. Auditoria

Alterações sensíveis devem possuir histórico/auditoria.

Exemplos:

* criação;
* alteração;
* exclusão;
* mudança de permissões;
* alteração de usuários;
* publicação de conhecimento;
* alterações administrativas;
* mudanças importantes em infraestrutura.

A auditoria deve permitir identificar pelo menos:

* usuário;
* ação;
* entidade;
* identificador;
* data/hora;
* informações relevantes da alteração.

---

# 39. Exclusão e soft delete

Entidades importantes não devem necessariamente ser destruídas fisicamente imediatamente.

Quando fizer sentido, utilizar soft delete.

Isso é especialmente importante para preservar histórico e evitar perda acidental de informações.

As regras específicas devem ser definidas por entidade em `DOMAIN_RULES.md`.

---

# 40. Notificações e alertas

A Central poderá possuir notificações internas relacionadas a:

* tarefas;
* prazos;
* lembretes;
* eventos;
* atividades relevantes.

A implementação deve permanecer simples no início.

Automação avançada ficará para fase posterior.

---

# 41. Automação futura

A aplicação poderá futuramente executar regras internas como:

* lembrar tarefa próxima do vencimento;
* alertar tarefa atrasada;
* criar notificações;
* executar verificações periódicas;
* gerar alertas operacionais.

Tecnologias como APScheduler, Celery ou outras só devem ser adicionadas quando existir necessidade real.

Não adicionar infraestrutura de processamento assíncrono apenas por antecipação.

---

# 42. UX/UI

A Central deve possuir interface moderna, limpa e funcional.

Prioridades:

* velocidade;
* clareza;
* legibilidade;
* baixa fricção;
* navegação consistente;
* responsividade;
* boa utilização em desktop;
* suporte a telas menores quando aplicável.

Estrutura principal prevista:

```text
Central de Suporte

Dashboard

Minha organização
 ├── Minhas tarefas
 ├── Lembretes
 └── Calendário

Operação
 ├── Atendimentos
 ├── Equipe
 └── Mural

Conhecimento
 ├── Base de conhecimento
 ├── Comandos
 └── Respostas padrão

Infraestrutura
 ├── Lojas
 ├── Equipamentos
 └── Manutenções

Arquivos
Relatórios
Administração
```

Essa estrutura é conceitual e pode evoluir conforme a implementação, sem perder a organização funcional.

---

# 43. Design System

O frontend deve utilizar componentes reutilizáveis.

Tecnologias previstas:

* React;
* TypeScript;
* Vite;
* Tailwind CSS;
* shadcn/ui ou equivalente.

Componentes comuns devem ser reutilizados em vez de cada tela criar sua própria implementação visual.

O sistema deve possuir consistência em:

* botões;
* formulários;
* tabelas;
* cards;
* diálogos;
* menus;
* alertas;
* estados vazios;
* carregamento;
* erros.

---

# 44. Responsividade

A aplicação deve funcionar adequadamente em:

* desktops;
* notebooks;
* tablets;
* telas menores quando aplicável.

O foco principal da operação interna é desktop, mas a interface não deve ser construída de forma inutilizável em telas menores.

---

# 45. Estados de interface

As telas devem possuir estados apropriados para:

* carregando;
* vazio;
* sucesso;
* erro;
* sem permissão;
* não encontrado.

Não utilizar apenas telas vazias ou erros genéricos.

---

# 46. Backend

O backend deve ser construído com:

* Python;
* FastAPI;
* PostgreSQL.

Deve possuir separação clara entre:

* API;
* regras de negócio;
* acesso a dados;
* autenticação;
* autorização;
* validação.

---

# 47. Banco de dados

O PostgreSQL é o banco principal.

As alterações de estrutura devem utilizar migrations.

Não alterar schema manualmente de maneira não rastreável.

Entidades previstas ao longo do projeto incluem, entre outras:

```text
users
roles
permissions

tasks
task_assignments
checklists
checklist_items
reminders
calendar_events

knowledge_articles
knowledge_versions
knowledge_tags

commands
standard_responses

attendances
attendance_notes
attendance_attachments

stores
departments
equipment
equipment_history

maintenance_records

attachments

audit_logs
```

A modelagem definitiva deve ser documentada em `DATA_MODEL.md`.

---

# 48. API

Frontend e backend devem possuir contrato claro.

Endpoints devem:

* validar autenticação;
* validar autorização;
* validar entrada;
* retornar respostas consistentes;
* tratar erros;
* não expor informações indevidas.

O contrato detalhado deve permanecer em `API_CONTRACT.md`.

---

# 49. Armazenamento

Arquivos devem ser armazenados no servidor.

O banco armazena metadados e relacionamentos.

Segredos, credenciais e configurações sensíveis não devem ser versionados.

---

# 50. Infraestrutura da aplicação

A aplicação utiliza Docker e Docker Compose.

O servidor Ubuntu é compartilhado com outros projetos e containers.

A Central deve possuir isolamento próprio.

A infraestrutura da Central não pode afetar outros projetos existentes.

Nunca executar:

```text
docker system prune
docker volume prune
docker network prune
```

ou comandos equivalentes destrutivos globalmente.

Nunca remover indiscriminadamente volumes, imagens ou containers de outros projetos.

Antes de alterações de infraestrutura, verificar:

* containers existentes;
* portas;
* redes;
* volumes;
* nomes dos recursos.

A aplicação deve utilizar recursos Docker próprios.

---

# 51. Segurança

Requisitos fundamentais:

* autenticação segura;
* senhas armazenadas somente com hash;
* autorização no backend;
* validação de entrada;
* proteção de endpoints;
* controle de acesso a arquivos;
* proteção de informações sensíveis;
* nenhum segredo no Git;
* nenhum `.env` real versionado;
* tratamento seguro de erros;
* auditoria de operações sensíveis.

---

# 52. Backup e restauração

O sistema deve possuir documentação de backup e restauração.

O processo deve incluir:

* banco de dados;
* arquivos;
* configuração necessária.

Backup não é considerado completo se não houver procedimento documentado de restauração.

A restauração deve ser testada periodicamente quando possível.

---

# 53. Testes

A aplicação deve possuir testes apropriados.

Backend:

* pytest.

Frontend:

* Vitest quando aplicável.

Fluxos críticos:

* Playwright/E2E.

Os testes devem cobrir principalmente:

* autenticação;
* autorização;
* regras de negócio;
* CRUDs importantes;
* pesquisa;
* fluxos críticos;
* acesso a arquivos;
* permissões.

---

# 54. Git

O projeto utiliza Git.

Commits devem seguir Conventional Commits.

Exemplos:

```text
feat: add local authentication
fix: prevent unauthorized attendance access
docs: update product specification
test: add attendance authorization tests
refactor: extract permission service
```

Cada unidade lógica de trabalho deve possuir commit próprio.

---

# 55. MVP

O MVP deve permanecer focado.

Escopo prioritário:

1. Foundation;
2. Autenticação;
3. Design System/Layout;
4. Dashboard;
5. Tarefas;
6. Checklists;
7. Lembretes;
8. Calendário;
9. Base de conhecimento;
10. Comandos;
11. Respostas padrão;
12. Atendimentos;
13. Infraestrutura essencial conforme necessidade.

O MVP não deve tentar implementar todas as integrações e automações simultaneamente.

---

# 56. Fora do escopo inicial

Não implementar prematuramente:

* integração completa com OTRS;
* AD/LDAP/SSO;
* integração completa com UniFi;
* integração completa com pfSense;
* execução remota de comandos;
* automações complexas;
* Elasticsearch/OpenSearch;
* infraestrutura distribuída desnecessária;
* workflow equivalente ao OTRS;
* sistema paralelo de SLA oficial.

Esses recursos podem ser estudados posteriormente.

---

# 57. Integrações futuras

Possíveis integrações futuras:

* OTRS;
* Active Directory;
* LDAP;
* SSO;
* UniFi;
* pfSense;
* outros sistemas internos.

Cada integração deve passar por análise de viabilidade antes da implementação.

A existência desta seção não significa que qualquer integração esteja aprovada para implementação.

Uma integração só deve ser adicionada quando houver:

* necessidade real;
* viabilidade técnica;
* benefício claro;
* segurança adequada;
* decisão documentada.

---

# 58. Princípio de não duplicação

Sempre que outro sistema já for responsável oficialmente por determinada função, a Central não deve criar uma cópia desnecessária dessa função.

Exemplo principal:

OTRS é responsável pelo chamado oficial.

A Central registra o conhecimento e o trabalho interno relacionado ao chamado.

Ela não cria um "OTRS paralelo".

---

# 59. Princípio de evolução

A aplicação deve ser construída para permitir crescimento sem exigir reescrita constante.

Porém, isso não significa implementar abstrações complexas antecipadamente.

Preferir:

* soluções simples;
* módulos bem separados;
* interfaces claras;
* código testável;
* dependências justificadas.

Evitar overengineering.

---

# 60. Fonte de verdade e alteração de requisitos

Este documento representa os requisitos funcionais conhecidos do produto.

A IA não deve inventar funcionalidades relevantes que alterem o comportamento definido aqui.

Quando surgir uma necessidade nova:

1. identificar a necessidade;
2. verificar se já existe regra;
3. avaliar impacto;
4. propor alteração;
5. registrar a decisão em `DECISIONS.md` quando for arquitetural ou relevante;
6. atualizar este documento quando o requisito passar a fazer parte do produto;
7. atualizar `ROADMAP.md` se alterar o planejamento.

Alterações importantes de escopo não devem ser feitas silenciosamente.

---

# 61. Relação com os demais documentos

## AGENTS.md

Define regras obrigatórias para agentes de desenvolvimento.

## PROJECT_MASTER.md

Define visão, princípios e arquitetura geral.

## PRODUCT_SPEC.md

Define os requisitos e funcionalidades do produto.

## ROADMAP.md

Define a ordem de implementação.

## PROJECT_STATE.md

Define o estado atual do projeto.

## DECISIONS.md

Registra decisões arquiteturais e decisões relevantes.

## ARCHITECTURE.md

Define a arquitetura técnica.

## DOMAIN_RULES.md

Define regras detalhadas de negócio.

## DATA_MODEL.md

Define o modelo de dados.

## API_CONTRACT.md

Define o contrato entre frontend e backend.

Nenhum documento deve ser alterado para esconder inconsistências. Quando houver conflito, o agente deve identificar o conflito e solicitar/registrar uma decisão apropriada em vez de simplesmente escolher silenciosamente.

---

# 62. Regra final

A Central de Suporte deve ser construída como uma ferramenta interna real para uso diário da equipe.

O objetivo não é criar apenas uma demonstração visual.

Cada módulo deve possuir:

* comportamento funcional;
* persistência real;
* autorização adequada;
* tratamento de erros;
* testes relevantes;
* documentação;
* integração coerente com os demais módulos.

A prioridade é criar um sistema útil, confiável, seguro, sustentável e evolutivo para a operação do suporte técnico.
