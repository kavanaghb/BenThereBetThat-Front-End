let currentGameLines = [];
let visibleBooks = new Set();
let bookDisplayNames = {};
const NEWS_WARNING_THRESHOLD = 6;
let sortField = "edge";   // default sort
let sortDirection = "desc";
let searchFilter = "";
let currentViewMode = "table"; // preserves table vs card state
let currentMlbView = "odds"; // odds | value | live
let liveOddsRefreshTimer = null;

function isMarketEvMode(mode) {
  return mode === "mlb_market" || mode === "ncaaf_market";
}

function isMarketEvSport(sport) {
  return sport === "baseball_mlb" || sport === "americanfootball_ncaaf";
}

function isNcaafMarketMode() {
  return currentGameLines?.[0]?.mode === "ncaaf_market";
}

function marketSportLabel() {
  return isNcaafMarketMode() ? "NCAAF" : "MLB";
}

function showMarketRowBreakdown(game, pick = null) {
  if (game?.mode === "ncaaf_market" || ["NCAAF Market EV v1", "NCAAF EV+ v2"].includes(game?.model_version)) {
    window.showNcaafMarketBreakdown(game, pick);
    return;
  }

  window.showMlbModelBreakdown(game, pick);
}

// =====================================================
// 🔐 GAME LINES ACCESS
// Premium = all Game Lines
// MLB Free Pass = MLB + today only
// =====================================================

let gameLinesIsMlbTrial = false;
let gameLinesSubscriptionChecked = false;

function getGameLinesCentralTodayYMD() {

  const parts =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: "America/Chicago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    ).formatToParts(new Date());

  const getPart = type =>
    parts.find(part => part.type === type)?.value;

  return (
    `${getPart("year")}-` +
    `${getPart("month")}-` +
    `${getPart("day")}`
  );
}


async function resolveGameLinesAccess() {

  try {

    const {
      data: { session }
    } =
      await window.supabase.auth.getSession();


    // =====================================================
    // 🚫 MUST BE SIGNED IN
    // =====================================================

    if (!session?.user) {

      alert(
        "Please sign in to access Game Lines."
      );


      window.location.href =
        "index.html";


      return false;
    }


    // =====================================================
    // 💳 LOAD SUBSCRIPTION STATE ONCE
    // =====================================================

    if (
      !gameLinesSubscriptionChecked &&
      typeof checkSubscriptionStatus ===
        "function"
    ) {

      await checkSubscriptionStatus(
        session.user.id
      );


      gameLinesSubscriptionChecked =
        true;
    }


    // =====================================================
    // 🎟️ REFRESH FREE TRIAL STATE
    //
    // Important:
    // The trial can expire while this page is open.
    // =====================================================

    if (
      !window.hasPremiumAccess &&
      typeof refreshFreePassStatus ===
        "function"
    ) {

      await refreshFreePassStatus();
    }


    // =====================================================
    // 🎟️ UNIVERSAL 24-HOUR TRIAL
    // =====================================================

    const hasUniversalTrial =
      Boolean(

        window.hasActiveFreePass &&

        String(
          window.freePassSport ||
          ""
        )
          .trim()
          .toLowerCase() ===
            "all_access" &&

        window.freePassExpiresAt &&

        new Date(
          window.freePassExpiresAt
        ) > new Date()

      );


    // =====================================================
    // ⚾ LEGACY MLB PASS
    //
    // Keep this only so an old MLB-only trial that was
    // activated before this update can finish normally.
    // =====================================================

    const hasLegacyMlbPass =
      Boolean(

        window.hasActiveFreePass &&

        String(
          window.freePassSport ||
          ""
        )
          .trim()
          .toLowerCase() ===
            "baseball_mlb" &&

        typeof isFreePassActiveForSport ===
          "function" &&

        isFreePassActiveForSport(
          "baseball_mlb"
        )

      );


    // =====================================================
    // ⚾ LEGACY MLB MODE
    //
    // Universal trials are NOT MLB trial mode.
    // =====================================================

    gameLinesIsMlbTrial =
      !window.hasPremiumAccess &&
      hasLegacyMlbPass &&
      !hasUniversalTrial;


    // =====================================================
    // 🔒 ACCESS REQUIRED
    // =====================================================

    const hasGameLinesAccess =
      Boolean(
        window.hasPremiumAccess ||
        hasUniversalTrial ||
        hasLegacyMlbPass
      );


    if (!hasGameLinesAccess) {

      alert(
        "Your 24-hour Full Access Trial has ended. " +
        "Upgrade to Premium to continue using Game Lines."
      );


      window.location.href =
        "index.html";


      return false;
    }


    // =====================================================
    // 🎛️ CONTROLS
    // =====================================================

    const sportSelect =
      document.getElementById(
        "sportSelect"
      );


    const dateInput =
      document.getElementById(
        "gameLinesDate"
      );


    const marchMadnessBtn =
      document.getElementById(
        "gameLinesMarchMadnessBtn"
      );


    // =====================================================
    // ⚾ LEGACY MLB-ONLY TRIAL
    //
    // Only old MLB passes get locked.
    // =====================================================

    if (gameLinesIsMlbTrial) {

      const today =
        getGameLinesCentralTodayYMD();


      if (sportSelect) {

        sportSelect.value =
          "baseball_mlb";


        sportSelect.disabled =
          true;


        sportSelect.title =
          "Your legacy Free Pass includes MLB only.";
      }


      if (dateInput) {

        dateInput.value =
          today;


        dateInput.min =
          today;


        dateInput.max =
          today;


        dateInput.disabled =
          true;


        dateInput.title =
          "Your legacy MLB Free Pass includes today's slate only.";
      }


      if (marchMadnessBtn) {

        marchMadnessBtn.style.display =
          "none";
      }


      console.log(
        "⚾ Game Lines running in legacy MLB Free Pass mode"
      );

    }


    // =====================================================
    // 💳 PREMIUM OR UNIVERSAL TRIAL
    //
    // Full normal Game Lines access.
    // =====================================================

    else {

      if (sportSelect) {

        sportSelect.disabled =
          false;


        sportSelect.title =
          "";
      }


      if (dateInput) {

        dateInput.disabled =
          false;


        dateInput.removeAttribute(
          "min"
        );


        dateInput.removeAttribute(
          "max"
        );


        dateInput.title =
          "";
      }


      if (marchMadnessBtn) {

        marchMadnessBtn.style.display =
          "";
      }


      console.log(
        window.hasPremiumAccess
          ? "💳 Game Lines Premium access confirmed"
          : "🎟️ Game Lines Full Access Trial confirmed"
      );

    }


    return true;


  } catch (err) {

    console.error(
      "❌ Game Lines access check failed:",
      err
    );


    return false;
  }

}

// =====================================================
// MODEL DEBUG MODE STATE
// =====================================================

window.modelDebugMode = false;


// =====================================================
// ⭐ Primary books shown by default
// =====================================================

const PRIMARY_BOOKS = new Set([
  "draftkings",
  "fanduel",
  "betmgm",
  "fanatics",
  "williamhill_us",
  "betrivers"
]);


const BOOK_PREFS_STORAGE_KEY = "bentherebetthat_game_line_books";

function loadSavedBookPreferences(availableBooks) {
  try {
    const saved = JSON.parse(localStorage.getItem(BOOK_PREFS_STORAGE_KEY) || "null");

    if (Array.isArray(saved)) {
      const valid = saved.filter(book => availableBooks.includes(book));
      if (valid.length) return new Set(valid);
    }
  } catch (err) {
    console.warn("Unable to load sportsbook preferences:", err);
  }

  return new Set(
    availableBooks.filter(book => PRIMARY_BOOKS.has(book))
  );
}

function saveBookPreferences() {
  try {
    localStorage.setItem(
      BOOK_PREFS_STORAGE_KEY,
      JSON.stringify([...visibleBooks])
    );
  } catch (err) {
    console.warn("Unable to save sportsbook preferences:", err);
  }
}

function setVisibleBooks(bookKeys) {
  visibleBooks = new Set(bookKeys);
  saveBookPreferences();
  renderSportsbookFilters();
  renderGameLines();
}


// =====================================================
// 📈 Game Lines EV — Rendering + Pick Tracker Integration
// =====================================================

// =====================================================
// 📈 Game Lines EV — Rendering + Pick Tracker Integration
// =====================================================
async function initGameLines() {

  console.log("📈 Game Lines page loaded");

  const container =
    document.getElementById("gameLinesResults");

  if (!container) {
    console.error("Missing gameLinesResults container");
    return;
  }

  // =====================================================
  // 🔐 CHECK ACCESS FIRST
  // =====================================================
  container.innerHTML = "Checking access...";

  const accessAllowed =
    await resolveGameLinesAccess();

  if (!accessAllowed) {
    return;
  }

  container.innerHTML = "Loading...";

  try {

    const dateInput =
      document.getElementById("gameLinesDate");

    // =====================================================
    // 🏟️ GET SELECTED SPORT
    // =====================================================
    let selectedSport =
      document.getElementById("sportSelect")?.value ||
      "basketball_ncaab";

    // =====================================================
// ⚾ LEGACY MLB-ONLY FREE PASS
//
// New all_access trials DO NOT enter this block.
// This exists only for users who activated the old
// MLB-specific pass before the universal trial update.
// =====================================================

if (gameLinesIsMlbTrial) {

  selectedSport =
    "baseball_mlb";


  const today =
    getGameLinesCentralTodayYMD();


  if (dateInput) {

    dateInput.value =
      today;

  }

}

    // =====================================================
    // 🌐 BUILD GAME LINES URL
    // =====================================================
    let url =
      `${window.API_BASE}/api/game-lines` +
      `?sport=${encodeURIComponent(selectedSport)}`;

    if (dateInput?.value) {
      url +=
        `&date=${encodeURIComponent(dateInput.value)}`;
    }

    // =====================================================
    // 🔐 GET AUTHENTICATED SESSION
    // =====================================================
    const {
      data: { session }
    } =
      await window.supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error(
        "No authenticated session."
      );
    }

    // =====================================================
    // 📡 LOAD GAME LINES WITH AUTH TOKEN
    // =====================================================
    const res =
      await fetch(
        url,
        {
          headers: {
            Authorization:
              `Bearer ${session.access_token}`
          }
        }
      );

    if (!res.ok) {

      const body =
        await res.text();

      throw new Error(
        `Game Lines request failed ${res.status}: ${body}`
      );
    }

    const games =
      await res.json();

    // =====================================================
    // 🚫 NO GAMES
    // =====================================================
    if (
      !Array.isArray(games) ||
      games.length === 0
    ) {

      container.innerHTML =
        "No games found";

      return;
    }
    
currentGameLines = games;

// 📊 Update analytical market snapshot
renderMarketAnalyticsSummary();

const currentMode = games[0]?.mode || "";
const isMarketMode = isMarketEvMode(currentMode);
const isNcaafMode = currentMode === "ncaaf_market";

const mlbTabs =
  document.getElementById(
    "mlbViewTabs"
  );

if (mlbTabs) {
  mlbTabs.style.display = isMarketMode
    ? "flex"
    : "none";
}

const oddsTabButton =
  document.getElementById("mlbOddsScreenBtn");
const valueTabButton =
  document.getElementById("mlbValuePicksBtn");
const liveTabButton =
  document.getElementById("mlbLiveOddsBtn");

if (oddsTabButton) {
  oddsTabButton.textContent =
    isNcaafMode
      ? "📚 NCAAF Odds"
      : "📚 Pregame Odds";
}

if (valueTabButton) {
  valueTabButton.textContent =
    isNcaafMode
      ? "💰 NCAAF EV+ Picks"
      : "🧠 Value Picks";
}

if (liveTabButton) {
  liveTabButton.textContent = "🔴 Live Odds";
}

const modeNote = document.getElementById("gameLinesModeNote");
if (modeNote) {
  if (isNcaafMode) {
    modeNote.innerHTML =
      "🏈 NCAAF EV+ v2: multi-book no-vig market remains the anchor. Pregame spreads add a conservative SP+/Team Model v2 adjustment; moneylines and totals stay market-only. Lean = 1%+ EV; Value = 3%+ EV; Strong Value = 5%+ EV with book-count safeguards.";
  }
  else if (currentMode === "mlb_market") {
    modeNote.innerHTML =
      "⚾ MLB Model v3: Lean = 0.5%–1.99% EV with 3+ books; Value = 2%+ EV with 3+ books; Strong Value = 4%+ EV, High confidence, and 4+ books. Only Value and Strong Value enter the official tracked record.";
  }
  else {
    modeNote.innerHTML =
      "🏀 College basketball spreads use Ben's learned Torvik/market model.";
  }
}


// =====================================================
// ✅ Build bookDisplayNames + visibleBooks safely
// =====================================================

// Pull display names if backend provides them
bookDisplayNames = games[0].book_names || {};

// Find a valid sample team to derive books from
const sampleGame = games[0];

let sampleTeam = null;

if (sampleGame?.home_team && sampleGame?.books?.[sampleGame.home_team]) {
  sampleTeam = sampleGame.home_team;
}
else if (sampleGame?.away_team && sampleGame?.books?.[sampleGame.away_team]) {
  sampleTeam = sampleGame.away_team;
}
else {
  // fallback: use any available team key in books
  const teamKeys = Object.keys(sampleGame?.books || {});
  if (teamKeys.length)
    sampleTeam = teamKeys[0];
}

// derive books from actual data
let derivedBooks = [];

if (sampleTeam && sampleGame?.books?.[sampleTeam]) {
  derivedBooks = Object.keys(sampleGame.books[sampleTeam]);
}

// if backend didn't send display names, use raw book keys
if (!bookDisplayNames || Object.keys(bookDisplayNames).length === 0) {

  bookDisplayNames = {};

  derivedBooks.forEach(book => {
    bookDisplayNames[book] = book;
  });

}

// final visibleBooks set
visibleBooks = new Set(
  Object.keys(bookDisplayNames).length
    ? Object.keys(bookDisplayNames)
    : derivedBooks
);

// debug (optional)
console.log("📚 visibleBooks:", [...visibleBooks]);
console.log("📚 bookDisplayNames:", bookDisplayNames);

// =====================================================
// 🕒 Show last refresh timestamp (from backend) — CST SAFE
// =====================================================

const tsEl = document.getElementById("gameLinesTimestamp");

if (tsEl && games?.length) {

  const raw =
    games[0].last_updated_iso ??   // preferred if backend sends ISO
    games[0].last_updated ??       // fallback
    null;

  let formatted = "";

  if (!raw) {

    formatted = "";

  }
  // If backend already sent CST text, just display it
  else if (typeof raw === "string" && /CST|CDT/i.test(raw)) {

    formatted = raw;

  }
  // Otherwise parse and convert to Central Time
  else {

    const d = new Date(raw);

    if (!isNaN(d.getTime())) {

      formatted = d.toLocaleString("en-US", {
        timeZone: "America/Chicago",
        month: "numeric",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true
      }) + " CST";

    } else {

      formatted = String(raw);

    }

  }

  tsEl.innerText = formatted ? `Last refreshed: ${formatted}` : "";

}


// =====================================================
// 📚 Initialize visible books (PRIMARY only by default)
// =====================================================

visibleBooks = loadSavedBookPreferences(
  Object.keys(bookDisplayNames)
);


// =====================================================
// 🎛 Render filters and table
// =====================================================

renderSportsbookFilters();

renderGameLines();

document.getElementById("exportGameLinesCsv")
  ?.addEventListener("click", exportGameLinesCSV);

}
catch (err) {

  console.error(err);

  container.innerHTML = "Failed to load game lines";

}

}

// =====================================================
// 🎯 EDGE CLASSIFICATION
// =====================================================

function getEdgeClass(edge) {

  if (edge == null) return "";

  if (Math.abs(edge) >= 3) return "edge-strong";

  if (Math.abs(edge) >= 2) return "edge-moderate";

  return "";
}


// =====================================================
// ⚠️ LINE DISCREPANCY DETECTOR
// =====================================================

function isLineDiscrepancy(game, team, book) {

  const spreads = Object.values(game.books?.[team] || {})
    .filter(v => v != null);

  if (spreads.length < 2) return false;

  const min = Math.min(...spreads);
  const max = Math.max(...spreads);

  return Math.abs(max - min) >= 1;
}


// =====================================================
// 💰 MODEL RECOMMENDATION
// =====================================================

function getRecommendation(game) {

  if (game.edge == null) return "-";

  // positive edge = home value
  if (game.edge >= 1)
    return game.home_team;

  // negative edge = away value
  if (game.edge <= -2)
    return game.away_team;

  return "-";
}


// =====================================================
// 📊 EDGE FORMATTER (ADD THIS HERE)
// =====================================================
function formatEdge(edge, teamSpread) {

  if (edge == null)
    return "-";

  const absEdge = Math.abs(edge).toFixed(2);

  let strength = "";

  if (Math.abs(edge) >= 5)
    strength = "Strong Value";
  else if (Math.abs(edge) >= 3)
    strength = "Moderate Value";
  else if (Math.abs(edge) >= 1.5)
    strength = "Lean Value";
  else
    strength = "Weak Value";

  const side = teamSpread > 0
    ? "Underdog"
    : "Favorite";

  return `
    <div class="edge-container">
      <div class="edge-number">${absEdge}</div>
      <div class="edge-label">${strength} (${side})</div>
    </div>
  `;
}


