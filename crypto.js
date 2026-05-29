let currentSort = "opportunity_score";

let sortDirection = "desc";

let currentTimeframe = "1h";

let currentScannerTimeframe = "1h";

let currentTradeFilter = "ALL";

let selectedCoinFilters = [];

let currentChartSymbol = null;

function formatPrice(price) {

  const value =
    Number(price) || 0;

  if (value >= 1000) {
    return value.toFixed(2);
  }

  if (value >= 1) {
    return value.toFixed(2);
  }

  if (value >= 0.1) {
    return value.toFixed(4);
  }

  if (value >= 0.01) {
    return value.toFixed(5);
  }

  return value.toFixed(6);

}

async function loadAnalytics() {

  try {

    const res = await fetch(

      `${window.API_BASE}/api/crypto/analytics?timeframe=${currentScannerTimeframe}`

    );

    const data = await res.json();
    console.log(data);

    const container =
  document.getElementById(
    "analyticsCards"
  );

if (!container) return;

container.innerHTML = `

  <div class="analytics-card">

    <div class="analytics-label">
      Avg EV After Est. Fees
    </div>

    <div class="analytics-value ${
      (data.avg_ev || 0) > 0
        ? "analytics-positive"
        : "analytics-negative"
    }">
      ${
        data.avg_ev != null
          ? `${data.avg_ev}%`
          : "—"
      }
    </div>

  </div>

  <div class="analytics-card">

    <div class="analytics-label">
      A-Grade Setups
    </div>

    <div class="analytics-value analytics-positive">
      ${data.a_grade_setups || 0}
    </div>

  </div>

  <div class="analytics-card">

    <div class="analytics-label">
      Positive EV Setups
    </div>

    <div class="analytics-value analytics-positive">
      ${data.positive_ev_setups || 0}
    </div>

  </div>

  <div class="analytics-card">

    <div class="analytics-label">
      Best Setup
    </div>

    <div class="analytics-value analytics-blue">
      ${data.best_setup || "—"}
    </div>

  </div>

  <div class="analytics-card">

    <div class="analytics-label">
      Avg R/R
    </div>

    <div class="analytics-value">
      ${
        data.avg_reward_risk != null
          ? data.avg_reward_risk
          : "—"
      }
    </div>

  </div>

  <div class="analytics-card">

    <div class="analytics-label">
      Market Regime
    </div>

    <div class="analytics-value analytics-blue">
      ${data.market_regime || "—"}
    </div>

  </div>

`;

  } catch (err) {

    console.error(
      err
    );

  }

}

