
# Clima Seguro

O Clima Seguro é um projeto acadêmico desenvolvido com o objetivo de reunir informações meteorológicas e dados de risco de inundação em uma única interface.

A aplicação permite consultar cidades, visualizar condições climáticas e explorar áreas potencialmente sujeitas a inundações por meio de um mapa interativo.

## Funcionalidades

- Consulta de cidades pelo nome
- Informações de temperatura, umidade, vento e precipitação
- Localização do usuário
- Mapa interativo
- Visualização de áreas potencialmente inundáveis
- Monitoramento de bairros e localidades
- Registro e visualização de ocorrências
- Filtros por nível de risco

## Tecnologias utilizadas

**Back-end**
- Node.js
- Express

**Front-end**
- HTML5
- CSS3
- JavaScript

**APIs e bibliotecas**
- Open-Meteo: dados meteorológicos e geolocalização
- OpenStreetMap: dados de mapas e localização
- Leaflet: exibição do mapa interativo
- GloFAS / Copernicus: camada de risco de inundação

## Como executar

É necessário ter o Node.js instalado.

1. Clone o repositório:
   `git clone https://github.com/pedrohenriquedev-lab/weather-api.git`

2. Entre na pasta:
   `cd weather-api`

3. Instale as dependências:
   `npm install`

4. Inicie o servidor:
   `node server.js`

5. Acesse no navegador:
   `http://localhost:3000`

## Sobre os dados de risco

A camada de inundação apresenta áreas potencialmente suscetíveis a alagamentos com base em dados de modelagem. Ela não representa uma confirmação de que determinado local esteja alagado em tempo real.

## Objetivo do projeto

O Clima Seguro foi desenvolvido como parte dos estudos em Análise e Desenvolvimento de Sistemas, envolvendo integração de APIs, desenvolvimento back-end, manipulação de dados e visualização de informações em mapas.

## Repositório

https://github.com/pedrohenriquedev-lab/weather-api
