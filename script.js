let priceChart = null;
let pnlChart = null;

const nSlider = document.getElementById("nSlider");
const tSlider = document.getElementById("tSlider");
const s0Slider = document.getElementById("s0Slider");
const muSlider = document.getElementById("muSlider");
const sigmaSlider = document.getElementById("sigmaSlider");
const maSlider = document.getElementById("maSlider");

function aggiornaValoriUI() {
  document.getElementById("nValue").textContent = nSlider.value;
  document.getElementById("tValue").textContent = tSlider.value;
  document.getElementById("s0Value").textContent = s0Slider.value;
  document.getElementById("muValue").textContent = Number(muSlider.value).toFixed(2);
  document.getElementById("sigmaValue").textContent = Number(sigmaSlider.value).toFixed(2);
  document.getElementById("maValue").textContent = maSlider.value;
}

[nSlider, tSlider, s0Slider, muSlider, sigmaSlider, maSlider].forEach(slider => {
  slider.oninput = aggiornaValoriUI;
});

function generaNormaleStandard() {
  let u1 = Math.random();
  let u2 = Math.random();

  if (u1 === 0) {
    u1 = 0.000001;
  }

  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function generaGBM(T, n, s0, mu, sigma) {
  const dt = T / n;
  const prezzi = [s0];
  let w = 0;

  for (let i = 1; i <= n; i++) {
    const z = generaNormaleStandard();
    w += Math.sqrt(dt) * z;

    const t = i * dt;
    const prezzo = s0 * Math.exp((mu - 0.5 * sigma * sigma) * t + sigma * w);

    prezzi.push(prezzo);
  }

  return prezzi;
}

function calcolaMediaMobile(prezzi, finestra) {
  const ma = [];

  for (let i = 0; i < prezzi.length; i++) {
    if (i < finestra) {
      ma.push(null);
    } else {
      let somma = 0;

      for (let j = i - finestra; j < i; j++) {
        somma += prezzi[j];
      }

      ma.push(somma / finestra);
    }
  }

  return ma;
}

function applicaStrategia(prezzi, mediaMobile) {
  const posizione = [];
  const segnaliBuy = [];
  const segnaliSell = [];

  let pos = 0;
  let trades = 0;

  for (let i = 0; i < prezzi.length; i++) {
    segnaliBuy.push(null);
    segnaliSell.push(null);

    if (mediaMobile[i] === null) {
      posizione.push(0);
      continue;
    }

    if (prezzi[i] > mediaMobile[i] && pos === 0) {
      pos = 1;
      trades++;
      segnaliBuy[i] = prezzi[i];
    } else if (prezzi[i] < mediaMobile[i] && pos === 1) {
      pos = 0;
      trades++;
      segnaliSell[i] = prezzi[i];
    }

    posizione.push(pos);
  }

  return {
    posizione,
    segnaliBuy,
    segnaliSell,
    trades
  };
}

function calcolaPnL(prezzi, posizione) {
  const pnl = [0];
  let valorePnL = 0;

  for (let i = 1; i < prezzi.length; i++) {
    const variazionePrezzo = prezzi[i] - prezzi[i - 1];

    // posizione[i-1] perché il guadagno del periodo dipende dalla posizione già aperta
    valorePnL += posizione[i - 1] * variazionePrezzo;

    pnl.push(valorePnL);
  }

  return pnl;
}

function calcolaDrawdown(pnl) {
  const drawdown = [];
  let massimoStorico = pnl[0];
  let maxDrawdown = 0;

  for (let i = 0; i < pnl.length; i++) {
    if (pnl[i] > massimoStorico) {
      massimoStorico = pnl[i];
    }

    const dd = pnl[i] - massimoStorico;
    drawdown.push(dd);

    if (dd < maxDrawdown) {
      maxDrawdown = dd;
    }
  }

  return {
    drawdown,
    maxDrawdown
  };
}

function creaGraficoPrezzi(prezzi, mediaMobile, buySignals, sellSignals) {
  const labels = prezzi.map((_, i) => i);

  const ctx = document.getElementById("priceChart").getContext("2d");

  if (priceChart !== null) {
    priceChart.destroy();
  }

  priceChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "GBM Price",
          data: prezzi,
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        },
        {
          label: "Moving Average",
          data: mediaMobile,
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        },
        {
          label: "BUY",
          data: buySignals,
          type: "scatter",
          pointRadius: 6
        },
        {
          label: "SELL",
          data: sellSignals,
          type: "scatter",
          pointRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "GBM Price con segnali Buy/Sell"
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Step"
          }
        },
        y: {
          title: {
            display: true,
            text: "Price S(t)"
          }
        }
      }
    }
  });
}

function creaGraficoPnL(pnl, drawdown) {
  const labels = pnl.map((_, i) => i);

  const ctx = document.getElementById("pnlChart").getContext("2d");

  if (pnlChart !== null) {
    pnlChart.destroy();
  }

  pnlChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "PnL",
          data: pnl,
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        },
        {
          label: "Drawdown",
          data: drawdown,
          borderWidth: 2,
          pointRadius: 0,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: "PnL e Drawdown della strategia"
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: "Step"
          }
        },
        y: {
          title: {
            display: true,
            text: "Valore"
          }
        }
      }
    }
  });
}

function generaSimulazione() {
  const n = parseInt(nSlider.value);
  const T = parseFloat(tSlider.value);
  const s0 = parseFloat(s0Slider.value);
  const mu = parseFloat(muSlider.value);
  const sigma = parseFloat(sigmaSlider.value);
  const maWindow = parseInt(maSlider.value);

  const prezzi = generaGBM(T, n, s0, mu, sigma);
  const mediaMobile = calcolaMediaMobile(prezzi, maWindow);
  const strategia = applicaStrategia(prezzi, mediaMobile);
  const pnl = calcolaPnL(prezzi, strategia.posizione);
  const dd = calcolaDrawdown(pnl);

  document.getElementById("finalPnL").textContent = pnl[pnl.length - 1].toFixed(2);
  document.getElementById("maxDD").textContent = dd.maxDrawdown.toFixed(2);
  document.getElementById("numTrades").textContent = strategia.trades;

  creaGraficoPrezzi(
    prezzi,
    mediaMobile,
    strategia.segnaliBuy,
    strategia.segnaliSell
  );

  creaGraficoPnL(pnl, dd.drawdown);
}

aggiornaValoriUI();
generaSimulazione();