async function loadTopCoins() {

  const tableDiv =
    document.getElementById(
      "cryptoTable"
    );

 

  try {

    tableDiv.classList.add(
    "table-loading"
    );

    const res = await fetch(
      `${window.API_BASE}/api/crypto/rankings?timeframe=${currentScannerTimeframe}`
    );

    const data = await res.json();

    if (!Array.isArray(data)) {

      tableDiv.innerHTML =
        "Invalid crypto data.";

      return;
    }

    let html = `
      <div class="crypto-table-wrap">
      <table class="crypto-table">
    <thead>

      <tr>

        <th data-sort="symbol">

          Coin

          <span class="th-subtitle">
            crypto
          </span>

          ${currentSort === "symbol"
            ? (sortDirection === "asc" ? " ↑" : " ↓")
            : ""}

        </th>

        <th data-sort="price">

          Price

          <span class="th-subtitle">
            current
          </span>

          ${currentSort === "price"
            ? (sortDirection === "asc" ? " ↑" : " ↓")
            : ""}

        </th>

        <th data-sort="change_24h">

          24h %

          <span class="th-subtitle">
            daily move
          </span>

          ${currentSort === "change_24h"
            ? (sortDirection === "asc" ? " ↑" : " ↓")
            : ""}

        </th>

        <th data-sort="short_momentum">

          20m %

          <span class="th-subtitle">
            short trend
          </span>

          ${currentSort === "short_momentum"
            ? (sortDirection === "asc" ? " ↑" : " ↓")
            : ""}

        </th>

        <th data-sort="relative_strength">

          RS vs BTC

          <span class="th-subtitle">
            vs bitcoin
          </span>

          ${currentSort === "relative_strength"
            ? (sortDirection === "asc" ? " ↑" : " ↓")
            : ""}

        </th>

        <th data-sort="dollar_volume">

          Volume

          <span class="th-subtitle">
            trading
          </span>

          ${currentSort === "dollar_volume"
            ? (sortDirection === "asc" ? " ↑" : " ↓")
            : ""}

        </th>

        <th data-sort="rvol">

          RVOL

          <span class="th-subtitle">
            volume spike
          </span>

          ${currentSort === "rvol"
            ? (sortDirection === "asc" ? " ↑" : " ↓")
            : ""}

        </th>

        <th data-sort="ema_trend">

          Trend

          <span class="th-subtitle">
            direction
          </span>

          ${currentSort === "ema_trend"
            ? (sortDirection === "asc" ? " ↑" : " ↓")
            : ""}

        </th>

        <th data-sort="signal">

          Signal

          <span class="th-subtitle">
            opportunity
          </span>

          ${currentSort === "signal"
            ? (sortDirection === "asc" ? " ↑" : " ↓")
            : ""}

        </th>

        <th data-sort="grade_weight">

        Setup

        <span class="th-subtitle">
          trade quality
        </span>

        ${currentSort === "grade_weight"
          ? (sortDirection === "asc" ? " ↑" : " ↓")
          : ""}

        </th>
        <th data-sort="confidence_score">

          Confidence

          <span class="th-subtitle">
            setup quality
          </span>

          ${currentSort === "confidence_score"
            ? (sortDirection === "asc" ? " ↑" : " ↓")
            : ""}

        </th>

        <th data-sort="volatility_regime">

          Regime

          <span class="th-subtitle">
            market condition
          </span>

          ${currentSort === "volatility_regime"
            ? (sortDirection === "asc" ? " ↑" : " ↓")
            : ""}

        </th>

        <th data-sort="risk">

          Risk

          <span class="th-subtitle">
            volatility
          </span>

          ${currentSort === "risk"
            ? (sortDirection === "asc" ? " ↑" : " ↓")
            : ""}

        </th>

        <th data-sort="volatility">

          Volatility

          <span class="th-subtitle">
            price swings
          </span>

          ${currentSort === "volatility"
            ? (sortDirection === "asc" ? " ↑" : " ↓")
            : ""}

        </th>

        <th data-sort="opportunity_score">

          Score

          <span class="th-subtitle">
            overall rating
          </span>

          ${currentSort === "opportunity_score"
            ? (sortDirection === "asc" ? " ↑" : " ↓")
            : ""}

        </th>

      </tr>

    </thead>

    <tbody>
`;

    

    data.sort((a, b) => {

  let valA = a[currentSort];
  let valB = b[currentSort];

  if (currentSort === "grade_weight") {

    valA =
      a.trade_quality === "A"
        ? 4
        : a.trade_quality === "B"
          ? 3
          : a.trade_quality === "C"
            ? 2
            : 1;

    valB =
      b.trade_quality === "A"
        ? 4
        : b.trade_quality === "B"
          ? 3
          : b.trade_quality === "C"
            ? 2
            : 1;
  }

  if (valA == null) valA = 0;
  if (valB == null) valB = 0;

  if (typeof valA === "string") {
    valA = valA.toLowerCase();
    valB = valB.toLowerCase();
  }

  if (valA < valB) {
    return sortDirection === "asc" ? -1 : 1;
  }

  if (valA > valB) {
    return sortDirection === "asc" ? 1 : -1;
  }

  return 0;
});

data.forEach(coin => {

  const coinSymbol =
  coin.symbol || "";

  if (
    selectedCoinFilters.length > 0 &&
    !selectedCoinFilters.includes(coinSymbol)
  ) {
    return;
  }   

  const change24h =
    coin.change_24h || 0;

  const momentum =
    coin.short_momentum || 0;

  const price =
    coin.price || 0;

  const volume =
    coin.dollar_volume || 0;

  const rvol =
    coin.rvol || 0;

  const volatility =
    coin.volatility || 0;

  const score =
    coin.opportunity_score || 0;

  const relativeStrength =
    coin.relative_strength || 0;

  const trend =
    coin.ema_trend || "Neutral";

  const direction =
  trend.toLowerCase() === "bullish"
    ? "LONG"
    : "SHORT";

  // Filter rows
  if (
    currentTradeFilter !== "ALL" &&
    direction !== currentTradeFilter
  ) {
    return;
  }

  const signal =
    coin.signal || "—";
  
  const setupType =
  coin.setup_type || coin.direction || "—";

  const tradeQuality =
    coin.trade_quality || "Avoid";

  const gradeWeight =
    tradeQuality === "A"
      ? 4
      : tradeQuality === "B"
        ? 3
        : tradeQuality === "C"
          ? 2
          : 1;

  const evAfterFee =
    coin.expected_value_after_fee ?? 0;

  const rewardRisk =
    coin.reward_risk ?? 0;

  const targetPct =
    coin.target_pct ?? 0;

  const stopLossPct =
    coin.stop_loss_pct ?? 0;

  const modelScore =
    coin.model_score ?? score;

  const qualityClass =
    tradeQuality === "A"
      ? "quality-a"
      : tradeQuality === "B"
        ? "quality-b"
        : tradeQuality === "C"
          ? "quality-c"
          : "quality-avoid";

  const evClass =
    evAfterFee > 0
      ? "green"
      : evAfterFee < 0
        ? "red"
        : "neutral";
  
  const risk =
    coin.risk || "Low";

  const changeClass =
  change24h > 0.25
    ? "green"
    : change24h < -0.25
      ? "red"
      : "neutral";

const momentumClass =
  momentum > 0.25
    ? "green"
    : momentum < -0.25
      ? "red"
      : "neutral";

const rsClass =
  relativeStrength > 0.25
    ? "green"
    : relativeStrength < -0.25
      ? "red"
      : "neutral";

const confidence =
  coin.confidence_score || 0;

  const strategyType =
  coin.strategy_type || "WATCHLIST";

let breakoutSetup = `

  <div class="setup-summary">

    <div class="grade-pill ${qualityClass}">
      ${tradeQuality}
    </div>

    <div class="setup-line">

  <div class="setup-main-line">



    <span>
      ${setupType}
    </span>

  </div>

  <div class="strategy-line">
    ${strategyType}
  </div>

</div>

    <div class="setup-metrics-line">

      <span class="${
        evAfterFee > 0
          ? "metric-positive"
          : "metric-negative"
      }">
        EV ${evAfterFee.toFixed(2)}%
      </span>

      <span class="metric-rr">
        • R/R ${rewardRisk.toFixed(2)}
      </span>

    </div>

  </div>

`;

if (coin.extended) {

  breakoutSetup += `

    <div class="
      setup-sub
      warning-sub
    ">
      ⚠️ Extended
    </div>

  `;

}

const confidenceClass =
  confidence >= 80
    ? "green"
    : confidence >= 65
      ? "neutral"
      : "red";
const regime =
  coin.volatility_regime || "NORMAL";

const regimeClass =
  regime === "COMPRESSION"
    ? "green"
    : regime === "EXPANSION"
      ? "neutral"
      : regime === "EXTREME"
        ? "red"
        : "neutral";

const topSignalClass =
  modelScore >= 1.5
    ? "top-signal-row"
    : "";

html += `

  <tr
  class="crypto-row ${topSignalClass}"
  data-symbol="${coin.symbol}"
  data-price="${price}"
  data-trend="${trend}"
  data-grade-weight="${gradeWeight}"
  data-setup-type="${setupType}"
  data-trade-quality="${tradeQuality}"
  data-ev="${evAfterFee}"
  data-rr="${rewardRisk}"
  data-target="${targetPct}"
  data-stop="${stopLossPct}"
  data-model-score="${modelScore}"
  data-confidence="${confidence}"
>

    <!-- Coin -->
    <td class="coin-cell">

      <img
        src="${coin.image || ""}"
        alt="${coin.symbol}"
        class="coin-logo"
      />

      <span>
        ${coin.symbol}
      </span>

    </td>

    <!-- Price -->
    <td>
      $${price.toLocaleString()}
    </td>

    <!-- 24h -->
    <td class="${changeClass}">
      ${change24h.toFixed(2)}%
    </td>

    <!-- 20m -->
    <td class="${momentumClass}">
      ${momentum.toFixed(2)}%
    </td>

    <!-- RS/BTC -->
    <td class="${rsClass}">
      ${relativeStrength.toFixed(2)}%
    </td>

    <!-- Volume -->
    <td>
      $${volume.toLocaleString()}
    </td>

    <!-- RVOL -->
    <td>
      ${rvol}x
    </td>

    <!-- Trend -->
    <td class="trend-${trend.toLowerCase()}">
      ${trend}
    </td>

    <!-- Signal -->
<td class="signal-cell ${
  signal === "—"
    ? "signal-empty"
    : ""
}">
  <span class="signal-icon">
    ${signal}
  </span>
</td>
        <!-- Setup -->
    <td class="setup-cell">
      ${breakoutSetup}
    </td>

    <!-- Confidence -->
    <td>
      <div class="confidence-wrap">

        <div class="confidence-bar-bg">

          <div
            class="confidence-bar ${confidenceClass}"
            style="width: ${confidence}%;"
          ></div>

        </div>

        <span class="confidence-text">
          ${confidence.toFixed(0)}%
        </span>

      </div>
    </td>

    <!-- Regime -->
    <td class="${regimeClass}">
      ${regime}
    </td>

    <!-- Risk -->
    <td class="risk-${risk.toLowerCase()}">
      ${risk}
    </td>

    <!-- Volatility -->
    <td>
      ${volatility.toFixed(3)}%
    </td>

    <!-- Score -->
    <td class="score-cell ${
      modelScore >= 1.5
        ? "top-score"
        : ""
    }">
      ${modelScore.toFixed(2)}
  </td>

  </tr>

`;
});

html += `
    </tbody>
  </table>
</div>
`;

tableDiv.innerHTML = html;

let rowTooltip =
  document.getElementById(
    "rowAiTooltip"
  );

if (!rowTooltip) {

  rowTooltip =
    document.createElement("div");

  rowTooltip.id =
    "rowAiTooltip";

  rowTooltip.className =
    "row-ai-tooltip";

  document.body.appendChild(
    rowTooltip
  );

}

tableDiv.classList.remove(
  "table-loading"
);


document
  .querySelectorAll(
    ".crypto-table th"
  )
  .forEach(header => {

    header.addEventListener(
      "click",
      () => {

        const sortKey =
          header.dataset.sort;

        if (!sortKey) return;

        if (
          currentSort === sortKey
        ) {

          sortDirection =
            sortDirection === "asc"
              ? "desc"
              : "asc";

        } else {

          currentSort =
            sortKey;

          sortDirection =
            "desc";
        }

        loadTopCoins();

      }
    );

});



document
  .querySelectorAll(
    ".crypto-row"
  )
  .forEach(row => {

    row.addEventListener(
      "click",
      () => {

        const symbol =
          row.dataset.symbol;

        // Remove previous selection
        document
          .querySelectorAll(
            ".crypto-row"
          )
          .forEach(r => {

            r.classList.remove(
              "selected-row"
            );

          });

        // Highlight selected row
        row.classList.add(
          "selected-row"
        );

        // Open chart modal
        // Match chart timeframe to scanner timeframe
      currentTimeframe =
        currentScannerTimeframe;

      // Sync modal timeframe buttons
      document
        .querySelectorAll(".tf-btn")
        .forEach(btn => {

          btn.classList.toggle(
            "active-tf",
            btn.dataset.timeframe === currentTimeframe
          );

        });


        
// Open chart modal
openChart(symbol);

      }
    );

    // =========================
    // AI Hover Tooltip
    // =========================

    row.addEventListener(
      "mouseenter",
      e => {

        let rowTooltip =
          document.getElementById(
            "rowAiTooltip"
          );

        if (!rowTooltip) {

          rowTooltip =
            document.createElement(
              "div"
            );

          rowTooltip.id =
            "rowAiTooltip";

          rowTooltip.className =
            "row-ai-tooltip";

          document.body.appendChild(
            rowTooltip
          );

        }

        const entry =
          Number(row.dataset.price || 0);

        const targetPct =
          Number(row.dataset.target || 0);

        const stopPct =
          Number(row.dataset.stop || 0);

        const trend =
          row.dataset.trend || "Neutral";

        const direction =
          trend.toLowerCase() === "bullish"
            ? "LONG"
            : "SHORT";

        const targetPrice =
          direction === "LONG"
            ? entry * (1 + targetPct / 100)
            : entry * (1 - targetPct / 100);

        const stopPrice =
          direction === "LONG"
            ? entry * (1 - stopPct / 100)
            : entry * (1 + stopPct / 100);

        const biasClass =
          direction === "LONG"
            ? "long"
            : "short";

        rowTooltip.innerHTML = `

          <div class="row-ai-tooltip-title">
            🧠 AI Trade Breakdown
          </div>

          <div class="row-ai-tooltip-badge ${biasClass}">
            ${direction} Setup
          </div>

          <div>
            <strong>Setup:</strong>
            ${row.dataset.setupType || "N/A"}
          </div>

          <div>
            <strong>Grade:</strong>
            ${row.dataset.tradeQuality || "N/A"}
          </div>

          <div>
            <strong>Trend:</strong>
            ${row.dataset.trend || "N/A"}
          </div>

          <div>
            <strong>EV:</strong>
            ${Number(
              row.dataset.ev || 0
            ).toFixed(2)}%
          </div>

          <div>
            <strong>Risk/Reward:</strong>
            ${Number(
              row.dataset.rr || 0
            ).toFixed(2)}:1
          </div>

          <br>

          <div>
            <strong>Entry:</strong>
            $${formatPrice(entry)}
          </div>

          <div>
            <strong>Target:</strong>
            $${formatPrice(targetPrice)}
          </div>

          <div>
            <strong>Stop:</strong>
            $${formatPrice(stopPrice)}
          </div>

          <br>

          <div>

            ${
              direction === "LONG"
                ? "🟢 AI expects upside continuation if momentum improves."
                : "🔴 AI sees downside risk and short-term seller control."
            }

          </div>

        `;

        rowTooltip.style.display =
          "block";

      }
    );

    row.addEventListener(
      "mousemove",
      e => {

        const rowTooltip =
          document.getElementById(
            "rowAiTooltip"
          );

        if (!rowTooltip) return;

        const tooltipWidth = 340;
const tooltipHeight =
  rowTooltip.offsetHeight || 260;

let left =
  e.clientX + 18;

let top =
  e.clientY + 18;

if (
  left + tooltipWidth >
  window.innerWidth
) {
  left =
    e.clientX - tooltipWidth - 18;
}

if (
  top + tooltipHeight >
  window.innerHeight
) {
  top =
    e.clientY - tooltipHeight - 18;
}

rowTooltip.style.left =
  `${left}px`;

rowTooltip.style.top =
  `${top}px`;

      }
    );

    row.addEventListener(
      "mouseleave",
      () => {

        const rowTooltip =
          document.getElementById(
            "rowAiTooltip"
          );

        if (rowTooltip) {

          rowTooltip.style.display =
            "none";

        }

      }
    );

});

  } catch (err) {

    console.error(err);

    tableDiv.innerHTML =
      "Failed to load crypto data.";

  }

}

