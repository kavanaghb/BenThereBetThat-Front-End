// ===================================================
// 🏀 BTBT DRAFTKINGS LINEUP OPTIMIZER
// Dedicated multi-sport optimizer page
// ===================================================


// ===================================================
// GLOBAL PAGE STATE
// ===================================================

let currentSession = null;

let currentSlate = null;

let optimizerAccessAllowed = false;

let currentProjectionMap =
  new Map();

// ===================================================
// OPTIMIZER PLAYER STATE
// ===================================================

const lockedPlayers =
  new Set();

const excludedPlayers =
  new Set();


let topOptimalLineupPlayerKeys =
  new Set();


// ===================================================
// ELEMENT REFERENCES
// ===================================================

const sportSelect =
  document.getElementById(
    "dkSportSelect"
  );


const salaryFile =
  document.getElementById(
    "dkSalaryFile"
  );


const loadBtn =
  document.getElementById(
    "dkParseCsvBtn"
  );


const resetBtn =
  document.getElementById(
    "dkResetBtn"
  );


const statusEl =
  document.getElementById(
    "dkOptimizerStatus"
  );

  const optimizationContainer =
  document.getElementById(
    "dkOptimizationContainer"
  );


const allowQuestionable =
  document.getElementById(
    "dkAllowQuestionable"
  );


const playerSearch =
  document.getElementById(
    "dkPlayerSearch"
  );


let hideUnavailablePlayers =
  true;


const OPTIMIZER_HIDDEN_PLAYER_REASONS =
  new Set([
    "DK_STATUS_OUT",
    "NOT_DK_STARTER",
    "NOT_PROBABLE_STARTER",
    "NOT_CONFIRMED_STARTER",
    "RELIEF_PITCHER_NO_STARTER_ROLE"
  ]);


const lineupCount =
  document.getElementById(
    "dkLineupCount"
  );


const generateLineupBtn =
  document.getElementById(
    "dkGenerateLineupBtn"
  );


const generateStatus =
  document.getElementById(
    "dkGenerateStatus"
  );


const lockedCount =
  document.getElementById(
    "dkLockedCount"
  );


const excludedCount =
  document.getElementById(
    "dkExcludedCount"
  );


const eligibleCount =
  document.getElementById(
    "dkEligibleCount"
  );


// ===================================================
// OPTIMIZER DYNAMIC UI HELPERS
//
// Keeps this change isolated to dk-optimizer.js.
// No HTML/CSS change is required for the lineup table
// or BTBT projection loading wheel.
// ===================================================

function ensureOptimizerDynamicStyles() {

  if (
    document.getElementById(
      "dkOptimizerDynamicStyles"
    )
  ) {
    return;
  }


  const style =
    document.createElement(
      "style"
    );


  style.id =
    "dkOptimizerDynamicStyles";


  style.textContent = `
    @keyframes dkOptimizerSpin {
      to {
        transform: rotate(360deg);
      }
    }

    .dk-projection-loader {
      display: none;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      box-sizing: border-box;
      padding: 22px 16px;
      margin: 12px 0;
      border: 1px solid rgba(0, 0, 0, 0.10);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.96);
      font-weight: 700;
      text-align: center;
    }

    .dk-projection-loader.visible {
      display: flex;
    }

    .dk-projection-spinner {
      width: 28px;
      height: 28px;
      flex: 0 0 28px;
      border: 4px solid rgba(0, 0, 0, 0.14);
      border-top-color: currentColor;
      border-radius: 50%;
      animation: dkOptimizerSpin 0.8s linear infinite;
    }

    .dk-player-pool-filters {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
      margin: 0 0 14px;
      padding: 12px 14px;
      border: 1px solid rgba(0, 0, 0, 0.10);
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.96);
    }

    .dk-player-pool-search {
      min-width: 220px;
      flex: 1 1 280px;
      padding: 10px 12px;
      border: 1px solid rgba(0, 0, 0, 0.18);
      border-radius: 9px;
      font: inherit;
    }

    .dk-player-pool-filter-check {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      white-space: nowrap;
    }

    .dk-player-pool-filter-count {
      color: rgba(0, 0, 0, 0.58);
      font-size: 13px;
      font-weight: 700;
    }

    .dk-action-projection.manual {
      font-weight: 800;
    }

    .dk-manual-projection-note {
      display: block;
      margin-top: 3px;
      font-size: 11px;
      opacity: 0.72;
      font-weight: 700;
    }

    .dk-lineup-results {
      display: block;
      width: 100%;
      box-sizing: border-box;
      margin-top: 18px;
      grid-column: 1 / -1;
    }

    .dk-lineup-card {
      display: block;
      width: 100%;
      box-sizing: border-box;
      margin: 0 0 18px;
      padding: 16px;
      border: 1px solid rgba(0, 0, 0, 0.12);
      border-radius: 14px;
      background: #fff;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.06);
    }

    .dk-lineup-card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      flex-wrap: wrap;
      margin-bottom: 12px;
    }

    .dk-lineup-summary {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .dk-lineup-table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
    }

    .dk-lineup-table th,
    .dk-lineup-table td {
      padding: 9px 10px;
      border-bottom: 1px solid rgba(0, 0, 0, 0.10);
      text-align: left;
      white-space: nowrap;
    }

    .dk-lineup-table th {
      font-weight: 800;
    }

    .dk-lineup-results .dk-table-wrap {
      width: 100%;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    @media (max-width: 768px) {
      .dk-lineup-card {
        padding: 12px;
      }

      .dk-lineup-table {
        font-size: 12px;
      }

      .dk-lineup-table th,
      .dk-lineup-table td {
        padding: 7px 8px;
      }
    }
  `;


  document.head.appendChild(
    style
  );

}


// ===================================================
// GENERATED LINEUP RESULTS CONTAINER
//
// Prefer the optimizer section, but fall back to the
// Generate button area if the HTML wrapper ID changes.
// ===================================================

function getOptimizerLineupResultsContainer() {

  ensureOptimizerDynamicStyles();


  let container =
    document.getElementById(
      "dkLineupResults"
    );


  if (!container) {

    container =
      document.createElement(
        "div"
      );


    container.id =
      "dkLineupResults";


    container.className =
      "dk-lineup-results";


    const preferredParent =
      optimizationContainer
      ||
      generateLineupBtn?.closest(
        "section"
      )
      ||
      generateLineupBtn?.parentElement
      ||
      document.body;


    preferredParent.appendChild(
      container
    );

  }


  container.classList.remove(
    "hidden"
  );


  container.style.display =
    "block";


  return container;

}


// ===================================================
// BTBT PROJECTION LOADING WHEEL
// ===================================================

function setOptimizerProjectionLoading(
  show,
  message = "Building BTBT projections..."
) {

  ensureOptimizerDynamicStyles();


  const playerPool =
    document.getElementById(
      "dkPlayerPoolContainer"
    );


  if (!playerPool) {
    return;
  }


  let loader =
    document.getElementById(
      "dkProjectionLoading"
    );


  if (!loader) {

    loader =
      document.createElement(
        "div"
      );


    loader.id =
      "dkProjectionLoading";


    loader.className =
      "dk-projection-loader";


    playerPool.prepend(
      loader
    );

  }


  loader.innerHTML = `
    <span
      class="dk-projection-spinner"
      aria-hidden="true"
    ></span>

    <span>
      ${escapeOptimizerHtml(
        message
      )}
    </span>
  `;


  loader.classList.toggle(
    "visible",
    Boolean(show)
  );


  const tableWrap =
    playerPool.querySelector(
      ".dk-table-wrap"
    );


  if (tableWrap) {

    tableWrap.style.opacity =
      show
        ? "0.38"
        : "";


    tableWrap.style.pointerEvents =
      show
        ? "none"
        : "";

  }

}


function setGenerateStatus(
  message,
  type = ""
) {

  if (!generateStatus) {
    return;
  }


  generateStatus.textContent =
    message || "";


  generateStatus.className =
    "optimizer-status";


  if (type) {

    generateStatus.classList.add(
      type
    );

  }

}


// ===================================================
// API BASE SAFETY
//
// dk-optimizer.html should normally set window.API_BASE
// exactly like game-lines.html.
//
// This fallback protects the page if it is ever omitted.
// ===================================================

if (!window.API_BASE) {

  const isLocalhost =
    window.location.hostname === "localhost"
    ||
    window.location.hostname === "127.0.0.1";


  window.API_BASE =
    isLocalhost
      ? "http://127.0.0.1:5000"
      : "https://bentherebetthat-api.onrender.com";


  console.log(
    "🌐 DK Optimizer API_BASE fallback:",
    window.API_BASE
  );

}


// ===================================================
// SUPABASE CLIENT HELPER
//
// script.js currently creates window.supabaseClient.
//
// Game Lines also accesses window.supabase directly.
//
// Support either one so this page remains resilient.
// ===================================================

function getOptimizerSupabaseClient() {

  // Preferred shared client created by script.js
  if (
    window.supabaseClient &&
    window.supabaseClient.auth
  ) {

    return window.supabaseClient;

  }


  // Game Lines-compatible fallback
  if (
    window.supabase &&
    window.supabase.auth &&
    typeof window.supabase.auth.getSession ===
      "function"
  ) {

    return window.supabase;

  }


  return null;

}


// ===================================================
// STATUS MESSAGE
// ===================================================

function setOptimizerStatus(
  message,
  type = ""
) {

  if (!statusEl) {
    return;
  }


  statusEl.textContent =
    message || "";


  statusEl.className =
    "optimizer-status";


  if (type) {

    statusEl.classList.add(
      type
    );

  }

}
// ===================================================
// PLAYER NAME MATCH KEY
// Must match backend normalization behavior
// ===================================================