// =====================================================
// 📊 Render Game Lines Table
// =====================================================

function renderGameLines() {

  const container = document.getElementById("gameLinesResults");

  if (isMarketEvMode(currentGameLines?.[0]?.mode)) {
    renderMlbMarketPicks();
    return;
  }

  container.innerHTML = "";

  const table = document.createElement("table");

  table.className = "odds-table";

  let header = `
    <thead>
      <tr>
        <th class="sortable" onclick="sortGames('game')">
      Game
      <span class="sort-arrows">
        <span class="${sortField === 'game' && sortDirection === 'asc' ? 'active' : ''}">▲</span>
        <span class="${sortField === 'game' && sortDirection === 'desc' ? 'active' : ''}">▼</span>
      </span>
    </th>
        <th class="sortable" onclick="sortGames('time')">
      Time
      <span class="sort-arrows">
        <span class="${sortField === 'time' && sortDirection === 'asc' ? 'active' : ''}">▲</span>
        <span class="${sortField === 'time' && sortDirection === 'desc' ? 'active' : ''}">▼</span>
      </span>
    </th>
        <th class="team-col">Team</th>
  `;

    // ✅ Restore sportsbook headers
  visibleBooks.forEach(book => {

    header += `
      <th>
        ${bookDisplayNames?.[book] || book}
      </th>
    `;

  });

  header += `
    
    <th class="model-col">
      Ben's Model
      <span class="info-icon"
        title="Predicted point spread using Torvik efficiency ratings, tempo, defense vs. offense allowed and blended with 6 Major books!.">
        ⓘ
      </span>
    </th>

    <th class="sortable" onclick="sortGames('edge')">
     Edge
     <span class="sort-arrows">
        <span class="${sortField === 'edge' && sortDirection === 'asc' ? 'active' : ''}">▲</span>
        <span class="${sortField === 'edge' && sortDirection === 'desc' ? 'active' : ''}">▼</span>
     </span>
      <span class="info-icon"
        title="Difference between Ben's Model and sportsbook consensus">
       ⓘ
      </span>
   
    <th class="recommend-col">
      Recommendation
      <span class="info-icon"
        title="Suggested bet when Edge ≥ 2.">
        ⓘ
      </span>
    </th>

    <th class="add-col">Add to Pick Tracker</th>

      </tr>
    </thead>
    <tbody></tbody>
  `;

  table.innerHTML = header;

  const tbody = table.querySelector("tbody");


const filteredGames = currentGameLines.filter(game => {

  if (!searchFilter)
    return true;

  const searchText = (
    (game.event_title || "") + " " +
    (game.home_team || "") + " " +
    (game.away_team || "")
  ).toLowerCase();

  return searchText.includes(searchFilter);

});

// ✅ ONLY ONE forEach
filteredGames.forEach(game => {

  const teams = [game.home_team, game.away_team];

  teams.forEach((team, index) => {

    const tr = document.createElement("tr");

    tr.style.cursor = "pointer";

 tr.addEventListener("click", () => {

  // Only open modal if debug mode enabled
  if (!window.modelDebugMode)
    return;

  // Remove highlight from all rows
  document.querySelectorAll(".model-row-active")
    .forEach(r => r.classList.remove("model-row-active"));

  // Highlight this row
  tr.classList.add("model-row-active");

  window.showModelBreakdown(game);

});

    // ✅ Preserve row styling
    if (index === 0)
      tr.classList.add("game-start-row");

    if (index === 1)
      tr.classList.add("game-end-row");


    let rowHTML = "";

    // =====================================================
    // ✅ Only show game + CST time on first row
    // =====================================================
    if (index === 0) {

      const displayTime =
       game.game_time_display ||
        new Date(game.game_timestamp * 1000).toLocaleString("en-US", {
          timeZone: "America/Chicago",
          month: "numeric",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true
        });

      rowHTML += `
      <td rowspan="2">${game.event_title}</td>

      <td rowspan="2"
          class="game-time-cell"
          data-timestamp="${game.game_timestamp}">
          ${displayTime}
      </td>
    `;
    }

    rowHTML += `<td class="team-col">${team}</td>`;


      // ============================================
      // Render sportsbook spreads
      // ============================================

      visibleBooks.forEach(book => {

        const spread = game.books?.[team]?.[book];

        const discrepancy = isLineDiscrepancy(game, team, book);

        if (spread == null) {

          rowHTML += `<td>-</td>`;

        }
        else if (discrepancy) {

     rowHTML += `
        <td class="line-discrepancy highlight-cell">
         ${spread}
         <div class="badge">Line discrepancy</div>
       </td>
     `;

    }
        
        else {

          rowHTML += `<td>${spread}</td>`;

        }

      });


// ============================================
// Get primary spread (first available book)
// ============================================

let primarySpread = null;

for (const book of visibleBooks) {

  const s = game.books?.[team]?.[book];

  if (s !== null && s !== undefined) {
    primarySpread = s;
    break;
  }
}



// ============================================
// ✅ EDGE display — USE BACKEND VALUE ONLY
// ============================================

// ============================================
// ✅ EDGE display — show Consensus edge + Book edge
// ============================================

let edgeCell = "-";

// 1) Consensus edge (backend)
const consensusEdge =
  (game.recommended_team &&
   team === game.recommended_team &&
   game.recommended_edge != null)
    ? Number(game.recommended_edge)
    : null;

// 2) Book edge (based on the book line shown in this row)
let bookEdge = null;

if (primarySpread != null && game.model_spread != null) {

  // model_spread = HOME margin (home − away)
  const modelHomeMargin = Number(game.model_spread);

  // convert vegas spread → HOME margin
  const vegasHomeMargin =
    (team === game.home_team)
      ? -Number(primarySpread)
      : Number(primarySpread);

  // edge = model − vegas
  const homeEdge = modelHomeMargin - vegasHomeMargin;

  // convert back to team perspective
  bookEdge =
    (team === game.home_team)
      ? homeEdge
      : -homeEdge;
}
// Edge badge formatter
function edgeBadge(edgeValue) {

  const absEdge = Math.abs(edgeValue);

  const cls =
    absEdge >= 5 ? "edge-strong" :
    absEdge >= 3 ? "edge-moderate" :
    absEdge >= 2 ? "edge-lean" :
    absEdge >= 1 ? "edge-weak" :
    "edge-minimal";

  const label =
    absEdge >= 3 ? "🔥 Strong" :
    absEdge >= 2 ? "Bet" :
    absEdge >= 1 ? "Lean" :
    "Minimal";

  return `<span class="${cls}">${absEdge.toFixed(2)} <div class="edge-label">${label}</div></span>`;
}

// Build cell: consensus on top, book edge below (if available)
if (consensusEdge != null || bookEdge != null) {

  edgeCell = `
    <div class="edge-stack">
      <div class="edge-row">
        ${edgeBadge(consensusEdge)}
        <div class="edge-sub">Consensus</div>
      </div>

     
  `;
}
// Recommendation display
let recommendationCell = "-";

if (
  game.recommended_team &&
  team === game.recommended_team &&
  game.recommended_spread != null
) {

  const spread =
    game.recommended_spread > 0
      ? `+${game.recommended_spread}`
      : game.recommended_spread;

  recommendationCell =
    `Take ${game.recommended_team} ${spread}`;
}

let modelCell = "-";

if (game.model_spread != null) {

  // game.model_spread = HOME margin (home − away)

  // Backend already provides Vegas-format model lines
if (team === game.home_team) {

    const v = -game.model_spread;   // home line

    modelCell = v > 0
        ? "+" + v.toFixed(2)
        : v.toFixed(2);
}

if (team === game.away_team) {

    const v = game.model_spread;    // away line

    modelCell = v > 0
        ? "+" + v.toFixed(2)
        : v.toFixed(2);
}

}



// Render
rowHTML += `
  <td class="model-col">${modelCell}</td>

  <td>
    ${edgeCell}
  </td>

  <td class="recommend-col">
    ${recommendationCell}
  </td>

  <td class="add-col">
    <button class="add-to-slip-btn">➕ Add</button>
  </td>
`;





tr.innerHTML = rowHTML;


// Attach Add button handler safely
const addBtn = tr.querySelector(".add-to-slip-btn");

if (addBtn) {

  addBtn.addEventListener("click", async (e) => {

  e.stopPropagation(); // prevents modal opening

  try {

      // Prevent duplicate adds
      if (addBtn.dataset.added === "true")
        return;

      const firstBook = [...visibleBooks][0];

      // =====================================================
      // Prompt user for actual spread bet
      // =====================================================

      // Default suggestion from first visible book
      const defaultSpread = game.books?.[team]?.[firstBook];

      // Prompt user
      const userInput = prompt(
        `Enter spread you bet for ${team}:\n\nExample: +4.5 or -3.0`,
        defaultSpread ?? ""
      );

      if (userInput === null) {
        return; // user cancelled
      }

      // ✅ Convert user input to numeric spread
      const spread = Number(userInput);

      if (isNaN(spread)) {
        alert("Invalid line value.");
        console.error("Invalid spread:", userInput);
        return;
      }

      // ✅ FIX: ensure sport is always defined
      const selectedSport =
        document.getElementById("sportSelect")?.value ||
        window.selectedSport ||
        game?.sport ||
        "basketball_ncaab";

      // ✅ DEBUG: inspect full game object to verify available date fields
      console.log("FULL GAME OBJECT:", game);

      // ✅ FIX: use correct backend field names with safe date fallback
      const pick = {

        sport: selectedSport,

        event: game.event_title,

        event_id: game.event_id,

        game_date: game.game_date,

        player: team,

        market: "spread",

        outcome: spread < 0 ? "favorite" : "underdog",

        line: spread

      };

      // ✅ DEBUG — verify before sending
      console.log("PICK BEING SENT:", pick);
      console.log("GAME OBJECT:", game);

      // ✅ DEBUG: confirm final pick object being sent
      console.log("FINAL PICK OBJECT:", pick);

      // ✅ Ensure Supabase exists
      if (!window.supabase) {
        alert("Supabase not initialized.");
        console.error("window.supabase is missing");
        return;
      }

      const sessionResponse =
        await window.supabase.auth.getSession();

      const session = sessionResponse?.data?.session;

      console.log("Supabase session:", session);

      if (!session || !session.access_token) {

        alert("Please log in first.");
        console.error("No valid Supabase session");
        return;

      }

      // ✅ Call correct manual slip endpoint
      const res = await fetch(`${window.API_BASE}/api/slips/manual`, {

        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },

        body: JSON.stringify({

          slip_type: "regular",

          platform: "sportsbook",

          // ✅ REQUIRED for backend
          sport: selectedSport,

          title: `${team} vs ${game.event_title}`,

          picks: [pick]

        })

      });

      // ✅ Always log backend response
      const responseText = await res.text();

      console.log("Slip API status:", res.status);
      console.log("Slip API response:", responseText);

      if (!res.ok) {

        throw new Error(responseText);

      }

      const data = JSON.parse(responseText);

      console.log("✅ Slip created successfully:", data);

      // ✅ Visual feedback
      addBtn.dataset.added = "true";
      addBtn.innerText = "✓ Added";
      addBtn.style.backgroundColor = "#28a745";
      addBtn.style.color = "#fff";
      addBtn.style.fontWeight = "600";

    }
    catch (err) {

      console.error("❌ Failed to create slip FULL ERROR:", err);

      alert("Failed to add pick. See console.");

    }

  });

}

      tbody.appendChild(tr);

    });

  });

  // Create scroll wrapper
const wrapper = document.createElement("div");
wrapper.className = "table-scroll-wrapper";

wrapper.appendChild(table);

container.appendChild(wrapper);

// ↔️ Persistent horizontal scrollbar
attachGameLinesHorizontalScrollbar(
  wrapper
);

}



function renderSportsbookFilters() {

  const container = document.getElementById("sportsbookFilters");

  if (!container)
    return;

  container.innerHTML = "";

  Object.entries(bookDisplayNames).forEach(([key, name]) => {

    const label = document.createElement("label");

    const isChecked = visibleBooks.has(key);

    label.innerHTML = `
      <input type="checkbox" value="${key}" ${isChecked ? "checked" : ""}> ${name}
    `;

    label.querySelector("input").addEventListener("change", e => {

      if (e.target.checked)
        visibleBooks.add(key);
      else
        visibleBooks.delete(key);

      saveBookPreferences();
      renderGameLines();

    });

    container.appendChild(label);

  });

  const popularBtn = document.getElementById("popularBooksBtn");
  const allBtn = document.getElementById("selectAllBooksBtn");
  const clearBtn = document.getElementById("clearAllBooksBtn");

  const available = Object.keys(bookDisplayNames);
  const popular = available.filter(book => PRIMARY_BOOKS.has(book));

  popularBtn?.classList.toggle(
    "active",
    popular.length > 0 &&
    popular.every(book => visibleBooks.has(book)) &&
    visibleBooks.size === popular.length
  );

  allBtn?.classList.toggle(
    "active",
    available.length > 0 &&
    available.every(book => visibleBooks.has(book))
  );

  clearBtn?.classList.toggle("active", visibleBooks.size === 0);

}

// =====================================================
// 📅 Date picker handler + initialization — CST SAFE FINAL
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  initializeFloatingTooltips();
  initializeOddsConverter();

  const modelBtn = document.getElementById("toggleModelDebug");

if (modelBtn) {

  modelBtn.addEventListener("click", () => {

    const selectedSport =
      document.getElementById("sportSelect")?.value;

    window.modelDebugMode = !window.modelDebugMode;

    if (window.modelDebugMode) {
      modelBtn.classList.add("active");
      modelBtn.style.background = "#4ade80";
      modelBtn.style.color = "#000";
      modelBtn.style.borderColor = "#4ade80";
    } else {
      modelBtn.classList.remove("active");
      modelBtn.style.background = "#f8fafc";
      modelBtn.style.color = "#334155";
      modelBtn.style.borderColor = "rgba(148,163,184,0.4)";
    }

    console.log("Model debug mode:", window.modelDebugMode);

  });

}
  console.log("📅 Initializing Game Lines controls");

  const dateInput = document.getElementById("gameLinesDate");
  const loadBtn = document.getElementById("loadGameLinesBtn");
  const refreshBtn = document.getElementById("refreshGameLinesBtn");
  const searchInput = document.getElementById("gameSearchInput");
  const sportSelect = document.getElementById("sportSelect");

  const marchMadnessBtn =
  document.getElementById(
    "gameLinesMarchMadnessBtn"
  );


marchMadnessBtn
  ?.addEventListener(
    "click",
    () => {

      if (!window.hasPremiumAccess) {

        alert(
          "🏀 March Madness is a Premium feature."
        );

        return;
      }


      window.location.href =
        "march-madness.html";

    }
  );

  updateModelDetailButtonLabel();
  sportSelect?.addEventListener("change", updateModelDetailButtonLabel);

  const popularBooksBtn = document.getElementById("popularBooksBtn");
  const selectAllBooksBtn = document.getElementById("selectAllBooksBtn");
  const clearAllBooksBtn = document.getElementById("clearAllBooksBtn");

  popularBooksBtn?.addEventListener("click", () => {
    const popular = Object.keys(bookDisplayNames)
      .filter(book => PRIMARY_BOOKS.has(book));
    setVisibleBooks(popular);
  });

  selectAllBooksBtn?.addEventListener("click", () => {
    setVisibleBooks(Object.keys(bookDisplayNames));
  });

  clearAllBooksBtn?.addEventListener("click", () => {
    setVisibleBooks([]);
  });

  sportSelect?.addEventListener("change", () => {
    window.modelDebugMode = false;

    stopLiveOddsRefresh();
    currentMlbView = "odds";

    const mlbOddsScreenBtn =
      document.getElementById("mlbOddsScreenBtn");
    const mlbValuePicksBtn =
      document.getElementById("mlbValuePicksBtn");
    const mlbLiveOddsBtn =
      document.getElementById("mlbLiveOddsBtn");

    mlbOddsScreenBtn?.classList.add("active");
    mlbValuePicksBtn?.classList.remove("active");
    mlbLiveOddsBtn?.classList.remove("active");

    initGameLines();
  });

  // =====================================================
  // ✅ Set default date using CENTRAL TIME (FIXES SPILLOVER)
  // =====================================================

// =====================================================
// ✅ Set default date using CENTRAL TIME (FIXES SPILLOVER)
// =====================================================
if (dateInput && !dateInput.value) {

  const now = new Date();

  const central = new Date(
    now.toLocaleString("en-US", { timeZone: "America/Chicago" })
  );

  const yyyy = central.getFullYear();
  const mm = String(central.getMonth() + 1).padStart(2, "0");
  const dd = String(central.getDate()).padStart(2, "0");

  dateInput.value = `${yyyy}-${mm}-${dd}`;

  console.log("📅 Default date set (CST):", dateInput.value);

}

  // =====================================================
  // Load Games button
  // =====================================================

  if (loadBtn) {

    loadBtn.addEventListener("click", () => {

      console.log("🔄 Load Games clicked");

      initGameLines();

    });

  }

  // =====================================================
  // Refresh button
  // =====================================================

  if (refreshBtn) {

    refreshBtn.addEventListener("click", () => {

      console.log("🔄 Refresh clicked");

      initGameLines(true);

    });

  }



  // =====================================================
  // Search filter
  // =====================================================

 

  if (searchInput) {

  searchInput.addEventListener("input", (e) => {

    searchFilter = e.target.value.toLowerCase().trim();
    console.log("🔎 Search filter:", searchFilter);

    renderGameLines();

    // ✅ REAPPLY ACTIVE VIEW AFTER RENDER
    if (currentViewMode === "card") {

      renderGameCards();

      document.querySelector(".table-scroll-wrapper").style.display = "none";
      document.getElementById("gameLinesCardView").style.display = "block";

    } else {

      document.querySelector(".table-scroll-wrapper").style.display = "block";
      document.getElementById("gameLinesCardView").style.display = "none";

    }

  });

}


