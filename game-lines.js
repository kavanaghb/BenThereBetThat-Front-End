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

  const container = document.getElementById("gameLinesResults");

  if (!container) {
    console.error("Missing gameLinesResults container");
    return;
  }

  container.innerHTML = "Loading...";

  try {

    const dateInput = document.getElementById("gameLinesDate");

    const selectedSport =
      document.getElementById("sportSelect")?.value ||
      "basketball_ncaab";

    let url = `${window.API_BASE}/api/game-lines?sport=${encodeURIComponent(selectedSport)}`;

    if (dateInput?.value)
      url += `&date=${dateInput.value}`;

    const res = await fetch(url);

    const games = await res.json();

    if (!games || games.length === 0) {
      container.innerHTML = "No games found";
      return;
    }

    
currentGameLines = games;

const mlbTabs = document.getElementById("mlbViewTabs");
if (mlbTabs) {
  mlbTabs.style.display = games[0]?.mode === "mlb_market"
    ? "flex"
    : "none";
}

const modeNote = document.getElementById("gameLinesModeNote");
if (modeNote) {
  modeNote.innerHTML = games[0]?.mode === "mlb_market"
    ? "⚾ Market Baseline v1 uses the median no-vig market probability, excludes major book outliers, calculates a fair line and true expected value, and recommends only pregame bets with at least 2% EV."
    : "🏀 College basketball spreads use Ben's learned Torvik/market model.";
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

  if (currentGameLines?.[0]?.mode === "mlb_market") {
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

  const modelBtn = document.getElementById("toggleModelDebug");

if (modelBtn) {

  modelBtn.addEventListener("click", () => {

    window.modelDebugMode = !window.modelDebugMode;

    // Highlight button when active
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

    if (sportSelect.value !== "baseball_mlb") {
      stopLiveOddsRefresh();
      currentMlbView = "odds";
    }

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

  currentViewMode = "table"; // ✅ ADD THIS

  document.querySelector(".table-scroll-wrapper").style.display = "block";
  cardView.style.display = "none";

  tableBtn.classList.add("active");
  cardBtn.classList.remove("active");

});

cardBtn?.addEventListener("click", () => {

  currentViewMode = "card"; // ✅ ADD THIS

  renderGameCards();

  document.querySelector(".table-scroll-wrapper").style.display = "none";
  cardView.style.display = "block";

  cardBtn.classList.add("active");
  tableBtn.classList.remove("active");

});


// =====================================================
// Initial load after controls are initialized
// =====================================================

  initGameLines();

});

window.showModelBreakdown = function(game)
{

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
    if (
      currentMlbView === "live" &&
      document.getElementById("sportSelect")?.value === "baseball_mlb"
    ) {
      console.log("🔴 Refreshing live MLB odds...");
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

  const distance = probabilityDistancePct(price, bestPrice);

  if (distance == null)
    return "";

  if (distance < 0.001)
    return "odds-cell-best";

  if (distance <= 0.5)
    return "odds-cell-near";

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

  header += `
        <th>Best</th>
        <th>Model %</th>
        <th>Fair Line</th>
        <th>True EV</th>
        <th>Signal</th>
        <th>Add</th>
      </tr>
    </thead>
    <tbody></tbody>`;

  table.innerHTML = header;
  const tbody = table.querySelector("tbody");

  filteredGames.forEach(game => {
    const rows = game.market_board || [];

    if (!rows.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${game.event_title}</td>
        <td>${game.game_time_display || "-"}</td>
        <td colspan="${selectedBooks.length + 7}">
          No MLB odds comparison rows were returned by the API.
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
        const isBest = !isOutlier && bookPrice != null &&
          Number(bookPrice) === Number(row.best_price);
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

      rowHtml += `
        <td>
          <strong>${formatAmericanOdds(row.best_price)}</strong>
          <div class="edge-sub">${row.best_book_name || row.best_book || "-"}</div>
        </td>
        <td>${row.model_probability != null
          ? (Number(row.model_probability) * 100).toFixed(1) + "%"
          : "-"}</td>
        <td>${formatAmericanOdds(row.fair_price)}</td>
        <td class="${evCellClass(row.expected_value_pct)}">
          ${mlbEvBadge(row.expected_value_pct, row.recommendation)}
        </td>
        <td>${recommendationLabel(row.recommendation)}</td>
        <td><button class="add-mlb-pick-btn">➕ Add</button></td>`;

      tr.innerHTML = rowHtml;
      attachMlbAddHandler(tr, game, row);
      tbody.appendChild(tr);
    });
  });

  wrapper.appendChild(table);
  container.appendChild(wrapper);
}

function renderMlbValuePicks() {
  const container = document.getElementById("gameLinesResults");
  if (!container) return;

  container.innerHTML = "";

  const filteredGames = mlbFilteredGames().filter(game => !game.is_live);
  const table = document.createElement("table");
  table.className = "odds-table";

  table.innerHTML = `
    <thead>
      <tr>
        <th>Game</th>
        <th>Time</th>
        <th>Market</th>
        <th>Pick</th>
        <th>Best Book</th>
        <th>Best Price</th>
        <th>Model %</th>
        <th>Fair Line</th>
        <th>True EV</th>
        <th>Signal</th>
        <th>Add</th>
      </tr>
    </thead>
    <tbody></tbody>`;

  const tbody = table.querySelector("tbody");

  filteredGames.forEach(game => {
    const picks = (game.market_picks || [])
      .filter(pick =>
        ["VALUE", "STRONG_VALUE"].includes(pick.recommendation)
      );

    if (!picks.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${game.event_title}</td>
        <td>${game.game_time_display || "-"}</td>
        <td colspan="7">No Market Baseline picks with at least 2.0% true EV.</td>`;
      tbody.appendChild(tr);
      return;
    }

    picks.forEach((pick, index) => {
      const tr = document.createElement("tr");

      if (index === 0) tr.classList.add("game-start-row");
      if (index === picks.length - 1) tr.classList.add("game-end-row");

      tr.innerHTML = `
        <td>${index === 0 ? game.event_title : ""}</td>
        <td>${index === 0 ? (game.game_time_display || "-") : ""}</td>
        <td>${pick.market_label || pick.market}</td>
        <td><strong>${pick.pick_label}</strong></td>
        <td>${pick.best_book_name || pick.best_book || "-"}</td>
        <td>${formatAmericanOdds(pick.best_price)}</td>
        <td>${pick.model_probability != null
          ? (Number(pick.model_probability) * 100).toFixed(1) + "%"
          : "-"}</td>
        <td>${formatAmericanOdds(pick.fair_price)}</td>
        <td class="${evCellClass(pick.expected_value_pct)}">
          ${mlbEvBadge(pick.expected_value_pct, pick.recommendation)}
        </td>
        <td>${recommendationLabel(pick.recommendation)}</td>
        <td><button class="add-mlb-pick-btn">➕ Add</button></td>`;

      attachMlbAddHandler(tr, game, pick);
      tbody.appendChild(tr);
    });
  });

  const wrapper = document.createElement("div");
  wrapper.className = "table-scroll-wrapper";
  wrapper.appendChild(table);
  container.appendChild(wrapper);
}


function renderMlbLiveOdds() {
  const container = document.getElementById("gameLinesResults");
  if (!container) return;

  container.innerHTML = `
    <div class="live-refresh-note">
      🔴 Live odds refresh automatically every 30 seconds. Prices can move quickly.
    </div>
  `;

  const selectedBooks = [...visibleBooks];
  const liveGames = mlbFilteredGames().filter(game => game.is_live);

  if (!liveGames.length) {
    container.innerHTML += `
      <div style="padding:18px;">
        No MLB games are currently live for the selected date.
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
        const isBest = bookPrice != null &&
          Number(bookPrice) === Number(row.best_price);
        const cellClass = oddsCellClass(bookPrice, row.best_price);

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
          ${row.price_edge_pct != null ? Number(row.price_edge_pct).toFixed(2) + "% price edge" : "-"}
        </td>
        <td><button class="add-mlb-pick-btn">➕ Add</button></td>`;

      tr.innerHTML = rowHtml;
      attachMlbAddHandler(tr, game, row);
      tbody.appendChild(tr);
    });
  });

  wrapper.appendChild(table);
  container.appendChild(wrapper);
}

function attachMlbAddHandler(rowElement, game, pick) {
  rowElement
    .querySelector(".add-mlb-pick-btn")
    ?.addEventListener("click", async (e) => {
      e.stopPropagation();

      const btn = e.currentTarget;

      if (!window.supabase)
        return alert("Supabase not initialized.");

      const sessionResponse = await window.supabase.auth.getSession();
      const session = sessionResponse?.data?.session;

      if (!session?.access_token)
        return alert("Please log in first.");

      const trackerPick = {
        sport: "baseball_mlb",
        event: game.event_title,
        event_id: game.event_id,
        game_date: game.game_date,
        player: pick.selection,
        market: pick.market,
        outcome: pick.selection,
        line: pick.point ?? null,
        odds: pick.best_price,
        sportsbook: pick.best_book_name || pick.best_book
      };

      const res = await fetch(`${window.API_BASE}/api/slips/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          slip_type: "regular",
          platform: "sportsbook",
          sport: "baseball_mlb",
          title: `${pick.pick_label} — ${game.event_title}`,
          picks: [trackerPick]
        })
      });

      if (res.ok) {
        btn.innerText = "✅ Added";
        btn.disabled = true;
      } else {
        const body = await res.text();
        console.error("Failed to add MLB pick:", body);
        alert("Failed to add pick.");
      }
    });
}