function getOptimizerPlayerKey(
  value
) {

  return String(
    value || ""
  )
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]/g,
      ""
    );

}

// ===================================================
// SAFE HTML
// ===================================================

function escapeOptimizerHtml(
  value
) {

  return String(
    value ?? ""
  )
    .replaceAll(
      "&",
      "&amp;"
    )
    .replaceAll(
      "<",
      "&lt;"
    )
    .replaceAll(
      ">",
      "&gt;"
    )
    .replaceAll(
      '"',
      "&quot;"
    )
    .replaceAll(
      "'",
      "&#039;"
    );

}


// ===================================================
// FORMAT SALARY
// ===================================================

function formatOptimizerSalary(
  value
) {

  const salary =
    Number(
      value
    );


  if (
    !Number.isFinite(
      salary
    )
  ) {

    return "--";

  }


  return (
    "$" +
    salary.toLocaleString()
  );

}


// ===================================================
// FORMAT NUMBER
// ===================================================

function formatOptimizerNumber(
  value,
  digits = 1
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return "--";

  }


  const numeric =
    Number(
      value
    );


  if (
    !Number.isFinite(
      numeric
    )
  ) {

    return "--";

  }


  return numeric.toFixed(
    digits
  );

}



function getOptimizerFiniteNumber(
  value
) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }


  const numeric =
    Number(
      value
    );


  return Number.isFinite(
    numeric
  )
    ? numeric
    : null;

}


// ===================================================
// SPORT LABEL
// ===================================================

function getOptimizerSportLabel() {

  const option =
    sportSelect
      ?.selectedOptions
      ?.[0];


  return (
    option
      ?.textContent
      ?.trim()
    ||
    "WNBA"
  );

}


// ===================================================
// UPDATE LOAD BUTTON STATE
// ===================================================

function updateOptimizerLoadButton() {

  if (!loadBtn) {
    return;
  }


  const hasFile =
    Boolean(
      salaryFile
        ?.files
        ?.[0]
    );


  loadBtn.disabled =
    !optimizerAccessAllowed
    ||
    !hasFile;

}

// ===================================================
// OPTIMIZER COUNTS
// ===================================================

function updateOptimizerCounts() {

  if (lockedCount) {

    lockedCount.textContent =
      lockedPlayers.size;

  }


  if (excludedCount) {

    excludedCount.textContent =
      excludedPlayers.size;

  }


  if (eligibleCount) {

    const players =
      Array.isArray(
        currentSlate?.players
      )
        ? currentSlate.players
        : [];


    const allowQ =
      allowQuestionable
        ?.checked !== false;


    const eligible =
      players.filter(
        player => {

          const status =
            String(
              player.status ||
              "ACTIVE"
            )
              .trim()
              .toUpperCase();


          if (
            status === "OUT"
          ) {

            return false;

          }


          if (
            (
              status === "Q" ||
              status === "D"
            ) &&
            !allowQ
          ) {

            return false;

          }


          const key =
            getOptimizerPlayerKey(
              player.name
            );


          if (
            excludedPlayers.has(
              key
            )
          ) {

            return false;

          }


          const projection =
            getOptimizerFiniteNumber(
              player.btbt_projection
            );


          return (
            projection !== null
            &&
            projection > 0
          );

        }
      );


    eligibleCount.textContent =
      eligible.length;

  }


  updateOptimizerGenerateButton();

}


function updateOptimizerGenerateButton() {

  if (!generateLineupBtn) {
    return;
  }


  const players =
    Array.isArray(
      currentSlate?.players
    )
      ? currentSlate.players
      : [];


  const hasProjection =
    players.some(
      player => {
        const projection =
          getOptimizerFiniteNumber(
            player.btbt_projection
          );

        return (
          projection !== null
          &&
          projection > 0
        );
      }
    );


  generateLineupBtn.disabled =
    !optimizerAccessAllowed
    ||
    !currentSlate
    ||
    !hasProjection;

}


// ===================================================
// CLEAR CURRENT SLATE DISPLAY
// ===================================================

function clearOptimizerSlateDisplay() {

  setOptimizerProjectionLoading(
    false
  );


  currentSlate =
    null;


  currentProjectionMap =
    new Map();


  lockedPlayers.clear();

  excludedPlayers.clear();


if (playerSearch) {

  playerSearch.value =
    "";

}


if (allowQuestionable) {

  allowQuestionable.checked =
    true;

}


if (optimizationContainer) {

  optimizationContainer.classList.add(
    "hidden"
  );

}


if (generateLineupBtn) {

  generateLineupBtn.disabled =
    true;

}


setGenerateStatus(
  "BTBT projections are not loaded yet."
);


const lineupResults =
  getOptimizerLineupResultsContainer();


if (lineupResults) {

  lineupResults.innerHTML =
    "";

}


  const summary =
    document.getElementById(
      "dkSlateSummary"
    );


  const games =
    document.getElementById(
      "dkGamesContainer"
    );


  const players =
    document.getElementById(
      "dkPlayerPoolContainer"
    );


  const gamesList =
    document.getElementById(
      "dkGamesList"
    );


  const tableHead =
    document.getElementById(
      "dkPlayerTableHead"
    );


  const tableBody =
    document.getElementById(
      "dkPlayerTableBody"
    );


  if (summary) {

    summary.classList.add(
      "hidden"
    );

  }


  if (games) {

    games.classList.add(
      "hidden"
    );

  }


  if (players) {

    players.classList.add(
      "hidden"
    );

  }


  if (gamesList) {

    gamesList.innerHTML =
      "";

  }


  if (tableHead) {

    tableHead.innerHTML =
      "";

  }


  if (tableBody) {

    tableBody.innerHTML =
      "";

  }

}


// ===================================================
// PLAYER STATUS BADGE
// ===================================================

function getOptimizerStatusBadge(
  status,
  rawStatus = ""
) {

  const normalized =
    String(
      status ||
      rawStatus ||
      "ACTIVE"
    )
      .trim()
      .toUpperCase();

  const raw =
    String(
      rawStatus ||
      ""
    )
      .trim()
      .toUpperCase();

  if (
    normalized === "OUT"
  ) {

    return `
      <span
        class="
          dk-status
          dk-status-out
        "
        title="DraftKings status: ${escapeOptimizerHtml(raw || "OUT")}"
      >
        OUT
      </span>
    `;

  }

  if (
    normalized === "Q"
  ) {

    return `
      <span
        class="
          dk-status
          dk-status-q
        "
        title="DraftKings status: ${escapeOptimizerHtml(raw || "Q")}"
      >
        Q
      </span>
    `;

  }

  if (
    normalized === "D"
  ) {

    return `
      <span
        class="
          dk-status
          dk-status-d
        "
        title="DraftKings status: ${escapeOptimizerHtml(raw || "D")}"
      >
        D
      </span>
    `;

  }

  if (
    normalized === "P"
  ) {

    return `
      <span
        class="
          dk-status
          dk-status-p
        "
        title="DraftKings status: ${escapeOptimizerHtml(raw || "P")}"
      >
        P
      </span>
    `;

  }

  return `
    <span
      class="
        dk-status
        dk-status-active
      "
    >
      Active
    </span>
  `;

}


// ===================================================
// RENDER SLATE SUMMARY
// ===================================================

function renderOptimizerSummary(
  data
) {

  const sport =
    document.getElementById(
      "dkSummarySport"
    );


  const mode =
    document.getElementById(
      "dkSummaryMode"
    );


  const players =
    document.getElementById(
      "dkSummaryPlayers"
    );


  const games =
    document.getElementById(
      "dkSummaryGames"
    );


  const salaryCap =
    document.getElementById(
      "dkSummaryCap"
    );


  const summary =
    document.getElementById(
      "dkSlateSummary"
    );


  if (sport) {

    sport.textContent =
      getOptimizerSportLabel();

  }


  if (mode) {

    mode.textContent =
      data.slate_type ===
        "SHOWDOWN"
        ? "Captain / Showdown"
        : "Classic";

  }


  if (players) {

    players.textContent =
      data.player_count ??
      "--";

  }


  if (games) {

    games.textContent =
      data.game_count ??
      "--";

  }


  if (salaryCap) {

    salaryCap.textContent =
      formatOptimizerSalary(
        data.salary_cap ||
        50000
      );

  }


  if (summary) {

    summary.classList.remove(
      "hidden"
    );

  }

}


// ===================================================
// RENDER SLATE GAMES
// ===================================================

function renderOptimizerGames(
  data
) {

  const container =
    document.getElementById(
      "dkGamesContainer"
    );


  const list =
    document.getElementById(
      "dkGamesList"
    );


  if (
    !container ||
    !list
  ) {

    return;

  }


  const games =
    Array.isArray(
      data.games
    )
      ? data.games
      : [];


  if (!games.length) {

    container.classList.add(
      "hidden"
    );

    return;

  }


  list.innerHTML =
    games
      .map(
        game => `
          <div
            class="dk-game-pill"
          >
            ${escapeOptimizerHtml(
              game
            )}
          </div>
        `
      )
      .join("");


  container.classList.remove(
    "hidden"
  );

}


// ===================================================
// CLASSIC PLAYER TABLE
// ===================================================

