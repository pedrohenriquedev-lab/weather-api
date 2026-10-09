
const cidadeInput = document.getElementById("cidadeInput");
const buscarBtn = document.getElementById("buscarBtn");
const geoBtn = document.getElementById("geoBtn");

const resultado = document.getElementById("resultado");
const mensagem = document.getElementById("mensagem");

const cidadeNome = document.getElementById("cidadeNome");
const paisNome = document.getElementById("paisNome");

const temperatura = document.getElementById("temperatura");
const umidade = document.getElementById("umidade");
const vento = document.getElementById("vento");
const precipitacao = document.getElementById("precipitacao");
const chuva = document.getElementById("chuva");
const pancadas = document.getElementById("pancadas");

const bairroInput = document.getElementById("bairroInput");
const monitorarBtn = document.getElementById("monitorarBtn");
const monitorStatus = document.getElementById("monitorStatus");
const alerta = document.getElementById("alerta");

const toggleOcorrenciasBtn = document.getElementById("toggleOcorrenciasBtn");
const cadastroForm = document.getElementById("cadastroForm");
const cadastroMensagem = document.getElementById("cadastroMensagem");
const listaRiscos = document.getElementById("listaRiscos");
const botoesFiltro = document.querySelectorAll(".filter-btn");
const darkModeToggle = document.getElementById("darkModeToggle");

// ==========================================
// VARIÁVEIS
// ==========================================

let mapa = null;
let marcadorCidade = null;
let camadaRisco = null;
let localAtual = null;
let climaAtual = null;
let marcadoresOcorrencias = [];
let filtroAtual = "todos";
let ocorrenciasVisiveis = false;
let estaChovendoAgora = false;

let pontosDeRisco = [];

try {
  const pontosSalvos = JSON.parse(
    localStorage.getItem("pontosDeRisco")
  );

  if (Array.isArray(pontosSalvos)) {
    pontosDeRisco = pontosSalvos;
  }
} catch (erro) {
  console.error("Erro ao carregar ocorrências:", erro);
}

const HORAS_OCORRENCIA_ATUAL = 24;

// ==========================================
// NORMALIZAR NOMES
// ==========================================

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function obterOcorrenciasDaCidade() {
  if (!localAtual) {
    return [];
  }

  const cidadeAtual = normalizarTexto(localAtual.cidade);
  const estadoAtual = normalizarTexto(localAtual.estado);
  const paisAtual = normalizarTexto(localAtual.pais);

  return pontosDeRisco.filter(ponto => {
    const cidadePonto = normalizarTexto(ponto.cidade);

    if (cidadePonto !== cidadeAtual) {
      return false;
    }

    // Se os registros tiverem estado e país,
    // usa-os também para diferenciar cidades homônimas.
    if (ponto.estado && estadoAtual) {
      if (normalizarTexto(ponto.estado) !== estadoAtual) {
        return false;
      }
    }

    if (ponto.pais && paisAtual) {
      if (normalizarTexto(ponto.pais) !== paisAtual) {
        return false;
      }
    }

    return true;
  });
}

// ==========================================
// INICIALIZAÇÃO DO MAPA
// ==========================================

function inicializarMapa(latitude = -8.05, longitude = -34.90) {
  if (mapa) {
    mapa.remove();
  }

  mapa = L.map("mapa").setView([latitude, longitude], 11);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(mapa);

  camadaRisco = L.tileLayer.wms(
    "https://ows.globalfloods.eu/glofas-ows/ows.py",
    {
      layers: "FloodHazard100y",
      format: "image/png",
      transparent: true,
      version: "1.3.0",
      opacity: 0.55,
      attribution: "GloFAS / Copernicus"
    }
  ).addTo(mapa);

  renderizarMarcadoresOcorrencias();
}

// ==========================================
// BUSCAR CIDADE
// ==========================================

