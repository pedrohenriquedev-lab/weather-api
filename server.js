
"use strict";

const express = require("express");
const cors = require("cors");
const dns = require("node:dns");
const { createClient } = require("@supabase/supabase-js");

dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// CONEXÃO COM SUPABASE
// ==========================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY;

if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error(
    "Configure SUPABASE_URL e SUPABASE_SECRET_KEY no arquivo .env."
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SECRET_KEY
);

app.use(cors());
app.use(express.json({ limit: "20kb" }));
app.use(express.static(require("node:path").join(__dirname, "public")));

// ==========================================
// REQUISIÇÕES EXTERNAS
// ==========================================

async function requisicao(url, opcoes = {}) {
  const resposta = await fetch(url, {
    ...opcoes,
    signal: AbortSignal.timeout(15000)
  });

  if (!resposta.ok) {
    throw new Error(`Serviço externo respondeu com erro ${resposta.status}.`);
  }

  return resposta.json();
}

function validarCoordenadas(latitude, longitude) {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function mensagemErro(erro) {
  console.error(erro);
  return "Não foi possível concluir a consulta. Tente novamente.";
}

// ==========================================
// CONSULTA DE CIDADES
// ==========================================

async function buscarLocal(cidade) {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search" +
    `?name=${encodeURIComponent(cidade)}` +
    "&count=10&language=pt&format=json";

  const dados = await requisicao(url);

  if (!dados.results || dados.results.length === 0) {
    throw new Error("Cidade não encontrada.");
  }

  return dados.results[0];
}

// ==========================================
// CONSULTA METEOROLÓGICA
// ==========================================

async function consultarClima(latitude, longitude) {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    "&current=temperature_2m,relative_humidity_2m," +
    "precipitation,rain,showers,wind_speed_10m" +
    "&timezone=auto";

  const dados = await requisicao(url);

  if (!dados.current) {
    throw new Error("Dados meteorológicos indisponíveis.");
  }

  const atual = dados.current;

  return {
    temperatura: atual.temperature_2m ?? null,
    umidade: atual.relative_humidity_2m ?? null,
    vento: atual.wind_speed_10m ?? null,
    precipitacao: atual.precipitation ?? null,
    chuva: atual.rain ?? null,
    pancadas: atual.showers ?? null
  };
}

// ==========================================
// ROTA INICIAL
// ==========================================

app.get("/api/health", (req, res) => {
  res.json({
    status: "online",
    projeto: "Alerta de Alagamento"
  });
});

// ==========================================
// CLIMA POR CIDADE
// ==========================================

app.get("/weather/:cidade", async (req, res) => {
  try {
    const cidade = String(req.params.cidade || "").trim();

    if (!cidade) {
      return res.status(400).json({ erro: "Informe uma cidade." });
    }

    const local = await buscarLocal(cidade);

    const clima = await consultarClima(
      Number(local.latitude),
      Number(local.longitude)
    );

    res.json({
      cidade: local.name,
      estado: local.admin1 || "",
      pais: local.country || "",
      latitude: Number(local.latitude),
      longitude: Number(local.longitude),
      clima
    });
  } catch (erro) {
    res.status(erro.message === "Cidade não encontrada." ? 404 : 502)
      .json({ erro: erro.message || mensagemErro(erro) });
  }
});

// ==========================================
// CLIMA POR COORDENADAS
// ==========================================

app.get("/weather-location", async (req, res) => {
  try {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);

    if (!validarCoordenadas(latitude, longitude)) {
      return res.status(400).json({
        erro: "Latitude e longitude inválidas."
      });
    }

    const url =
      "https://api.open-meteo.com/v1/forecast" +
      `?latitude=${latitude}&longitude=${longitude}` +
      "&current=temperature_2m,relative_humidity_2m," +
      "precipitation,rain,showers,wind_speed_10m&timezone=auto";

    const dados = await requisicao(url);

    if (!dados.current) {
      throw new Error("Dados meteorológicos indisponíveis.");
    }

    const atual = dados.current;

    res.json({
      latitude,
      longitude,
      horario: atual.time,
      timezone: dados.timezone,
      clima: {
        temperatura: atual.temperature_2m ?? null,
        umidade: atual.relative_humidity_2m ?? null,
        vento: atual.wind_speed_10m ?? null,
        precipitacao: atual.precipitation ?? null,
        chuva: atual.rain ?? null,
        pancadas: atual.showers ?? null
      }
    });
  } catch (erro) {
    res.status(502).json({ erro: mensagemErro(erro) });
  }
});

// ==========================================
// GPS: CONVERTER COORDENADAS EM CIDADE
// ==========================================