function getOptimizerPlayerActionsHtml(
  player
) {

  const key =
    getOptimizerPlayerKey(
      player.name
    );


  const status =
    String(
      player.status ||
      "ACTIVE"
    )
      .trim()
      .toUpperCase();


  if (status === "OUT") {

    return `
      <span class="dk-player-unavailable">
        Unavailable
      </span>
    `;

  }


  const locked =
    lockedPlayers.has(
      key
    );


  const excluded =
    excludedPlayers.has(
      key
    );


  return `
    <div class="dk-player-actions">

      <button
        type="button"
        class="dk-player-action-btn dk-action-lock ${locked ? "active" : ""}"
        data-dk-action="lock"
        data-player-key="${escapeOptimizerHtml(
          key
        )}"
      >
        ${locked ? "🔒 Locked" : "Lock"}
      </button>

      <button
        type="button"
        class="dk-player-action-btn dk-action-exclude ${excluded ? "active" : ""}"
        data-dk-action="exclude"
        data-player-key="${escapeOptimizerHtml(
          key
        )}"
      >
        ${excluded ? "🚫 Excluded" : "Exclude"}
      </button>

      <button
        type="button"
        class="dk-player-action-btn dk-action-projection ${player.manual_projection_active ? "manual active" : ""}"
        data-dk-action="projection"
        data-player-key="${escapeOptimizerHtml(
          key
        )}"
        data-player-team="${escapeOptimizerHtml(
          String(
            player.team ||
            ""
          ).toUpperCase()
        )}"
      >
        ${player.manual_projection_active ? "✎ Manual" : "Edit Proj"}
      </button>

    </div>
  `;

}


function getOptimizerPlayerRowClass(
  playerKey
) {

  const classes = [];


  if (
    lockedPlayers.has(
      playerKey
    )
  ) {
    classes.push(
      "dk-row-locked"
    );
  }


  if (
    excludedPlayers.has(
      playerKey
    )
  ) {
    classes.push(
      "dk-row-excluded"
    );
  }


  if (
    topOptimalLineupPlayerKeys.has(
      playerKey
    )
  ) {
    classes.push(
      "dk-row-optimal"
    );
  }


  return classes.join(
    " "
  );

}


function getOptimizerConfidenceTone(
  value
) {

  const confidence =
    String(
      value ||
      ""
    )
      .trim()
      .toUpperCase();


  if (confidence === "HIGH") {
    return "high";
  }


  if (confidence === "MEDIUM") {
    return "medium";
  }


  if (confidence === "LOW") {
    return "low";
  }


  return "neutral";

}


function applyOptimizerTopLineupHighlight() {

  const rows =
    document.querySelectorAll(
      "#dkPlayerTableBody tr[data-player-key]"
    );


  rows.forEach(
    row => {

      const key =
        String(
          row.dataset.playerKey ||
          ""
        );


      row.classList.toggle(
        "dk-row-optimal",
        topOptimalLineupPlayerKeys.has(
          key
        )
      );

    }
  );

}


function clearOptimizerTopLineupHighlight() {

  topOptimalLineupPlayerKeys.clear();


  document
    .querySelectorAll(
      "#dkPlayerTableBody .dk-row-optimal"
    )
    .forEach(
      row =>
        row.classList.remove(
          "dk-row-optimal"
        )
    );

}


function renderOptimizerClassicPlayers(
  players
) {

  const head =
    document.getElementById(
      "dkPlayerTableHead"
    );


  const body =
    document.getElementById(
      "dkPlayerTableBody"
    );


  if (
    !head ||
    !body
  ) {

    return;

  }


  const isMlb =
    currentSlate?.sport ===
    "baseball_mlb";

  const isNcaaf =
    currentSlate?.sport ===
    "americanfootball_ncaaf";


  head.innerHTML = `
    <tr>
      <th>Player</th>
      <th>Pos</th>
      <th>Roster</th>
      <th>Team</th>
      <th>Salary</th>
      <th>DK Avg</th>
      <th>BTBT Proj</th>
      <th>Source</th>
      <th>$ Value</th>
      <th>vs DK Avg</th>
      <th>${isMlb ? "Lineup" : (isNcaaf ? "History" : "Min")}</th>
      <th>Conf</th>
      <th>Status</th>
      <th>Controls</th>
    </tr>
  `;


  body.innerHTML =
    [...players]
      .sort(
        (a, b) => {

          const projectionA =
            Number(
              a.btbt_projection
            );

          const projectionB =
            Number(
              b.btbt_projection
            );


          if (
            Number.isFinite(
              projectionA
            )
            &&
            Number.isFinite(
              projectionB
            )
          ) {

            return (
              projectionB -
              projectionA
            );

          }


          return (
            Number(
              b.salary ||
              0
            )
            -
            Number(
              a.salary ||
              0
            )
          );

        }
      )
      .map(
        player => {

          const projection =
            getOptimizerFiniteNumber(
              player.btbt_projection
            );


          const value =
            getOptimizerFiniteNumber(
              player.btbt_value
            );


          const dkAverage =
            getOptimizerFiniteNumber(
              player.dk_avg_points
            );


          const averageEdgePct =
            Number.isFinite(
              projection
            )
            &&
            Number.isFinite(
              dkAverage
            )
            &&
            dkAverage !== 0

              ? (
                  (
                    projection -
                    dkAverage
                  )
                  /
                  dkAverage
                )
                *
                100

              : null;


          const minutes =
            getOptimizerFiniteNumber(
              player.expected_minutes
            );


          const confidence =
            String(
              player.model_confidence ||
              "—"
            )
              .trim()
              .toUpperCase();


          const playerKey =
            getOptimizerPlayerKey(
              player.name
            );


          return `
            <tr
              class="${escapeOptimizerHtml(
                getOptimizerPlayerRowClass(
                  playerKey
                )
              )}"
              data-player-key="${escapeOptimizerHtml(
                playerKey
              )}"
              data-player-name="${escapeOptimizerHtml(
                String(
                  player.name ||
                  ""
                ).toLowerCase()
              )}"
              data-player-status="${escapeOptimizerHtml(
                String(
                  player.status ||
                  ""
                ).toUpperCase()
              )}"
              data-player-source="${escapeOptimizerHtml(
                String(
                  player.projection_skip_reason ||
                  player.projection_source ||
                  ""
                ).toUpperCase()
              )}"
            >

              <td>
                <strong>
                  ${escapeOptimizerHtml(
                    player.name
                  )}
                </strong>
              </td>

              <td>
                ${escapeOptimizerHtml(
                  player.position ||
                  "--"
                )}
              </td>

              <td>
                ${escapeOptimizerHtml(
                  player.roster_position ||
                  "--"
                )}
              </td>

              <td>
                ${escapeOptimizerHtml(
                  player.team ||
                  "--"
                )}
              </td>

              <td>
                ${formatOptimizerSalary(
                  player.salary
                )}
              </td>

              <td>
                ${formatOptimizerNumber(
                  player.dk_avg_points,
                  1
                )}
              </td>

              <td class="dk-projection">
                ${
                  Number.isFinite(
                    projection
                  )
                    ? projection.toFixed(
                        2
                      )
                    : "—"
                }
                ${
                  player.manual_projection_active
                    ? `
                      <span class="dk-manual-projection-note">
                        MANUAL
                      </span>
                    `
                    : ""
                }
              </td>

              <td>
                ${escapeOptimizerHtml(
                  player.projection_source &&
                  player.projection_source !== "—"
                    ? player.projection_source
                    : (
                        player.projection_skip_reason ||
                        "—"
                      )
                )}
              </td>

              <td class="dk-value">
                ${
                  Number.isFinite(
                    value
                  )
                    ? `${value.toFixed(
                        2
                      )}x`
                    : "—"
                }
              </td>

              <td>
                ${
                  Number.isFinite(
                    averageEdgePct
                  )
                    ? `
                      <span
                        class="dk-avg-edge ${
                          averageEdgePct > 0
                            ? "positive"
                            : (
                                averageEdgePct < 0
                                  ? "negative"
                                  : "neutral"
                              )
                        }"
                      >
                        ${averageEdgePct > 0 ? "+" : ""}${averageEdgePct.toFixed(
                          1
                        )}%
                      </span>
                    `
                    : "—"
                }
              </td>

              <td>
                ${
                  isMlb
                    ? escapeOptimizerHtml(
                        String(
                          player.player_type === "pitcher"
                            ? (player.starting === "P" ? "STARTER" : "PITCHER")
                            : (
                                player.lineup_status
                                  ? `${player.lineup_status}${player.batting_order ? ` #${player.batting_order}` : ""}`
                                  : "UNKNOWN"
                              )
                        )
                      )
                    : (
                        isNcaaf
                          ? escapeOptimizerHtml(
                              `${player.history_games ?? 0} gm${Number(player.history_games ?? 0) === 1 ? "" : "s"}`
                            )
                          : (
                              Number.isFinite(
                                minutes
                              )
                                ? minutes.toFixed(
                                    1
                                  )
                                : "—"
                            )
                      )
                }
              </td>

              <td>
                <span
                  class="dk-confidence dk-confidence-${getOptimizerConfidenceTone(
                    confidence
                  )}"
                >
                  ${escapeOptimizerHtml(
                    confidence
                  )}
                </span>
              </td>

              <td>
                ${getOptimizerStatusBadge(
                  player.status,
                  player.raw_status
                )}
              </td>

              <td>
                ${getOptimizerPlayerActionsHtml(
                  player
                )}
              </td>

            </tr>
          `;

        }
      )
      .join("");


  applyOptimizerPlayerSearch();

}


// ===================================================
// SHOWDOWN PLAYER TABLE
// ===================================================

