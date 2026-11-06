# Alerta de Alagamento — Clima Seguro

Aplicação web para consultar condições meteorológicas, visualizar áreas de risco no mapa e compartilhar relatos comunitários de possíveis alagamentos.

## Tecnologias
- HTML5, CSS3 e JavaScript
- Node.js + Express
- Open-Meteo (clima e geocodificação)
- Leaflet + OpenStreetMap (mapa)
- Camada WMS GloFAS/Copernicus (risco de inundação)
- Supabase (PostgreSQL compartilhado)

## Requisitos
- Node.js 20.6 ou superior (o script usa `--env-file-if-exists`).
- Projeto Supabase gratuito ou pago.

## Instalação no Windows (PowerShell)
1. Extraia o ZIP e abra a pasta no VS Code.
2. No terminal, execute `npm.cmd install`.
3. Copie `.env.example` para `.env`.
4. Crie um projeto em https://supabase.com/.
5. No Supabase, abra **SQL Editor**, cole e execute o conteúdo de `supabase/schema.sql`.
6. No painel do Supabase, abra **Project Settings → API** e copie a Project URL e a chave pública `anon` (ou publishable) para `.env`:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
7. Inicie com `npm.cmd start`.
8. Acesse http://localhost:3000.

## Cadastro comunitário
Não exige login. Os relatos ficam no banco Supabase e aparecem para todos os visitantes. O servidor valida os campos, nível e coordenadas e limita cada IP a 8 envios por hora (limite em memória, reinicia quando o servidor reinicia). A aplicação não oferece edição ou exclusão pública.

**Importante:** a chave `service_role`/secret nunca deve ser colocada no `.env` deste projeto. Use somente a chave pública anon/publishable. Para publicação em larga escala, acrescente CAPTCHA, moderação administrativa, proteção anti-spam persistente e rate limit compartilhado (Redis/serviço equivalente). Relatos de usuários não são confirmação oficial de alagamento.

## APIs e fontes
- Open-Meteo: https://open-meteo.com/
- OpenStreetMap/Nominatim: https://nominatim.org/
- Leaflet: https://leafletjs.com/
- Supabase: https://supabase.com/docs

## Estrutura
```text
public/
  index.html
  script.js
  style.css
server.js
supabase/schema.sql
.env.example
README.md
```

## Observação sobre dados
O antigo arquivo `data/pontos-risco.json` foi removido. O mapa comunitário passa a consultar o banco Supabase; nenhum ponto fictício é semeado automaticamente.