// =====================================================
// 📱 Toggle Table / Card View
// =====================================================

const tableBtn = document.getElementById("tableViewBtn");
const cardBtn = document.getElementById("cardViewBtn");
const cardView = document.getElementById("gameLinesCardView");

const mlbOddsScreenBtn = document.getElementById("mlbOddsScreenBtn");
const mlbValuePicksBtn = document.getElementById("mlbValuePicksBtn");
const mlbLiveOddsBtn = document.getElementById("mlbLiveOddsBtn");

mlbOddsScreenBtn?.addEventListener("click", () => {
  currentMlbView = "odds";
  mlbOddsScreenBtn.classList.add("active");
  mlbValuePicksBtn?.classList.remove("active");
  mlbLiveOddsBtn?.classList.remove("active");
  renderGameLines();
});

mlbValuePicksBtn?.addEventListener("click", () => {
  currentMlbView = "value";
  mlbValuePicksBtn.classList.add("active");
  mlbOddsScreenBtn?.classList.remove("active");
  mlbLiveOddsBtn?.classList.remove("active");
  renderGameLines();
});

mlbLiveOddsBtn?.addEventListener("click", () => {
  currentMlbView = "live";
  mlbLiveOddsBtn.classList.add("active");
  mlbOddsScreenBtn?.classList.remove("active");
  mlbValuePicksBtn?.classList.remove("active");
  renderGameLines();
});

tableBtn?.addEventListener("click", () => {

  currentViewMode = "table";

  const tableWrapper =
    document.querySelector(
      ".table-scroll-wrapper"
    );

  if (tableWrapper) {

    tableWrapper.style.display =
      "block";

    attachGameLinesHorizontalScrollbar(
      tableWrapper
    );

  }


  cardView.style.display =
    "none";


  tableBtn.classList.add(
    "active"
  );

  cardBtn.classList.remove(
    "active"
  );

});

cardBtn?.addEventListener("click", () => {

  currentViewMode = "card";


  renderGameCards();


  const tableWrapper =
    document.querySelector(
      ".table-scroll-wrapper"
    );


  if (tableWrapper) {

    tableWrapper.style.display =
      "none";

  }


  document
    .querySelectorAll(
      ".game-lines-horizontal-scroll"
    )
    .forEach(el => el.remove());


  cardView.style.display =
    "block";


  cardBtn.classList.add(
    "active"
  );

  tableBtn.classList.remove(
    "active"
  );

});

// =====================================================
// Initial load after controls are initialized
// =====================================================

  initGameLines();

});

window.showModelBreakdown = function(game)
{
  if (
    game?.mode === "ncaaf_market"
    || ["NCAAF Market EV v1", "NCAAF EV+ v2"].includes(game?.model_version)
    || document.getElementById("sportSelect")?.value === "americanfootball_ncaaf"
  ) {
    window.showNcaafMarketBreakdown(game);
    return;
  }

  if (
    game?.mode === "mlb_market"
    || game?.model_version === "MLB Model v3"
    || document.getElementById("sportSelect")?.value === "baseball_mlb"
  ) {
    window.showMlbModelBreakdown(game);
    return;
  }

  const modal = document.getElementById("modelBreakdownModal");
  const content = document.getElementById("modelBreakdownContent");

  const d = game.debug || {};

  const val = (v, digits=2) =>
    v !== undefined && v !== null && !isNaN(v)
      ? Number(v).toFixed(digits)
      : `<span class="na">N/A</span>`;

  const signed = (n, digits=2) =>
  {
    if(n === null || n === undefined || isNaN(n))
      return `<span class="na">N/A</span>`;

    const num = Number(n);
    return `${num > 0 ? "+" : ""}${num.toFixed(digits)}`;
  };

  const yesNo = (v) =>
    v === true
      ? `<span class="yes">YES</span>`
      : `<span class="no">NO</span>`;


  // MODEL INTERPRETATION updated

 
  const modelMargin = game.model_spread ?? null;

  const modelHomeLine =
    modelMargin !== null ? -Number(modelMargin) : null;

  const modelAwayLine =
    modelMargin !== null ? Number(modelMargin) : null;

  let modelFavTeam = "N/A";
  let modelFavLine = `<span class="na">N/A</span>`;

  if(modelMargin !== null)
  {
    if(modelMargin > 0)
    {
      modelFavTeam = game.home_team;
      modelFavLine = signed(modelHomeLine);
    }
    else if(modelMargin < 0)
    {
      modelFavTeam = game.away_team;
      modelFavLine = signed(modelAwayLine);
    }
    else
    {
      modelFavTeam = "Pick'em";
      modelFavLine = "0.00";
    }
  }


  const effHome =
    d.home_adj_off != null && d.home_adj_def != null
      ? d.home_adj_off - d.home_adj_def
      : null;

  const effAway =
    d.away_adj_off != null && d.away_adj_def != null
      ? d.away_adj_off - d.away_adj_def
      : null;


  const vegasHomeLine = game.consensus_home ?? null;

  const edgeHome =
    vegasHomeLine != null && modelHomeLine != null
      ? vegasHomeLine - modelHomeLine
      : null;

  const edgeAway =
    edgeHome != null ? -edgeHome : null;


  const modelError =
    vegasHomeLine != null && modelHomeLine != null
      ? modelHomeLine - vegasHomeLine
      : null;


  const raw = d.raw_spread ?? null;

  const idealScaling =
    raw != null && vegasHomeLine != null && raw !== 0
      ? -vegasHomeLine / raw
      : null;



  content.innerHTML =
  `
  <div class="model-panel">

  <div class="model-header">

    <div>

      <div class="teams">
        ${game.away_team} @ ${game.home_team}
      </div>

      ${
        modelMargin !== null
        ? `
        <div class="favorite-team" style="
          margin-top:4px;
          font-size:14px;
          color:#94a3b8;
        ">
          Model Favorite:
          <span style="
            color:#ffffff;
            font-weight:600;
            margin-left:4px;
          ">
            ${
              modelMargin > 0
                ? game.home_team
                : modelMargin < 0
                ? game.away_team
                : "Pick'em"
            }
          </span>
        </div>

        <div class="model-spread ${
          modelMargin < 0 ? "negative" : "positive"
        }" style="margin-top:2px;">
          ${
            modelMargin > 0
              ? signed(-modelMargin)
              : modelMargin < 0
              ? signed(modelMargin)
              : "0.00"
          }
        </div>
        `

        : `
        <div class="model-spread na">
          No model data available
        </div>
        `
      }

    </div>

  </div>

    <!-- TORVIK -->
    <div class="model-section">

      <div class="section-title">
        Torvik Mapping
      </div>

      <div class="grid">

        <div>Home Found</div>
        <div>${yesNo(d.home_found)}</div>

        <div>Away Found</div>
        <div>${yesNo(d.away_found)}</div>

        <div>Home Mapping</div>
        <div>${d.home_mapping ?? "NONE"}</div>

        <div>Away Mapping</div>
        <div>${d.away_mapping ?? "NONE"}</div>

      </div>

    </div>


    <!-- TEAM TABLE -->
    <div class="model-section">

      <div class="section-title">
        Team Efficiency Comparison
      </div>

      <table class="model-table">

        <thead>
          <tr>
            <th></th>
            <th>${game.away_team}</th>
            <th>${game.home_team}</th>
          </tr>
        </thead>

        <tbody>

          <tr>
            <td>Adj Off</td>
            <td>${val(d.away_adj_off,1)}</td>
            <td>${val(d.home_adj_off,1)}</td>
          </tr>

          <tr>
            <td>Adj Def</td>
            <td>${val(d.away_adj_def,1)}</td>
            <td>${val(d.home_adj_def,1)}</td>
          </tr>

          <tr>
            <td>Efficiency Rating</td>
            <td>${val(effAway)}</td>
            <td>${val(effHome)}</td>
          </tr>

          <tr>
            <td>Tempo</td>
            <td>${val(d.away_tempo,1)}</td>
            <td>${val(d.home_tempo,1)}</td>
          </tr>

          <tr>
            <td>Barthag Rating</td>
            <td>${d.away_barthag?.toFixed(4) ?? "N/A"}</td>
            <td>${d.home_barthag?.toFixed(4) ?? "N/A"}</td>
          </tr>

        </tbody>

      </table>

    </div>


    <!-- SPREAD -->
    <div class="model-section">

      <div class="section-title">
        Spread Comparison
      </div>

      <div class="grid">

        <div>Model Line (${game.home_team})</div>
        <div>${signed(modelHomeLine)}</div>

        <div>Vegas Line (${game.home_team})</div>
        <div>${signed(vegasHomeLine)}</div>

        <div>Edge (${game.home_team})</div>
        <div class="highlight">${signed(edgeHome)}</div>

        <div>Edge (${game.away_team})</div>
        <div class="highlight">${signed(edgeAway)}</div>

      </div>

    </div>


    <!-- REGRESSION DIAGNOSTICS -->
<div class="model-section">

  <div class="section-title">
    Regression Diagnostics
  </div>

  <div class="grid">

    <div>Efficiency Margin</div>
    <div>${val(d.eff_margin)}</div>

    <div>Tempo Offset</div>
    <div>${val(d.tempo_offset,2)}</div>

    <div>Intercept Contribution</div>
    <div>${signed(d.intercept)}</div>

    <div>Efficiency Contribution</div>
    <div>${signed(d.eff_contrib)}</div>

    <div>Tempo Contribution</div>
    <div>${signed(d.tempo_contrib)}</div>

    <div class="divider"></div>
    <div class="divider"></div>

    <div>Model Spread</div>
    <div class="highlight">${signed(d.model_spread)}</div>

    <div>Model Error</div>
    <div class="${Math.abs(d.model_error) <= 1 ? "good" : "bad"}">
      ${signed(d.model_error)}
    </div>

  </div>

</div>
  `;


  modal.classList.remove("hidden");

};

// =====================================================
// 🔽 SORT FUNCTION (GLOBAL)
// =====================================================



function sortGames(field) {

  if (sortField === field)
    sortDirection =
      sortDirection === "asc" ? "desc" : "asc";
  else {
    sortField = field;
    sortDirection = "desc";
  }

  currentGameLines.sort((a, b) => {

    let valA, valB;

    if (field === "game") {

      valA = (a.event_title || "").toLowerCase();
      valB = (b.event_title || "").toLowerCase();

    }
    else if (field === "edge") {

      valA = Math.abs(a.recommended_edge || 0);
      valB = Math.abs(b.recommended_edge || 0);

    }
    else if (field === "time") {

      // ✅ Correct numeric timestamp sorting
      valA = a.game_timestamp || 0;
      valB = b.game_timestamp || 0;

    }

    if (valA < valB)
      return sortDirection === "asc" ? -1 : 1;

    if (valA > valB)
      return sortDirection === "asc" ? 1 : -1;

    return 0;

  });

  renderGameLines();

}

// =====================================================
// Export Game Lines EV to CSV
// =====================================================
function exportGameLinesCSV() {

  if (!currentGameLines || currentGameLines.length === 0) {
    alert("No game lines data to export.");
    return;
  }

  const rows = [];

  rows.push([
    "Date",
    "Game",
    "Team",
    "Model Spread",
    "Recommended Edge",
    "Recommended Bet"
  ]);

  currentGameLines.forEach(game => {

    rows.push([
      game.game_date || "",
      game.event_title || "",
      game.home_team || "",
      game.model_spread != null ? (-game.model_spread).toFixed(2) : "",
      game.recommended_team === game.home_team ? game.recommended_edge : "",
      game.recommended_team === game.home_team ? "YES" : ""
    ]);

    rows.push([
      game.game_date || "",
      game.event_title || "",
      game.away_team || "",
      game.model_spread != null ? (game.model_spread).toFixed(2) : "",
      game.recommended_team === game.away_team ? game.recommended_edge : "",
      game.recommended_team === game.away_team ? "YES" : ""
    ]);

  });

  const csvContent =
    "data:text/csv;charset=utf-8," +
    rows.map(row => row.join(",")).join("\n");

  const link = document.createElement("a");

  link.setAttribute("href", encodeURI(csvContent));

  const dateStr = new Date().toISOString().slice(0,10);

  link.setAttribute("download", `game-lines-ev-${dateStr}.csv`);

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

}



function stopLiveOddsRefresh() {
  if (liveOddsRefreshTimer) {
    clearInterval(liveOddsRefreshTimer);
    liveOddsRefreshTimer = null;
  }
}

function startLiveOddsRefresh() {
  stopLiveOddsRefresh();

  liveOddsRefreshTimer = setInterval(() => {
    const sport =
      document.getElementById("sportSelect")?.value;

    if (
      currentMlbView === "live"
      && isMarketEvSport(sport)
    ) {
      console.log(
        `🔴 Refreshing live ${sport === "americanfootball_ncaaf" ? "NCAAF" : "MLB"} odds...`
      );
      initGameLines(true);
    }
  }, 30000);
}