function renderOptimizerShowdownPlayers(
  players
) {

  const head =
    document.getElementById(
      "dkPlayerTableHead"
    );


  const body =
    document.getElementById(
      "dkPlayerTableBody"
    );


  if (
    !head ||
    !body
  ) {

    return;

  }


  head.innerHTML = `
    <tr>
      <th>Player</th>
      <th>Team</th>
      <th>UTIL</th>
      <th>CPT</th>
      <th>DK Avg</th>
      <th>BTBT Proj</th>
      <th>Source</th>
      <th>$ Value</th>
      <th>vs DK Avg</th>
      <th>Min</th>
      <th>Conf</th>
      <th>Status</th>
      <th>Controls</th>
    </tr>
  `;


  body.innerHTML =
    [...players]
      .sort(
        (a, b) => {

          const projectionA =
            Number(
              a.btbt_projection
            );

          const projectionB =
            Number(
              b.btbt_projection
            );


          if (
            Number.isFinite(
              projectionA
            )
            &&
            Number.isFinite(
              projectionB
            )
          ) {

            return (
              projectionB -
              projectionA
            );

          }


          return (
            Number(
              b.util_salary ||
              0
            )
            -
            Number(
              a.util_salary ||
              0
            )
          );

        }
      )
      .map(
        player => {

          const projection =
            getOptimizerFiniteNumber(
              player.btbt_projection
            );


          const value =
            getOptimizerFiniteNumber(
              player.btbt_value
            );


          const dkAverage =
            getOptimizerFiniteNumber(
              player.dk_avg_points
            );


          const averageEdgePct =
            Number.isFinite(
              projection
            )
            &&
            Number.isFinite(
              dkAverage
            )
            &&
            dkAverage !== 0

              ? (
                  (
                    projection -
                    dkAverage
                  )
                  /
                  dkAverage
                )
                *
                100

              : null;


          const minutes =
            getOptimizerFiniteNumber(
              player.expected_minutes
            );


          const confidence =
            String(
              player.model_confidence ||
              "—"
            )
              .trim()
              .toUpperCase();


          const playerKey =
            getOptimizerPlayerKey(
              player.name
            );


          return `
            <tr
              class="${escapeOptimizerHtml(
                getOptimizerPlayerRowClass(
                  playerKey
                )
              )}"
              data-player-key="${escapeOptimizerHtml(
                playerKey
              )}"
              data-player-name="${escapeOptimizerHtml(
                String(
                  player.name ||
                  ""
                ).toLowerCase()
              )}"
              data-player-status="${escapeOptimizerHtml(
                String(
                  player.status ||
                  ""
                ).toUpperCase()
              )}"
              data-player-source="${escapeOptimizerHtml(
                String(
                  player.projection_skip_reason ||
                  player.projection_source ||
                  ""
                ).toUpperCase()
              )}"
            >

              <td>
                <strong>
                  ${escapeOptimizerHtml(
                    player.name
                  )}
                </strong>
              </td>

              <td>
                ${escapeOptimizerHtml(
                  player.team ||
                  "--"
                )}
              </td>

              <td>
                ${formatOptimizerSalary(
                  player.util_salary
                )}
              </td>

              <td>
                ${formatOptimizerSalary(
                  player.cpt_salary
                )}
              </td>

              <td>
                ${formatOptimizerNumber(
                  player.dk_avg_points,
                  1
                )}
              </td>

              <td class="dk-projection">
                ${
                  Number.isFinite(
                    projection
                  )
                    ? projection.toFixed(
                        2
                      )
                    : "—"
                }
                ${
                  player.manual_projection_active
                    ? `
                      <span class="dk-manual-projection-note">
                        MANUAL
                      </span>
                    `
                    : ""
                }
              </td>

              <td>
                ${escapeOptimizerHtml(
                  player.projection_source &&
                  player.projection_source !== "—"
                    ? player.projection_source
                    : (
                        player.projection_skip_reason ||
                        "—"
                      )
                )}
              </td>

              <td class="dk-value">
                ${
                  Number.isFinite(
                    value
                  )
                    ? `${value.toFixed(
                        2
                      )}x`
                    : "—"
                }
              </td>

              <td>
                ${
                  Number.isFinite(
                    averageEdgePct
                  )
                    ? `
                      <span
                        class="dk-avg-edge ${
                          averageEdgePct > 0
                            ? "positive"
                            : (
                                averageEdgePct < 0
                                  ? "negative"
                                  : "neutral"
                              )
                        }"
                      >
                        ${averageEdgePct > 0 ? "+" : ""}${averageEdgePct.toFixed(
                          1
                        )}%
                      </span>
                    `
                    : "—"
                }
              </td>

              <td>
                ${
                  Number.isFinite(
                    minutes
                  )
                    ? minutes.toFixed(
                        1
                      )
                    : "—"
                }
              </td>

              <td>
                <span
                  class="dk-confidence dk-confidence-${getOptimizerConfidenceTone(
                    confidence
                  )}"
                >
                  ${escapeOptimizerHtml(
                    confidence
                  )}
                </span>
              </td>

              <td>
                ${getOptimizerStatusBadge(
                  player.status,
                  player.raw_status
                )}
              </td>

              <td>
                ${getOptimizerPlayerActionsHtml(
                  player
                )}
              </td>

            </tr>
          `;

        }
      )
      .join("");


  applyOptimizerPlayerSearch();

}


// ===================================================
// PLAYER POOL SEARCH / VISIBILITY FILTERS
// ===================================================

function ensureOptimizerPlayerPoolFilters() {

  const container =
    document.getElementById(
      "dkPlayerPoolContainer"
    );


  if (
    !container ||
    document.getElementById(
      "dkPlayerPoolFilters"
    )
  ) {
    return;
  }


  const tableWrap =
    container.querySelector(
      ".dk-table-wrap"
    )
    ||
    container.querySelector(
      "table"
    );


  const filters =
    document.createElement(
      "div"
    );


  filters.id =
    "dkPlayerPoolFilters";

  filters.className =
    "dk-player-pool-filters";


  filters.innerHTML = `
    <input
      id="dkPlayerPoolSearch"
      class="dk-player-pool-search"
      type="search"
      placeholder="Search player name..."
      autocomplete="off"
      aria-label="Search DraftKings player pool by player name"
    >

    <label
      class="dk-player-pool-filter-check"
    >
      <input
        id="dkHideUnavailablePlayers"
        type="checkbox"
        ${hideUnavailablePlayers ? "checked" : ""}
      >
      Hide OUT / non-starters
    </label>

    <span
      id="dkPlayerPoolVisibleCount"
      class="dk-player-pool-filter-count"
    ></span>
  `;


  if (tableWrap) {

    tableWrap.parentNode.insertBefore(
      filters,
      tableWrap
    );

  } else {

    container.prepend(
      filters
    );

  }


  const poolSearch =
    document.getElementById(
      "dkPlayerPoolSearch"
    );

  const hideCheckbox =
    document.getElementById(
      "dkHideUnavailablePlayers"
    );


  if (
    playerSearch &&
    poolSearch
  ) {

    poolSearch.value =
      playerSearch.value ||
      "";

  }


  poolSearch
    ?.addEventListener(
      "input",
      () => {

        if (playerSearch) {
          playerSearch.value =
            poolSearch.value;
        }

        applyOptimizerPlayerSearch();

      }
    );


  hideCheckbox
    ?.addEventListener(
      "change",
      () => {

        hideUnavailablePlayers =
          Boolean(
            hideCheckbox.checked
          );

        applyOptimizerPlayerSearch();

      }
    );

}


function optimizerRowIsUnavailable(
  row
) {

  const status =
    String(
      row.dataset.playerStatus ||
      ""
    ).toUpperCase();

  const source =
    String(
      row.dataset.playerSource ||
      ""
    ).toUpperCase();


  return (
    status === "OUT"
    ||
    OPTIMIZER_HIDDEN_PLAYER_REASONS.has(
      source
    )
  );

}


// ===================================================
// RENDER PLAYER POOL
// ===================================================

function renderOptimizerPlayers(
  data
) {

  const container =
    document.getElementById(
      "dkPlayerPoolContainer"
    );


  if (!container) {

    return;

  }


  ensureOptimizerPlayerPoolFilters();


  const players =
    Array.isArray(
      data.players
    )
      ? data.players
      : [];


  if (
    data.slate_type ===
    "SHOWDOWN"
  ) {

    renderOptimizerShowdownPlayers(
      players
    );

  } else {

    renderOptimizerClassicPlayers(
      players
    );

  }


  container.classList.remove(
    "hidden"
  );

  if (optimizationContainer) {

  optimizationContainer.classList.remove(
    "hidden"
  );

}


updateOptimizerCounts();

}


// ===================================================
// VERIFY PREMIUM PAGE ACCESS
// ===================================================

// ===================================================
// VERIFY DRAFTKINGS PAGE ACCESS
// Premium OR universal 24-hour trial
// ===================================================

