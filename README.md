# Virando a Folha

> Do papel ao digital, porque brincar é coisa séria.

Sistema web de gestão da **Brinquedoteca Barreiro**, criado a partir da modelagem dos processos de negócio (BPMN AS-IS e TO-BE) feita pelo grupo. A ideia é trocar os registros em papel por um sistema simples, com entrada rápida das crianças, cobrança pelo tempo de permanência e organização de festas e eventos.

Projeto acadêmico de **PUC Minas · Sistemas de Informação**, orientado pelo Prof. Gleisson Albergaria Amaral.

## Integrantes

- Luísa Braga Nery de Lima
- Maria Luiza de Oliveira Pinholate
- Melissa Vitor da Silva
- Sara da Cruz Freitas
- Sophia Emanuelle de Morais dos Santos

## O que o sistema faz

- **Cadastros:** responsáveis, crianças (com observações como alergias e cuidados), telefones e vínculo entre responsável e criança.
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

## Logins para testar

O login é pelo CPF do funcionário. A senha de todos é `folha123`.

| Funcionário | Função | CPF | Acesso |
|---|---|---|---|
| Beatriz | Coordenadora | 222.333.444-01 | Tudo, inclusive Funcionários, valor da hora e serviços |
| João | Recepcionista | 222.333.444-02 | Atendimentos, cadastros e eventos |
| Camila | Monitora | 222.333.444-03 | Atendimentos, cadastros e eventos |
| Rafael | Monitor | 222.333.444-04 | Atendimentos, cadastros e eventos |

**Responsável (cliente):** não precisa de CPF pré-cadastrado. Na tela de login, **Crie sua conta** pede os dados e uma senha (mínimo 6 caracteres) e já entra. Depois, o responsável cadastra as crianças, pede um evento (nasce como orçamento, com preços do catálogo) e acompanha tudo em **Meus eventos**. Ele só vê o que é dele; a coordenação confirma o evento e escala a equipe.

As senhas ficam em `data/acessos.json` (criado sozinho na primeira vez), para não precisar mexer nas tabelas do banco. A coordenação cria ou troca senhas na tela Funcionários.

A fonte dos títulos é a Jennies House. Coloque o arquivo em `public/assets/comum/fonts/` e tire os comentários de `public/assets/comum/css/fontes.css`. Sem ela, os títulos usam a Barlow Condensed.

## Estrutura do projeto

```
├── server.js            servidor: registra as rotas e as proteções de login
├── db.js                conexão com o MySQL
├── .env.example         modelo das variáveis de ambiente
├── database/
│   ├── schema.sql       criação das tabelas e triggers
│   └── seed.sql         dados de exemplo
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
├── data/                acessos.json (senhas, não vai para o Git)
└── public/              telas (mesma ideia do projeto Rizoma: uma pasta em assets para cada página)
    ├── index.html, login.html, atendimentos.html, cadastro.html,
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

## Roteiro de testes (para os prints)

1. **Login:** entrar com cada CPF da tabela acima; testar também uma senha errada.
2. **Responsável:** em Criar conta, cadastrar um responsável; depois cadastrar uma criança, solicitar um evento e conferir em Meus eventos. Entrar como coordenação e confirmar esse evento.
3. **Início:** painel com os números e atalhos.
4. **Novo cadastro:** responsável com telefone e criança; depois ver em Clientes.
5. **Atendimentos:** registrar entrada, usar a **calculadora**, registrar saída e confirmar o pagamento; conferir no Histórico.
6. **Eventos:** consultar a agenda pela data, criar orçamento com serviços, confirmar (gera o checklist) e marcar itens.
7. **Serviços e Funcionários** (como Beatriz): cadastrar, editar, definir senha de acesso.
8. **Celular:** repetir no navegador em modo celular (F12, ícone de aparelho) ou no telefone pelo IP do computador.

## Banco de dados

O banco `brinquedoteca` segue o projeto lógico do grupo (Fase 2), com tabelas normalizadas até a 3FN, chaves estrangeiras, restrições `CHECK` e triggers. O diagrama e o dicionário de dados ficam na pasta de documentação.

## Observações

- O arquivo `.env` com a senha real **não** é versionado. Use sempre o `.env.example` como modelo.
- Cada integrante trabalha em uma branch própria e abre pull request para a `main`.