async function buscarCidade(cidade) {
  if (!cidade) {
    mensagem.textContent = "Digite uma cidade.";
    return;
  }

  mensagem.textContent = "Consultando dados...";

  try {
    const resposta = await fetch(
      `/weather/${encodeURIComponent(cidade)}`
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || "Cidade não encontrada.");
    }

    cidadeNome.textContent =
      `${dados.cidade}${dados.estado ? ` - ${dados.estado}` : ""}`;

    paisNome.textContent = dados.pais;

    temperatura.textContent =
      dados.clima.temperatura !== null
        ? `${dados.clima.temperatura} °C`
        : "--";

    umidade.textContent =
      dados.clima.umidade !== null
        ? `${dados.clima.umidade}%`
        : "--";

    vento.textContent =
      dados.clima.vento !== null
        ? `${dados.clima.vento} km/h`
        : "--";

    precipitacao.textContent =
      dados.clima.precipitacao !== null
        ? `${dados.clima.precipitacao} mm`
        : "--";

    chuva.textContent =
      dados.clima.chuva !== null
        ? `${dados.clima.chuva} mm`
        : "--";

    pancadas.textContent =
      dados.clima.pancadas !== null
        ? `${dados.clima.pancadas} mm`
        : "--";

    localAtual = {
      cidade: dados.cidade,
      estado: dados.estado || "",
      pais: dados.pais || "",
      latitude: Number(dados.latitude),
      longitude: Number(dados.longitude)
    };

    climaAtual = dados.clima;
    estaChovendoAgora =
      (Number(climaAtual.chuva) || 0) > 0 ||
      (Number(climaAtual.precipitacao) || 0) > 0;

    // Ao trocar de cidade, volta a ocultar ocorrências.
    ocorrenciasVisiveis = false;

    resultado.classList.remove("hidden");

    inicializarMapa(dados.latitude, dados.longitude);
    mapa.setView([dados.latitude, dados.longitude], 11);

    if (marcadorCidade) {
      mapa.removeLayer(marcadorCidade);
    }

    marcadorCidade = L.marker([
      dados.latitude,
      dados.longitude
    ])
      .addTo(mapa)
      .bindPopup(`<strong>${dados.cidade}</strong><br>Local consultado`)
      .openPopup();

    mensagem.textContent = "Consulta realizada com sucesso.";

    atualizarBotaoOcorrencias();
    renderizarMarcadoresOcorrencias();
    renderizarPontos();
    atualizarAlerta();

  } catch (erro) {
    console.error(erro);
    mensagem.textContent =
      erro.message || "Não foi possível consultar a cidade.";
  }
}

buscarBtn.addEventListener("click", () => {
  buscarCidade(cidadeInput.value.trim());
});

cidadeInput.addEventListener("keydown", evento => {
  if (evento.key === "Enter") {
    evento.preventDefault();
    buscarCidade(cidadeInput.value.trim());
  }
});

// ==========================================
// MINHA POSIÇÃO
// ==========================================

geoBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    mensagem.textContent = "Seu navegador não suporta localização.";
    return;
  }

  mensagem.textContent = "Obtendo sua localização...";

  navigator.geolocation.getCurrentPosition(
    async posicao => {
      const latitude = posicao.coords.latitude;
      const longitude = posicao.coords.longitude;

      try {
        const resposta = await fetch(
          `https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&language=pt&format=json`
        );

        const dados = await resposta.json();

        if (dados.results && dados.results.length > 0) {
          const local = dados.results[0];
          cidadeInput.value = local.name || "";
          await buscarCidade(local.name);
        } else {
          mensagem.textContent = "Não foi possível identificar sua cidade.";
        }
      } catch (erro) {
        console.error(erro);
        mensagem.textContent = "Erro ao identificar sua localização.";
      }
    },
    () => {
      mensagem.textContent = "Não foi possível obter sua localização.";
    }
  );
});

// ==========================================
// MONITORAR BAIRRO
// ==========================================

