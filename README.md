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

Pré-requisitos: [Node.js](https://nodejs.org) (versão LTS) e MySQL 8 instalados.

```bash
# 1. clonar o repositório
git clone <link-do-repositorio>
cd brinquedoteca-app

# 2. instalar as dependências
npm install

# 3. configurar o ambiente
# copie o .env.example para .env e preencha com os dados do seu MySQL

# 4. criar o banco (no MySQL Workbench ou no terminal)
# rode database/schema.sql e depois database/seed.sql

# 5. iniciar o servidor
node server.js
```

Depois é só abrir `http://localhost:3000` no navegador.

## Estrutura do projeto

```
├── server.js          servidor e registro das rotas
├── db.js              conexão com o MySQL
├── .env.example       modelo das variáveis de ambiente
├── database/
│   ├── schema.sql     criação das tabelas
│   └── seed.sql       dados de exemplo
├── routes/            rotas da API de cada módulo
└── public/            telas (HTML, CSS e JavaScript)
```

## Banco de dados

O banco `brinquedoteca` segue o projeto lógico do grupo (Fase 2), com tabelas normalizadas até a 3FN, chaves estrangeiras, restrições `CHECK` e triggers. O diagrama e o dicionário de dados ficam na pasta de documentação.

## Observações

- O arquivo `.env` com a senha real **não** é versionado. Use sempre o `.env.example` como modelo.
- Cada integrante trabalha em uma branch própria e abre pull request para a `main`.