// =====================================================
// ⚾ MLB ODDS SCREEN + VALUE PICKS
// =====================================================
function formatAmericanOdds(value) {
  if (value === null || value === undefined || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return "-";
  return n > 0 ? `+${n}` : `${n}`;
}

function mlbEvBadge(ev, recommendation = "PASS") {
  if (ev == null || Number.isNaN(Number(ev))) return "-";

  const n = Number(ev);

  if (recommendation === "STRONG_VALUE")
    return `<span class="edge-strong">🔥 ${n.toFixed(2)}% EV</span>`;

  if (recommendation === "VALUE")
    return `<span class="edge-moderate">🧠 ${n.toFixed(2)}% EV</span>`;

  if (recommendation === "LEAN")
    return `<span class="edge-weak">Lean ${n.toFixed(2)}% EV</span>`;

  if (n >= 0)
    return `<span>${n.toFixed(2)}% EV</span>`;

  return `<span style="color:#9ca3af;">${n.toFixed(2)}% EV</span>`;
}

function recommendationLabel(value) {
  if (value === "STRONG_VALUE") return "🔥 Strong";
  if (value === "VALUE") return "🧠 Value";
  if (value === "LEAN") return "Lean";
  return "Pass";
}

function americanImpliedProbability(value) {
  const odds = Number(value);

  if (!Number.isFinite(odds) || odds === 0)
    return null;

  return odds > 0
    ? 100 / (odds + 100)
    : Math.abs(odds) / (Math.abs(odds) + 100);
}

function probabilityDistancePct(price, bestPrice) {
  const p = americanImpliedProbability(price);
  const bestP = americanImpliedProbability(bestPrice);

  if (p == null || bestP == null)
    return null;

  return Math.abs(p - bestP) * 100;
}

function oddsCellClass(price, bestPrice) {

  if (price == null)
    return "odds-cell-missing";


  const distance =
    probabilityDistancePct(
      price,
      bestPrice
    );


  if (distance == null)
    return "";


  // Exact best price
  if (distance < 0.001)
    return "odds-cell-best";


  // Essentially same price
  if (distance <= 0.50)
    return "odds-cell-near";


  // Small difference — leave neutral
  if (distance < 1.50)
    return "";


  // Clearly worse
  return "odds-cell-worse";
}

function evCellClass(edge) {
  const n = Number(edge);

  if (!Number.isFinite(n))
    return "";

  if (n < 0)
    return "price-edge-negative";

  if (n < 0.15)
    return "price-edge-neutral";

  if (n < 0.5)
    return "price-edge-shop";

  if (n < 1.0)
    return "price-edge-value";

  return "price-edge-strong";
}

// =====================================================
// ↔️ PERSISTENT HORIZONTAL TABLE SCROLLBAR
// =====================================================

// =====================================================
// ↔️ PERSISTENT HORIZONTAL TABLE SCROLLBAR
// =====================================================

function attachGameLinesHorizontalScrollbar(wrapper) {

  if (!wrapper)
    return;


  // =====================================================
  // 🧹 REMOVE PREVIOUS BAR
  // =====================================================

  document
    .querySelectorAll(
      ".game-lines-horizontal-scroll"
    )
    .forEach(el => el.remove());


  // =====================================================
  // 🧱 BUILD FIXED BOTTOM BAR
  // =====================================================

  const scrollbar =
    document.createElement("div");


  scrollbar.className =
    "game-lines-horizontal-scroll";


  const inner =
    document.createElement("div");


  inner.className =
    "game-lines-horizontal-scroll-inner";


  scrollbar.appendChild(inner);

  document.body.appendChild(scrollbar);


  // Prevent bar/table from fighting each other
  let syncingScrollbar = false;
  let syncingTable = false;


  // =====================================================
  // 📏 SIZE BAR USING ACTUAL WRAPPER SCROLL WIDTH
  // =====================================================

  function updateScrollbar() {

    if (!document.body.contains(wrapper)) {

      scrollbar.remove();

      return;

    }


    const rect =
      wrapper.getBoundingClientRect();


    const totalWidth =
      wrapper.scrollWidth;


    const visibleWidth =
      wrapper.clientWidth;


    // Nothing to horizontally scroll
    if (totalWidth <= visibleWidth + 2) {

      scrollbar.style.display =
        "none";

      return;

    }


    // Only show while table is in viewport
    const isVisible =
      rect.bottom > 0 &&
      rect.top < window.innerHeight;


    if (!isVisible) {

      scrollbar.style.display =
        "none";

      return;

    }


    scrollbar.style.display =
      "block";


    const left =
      Math.max(
        rect.left,
        0
      );


    const right =
      Math.min(
        rect.right,
        window.innerWidth
      );


    scrollbar.style.left =
      `${left}px`;


    scrollbar.style.width =
      `${Math.max(
        right - left,
        100
      )}px`;


    // KEY FIX:
    // use WRAPPER scrollWidth,
    // not table.scrollWidth
    inner.style.width =
      `${totalWidth}px`;

  }


  // =====================================================
  // ↔️ BOTTOM BAR → TABLE
  // =====================================================

  scrollbar.addEventListener(
    "scroll",
    () => {

      if (syncingTable)
        return;


      const barMax =
        scrollbar.scrollWidth -
        scrollbar.clientWidth;


      const tableMax =
        wrapper.scrollWidth -
        wrapper.clientWidth;


      if (
        barMax <= 0 ||
        tableMax <= 0
      ) {
        return;
      }


      const ratio =
        scrollbar.scrollLeft /
        barMax;


      syncingScrollbar =
        true;


      wrapper.scrollLeft =
        ratio * tableMax;


      requestAnimationFrame(
        () => {

          syncingScrollbar =
            false;

        }
      );

    }
  );


  // =====================================================
  // ↔️ TABLE → BOTTOM BAR
  // =====================================================

  wrapper.addEventListener(
    "scroll",
    () => {

      if (syncingScrollbar)
        return;


      const tableMax =
        wrapper.scrollWidth -
        wrapper.clientWidth;


      const barMax =
        scrollbar.scrollWidth -
        scrollbar.clientWidth;


      if (
        tableMax <= 0 ||
        barMax <= 0
      ) {
        return;
      }


      const ratio =
        wrapper.scrollLeft /
        tableMax;


      syncingTable =
        true;


      scrollbar.scrollLeft =
        ratio * barMax;


      requestAnimationFrame(
        () => {

          syncingTable =
            false;

        }
      );

    }
  );


  // =====================================================
  // 📐 UPDATE WHEN WINDOW/TABLE CHANGES
  // =====================================================

  window.addEventListener(
    "resize",
    updateScrollbar
  );


  window.addEventListener(
    "scroll",
    updateScrollbar,
    true
  );


  // Initial sizing
  requestAnimationFrame(
    updateScrollbar
  );


  setTimeout(
    updateScrollbar,
    100
  );


  setTimeout(
    updateScrollbar,
    500
  );

}

function tableHeaderWithTooltip(label, tooltip) {
  return `
    <span class="table-header-label">
      <span>${label}</span>
      <button
        type="button"
        class="header-info-button"
        aria-label="${label}: ${tooltip}"
        data-tooltip="${tooltip}"
      >ⓘ</button>
    </span>
  `;
}

function multiplierToAmerican(multiplier) {
  const decimalOdds = Number(multiplier);
  if (!Number.isFinite(decimalOdds) || decimalOdds <= 1) return null;
  return decimalOdds >= 2
    ? Math.round((decimalOdds - 1) * 100)
    : Math.round(-100 / (decimalOdds - 1));
}

function americanToMultiplier(americanOdds) {
  const odds = Number(americanOdds);
  if (!Number.isFinite(odds) || odds === 0) return null;
  return odds > 0
    ? 1 + odds / 100
    : 1 + 100 / Math.abs(odds);
}

function initializeOddsConverter() {
  const multiplierInput = document.getElementById("multiplierInput");
  const americanInput = document.getElementById("americanOddsInput");
  const probabilityOutput = document.getElementById("oddsConverterProbability");
  const summaryOutput = document.getElementById("oddsConverterSummary");
  const resetButton = document.getElementById("oddsConverterReset");

  if (!multiplierInput || !americanInput || !probabilityOutput || !summaryOutput) return;

  let updating = false;

  const showResult = (multiplier, americanOdds) => {
    if (!Number.isFinite(multiplier) || multiplier <= 1) {
      probabilityOutput.textContent = "—";
      summaryOutput.textContent = "Enter either value";
      return;
    }

    probabilityOutput.textContent = `${(100 / multiplier).toFixed(1)}%`;
    summaryOutput.textContent =
      `${multiplier.toFixed(2)}x payout ≈ ${americanOdds > 0 ? "+" : ""}${americanOdds}`;
  };

  multiplierInput.addEventListener("input", () => {
    if (updating) return;
    const multiplier = Number(multiplierInput.value);
    const americanOdds = multiplierToAmerican(multiplier);

    if (americanOdds == null) {
      americanInput.value = "";
      showResult(NaN, 0);
      return;
    }

    updating = true;
    americanInput.value = americanOdds;
    updating = false;
    showResult(multiplier, americanOdds);
  });

  americanInput.addEventListener("input", () => {
    if (updating) return;
    const americanOdds = Number(americanInput.value);
    const multiplier = americanToMultiplier(americanOdds);

    if (multiplier == null) {
      multiplierInput.value = "";
      showResult(NaN, 0);
      return;
    }

    updating = true;
    multiplierInput.value = multiplier.toFixed(2);
    updating = false;
    showResult(multiplier, Math.round(americanOdds));
  });

  resetButton?.addEventListener("click", () => {
    multiplierInput.value = "";
    americanInput.value = "";
    probabilityOutput.textContent = "—";
    summaryOutput.textContent = "Enter either value";
    multiplierInput.focus();
  });
}


function initializeFloatingTooltips() {
  let tooltip = document.getElementById("floatingHeaderTooltip");

  if (!tooltip) {
    tooltip = document.createElement("div");
    tooltip.id = "floatingHeaderTooltip";
    tooltip.className = "floating-header-tooltip";
    tooltip.setAttribute("role", "tooltip");
    document.body.appendChild(tooltip);
  }

  let activeButton = null;

  const hideTooltip = () => {
    tooltip.classList.remove("is-visible");
    tooltip.textContent = "";
    activeButton = null;
  };

  const positionTooltip = (button) => {
    const text = button?.dataset?.tooltip;
    if (!text) return;

    tooltip.textContent = text;
    tooltip.classList.add("is-visible");

    const buttonRect = button.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const margin = 10;
    const viewportPadding = 12;

    let left =
      buttonRect.left
      + buttonRect.width / 2
      - tooltipRect.width / 2;

    left = Math.max(
      viewportPadding,
      Math.min(
        left,
        window.innerWidth
          - tooltipRect.width
          - viewportPadding
      )
    );

    let top = buttonRect.top - tooltipRect.height - margin;

    if (top < viewportPadding) {
      top = buttonRect.bottom + margin;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    activeButton = button;
  };

  document.addEventListener("pointerover", (event) => {
    const button =
      event.target.closest(".header-info-button");

    if (!button) return;
    positionTooltip(button);
  });

  document.addEventListener("pointerout", (event) => {
    const button =
      event.target.closest(".header-info-button");

    if (!button) return;

    const nextTarget = event.relatedTarget;
    if (nextTarget && button.contains(nextTarget)) return;

    hideTooltip();
  });

  document.addEventListener("focusin", (event) => {
    const button =
      event.target.closest(".header-info-button");

    if (!button) return;
    positionTooltip(button);
  });

  document.addEventListener("focusout", (event) => {
    const button =
      event.target.closest(".header-info-button");

    if (!button) return;
    hideTooltip();
  });

  document.addEventListener("click", (event) => {
    const button =
      event.target.closest(".header-info-button");

    if (!button) {
      hideTooltip();
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (
      activeButton === button
      && tooltip.classList.contains("is-visible")
    ) {
      hideTooltip();
    } else {
      positionTooltip(button);
    }
  });

  window.addEventListener("scroll", hideTooltip, true);
  window.addEventListener("resize", () => {
    if (activeButton) {
      positionTooltip(activeButton);
    }
  });
}

function updateModelDetailButtonLabel() {
  const button = document.getElementById("toggleModelDebug");
  const sport = document.getElementById("sportSelect")?.value;
  if (!button) return;

  const isMarketSport = isMarketEvSport(sport);

  // Market-EV detail is available by clicking a specific market row.
  // The global button remains only for the NCAAB model-debug workflow.
  button.hidden = isMarketSport;
  button.style.display = isMarketSport ? "none" : "";

  if (!isMarketSport) {
    button.innerHTML = "🧠 Ben's Model Detail";
    button.title = "Toggle college basketball model details.";
  }
}

function percentText(value, digits = 1) {
  const n = Number(value);
  return Number.isFinite(n) ? `${(n * 100).toFixed(digits)}%` : "N/A";
}

function statText(value, digits = 2) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(digits) : "N/A";
}

window.showMlbModelBreakdown = function(game, pick = null) {
  const modal = document.getElementById("modelBreakdownModal");
  const content = document.getElementById("modelBreakdownContent");
  const title = modal?.querySelector(".analytics-header h2");

  if (!modal || !content) return;

  if (title) title.textContent = "⚾ MLB Model Breakdown";

  const context = game?.model_context || {};
  const selectedPick = pick || (game?.market_picks || [])[0] || {};
  const awayPitcher = context.away_pitcher || {};
  const homePitcher = context.home_pitcher || {};
  const factors = selectedPick.model_factors || {};
  const isTotal = selectedPick.market === "totals";
  const isUnder = selectedPick.selection === "Under";
  const isOver = selectedPick.selection === "Over";

  const bullpenText = (available, value) =>
    available === false || value == null ? "N/A" : signedNumber(value);

  const reasons = [];

  const awayOffense =
    Number(factors.away_offense_runs ?? context.away_offense_runs);
  const homeOffense =
    Number(factors.home_offense_runs ?? context.home_offense_runs);
  const awayStarter =
    Number(factors.away_pitcher_quality_runs ?? context.away_pitcher_quality_runs);
  const homeStarter =
    Number(factors.home_pitcher_quality_runs ?? context.home_pitcher_quality_runs);
  const totalSignal =
    Number(factors.total_run_signal ?? context.total_run_signal);
  const modelEdge =
    Number(selectedPick.blended_probability)
    - Number(selectedPick.market_probability);

  if (isTotal) {
    if (isUnder && awayOffense < 0 && homeOffense < 0) {
      reasons.push(
        "Both offenses rate below league average in the model, reducing the expected scoring environment."
      );
    }

    if (isUnder && awayStarter > 0 && homeStarter > 0) {
      reasons.push(
        "Both probable starters grade as run suppressors, with recent form supporting the under."
      );
    }

    if (isOver && awayOffense > 0 && homeOffense > 0) {
      reasons.push(
        "Both offenses rate above league average, increasing the projected scoring environment."
      );
    }

    if (isOver && awayStarter < 0 && homeStarter < 0) {
      reasons.push(
        "Both starters grade below average, creating additional upside for the over."
      );
    }

    if (Number.isFinite(totalSignal)) {
      reasons.push(
        `The final total-run signal is ${signedNumber(totalSignal)} runs relative to a neutral matchup.`
      );
    }
  } else {
    const homeEdge =
      Number(factors.home_run_edge ?? context.home_run_edge);

    if (Number.isFinite(homeEdge)) {
      reasons.push(
        `The model projects a ${signedNumber(homeEdge)}-run home-team edge after offense, starters, bullpen, and home field.`
      );
    }
  }

  if (Number.isFinite(modelEdge) && modelEdge > 0) {
    reasons.push(
      `The blended probability is ${(modelEdge * 100).toFixed(1)} percentage points above the market no-vig probability.`
    );
  }

  if (selectedPick.expected_value_pct != null) {
    reasons.push(
      `At ${formatAmericanOdds(selectedPick.best_price)}, the estimated return is ${signedNumber(selectedPick.expected_value_pct)}% EV.`
    );
  }

  if (!reasons.length) {
    reasons.push(
      "The selection qualifies because the model probability exceeds the price-implied probability after removing sportsbook vig."
    );
  }

  content.innerHTML = `
    <div class="model-panel mlb-model-panel">
      <div class="model-header mlb-detail-hero">
        <div>
          <div class="teams">${game.away_team} @ ${game.home_team}</div>
          <div class="mlb-detail-subtitle">
            ${selectedPick.market_label || selectedPick.market || "Game model"}
            ${selectedPick.pick_label ? ` · ${selectedPick.pick_label}` : ""}
          </div>
        </div>
        <div class="mlb-confidence-badge">
          ${selectedPick.model_confidence || context.confidence_label || "N/A"} Confidence
        </div>
      </div>

      <div class="mlb-probability-grid">
        <div class="mlb-probability-card">
          <span>Market No-Vig</span>
          <strong>${percentText(selectedPick.market_probability)}</strong>
        </div>
        <div class="mlb-probability-card">
          <span>Stats-Adjusted</span>
          <strong>${percentText(selectedPick.baseball_probability)}</strong>
        </div>
        <div class="mlb-probability-card featured">
          <span>Final Model</span>
          <strong>${percentText(selectedPick.blended_probability)}</strong>
        </div>
        <div class="mlb-probability-card">
          <span>Estimated EV</span>
          <strong>${selectedPick.expected_value_pct != null
            ? signedNumber(selectedPick.expected_value_pct) + "%"
            : "N/A"}</strong>
        </div>
      </div>

      <div class="model-section">
        <div class="section-title">Probable Starters</div>
        <div class="mlb-matchup-grid">
          <div class="mlb-team-detail">
            <h3>${game.away_team}</h3>
            <strong>${context.away_pitcher_name || "TBD"}</strong>
            <div>Season ERA: ${statText(awayPitcher.season_era)}</div>
            <div>Last 5 ERA: ${statText(awayPitcher.last5_era)}</div>
            <div>K/9: ${statText(awayPitcher.season_k9)}</div>
            <div>BB/9: ${statText(awayPitcher.season_bb9)}</div>
            <div>Starts: ${awayPitcher.qualifying_starts ?? 0}</div>
          </div>
          <div class="mlb-team-detail">
            <h3>${game.home_team}</h3>
            <strong>${context.home_pitcher_name || "TBD"}</strong>
            <div>Season ERA: ${statText(homePitcher.season_era)}</div>
            <div>Last 5 ERA: ${statText(homePitcher.last5_era)}</div>
            <div>K/9: ${statText(homePitcher.season_k9)}</div>
            <div>BB/9: ${statText(homePitcher.season_bb9)}</div>
            <div>Starts: ${homePitcher.qualifying_starts ?? 0}</div>
          </div>
        </div>
      </div>

      <div class="model-section">
        <div class="section-title">Model Factors</div>
        <div class="grid">
          <div>Away offense</div>
          <div>${signedNumber(factors.away_offense_runs ?? context.away_offense_runs)} runs</div>
          <div>Home offense</div>
          <div>${signedNumber(factors.home_offense_runs ?? context.home_offense_runs)} runs</div>
          <div>Away starter quality</div>
          <div>${signedNumber(factors.away_pitcher_quality_runs ?? context.away_pitcher_quality_runs)} runs</div>
          <div>Home starter quality</div>
          <div>${signedNumber(factors.home_pitcher_quality_runs ?? context.home_pitcher_quality_runs)} runs</div>
          <div>Away bullpen</div>
          <div>${bullpenText(
            factors.away_bullpen_available ?? context.away_bullpen_available,
            factors.away_bullpen_quality_runs ?? context.away_bullpen_quality_runs
          )}</div>
          <div>Home bullpen</div>
          <div>${bullpenText(
            factors.home_bullpen_available ?? context.home_bullpen_available,
            factors.home_bullpen_quality_runs ?? context.home_bullpen_quality_runs
          )}</div>
          <div>Home-field adjustment</div>
          <div>${signedNumber(factors.home_field_runs ?? context.home_field_runs)} runs</div>
          <div>${isTotal ? "Final total signal" : "Final home edge"}</div>
          <div class="highlight">${signedNumber(
            isTotal
              ? (factors.total_run_signal ?? context.total_run_signal)
              : (factors.home_run_edge ?? context.home_run_edge)
          )} runs</div>
        </div>
      </div>

      <div class="model-section mlb-why-section">
        <div class="section-title">Why the Model Likes This Pick</div>
        <ul class="mlb-reason-list">
          ${reasons.map(reason => `<li>${reason}</li>`).join("")}
        </ul>
      </div>

      <div class="model-section">
        <div class="section-title">Price and Recommendation</div>
        <div class="grid">
          <div>Best sportsbook</div>
          <div>${selectedPick.best_book_name || selectedPick.best_book || "N/A"}</div>
          <div>Best price</div>
          <div>${formatAmericanOdds(selectedPick.best_price)}</div>
          <div>Fair line</div>
          <div>${formatAmericanOdds(selectedPick.fair_price)}</div>
          <div>Recommendation</div>
          <div class="highlight">${recommendationLabel(selectedPick.recommendation)}</div>
        </div>
      </div>
    </div>
  `;

  modal.classList.remove("hidden");
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
};


window.showNcaafMarketBreakdown = function(game, pick = null) {
  if (!document.getElementById("ncaafModalReadStyles")) {
    const style = document.createElement("style");
    style.id = "ncaafModalReadStyles";
    style.textContent = `
      .ncaaf-market-read-grid {
        display: grid;
        gap: 10px;
        margin-top: 10px;
      }

      .ncaaf-market-read-item {
        display: grid;
        grid-template-columns: 34px 1fr;
        gap: 10px;
        align-items: start;
        padding: 12px 14px;
        border: 1px solid rgba(148, 163, 184, 0.22);
        border-radius: 10px;
        background: rgba(15, 23, 42, 0.34);
      }

      .ncaaf-market-read-icon {
        font-size: 18px;
        line-height: 1.35;
        text-align: center;
      }

      .ncaaf-market-read-text {
        line-height: 1.45;
      }

      .ncaaf-detail-subheading {
        margin: 14px 0 6px;
        padding-bottom: 5px;
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        opacity: 0.72;
        border-bottom: 1px solid rgba(148, 163, 184, 0.18);
      }

      .ncaaf-detail-subheading:first-of-type {
        margin-top: 4px;
      }
    `;
    document.head.appendChild(style);
  }

  const modal = document.getElementById("modelBreakdownModal");
  const content = document.getElementById("modelBreakdownContent");
  const title = modal?.querySelector(".analytics-header h2");

  if (!modal || !content) return;

  if (title) {
    title.textContent = "🏈 NCAAF EV+ · Detail v6";
  }

  const selectedPick =
    pick || (game?.market_picks || [])[0] || (game?.market_board || [])[0] || {};

  const context = game?.model_context || {};
  const factors = selectedPick?.model_factors || {};
  const advanced = context?.advanced_ratings || {};
  const homeRating = advanced?.home || {};
  const awayRating = advanced?.away || {};
  const components = context?.components || {};

  const formatRank = value => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? `#${Math.round(n)}` : "N/A";
  };

  const formatRating = (value, digits = 1) => {
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(digits) : "N/A";
  };

  const ratingRow = (label, value, digits = 1, rank = null) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return "";

    const rankNum = Number(rank);
    const rankText =
      Number.isFinite(rankNum) && rankNum > 0
        ? ` · #${Math.round(rankNum)}`
        : "";

    return `
      <div class="ncaaf-detail-row">
        <span>${label}</span>
        <strong>${n.toFixed(digits)}${rankText}</strong>
      </div>
    `;
  };

  const formatSignedPts = (value, digits = 2) => {
    const n = Number(value);
    return Number.isFinite(n)
      ? `${n > 0 ? "+" : ""}${n.toFixed(digits)}`
      : "N/A";
  };

  const marketProbability =
    selectedPick.market_probability != null
      ? Number(selectedPick.market_probability)
      : null;

  const modelProbability =
    selectedPick.model_probability != null
      ? Number(selectedPick.model_probability)
      : marketProbability;

  const teamModelProbability =
    selectedPick.team_model_probability != null
      ? Number(selectedPick.team_model_probability)
      : null;

  const evPlusActive = selectedPick.ev_plus_active === true;

  const modelEdgePoints =
    selectedPick.model_edge_points != null
      ? Number(selectedPick.model_edge_points)
      : null;

  const teamModelWeight =
    selectedPick.team_model_weight != null
      ? Number(selectedPick.team_model_weight)
      : 0;

  const bestImplied =
    selectedPick.best_implied_probability != null
      ? Number(selectedPick.best_implied_probability)
      : americanImpliedProbability(selectedPick.best_price);

  const ev =
    selectedPick.expected_value_pct != null
      ? Number(selectedPick.expected_value_pct)
      : null;

  const priceEdge =
    selectedPick.price_edge_pct != null
      ? Number(selectedPick.price_edge_pct)
      : (
          Number.isFinite(marketProbability)
          && Number.isFinite(bestImplied)
            ? (modelProbability - bestImplied) * 100
            : null
        );

  const recommendation =
    String(selectedPick.recommendation || "PASS")
      .trim()
      .toUpperCase();

  const confidence =
    String(selectedPick.model_confidence || "Low")
      .trim();

  const validBooks =
    Number(selectedPick.valid_books_compared ?? 0);

  const totalBooks =
    Number(selectedPick.books_compared ?? 0);

  const bestBook =
    selectedPick.best_book_name ||
    selectedPick.best_book ||
    "N/A";

  const marketKey =
    String(selectedPick.market || "").toLowerCase();

  const point =
    selectedPick.point != null
      ? Number(selectedPick.point)
      : null;

  let selectionText =
    selectedPick.pick_label ||
    selectedPick.selection ||
    "N/A";

  // Totals read more naturally as "Over 46.5" than "Over +46.5".
  if (
    marketKey === "totals" &&
    Number.isFinite(point)
  ) {
  }

  if (
    marketKey === "totals" &&
    Number.isFinite(point)
  ) {
    selectionText =
      `${selectedPick.selection || "Total"} ${Number(point).toString()}`;
  }

  const marketLabel =
    selectedPick.market_label ||
    (
      marketKey === "h2h"
        ? "Moneyline"
        : marketKey === "spreads"
        ? "Spread"
        : marketKey === "totals"
        ? "Game Total"
        : "Market"
    );

  const signalMeta = {
    STRONG_VALUE: {
      label: "🔥 Strong Value",
      className: "ncaaf-signal-strong",
      message: "The best available price is materially better than the market's fair probability."
    },
    VALUE: {
      label: "✅ Value",
      className: "ncaaf-signal-value",
      message: "The best available price clears the market-implied break-even threshold."
    },
    LEAN: {
      label: "👀 Lean",
      className: "ncaaf-signal-lean",
      message: "There is a small positive pricing edge, but it is below the stronger value threshold."
    },
    PASS: {
      label: "⛔ Pass",
      className: "ncaaf-signal-pass",
      message: "The best available price is not good enough versus the broader market right now."
    }
  }[recommendation] || {
    label: recommendation || "Pass",
    className: "ncaaf-signal-pass",
    message: "No qualified market-value signal is available."
  };

  const evClass =
    Number.isFinite(ev) && ev > 0
      ? "positive"
      : Number.isFinite(ev) && ev < 0
      ? "negative"
      : "neutral";

  const edgeClass =
    Number.isFinite(priceEdge) && priceEdge > 0
      ? "positive"
      : Number.isFinite(priceEdge) && priceEdge < 0
      ? "negative"
      : "neutral";

  const marketFairPct =
    Number.isFinite(marketProbability)
      ? (marketProbability * 100).toFixed(1) + "%"
      : "N/A";

  const modelFairPct =
    Number.isFinite(modelProbability)
      ? (modelProbability * 100).toFixed(1) + "%"
      : "N/A";

  const teamModelPct =
    Number.isFinite(teamModelProbability)
      ? (teamModelProbability * 100).toFixed(1) + "%"
      : "N/A";

  const fairPct = modelFairPct;

  const breakEvenPct =
    Number.isFinite(bestImplied)
      ? (bestImplied * 100).toFixed(1) + "%"
      : "N/A";

  const edgeText =
    Number.isFinite(priceEdge)
      ? `${priceEdge >= 0 ? "+" : ""}${priceEdge.toFixed(2)} pp`
      : "N/A";

  const evText =
    Number.isFinite(ev)
      ? `${ev >= 0 ? "+" : ""}${ev.toFixed(2)}%`
      : "N/A";

  const prices =
    Object.entries(selectedPick.prices || {})
      .sort((a, b) => {
        const priceA = Number(a?.[1]?.price);
        const priceB = Number(b?.[1]?.price);

        if (!Number.isFinite(priceA)) return 1;
        if (!Number.isFinite(priceB)) return -1;

        return priceB - priceA;
      });

  const readItems = [];

  if (
    Number.isFinite(modelProbability) &&
    Number.isFinite(bestImplied)
  ) {
    if (evPlusActive && Number.isFinite(teamModelProbability)) {
      readItems.push(
        `Market no-vig is ${marketFairPct}; Team Model v2 prices this exact spread side at ${teamModelPct}. EV+ blends them to ${modelFairPct} with ${(teamModelWeight * 100).toFixed(1)}% model weight.`
      );

      if (Number.isFinite(modelEdgePoints)) {
        readItems.push(
          `The independent spread model shows ${modelEdgePoints >= 0 ? "+" : ""}${modelEdgePoints.toFixed(2)} points of edge toward this selection.`
        );
      }
    } else {
      readItems.push(
        `This ${marketLabel.toLowerCase()} remains market-only: the no-vig consensus is ${marketFairPct}.`
      );
    }

    if (priceEdge > 0) {
      readItems.push(
        `The best price only needs ${breakEvenPct} to break even, producing a ${edgeText} EV+ pricing advantage at ${bestBook}.`
      );
    } else if (priceEdge < 0) {
      readItems.push(
        `The best price requires ${breakEvenPct} to break even, which is ${Math.abs(priceEdge).toFixed(2)} percentage points above the current EV+ fair probability.`
      );
    } else {
      readItems.push(
        `The best price is essentially aligned with the current EV+ fair probability.`
      );
    }
  }

  if (validBooks > 0) {
    readItems.push(
      `${validBooks} non-outlier books are contributing to the consensus${totalBooks ? ` out of ${totalBooks} comparable prices` : ""}.`
    );
  }

  if (
    context?.model_status === "ready"
    && Number.isFinite(Number(context?.projected_home_spread))
  ) {
    const projectedSpread = Number(context.projected_home_spread);
    const projectedFavorite = context.projected_favorite || "N/A";

    readItems.push(
      `Team Model v2 projects ${projectedFavorite} ${formatSignedPts(context.projected_favorite_spread)} with ${context.power_source || "SP+"} as the power source${context.neutral_site ? " at a neutral site" : ""}.`
    );

    if (Number.isFinite(Number(context?.model_vs_market_points))) {
      readItems.push(
        `The projected spread differs from the market by ${formatSignedPts(context.model_vs_market_points)} points toward the home-team side.`
      );
    }
  }

  if (
    marketKey === "h2h"
    && !evPlusActive
    && Number.isFinite(marketProbability)
    && marketProbability < 0.10
  ) {
    readItems.push(
      "Low-probability moneylines remain market-only and are capped at Lean until a separate football win-probability model validates the side."
    );
  }

  if (recommendation === "PASS") {
    readItems.push(
      "No bet is recommended at the current price. A better number or market move could change the signal."
    );
  }

  const bestBookKey =
    String(selectedPick.best_book || "");

  const priceRows =
    prices.length
      ? prices.map(([bookKey, info], index) => {
          const implied =
            info?.implied_probability != null
              ? Number(info.implied_probability)
              : americanImpliedProbability(info?.price);

          const bookNoVig =
            info?.book_no_vig_probability != null
              ? Number(info.book_no_vig_probability)
              : null;

          const rowEdge =
            Number.isFinite(marketProbability) && Number.isFinite(implied)
              ? (modelProbability - implied) * 100
              : null;

          const isBest =
            bookKey === bestBookKey ||
            (
              !bestBookKey &&
              index === 0
            );

          return `
            <tr class="${isBest ? "ncaaf-best-book-row" : ""}">
              <td>
                <div class="ncaaf-book-name">
                  ${info?.book_name || bookDisplayNames?.[bookKey] || bookKey}
                  ${isBest ? `<span class="ncaaf-best-tag">BEST</span>` : ""}
                </div>
              </td>
              <td class="ncaaf-price-cell">${formatAmericanOdds(info?.price)}</td>
              <td>${Number.isFinite(implied)
                ? (implied * 100).toFixed(1) + "%"
                : "N/A"}</td>
              <td>${Number.isFinite(bookNoVig)
                ? (bookNoVig * 100).toFixed(1) + "%"
                : "N/A"}</td>
              <td class="${
                Number.isFinite(rowEdge) && rowEdge > 0
                  ? "ncaaf-positive-text"
                  : Number.isFinite(rowEdge) && rowEdge < 0
                  ? "ncaaf-negative-text"
                  : ""
              }">
                ${Number.isFinite(rowEdge)
                  ? `${rowEdge >= 0 ? "+" : ""}${rowEdge.toFixed(2)} pp`
                  : "N/A"}
              </td>
              <td>
                <span class="ncaaf-book-status ${
                  info?.is_outlier
                    ? "outlier"
                    : "included"
                }">
                  ${info?.is_outlier ? "Outlier" : "Included"}
                </span>
              </td>
            </tr>
          `;
        }).join("")
      : `
          <tr>
            <td colspan="6" class="ncaaf-empty-row">
              No individual sportsbook price detail was returned.
            </td>
          </tr>
        `;

  content.innerHTML = `
    <div class="ncaaf-ev-panel">

      <div class="ncaaf-ev-hero">
        <div class="ncaaf-ev-matchup">
          <div class="ncaaf-ev-teams">
            ${game?.away_team || ""} @ ${game?.home_team || ""}
          </div>

          <div class="ncaaf-ev-market">
            ${marketLabel}
            <span>•</span>
            <strong>${selectionText}</strong>
          </div>
        </div>

        <div class="ncaaf-confidence-pill">
          ${confidence} Market Confidence
        </div>
      </div>

      <div class="ncaaf-signal-banner ${signalMeta.className}">
        <div>
          <div class="ncaaf-signal-label">${signalMeta.label}</div>
          <div class="ncaaf-signal-message">${signalMeta.message}</div>
        </div>

        <div class="ncaaf-best-price-block">
          <span>Best available</span>
          <strong>${formatAmericanOdds(selectedPick.best_price)}</strong>
          <small>${bestBook}</small>
        </div>
      </div>

      <div class="ncaaf-kpi-grid">
        <div class="ncaaf-kpi-card">
          <span>Market Fair</span>
          <strong>${marketFairPct}</strong>
          <small>Multi-book no-vig anchor</small>
        </div>

        <div class="ncaaf-kpi-card">
          <span>${evPlusActive ? "Team Model" : "Team Model"}</span>
          <strong>${evPlusActive ? teamModelPct : "Market-only"}</strong>
          <small>${evPlusActive
            ? `${Number.isFinite(modelEdgePoints) ? `${modelEdgePoints >= 0 ? "+" : ""}${modelEdgePoints.toFixed(2)} pts` : "SP+ spread model"}`
            : "Not applied to this market"}</small>
        </div>

        <div class="ncaaf-kpi-card featured">
          <span>${evPlusActive ? "EV+ Fair" : "Market Fair"}</span>
          <strong>${modelFairPct}</strong>
          <small>${evPlusActive ? "Market + Team Model v2" : "No model adjustment"}</small>
        </div>

        <div class="ncaaf-kpi-card">
          <span>Break-Even</span>
          <strong>${breakEvenPct}</strong>
          <small>Needed at best price</small>
        </div>

        <div class="ncaaf-kpi-card ${edgeClass}">
          <span>Price Edge</span>
          <strong>${edgeText}</strong>
          <small>EV+ fair % minus break-even %</small>
        </div>

        <div class="ncaaf-kpi-card ${evClass}">
          <span>Expected Value</span>
          <strong>${evText}</strong>
          <small>At the current best price</small>
        </div>
      </div>

      <div class="ncaaf-detail-grid">
        <div class="ncaaf-detail-card">
          <div class="ncaaf-section-heading">🏈 ${game?.away_team || "Away"} Team Profile</div>

          ${ratingRow("SP+ Rating", awayRating.sp, 1, awayRating.sp_rank)}
          ${ratingRow("SP+ Offense", awayRating.sp_offense, 1, awayRating.sp_offense_rank)}
          ${ratingRow("SP+ Defense", awayRating.sp_defense, 1, awayRating.sp_defense_rank)}
          ${ratingRow("Pass Offense", awayRating.sp_offense_passing, 2)}
          ${ratingRow("Rush Offense", awayRating.sp_offense_rushing, 2)}
          ${ratingRow("Pass Defense", awayRating.sp_defense_passing, 2)}
          ${ratingRow("Rush Defense", awayRating.sp_defense_rushing, 2)}
          ${ratingRow("Defensive Havoc", awayRating.sp_defense_havoc, 3)}
        </div>

        <div class="ncaaf-detail-card">
          <div class="ncaaf-section-heading">🏠 ${game?.home_team || "Home"} Team Profile</div>

          ${ratingRow("SP+ Rating", homeRating.sp, 1, homeRating.sp_rank)}
          ${ratingRow("SP+ Offense", homeRating.sp_offense, 1, homeRating.sp_offense_rank)}
          ${ratingRow("SP+ Defense", homeRating.sp_defense, 1, homeRating.sp_defense_rank)}
          ${ratingRow("Pass Offense", homeRating.sp_offense_passing, 2)}
          ${ratingRow("Rush Offense", homeRating.sp_offense_rushing, 2)}
          ${ratingRow("Pass Defense", homeRating.sp_defense_passing, 2)}
          ${ratingRow("Rush Defense", homeRating.sp_defense_rushing, 2)}
          ${ratingRow("Defensive Havoc", homeRating.sp_defense_havoc, 3)}
        </div>
      </div>

      <div class="ncaaf-detail-grid">
        <div class="ncaaf-detail-card">
          <div class="ncaaf-section-heading">🧠 Team Model v2</div>

          <div class="ncaaf-detail-subheading" style="margin:14px 0 8px;padding:6px 8px;border-radius:7px;background:rgba(59,130,246,.10);font-size:.78rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;">Projection</div>

          <div class="ncaaf-detail-row">
            <span>Projected Favorite</span>
            <strong>${context.projected_favorite || "N/A"} ${context.projected_favorite_spread != null ? formatSignedPts(context.projected_favorite_spread) : ""}</strong>
          </div>

          <div class="ncaaf-detail-row">
            <span>Projected Home Spread</span>
            <strong>${context.projected_home_spread != null ? formatSignedPts(context.projected_home_spread) : "N/A"}</strong>
          </div>

          <div class="ncaaf-detail-row">
            <span>Market Home Spread</span>
            <strong>${context.market_home_spread != null ? formatSignedPts(context.market_home_spread) : "N/A"}</strong>
          </div>

          <div class="ncaaf-detail-row">
            <span>Model vs Market</span>
            <strong>${context.model_vs_market_points != null ? `${formatSignedPts(context.model_vs_market_points)} pts` : "N/A"}</strong>
          </div>

          <div class="ncaaf-detail-subheading" style="margin:14px 0 8px;padding:6px 8px;border-radius:7px;background:rgba(59,130,246,.10);font-size:.78rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;">Model Context</div>

          <div class="ncaaf-detail-row">
            <span>Power Source</span>
            <strong>${context.power_source || "N/A"}</strong>
          </div>

          <div class="ncaaf-detail-row">
            <span>Model Confidence</span>
            <strong>${context.confidence_label || "N/A"}${context.data_confidence != null ? ` · ${(Number(context.data_confidence) * 100).toFixed(0)}%` : ""}</strong>
          </div>

          <div class="ncaaf-detail-row">
            <span>Neutral Site</span>
            <strong>${context.neutral_site ? "Yes" : "No"}${context?.neutral_site_meta?.venue ? ` · ${context.neutral_site_meta.venue}` : ""}</strong>
          </div>
        </div>

        <div class="ncaaf-detail-card">
          <div class="ncaaf-section-heading">⚙️ Projection Components</div>

          <div class="ncaaf-detail-subheading" style="margin:14px 0 8px;padding:6px 8px;border-radius:7px;background:rgba(59,130,246,.10);font-size:.78rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;">Base Rating</div>

          <div class="ncaaf-detail-row">
            <span>Base Power Margin</span>
            <strong>${formatSignedPts(components.base_power_margin_home)} pts</strong>
          </div>

          <div class="ncaaf-detail-row">
            <span>SP+ Margin</span>
            <strong>${components.sp_plus_margin_home != null ? `${formatSignedPts(components.sp_plus_margin_home)} pts` : "N/A"}</strong>
          </div>

          <div class="ncaaf-detail-subheading" style="margin:14px 0 8px;padding:6px 8px;border-radius:7px;background:rgba(59,130,246,.10);font-size:.78rem;font-weight:800;letter-spacing:.06em;text-transform:uppercase;">Adjustments</div>

          <div class="ncaaf-detail-row">
            <span>Current Form</span>
            <strong>${formatSignedPts(components.current_form_adjustment_home)} pts</strong>
          </div>

          <div class="ncaaf-detail-row">
            <span>Pass Matchup</span>
            <strong>${formatSignedPts(components.pass_matchup_adjustment_home)} pts</strong>
          </div>

          <div class="ncaaf-detail-row">
            <span>Rush Matchup</span>
            <strong>${formatSignedPts(components.rush_matchup_adjustment_home)} pts</strong>
          </div>

          <div class="ncaaf-detail-row">
            <span>Home Field</span>
            <strong>${formatSignedPts(components.home_field_adjustment)} pts</strong>
          </div>

          <div class="ncaaf-detail-row">
            <span>2026 Games in Profile</span>
            <strong>${context?.profile_snapshot?.away_2026_games ?? 0} away · ${context?.profile_snapshot?.home_2026_games ?? 0} home</strong>
          </div>
        </div>
      </div>

      <div class="ncaaf-detail-grid">
        <div class="ncaaf-detail-card">
          <div class="ncaaf-section-heading">Market Pricing</div>

          <div class="ncaaf-detail-row">
            <span>Selection</span>
            <strong>${selectionText}</strong>
          </div>

          <div class="ncaaf-detail-row">
            <span>Best sportsbook</span>
            <strong>${bestBook}</strong>
          </div>

          <div class="ncaaf-detail-row">
            <span>Best price</span>
            <strong>${formatAmericanOdds(selectedPick.best_price)}</strong>
          </div>

          <div class="ncaaf-detail-row">
            <span>EV+ fair odds</span>
            <strong>${formatAmericanOdds(selectedPick.fair_price)}</strong>
          </div>

          <div class="ncaaf-detail-row">
            <span>Books used</span>
            <strong>${validBooks} / ${totalBooks}</strong>
          </div>
        </div>

        <div class="ncaaf-detail-card">
          <div class="ncaaf-section-heading">AI + Market Read</div>

          <div
            class="ncaaf-market-read-grid"
            style="
              display:grid;
              grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
              gap:12px;
              margin-top:12px;
            "
          >
            ${readItems.map((item, index) => `
              <div
                class="ncaaf-market-read-item"
                style="
                  display:grid;
                  grid-template-columns:38px 1fr;
                  gap:12px;
                  align-items:start;
                  padding:14px 16px;
                  border:1px solid rgba(148,163,184,.28);
                  border-radius:12px;
                  background:rgba(15,23,42,.42);
                  min-height:82px;
                "
              >
                <div
                  class="ncaaf-market-read-icon"
                  style="
                    width:34px;
                    height:34px;
                    display:flex;
                    align-items:center;
                    justify-content:center;
                    border-radius:10px;
                    background:rgba(59,130,246,.12);
                    font-size:19px;
                  "
                >
                  ${index === 0 ? "MARKET" : index === 1 ? "PRICE" : index === 2 ? "BOOKS" : index === 3 ? "MODEL" : index === 4 ? "EDGE" : "CALL"}
                </div>
                <div
                  class="ncaaf-market-read-text"
                  style="
                    line-height:1.5;
                    font-size:.94rem;
                  "
                >${item}</div>
              </div>
            `).join("")}
          </div>
        </div>
      </div>

      <div class="ncaaf-market-only-note">
        <span>${evPlusActive ? "EV+ spread model" : "Market-only market"}</span>
        ${evPlusActive
          ? `NCAAF EV+ v2 keeps Vegas as the anchor and applies a conservative Team Model v2/SP+ adjustment. Current model weight: ${(teamModelWeight * 100).toFixed(1)}%.`
          : `Moneyline and totals remain multi-book no-vig market models until those conversions are separately validated.`}
      </div>

      <div class="ncaaf-book-section">
        <div class="ncaaf-section-heading-row">
          <div>
            <div class="ncaaf-section-heading">Sportsbook Comparison</div>
            <div class="ncaaf-section-subtitle">
              Sorted by best available price for this exact market and line.
            </div>
          </div>
        </div>

        <div class="ncaaf-book-wrap">
          <table class="ncaaf-book-table">
            <thead>
              <tr>
                <th>Book</th>
                <th>Price</th>
                <th>Break-Even</th>
                <th>No-Vig</th>
                <th>Price Edge</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              ${priceRows}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  modal.classList.remove("hidden");
  modal.style.display = "flex";
  modal.setAttribute("aria-hidden", "false");
};

function signedNumber(value, digits = 2) {
  if (value === null || value === undefined || value === "") {
    return "N/A";
  }

  const n = Number(value);
  if (!Number.isFinite(n)) return "N/A";
  return `${n > 0 ? "+" : ""}${n.toFixed(digits)}`;
}

if (!document.getElementById("ncaafTableProjectionStyles")) {
  const style = document.createElement("style");
  style.id = "ncaafTableProjectionStyles";
  style.textContent = `
    .ncaaf-table-projection {
      min-width: 135px;
      line-height: 1.25;
    }
    .ncaaf-table-projection strong {
      white-space: nowrap;
    }
    .ncaaf-table-projection .edge-sub {
      margin-top: 3px;
    }
  `;
  document.head.appendChild(style);
}

function ncaafTableProjectionHtml(game, row) {
  const context = game?.model_context || {};
  const projectedFavorite = context?.projected_favorite;
  const projectedFavoriteSpread = Number(context?.projected_favorite_spread);
  const edgePoints = Number(row?.model_edge_points);

  const projectionText =
    projectedFavorite && Number.isFinite(projectedFavoriteSpread)
      ? `${projectedFavorite} ${projectedFavoriteSpread > 0 ? "+" : ""}${projectedFavoriteSpread.toFixed(2)}`
      : "N/A";

  const edgeText =
    row?.ev_plus_active && Number.isFinite(edgePoints)
      ? `${edgePoints > 0 ? "+" : ""}${edgePoints.toFixed(2)} pts`
      : "Market-only";

  return `
    <div class="ncaaf-table-projection">
      <strong>${projectionText}</strong>
      <div class="edge-sub">${edgeText}</div>
    </div>
  `;
}

function mlbModelFactorsHtml(row) {
  const factors = row?.model_factors || {};

  if (row?.model_name === "NCAAF EV+ v2") {
    if (row?.ev_plus_active) {
      return `
        <div class="edge-sub">
          EV+ spread · ${signedNumber(row?.model_edge_points)} pts model edge
          <br>
          ${(Number(row?.team_model_weight || 0) * 100).toFixed(1)}% Team Model weight · ${row?.valid_books_compared ?? 0}/${row?.books_compared ?? 0} books
          <br>
          <button type="button" class="mlb-detail-inline-btn">View Detail</button>
        </div>`;
    }

    return `
      <div class="edge-sub">
        Market-only ${row?.market_label || "market"} · ${row?.valid_books_compared ?? 0}/${row?.books_compared ?? 0} books
        <br>
        <button type="button" class="mlb-detail-inline-btn">View Detail</button>
      </div>`;
  }

  if (
    row?.model_status === "market_only"
    || row?.model_name === "NCAAF Market EV v1"
  ) {
    return `
      <div class="edge-sub">
        Market-only · ${row?.valid_books_compared ?? 0}/${row?.books_compared ?? 0} books
        <br>
        <button type="button" class="mlb-detail-inline-btn">View Detail</button>
      </div>`;
  }

  const awayStarter = factors.away_pitcher_name || "TBD";
  const homeStarter = factors.home_pitcher_name || "TBD";
  const awayBullpen = factors.away_bullpen_available === false
    ? "N/A"
    : signedNumber(factors.away_bullpen_quality_runs);
  const homeBullpen = factors.home_bullpen_available === false
    ? "N/A"
    : signedNumber(factors.home_bullpen_quality_runs);

  if (row?.model_status !== "ready") {
    return `
      <div class="edge-sub">
        Market fallback — starter/model data incomplete
      </div>`;
  }

  const sideFactor = row.market === "totals"
    ? `Total signal ${signedNumber(factors.total_run_signal)} runs`
    : `Home edge ${signedNumber(factors.home_run_edge)} runs`;

  return `
    <div class="edge-sub" title="
      Away starter: ${awayStarter}
      Home starter: ${homeStarter}
      Away offense: ${signedNumber(factors.away_offense_runs)}
      Home offense: ${signedNumber(factors.home_offense_runs)}
      Away pitcher: ${signedNumber(factors.away_pitcher_quality_runs)}
      Home pitcher: ${signedNumber(factors.home_pitcher_quality_runs)}
      Away bullpen: ${awayBullpen}
      Home bullpen: ${homeBullpen}
    ">
      ${awayStarter} vs ${homeStarter}<br>
      ${sideFactor}<br>
      Bullpens ${awayBullpen} / ${homeBullpen}<br>
      <button type="button" class="mlb-detail-inline-btn">View Detail</button>
    </div>`;
}
// =====================================================
// 📊 MLB MARKET INTELLIGENCE SUMMARY
// =====================================================
function renderMarketAnalyticsSummary() {

  const container =
    document.getElementById(
      "mlbAnalyticsSummary"
    );

  if (!container) {
    return;
  }


  const currentMode =
    currentGameLines?.[0]?.mode || "";

  const isMlb =
    currentMode === "mlb_market";

  const isNcaaf =
    currentMode === "ncaaf_market";

  // NCAAB does not use this market-EV dashboard.
  if (!isMarketEvMode(currentMode)) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";

  const title =
    container.querySelector(".mlb-summary-title");
  const pipeline =
    container.querySelector(".mlb-model-pipeline");

  if (title) {
    title.textContent =
      isNcaaf
        ? "NCAAF Market EV Snapshot"
        : "MLB Model Snapshot";
  }

  if (pipeline) {
    pipeline.innerHTML =
      isNcaaf
        ? `Market No-Vig <span>→</span> Best Price <span>→</span> EV`
        : `Market No-Vig <span>→</span> Stats Adjusted <span>→</span> Final Model <span>→</span> EV`;
  }

  const summaryCards =
    container.querySelectorAll(".mlb-summary-card");

  if (summaryCards?.[2]) {
    const small = summaryCards[2].querySelector("small");
    if (small) {
      small.textContent =
        isNcaaf
          ? "3%+ EV with 4+ books"
          : "2%+ estimated EV";
    }
  }

  if (summaryCards?.[5]) {
    const label = summaryCards[5].querySelector("span");
    const small = summaryCards[5].querySelector("small");

    if (label) {
      label.textContent =
        isNcaaf
          ? "Market Coverage"
          : "Model Coverage";
    }

    if (small) {
      small.textContent =
        isNcaaf
          ? "Rows with 3+ valid books"
          : "Markets with model data";
    }
  }


  // =====================================================
  // ⚾ GAMES
  // =====================================================

  const pregameGames =
    currentGameLines.filter(
      game => !game.is_live
    );


  // =====================================================
  // 📚 ALL MARKET ROWS
  // =====================================================

  const marketRows =
    pregameGames.flatMap(
      game =>
        Array.isArray(game.market_board)
          ? game.market_board
          : []
    );


  // =====================================================
  // 🧠 MODEL PICKS
  // =====================================================

  const picks =
    pregameGames.flatMap(
      game =>
        Array.isArray(game.market_picks)
          ? game.market_picks
          : []
    );


  const valuePicks =
    picks.filter(pick => {

      const tier =
        String(
          pick.recommendation || ""
        )
          .trim()
          .toUpperCase();

      return (
        tier === "VALUE" ||
        tier === "STRONG_VALUE"
      );

    });


  const strongPicks =
    picks.filter(
      pick =>
        String(
          pick.recommendation || ""
        )
          .trim()
          .toUpperCase() ===
        "STRONG_VALUE"
    );


  // =====================================================
  // 💰 BEST EV
  // =====================================================

  const evValues =
    picks
      .map(
        pick =>
          Number(
            pick.expected_value_pct
          )
      )
      .filter(
        Number.isFinite
      );


  const bestEv =
    evValues.length
      ? Math.max(...evValues)
      : null;


  // =====================================================
  // 🧬 MODEL COVERAGE
  // =====================================================

  const readyRows =
    marketRows.filter(row => {
      if (isNcaaf) {
        return Number(row.valid_books_compared || 0) >= 3;
      }

      return row.model_status === "ready";
    });


  const coverage =
    marketRows.length
      ? (
          readyRows.length /
          marketRows.length *
          100
        )
      : 0;


  // =====================================================
  // 🖥️ UPDATE UI
  // =====================================================

  const setText =
    (id, value) => {

      const el =
        document.getElementById(
          id
        );

      if (el) {
        el.textContent =
          value;
      }

    };


  setText(
    "summaryGames",
    pregameGames.length
  );


  setText(
    "summaryMarkets",
    marketRows.length
  );


  setText(
    "summaryValue",
    valuePicks.length
  );


  setText(
    "summaryStrong",
    strongPicks.length
  );


  setText(
    "summaryBestEv",
    bestEv !== null
      ? `${bestEv.toFixed(2)}%`
      : "—"
  );


  setText(
    "summaryCoverage",
    `${coverage.toFixed(0)}%`
  );

}
function mlbFilteredGames() {
  return currentGameLines.filter(game => {
    if (!searchFilter) return true;

    return `${game.event_title || ""} ${game.home_team || ""} ${game.away_team || ""}`
      .toLowerCase()
      .includes(searchFilter);
  });
}

function renderMlbMarketPicks() {
  if (currentMlbView === "value") {
    stopLiveOddsRefresh();
    renderMlbValuePicks();
  }
  else if (currentMlbView === "live") {
    startLiveOddsRefresh();
    renderMlbLiveOdds();
  }
  else {
    stopLiveOddsRefresh();
    renderMlbOddsScreen();
  }
}

function renderMlbOddsScreen() {
  const container = document.getElementById("gameLinesResults");
  if (!container) return;

  container.innerHTML = "";

  const isNcaaf = isNcaafMarketMode();
  const sportLabel = marketSportLabel();
  const selectedBooks = [...visibleBooks];
  const filteredGames = mlbFilteredGames().filter(game => !game.is_live);

  const wrapper = document.createElement("div");
  wrapper.className = "table-scroll-wrapper";

  const table = document.createElement("table");
  table.className = "odds-table";

  let header = `
    <thead>
      <tr>
        <th class="sticky-game">Game</th>
        <th>Time</th>
        <th class="sticky-market">Market</th>
        <th class="sticky-selection">Selection</th>`;

  selectedBooks.forEach(book => {
    header += `<th>${bookDisplayNames?.[book] || book}</th>`;
  });

  if (isNcaaf) {
    header += `
        <th>Best</th>
        <th>${tableHeaderWithTooltip(
          "Market Fair %",
          "Multi-book no-vig consensus probability before any Team Model adjustment."
        )}</th>
        <th>${tableHeaderWithTooltip(
          "Team Model %",
          "Independent Team Model v2 probability for this exact spread side. Moneylines and totals remain market-only."
        )}</th>
        <th>${tableHeaderWithTooltip(
          "EV+ Fair %",
          "Final probability used by NCAAF EV+. Spreads conservatively blend the market with Team Model v2."
        )}</th>
        <th>${tableHeaderWithTooltip(
          "Model Projection",
          "Team Model v2 projected game favorite/spread, plus the model edge for this exact selection when applicable."
        )}</th>
        <th>${tableHeaderWithTooltip(
          "Fair Odds",
          "American odds corresponding to the final EV+ fair probability."
        )}</th>
        <th>${tableHeaderWithTooltip(
          "Estimated EV",
          "Estimated return at the best available price using the final EV+ fair probability."
        )}</th>
        <th>${tableHeaderWithTooltip(
          "Confidence",
          "Combined market/model confidence for EV+ spreads; market confidence for moneylines and totals."
        )}</th>
        <th>${tableHeaderWithTooltip(
          "Model Basis",
          "Spreads use Market + Team Model v2. Moneylines and totals remain market-only."
        )}</th>
        <th>${tableHeaderWithTooltip(
          "Signal",
          "Lean: 1%+ EV with 3+ books. Value: 3%+ EV with 4+ books. Strong Value: 5%+ EV with 5+ books."
        )}</th>
        <th>Add</th>
      </tr>
    </thead>
    <tbody></tbody>`;
  }
  else {
    header += `
        <th>Best</th>
        <th>${tableHeaderWithTooltip(
          "Market No-Vig %",
          "Sportsbook consensus probability after removing the bookmaker margin."
        )}</th>
        <th>${tableHeaderWithTooltip(
          "Stats-Adjusted %",
          "Market probability after applying the full adjustment from starting pitchers, offense, bullpens, recent form, and home field."
        )}</th>
        <th>${tableHeaderWithTooltip(
          "Final Model %",
          "The conservative probability used for betting decisions. It blends the market consensus with the stats-adjusted estimate."
        )}</th>
        <th>${tableHeaderWithTooltip(
          "Model Fair Odds",
          "American odds corresponding to the Final Model probability."
        )}</th>
        <th>${tableHeaderWithTooltip(
          "Estimated EV",
          "Estimated return at the best available price. Positive EV means the offered odds are better than the model fair odds."
        )}</th>
        <th>${tableHeaderWithTooltip(
          "Confidence",
          "Data-quality rating based on starter history, recency, offense coverage, bullpen data, and available sportsbooks."
        )}</th>
        <th>${tableHeaderWithTooltip(
          "Model Factors",
          "Summary of the matchup inputs that moved the prediction. Click the row for the full explanation."
        )}</th>
        <th>${tableHeaderWithTooltip(
          "Signal",
          "Lean: 0.5%–1.99% EV. Value: 2%+ EV. Strong Value: 4%+ EV with high confidence."
        )}</th>
        <th>Add</th>
      </tr>
    </thead>
    <tbody></tbody>`;
  }

  table.innerHTML = header;
  const tbody = table.querySelector("tbody");

  filteredGames.forEach(game => {
    const rows = game.market_board || [];

    if (!rows.length) {
      const tr = document.createElement("tr");
      const extraColumns = isNcaaf ? 11 : 10;

      tr.innerHTML = `
        <td class="sticky-game">${game.event_title}</td>
        <td>${game.game_time_display || "-"}</td>
        <td colspan="${selectedBooks.length + extraColumns}">
          No ${sportLabel} odds comparison rows were returned by the API.
        </td>`;

      tbody.appendChild(tr);
      return;
    }

    rows.forEach((row, index) => {
      const tr = document.createElement("tr");

      if (index === 0) tr.classList.add("game-start-row");
      if (index === rows.length - 1) tr.classList.add("game-end-row");

      let rowHtml = `
        <td class="sticky-game">${index === 0 ? game.event_title : ""}</td>
        <td>${index === 0 ? (game.game_time_display || "-") : ""}</td>
        <td class="sticky-market">${row.market_label || row.market}</td>
        <td class="sticky-selection"><strong>${row.pick_label}</strong></td>`;

      selectedBooks.forEach(book => {
        const priceInfo = row.prices?.[book];
        const bookPrice = priceInfo?.price;
        const isOutlier = priceInfo?.is_outlier === true;
        const isBest =
          !isOutlier
          && bookPrice != null
          && Number(bookPrice) === Number(row.best_price);

        const cellClass = isOutlier
          ? "odds-cell-worse"
          : oddsCellClass(bookPrice, row.best_price);

        rowHtml += `
          <td class="${cellClass}"
              title="${isOutlier
                ? `Outlier: ${Number(priceInfo.deviation_pp).toFixed(1)} points from consensus`
                : ""}">
            ${bookPrice != null ? formatAmericanOdds(bookPrice) : "-"}
            ${isBest ? '<div class="badge">Best</div>' : ""}
            ${isOutlier ? '<div class="badge">Outlier</div>' : ""}
          </td>`;
      });

      if (isNcaaf) {
        rowHtml += `
          <td>
            <strong>${formatAmericanOdds(row.best_price)}</strong>
            <div class="edge-sub">${row.best_book_name || row.best_book || "-"}</div>
          </td>
          <td>${row.market_probability != null
            ? (Number(row.market_probability) * 100).toFixed(1) + "%"
            : "-"}</td>
          <td>${row.team_model_probability != null
            ? (Number(row.team_model_probability) * 100).toFixed(1) + "%"
            : '<span class="edge-sub">Market-only</span>'}</td>
          <td><strong>${row.model_probability != null
            ? (Number(row.model_probability) * 100).toFixed(1) + "%"
            : "-"}</strong></td>
          <td>${ncaafTableProjectionHtml(game, row)}</td>
          <td>${formatAmericanOdds(row.fair_price)}</td>
          <td class="${evCellClass(row.expected_value_pct)}">
            ${mlbEvBadge(row.expected_value_pct, row.recommendation)}
          </td>
          <td>${row.model_confidence || "-"}</td>
          <td>${mlbModelFactorsHtml(row)}</td>
          <td>${recommendationLabel(row.recommendation)}</td>
          <td><button class="add-mlb-pick-btn">➕ Add</button></td>`;
      }
      else {
        rowHtml += `
          <td>
            <strong>${formatAmericanOdds(row.best_price)}</strong>
            <div class="edge-sub">${row.best_book_name || row.best_book || "-"}</div>
          </td>
          <td>${row.market_probability != null
            ? (Number(row.market_probability) * 100).toFixed(1) + "%"
            : "-"}</td>
          <td>${row.baseball_probability != null
            ? (Number(row.baseball_probability) * 100).toFixed(1) + "%"
            : "-"}</td>
          <td><strong>${row.blended_probability != null
            ? (Number(row.blended_probability) * 100).toFixed(1) + "%"
            : "-"}</strong></td>
          <td>${formatAmericanOdds(row.fair_price)}</td>
          <td class="${evCellClass(row.expected_value_pct)}">
            ${mlbEvBadge(row.expected_value_pct, row.recommendation)}
          </td>
          <td>${row.model_confidence || "-"}</td>
          <td>${mlbModelFactorsHtml(row)}</td>
          <td>${recommendationLabel(row.recommendation)}</td>
          <td><button class="add-mlb-pick-btn">➕ Add</button></td>`;
      }

      tr.innerHTML = rowHtml;
      tr.classList.add("mlb-model-clickable-row");
      tr.title = `Click to view the ${sportLabel} market detail`;

      tr.addEventListener("click", event => {
        if (
          event.target.closest("button")
          || event.target.closest("a")
          || event.target.closest("input")
        ) {
          return;
        }

        showMarketRowBreakdown(game, row);
      });

      tr.querySelector(".mlb-detail-inline-btn")?.addEventListener(
        "click",
        event => {
          event.stopPropagation();
          showMarketRowBreakdown(game, row);
        }
      );

      attachMlbAddHandler(tr, game, row);
      tbody.appendChild(tr);
    });
  });

  wrapper.appendChild(table);

container.appendChild(wrapper);

// ↔️ Persistent horizontal scrollbar
attachGameLinesHorizontalScrollbar(
  wrapper
);

}

function renderMlbValuePicks() {
  const container = document.getElementById("gameLinesResults");
  if (!container) return;

  container.innerHTML = "";

  const isNcaaf = isNcaafMarketMode();
  const sportLabel = marketSportLabel();

  const tierNote = document.createElement("div");
  tierNote.className = "mlb-value-tier-note";

  tierNote.innerHTML = isNcaaf
    ? `
      <strong>NCAAF EV+ opportunities:</strong>
      👀 Lean 1.0%+ EV with 3+ valid books ·
      ✅ Value 3.0%+ EV with 4+ books ·
      🔥 Strong Value 5.0%+ EV with 5+ books.
      Pregame spreads show Market Fair, Team Model v2, EV+ Fair, and the projected game spread.
      Moneylines and totals remain market-only.
    `
    : `
      <strong>Model opportunities:</strong>
      👀 Lean 0.5%–1.99% EV ·
      ✅ Value 2.0%+ EV ·
      🔥 Strong Value 4.0%+ EV.
      Only Value and Strong Value are included in the official tracked record.
      Click any opportunity row or View Detail to see the model breakdown.
    `;

  container.appendChild(tierNote);

  const filteredGames =
    mlbFilteredGames().filter(game => !game.is_live);

  const table = document.createElement("table");
  table.className = "odds-table";

  table.innerHTML = isNcaaf
    ? `
      <thead>
        <tr>
          <th>Game</th>
          <th>Time</th>
          <th>Market</th>
          <th>Pick</th>
          <th>Best Book</th>
          <th>Best Price</th>
          <th>${tableHeaderWithTooltip(
            "Market Fair %",
            "Multi-book no-vig consensus probability before Team Model adjustment."
          )}</th>
          <th>${tableHeaderWithTooltip(
            "Team Model %",
            "Independent Team Model v2 probability for the exact spread selection. Moneylines and totals remain market-only."
          )}</th>
          <th>${tableHeaderWithTooltip(
            "EV+ Fair %",
            "Final probability used for the EV calculation."
          )}</th>
          <th>${tableHeaderWithTooltip(
            "Model Projection",
            "Projected game favorite/spread and the model edge for this selection."
          )}</th>
          <th>${tableHeaderWithTooltip(
            "Fair Odds",
            "American odds corresponding to the final EV+ fair probability."
          )}</th>
          <th>${tableHeaderWithTooltip(
            "Estimated EV",
            "Estimated return at the best available price using EV+ fair probability."
          )}</th>
          <th>${tableHeaderWithTooltip(
            "Confidence",
            "Combined market/model confidence for spreads; market confidence for moneyline and totals."
          )}</th>
          <th>${tableHeaderWithTooltip(
            "Model Basis",
            "Spreads use Market + Team Model v2. Moneylines and totals remain market-only."
          )}</th>
          <th>${tableHeaderWithTooltip(
            "Signal",
            "Lean: 1%+ EV with 3+ books. Value: 3%+ EV with 4+ books. Strong Value: 5%+ EV with 5+ books."
          )}</th>
          <th>Add</th>
        </tr>
      </thead>
      <tbody></tbody>
    `
    : `
      <thead>
        <tr>
          <th>Game</th>
          <th>Time</th>
          <th>Market</th>
          <th>Pick</th>
          <th>Best Book</th>
          <th>Best Price</th>
          <th>${tableHeaderWithTooltip(
            "Market No-Vig %",
            "Sportsbook consensus probability after removing the bookmaker margin."
          )}</th>
          <th>${tableHeaderWithTooltip(
            "Stats-Adjusted %",
            "Market probability after applying the full adjustment from starting pitchers, offense, bullpens, recent form, and home field."
          )}</th>
          <th>${tableHeaderWithTooltip(
            "Final Model %",
            "The conservative probability used for betting decisions. It blends the market consensus with the stats-adjusted estimate."
          )}</th>
          <th>${tableHeaderWithTooltip(
            "Model Fair Odds",
            "American odds corresponding to the Final Model probability."
          )}</th>
          <th>${tableHeaderWithTooltip(
            "Estimated EV",
            "Estimated return at the best available price. Positive EV means the offered odds are better than the model fair odds."
          )}</th>
          <th>${tableHeaderWithTooltip(
            "Confidence",
            "Data-quality rating based on starter history, recency, offense coverage, bullpen data, and available sportsbooks."
          )}</th>
          <th>${tableHeaderWithTooltip(
            "Model Factors",
            "Summary of the matchup inputs that moved the prediction. Click the row for the full explanation."
          )}</th>
          <th>${tableHeaderWithTooltip(
            "Signal",
            "Lean: 0.5%–1.99% EV. Value: 2%+ EV. Strong Value: 4%+ EV with high confidence."
          )}</th>
          <th>Add</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;

  const tbody = table.querySelector("tbody");

  filteredGames.forEach(game => {
    const picks = (game.market_picks || [])
      .filter(pick => {
        const tier = String(
          pick.recommendation || ""
        ).trim().toUpperCase();

        return [
          "LEAN",
          "VALUE",
          "STRONG_VALUE",
        ].includes(tier);
      })
      .sort((a, b) => {
        const rank = {
          STRONG_VALUE: 3,
          VALUE: 2,
          LEAN: 1,
        };

        const aTier = String(
          a.recommendation || ""
        ).trim().toUpperCase();

        const bTier = String(
          b.recommendation || ""
        ).trim().toUpperCase();

        return (
          (rank[bTier] || 0)
          - (rank[aTier] || 0)
          || Number(b.expected_value_pct || 0)
          - Number(a.expected_value_pct || 0)
        );
      });

    if (!picks.length) {
      return;
    }

    picks.forEach((pick, index) => {
      const tr = document.createElement("tr");

      if (index === 0) tr.classList.add("game-start-row");
      if (index === picks.length - 1) tr.classList.add("game-end-row");

      tr.innerHTML = isNcaaf
        ? `
          <td>${index === 0 ? game.event_title : ""}</td>
          <td>${index === 0 ? (game.game_time_display || "-") : ""}</td>
          <td>${pick.market_label || pick.market}</td>
          <td><strong>${pick.pick_label}</strong></td>
          <td>${pick.best_book_name || pick.best_book || "-"}</td>
          <td>${formatAmericanOdds(pick.best_price)}</td>
          <td>${pick.market_probability != null
            ? (Number(pick.market_probability) * 100).toFixed(1) + "%"
            : "-"}</td>
          <td>${pick.team_model_probability != null
            ? (Number(pick.team_model_probability) * 100).toFixed(1) + "%"
            : '<span class="edge-sub">Market-only</span>'}</td>
          <td><strong>${pick.model_probability != null
            ? (Number(pick.model_probability) * 100).toFixed(1) + "%"
            : "-"}</strong></td>
          <td>${ncaafTableProjectionHtml(game, pick)}</td>
          <td>${formatAmericanOdds(pick.fair_price)}</td>
          <td class="${evCellClass(pick.expected_value_pct)}">
            ${mlbEvBadge(pick.expected_value_pct, pick.recommendation)}
          </td>
          <td>${pick.model_confidence || "-"}</td>
          <td>${mlbModelFactorsHtml(pick)}</td>
          <td>${recommendationLabel(pick.recommendation)}</td>
          <td><button class="add-mlb-pick-btn">➕ Add</button></td>
        `
        : `
          <td>${index === 0 ? game.event_title : ""}</td>
          <td>${index === 0 ? (game.game_time_display || "-") : ""}</td>
          <td>${pick.market_label || pick.market}</td>
          <td><strong>${pick.pick_label}</strong></td>
          <td>${pick.best_book_name || pick.best_book || "-"}</td>
          <td>${formatAmericanOdds(pick.best_price)}</td>
          <td>${pick.market_probability != null
            ? (Number(pick.market_probability) * 100).toFixed(1) + "%"
            : "-"}</td>
          <td>${pick.baseball_probability != null
            ? (Number(pick.baseball_probability) * 100).toFixed(1) + "%"
            : "-"}</td>
          <td><strong>${pick.blended_probability != null
            ? (Number(pick.blended_probability) * 100).toFixed(1) + "%"
            : "-"}</strong></td>
          <td>${formatAmericanOdds(pick.fair_price)}</td>
          <td class="${evCellClass(pick.expected_value_pct)}">
            ${mlbEvBadge(pick.expected_value_pct, pick.recommendation)}
          </td>
          <td>${pick.model_confidence || "-"}</td>
          <td>${mlbModelFactorsHtml(pick)}</td>
          <td>${recommendationLabel(pick.recommendation)}</td>
          <td><button class="add-mlb-pick-btn">➕ Add</button></td>
        `;

      tr.classList.add("mlb-model-clickable-row");
      tr.title = `Click to view the ${sportLabel} market detail`;

      tr.addEventListener("click", event => {
        if (
          event.target.closest("button")
          || event.target.closest("a")
          || event.target.closest("input")
        ) {
          return;
        }

        showMarketRowBreakdown(game, pick);
      });

      tr.querySelector(".mlb-detail-inline-btn")?.addEventListener(
        "click",
        event => {
          event.stopPropagation();
          showMarketRowBreakdown(game, pick);
        }
      );

      attachMlbAddHandler(tr, game, pick);
      tbody.appendChild(tr);
    });
  });

 const wrapper = document.createElement("div");