async function verifyOptimizerAccess() {

  optimizerAccessAllowed =
    false;


  updateOptimizerLoadButton();


  setOptimizerStatus(
    "Checking access...",
    "loading"
  );


  try {

    // =================================================
    // GET SHARED SUPABASE CLIENT
    // =================================================

    const supabaseClient =
      getOptimizerSupabaseClient();


    if (!supabaseClient) {

      throw new Error(
        "Supabase authentication is not initialized."
      );

    }


    // =================================================
    // GET SESSION
    // =================================================

    const {
      data: {
        session
      },
      error
    } =
      await supabaseClient.auth.getSession();


    if (error) {

      throw error;

    }


    if (!session?.user) {

      setOptimizerStatus(
        "Please sign in from the Sports Dashboard first.",
        "error"
      );


      setTimeout(
        () => {

          window.location.href =
            "index.html";

        },
        1200
      );


      return false;

    }


    currentSession =
      session;


    // =================================================
    // CHECK PAID SUBSCRIPTION
    // =================================================

    if (
      typeof checkSubscriptionStatus ===
      "function"
    ) {

      await checkSubscriptionStatus(
        session.user.id
      );

    }


    // =================================================
    // IF NOT PREMIUM, REFRESH TRIAL STATE
    // =================================================

    if (
      !window.hasPremiumAccess &&
      typeof refreshFreePassStatus ===
        "function"
    ) {

      await refreshFreePassStatus();

    }


    // =================================================
    // UNIVERSAL TRIAL CHECK
    // =================================================

    const trialExpires =
      window.freePassExpiresAt
        ? new Date(
            window.freePassExpiresAt
          )
        : null;


    const hasTrialAccess =
      Boolean(

        window.hasActiveFreePass &&

        String(
          window.freePassSport ||
          ""
        )
          .trim()
          .toLowerCase() ===
            "all_access" &&

        trialExpires &&

        !Number.isNaN(
          trialExpires.getTime()
        ) &&

        trialExpires >
          new Date()

      );


    // =================================================
    // PREMIUM OR TRIAL REQUIRED
    // =================================================

    if (
      !window.hasPremiumAccess &&
      !hasTrialAccess
    ) {

      setOptimizerStatus(
        "The DraftKings Lineup Optimizer requires Premium or an active 24-hour Full Access Trial.",
        "error"
      );


      return false;

    }


    optimizerAccessAllowed =
      true;


    updateOptimizerLoadButton();


    // =================================================
    // STATUS
    // =================================================

    setOptimizerStatus(

      window.hasPremiumAccess

        ? (
            "Premium access confirmed. " +
            "Choose a DraftKings CSV."
          )

        : (
            "24-hour Full Access Trial active. " +
            "Choose a DraftKings CSV."
          ),

      "success"
    );


    console.log(
      "✅ DK Optimizer access confirmed",
      {
        premium:
          window.hasPremiumAccess,

        trial:
          hasTrialAccess
      }
    );


    return true;


  } catch (error) {

    console.error(
      "❌ DK Optimizer access check failed:",
      error
    );


    optimizerAccessAllowed =
      false;


    updateOptimizerLoadButton();


    setOptimizerStatus(
      error.message ||
      "Unable to verify DraftKings access.",
      "error"
    );


    return false;

  }

}


// ===================================================
// REFRESH SESSION BEFORE API REQUEST
//
// Avoid holding an old access token if the page
// remains open for a long time.
// ===================================================
// ===================================================
// LOAD BTBT WNBA PROJECTIONS
// ===================================================

async function loadBtbtOptimizerProjections(
  file,
  sport
) {

  if (!file) {

    throw new Error(
      "DraftKings CSV is missing."
    );

  }


  const session =
    await refreshOptimizerSession();


  setOptimizerStatus(
    "DraftKings slate loaded. Loading BTBT projections...",
    "loading"
  );


  const formData =
    new FormData();


  formData.append(
    "file",
    file
  );


  const response =
    await fetch(
      `${window.API_BASE}/api/dk-optimizer/projections?sport=${encodeURIComponent(
        sport
      )}`,
      {

        method:
          "POST",

        headers: {

          Authorization:
            `Bearer ${session.access_token}`

        },

        body:
          formData

      }
    );


  let data =
    null;


  try {

    data =
      await response.json();

  } catch {

    data =
      null;

  }


  if (!response.ok) {

    const detail =
      data?.detail;


    let message =
      `Unable to load BTBT projections (${response.status}).`;


    if (
      typeof detail ===
      "string"
    ) {

      message =
        detail;

    }


    else if (
      detail?.message
    ) {

      message =
        detail.message;

    }


    throw new Error(
      message
    );

  }


  if (
    !data ||
    data.success !== true ||
    !Array.isArray(
      data.players
    )
  ) {

    throw new Error(
      "BTBT projection response was invalid."
    );

  }


  // =================================================
  // BUILD LOOKUP
  // =================================================

  currentProjectionMap =
    new Map();


  data.players.forEach(
    player => {

      const key =
        getOptimizerPlayerKey(
          player.player_name
        );


      if (!key) {
        return;
      }


      currentProjectionMap.set(
        key,
        player
      );

    }
  );


  const missingProjectionMap =
    new Map();


  (
    Array.isArray(
      data.missing_players
    )
      ? data.missing_players
      : []
  ).forEach(
    player => {

      const key =
        getOptimizerPlayerKey(
          player.player_name
        );


      if (key) {

        missingProjectionMap.set(
          key,
          player
        );

      }

    }
  );


  // =================================================
  // MERGE PROJECTIONS INTO CURRENT DK PLAYER POOL
  // =================================================

  if (
    currentSlate &&
    Array.isArray(
      currentSlate.players
    )
  ) {

    currentSlate.players =
      currentSlate.players.map(
        player => {

          const key =
            getOptimizerPlayerKey(
              player.name
            );


          const projection =
            currentProjectionMap.get(
              key
            );


          if (!projection) {

            const missing =
              missingProjectionMap.get(
                key
              );


            return {
              ...player,

              btbt_projection:
                null,

              btbt_value:
                null,

              expected_minutes:
                null,

              model_confidence:
                "—",

              projection_source:
                "—",

              projection_skip_reason:
                missing?.reason ||
                "NO_PROJECTION",

              history_games:
                missing?.history_games ??
                0,

              lineup_status:
                missing?.lineup_status ??
                null,

              lineup_source:
                missing?.lineup_source ??
                null,

              batting_order:
                missing?.batting_order ??
                null
            };

          }


          const btbtProjection =
            getOptimizerFiniteNumber(
              projection.dk_projection
            );


          // ---------------------------------------------
          // Use the correct DK salary for value.
          //
          // Classic:
          //   salary
          //
          // Showdown:
          //   UTIL salary
          //
          // This prevents Captain pricing from distorting
          // the player's normal value rating.
          // ---------------------------------------------

          const salary =
            currentSlate.slate_type ===
              "SHOWDOWN"
              ? Number(
                  player.util_salary ||
                  0
                )
              : Number(
                  player.salary ||
                  0
                );


          const value =
            Number.isFinite(
              btbtProjection
            )
            &&
            salary > 0

              ? (
                  btbtProjection /
                  (
                    salary /
                    1000
                  )
                )

              : null;


          return {

            ...player,

            btbt_projection:
              player.manual_projection_active
                ? player.btbt_projection
                : (
                    Number.isFinite(
                      btbtProjection
                    )
                      ? btbtProjection
                      : null
                  ),

            original_btbt_projection:
              player.original_btbt_projection !== undefined
                ? player.original_btbt_projection
                : (
                    Number.isFinite(
                      btbtProjection
                    )
                      ? btbtProjection
                      : null
                  ),

            original_projection_source:
              player.original_projection_source !== undefined
                ? player.original_projection_source
                : (
                    projection.projection_source ||
                    "NONE"
                  ),

            original_model_confidence:
              player.original_model_confidence !== undefined
                ? player.original_model_confidence
                : (
                    projection.model_confidence ||
                    "—"
                  ),

            btbt_value:
              Number.isFinite(
                value
              )
                ? value
                : null,

            expected_minutes:
              projection.expected_minutes ??
              null,

            model_confidence:
              player.manual_projection_active
                ? "MANUAL"
                : (
                    projection.model_confidence ||
                    "—"
                  ),

            player_type:
              projection.player_type ??
              null,

            lineup_status:
              projection.lineup_status ??
              null,

            lineup_source:
              projection.lineup_source ??
              null,

            batting_order:
              projection.batting_order ??
              null,

            projected_start_rate:
              projection.projected_start_rate ??
              null,

            is_projected_starter:
              projection.is_projected_starter ??
              null,

            hits:
              projection.hits ??
              null,

            total_bases:
              projection.total_bases ??
              null,

            runs:
              projection.runs ??
              null,

            rbis:
              projection.rbis ??
              null,

            home_runs:
              projection.home_runs ??
              null,

            walks:
              projection.walks ??
              null,

            stolen_bases:
              projection.stolen_bases ??
              null,

            strikeouts:
              projection.strikeouts ??
              null,

            outs:
              projection.outs ??
              null,

            earned_runs:
              projection.earned_runs ??
              null,

            hits_allowed:
              projection.hits_allowed ??
              null,

            opposing_probable_pitcher:
              projection.opposing_probable_pitcher ??
              null,

            projection_source:
              player.manual_projection_active
                ? "MANUAL"
                : (
                    projection.projection_source ||
                    "NONE"
                  ),

            opponent:
              projection.opponent ??
              null,

            sp_rating:
              projection.sp_rating ??
              null,

            opponent_sp_rating:
              projection.opponent_sp_rating ??
              null,

            sp_offense:
              projection.sp_offense ??
              null,

            opponent_sp_defense:
              projection.opponent_sp_defense ??
              null,

            sp_context_weight_pct:
              projection.sp_context_weight_pct ??
              null,

            current_context_weight_pct:
              projection.current_context_weight_pct ??
              null,

            context_adjustment_pct:
              projection.context_adjustment_pct ??
              null,

            game_script_adjustment_pct:
              projection.game_script_adjustment_pct ??
              null,

            projected_team_margin:
              projection.projected_team_margin ??
              null,

            sp_component:
              projection.sp_component ??
              null,

            profile_games:
              projection.profile_games ??
              null,

            market_stat_count:
              projection.market_stat_count ??
              0,

            model_stat_count:
              projection.model_stat_count ??
              0,

            history_games:
              projection.history_games ??
              0,

            source_counts:
              projection.source_counts ??
              null

          };

        }
      );

  }


  updateOptimizerCounts();


  updateOptimizerGenerateButton();


  setGenerateStatus(
    data.matched_count > 0
      ? `BTBT projections loaded. Ready to generate ${currentSlate?.slate_type === "SHOWDOWN" ? "Showdown" : "Classic"} lineups.`
      : "No BTBT projections matched this slate.",
    data.matched_count > 0
      ? "success"
      : "error"
  );


  console.log(
    "🧠 BTBT projections loaded:",
    {
      matched:
        data.matched_count,

      missing:
        data.missing_count,

      dkPlayers:
        data.dk_player_count
    }
  );


  return data;

}
async function refreshOptimizerSession() {

  const supabaseClient =
    getOptimizerSupabaseClient();


  if (!supabaseClient) {

    throw new Error(
      "Supabase authentication is not initialized."
    );

  }


  const {
    data: {
      session
    },
    error
  } =
    await supabaseClient.auth.getSession();


  if (error) {

    throw error;

  }


  if (
    !session
      ?.access_token
  ) {

    throw new Error(
      "Your session has expired. Please sign in again."
    );

  }


  currentSession =
    session;


  return session;

}


