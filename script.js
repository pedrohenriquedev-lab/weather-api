
"use strict";

// ==========================================
// ELEMENTOS DO HTML
// ==========================================

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

const toggleOcorrenciasBtn =
  document.getElementById("toggleOcorrenciasBtn");
const cadastroForm = document.getElementById("cadastroForm");
const cadastroMensagem = document.getElementById("cadastroMensagem");
const listaRiscos = document.getElementById("listaRiscos");
const botoesFiltro = document.querySelectorAll(".filter-btn");
const darkModeToggle = document.getElementById("darkModeToggle");

// ==========================================
// CONFIGURAÇÕES E VARIÁVEIS
// ==========================================

const HORAS_OCORRENCIA_ATUAL = 24;
const DISTANCIA_MAXIMA_KM = 2;

let mapa = null;
let marcadorCidade = null;
let camadaRisco = null;
let localAtual = null;
let climaAtual = null;
let marcadoresOcorrencias = [];
let filtroAtual = "todos";
let ocorrenciasVisiveis = false;
let pontosDeRisco = [];

function carregarOcorrencias() {
  try {
    const dados = JSON.parse(
      localStorage.getItem("pontosDeRisco") || "[]"
    );

    return Array.isArray(dados) ? dados : [];
  } catch (erro) {
    console.error("Erro ao carregar ocorrências:", erro);
    return [];
  }
}

pontosDeRisco = carregarOcorrencias();

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function escaparHTML(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, caractere => {
    const entidades = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entidades[caractere];
  });
}

function coordenadasValidas(ponto) {
  if (
    ponto.latitude === null ||
    ponto.latitude === undefined ||
    ponto.latitude === "" ||
    ponto.longitude === null ||
    ponto.longitude === undefined ||
    ponto.longitude === ""
  ) {
    return false;
  }

  const latitude = Number(ponto.latitude);
  const longitude = Number(ponto.longitude);

  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function chuvaFoiRegistrada(clima) {
  if (!clima) return false;

  const valores = [clima.chuva, clima.precipitacao];

  return valores.some(valor => {
    if (
      valor === null ||
      valor === undefined ||
      valor === ""
    ) {
      return false;
    }

    const numero = Number(valor);

    return Number.isFinite(numero) && numero > 0;
  });
}

function obterOcorrenciasDaCidade() {
  if (!localAtual) return [];

  const cidadeAtual = normalizarTexto(localAtual.cidade);
  const estadoAtual = normalizarTexto(localAtual.estado);
  const paisAtual = normalizarTexto(localAtual.pais);

  return pontosDeRisco.filter(ponto => {
    if (
      normalizarTexto(ponto.cidade) !== cidadeAtual
    ) {
      return false;
    }

    if (
      ponto.estado &&
      estadoAtual &&
      normalizarTexto(ponto.estado) !== estadoAtual
    ) {
      return false;
    }

    if (
      ponto.pais &&
      paisAtual &&
      normalizarTexto(ponto.pais) !== paisAtual
    ) {
      return false;
    }

    return true;
  });
}

function salvarOcorrencias() {
  try {
    localStorage.setItem(
      "pontosDeRisco",
      JSON.stringify(pontosDeRisco)
    );

    return true;
  } catch (erro) {
    console.error("Erro ao salvar ocorrências:", erro);
    return false;
  }
}

// ==========================================
// MAPA
// ==========================================

function inicializarMapa(latitude = -8.05, longitude = -34.90) {
  if (typeof L === "undefined") {
    console.error("Leaflet não foi carregado.");
    if (mensagem) {
      mensagem.textContent = "Não foi possível carregar o mapa.";
    }
    return;
  }

  if (mapa) {
    mapa.remove();
    mapa = null;
    marcadorCidade = null;
    marcadoresOcorrencias = [];
  }

  mapa = L.map("mapa").setView([latitude, longitude], 11);

  L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 19
    }
  ).addTo(mapa);

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
  );

  camadaRisco.addTo(mapa);

  renderizarMarcadoresOcorrencias();

  setTimeout(() => {
    if (mapa) mapa.invalidateSize();
  }, 200);
}

// ==========================================
// BUSCAR CIDADE
// ==========================================