// =====================================================
// 📱 Mobile Card Renderer
// =====================================================

function renderGameCards() {

  const container = document.getElementById("gameLinesCardView");
  if (!container) return;

  container.innerHTML = "";

  // =====================================================
  // 🔎 Apply Search Filter (same logic as table view)
  // =====================================================

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

  // =====================================================
  // Render filtered cards
  // =====================================================

  filteredGames.forEach(game => {

    const recommendation =
      game.recommended_team
        ? `Take ${game.recommended_team} ${game.recommended_spread ?? ""}`
        : "No Strong Edge";

    const card = document.createElement("div");
    card.className = "game-card";

    // ========================================
    // 📊 Build Vegas Lines Section
    // ========================================

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

    // ========================================
    // 🧠 Model Debug Click
    // ========================================

    card.addEventListener("click", () => {

      if (!window.modelDebugMode) return;

      window.showModelBreakdown(game);

    });

    // ========================================
    // ➕ Add Button Handler
    // ========================================

    const addBtn = card.querySelector(".card-add-btn");

    addBtn.addEventListener("click", async (e) => {

      e.stopPropagation(); // prevents modal opening

      const team = game.recommended_team;
      if (!team) {
        alert("No recommended side for this game.");
        return;
      }

      const firstBook = [...visibleBooks][0];
      const defaultSpread = game.books?.[team]?.[firstBook];

      const userInput = prompt(
        `Enter spread you bet for ${team}:`,
        defaultSpread ?? ""
      );

      if (userInput === null) return;

      const spread = Number(userInput);
      if (isNaN(spread)) {
        alert("Invalid line value.");
        return;
      }

      const selectedSport =
        document.getElementById("sportSelect")?.value ||
        game?.sport ||
        "basketball_ncaab";

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

      if (!window.supabase) {
        alert("Supabase not initialized.");
        return;
      }

      const sessionResponse =
        await window.supabase.auth.getSession();

      const session = sessionResponse?.data?.session;

      if (!session?.access_token) {
        alert("Please log in first.");
        return;
      }

      const res = await fetch(`${window.API_BASE}/api/slips/manual`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          slip_type: "regular",
          platform: "sportsbook",
          sport: selectedSport,
          title: `${team} vs ${game.event_title}`,
          picks: [pick]
        })
      });

  
      if (res.ok) {
        addBtn.innerText = "✅ Added";
        addBtn.disabled = true;
      } else {
        alert("Failed to add pick.");
      }

    });

    container.appendChild(card);

  });

}
// =====================================================
// Close breakdown modal
// =====================================================
document.addEventListener("click", function(e){

  if (e.target?.id === "closeModelBreakdownBtn") {

    document
      .getElementById("modelBreakdownModal")
      ?.classList.add("hidden");

  }

});

