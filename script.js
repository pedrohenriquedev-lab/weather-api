const inputCidade = document.getElementById("cidade");
const botaoBuscar = document.getElementById("buscar");

const temperatura = document.getElementById("temperatura");
const umidade = document.getElementById("umidade");
const vento = document.getElementById("vento");

const precipitacao = document.getElementById("precipitacao");
const chuva = document.getElementById("chuva");
const pancadas = document.getElementById("pancadas");

const nomeCidade = document.getElementById("nome-cidade");
const pais = document.getElementById("pais");
const mensagem = document.getElementById("mensagem");

botaoBuscar.addEventListener("click", async () => {
    const cidade = inputCidade.value;

    mensagem.textContent = "";

 if (cidade.trim() === "") {
    mensagem.textContent = "Digite uma cidade para pesquisar.";
    return;
}

botaoBuscar.textContent = "⏳ Buscando...";
botaoBuscar.disabled = true;

    const url = `http://localhost:3000/weather/${encodeURIComponent(cidade)}`;

    try {
    const resposta = await fetch(url);

    const dados = await resposta.json();

    if (!resposta.ok) {
        mensagem.textContent = dados.erro;
        return;
    }

    temperatura.textContent = `${dados.clima.temperatura} °C`;
    umidade.textContent = `${dados.clima.umidade} %`;
    vento.textContent = `${dados.clima.vento} km/h`;

    precipitacao.textContent = `${dados.clima.precipitacao} mm`;
chuva.textContent = `${dados.clima.chuva} mm`;
pancadas.textContent = `${dados.clima.pancadas} mm`;

    nomeCidade.textContent = dados.cidade;
    pais.textContent = dados.pais;

    console.log(dados);

} catch (erro) {
    mensagem.textContent = "Não foi possível conectar com a API.";
    
} finally {
    botaoBuscar.textContent = "Buscar clima";
    botaoBuscar.disabled = false;
}
});