async function monitorarLocal() {
  const bairro = bairroInput.value.trim();

  if (!bairro) {
    monitorStatus.textContent = "Digite um bairro ou localidade.";
    return;
  }

  if (!localAtual) {
    monitorStatus.textContent = "Primeiro consulte uma cidade.";
    return;
  }

  monitorStatus.textContent = "Localizando região...";
  monitorarBtn.disabled = true;

  try {
    const respostaLocal = await fetch(
      `/geocode/${encodeURIComponent(bairro)}?cidade=${encodeURIComponent(localAtual.cidade)}`
    );

    const dadosLocal = await respostaLocal.json();

    if (!respostaLocal.ok) {
      throw new Error(dadosLocal.erro || "Local não encontrado.");
    }

    const latitude = Number(dadosLocal.latitude);
    const longitude = Number(dadosLocal.longitude);

    monitorStatus.textContent = "Consultando condições atuais do local...";

    const respostaClima = await fetch(
      `/weather-location?latitude=${latitude}&longitude=${longitude}`
    );

    const dadosClima = await respostaClima.json();

    if (!respostaClima.ok) {
      throw new Error(
        dadosClima.erro || "Não foi possível consultar o clima."
      );
    }

    localAtual.bairro = bairro;
    localAtual.latitude = latitude;
    localAtual.longitude = longitude;
    climaAtual = dadosClima.clima;

    const valorChuva = Number(climaAtual.chuva) || 0;
    const valorPrecipitacao = Number(climaAtual.precipitacao) || 0;

    estaChovendoAgora =
      valorChuva > 0 || valorPrecipitacao > 0;

    mapa.setView([latitude, longitude], 14);

    if (marcadorCidade) {
      mapa.removeLayer(marcadorCidade);
    }

    marcadorCidade = L.marker([latitude, longitude])
      .addTo(mapa)
      .bindPopup(`<strong>${bairro}</strong><br>${localAtual.cidade}`)
      .openPopup();

    // Ao monitorar outro local, começa oculto.
    ocorrenciasVisiveis = false;

    atualizarBotaoOcorrencias();
    renderizarMarcadoresOcorrencias();
    renderizarPontos();

    const horario = dadosClima.horario || "--";

    monitorStatus.innerHTML = `
      <strong>${estaChovendoAgora ? "🌧️ Chuva detectada no local" : "☀️ Sem chuva no momento"}</strong>
      <br>Monitorando: ${bairro}, ${localAtual.cidade}
      <br><small>Atualizado às ${horario}</small>
    `;

    atualizarAlerta();

  } catch (erro) {
    console.error(erro);
    monitorStatus.textContent =
      erro.message || "Não foi possível monitorar o local.";
  } finally {
    monitorarBtn.disabled = false;
  }
}

monitorarBtn.addEventListener("click", monitorarLocal);

bairroInput.addEventListener("keydown", evento => {
  if (evento.key === "Enter") {
    evento.preventDefault();
    monitorarLocal();
  }
});

// ==========================================
// DISTÂNCIA ENTRE DOIS PONTOS
// ==========================================

function calcularDistanciaKm(lat1, lon1, lat2, lon2) {
  const raioTerra = 6371;

  const diferencaLatitude =
    (lat2 - lat1) * Math.PI / 180;

  const diferencaLongitude =
    (lon2 - lon1) * Math.PI / 180;

  const a =
    Math.sin(diferencaLatitude / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(diferencaLongitude / 2) ** 2;

  return raioTerra * 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(1 - a)
  );
}

// ==========================================
// VERIFICAR OCORRÊNCIA RECENTE
// ==========================================

function ocorrenciaEhRecente(ponto) {
  if (!ponto.dataRegistro) {
    return false;
  }

  const dataRegistro = new Date(ponto.dataRegistro).getTime();

  if (!Number.isFinite(dataRegistro)) {
    return false;
  }

  const diferenca = Date.now() - dataRegistro;
  const limite = HORAS_OCORRENCIA_ATUAL * 60 * 60 * 1000;

  return diferenca >= 0 && diferenca <= limite;
}

// ==========================================
// OCORRÊNCIAS PRÓXIMAS DO BAIRRO
// ==========================================

function encontrarOcorrenciasProximas() {
  if (!localAtual) {
    return [];
  }

  return obterOcorrenciasDaCidade().filter(ponto => {
    if (
      !Number.isFinite(Number(ponto.latitude)) ||
      !Number.isFinite(Number(ponto.longitude)) ||
      !ocorrenciaEhRecente(ponto)
    ) {
      return false;
    }

    const distancia = calcularDistanciaKm(
      localAtual.latitude,
      localAtual.longitude,
      Number(ponto.latitude),
      Number(ponto.longitude)
    );

    return distancia <= 2;
  });
}

// ==========================================
// ALERTA INTELIGENTE
// ==========================================

