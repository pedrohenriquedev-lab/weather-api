# Alerta de Alagamento

Sistema web desenvolvido para consulta de condições meteorológicas, monitoramento de áreas com risco de alagamento e compartilhamento de ocorrências pela comunidade.

## Acesso à aplicação

**Aplicação em produção:** https://alerta-de-alagamento.onrender.com

**Repositório:** https://github.com/pedrohenriquedev-lab/alerta-de-alagamento

## Sobre o projeto

O Alerta de Alagamento é uma aplicação web que tem como objetivo auxiliar no acompanhamento de condições climáticas e na identificação de regiões com possíveis riscos de inundação.

A plataforma permite consultar informações meteorológicas por localização, visualizar dados relacionados ao risco de alagamento e compartilhar ocorrências, contribuindo para a disseminação de informações relevantes à população.

## Funcionalidades

- Consulta de condições meteorológicas por cidade.
- Exibição de temperatura, umidade, velocidade do vento e precipitação.
- Visualização de mapa com informações sobre riscos de inundação.
- Monitoramento de regiões e bairros.
- Registro e compartilhamento de ocorrências em áreas de risco.
- Armazenamento de informações em banco de dados.

## Tecnologias utilizadas

**Front-end**
- HTML5
- CSS3
- JavaScript

**Back-end**
- Node.js
- Express.js

**Banco de dados**
- Supabase

**Hospedagem**
- Render

## Arquitetura e infraestrutura

### Back-end — Node.js e Express.js

Responsável pelo processamento das requisições, disponibilização das rotas da aplicação e comunicação com os serviços externos e o banco de dados.

### Banco de dados — Supabase

Utilizado para armazenamento e gerenciamento das informações da aplicação. A comunicação com o banco de dados é realizada pelo servidor, utilizando variáveis de ambiente para proteger as credenciais de acesso.

O arquivo `supabase/schema.sql` contém a estrutura SQL utilizada na configuração do banco de dados.

### Hospedagem — Render

O servidor da aplicação está hospedado no Render, permitindo que o sistema seja acessado publicamente pela internet.

**Endereço de produção:** https://alerta-de-alagamento.onrender.com

A aplicação utiliza o plano gratuito do Render, que pode suspender temporariamente a execução do serviço após períodos de inatividade.

## Execução local

### Pré-requisitos

- Node.js
- npm
- Projeto configurado no Supabase

### 1. Clonar o repositório

```bash
git clone https://github.com/pedrohenriquedev-lab/alerta-de-alagamento.git
```

### 2. Acessar o diretório

```bash
cd alerta-de-alagamento
```

### 3. Instalar as dependências

```bash
npm install
```

### 4. Configurar as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto, utilizando o `.env.example` como referência.

Configure as seguintes variáveis:

```env
PORT=3000
SUPABASE_URL=SUA_URL_DO_SUPABASE
SUPABASE_SECRET_KEY=SUA_CHAVE_SECRETA_DO_SUPABASE
```

Substitua os valores de exemplo pelas credenciais correspondentes ao seu projeto Supabase.

As credenciais não devem ser compartilhadas ou enviadas ao repositório GitHub.

### 5. Executar a aplicação

```bash
npm start
```

Após iniciar o servidor, acesse:

```text
http://localhost:3000
```

## Estrutura do projeto

```text
alerta-de-alagamento/
│
├── public/
│   ├── index.html
│   ├── script.js
│   └── style.css
│
├── supabase/
│   └── schema.sql
│
├── server.js
├── package.json
├── package-lock.json
├── .env.example
├── .gitignore
└── README.md
```

## Objetivo acadêmico

O projeto foi desenvolvido no contexto acadêmico do curso de Análise e Desenvolvimento de Sistemas, com o propósito de aplicar conhecimentos de desenvolvimento web, integração entre front-end e back-end, manipulação de dados, utilização de serviços em nuvem e publicação de aplicações web.

A proposta também busca demonstrar como soluções tecnológicas podem contribuir para o monitoramento de riscos ambientais e para o acesso a informações de interesse público.