// ===================================================
// LOAD DRAFTKINGS CSV
// ===================================================

async function loadOptimizerSlate() {

  // =================================================
  // ACCESS
  // =================================================

  if (
    !optimizerAccessAllowed
  ) {

    const allowed =
      await verifyOptimizerAccess();


    if (!allowed) {

      return;

    }

  }


  // =================================================
  // FILE
  // =================================================

  const file =
    salaryFile
      ?.files
      ?.[0];


  if (!file) {

    setOptimizerStatus(
      "Choose a DraftKings CSV first.",
      "error"
    );


    updateOptimizerLoadButton();


    return;

  }


  if (
    !file.name
      .toLowerCase()
      .endsWith(
        ".csv"
      )
  ) {

    setOptimizerStatus(
      "DraftKings salary file must be a CSV.",
      "error"
    );


    return;

  }


  // =================================================
  // CLEAR OLD SLATE
  // =================================================

  clearOptimizerSlateDisplay();


  if (loadBtn) {

    loadBtn.disabled =
      true;

  }


  setOptimizerStatus(
    "Reading DraftKings slate...",
    "loading"
  );


  try {

    // =================================================
    // REFRESH AUTH SESSION
    // =================================================

    const session =
      await refreshOptimizerSession();


    // =================================================
    // MULTIPART REQUEST
    // =================================================

    const formData =
      new FormData();


    formData.append(
      "file",
      file
    );


    // Keep sport available in frontend state.
    // Backend parse endpoint currently only requires file.
    const selectedSport =
      sportSelect?.value ||
      "basketball_wnba";


    console.log(
      "📤 Uploading DK slate:",
      {
        file:
          file.name,

        sport:
          selectedSport,

        api:
          window.API_BASE
      }
    );


    const response =
      await fetch(
        `${window.API_BASE}/api/dk-optimizer/parse?sport=${encodeURIComponent(
          selectedSport
        )}`,
        {

          method:
            "POST",

          headers: {

            Authorization:
              `Bearer ${session.access_token}`

          },

          body:
            formData

        }
      );


    // =================================================
    // READ RESPONSE
    // =================================================

    let data =
      null;


    try {

      data =
        await response.json();

    } catch {

      data =
        null;

    }


    // =================================================
    // API ERROR
    // =================================================

    if (!response.ok) {

      const detail =
        data?.detail;


      let message =
        `Unable to load DraftKings slate (${response.status}).`;


      if (
        typeof detail ===
        "string"
      ) {

        message =
          detail;

      }


      else if (
        detail &&
        typeof detail ===
          "object"
      ) {

        if (
          detail.message
        ) {

          message =
            detail.message;

        }


        if (
          Array.isArray(
            detail.missing_columns
          )
          &&
          detail.missing_columns.length
        ) {

          message +=
            ` Missing: ${detail.missing_columns.join(", ")}`;

        }

      }


      throw new Error(
        message
      );

    }


    // =================================================
    // VALIDATE RESPONSE
    // =================================================

    if (
      !data ||
      data.success !== true
    ) {

      throw new Error(
        "DraftKings parser returned an invalid response."
      );

    }


    // =================================================
    // SAVE CURRENT SLATE
    // =================================================

    currentSlate = {

      ...data,

      sport:
        selectedSport

    };


    // Useful later when we add optimization controls.
    window.currentDkSlate =
      currentSlate;


    console.log(
      `${selectedSport === "baseball_mlb" ? "⚾" : (selectedSport === "americanfootball_ncaaf" ? "🏈" : "🏀")} DK slate loaded:`,
      currentSlate
    );


    // =================================================
    // RENDER
    // =================================================

    // =================================================
// FIRST RENDER — DK CSV DATA
// =================================================

renderOptimizerSummary(
  currentSlate
);


renderOptimizerGames(
  currentSlate
);


renderOptimizerPlayers(
  currentSlate
);


// =================================================
// LOAD BTBT PROJECTIONS
// =================================================

setOptimizerProjectionLoading(
  true,
  "Building BTBT projections from Vegas + model data..."
);


let projectionResult =
  null;


try {

  projectionResult =
    await loadBtbtOptimizerProjections(
      file,
      selectedSport
    );

} finally {

  setOptimizerProjectionLoading(
    false
  );

}


// =================================================
// SECOND RENDER — NOW WITH BTBT PROJECTIONS
// =================================================

renderOptimizerPlayers(
  currentSlate
);

    const modeLabel =
      currentSlate.slate_type ===
        "SHOWDOWN"
        ? "Captain / Showdown"
        : "Classic";


    const matchedCount =
      Number(
        projectionResult.matched_count ||
        0
      );


    const dkPlayerCount =
      Number(
        projectionResult.dk_player_count ||
        0
      );


    const unmatchedCount =
      Math.max(
        0,
        dkPlayerCount -
        matchedCount
      );


    setOptimizerStatus(
      `✅ ${modeLabel} ready • ${matchedCount} matched • ${unmatchedCount} unmatched`,
      "success"
    );


  } catch (error) {

    console.error(
      "❌ DK slate upload failed:",
      error
    );


    setOptimizerStatus(
      error.message ||
      "Unable to load DraftKings slate.",
      "error"
    );


  } finally {

    updateOptimizerLoadButton();

  }

}


// ===================================================
// RESET / NEW SLATE
// ===================================================

function resetOptimizerSlate() {

  clearOptimizerSlateDisplay();


  if (salaryFile) {

    salaryFile.value =
      "";

  }


  window.currentDkSlate =
    null;


  if (
    optimizerAccessAllowed
  ) {

    setOptimizerStatus(
      "Choose a DraftKings CSV.",
      "success"
    );

  } else {

    setOptimizerStatus(
      "Checking Premium access...",
      "loading"
    );

  }


  updateOptimizerLoadButton();

}


// ===================================================
// FILE CHANGE
//
// This is what lets the user keep uploading new
// slates without leaving the optimizer page.
// ===================================================

salaryFile
  ?.addEventListener(
    "change",
    () => {

      clearOptimizerSlateDisplay();


      const file =
        salaryFile
          ?.files
          ?.[0];


      if (!file) {

        setOptimizerStatus(
          "Choose a DraftKings CSV.",
          "success"
        );


        updateOptimizerLoadButton();


        return;

      }


      if (
        !file.name
          .toLowerCase()
          .endsWith(
            ".csv"
          )
      ) {

        setOptimizerStatus(
          "DraftKings salary file must be a CSV.",
          "error"
        );


        updateOptimizerLoadButton();


        return;

      }


      setOptimizerStatus(
        `${file.name} ready to load.`,
        "success"
      );


      updateOptimizerLoadButton();

    }
  );


// ===================================================
// SPORT CHANGE
//
// Right now only WNBA is enabled, but this prepares
// the page for NBA / NFL / MLB / NHL expansion.
// ===================================================

sportSelect
  ?.addEventListener(
    "change",
    () => {

      clearOptimizerSlateDisplay();


      if (
        salaryFile
          ?.files
          ?.[0]
      ) {

        setOptimizerStatus(
          `${getOptimizerSportLabel()} selected. Slate ready to load.`,
          "success"
        );

      }


      updateOptimizerLoadButton();

    }
  );


// ===================================================
// LOAD BUTTON
// ===================================================

loadBtn
  ?.addEventListener(
    "click",
    loadOptimizerSlate
  );


// ===================================================
// NEW SLATE BUTTON
// ===================================================

resetBtn
  ?.addEventListener(
    "click",
    resetOptimizerSlate
  );


// ===================================================
// AUTH STATE WATCH
//
// If the user's session changes while the optimizer
// page stays open, refresh our state.
// ===================================================

function attachOptimizerAuthWatcher() {

  const supabaseClient =
    getOptimizerSupabaseClient();


  if (
    !supabaseClient ||
    !supabaseClient.auth
  ) {

    return;

  }


  supabaseClient.auth.onAuthStateChange(
    (
      event,
      session
    ) => {

      console.log(
        "🔐 DK Optimizer auth event:",
        event
      );


      if (
        event ===
        "SIGNED_OUT"
      ) {

        currentSession =
          null;


        optimizerAccessAllowed =
          false;


        updateOptimizerLoadButton();


        setOptimizerStatus(
          "You have been signed out.",
          "error"
        );


        return;

      }


      if (
        session
          ?.access_token
      ) {

        currentSession =
          session;

      }

    }
  );

}

// ===================================================
// PLAYER SEARCH
// ===================================================