loadTopCoins();

async function openChart(symbol) {

  currentChartSymbol = symbol;

  const modal =
    document.getElementById(
      "chartModal"
    );

  const title =
    document.getElementById(
      "chartTitle"
    );


  const container =
    document.getElementById(
      "chartContainer"
    );



  modal.classList.remove(
    "hidden"
  );

  container.innerHTML = "";

  const res = await fetch(
    `${window.API_BASE}/api/crypto/candles/${symbol}?timeframe=${currentTimeframe}`
  );

  let candles =
  await res.json();

candles = candles.filter(c => {
  const volume =
    Number(c.volume || 0);

  const open =
    Number(c.open);

  const high =
    Number(c.high);

  const low =
    Number(c.low);

  const close =
    Number(c.close);

  const isFlat =
    open === high &&
    high === low &&
    low === close;

  return !(
    isFlat &&
    volume === 0
  );
});

  // Prevent crashes on empty data
  if (!candles || !candles.length) {

    container.innerHTML =
      "<div style='color:white'>No candle data found.</div>";

    return;

  }

  const latest =
    candles[candles.length - 1];


  // =========================
  // Format Candles
  // =========================

  const formattedCandles =
    candles.map(candle => ({

      time:
        Math.floor(
          new Date(
            candle.time
          ).getTime() / 60000
        ) * 60,

      open:
        candle.open,

      high:
        candle.high,

      low:
        candle.low,

      close:
        candle.close,

      volume:
        candle.volume || 0

    }));

  // =========================
  // EMA + Volume Data
  // =========================

  const emaData = [];

  const volumeData = [];

  let ema = null;

  const period = 20;

  formattedCandles.forEach(
    candle => {

      if (ema === null) {

        ema = candle.close;

      } else {

        const multiplier =
          2 / (period + 1);

        ema =
          (
            candle.close
            - ema
          ) * multiplier
          + ema;

      }

      emaData.push({

        time:
          candle.time,

        value:
          ema

      });

      


      volumeData.push({

      time:
        candle.time,

      value:
        candle.volume || 0,

      color:
        candle.close >= candle.open
          ? "rgba(34,197,94,0.28)"
          : "rgba(239,68,68,0.28)"

    });
  });

  console.log(
    candles
  );

  // =========================
  // Create Chart
  // =========================

  window.currentChart =
    LightweightCharts.createChart(
      container,
      {

        layout: {

          background: {
            color: "#0d1117"
          },

          textColor: "#d1d5db",

          attributionLogo: false

        },

        grid: {

          vertLines: {
            color: "#1f2937"
          },

          horzLines: {
            color: "#1f2937"
          }

        },

        rightPriceScale: {

          borderColor: "#374151",

          scaleMargins: {

            top: 0.1,

            bottom: 0.25

          }

        },

        timeScale: {

          borderColor: "#374151",

          barSpacing: 8,

          minBarSpacing: 6

        },

        crosshair: {
          

          mode: 1

        },
        

        width:
          container.clientWidth,

        height:
          container.clientHeight

      }
    );

   

  // =========================
  // Candle Series
  // =========================

  const candleSeries =
    window.currentChart.addSeries(
      LightweightCharts.CandlestickSeries,
      {

        upColor: "#22c55e",

        downColor: "#ef4444",

        borderVisible: false,

        wickUpColor: "#22c55e",

        wickDownColor: "#ef4444"

      }
    );

  // =========================
  // EMA Series
  // =========================

  // =========================================
  // EMA Trend Line
  // Blue line helps show overall trend direction
  // Price above line = bullish trend
  // Price below line = weakness
  // =========================================

  const emaSeries =
    window.currentChart.addSeries(
      LightweightCharts.LineSeries,
      {

        color: "#3b82f6",

        lineWidth: 2,

        priceLineVisible: false,

        lastValueVisible: false

      }
    );

  // =========================
  // Volume Series
  // =========================

  const volumeSeries =
    window.currentChart.addSeries(
      LightweightCharts.HistogramSeries,
      {

        priceFormat: {
          type: "volume"
        },

        priceScaleId: "volume",

        priceScale: {
          scaleMargins: {
            top: 0.88,
            bottom: 0
          }
        }

      }
    );

  // =========================
  // Set Data
  // =========================

  candleSeries.setData(
    formattedCandles
  );



  emaSeries.setData(
    emaData
  );

  volumeSeries.setData(
    volumeData
  );

  
  // =========================
// AI Insight System
// =========================

const latestEma =
  emaData[emaData.length - 1]?.value || 0;

  // ========================================
// Ideal Pullback Entry Zone
// ========================================

const idealEntryLow =
  latestEma * 0.995;

const idealEntryHigh =
  latestEma * 1.01;

let isBullish =
  latest.close > latestEma;
let selectedRanking = null;

try {

  const rankingRes = await fetch(
    `${window.API_BASE}/api/crypto/rankings?timeframe=${currentTimeframe}`
  );

  const rankingData =
    await rankingRes.json();

  if (
    Array.isArray(rankingData)
  ) {

    selectedRanking =
      rankingData.find(
        coin => coin.symbol === symbol
      );

  }

} catch (err) {

  console.error(
    "Failed to load selected ranking",
    err
  );

}
// Pull live values from selected coin row
let momentum = 0;
let rvol = 0;
let volatility = 0;
let confidenceScore = 0;
let setupType = "—";
let tradeQuality = "Avoid";
let evAfterFee = 0;
let rewardRisk = 0;
let targetPct = 0;
let stopLossPct = 0;
let modelScore = 0;

if (selectedRanking) {

  momentum =
    parseFloat(selectedRanking.short_momentum) || 0;

  rvol =
    parseFloat(selectedRanking.rvol) || 0;

  volatility =
    parseFloat(selectedRanking.volatility) || 0;

  setupType =
    selectedRanking.setup_type
    || selectedRanking.direction
    || "—";

  tradeQuality =
    selectedRanking.trade_quality
    || "Avoid";

  evAfterFee =
    parseFloat(selectedRanking.expected_value_after_fee) || 0;

  rewardRisk =
    parseFloat(selectedRanking.reward_risk) || 0;

  targetPct =
    parseFloat(selectedRanking.target_pct) || 0;

  stopLossPct =
    parseFloat(selectedRanking.stop_loss_pct) || 0;

  modelScore =
    parseFloat(selectedRanking.model_score) || 0;

  confidenceScore =
    parseFloat(selectedRanking.confidence_score) || 0;

      isBullish =
    (
      selectedRanking.ema_trend || ""
    ).toLowerCase() === "bullish";

}

let aiInsight = "";


// =========================
// Momentum Analysis
// =========================

if (
  momentum > 8
) {

  aiInsight += `
    <div class="ai-line warning">
      ⚠️ Price moved aggressively in a short time. Avoid chasing vertical candles.
    </div>

    <div class="ai-line neutral">
      🎯 Ideal pullback zone:
      $${idealEntryLow.toFixed(2)}
      -
      $${idealEntryHigh.toFixed(2)}
    </div>
  `;
}

// Strong bullish momentum
else if (
  isBullish &&
  momentum > 2
) {

  aiInsight += `
    <div class="ai-line bullish">
      🔥 Buyers are aggressively controlling short-term momentum.
    </div>
  `;

}

// Moderate bullish
else if (
  isBullish &&
  momentum > 0.5
) {

  aiInsight += `
    <div class="ai-line bullish">
      📈 Momentum is improving and buyers remain in control.
    </div>
  `;

}

// Bearish
else if (
  !isBullish
) {

  aiInsight += `
    <div class="ai-line bearish">
      ❄️ Sellers currently have short-term control.
    </div>
  `;

}

// Neutral
else {

  aiInsight += `
    <div class="ai-line neutral">
      ➖ Momentum is currently neutral.
    </div>
  `;

}

// =========================
// Volume Analysis
// =========================

if (
  rvol >= 3
) {

  aiInsight += `
    <div class="ai-line bullish">
      🚀 Trading activity is surging well above normal levels.
    </div>
  `;

}

else if (
  rvol >= 1.5
) {

  aiInsight += `
    <div class="ai-line neutral">
      📈 Trading volume is elevated, showing increased market participation.
    </div>
  `;

}

else {

  aiInsight += `
    <div class="ai-line warning">
      ⚠️ Volume is relatively weak. Breakouts may lack conviction.
    </div>
  `;

}
// =========================
// Breakout Confirmation
// =========================

const breakoutConfirmed =
  latest.close > latestEma &&
  (
    momentum > 0.5 ||
    rvol > 1.5 ||
    confidenceScore >= 70
  );

if (
  breakoutConfirmed
) {

  aiInsight += `
    <div class="ai-line bullish">
      ✅ Breakout confirmation detected. Buyers and volume are aligned.
    </div>
  `;

} else {

  aiInsight += `
    <div class="ai-line warning">
      🟡  Setup is forming. Waiting for stronger confirmation.
    </div>
  `;

}
// Trend
if (
  isBullish
) {

  aiInsight += `
    <div class="ai-line bullish">
      🟢 Price remains above the blue trend line, supporting bullish continuation.
    </div>
  `;

} else {

  aiInsight += `
    <div class="ai-line bearish">
      🔻 Price is below the blue trend line, signaling weakness.
    </div>
  `;

}

// =========================
// Volatility Analysis
// =========================

if (
  volatility > 15
) {

  aiInsight += `
    <div class="ai-line warning">
      🚨 Extremely volatile conditions detected. Large swings and fakeouts are possible.
    </div>
  `;

}

else if (
  volatility > 5
) {

  aiInsight += `
    <div class="ai-line warning">
      ⚠️ Volatility is elevated, so larger price swings are possible.
    </div>
  `;

}

else {

  aiInsight += `
    <div class="ai-line neutral">
      ✅ Volatility remains relatively controlled.
    </div>
  `;

}
// Confidence
if (
  confidenceScore >= 75
) {

  aiInsight += `
    <div class="ai-line bullish">
      🧠 Multiple indicators align, increasing setup confidence.
    </div>
  `;

}
// ========================================
// Backend Trade Plan
// ========================================

const entry =
  latest.close;

const stopDistance =
  entry * (
    stopLossPct / 100
  );

const targetDistance =
  entry * (
    targetPct / 100
  );

const stop =
  isBullish
    ? entry - stopDistance
    : entry + stopDistance;

const target =
  isBullish
    ? entry + targetDistance
    : entry - targetDistance;

const safeSell =
  isBullish
    ? entry + (
        targetDistance * 0.7
      )
    : entry - (
        targetDistance * 0.7
      );

const partialProfit =
  isBullish
    ? entry + (
        targetDistance * 0.4
      )
    : entry - (
        targetDistance * 0.4
      );

const riskReward =
  rewardRisk.toFixed(2);

const tradeBias =
  isBullish
    ? "LONG"
    : "SHORT";

const tradeBiasClass =
  tradeBias === "LONG"
    ? "trade-bias-long"
    : "trade-bias-short";

const tradeBiasLabel =
  tradeBias === "LONG"
    ? "🟢 LONG Setup"
    : "🔴 SHORT Setup";

let tradeAction = "Avoid";

if (
  tradeQuality === "A"
) {

  tradeAction = "Strong setup — wait for confirmation before entry.";

} else if (
  tradeQuality === "B"
) {

  tradeAction = "Good watchlist setup — wait for price confirmation.";

} else if (
  tradeQuality === "C"
) {

  tradeAction = "Developing setup — small size or watch only.";

}

// ====================================
// Trade Levels
// ====================================

const entrySeries =
  window.currentChart.addSeries(
    LightweightCharts.LineSeries,
    {
      color: "#22c55e",
      lineWidth: 2,
      lineStyle: 1,
      lastValueVisible: true,
      priceLineVisible: true
    }
  );

entrySeries.setData(
  formattedCandles.map(c => ({
    time: c.time,
    value: entry
  }))
);

const stopSeries =
  window.currentChart.addSeries(
    LightweightCharts.LineSeries,
    {
      color: "#ef4444",
      lineWidth: 2,
      lineStyle: 1,
      lastValueVisible: true,
      priceLineVisible: true
    }
  );

stopSeries.setData(
  formattedCandles.map(c => ({
    time: c.time,
    value: stop
  }))
);

const targetSeries =
  window.currentChart.addSeries(
    LightweightCharts.LineSeries,
    {
      color: "#3b82f6",
      lineWidth: 2,
      lineStyle: 1,
      lastValueVisible: true,
      priceLineVisible: true
    }
  );

targetSeries.setData(
  formattedCandles.map(c => ({
    time: c.time,
    value: target
  }))
);

// ====================================
// Safe Sell Line
// ====================================

const safeSellSeries =
  window.currentChart.addSeries(
    LightweightCharts.LineSeries,
    {
      color: "#22c55e",
      lineWidth: 1,
      lineStyle: 2,
      lastValueVisible: true,
      priceLineVisible: true
    }
  );

safeSellSeries.setData(
  formattedCandles.map(c => ({
    time: c.time,
    value: safeSell
  }))
);

// ====================================
// Partial Profit Line
// ====================================

const partialSeries =
  window.currentChart.addSeries(
    LightweightCharts.LineSeries,
    {
      color: "#facc15",
      lineWidth: 1,
      lineStyle: 2,
      lastValueVisible: true,
      priceLineVisible: true
    }
  );

partialSeries.setData(
  formattedCandles.map(c => ({
    time: c.time,
    value: partialProfit
  }))
);

// =========================
// Update Header
// =========================

document
  .getElementById(
    "chartTitle"
  )
  .innerHTML = `

    ${symbol} Chart

    <span class="
      chart-signal-badge
    ">

      ${tradeBias} • ${setupType} • ${tradeQuality} Grade
    </span>

  `;

// =========================
// Update Stats
// =========================

document
  .getElementById(
    "chartStats"
  )
  .innerHTML = `

    <div class="chart-stat">
      <strong>Price:</strong>
      $${formatPrice(latest.close)}
    </div>

    <div class="chart-stat">
      <strong>Trend:</strong>
      ${
        isBullish
          ? "Bullish"
          : "Bearish"
      }
    </div>

    <div class="chart-stat">
      <strong>High:</strong>
      $${formatPrice(latest.high)}
    </div>

    <div class="chart-stat">
      <strong>Low:</strong>
      $${formatPrice(latest.low)}
    </div>

    <div class="chart-stat">
      <strong>Volume:</strong>
      ${Math.round(
        latest.volume || 0
      ).toLocaleString()}
    </div>

    <div class="chart-stat">
      <strong>TF:</strong>
      ${currentTimeframe.toUpperCase()}
    </div>

    <div class="chart-ai-box">

      <div class="chart-ai-title">
        🧠 AI Market Insight
      </div>

      <div class="trade-decision-box horizontal-trade-plan">

      <div class="trade-decision-title">
        Trade Plan
      </div>

      <div class="trade-decision-grid">

          <div>
            <strong>Setup:</strong>
            <span class="${tradeBiasClass}">
              ${tradeBiasLabel}
          </span>
          ${setupType}
          </div>

          <div>
            <strong>Grade:</strong>
            ${tradeQuality}
          </div>

          <div>
            <strong>EV:</strong>
            ${evAfterFee.toFixed(2)}%
          </div>

          <div>
            <strong>R/R:</strong>
            ${riskReward}:1
          </div>

        </div>

        <div class="trade-action">
          ${tradeAction}
        </div>

      </div>

      <div class="chart-ai-subtitle">
        AI-generated market guidance for beginner traders.
      </div>

      <div class="trade-setup-box">

        <div class="trade-item">
          🎯 Reward Potential:
          <span>
            ${riskReward}R
          </span>
        </div>

        <div class="trade-item">
          🛑 Stop:
          <span>
            $${formatPrice(stop)}
          </span>
        </div>

        <div class="trade-item">
          🎯 Target:
          <span>
            $${formatPrice(target)}
          </span>
        </div>

        <div class="trade-item">
          💰 Safe Sell:
          <span>
            $${formatPrice(safeSell)}
          </span>
        </div>

        <div class="trade-item">
          🪙 Partial Profit:
          <span>
            $${formatPrice(partialProfit)}
          </span>
        </div>

        <div class="trade-item">
          ⚖️ Risk/Reward:
          <span>
            ${riskReward}:1
          </span>
        </div>

      </div>

      <div class="chart-ai-insights">
        ${aiInsight}
      </div>

    </div>

  `;

window.currentChart
  .timeScale()
  .fitContent();

// =========================
// Tooltip
// =========================

const tooltip =
  document.getElementById(
    "chartTooltip"
  );

window.currentChart.subscribeCrosshairMove(param => {

  if (
    !param.time ||
    !param.seriesData ||
    !param.point
  ) {

    tooltip.style.display = "none";
    return;

  }

  let candle = null;

  if (
    typeof param.seriesData.get === "function"
  ) {

    candle =
      param.seriesData.get(
        candleSeries
      );

  } else {

    candle =
      Object.values(
        param.seriesData
      )[0];

  }

  if (!candle) return;

  const percentMove =
    (
      (
        candle.close -
        candle.open
      ) / candle.open
    ) * 100;

  tooltip.style.display = "block";

  const containerRect =
    container.getBoundingClientRect();

  tooltip.style.left =
    `${
      containerRect.left +
      param.point.x +
      20
    }px`;

  const tooltipWidth = 160;
const tooltipHeight = 120;

let left =
  containerRect.left +
  param.point.x +
  20;

let top =
  containerRect.top +
  param.point.y +
  20 +
  window.scrollY;

// Prevent tooltip going off right side
if (
  left + tooltipWidth >
  window.innerWidth
) {
  left =
    containerRect.left +
    param.point.x -
    tooltipWidth -
    20;
}

// Prevent tooltip going off bottom
if (
  top + tooltipHeight >
  window.innerHeight +
  window.scrollY
) {
  top =
    containerRect.top +
    param.point.y -
    tooltipHeight -
    20 +
    window.scrollY;
}

tooltip.style.left = `${left}px`;
tooltip.style.top = `${top}px`;

  tooltip.innerHTML = `

    <strong>
      ${symbol}
    </strong>

    <br>

    Open:
    $${formatPrice(candle.open)}

    <br>

    High:
    $${formatPrice(candle.high)}

    <br>

    Low:
    $${formatPrice(candle.low)}

    <br>

    Close:
    $${formatPrice(candle.close)}

    <br>

    Move:
    ${percentMove.toFixed(2)}%

  `;



});
document
  .getElementById(
    "zoomIn"
  )
  .onclick = () => {

    const scale =
      window.currentChart
        .timeScale();

    scale.scrollToPosition(
      scale.scrollPosition() - 10,
      false
    );

};

document
  .getElementById(
    "zoomOut"
  )
  .onclick = () => {

    const scale =
      window.currentChart
        .timeScale();

    scale.scrollToPosition(
      scale.scrollPosition() + 10,
      false
    );

};

document
  .getElementById(
    "resetZoom"
  )
  .onclick = () => {

    window.currentChart
      .timeScale()
      .fitContent();

};

  window.addEventListener(
    "resize",
    () => {

      window.currentChart.applyOptions({

        width:
          container.clientWidth,

        height:
          container.clientHeight

      });

    }
  );

}

