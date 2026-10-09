
const express = require("express");
const cors = require("cors");
const dns = require("node:dns");

dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static("."));

// ==========================================
// REQUISIÇÕES COM RETENTATIVAS
// ==========================================

async function fetchComTentativas(url, opcoes = {}, tentativas = 2) {
  let ultimoErro;

  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    try {
      const resposta = await fetch(url, {
        ...opcoes,
        signal: AbortSignal.timeout(15000)
      });

      return resposta;
    } catch (erro) {
      ultimoErro = erro;

      console.error(
        `Falha na conexão (tentativa ${tentativa}/${tentativas}):`,
        erro.cause?.code || erro.message
      );

      if (tentativa < tentativas) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  throw ultimoErro;
}

function mensagemErroConexao(erro, servico) {
  const codigo = erro?.cause?.code || erro?.code || "";

  if (
    codigo === "UND_ERR_CONNECT_TIMEOUT" ||
    erro?.name === "TimeoutError" ||
    erro?.name === "AbortError"
  ) {
    return `O serviço de ${servico} demorou para responder. Tente novamente.`;
  }

  return `Não foi possível consultar ${servico}. Verifique sua conexão e tente novamente.`;
}

// ==========================================
// ROTA PRINCIPAL
// ==========================================

app.get("/", (req, res) => {
  res.json({
    mensagem: "Alerta de Alagamento funcionando!"
  });
});

// ==========================================
// BUSCAR CIDADE OU ESTADO
// ==========================================

async function buscarLocal(nome) {
  const url =
    "https://geocoding-api.open-meteo.com/v1/search" +
    `?name=${encodeURIComponent(nome)}` +
    "&count=100&language=pt&format=json";

  const resposta = await fetchComTentativas(url);

  if (!resposta.ok) {
    throw new Error(
      `O serviço de localização respondeu com status ${resposta.status}.`
    );
  }

  const dados = await resposta.json();

  return dados.results || [];
}

// ==========================================
// ESCOLHER LOCAL
// ==========================================

function escolherLocal(resultados, busca) {
  if (!resultados.length) {
    return null;
  }

  const normalizar = texto =>
    String(texto || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const termo = normalizar(busca);

  // Prioriza correspondência exata do nome.
  let resultado = resultados.find(
    item => normalizar(item.name) === termo
  );

  if (resultado) {
    return resultado;
  }

  // Se a busca for o nome de um estado, tenta
  // encontrar esse estado no Brasil.
  resultado = resultados.find(
    item =>
      normalizar(item.admin1) === termo &&
      item.country_code === "BR"
  );

  if (resultado) {
    return resultado;
  }

  // Para nomes ambíguos, prioriza resultados brasileiros.
  resultado = resultados.find(
    item => item.country_code === "BR"
  );

  return resultado || resultados[0];
}

// ==========================================
// CONSULTAR CLIMA
// ==========================================

async function consultarClima(latitude, longitude, dias = 2) {
  const url =
    "https://api.open-meteo.com/v1/forecast" +
    `?latitude=${latitude}` +
    `&longitude=${longitude}` +
    "&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,rain,showers,weather_code" +
    "&hourly=precipitation,rain,showers,weather_code" +
    `&forecast_days=${dias}` +
    "&timezone=auto";

  const resposta = await fetchComTentativas(url);

  if (!resposta.ok) {
    throw new Error(
      `A API de clima respondeu com status ${resposta.status}.`
    );
  }

  return resposta.json();
}

// ==========================================
// FORMATAR DADOS CLIMÁTICOS
// ==========================================

function formatarClima(dados) {
  return {
    temperatura: dados.current?.temperature_2m ?? null,
    umidade: dados.current?.relative_humidity_2m ?? null,
    vento: dados.current?.wind_speed_10m ?? null,
    precipitacao: dados.current?.precipitation ?? null,
    chuva: dados.current?.rain ?? null,
    pancadas: dados.current?.showers ?? null,
    codigoTempo: dados.current?.weather_code ?? null
  };
}

// ==========================================
// CLIMA DA CIDADE
// ==========================================

app.get("/weather/:cidade", async (req, res) => {
  const busca = req.params.cidade.trim();

  if (!busca) {
    return res.status(400).json({
      erro: "Digite uma cidade ou estado."
    });
  }

  try {
    const resultados = await buscarLocal(busca);
    const local = escolherLocal(resultados, busca);

    if (!local) {
      return res.status(404).json({
        erro: `Não foi possível encontrar "${busca}".`
      });
    }

    const dadosClima = await consultarClima(
      local.latitude,
      local.longitude,
      2
    );

    return res.json({
      cidade: local.name,
      estado: local.admin1 || "",
      pais: local.country || "",
      paisCodigo: local.country_code || "",
      latitude: local.latitude,
      longitude: local.longitude,
      tipo: local.feature_code || "",
      clima: formatarClima(dadosClima),
      horario: dadosClima.current?.time || null,
      timezone: dadosClima.timezone || null
    });
  } catch (erro) {
    console.error(
      "Erro na rota /weather:",
      erro.cause?.code || erro.message
    );

    const mensagem = erro.message?.includes("status")
      ? erro.message
      : mensagemErroConexao(erro, "clima ou localização");

    return res.status(502).json({
      erro: mensagem
    });
  }
});

// ==========================================
// CLIMA DO BAIRRO MONITORADO
// ==========================================

app.get("/weather-location", async (req, res) => {
  const latitude = Number(req.query.latitude);
  const longitude = Number(req.query.longitude);

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < -90 ||
    latitude > 90 ||
    longitude < -180 ||
    longitude > 180
  ) {
    return res.status(400).json({
      erro: "Latitude e longitude inválidas."
    });
  }

  try {
    const dados = await consultarClima(
      latitude,
      longitude,
      1
    );

    return res.json({
      latitude,
      longitude,
      horario: dados.current?.time || null,
      timezone: dados.timezone || null,
      clima: formatarClima(dados)
    });
  } catch (erro) {
    console.error(
      "Erro na rota /weather-location:",
      erro.cause?.code || erro.message
    );

    const mensagem = erro.message?.includes("status")
      ? erro.message
      : mensagemErroConexao(erro, "clima do local");

    return res.status(502).json({
      erro: mensagem
    });
  }
});

// ==========================================
// GEOCODIFICAR BAIRRO
// ==========================================

app.get("/geocode/:bairro", async (req, res) => {
  const bairro = req.params.bairro.trim();
  const cidade = String(req.query.cidade || "").trim();

  if (!bairro) {
    return res.status(400).json({
      erro: "Informe um bairro ou localidade."
    });
  }

  try {
    const busca = cidade
      ? `${bairro}, ${cidade}`
      : bairro;

    const url =
      "https://nominatim.openstreetmap.org/search" +
      "?format=json&limit=5&addressdetails=1" +
      `&q=${encodeURIComponent(busca)}`;

    const resposta = await fetchComTentativas(url, {
      headers: {
        "User-Agent": "AlertaDeAlagamento/1.0"
      }
    });

    if (!resposta.ok) {
      return res.status(502).json({
        erro: "O serviço de localização está temporariamente indisponível."
      });
    }

    const resultados = await resposta.json();

    if (!resultados || resultados.length === 0) {
      return res.status(404).json({
        erro: "Localidade não encontrada. Confira o bairro e a cidade."
      });
    }

    const local = resultados[0];

    return res.json({
      nome: local.display_name,
      latitude: Number(local.lat),
      longitude: Number(local.lon)
    });
  } catch (erro) {
    console.error(
      "Erro na rota /geocode:",
      erro.cause?.code || erro.message
    );

    return res.status(502).json({
      erro: mensagemErroConexao(erro, "localização do bairro")
    });
  }
});

// ==========================================
// INICIAR SERVIDOR
// ==========================================

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});