function applyOptimizerPlayerSearch() {

  const poolSearch =
    document.getElementById(
      "dkPlayerPoolSearch"
    );


  const query =
    String(
      poolSearch?.value
      ??
      playerSearch?.value
      ??
      ""
    )
      .trim()
      .toLowerCase();


  if (
    playerSearch &&
    poolSearch &&
    playerSearch.value !==
      poolSearch.value
  ) {

    playerSearch.value =
      poolSearch.value;

  }


  const rows =
    document.querySelectorAll(
      "#dkPlayerTableBody tr[data-player-key]"
    );


  let visibleCount = 0;


  rows.forEach(
    row => {

      const name =
        String(
          row.dataset.playerName ||
          ""
        );


      const matchesSearch =
        !query
        ||
        name.includes(
          query
        );


      const hiddenByAvailability =
        hideUnavailablePlayers
        &&
        optimizerRowIsUnavailable(
          row
        );


      row.hidden =
        !matchesSearch
        ||
        hiddenByAvailability;


      if (!row.hidden) {
        visibleCount += 1;
      }

    }
  );


  const visibleCountEl =
    document.getElementById(
      "dkPlayerPoolVisibleCount"
    );


  if (visibleCountEl) {

    visibleCountEl.textContent =
      `${visibleCount} shown`;

  }

}



playerSearch
  ?.addEventListener(
    "input",
    () => {

      const poolSearch =
        document.getElementById(
          "dkPlayerPoolSearch"
        );


      if (poolSearch) {
        poolSearch.value =
          playerSearch.value;
      }


      applyOptimizerPlayerSearch();

    }
  );


// ===================================================
// MANUAL PROJECTION OVERRIDE
// ===================================================

function editOptimizerManualProjection(
  key,
  team
) {

  if (
    !currentSlate ||
    !Array.isArray(
      currentSlate.players
    )
  ) {
    return;
  }


  const normalizedTeam =
    String(
      team ||
      ""
    )
      .trim()
      .toUpperCase();


  const player =
    currentSlate.players.find(
      row =>
        getOptimizerPlayerKey(
          row.name
        ) === key
        &&
        (
          !normalizedTeam
          ||
          String(
            row.team ||
            ""
          )
            .trim()
            .toUpperCase() ===
            normalizedTeam
        )
    );


  if (!player) {
    return;
  }


  const currentProjection =
    getOptimizerFiniteNumber(
      player.btbt_projection
    );


  const originalProjection =
    getOptimizerFiniteNumber(
      player.original_btbt_projection
    );


  const entered =
    window.prompt(
      `Manual BTBT projection for ${player.name} (${player.team || "--"}).\n\nCurrent: ${
        Number.isFinite(currentProjection)
          ? currentProjection.toFixed(2)
          : "—"
      }\nOriginal model: ${
        Number.isFinite(originalProjection)
          ? originalProjection.toFixed(2)
          : "—"
      }\n\nEnter a new projection. Leave blank to restore the original model projection.`,
      player.manual_projection_active &&
      Number.isFinite(currentProjection)
        ? String(currentProjection)
        : ""
    );


  if (entered === null) {
    return;
  }


  const trimmed =
    String(
      entered
    ).trim();


  // Blank = restore original model projection.
  if (!trimmed) {

    player.manual_projection_active =
      false;

    player.btbt_projection =
      Number.isFinite(
        originalProjection
      )
        ? originalProjection
        : null;

    player.projection_source =
      player.original_projection_source ||
      "NONE";

    player.model_confidence =
      player.original_model_confidence ||
      "—";

  } else {

    const manualProjection =
      Number(
        trimmed
      );


    if (
      !Number.isFinite(
        manualProjection
      )
      ||
      manualProjection < 0
      ||
      manualProjection > 100
    ) {

      window.alert(
        "Enter a projection from 0 to 100."
      );

      return;
    }


    player.manual_projection_active =
      true;

    player.btbt_projection =
      manualProjection;

    player.projection_source =
      "MANUAL";

    player.model_confidence =
      "MANUAL";

  }


  const salary =
    currentSlate.slate_type ===
      "SHOWDOWN"
      ? Number(
          player.util_salary ||
          player.salary ||
          0
        )
      : Number(
          player.salary ||
          0
        );


  player.btbt_value =
    Number.isFinite(
      getOptimizerFiniteNumber(
        player.btbt_projection
      )
    )
    &&
    salary > 0
      ? (
          Number(
            player.btbt_projection
          )
          /
          (
            salary /
            1000
          )
        )
      : null;


  clearOptimizerTopLineupHighlight();


  renderOptimizerPlayers(
    currentSlate
  );


  updateOptimizerCounts();


  setOptimizerStatus(
    player.manual_projection_active
      ? `${player.name} projection manually set to ${Number(player.btbt_projection).toFixed(2)}.`
      : `${player.name} projection restored to the BTBT model value.`,
    "success"
  );

}


// ===================================================
// LOCK / EXCLUDE PLAYER CONTROLS
// ===================================================

document.addEventListener(
  "click",
  event => {

    const button =
      event.target.closest(
        "[data-dk-action][data-player-key]"
      );


    if (!button) {
      return;
    }


    const action =
      button.dataset.dkAction;


    const key =
      String(
        button.dataset.playerKey ||
        ""
      );


    if (!key) {
      return;
    }


    if (action === "projection") {

      editOptimizerManualProjection(
        key,
        button.dataset.playerTeam
      );

      return;

    }


    clearOptimizerTopLineupHighlight();


    if (action === "lock") {

      if (
        lockedPlayers.has(
          key
        )
      ) {

        lockedPlayers.delete(
          key
        );

      } else {

        excludedPlayers.delete(
          key
        );

        lockedPlayers.add(
          key
        );

      }

    }


    if (action === "exclude") {

      if (
        excludedPlayers.has(
          key
        )
      ) {

        excludedPlayers.delete(
          key
        );

      } else {

        lockedPlayers.delete(
          key
        );

        excludedPlayers.add(
          key
        );

      }

    }


    renderOptimizerPlayers(
      currentSlate
    );


    updateOptimizerCounts();

  }
);


// ===================================================
// GENERATE OPTIMAL LINEUPS
// ===================================================

function getOptimizerNamesForKeys(
  keys
) {

  const players =
    Array.isArray(
      currentSlate?.players
    )
      ? currentSlate.players
      : [];


  return players
    .filter(
      player =>
        keys.has(
          getOptimizerPlayerKey(
            player.name
          )
        )
    )
    .map(
      player =>
        player.name
    );

}


function buildOptimizerGeneratePlayers() {

  const players =
    Array.isArray(
      currentSlate?.players
    )
      ? currentSlate.players
      : [];


  return players.map(
    player => ({

      ...player,

      // dk_optimizer_service.py reads dk_projection.
      // The page stores the merged projection as
      // btbt_projection.
      dk_projection:
        player.btbt_projection,

      manual_projection:
        Boolean(
          player.manual_projection_active
        ),

    })
  );

}


function getClassicLineupDisplayPlayers(
  players
) {

  if (
    currentSlate?.sport ===
    "baseball_mlb"
    ||
    currentSlate?.sport ===
    "americanfootball_ncaaf"
  ) {

    return players.map(
      player => ({
        ...player,

        role:
          player.role ||
          player.roster_position ||
          player.position ||
          "UTIL"
      })
    );

  }



  let guardsAssigned =
    0;

  let forwardsAssigned =
    0;


  return players.map(
    player => {

      let role =
        "UTIL";


      if (
        player.bucket === "G" &&
        guardsAssigned < 2
      ) {

        role =
          "G";

        guardsAssigned +=
          1;

      }


      else if (
        player.bucket === "F" &&
        forwardsAssigned < 3
      ) {

        role =
          "F";

        forwardsAssigned +=
          1;

      }


      return {
        ...player,
        role
      };

    }
  );

}


