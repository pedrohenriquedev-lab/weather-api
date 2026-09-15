const express = require("express");

const app = express();

const PORT = 3000;

app.get("/", (req, res) => {
  res.json({
    mensagem: "Weather API funcionando!"
  });
});

app.get("/weather/:cidade", async (req, res) => {
  const cidade = req.params.cidade;

  try {
    const resposta = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${cidade}&count=1&language=pt&format=json`
    );

    const dados = await resposta.json();

    if (!dados.results || dados.results.length === 0) {
      return res.status(404).json({
        erro: "Cidade não encontrada"
      });
    }

    const local = dados.results[0];

    const respostaClima = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${local.latitude}&longitude=${local.longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m`
    );

    const dadosClima = await respostaClima.json();

    res.json({
      cidade: local.name,
      pais: local.country,
      latitude: local.latitude,
      longitude: local.longitude,
      temperatura: dadosClima.current.temperature_2m,
      umidade: dadosClima.current.relative_humidity_2m,
      vento: dadosClima.current.wind_speed_10m
    });

  } catch (erro) {
    res.status(500).json({
      erro: "Erro ao buscar o clima"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});