async function buscarCidade(cidade) {
  if (!cidade) {
    mensagem.textContent = "Digite o nome de uma cidade.";
    return;
  }

  buscarBtn.disabled = true;
  mensagem.textContent = "Consultando dados meteorológicos...";

  try {
    const resposta = await fetch(
      `/weather/${encodeURIComponent(cidade)}`
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(
        dados.erro || "Cidade não encontrada."
      );
    }

    if (
      !dados.clima ||
      dados.latitude === undefined ||
      dados.longitude === undefined
    ) {
      throw new Error("A API retornou dados incompletos.");
    }

    cidadeNome.textContent =
      `${dados.cidade}${dados.estado ? " - " + dados.estado : ""}`;

    paisNome.textContent = dados.pais || "--";

    temperatura.textContent =
      dados.clima.temperatura != null
        ? `${dados.clima.temperatura} °C`
        : "--";

    umidade.textContent =
      dados.clima.umidade != null
        ? `${dados.clima.umidade}%`
        : "--";

    vento.textContent =
      dados.clima.vento != null
        ? `${dados.clima.vento} km/h`
        : "--";

    precipitacao.textContent =
      dados.clima.precipitacao != null
        ? `${dados.clima.precipitacao} mm`
        : "--";

    chuva.textContent =
      dados.clima.chuva != null
        ? `${dados.clima.chuva} mm`
        : "--";

    pancadas.textContent =
      dados.clima.pancadas != null
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

    resultado.classList.remove("hidden");

    inicializarMapa(
      localAtual.latitude,
      localAtual.longitude
    );

    if (mapa) {
      marcadorCidade = L.marker([
        localAtual.latitude,
        localAtual.longitude
      ])
        .addTo(mapa)
        .bindPopup(
          `<strong>${escaparHTML(dados.cidade)}</strong><br>Local consultado`
        )
        .openPopup();
    }

    ocorrenciasVisiveis = false;

    atualizarBotaoOcorrencias();
    renderizarMarcadoresOcorrencias();
    renderizarPontos();
    atualizarAlerta();

    mensagem.textContent =
      "Consulta realizada com sucesso.";

    if (monitorStatus) {
      monitorStatus.textContent =
        "Consulte um bairro para monitorar as condições locais.";
    }
  } catch (erro) {
    console.error("Erro ao buscar cidade:", erro);

    mensagem.textContent =
      erro.message || "Não foi possível consultar a cidade.";
  } finally {
    buscarBtn.disabled = false;
  }
}

if (buscarBtn) {
  buscarBtn.addEventListener("click", () => {
    buscarCidade(cidadeInput.value.trim());
  });
}

if (cidadeInput) {
  cidadeInput.addEventListener("keydown", evento => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      buscarCidade(cidadeInput.value.trim());
    }
  });
}

// ==========================================
// LOCALIZAÇÃO DO USUÁRIO
// ==========================================

if (geoBtn) {
  geoBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      mensagem.textContent =
        "Seu navegador não suporta geolocalização.";
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

          if (!resposta.ok) {
            throw new Error("Falha ao identificar a cidade.");
          }

          const dados = await resposta.json();

          if (dados.results && dados.results.length > 0) {
            const local = dados.results[0];
            cidadeInput.value = local.name || "";
            await buscarCidade(local.name);
          } else {
            mensagem.textContent =
              "Não foi possível identificar sua cidade.";
          }
        } catch (erro) {
          console.error(erro);
          mensagem.textContent =
            "Erro ao identificar sua localização.";
        }
      },
      erro => {
        console.error(erro);
        mensagem.textContent =
          "Permita o acesso à localização ou pesquise a cidade manualmente.";
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
}

// ==========================================
// MONITORAR BAIRRO OU LOCALIDADE
// ==========================================