document
  .getElementById(
    "closeChart"
  )
  .addEventListener(
    "click",
    () => {

      document
        .getElementById(
          "chartModal"
        )
        .classList.add(
          "hidden"
        );

    }
);

// ====================================
// Timeframe Buttons
// ====================================

document
  .querySelectorAll(
    ".tf-btn"
  )
  .forEach(btn => {

    btn.addEventListener(
      "click",
      () => {

        currentTimeframe =
          btn.dataset.timeframe;


        // Active button styling
        document
          .querySelectorAll(
            ".tf-btn"
          )
          .forEach(b => {

            b.classList.remove(
              "active-tf"
            );

          });

        btn.classList.add(
          "active-tf"
        );

        // Reload currently selected chart
        if (!currentChartSymbol) return;

        openChart(currentChartSymbol);

       }
   );

});
 let currentAnalyticsWindow = "1h";
// ====================================
// AI Performance Center
// ====================================

document
  .getElementById("openAnalyticsBtn")
  .addEventListener("click", async () => {

    const modal =
      document.getElementById("analyticsModal");

    modal.classList.remove("hidden");

    const res =
      await fetch(
        `${window.API_BASE}/api/crypto/performance?window=${currentAnalyticsWindow}`
      );

    const data =
      await res.json();

    renderPerformanceAnalytics(data);

  });