function renderOptimizerLineups(
  data
) {

  const container =
    getOptimizerLineupResultsContainer();


  if (!container) {
    return;
  }


  const lineups =
    Array.isArray(
      data?.lineups
    )
      ? data.lineups
      : [];


  const lineupSport =
    (
      data?.sport ||
      currentSlate?.sport
    );

  const isMlb =
    lineupSport === "baseball_mlb";

  const isNcaaf =
    lineupSport === "americanfootball_ncaaf";


  if (!lineups.length) {

    topOptimalLineupPlayerKeys.clear();


    container.innerHTML = `
      <div class="dk-lineup-empty">
        No valid optimal lineups were returned for the current settings.
      </div>
    `;


    return;

  }


  container.classList.remove(
    "hidden"
  );


  container.style.display =
    "block";


  const topLineup =
    lineups[0];


  const topLineupPlayers =
    topLineup?.slate_type ===
      "SHOWDOWN"

      ? [
          topLineup.captain,
          ...(
            Array.isArray(
              topLineup.utilities
            )
              ? topLineup.utilities
              : []
          )
        ]

      : (
          Array.isArray(
            topLineup?.players
          )
            ? topLineup.players
            : []
        );


  topOptimalLineupPlayerKeys =
    new Set(
      topLineupPlayers
        .filter(
          Boolean
        )
        .map(
          player =>
            getOptimizerPlayerKey(
              player.name
            )
        )
        .filter(
          Boolean
        )
    );


  applyOptimizerTopLineupHighlight();


  const resultHeading = `
    <div class="dk-results-heading">

      <div>

        <span class="dk-results-eyebrow">
          BTBT OPTIMIZED
        </span>

        <h3>
          Optimal Lineups
        </h3>

        <p>
          Ranked by projected DraftKings points using the
          currently loaded BTBT projections.
        </p>

      </div>


      <span class="dk-results-count">
        ${lineups.length}
        lineup${lineups.length === 1 ? "" : "s"}
      </span>

    </div>
  `;


  const cards =
    lineups
      .map(
        lineup => {

          const isShowdown =
            lineup.slate_type ===
              "SHOWDOWN";


          const players =
            isShowdown

              ? [
                  lineup.captain,
                  ...(
                    Array.isArray(
                      lineup.utilities
                    )
                      ? lineup.utilities
                      : []
                  )
                ]

              : getClassicLineupDisplayPlayers(
                  Array.isArray(
                    lineup.players
                  )
                    ? lineup.players
                    : []
                );


          const rank =
            Number(
              lineup.rank ||
              0
            );


          const isTopLineup =
            rank === 1;


          const lineupTitle =
            isTopLineup
              ? "Top Projected"
              : `Lineup #${rank || ""}`;


          return `
            <section class="dk-lineup-card ${isTopLineup ? "dk-lineup-card-top" : ""}">

              <div class="dk-lineup-card-header">

                <div class="dk-lineup-title-group">

                  <div class="dk-lineup-rank">
                    #${escapeOptimizerHtml(
                      rank ||
                      ""
                    )}
                  </div>

                  <div>

                    <div class="dk-lineup-title-line">

                      <strong>
                        ${escapeOptimizerHtml(
                          lineupTitle
                        )}
                      </strong>

                      ${
                        isTopLineup
                          ? `
                            <span class="dk-top-projected-badge">
                              TOP PROJECTED
                            </span>
                          `
                          : ""
                      }

                    </div>

                    <div class="dk-lineup-subtitle">
                      ${isShowdown ? "Captain / Showdown" : "Classic"} lineup
                    </div>

                  </div>

                </div>


                <div class="dk-lineup-summary">

                  <span class="dk-summary-chip dk-summary-projection">
                    <small>Projection</small>
                    <strong>
                      ${formatOptimizerNumber(
                        lineup.projected_points,
                        2
                      )}
                    </strong>
                  </span>

                  <span class="dk-summary-chip">
                    <small>Salary</small>
                    <strong>
                      ${formatOptimizerSalary(
                        lineup.salary
                      )}
                    </strong>
                  </span>

                  <span class="dk-summary-chip">
                    <small>Remaining</small>
                    <strong>
                      ${formatOptimizerSalary(
                        lineup.salary_remaining
                      )}
                    </strong>
                  </span>

                </div>

              </div>


              <div class="dk-table-wrap">

                <table class="dk-lineup-table">

                  <thead>
                    <tr>
                      <th>Role</th>
                      <th>Player</th>
                      <th>Team</th>
                      <th>Salary</th>
                      <th>Proj</th>
                      <th>${isMlb || isNcaaf ? "Pos" : "Min"}</th>
                      <th>Conf</th>
                      <th>Status</th>
                    </tr>
                  </thead>

                  <tbody>

                    ${players
                      .filter(
                        Boolean
                      )
                      .map(
                        player => {

                          const role =
                            String(
                              player.role ||
                              player.bucket ||
                              "--"
                            )
                              .trim()
                              .toUpperCase();


                          const confidence =
                            String(
                              player.confidence ||
                              "UNKNOWN"
                            )
                              .trim()
                              .toUpperCase();


                          return `
                            <tr class="${role === "CPT" ? "dk-captain-row" : ""}">

                              <td>
                                <span class="dk-role-badge ${role === "CPT" ? "captain" : ""}">
                                  ${escapeOptimizerHtml(
                                    role
                                  )}
                                </span>
                              </td>

                              <td class="dk-lineup-player-name">
                                ${player.locked ? '<span class="dk-locked-icon" title="Locked player">🔒</span>' : ""}
                                <strong>
                                  ${escapeOptimizerHtml(
                                    player.name ||
                                    "--"
                                  )}
                                </strong>
                              </td>

                              <td>
                                ${escapeOptimizerHtml(
                                  player.team ||
                                  "--"
                                )}
                              </td>

                              <td>
                                ${formatOptimizerSalary(
                                  player.salary
                                )}
                              </td>

                              <td>
                                <strong class="dk-lineup-projection">
                                  ${formatOptimizerNumber(
                                    player.projection,
                                    2
                                  )}
                                </strong>
                              </td>

                              <td>
                                ${
                                  isMlb || isNcaaf
                                    ? escapeOptimizerHtml(
                                        player.position ||
                                        player.roster_position ||
                                        role ||
                                        "--"
                                      )
                                    : formatOptimizerNumber(
                                        player.expected_minutes,
                                        1
                                      )
                                }
                              </td>

                              <td>
                                <span
                                  class="dk-confidence dk-confidence-${getOptimizerConfidenceTone(
                                    confidence
                                  )}"
                                >
                                  ${escapeOptimizerHtml(
                                    confidence
                                  )}
                                </span>
                              </td>

                              <td>
                                ${getOptimizerStatusBadge(
                  player.status,
                  player.raw_status
                )}
                              </td>

                            </tr>
                          `;

                        }
                      )
                      .join("")}

                  </tbody>

                </table>

              </div>

            </section>
          `;

        }
      )
      .join("");


  container.innerHTML =
    resultHeading +
    cards;


  console.log(
    "🎨 Rendered optimizer lineup table:",
    {
      lineupCount:
        lineups.length,

      container:
        container
    }
  );


  requestAnimationFrame(
    () => {

      container.scrollIntoView(
        {
          behavior:
            "smooth",

          block:
            "start"
        }
      );

    }
  );

}

async function generateOptimizerLineups() {

  if (
    !currentSlate ||
    !Array.isArray(
      currentSlate.players
    )
  ) {

    setGenerateStatus(
      "Load a DraftKings slate first.",
      "error"
    );

    return;

  }


  const session =
    await refreshOptimizerSession();


  const requestedCount =
    Math.max(
      1,
      Math.min(
        10,
        Number.parseInt(
          lineupCount?.value ||
          "1",
          10
        )
        ||
        1
      )
    );


  const payload = {

    sport:
      currentSlate.sport ||
      sportSelect?.value ||
      "basketball_wnba",

    slate_type:
      currentSlate.slate_type,

    players:
      buildOptimizerGeneratePlayers(),

    locked_names:
      getOptimizerNamesForKeys(
        lockedPlayers
      ),

    excluded_names:
      getOptimizerNamesForKeys(
        excludedPlayers
      ),

    allow_questionable:
      allowQuestionable
        ?.checked !== false,

    top_n:
      requestedCount,

  };


  if (generateLineupBtn) {

    generateLineupBtn.disabled =
      true;

  }


  setGenerateStatus(
    "Generating optimal lineup...",
    "loading"
  );


  clearOptimizerTopLineupHighlight();


  const pendingResults =
    getOptimizerLineupResultsContainer();


  if (pendingResults) {

    pendingResults.innerHTML = `
      <div class="dk-projection-loader visible">
        <span
          class="dk-projection-spinner"
          aria-hidden="true"
        ></span>

        <span>
          Optimizing lineup...
        </span>
      </div>
    `;

  }


  try {

    const response =
      await fetch(
        `${window.API_BASE}/api/dk-optimizer/generate`,
        {

          method:
            "POST",

          headers: {

            Authorization:
              `Bearer ${session.access_token}`,

            "Content-Type":
              "application/json",

          },

          body:
            JSON.stringify(
              payload
            ),

        }
      );


    let data =
      null;


    try {

      data =
        await response.json();

    } catch {

      data =
        null;

    }


    if (!response.ok) {

      const detail =
        data?.detail;


      const message =
        typeof detail ===
          "string"

          ? detail

          : (
              detail?.message ||
              `Unable to generate lineup (${response.status}).`
            );


      throw new Error(
        message
      );

    }


    if (
      !data ||
      data.success !== true ||
      !Array.isArray(
        data.lineups
      )
    ) {

      throw new Error(
        "Optimizer returned an invalid lineup response."
      );

    }


    renderOptimizerLineups(
      data
    );


    setGenerateStatus(
      `✅ Generated ${data.lineup_count} optimal lineup${data.lineup_count === 1 ? "" : "s"}.`,
      "success"
    );


    console.log(
      "🧠 DK optimal lineups:",
      data.lineups
    );

  } catch (error) {

    console.error(
      "❌ DK lineup generation failed:",
      error
    );


    const results =
      getOptimizerLineupResultsContainer();


    if (results) {

      results.innerHTML =
        "";

    }


    setGenerateStatus(
      error.message ||
      "Unable to generate optimal lineup.",
      "error"
    );

  } finally {

    updateOptimizerGenerateButton();

  }

}


generateLineupBtn
  ?.addEventListener(
    "click",
    generateOptimizerLineups
  );


// ===================================================
// QUESTIONABLE PLAYER TOGGLE
// ===================================================

allowQuestionable
  ?.addEventListener(
    "change",
    () => {

      clearOptimizerTopLineupHighlight();


      updateOptimizerCounts();


      const results =
        getOptimizerLineupResultsContainer();


      if (results) {

        results.innerHTML =
          "";

      }


      setGenerateStatus(
        "Lineup controls changed. Generate again to refresh results."
      );


      console.log(
        "🏥 Allow questionable:",
        allowQuestionable.checked
      );

    }
  );
// ===================================================
// INITIALIZE PAGE
// ===================================================

async function initializeOptimizerPage() {

  ensureOptimizerDynamicStyles();


  console.log(
    "🏀 BTBT DraftKings Optimizer loaded"
  );


  console.log(
    "🌐 Optimizer API:",
    window.API_BASE
  );


  // Start disabled until Premium access is confirmed.
  optimizerAccessAllowed =
    false;


  updateOptimizerLoadButton();


  attachOptimizerAuthWatcher();


  await verifyOptimizerAccess();

}


// ===================================================
// START
// ===================================================

initializeOptimizerPage();