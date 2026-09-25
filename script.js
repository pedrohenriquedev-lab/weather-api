const cidadeInput = document.getElementById("cidadeInput");
const buscarBtn = document.getElementById("buscarBtn");
const mensagem = document.getElementById("mensagem");

const resultado = document.getElementById("resultado");

const cidadeNome = document.getElementById("cidadeNome");
const paisNome = document.getElementById("paisNome");

const temperatura = document.getElementById("temperatura");
const umidade = document.getElementById("umidade");
const vento = document.getElementById("vento");
const precipitacao = document.getElementById("precipitacao");

let mapa;
let marcador;


/* BUSCAR CIDADE */

buscarBtn.addEventListener("click", buscarCidade);

cidadeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    buscarCidade();
  }
});


async function buscarCidade() {

  const cidade = cidadeInput.value.trim();

  if (!cidade) {
    mensagem.textContent = "Digite o nome de uma cidade.";
    return;
  }

  mensagem.textContent = "Buscando informações...";
  resultado.classList.add("hidden");

  try {

    const resposta = await fetch(
      `http://localhost:3000/weather/${encodeURIComponent(cidade)}`
    );

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || "Cidade não encontrada.");
    }

    mostrarDados(dados);

    mensagem.textContent = "";

  } catch (erro) {

    console.error(erro);

    mensagem.textContent =
      "Não foi possível encontrar essa cidade.";

  }

}


/* MOSTRAR DADOS */

function mostrarDados(dados) {

  resultado.classList.remove("hidden");

  cidadeNome.textContent = dados.cidade;
  paisNome.textContent = dados.pais;

  temperatura.textContent = dados.clima.temperatura;
  umidade.textContent = dados.clima.umidade;
  vento.textContent = dados.clima.vento;
  precipitacao.textContent = dados.clima.precipitacao;

  criarMapa(
    dados.localizacao.latitude,
    dados.localizacao.longitude,
    dados.cidade
  );

}


/* MAPA */

function criarMapa(latitude, longitude, cidade) {

  if (!mapa) {

    mapa = L.map("map").setView(
      [latitude, longitude],
      12
    );

    L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      {
        attribution:
          '&copy; OpenStreetMap contributors'
      }
    ).addTo(mapa);

  } else {

    mapa.setView(
      [latitude, longitude],
      12
    );

  }

  if (marcador) {
    mapa.removeLayer(marcador);
  }

  marcador = L.marker([
    latitude,
    longitude
  ])
    .addTo(mapa)
    .bindPopup(
      `<strong>${cidade}</strong><br>Localização pesquisada`
    )
    .openPopup();

}