function atualizarAlerta() {
  if (!alerta || !localAtual || !climaAtual) {
    return;
  }

  const valorChuva = Number(climaAtual.chuva) || 0;
  const valorPrecipitacao = Number(climaAtual.precipitacao) || 0;
  const chuvaAtual =
    valorChuva > 0 || valorPrecipitacao > 0;

  if (!chuvaAtual) {
    alerta.style.display = "block";
    alerta.className = "alert-box alert-normal";

    alerta.innerHTML = `
      <strong>🟢 Situação normal</strong>
      <p>Não há chuva registrada neste momento no local monitorado.</p>
      <small>Ocorrências históricas não representam risco atual.</small>
    `;

    return;
  }

  const ocorrenciasProximas = encontrarOcorrenciasProximas();

  const ocorrenciaAlta = ocorrenciasProximas.some(
    ponto => ponto.nivel === "Alto"
  );

  const ocorrenciaMedia = ocorrenciasProximas.some(
    ponto => ponto.nivel === "Médio"
  );

  alerta.style.display = "block";
  alerta.className = "alert-box";

  if (ocorrenciaAlta) {
    alerta.classList.add("alert-alto");

    alerta.innerHTML = `
      <strong>🔴 Alto risco de alagamento</strong>
      <p>Há chuva no local monitorado e existe uma ocorrência recente de nível alto em até 2 km.</p>
      <small>A ocorrência foi registrada nas últimas ${HORAS_OCORRENCIA_ATUAL} horas.</small>
    `;

    return;
  }

  if (ocorrenciaMedia) {
    alerta.classList.add("alert-elevado");

    alerta.innerHTML = `
      <strong>🟠 Risco elevado</strong>
      <p>Há chuva no local monitorado e existe uma ocorrência recente de nível médio em até 2 km.</p>
      <small>A ocorrência foi registrada nas últimas ${HORAS_OCORRENCIA_ATUAL} horas.</small>
    `;

    return;
  }

  alerta.classList.add("alert-atencao");

  alerta.innerHTML = `
    <strong>🟡 Atenção</strong>
    <p>Há chuva no local monitorado, mas não existem ocorrências comunitárias recentes próximas.</p>
    <small>Fique atento às condições da região.</small>
  `;
}

// ==========================================
// ÍCONE DAS OCORRÊNCIAS
// ==========================================