app.get("/reverse-geocode", async (req, res) => {
  try {
    const latitude = Number(req.query.latitude);
    const longitude = Number(req.query.longitude);

    if (!validarCoordenadas(latitude, longitude)) {
      return res.status(400).json({
        erro: "Coordenadas inválidas."
      });
    }

    const url =
      "https://nominatim.openstreetmap.org/reverse" +
      `?lat=${latitude}&lon=${longitude}` +
      "&format=jsonv2&accept-language=pt-BR";

    const dados = await requisicao(url, {
      headers: {
        "User-Agent": "AlertaDeAlagamento/1.0"
      }
    });

    const endereco = dados.address || {};

    const nome =
      endereco.city ||
      endereco.town ||
      endereco.municipality ||
      endereco.village ||
      endereco.county;

    if (!nome) {
      return res.status(404).json({
        erro: "Não foi possível identificar sua cidade."
      });
    }

    res.json({
      nome,
      bairro:
        endereco.suburb ||
        endereco.neighbourhood ||
        endereco.quarter ||
        "",
      latitude,
      longitude
    });
  } catch (erro) {
    res.status(502).json({ erro: mensagemErro(erro) });
  }
});

// ==========================================
// LOCALIZAR BAIRRO
// ==========================================

app.get("/geocode/:bairro", async (req, res) => {
  try {
    const bairro = String(req.params.bairro || "").trim();
    const cidade = String(req.query.cidade || "").trim();

    if (!bairro || !cidade) {
      return res.status(400).json({
        erro: "Informe o bairro e a cidade."
      });
    }

    const consulta = `${bairro}, ${cidade}`;

    const url =
      "https://nominatim.openstreetmap.org/search" +
      `?q=${encodeURIComponent(consulta)}` +
      "&format=jsonv2&limit=1&countrycodes=br";

    const dados = await requisicao(url, {
      headers: {
        "User-Agent": "AlertaDeAlagamento/1.0"
      }
    });

    if (!dados.length) {
      return res.status(404).json({
        erro: "Não foi possível localizar esse bairro."
      });
    }

    res.json({
      latitude: Number(dados[0].lat),
      longitude: Number(dados[0].lon),
      nome: dados[0].display_name
    });
  } catch (erro) {
    res.status(502).json({ erro: mensagemErro(erro) });
  }
});

// ==========================================
// LISTAR OCORRÊNCIAS DO SUPABASE
// ==========================================

app.get("/api/occurrences", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("occurrences")
      .select("*")
      .order("dataRegistro", { ascending: false });

    if (error) {
      console.error("Erro ao buscar ocorrências:", error);
      return res.status(500).json({
        erro: "Não foi possível buscar os relatos."
      });
    }

    res.json(data || []);
  } catch (erro) {
    res.status(500).json({ erro: mensagemErro(erro) });
  }
});

// ==========================================
// CADASTRAR OCORRÊNCIA NO SUPABASE
// ==========================================

app.post("/api/occurrences", async (req, res) => {
  try {
    const {
      nome,
      cidade,
      bairro,
      nivel,
      descricao,
      latitude,
      longitude,
      estado,
      pais
    } = req.body || {};

    const niveisValidos = ["Alto", "Médio", "Baixo"];

    if (
      typeof nome !== "string" ||
      typeof cidade !== "string" ||
      typeof bairro !== "string" ||
      !nome.trim() ||
      !cidade.trim() ||
      !bairro.trim() ||
      !niveisValidos.includes(nivel)
    ) {
      return res.status(400).json({
        erro: "Preencha corretamente nome, cidade, bairro e nível."
      });
    }

    const lat = Number(latitude);
    const lon = Number(longitude);

    if (!validarCoordenadas(lat, lon)) {
      return res.status(400).json({
        erro: "As coordenadas do relato são inválidas."
      });
    }

    if (
      typeof descricao !== "string" ||
      descricao.length > 1000 ||
      nome.length > 100 ||
      cidade.length > 100 ||
      bairro.length > 100
    ) {
      return res.status(400).json({
        erro: "Os campos enviados excedem o tamanho permitido."
      });
    }

    const novaOcorrencia = {
      nome: nome.trim(),
      cidade: cidade.trim(),
      bairro: bairro.trim(),
      nivel,
      descricao: descricao.trim(),
      latitude: lat,
      longitude: lon,
      estado: String(estado || "").trim(),
      pais: String(pais || "").trim()
    };

    const { data, error } = await supabase
      .from("occurrences")
      .insert(novaOcorrencia)
      .select()
      .single();

    if (error) {
      console.error("Erro ao cadastrar ocorrência:", error);
      return res.status(500).json({
        erro: "Não foi possível registrar o relato."
      });
    }

    res.status(201).json({
      mensagem: "Relato registrado com sucesso.",
      ocorrencia: data
    });
  } catch (erro) {
    res.status(500).json({ erro: mensagemErro(erro) });
  }
});

// ==========================================
// TRATAMENTO DE ROTAS INEXISTENTES
// ==========================================

app.use("/api", (req, res) => {
  res.status(404).json({ erro: "Rota da API não encontrada." });
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(PORT, () => {
  console.log(`Alerta de Alagamento rodando na porta ${PORT}`);
  console.log("Integração com Supabase configurada.");
});