document
  .getElementById("closeAnalytics")
  .addEventListener("click", () => {

    document
      .getElementById("analyticsModal")
      .classList.add("hidden");

  });

function renderPerformanceAnalytics(data) {

  const el =
    document.getElementById(
      "analyticsContainer"
    );

  const windowLabel =
    data.return_window || "1H";

  el.innerHTML = `

    <div class="performance-card">
      <h3>Overall Win Rate</h3>
      <div class="value">
        ${data.win_rate ?? "—"}%
      </div>
      <div class="sample-count">
        ${data.win_rate_count ?? 0} signals
      </div>
    </div>

    <div class="performance-card">
      <h3>A-Grade Win Rate</h3>
      <div class="value">
        ${data.a_grade_win_rate ?? "—"}%
      </div>
      <div class="sample-count">
        ${data.a_grade_count ?? 0} signals
      </div>
    </div>

    <div class="performance-card">
      <h3>LONG Win Rate</h3>
      <div class="value">
        ${data.long_win_rate ?? "—"}%
      </div>
      <div class="sample-count">
        ${data.long_count ?? 0} signals
      </div>
    </div>

    <div class="performance-card">
      <h3>SHORT Win Rate</h3>
      <div class="value">
        ${data.short_win_rate ?? "—"}%
      </div>
      <div class="sample-count">
        ${data.short_count ?? 0} signals
      </div>
    </div>

    <div class="performance-card">
      <h3>Best Timeframe</h3>
      <div class="value">
        ${data.best_timeframe ?? "—"}
      </div>
      <div class="sample-count">
        highest expected return
      </div>
    </div>

    <div class="performance-card">
      <h3>
        Expected Return
        <span
          class="info-dot"
          title="Average result of similar historical signals over the selected timeframe."
        >
          ⓘ
        </span>
      </h3>

      <div class="value ${
        (data.expected_return || 0) > 0
          ? "positive-value"
          : (data.expected_return || 0) < 0
            ? "negative-value"
            : ""
      }">
        ${data.expected_return ?? "—"}%
      </div>

      <div class="sample-count">
        avg ${windowLabel} return • ${data.expected_return_count ?? 0} signals
      </div>

      <div class="
        edge-status
        ${
          data.edge_status === "STRONG EDGE"
            ? "edge-strong"
            : data.edge_status === "POSITIVE EDGE"
              ? "edge-positive"
              : data.edge_status === "NEGATIVE EDGE"
                ? "edge-negative"
                : "edge-neutral"
        }
      ">
        ${data.edge_status ?? "NO DATA"}
      </div>
    </div>

    <div class="performance-card">
      <h3>Avg Winner</h3>
      <div class="value positive-value">
        ${data.avg_winner ?? "—"}%
      </div>
      <div class="sample-count">
        average winning signal
      </div>
    </div>

    <div class="performance-card">
      <h3>Avg Loser</h3>
      <div class="value negative-value">
        ${data.avg_loser ?? "—"}%
      </div>
      <div class="sample-count">
        average losing signal
      </div>
    </div>

    <div class="performance-card">
      <h3>Best Setup Type</h3>
      <div class="value">
        ${data.best_setup_type?.name ?? "—"}
      </div>
      <div class="sample-count">
        ${data.best_setup_type?.avg_return ?? "—"}% avg • ${data.best_setup_type?.count ?? 0} signals
      </div>
    </div>

    <div class="performance-card">
      <h3>Best Market Regime</h3>
      <div class="value">
        ${data.best_market_regime?.name ?? "—"}
      </div>
      <div class="sample-count">
        ${data.best_market_regime?.avg_return ?? "—"}% avg • ${data.best_market_regime?.count ?? 0} signals
      </div>
    </div>

    <div class="performance-card">
      <h3>Best Coin</h3>
      <div class="value">
      ${data.best_coin?.name ?? "—"}
      </div>
      <div class="sample-count">
        ${data.best_coin?.avg_return ?? "—"}% avg • ${data.best_coin?.count ?? 0} signals
      </div>
    </div>

    <div class="performance-card">
      <h3>Best Trading Hour</h3>
      <div class="value">
        ${data.best_trading_hour?.hour ?? "—"}:00 UTC
      </div>
      <div class="sample-count">
        ${data.best_trading_hour?.avg_return ?? "—"}% avg • ${data.best_trading_hour?.count ?? 0} signals
      </div>
    </div>

    <div class="performance-card">
      <h3>Suggested Hold</h3>
      <div class="value">
        ${data.best_timeframe ?? "—"}
      </div>
      <div class="sample-count">
        based on strongest historical return
      </div>
    </div>

    <div class="performance-card">
      <h3>Best Strategy</h3>
      <div class="value">
        ${data.best_strategy?.name ?? "—"}
      </div>
      <div class="sample-count">
        ${data.best_strategy?.avg_return ?? "—"}% avg • ${data.best_strategy?.count ?? 0} signals
      </div>
    </div>

    <div class="performance-card">
      <h3>Best Edge Condition</h3>

      <div class="value edge-combo">

      ${(data.best_combo_condition?.name || "—")
        .split(" • ")
        .map(v => `<div>${v}</div>`)
        .join("")
      }

    </div>

      <div class="sample-count">
        ${data.best_combo_condition?.avg_return ?? "—"}% avg •
        ${data.best_combo_condition?.count ?? 0} signals
      </div>
    </div>



</div>

  `;

}