function criarIconeOcorrencia(nivel) {
  let cor = "#facc15";

  if (nivel === "Alto") {
    cor = "#ef4444";
  }

  if (nivel === "Médio") {
    cor = "#f97316";
  }

  return L.divIcon({
    className: "ocorrencia-marker",
    html: `
      <div style="
        width: 18px;
        height: 18px;
        background: ${cor};
        border: 3px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
      "></div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9]
  });
}

// ==========================================
// POPUP DA OCORRÊNCIA
// ==========================================

function criarPopupOcorrencia(ponto) {
  const data = ponto.dataRegistro
    ? new Date(ponto.dataRegistro).toLocaleString("pt-BR")
    : "Registro antigo";

  return `
    <strong>${ponto.nome}</strong>
    <br>📍 ${ponto.bairro}
    <br>🏙️ ${ponto.cidade}
    <br>⚠️ Nível: <strong>${ponto.nivel}</strong>
    <br>🕒 Registrado: ${data}
    <br>${ponto.descricao || ""}
  `;
}

// ==========================================
// MOSTRAR / OCULTAR MARCADORES
// ==========================================

function renderizarMarcadoresOcorrencias() {
  if (!mapa) {
    return;
  }

  marcadoresOcorrencias.forEach(marcador => {
    mapa.removeLayer(marcador);
  });

  marcadoresOcorrencias = [];

  if (!ocorrenciasVisiveis) {
    return;
  }

  const ocorrenciasCidade = obterOcorrenciasDaCidade();

  ocorrenciasCidade.forEach(ponto => {
    if (
      !Number.isFinite(Number(ponto.latitude)) ||
      !Number.isFinite(Number(ponto.longitude))
    ) {
      return;
    }

    if (
      filtroAtual !== "todos" &&
      ponto.nivel !== filtroAtual
    ) {
      return;
    }

    const marcador = L.marker(
      [
        Number(ponto.latitude),
        Number(ponto.longitude)
      ],
      {
        icon: criarIconeOcorrencia(ponto.nivel)
      }
    )
      .addTo(mapa)
      .bindPopup(criarPopupOcorrencia(ponto));

    marcadoresOcorrencias.push(marcador);
  });
}

// ==========================================
// BOTÃO MOSTRAR / OCULTAR OCORRÊNCIAS
// ==========================================

function atualizarBotaoOcorrencias() {
  if (!toggleOcorrenciasBtn) {
    return;
  }

  toggleOcorrenciasBtn.textContent =
    ocorrenciasVisiveis
      ? "Ocultar ocorrências"
      : "Mostrar ocorrências";
}

if (toggleOcorrenciasBtn) {
  toggleOcorrenciasBtn.addEventListener("click", () => {
    ocorrenciasVisiveis = !ocorrenciasVisiveis;

    atualizarBotaoOcorrencias();
    renderizarMarcadoresOcorrencias();
    renderizarPontos();
  });
}

// ==========================================
// LISTA DE OCORRÊNCIAS DA CIDADE
// ==========================================

function renderizarPontos() {
  if (!listaRiscos) {
    return;
  }

  if (!ocorrenciasVisiveis) {
    listaRiscos.innerHTML = "<p>Ocorrências ocultas.</p>";
    return;
  }

  const ocorrenciasCidade = obterOcorrenciasDaCidade();

  if (ocorrenciasCidade.length === 0) {
    listaRiscos.innerHTML =
      "<p>Nenhuma ocorrência registrada para esta cidade.</p>";
    return;
  }

  listaRiscos.innerHTML = ocorrenciasCidade
    .map(ponto => {
      const data = ponto.dataRegistro
        ? new Date(ponto.dataRegistro).toLocaleString("pt-BR")
        : "Registro antigo";

      return `
        <div class="risk-card">
          <strong>${ponto.nome}</strong>
          <p>📍 ${ponto.bairro}, ${ponto.cidade}</p>
          <p>⚠️ Nível: <strong>${ponto.nivel}</strong></p>
          <p>🕒 Registrado: ${data}</p>
          ${ponto.descricao ? `<p>${ponto.descricao}</p>` : ""}
        </div>
      `;
    })
    .join("");
}

// ==========================================
// CADASTRAR OCORRÊNCIA
// ==========================================

cadastroForm.addEventListener("submit", async evento => {
  evento.preventDefault();

  const dados = new FormData(cadastroForm);

  const nome = String(dados.get("nome") || "").trim();
  const cidade = String(dados.get("cidade") || "").trim();
  const bairro = String(dados.get("bairro") || "").trim();
  const nivel = String(dados.get("nivel") || "").trim();
  const descricao = String(dados.get("descricao") || "").trim();

  cadastroMensagem.textContent = "Localizando ocorrência...";

  try {
    const resposta = await fetch(
      `/geocode/${encodeURIComponent(bairro)}?cidade=${encodeURIComponent(cidade)}`
    );

    const local = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        local.erro || "Não foi possível localizar o bairro."
      );
    }

    // Usa os dados da cidade consultada quando ela corresponde
    // à cidade informada no formulário.
    const cidadeConsultadaCorresponde =
      localAtual &&
      normalizarTexto(cidade) === normalizarTexto(localAtual.cidade);

    const novoPonto = {
      id: Date.now(),
      nome,
      cidade,
      bairro,
      nivel,
      descricao,
      latitude: Number(local.latitude),
      longitude: Number(local.longitude),
      dataRegistro: new Date().toISOString()
    };

    if (cidadeConsultadaCorresponde) {
      novoPonto.estado = localAtual.estado;
      novoPonto.pais = localAtual.pais;
    }

    pontosDeRisco.push(novoPonto);

    localStorage.setItem(
      "pontosDeRisco",
      JSON.stringify(pontosDeRisco)
    );

    renderizarPontos();
    renderizarMarcadoresOcorrencias();

    cadastroForm.reset();

    cadastroMensagem.textContent =
      "Ocorrência registrada com sucesso.";

    if (
      mapa &&
      localAtual &&
      normalizarTexto(cidade) === normalizarTexto(localAtual.cidade) &&
      ocorrenciasVisiveis
    ) {
      const marcador = L.marker(
        [novoPonto.latitude, novoPonto.longitude],
        {
          icon: criarIconeOcorrencia(novoPonto.nivel)
        }
      )
        .addTo(mapa)
        .bindPopup(criarPopupOcorrencia(novoPonto))
        .openPopup();

      marcadoresOcorrencias.push(marcador);
    }

    atualizarAlerta();

  } catch (erro) {
    console.error(erro);
    cadastroMensagem.textContent =
      erro.message || "Não foi possível registrar a ocorrência.";
  }
});

// ==========================================
// FILTROS
// ==========================================

botoesFiltro.forEach(botao => {
  botao.addEventListener("click", () => {
    filtroAtual = botao.dataset.filter;

    botoesFiltro.forEach(item => {
      item.classList.remove("active");
    });

    botao.classList.add("active");

    renderizarMarcadoresOcorrencias();
  });
});

// ==========================================
// MODO ESCURO
// ==========================================

if (darkModeToggle) {
  darkModeToggle.addEventListener("click", () => {
    const modoEscuro =
      document.body.dataset.theme === "dark";

    if (modoEscuro) {
      document.body.removeAttribute("data-theme");
      darkModeToggle.textContent = "🌙";
      localStorage.setItem("modoEscuro", "false");
    } else {
      document.body.dataset.theme = "dark";
      darkModeToggle.textContent = "☀️";
      localStorage.setItem("modoEscuro", "true");
    }
  });

  if (localStorage.getItem("modoEscuro") === "true") {
    document.body.dataset.theme = "dark";
    darkModeToggle.textContent = "☀️";
  }
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

renderizarPontos();
atualizarBotaoOcorrencias();