wrapper.className =
  "table-scroll-wrapper ev-plus-scroll-wrapper";

  if (!tbody.children.length) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td colspan="${isNcaaf ? 16 : 15}" class="mlb-empty-opportunities">
        No Lean, Value, or Strong Value ${sportLabel} selections currently qualify.
      </td>`;
    tbody.appendChild(tr);
  }

  wrapper.appendChild(table);

container.appendChild(wrapper);

// ↔️ Persistent horizontal scrollbar
attachGameLinesHorizontalScrollbar(
  wrapper
);

}

function renderMlbLiveOdds() {
  const container = document.getElementById("gameLinesResults");
  if (!container) return;

  const sportLabel = marketSportLabel();

  container.innerHTML = `
    <div class="live-refresh-note">
      🔴 Live ${sportLabel} odds refresh automatically every 30 seconds. Prices can move quickly.
    </div>
  `;

  const selectedBooks = [...visibleBooks];
  const liveGames = mlbFilteredGames().filter(game => game.is_live);

  if (!liveGames.length) {
    container.innerHTML += `
      <div style="padding:18px;">
        No ${sportLabel} games are currently live for the selected date.
      </div>`;
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = "table-scroll-wrapper";

  const table = document.createElement("table");
  table.className = "odds-table";

  let header = `
    <thead>
      <tr>
        <th class="sticky-game">Game</th>
        <th>Started</th>
        <th class="sticky-market">Market</th>
        <th class="sticky-selection">Selection</th>`;

  selectedBooks.forEach(book => {
    header += `<th>${bookDisplayNames?.[book] || book}</th>`;
  });

  header += `
        <th>Best Live Price</th>
        <th>Live Market %</th>
        <th>Live Price Edge</th>
        <th>Add</th>
      </tr>
    </thead>
    <tbody></tbody>`;

  table.innerHTML = header;
  const tbody = table.querySelector("tbody");

  liveGames.forEach(game => {
    const rows = game.market_board || [];

    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td class="sticky-game">
          ${game.event_title}
          <span class="live-game-badge">LIVE</span>
        </td>
        <td>${game.game_time_display || "-"}</td>
        <td colspan="${selectedBooks.length + 7}">
          No live odds are currently available.
        </td>`;
      tbody.appendChild(tr);
      return;
    }

    rows.forEach((row, index) => {
      const tr = document.createElement("tr");

      if (index === 0) tr.classList.add("game-start-row");
      if (index === rows.length - 1) tr.classList.add("game-end-row");

      let rowHtml = `
        <td class="sticky-game">
          ${index === 0 ? game.event_title : ""}
          ${index === 0 ? '<span class="live-game-badge">LIVE</span>' : ""}
        </td>
        <td>${index === 0 ? (game.game_time_display || "-") : ""}</td>
        <td class="sticky-market">${row.market_label || row.market}</td>
        <td class="sticky-selection"><strong>${row.pick_label}</strong></td>`;

      selectedBooks.forEach(book => {
        const bookPrice = row.prices?.[book]?.price;
        const isBest =
          bookPrice != null
          && Number(bookPrice) === Number(row.best_price);

        const cellClass =
          oddsCellClass(bookPrice, row.best_price);

        rowHtml += `
          <td class="${cellClass}">
            ${bookPrice != null ? formatAmericanOdds(bookPrice) : "-"}
            ${isBest ? '<div class="badge">Best</div>' : ""}
          </td>`;
      });

      rowHtml += `
        <td>
          <strong>${formatAmericanOdds(row.best_price)}</strong>
          <div class="edge-sub">${row.best_book_name || row.best_book || "-"}</div>
        </td>
        <td>${row.fair_probability != null
          ? (Number(row.fair_probability) * 100).toFixed(1) + "%"
          : "-"}</td>
        <td class="${evCellClass(row.price_edge_pct)}">
          ${row.price_edge_pct != null
            ? Number(row.price_edge_pct).toFixed(2) + "% price edge"
            : "-"}
        </td>
        <td><button class="add-mlb-pick-btn">➕ Add</button></td>`;

      tr.innerHTML = rowHtml;
      attachMlbAddHandler(tr, game, row);
      tbody.appendChild(tr);
    });
  });

 wrapper.appendChild(table);