// ====================================
// Analytics Timeframe Buttons
// ====================================

document
  .querySelectorAll(
    ".analytics-tf"
  )
  .forEach(button => {

    button.onclick = async () => {

      currentAnalyticsWindow =
        button.dataset.analyticsWindow;

      document
        .querySelectorAll(
          ".analytics-tf"
        )
        .forEach(btn => {

          btn.classList.remove(
            "active"
          );

        });

      button.classList.add(
        "active"
      );

      const res =
        await fetch(
          `${window.API_BASE}/api/crypto/performance?window=${currentAnalyticsWindow}`
        );

      const data =
        await res.json();

      renderPerformanceAnalytics(
        data
      );

    };

});
document.addEventListener(
  "keydown",
  e => {

    if (e.key === "Escape") {

      document
        .getElementById(
          "chartModal"
        )
        .classList.add(
          "hidden"
        );

    }

});

document
  .querySelectorAll(
    ".scanner-tf"
  )
  .forEach(button => {

    button.onclick = () => {

      currentScannerTimeframe =
        button.dataset.scannerTf;

      document
        .querySelectorAll(
          ".scanner-tf"
        )
        .forEach(btn => {

          btn.classList.remove(
            "active"
          );

        });

      button.classList.add(
        "active"
      );

      loadTopCoins();
      loadAnalytics();

    };

});
// ====================================
// Trade Direction Filters
// ====================================

