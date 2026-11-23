# Virando a Folha

> Do papel ao digital, porque brincar é coisa séria.

Sistema web de gestão da **Brinquedoteca Barreiro**, criado a partir da modelagem dos processos de negócio (BPMN AS-IS e TO-BE) feita pelo grupo. A ideia é trocar os registros em papel por um sistema simples, com entrada rápida das crianças, cobrança pelo tempo de permanência e organização de festas e eventos.

Projeto acadêmico de **PUC Minas · Sistemas de Informação**, orientado pelo Prof. Gleisson Albergaria Amaral.

## Sumário

1. [Integrantes](#integrantes)
2. [O que o sistema faz](#o-que-o-sistema-faz)
3. [Tecnologias](#tecnologias)
4. [Como rodar](#como-rodar)
5. [Tutorial: passo a passo](#tutorial-passo-a-passo)
6. [Logins para testar](#logins-para-testar)
7. [Perfis e permissões](#perfis-e-permissões)
8. [Regras de negócio](#regras-de-negócio)
9. [Estrutura do projeto](#estrutura-do-projeto)
10. [Como o sistema funciona por dentro](#como-o-sistema-funciona-por-dentro)
11. [Banco de dados](#banco-de-dados)
12. [Referência da API](#referência-da-api)
13. [Como editar e estender o sistema](#como-editar-e-estender-o-sistema)
14. [Subir o trabalho para o GitHub](#subir-o-trabalho-para-o-github)
15. [Publicar na internet (hospedagem)](#publicar-na-internet-hospedagem)
16. [Roteiro de testes](#roteiro-de-testes-para-os-prints)
17. [Problemas comuns](#problemas-comuns)
18. [Observações](#observações)

## Integrantes

- Luísa Braga Nery de Lima
- Maria Luiza de Oliveira Pinholate
- Melissa Vitor da Silva
- Sara da Cruz Freitas
- Sophia Emanuelle de Morais dos Santos

## O que o sistema faz

- **Cadastros:** responsáveis, crianças (com observações como alergias e cuidados), telefones e vínculo entre responsável e criança. Cada criança pode ter até 2 responsáveis.
- **Portal do responsável:** o cliente cria a conta, cadastra as crianças e o segundo responsável, solicita eventos e vê a equipe escalada.
- **Funcionários:** recepcionistas, monitores e supervisores.
- **Atendimentos:** registro de entrada e saída, monitores que acompanham a criança, cálculo e confirmação do valor da permanência.
- **Eventos:** orçamento, consulta de agenda, serviços contratados, reserva, ficha de briefing e escala da equipe.
- **Serviços:** catálogo de serviços que podem ser contratados nas festas.

## Tecnologias

- **Front-end:** HTML, CSS e JavaScript
- **Back-end:** Node.js com Express
- **Banco de dados:** MySQL 8

## Como rodar

Pré-requisitos: [Node.js](https://nodejs.org) (versão LTS) e MySQL 8.

1. No MySQL Workbench, rode `database/schema.sql` e depois `database/seed.sql`.
2. Copie `.env.example` para `.env` e coloque a senha do seu MySQL.
3. No terminal, dentro da pasta do projeto: `npm install` e depois `npm run dev`.
4. Abra http://localhost:3000. O terminal deve mostrar "Conectado ao MySQL".

## Tutorial: passo a passo

### 1. Preparar o banco (só na primeira vez)

1. Abra o MySQL Workbench e conecte no seu servidor.
2. Abra `database/schema.sql`, execute tudo (raio) e depois `database/seed.sql`.
3. Confira: `SELECT * FROM ACESSO;` deve mostrar 5 linhas (os funcionários).

> Já tinha o banco criado de antes? O `schema.sql` recria o banco do zero (apaga o que existir em `brinquedoteca`). Depois rode o `seed.sql` de novo.

### 2. Rodar o sistema

```bash
git clone https://github.com/melissavitor/VirandoAFolha.git
cd VirandoAFolha
cp .env.example .env        # no Windows: copy .env.example .env
npm install
npm run dev
```

Edite o `.env` com a senha do seu MySQL (`DB_PASSWORD`). Quando o terminal mostrar **Conectado ao MySQL**, abra http://localhost:3000.

### 3. Usando como equipe (funcionário)

1. **Entrar:** CPF `222.333.444-01` e senha `folha123` (Beatriz, coordenadora).
2. **Cadastrar uma família:** menu **Novo cadastro**. Preencha o responsável (CPF, nome, telefones, endereço) e adicione as crianças, com observações (alergias, remédios, cuidados).
3. **Registrar a entrada:** menu **Atendimentos**, escolha a criança e os monitores e confirme a entrada.
4. **Calcular o valor:** use a **calculadora** da tela de atendimentos. O valor da hora cai conforme o tempo de permanência (menos de 2h: R$ 35; 2h a 3h: R$ 32; 3h a 4h: R$ 31; 4h a 5h: R$ 30; 5h ou mais: R$ 28) e é cobrado por minuto. Há 5% de desconto para irmãos.
5. **Registrar a saída** e confirmar o pagamento. O histórico fica na mesma tela.
6. **Eventos:** menu **Eventos**. Veja a agenda pela data, monte o orçamento com serviços, **confirme** (isso gera os checklists de antes e depois) e escale a equipe.
7. **Só a coordenação:** Funcionários (equipe e senhas), Serviços e valor da hora.

### 4. Usando como responsável (cliente)

1. Na tela de login, clique em **Crie sua conta**. Informe seus dados e uma senha (mínimo 6 caracteres). Você já entra logado.
2. Em **Meus dados e crianças**, cadastre cada criança, com as observações.
3. **Segundo responsável:** cada criança pode ter até 2 responsáveis. Depois de salvar a criança, clique em **Adicionar responsável** e digite o CPF da outra pessoa:
   - se ela já tem cadastro, os dados aparecem sozinhos e é só salvar;
   - se não tem, preencha os dados dela (o endereço é copiado do seu). Se quiser, defina uma senha para ela também entrar no site.
   - Use **Trocar** ou **Remover** quando precisar mudar.
4. **Solicitar evento:** escolha data, horário, tema e serviços. O pedido fica **Em análise** até a coordenação confirmar.
5. **Meus eventos:** acompanhe o status e veja a equipe escalada com o horário de chegada de cada pessoa.

### 5. Funcionário: minha escala

Na tela inicial, o funcionário vê os eventos em que está escalado e o checklist da equipe para marcar o que já foi feito.

## Logins para testar

O login é pelo CPF do funcionário. A senha de todos é `folha123`.

| Funcionário | Função | CPF | Acesso |
|---|---|---|---|
| Beatriz | Coordenadora | 222.333.444-01 | Tudo, inclusive Funcionários, valor da hora e serviços |
| João | Recepcionista | 222.333.444-02 | Atendimentos, cadastros e eventos |
| Camila | Monitora | 222.333.444-03 | Atendimentos, cadastros e eventos |
| Rafael | Monitor | 222.333.444-04 | Atendimentos, cadastros e eventos |
| Patrícia | Recepcionista | 222.333.444-05 | Atendimentos, cadastros e eventos |

**Responsável (cliente):** não precisa de CPF pré-cadastrado. Na tela de login, **Crie sua conta** pede os dados e uma senha (mínimo 6 caracteres) e já entra. Depois, o responsável cadastra as crianças, pede um evento (nasce como orçamento, com preços do catálogo) e acompanha tudo em **Meus eventos**. Ele só vê o que é dele; a coordenação confirma o evento e escala a equipe.

As senhas ficam no banco, na tabela `ACESSO` (CPF, hash da senha e perfil). Nunca é gravada a senha pura. A coordenação cria ou troca senhas na tela Funcionários.

A fonte dos títulos é a Jennies House. Coloque o arquivo em `public/assets/comum/fonts/` e tire os comentários de `public/assets/comum/css/fontes.css`. Sem ela, os títulos usam a Barlow Condensed.

## Perfis e permissões

O sistema tem três perfis, guardados na tabela `ACESSO`:

| Perfil | Quem é | O que pode |
|---|---|---|
| `ADMIN` | Coordenação (Beatriz) | Tudo: inclusive criar funcionários e senhas, editar serviços e ver as configurações |
| `FUNCIONARIO` | Recepção e monitores | Cadastros, atendimentos e eventos. Serviços e funcionários só para consulta |
| `RESPONSAVEL` | Cliente que criou conta no site | Só o que é dele: seus dados, suas crianças, seus eventos e a equipe escalada neles |

Onde cada regra mora:

- **Login e sessão:** `utils/sessao.js` (cookie `vf_sessao`, validade de 8 horas, senha com `scrypt`).
- **Só coordenação:** `exigirAdmin`, usado em `server.js` para Funcionários e para alterar Serviços.
- **Portal do responsável:** `utils/portal.js` é uma lista do que o responsável pode acessar. Tudo que não está na lista responde `403`. Nas crianças e nos eventos, o servidor sempre força o código do próprio responsável, mesmo que o navegador tente mandar outro.
- **Menu e telas:** `public/assets/comum/js/layout.js` monta o menu de cada perfil e manda o responsável de volta ao início se ele abrir uma página da equipe.

## Regras de negócio

### Cobrança do atendimento

O valor da hora cai conforme o tempo de permanência da criança (tabela de `utils/cobranca.js`, baseada na tabela de preços da brinquedoteca):

| Permanência | Valor da hora |
|---|---|
| menos de 2 horas | R$ 35,00 |
| de 2h a menos de 3h | R$ 32,00 |
| de 3h a menos de 4h | R$ 31,00 |
| de 4h a menos de 5h | R$ 30,00 |
| 5 horas ou mais | R$ 28,00 |

- O valor é **por minuto**: `minutos ÷ 60 × valor da hora`. O mínimo cobrado é 1 minuto.
- **Irmãos:** 5% de desconto, aplicado quando marcado na calculadora.
- A calculadora (`POST /atendimentos/calcular`) só simula. O valor oficial é gravado na saída e confirmado no pagamento.
- Para mudar preços, edite as `FAIXAS` em `utils/cobranca.js`.

### Responsáveis e crianças

- Uma criança tem **1 responsável principal** e, no máximo, **1 segundo responsável**. O banco recusa um terceiro e recusa o mesmo CPF nos dois lugares (triggers `trg_respadic_*`).
- Uma pessoa **não pode ser funcionário e responsável** ao mesmo tempo (trigger `trg_responsavel_bi` e `trg_funcionario_bi`).
- Data de nascimento não pode estar no futuro (pessoa e criança). Data do atendimento também não.
- O responsável cadastra o segundo responsável pela criança já salva. Se o CPF já existe, a pessoa só é ligada; se não, é criada com o endereço do principal.

### Eventos

Um evento passa por três status:

| Status | Significado |
|---|---|
| `ORCAMENTO` | Pedido feito, ainda sem confirmação (o responsável vê como **Em análise**) |
| `CONFIRMADO` | A coordenação confirmou. O sistema gera os checklists **PRE** (antes) e **POS** (depois) |
| `CANCELADO` | Evento cancelado (o responsável também pode cancelar o próprio) |

- O responsável só pede o evento. O preço vem sempre do catálogo de serviços, e quem ajusta valor e escala a equipe é a coordenação.
- A agenda mostra a um responsável só se o horário está ocupado, sem revelar dados de outros clientes.
- O responsável vê a equipe escalada e o horário de chegada de cada pessoa.
- Cada funcionário vê os eventos em que está escalado em **Minha escala**.

## Estrutura do projeto

```
├── server.js            servidor: registra as rotas e as proteções de login
├── db.js                conexão com o MySQL
├── .env.example         modelo das variáveis de ambiente
├── database/
│   ├── schema.sql       criação das tabelas (inclui ACESSO, o login) e triggers
│   ├── seed.sql         dados de exemplo (5 ou mais registros em cada tabela)
│   └── consultas.sql    10 consultas da Fase 3 de Banco de Dados
├── routes/              uma rota por assunto
│   ├── auth.js          login, logout e troca de senha
│   ├── painel.js        números da tela inicial
│   ├── responsaveis.js  cadastro de responsáveis
│   ├── criancas.js      cadastro de crianças
│   ├── atendimentos.js  entrada, saída, cálculo e pagamento
│   ├── eventos.js       orçamento, agenda, status e checklist
│   ├── servicos.js      catálogo de serviços
│   ├── funcionarios.js  equipe, papéis e acessos
│   └── configuracoes.js valor da hora e fração de cobrança
├── utils/               funções de apoio (erros, transação, sessão, cobrança, acessos, portal do responsável)
└── public/              telas (mesma ideia do projeto Rizoma: uma pasta em assets para cada página)
    ├── index.html, login.html, criar-conta.html, atendimentos.html, cadastro.html,
    │   clientes.html, eventos.html, evento.html, servicos.html, funcionarios.html
    └── assets/
        ├── comum/       o que todas as páginas usam
        │   ├── css/     base, cabecalho, componentes, responsividade, fontes
        │   ├── js/      util.js, layout.js (menu), logo.js
        │   ├── img/     favicon
        │   └── fonts/   Rubik e Barlow Condensed
        └── <pagina>/    uma pasta por página (atendimentos, eventos, ...)
            ├── css/     estilo.css (junta os CSS comuns) e pagina.css (só dela, quando tem)
            └── js/      script.js
```

## Como o sistema funciona por dentro

```
Navegador (HTML + CSS + JS, fetch)
        │  JSON
        ▼
server.js ── express.json ── express.static("public")
        │
        ├─ /auth ................ login livre (cria a sessão)
        ├─ exigirLogin .......... daqui em diante, só logado
        ├─ portalResponsavel .... (utils/portal.js) limita o perfil RESPONSAVEL
        └─ /painel /responsaveis /criancas /atendimentos /eventos
           /servicos /configuracoes /funcionarios   (routes/*.js)
                │
                ▼
           db.js (pool mysql2) ──► MySQL 8 (tabelas + triggers)
```

Ideias que se repetem no código:

- **Uma rota por assunto** em `routes/<assunto>.js`, com o CRUD escrito de forma direta.
- **Erros em português** sempre no formato `{ "mensagem": "..." }`. As funções `tratarErro` e `erroHttp` (`utils/erros.js`) transformam erros do MySQL (trigger, CPF repetido, chave estrangeira) em mensagens que a tela mostra.
- **Transações** (`utils/transacao.js`): quando uma operação grava em várias tabelas (por exemplo, pessoa + responsável + telefones + acesso), ou tudo grava ou nada grava.
- **Validação em dois lugares:** a tela confere o que dá, mas quem manda é o servidor (`utils/pessoa.js`) e, por último, o banco (`CHECK` e triggers).
- **Front sem framework:** cada página tem seu `script.js`, que chama a API com `chamarApi()` (em `assets/comum/js/util.js`). O menu, a logo e a proteção de página vêm de `layout.js`.
- **Sessão em memória:** ao reiniciar o servidor, todos precisam entrar de novo. Para produção com vários servidores, trocaria por uma sessão salva em banco.

## Banco de dados

O banco `brinquedoteca` segue o projeto lógico do grupo (Fase 2), com tabelas normalizadas até a 3FN, chaves estrangeiras, restrições `CHECK` e triggers. O diagrama e o dicionário de dados ficam na pasta de documentação.

| Grupo | Tabelas | Para que serve |
|---|---|---|
| Pessoas | `PESSOA`, `TELEFONE_PESSOA` | Dados comuns (CPF, nome, nascimento, endereço) e telefones |
| Clientes | `RESPONSAVEL`, `CRIANCA`, `RESPONSAVEL_ADICIONAL` | Responsável, crianças (com observações) e o segundo responsável |
| Equipe | `FUNCIONARIO`, `RECEPCIONISTA`, `MONITOR` | Funcionário e seus papéis |
| Atendimento | `ATENDIMENTO`, `ACOMPANHA` | Entrada, saída, valor, pagamento e monitores que acompanham |
| Eventos | `EVENTO`, `FICHA_BRIEFING`, `SERVICO`, `CONTRATACAO`, `PARTICIPACAO`, `CHECKLIST_EVENTO` | Evento, briefing, serviços contratados, equipe escalada e checklists |
| Sistema | `CONFIGURACAO`, `ACESSO` | Parâmetros de cobrança e login (CPF, hash da senha, perfil) |

**Triggers** (regras que o `CHECK` do MySQL não faz): nascimento no futuro, pessoa que já é funcionário e responsável, supervisor de si mesmo, segundo responsável igual ao principal, limite de 2 responsáveis e data de atendimento no futuro. Quando uma delas dispara, o MySQL devolve `SQLSTATE 45000` e o servidor mostra a mensagem em português.

**Senhas:** a tabela `ACESSO` guarda só o *hash* (`salt:hash`, gerado com `scrypt`). A senha digitada nunca é gravada. Apagar a `PESSOA` apaga o acesso junto (`ON DELETE CASCADE`).

## Referência da API

Todas as rotas respondem JSON. Erros vêm como `{ "mensagem": "..." }` com status `400`, `401`, `403`, `404` ou `409`. Tudo, exceto `/auth/login` e `/auth/cadastro`, exige estar logado.

**Autenticação (`/auth`)**

| Método | Rota | O que faz |
|---|---|---|
| POST | `/auth/login` | Entra com `{ cpf, senha }` (funcionário ou responsável) |
| POST | `/auth/cadastro` | Responsável cria a conta (dados + senha) e já entra |
| POST | `/auth/logout` | Sai |
| GET | `/auth/eu` | Quem está logado (perfil, nome, códigos) |
| POST | `/auth/senha` | Troca a própria senha |

**Responsáveis (`/responsaveis`)**: `GET /`, `GET /:id`, `POST /`, `PUT /:id`, `DELETE /:id`. O responsável só acessa `GET` e `PUT` do próprio código.

**Crianças (`/criancas`)**

| Método | Rota | O que faz |
|---|---|---|
| GET | `/criancas` | Lista (`?responsavel=<cod>` filtra). O responsável vê as dele e aquelas em que é segundo responsável |
| GET | `/criancas/buscar-responsavel/:cpf` | Procura um responsável pelo CPF. O responsável recebe só o nome; a equipe recebe os dados completos |
| GET | `/criancas/:cod_responsavel/:num` | Uma criança |
| POST | `/criancas` | Cadastra criança |
| PUT | `/criancas/:cod_responsavel/:num` | Edita criança |
| DELETE | `/criancas/:cod_responsavel/:num` | Exclui (não exclui se tiver atendimentos) |
| PUT | `/criancas/:cod_responsavel/:num/adicional` | Liga ou cadastra o segundo responsável (`{ cpf, ... }`) |
| DELETE | `/criancas/:cod_responsavel/:num/adicional` | Remove o segundo responsável |

A criança é identificada por **responsável + número sequencial** (`num_sequencial`), como no modelo do banco.

**Atendimentos (`/atendimentos`)**: `POST /calcular` (simula o valor), `GET /`, `GET /:id`, `POST /` (entrada), `POST /:id/saida`, `POST /:id/pagamento`, `DELETE /:id`.

**Eventos (`/eventos`)**

| Método | Rota | O que faz |
|---|---|---|
| GET | `/eventos` | Lista (o responsável vê só os dele) |
| GET | `/eventos/agenda?data=` | Horários ocupados no dia |
| GET | `/eventos/minha-escala` | Eventos em que o funcionário logado está escalado |
| GET | `/eventos/:id` | Um evento com serviços, equipe e checklists |
| POST | `/eventos` | Cria o orçamento |
| PUT | `/eventos/:id` | Edita (o responsável só enquanto for `ORCAMENTO`) |
| POST | `/eventos/:id/status` | Muda o status (confirmar gera os checklists) |
| DELETE | `/eventos/:id` | Exclui |
| POST / PUT / DELETE | `/eventos/:id/checklist[/:cod]` | Itens do checklist |

**Outros:** `GET /painel` (números do início), `GET /configuracoes` (tabela de preços), `GET/POST/PUT/DELETE /servicos` (alterar só ADMIN) e `/funcionarios` (só ADMIN, exceto as listas de apoio `/recepcionistas`, `/monitores` e `/equipe`; `PUT /funcionarios/:id/acesso` define a senha).

## Como editar e estender o sistema

**Mudar os preços da hora:** edite `FAIXAS` e `DESCONTO_IRMAOS` em `utils/cobranca.js`. A tabela mostrada na tela de atendimentos acompanha.

**Criar uma nova rota** (exemplo: `routes/brinquedos.js`):

1. Crie o arquivo com `express.Router()` e o CRUD, no mesmo estilo de `routes/servicos.js`.
2. Registre em `server.js`: `app.use("/brinquedos", exigirLogin, require("./routes/brinquedos"));`
3. Se o responsável **não** deve ver, não faça nada: `utils/portal.js` já bloqueia o que não está na lista. Se deve, libere a rota ali.

**Criar uma nova página:**

1. Copie um `public/<pagina>.html` e crie a pasta `public/assets/<pagina>/{css,js}`.
2. No `estilo.css`, importe os CSS comuns (veja os existentes). No `script.js`, use `chamarApi()`.
3. Inclua a página em `ITENS_MENU` (e em `ITENS_RESPONSAVEL`, se o cliente puder usar) no `layout.js`.

**Mudar uma regra do banco:** altere o `schema.sql` (para quem cria do zero) e escreva um `.sql` de migração para quem já tem o banco.

**Cores da marca** (em `assets/comum/css/base.css`): verde `#679B72`, coral `#E86F63`, amarelo `#EDC047`, lilás `#8F80A8`, laranja `#FEA85B`, azul `#516E9E` e off-white `#FCFBF8`. Fontes: Rubik (texto) e Barlow Condensed (títulos).

## Subir o trabalho para o GitHub

```bash
git checkout -b feat/minha-mudanca     # cria a sua branch
git add .
git commit -m "feat: descreva o que mudou"
git push -u origin feat/minha-mudanca
```

Depois abra o **Pull Request** no GitHub (botão *Compare & pull request*) e peça a revisão do grupo. Para levar direto à `main` pelo terminal:

```bash
git checkout main
git pull origin main
git merge feat/minha-mudanca
git push origin main
```

Antes do `git add .`, confira com `git status` que o `.env` e a pasta `node_modules` **não** aparecem (eles já estão no `.gitignore`).

## Publicar na internet (hospedagem)

Rodar no `localhost` serve para desenvolver e apresentar. Para deixar online é preciso um servidor Node e um MySQL na nuvem:

1. **Banco:** crie um MySQL 8 gerenciado (Railway, Aiven, PlanetScale ou o do próprio provedor) e rode `schema.sql` e `seed.sql` nele.
2. **Aplicação:** publique em um serviço que rode Node (Railway, Render, Fly.io). Comando de início: `npm start`.
3. **Variáveis de ambiente** no painel do serviço (no lugar do `.env`): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` e `PORT`.
4. **Antes de abrir para o público:** troque a senha `folha123` dos funcionários (tela Funcionários), use HTTPS e não publique o `seed.sql` com dados de exemplo.

A GitHub Pages **não** serve: ela só hospeda páginas estáticas e este sistema precisa do servidor Node e do banco.

## Roteiro de testes (para os prints)

1. **Login:** entrar com cada CPF da tabela acima; testar também uma senha errada.
2. **Responsável:** em Criar conta, cadastrar um responsável; depois cadastrar uma criança, solicitar um evento e conferir em Meus eventos. Entrar como coordenação e confirmar esse evento.
3. **Início:** painel com os números e atalhos.
4. **Novo cadastro:** responsável com telefone e criança; depois ver em Clientes.
5. **Atendimentos:** registrar entrada, usar a **calculadora**, registrar saída e confirmar o pagamento; conferir no Histórico.
6. **Eventos:** consultar a agenda pela data, criar orçamento com serviços, confirmar (gera o checklist) e marcar itens.
7. **Serviços e Funcionários** (como Beatriz): cadastrar, editar, definir senha de acesso.
8. **Celular:** repetir no navegador em modo celular (F12, ícone de aparelho) ou no telefone pelo IP do computador.

## Problemas comuns

| O que aparece | O que fazer |
|---|---|
| `Access denied for user` | A senha do `.env` (`DB_PASSWORD`) não é a do seu MySQL. |
| `Unknown database 'brinquedoteca'` | Você ainda não rodou o `schema.sql`. |
| `Table 'ACESSO' doesn't exist` | Rode o `database/schema.sql` inteiro e depois o `seed.sql`. |
| `EADDRINUSE` (porta em uso) | Outra coisa usa a porta 3000. Troque `PORT` no `.env` ou feche o outro programa. |
| `CPF ou senha incorretos` | Use os CPFs da seção Logins para testar (senha `folha123`) ou crie uma conta de responsável. |
| Tela sem estilo ou sem dados | Abra pelo endereço do servidor (http://localhost:3000), não pelo arquivo `.html` direto. |
| Mudei o código e nada mudou | Com `npm run dev` ele reinicia sozinho; com `npm start`, pare (Ctrl+C) e rode de novo. |

## Observações

- O arquivo `.env` com a senha real **não** é versionado. Use sempre o `.env.example` como modelo.
- Cada integrante trabalha em uma branch própria e abre pull request para a `main`.