container.appendChild(wrapper);

// ↔️ Persistent horizontal scrollbar
attachGameLinesHorizontalScrollbar(
  wrapper
);

}
function attachMlbAddHandler(rowElement, game, pick) {
  rowElement
    .querySelector(".add-mlb-pick-btn")
    ?.addEventListener("click", async e => {
      e.stopPropagation();

      const btn = e.currentTarget;

      if (!window.supabase) {
        return alert("Supabase not initialized.");
      }

      const sessionResponse =
        await window.supabase.auth.getSession();

      const session =
        sessionResponse?.data?.session;

      if (!session?.access_token) {
        return alert("Please log in first.");
      }

      const selectedSport =
        game?.sport
        || document.getElementById("sportSelect")?.value
        || "baseball_mlb";

      const trackerPick = {
        sport: selectedSport,
        event: game.event_title,
        event_id: game.event_id,
        game_pk:
          selectedSport === "baseball_mlb"
            ? (
                game.model_context?.probable_game_pk
                ?? game.game_pk
                ?? null
              )
            : null,
        game_date: game.game_date,
        commence_time:
          game.game_timestamp
          ?? game.commence_time
          ?? null,
        home_team: game.home_team,
        away_team: game.away_team,
        player: pick.selection,
        market: pick.market,
        outcome: pick.selection,
        line: pick.point ?? null,
        odds: pick.best_price,
        sportsbook:
          pick.best_book_name
          || pick.best_book
      };

      const res = await fetch(
        `${window.API_BASE}/api/slips/manual`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization":
              `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            slip_type: "regular",
            platform: "sportsbook",
            sport: selectedSport,
            title:
              `${pick.pick_label} — ${game.event_title}`,
            picks: [trackerPick]
          })
        }
      );

      if (res.ok) {
        btn.innerText = "✅ Added";
        btn.disabled = true;
      }
      else {
        const body = await res.text();

        console.error(
          `Failed to add ${selectedSport} pick:`,
          body
        );

        alert("Failed to add pick.");
      }
    });
}

function renderGameCards() {

  const container = document.getElementById("gameLinesCardView");
  if (!container) return;

  container.innerHTML = "";

  const filteredGames = currentGameLines.filter(game => {
    if (!searchFilter) return true;

    const searchText = (
      (game.event_title || "") + " " +
      (game.home_team || "") + " " +
      (game.away_team || "")
    ).toLowerCase();

    return searchText.includes(searchFilter);
  });

  filteredGames.forEach(game => {

    // =====================================================
    // ⚾ / 🏈 MARKET MODE — MODERN PROJECTED LINES CARD
    // =====================================================
    if (isMarketEvMode(game?.mode)) {

      const context = game?.model_context || {};
      const board = Array.isArray(game?.market_board)
        ? game.market_board
        : [];

      const isNcaaf = game?.mode === "ncaaf_market";
      const sportIcon = isNcaaf ? "🏈" : "⚾";

      const projectedRows = board
        .filter(row =>
          row &&
          row.pick_label &&
          row.best_price != null
        )
        .sort((a, b) => {
          const aEv = Number(a?.expected_value_pct);
          const bEv = Number(b?.expected_value_pct);

          if (Number.isFinite(aEv) || Number.isFinite(bEv)) {
            return (Number.isFinite(bEv) ? bEv : -999)
              - (Number.isFinite(aEv) ? aEv : -999);
          }

          const marketOrder = { spreads: 0, h2h: 1, totals: 2 };
          return (
            (marketOrder[a.market] ?? 9)
            - (marketOrder[b.market] ?? 9)
          );
        })
        .slice(0, 6);

      const projectedFavorite = context?.projected_favorite;
      const projectedFavoriteSpread = Number(
        context?.projected_favorite_spread
      );

      const ncaafProjection =
        isNcaaf &&
        projectedFavorite &&
        Number.isFinite(projectedFavoriteSpread)
          ? `${projectedFavorite} ${projectedFavoriteSpread > 0 ? "+" : ""}${projectedFavoriteSpread.toFixed(2)}`
          : null;

      const marketSpread = Number(context?.market_home_spread);
      const modelGap = Number(context?.model_vs_market_points);

      const bestOpportunity = projectedRows
        .filter(row => Number.isFinite(Number(row?.expected_value_pct)))
        .sort(
          (a, b) =>
            Number(b.expected_value_pct)
            - Number(a.expected_value_pct)
        )[0];

      const bestEv = Number(bestOpportunity?.expected_value_pct);
      const bestTier = String(
        bestOpportunity?.recommendation || ""
      ).toUpperCase();

      const cardSignalClass =
        bestTier === "STRONG_VALUE"
          ? "strong"
          : bestTier === "VALUE"
          ? "value"
          : bestTier === "LEAN"
          ? "lean"
          : "neutral";

      const cardSignalLabel =
        bestTier === "STRONG_VALUE"
          ? "🔥 Strong Value"
          : bestTier === "VALUE"
          ? "✅ Value"
          : bestTier === "LEAN"
          ? "👀 Lean"
          : "Market Board";

      const rowsHtml = projectedRows.length
        ? projectedRows.map((row, rowIndex) => {
            const marketProb = Number(row?.market_probability);
            const modelProb = Number(row?.model_probability);
            const teamModelProb = Number(row?.team_model_probability);
            const ev = Number(row?.expected_value_pct);
            const edgePts = Number(row?.model_edge_points);

            const marketPct = Number.isFinite(marketProb)
              ? `${(marketProb * 100).toFixed(1)}%`
              : "-";

            const modelPct = Number.isFinite(modelProb)
              ? `${(modelProb * 100).toFixed(1)}%`
              : "-";

            const teamModelPct = Number.isFinite(teamModelProb)
              ? `${(teamModelProb * 100).toFixed(1)}%`
              : null;

            const evText = Number.isFinite(ev)
              ? `${ev >= 0 ? "+" : ""}${ev.toFixed(2)}%`
              : "-";

            const fairOdds =
              row?.fair_price != null
                ? formatAmericanOdds(row.fair_price)
                : "-";

            const bestPrice =
              row?.best_price != null
                ? formatAmericanOdds(row.best_price)
                : "-";

            const bestBook =
              row?.best_book_name ||
              row?.best_book ||
              "-";

            const tier = String(
              row?.recommendation || ""
            ).toUpperCase();

            const signalClass =
              tier === "STRONG_VALUE"
                ? "strong"
                : tier === "VALUE"
                ? "value"
                : tier === "LEAN"
                ? "lean"
                : Number.isFinite(ev) && ev > 0
                ? "positive"
                : "neutral";

            const signalText =
              tier === "STRONG_VALUE"
                ? "STRONG"
                : tier === "VALUE"
                ? "VALUE"
                : tier === "LEAN"
                ? "LEAN"
                : Number.isFinite(ev) && ev > 0
                ? "+EV"
                : "PASS";

            const modelDetail =
              isNcaaf && row?.ev_plus_active && Number.isFinite(edgePts)
                ? `${edgePts >= 0 ? "+" : ""}${edgePts.toFixed(2)} pts model edge`
                : isNcaaf
                ? "Market-only"
                : row?.model_status === "ready"
                ? "Stats-adjusted"
                : "Market fallback";

            return `
              <button
                type="button"
                class="market-card-line market-card-line-btn"
                data-market-row="${rowIndex}"
                aria-label="Open ${row.pick_label} detail"
              >
                <div class="market-card-line-top">
                  <div class="market-card-line-main">
                    <span>${row.market_label || row.market || "Market"}</span>
                    <strong>${row.pick_label}</strong>
                    <small>${modelDetail}</small>
                  </div>

                  <div class="market-card-signal ${signalClass}">
                    ${signalText}
                  </div>
                </div>

                <div class="market-card-metrics">
                  <div class="market-card-metric">
                    <span>Best Price</span>
                    <strong>${bestPrice}</strong>
                    <small>${bestBook}</small>
                  </div>

                  <div class="market-card-metric">
                    <span>Fair Odds</span>
                    <strong>${fairOdds}</strong>
                    <small>${modelPct} fair</small>
                  </div>

                  <div class="market-card-metric">
                    <span>${isNcaaf ? "Market / EV+" : "Market / Model"}</span>
                    <strong>${marketPct} → ${modelPct}</strong>
                    <small>${teamModelPct ? `Team ${teamModelPct}` : row?.model_confidence || ""}</small>
                  </div>

                  <div class="market-card-metric ${Number.isFinite(ev) && ev > 0 ? "positive" : Number.isFinite(ev) && ev < 0 ? "negative" : ""}">
                    <span>Expected EV</span>
                    <strong>${evText}</strong>
                    <small>${row?.model_confidence || "—"} confidence</small>
                  </div>
                </div>

                <div class="market-card-detail-link">
                  Line detail <span>›</span>
                </div>
              </button>
            `;
          }).join("")
        : `
          <div class="market-card-empty">
            No current projected lines available.
          </div>
        `;

      const card = document.createElement("article");
      card.className = `game-card market-projection-card ${cardSignalClass}`;

      card.innerHTML = `
        <div class="market-card-header">
          <div class="market-card-title-wrap">
            <div class="market-card-sport-icon">${sportIcon}</div>
            <div>
              <h3>${game.event_title}</h3>
              <div class="market-card-time">${game.game_time_display || ""}</div>
            </div>
          </div>

          <div class="market-card-best-signal ${cardSignalClass}">
            <span>${cardSignalLabel}</span>
            <strong>
              ${Number.isFinite(bestEv)
                ? `${bestEv >= 0 ? "+" : ""}${bestEv.toFixed(2)}% EV`
                : "Pregame"}
            </strong>
          </div>
        </div>

        ${
          ncaafProjection
            ? `
              <div class="market-card-projection-strip">
                <div>
                  <span>BTBT Projection</span>
                  <strong>${ncaafProjection}</strong>
                </div>

                <div>
                  <span>Market Spread</span>
                  <strong>
                    ${Number.isFinite(marketSpread)
                      ? `${game.home_team} ${marketSpread > 0 ? "+" : ""}${marketSpread.toFixed(2)}`
                      : "—"}
                  </strong>
                </div>

                <div>
                  <span>Model Gap</span>
                  <strong>
                    ${Number.isFinite(modelGap)
                      ? `${modelGap >= 0 ? "+" : ""}${modelGap.toFixed(2)} pts`
                      : "—"}
                  </strong>
                </div>
              </div>
            `
            : ""
        }

        <div class="market-card-section-heading">
          <span>Projected Lines</span>
          <small>${projectedRows.length} markets</small>
        </div>

        <div class="market-card-lines">
          ${rowsHtml}
        </div>
      `;

      card.querySelectorAll("[data-market-row]").forEach(btn => {
        btn.addEventListener("click", event => {
          event.stopPropagation();
          const rowIndex = Number(btn.dataset.marketRow);
          showMarketRowBreakdown(
            game,
            projectedRows[rowIndex] || null
          );
        });
      });

      container.appendChild(card);
      return;
    }

    // =====================================================
    // 🏀 EXISTING NCAAB CARD MODE
    // =====================================================
    const recommendation =
      game.recommended_team
        ? `Take ${game.recommended_team} ${game.recommended_spread ?? ""}`
        : "No Strong Edge";

    const card = document.createElement("div");
    card.className = "game-card";

    let vegasLinesHTML = "";

    const booksToShow = [...visibleBooks].slice(0, 3);

    booksToShow.forEach(book => {
      const homeLine = game.books?.[game.home_team]?.[book];
      const awayLine = game.books?.[game.away_team]?.[book];

      if (homeLine != null || awayLine != null) {
        vegasLinesHTML += `
          <div class="card-line-row">
            <div class="card-book-name">
              ${bookDisplayNames?.[book] || book}
            </div>
            <div class="card-line-values">
              ${game.away_team}: ${awayLine ?? "-"} |
              ${game.home_team}: ${homeLine ?? "-"}
            </div>
          </div>
        `;
      }
    });

    card.innerHTML = `
      <h3>${game.event_title}</h3>

      <div class="card-row">
        ${game.away_team} @ ${game.home_team}
      </div>

      <div class="card-row">
        <strong>Model:</strong> ${game.model_spread ?? "-"}
      </div>

      <div class="card-row">
        <strong>Edge:</strong> ${game.recommended_edge ?? "-"}
      </div>

      ${vegasLinesHTML}

      <div class="card-recommend">
        ${recommendation}
      </div>

      <button class="card-add-btn">
        ➕ Add to Pick Tracker
      </button>
    `;

    container.appendChild(card);
  });
}

// =====================================================
// Close breakdown modal
// =====================================================
document.addEventListener("click", function(e){

  if (e.target?.id === "closeModelBreakdownBtn") {

    const modal =
      document.getElementById("modelBreakdownModal");

    modal?.classList.add("hidden");

    if (modal) {
      modal.style.display = "";
      modal.setAttribute("aria-hidden", "true");
    }

  }



});