document
  .querySelectorAll(".trade-filter")
  .forEach(button => {

    button.onclick = () => {

      currentTradeFilter =
        button.dataset.filter;

      document
        .querySelectorAll(".trade-filter")
        .forEach(btn => {

          btn.classList.remove(
            "active"
          );

        });

      button.classList.add(
        "active"
      );

      loadTopCoins();

    };

});

// ====================================
// Multi-Coin Search Filter
// ====================================

const coinSearchInput =
  document.getElementById("coinSearchInput");

const selectedCoinsContainer =
  document.getElementById("selectedCoins");

function renderSelectedCoins() {

  if (!selectedCoinsContainer) return;

  selectedCoinsContainer.innerHTML =
    selectedCoinFilters
      .map(symbol => `

        <button
          class="coin-chip"
          data-symbol="${symbol}"
        >
          ${symbol} ✕
        </button>

      `)
      .join("");

  document
    .querySelectorAll(".coin-chip")
    .forEach(chip => {

      chip.onclick = () => {

        const symbol =
          chip.dataset.symbol;

        selectedCoinFilters =
          selectedCoinFilters.filter(
            coin => coin !== symbol
          );

        renderSelectedCoins();
        loadTopCoins();

      };

    });

}

if (coinSearchInput) {

  coinSearchInput.addEventListener(
    "keydown",
    e => {

      if (e.key !== "Enter") return;

      const symbol =
        coinSearchInput.value
          .trim()
          .toUpperCase();

      if (!symbol) return;

      if (
        !selectedCoinFilters.includes(symbol)
      ) {

        selectedCoinFilters.push(symbol);

      }

      coinSearchInput.value = "";

      renderSelectedCoins();
      loadTopCoins();

    }
  );

}

// ====================================
// Back To Main Site
// ====================================

const backToMainBtn =
  document.getElementById(
    "backToMainBtn"
  );

if (backToMainBtn) {

  backToMainBtn.addEventListener(
    "click",
    () => {

      window.location.href =
        "index.html";

    }
  );

}
document.addEventListener(
  "DOMContentLoaded",

  

  async () => {

    await loadAnalytics();

    await loadTopCoins();

  }
);