async function monitorarLocal() {
  const bairro = bairroInput.value.trim();

  if (!bairro) {
    monitorStatus.textContent =
      "Digite um bairro ou localidade.";
    return;
  }

  if (!localAtual) {
    monitorStatus.textContent =
      "Primeiro consulte uma cidade.";
    return;
  }

  monitorarBtn.disabled = true;
  monitorStatus.textContent = "Localizando região...";

  try {
    const respostaLocal = await fetch(
      `/geocode/${encodeURIComponent(bairro)}?cidade=${encodeURIComponent(localAtual.cidade)}`
    );

    const dadosLocal = await respostaLocal.json();

    if (!respostaLocal.ok) {
      throw new Error(
        dadosLocal.erro || "Local não encontrado."
      );
    }

    const latitude = Number(dadosLocal.latitude);
    const longitude = Number(dadosLocal.longitude);

    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      throw new Error("Coordenadas inválidas para este local.");
    }

    monitorStatus.textContent =
      "Consultando condições meteorológicas...";

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

    if (mapa) {
      mapa.setView([latitude, longitude], 14);

      if (marcadorCidade) {
        mapa.removeLayer(marcadorCidade);
      }

      marcadorCidade = L.marker([latitude, longitude])
        .addTo(mapa)
        .bindPopup(
          `<strong>${escaparHTML(bairro)}</strong><br>${escaparHTML(localAtual.cidade)}`
        )
        .openPopup();
    }

    ocorrenciasVisiveis = false;

    atualizarBotaoOcorrencias();
    renderizarMarcadoresOcorrencias();
    renderizarPontos();

    const estaChovendo = chuvaFoiRegistrada(climaAtual);
    const horario = escaparHTML(dadosClima.horario || "--");

    monitorStatus.innerHTML = `
      <strong>${estaChovendo ? "🌧️ Chuva detectada no local" : "☀️ Sem chuva registrada no momento"}</strong>
      <br>Monitorando: ${escaparHTML(bairro)}, ${escaparHTML(localAtual.cidade)}
      <br><small>Atualizado às ${horario}</small>
    `;

    atualizarAlerta();
  } catch (erro) {
    console.error("Erro no monitoramento:", erro);

    monitorStatus.textContent =
      erro.message || "Não foi possível monitorar o local.";
  } finally {
    monitorarBtn.disabled = false;
  }
}

if (monitorarBtn) {
  monitorarBtn.addEventListener("click", monitorarLocal);
}

if (bairroInput) {
  bairroInput.addEventListener("keydown", evento => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      monitorarLocal();
    }
  });
}

// ==========================================
// CALCULAR DISTÂNCIA
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
// VERIFICAR DATA DA OCORRÊNCIA
// ==========================================

function ocorrenciaEhRecente(ponto) {
  if (!ponto.dataRegistro) return false;

  const dataRegistro =
    new Date(ponto.dataRegistro).getTime();

  if (!Number.isFinite(dataRegistro)) return false;

  const diferenca = Date.now() - dataRegistro;
  const limite =
    HORAS_OCORRENCIA_ATUAL * 60 * 60 * 1000;

  return diferenca >= 0 && diferenca <= limite;
}

// ==========================================
// OCORRÊNCIAS PRÓXIMAS
// ==========================================

