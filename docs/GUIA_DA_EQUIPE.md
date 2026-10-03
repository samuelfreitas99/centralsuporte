# Guia da equipe — Central de Suporte

Guia curto para quem vai **usar** a Central. (Para quem desenvolve: `DEVELOPMENT.md`.)

## 1. Como acessar

| Endereço | Quando usar |
|---|---|
| **https://10.0.29.220:8443** | Endereço principal. Permite instalar como app e receber notificações. |
| http://10.0.29.220:5173 | Alternativo, sem notificações (útil antes de instalar o certificado). |

Primeiro acesso: o administrador cria seu usuário. Depois de entrar, troque a senha em
**seu nome (canto superior direito) → Alterar senha**.

## 2. Instalar o certificado da Central (uma vez por computador)

O endereço https usa um certificado da própria Central. Para o navegador confiar nele:

1. Baixe **https://10.0.29.220:8443/ca.crt** (na primeira vez, aceite o aviso do navegador).
2. **Windows:** dê dois cliques no arquivo → *Instalar certificado* → *Máquina local* →
   *Colocar todos os certificados no repositório a seguir* → **Autoridades de Certificação Raiz Confiáveis** → Concluir.
   (Em rede com domínio, o TI pode distribuir o mesmo arquivo por GPO.)
3. **Android:** Configurações → Segurança → Criptografia e credenciais → Instalar certificado → Certificado de CA.
4. Feche e abra o navegador. O cadeado deve aparecer sem aviso.

## 3. Instalar como app e ativar notificações

* **Chrome/Edge no computador:** ícone de instalar na barra de endereço (ou menu → *Instalar Central de Suporte*).
* **Celular:** menu do navegador → *Adicionar à tela inicial*.
* **Notificações:** clique no **sino** → *Ativar notificações no computador* → Permitir.
  Você recebe aviso quando um lembrete seu chega na hora e quando o sistema detecta tarefa
  vencendo, manutenção do dia ou equipamento com falhas repetidas.
  (Os avisos chegam enquanto a Central estiver aberta em alguma aba ou como app.)

## 4. O dia a dia

| Situação | Onde |
|---|---|
| Atendeu um chamado do OTRS | **Atendimentos → Novo atendimento**: nº e link do chamado, equipamento, problema, diagnóstico, solução e comandos usados. O chamado oficial continua no OTRS. |
| A solução vale para a equipe | No detalhe do atendimento, **Gerar artigo** → revise na **Base de Conhecimento** e publique. |
| Precisa lembrar de algo | **Tarefas e Agenda → Meus lembretes** (só você vê; avisa no sino). |
| Trabalho para alguém fazer | **Tarefas e Agenda → Nova tarefa** (responsável, prazo, checklist). |
| Preventiva/corretiva em equipamentos | **Manutenções** (ou, na ficha do equipamento, *Agendar manutenção*). |
| Abertura de loja, reforma, implantação | **Projetos** (agrupa tarefas, manutenções e atendimentos). |
| Achar qualquer coisa | **Ctrl+K** ou **Buscar** no topo. |
| Histórico de um PDV/servidor | **Equipamentos e Lojas** → abra o equipamento → aba **Ocorrências**. |

## 5. Perfis de acesso

| Perfil | Pode |
|---|---|
| Consulta | Ver tudo do dia a dia, sem alterar. |
| Técnico | Registrar e editar atendimentos, tarefas, manutenções, conhecimento e inventário. |
| Gestor | Tudo do técnico + usuários (visualizar) e auditoria. |
| Administrador | Tudo, inclusive usuários e perfis. |