function encontrarOcorrenciasProximas() {
  if (!localAtual) return [];

  return obterOcorrenciasDaCidade().filter(ponto => {
    if (
      !coordenadasValidas(ponto) ||
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

    return distancia <= DISTANCIA_MAXIMA_KM;
  });
}

// ==========================================
// ALERTA INTELIGENTE
// ==========================================

function atualizarAlerta() {
  if (!alerta || !localAtual || !climaAtual) return;

  alerta.style.display = "block";

  const chuvaDisponivel =
    climaAtual.chuva !== null &&
    climaAtual.chuva !== undefined &&
    climaAtual.chuva !== "" &&
    climaAtual.precipitacao !== null &&
    climaAtual.precipitacao !== undefined &&
    climaAtual.precipitacao !== "";

  if (!chuvaDisponivel) {
    alerta.className = "alert-box alert-atencao";
    alerta.innerHTML = `
      <strong>⚠️ Dados meteorológicos indisponíveis</strong>
      <p>Não foi possível avaliar as condições de chuva deste local.</p>
      <small>Tente consultar o clima novamente.</small>
    `;
    return;
  }

  const valorChuva = Number(climaAtual.chuva);
  const valorPrecipitacao = Number(climaAtual.precipitacao);

  if (
    !Number.isFinite(valorChuva) ||
    !Number.isFinite(valorPrecipitacao)
  ) {
    alerta.className = "alert-box alert-atencao";
    alerta.innerHTML = `
      <strong>⚠️ Não foi possível avaliar o risco</strong>
      <p>A API retornou valores meteorológicos inválidos.</p>
    `;
    return;
  }

  const chuvaAtual =
    valorChuva > 0 || valorPrecipitacao > 0;

  const ocorrenciasProximas =
    encontrarOcorrenciasProximas();

  const ocorrenciaAlta = ocorrenciasProximas.some(
    ponto => normalizarTexto(ponto.nivel) === "alto"
  );

  const ocorrenciaMedia = ocorrenciasProximas.some(
    ponto => normalizarTexto(ponto.nivel) === "medio"
  );

  alerta.className = "alert-box";

  if (chuvaAtual && ocorrenciaAlta) {
    alerta.classList.add("alert-alto");
    alerta.innerHTML = `
      <strong>🔴 Atenção: risco elevado de alagamento</strong>
      <p>Há chuva registrada e uma ocorrência comunitária recente de nível alto em até ${DISTANCIA_MAXIMA_KM} km.</p>
      <small>Relatos comunitários não confirmam, por si só, um alagamento atual. Acompanhe os avisos oficiais.</small>
    `;
    return;
  }

  if (chuvaAtual && ocorrenciaMedia) {
    alerta.classList.add("alert-elevado");
    alerta.innerHTML = `
      <strong>🟠 Atenção redobrada</strong>
      <p>Há chuva registrada e uma ocorrência comunitária recente de nível médio nas proximidades.</p>
      <small>Evite áreas alagadas e acompanhe os avisos oficiais.</small>
    `;
    return;
  }

  if (chuvaAtual) {
    alerta.classList.add("alert-atencao");
    alerta.innerHTML = `
      <strong>🟡 Atenção: chuva detectada</strong>
      <p>Há chuva registrada, mas não foram encontradas ocorrências comunitárias recentes próximas.</p>
      <small>A ausência de relatos não garante ausência de risco.</small>
    `;
    return;
  }

  if (ocorrenciaAlta) {
    alerta.classList.add("alert-atencao");
    alerta.innerHTML = `
      <strong>⚠️ Ocorrência recente nas proximidades</strong>
      <p>Há um relato comunitário recente de nível alto em até ${DISTANCIA_MAXIMA_KM} km, embora não exista chuva registrada neste momento.</p>
      <small>O relato não confirma risco atual. Verifique as condições locais.</small>
    `;
    return;
  }

  if (ocorrenciaMedia) {
    alerta.classList.add("alert-atencao");
    alerta.innerHTML = `
      <strong>🟡 Atenção: relato recente na região</strong>
      <p>Foi encontrada uma ocorrência comunitária recente de nível médio nas proximidades.</p>
      <small>Verifique as condições locais e acompanhe os avisos oficiais.</small>
    `;
    return;
  }

  alerta.classList.add("alert-normal");
  alerta.innerHTML = `
    <strong>🟢 Sem sinais atuais de alerta</strong>
    <p>Não há chuva registrada nem ocorrências comunitárias recentes próximas do local monitorado.</p>
    <small>Isso não garante ausência de risco de alagamento. Acompanhe os avisos oficiais.</small>
  `;
}

// ==========================================
// ÍCONES DOS MARCADORES
// ==========================================

function criarIconeOcorrencia(nivel) {
  let cor = "#facc15";

  if (normalizarTexto(nivel) === "alto") {
    cor = "#ef4444";
  } else if (normalizarTexto(nivel) === "medio") {
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
// POPUP DAS OCORRÊNCIAS
// ==========================================

function criarPopupOcorrencia(ponto) {
  const data = ponto.dataRegistro
    ? new Date(ponto.dataRegistro).toLocaleString("pt-BR")
    : "Registro antigo";

  return `
    <strong>${escaparHTML(ponto.nome)}</strong>
    <br>📍 ${escaparHTML(ponto.bairro)}
    <br>🏙️ ${escaparHTML(ponto.cidade)}
    <br>⚠️ Nível: <strong>${escaparHTML(ponto.nivel)}</strong>
    <br>🕒 Registrado: ${escaparHTML(data)}
    <br>${escaparHTML(ponto.descricao || "")}
  `;
}

// ==========================================
// MOSTRAR MARCADORES NO MAPA
// ==========================================

function renderizarMarcadoresOcorrencias() {
  if (!mapa) return;

  marcadoresOcorrencias.forEach(marcador => {
    mapa.removeLayer(marcador);
  });

  marcadoresOcorrencias = [];

  if (!ocorrenciasVisiveis) return;

  const ocorrenciasCidade = obterOcorrenciasDaCidade();

  ocorrenciasCidade.forEach(ponto => {
    if (!coordenadasValidas(ponto)) return;

    if (
      filtroAtual !== "todos" &&
      normalizarTexto(ponto.nivel) !== normalizarTexto(filtroAtual)
    ) {
      return;
    }

    const marcador = L.marker(
      [
        Number(ponto.latitude),
        Number(ponto.longitude)
      ],
      { icon: criarIconeOcorrencia(ponto.nivel) }
    )
      .addTo(mapa)
      .bindPopup(criarPopupOcorrencia(ponto));

    marcadoresOcorrencias.push(marcador);
  });
}

// ==========================================
// MOSTRAR / OCULTAR OCORRÊNCIAS
// ==========================================

function atualizarBotaoOcorrencias() {
  if (!toggleOcorrenciasBtn) return;

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
// LISTA DE OCORRÊNCIAS
// ==========================================

function renderizarPontos() {
  if (!listaRiscos) return;

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
          <strong>${escaparHTML(ponto.nome)}</strong>
          <p>📍 ${escaparHTML(ponto.bairro)}, ${escaparHTML(ponto.cidade)}</p>
          <p>⚠️ Nível: <strong>${escaparHTML(ponto.nivel)}</strong></p>
          <p>🕒 Registrado: ${escaparHTML(data)}</p>
          ${ponto.descricao
            ? `<p>${escaparHTML(ponto.descricao)}</p>`
            : ""}
        </div>
      `;
    })
    .join("");
}

// ==========================================
// REGISTRAR OCORRÊNCIA
// ==========================================

if (cadastroForm) {
  cadastroForm.addEventListener("submit", async evento => {
    evento.preventDefault();

    const dados = new FormData(cadastroForm);

    const nome = String(dados.get("nome") || "").trim();
    const cidade = String(dados.get("cidade") || "").trim();
    const bairro = String(dados.get("bairro") || "").trim();
    const nivel = String(dados.get("nivel") || "").trim();
    const descricao = String(dados.get("descricao") || "").trim();

    if (!nome || !cidade || !bairro || !nivel) {
      cadastroMensagem.textContent =
        "Preencha o nome, a cidade, o bairro e o nível de risco.";
      return;
    }

    if (!["Alto", "Médio", "Baixo"].includes(nivel)) {
      cadastroMensagem.textContent =
        "Selecione um nível de risco válido.";
      return;
    }

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

      const latitude = Number(local.latitude);
      const longitude = Number(local.longitude);

      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude)
      ) {
        throw new Error("A localização retornou coordenadas inválidas.");
      }

      const novoPonto = {
        id: Date.now(),
        nome,
        cidade,
        bairro,
        nivel,
        descricao,
        latitude,
        longitude,
        dataRegistro: new Date().toISOString()
      };

      const cidadeCorresponde =
        localAtual &&
        normalizarTexto(cidade) === normalizarTexto(localAtual.cidade);

      if (cidadeCorresponde) {
        novoPonto.estado = localAtual.estado;
        novoPonto.pais = localAtual.pais;
      }

      pontosDeRisco.push(novoPonto);

      if (!salvarOcorrencias()) {
        pontosDeRisco = pontosDeRisco.filter(
          ponto => ponto.id !== novoPonto.id
        );

        throw new Error(
          "Não foi possível salvar o registro neste navegador."
        );
      }

      if (cidadeCorresponde && ocorrenciasVisiveis) {
        renderizarMarcadoresOcorrencias();
      }

      renderizarPontos();
      atualizarAlerta();

      cadastroForm.reset();

      cadastroMensagem.textContent =
        "Ocorrência registrada com sucesso neste navegador.";
    } catch (erro) {
      console.error("Erro ao registrar ocorrência:", erro);

      cadastroMensagem.textContent =
        erro.message || "Não foi possível registrar a ocorrência.";
    }
  });
}

// ==========================================
// FILTROS DE RISCO
// ==========================================

botoesFiltro.forEach(botao => {
  botao.addEventListener("click", () => {
    filtroAtual = botao.dataset.filter || "todos";

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

function aplicarModoEscuro(ativado) {
  if (ativado) {
    document.body.dataset.theme = "dark";
    if (darkModeToggle) darkModeToggle.textContent = "☀️";
  } else {
    document.body.removeAttribute("data-theme");
    if (darkModeToggle) darkModeToggle.textContent = "🌙";
  }
}

if (darkModeToggle) {
  darkModeToggle.addEventListener("click", () => {
    const ativado =
      document.body.dataset.theme !== "dark";

    aplicarModoEscuro(ativado);

    localStorage.setItem(
      "modoEscuro",
      ativado ? "true" : "false"
    );
  });

  aplicarModoEscuro(
    localStorage.getItem("modoEscuro") === "true"
  );
}

// ==========================================
// INICIALIZAÇÃO
// ==========================================

atualizarBotaoOcorrencias();
renderizarPontos();
