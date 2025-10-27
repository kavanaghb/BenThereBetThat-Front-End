// ===================================================
// 🎮 Sports Odds Dashboard — Full Fixed Script
// ===================================================

// ----------------------------
// Global Constants
// ----------------------------
const API_BASE = window.API_BASE || "https://bentherebetthat-api.onrender.com";
const SUPABASE_URL = "https://pkvkezbakcvrhygowogx.supabase.co";
const SUPABASE_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdmtlemJha2N2cmh5Z293b2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NjIzMDQsImV4cCI6MjA3NjEzODMwNH0.6C4WQvS8I2slGc7vfftqU7vOkIsryfY7-xwHa7uZj_g";
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ----------------------------
// Element References
// ----------------------------
const signinForm = document.getElementById("signin-form");
const signupForm = document.getElementById("signup-form");
const mainContent = document.getElementById("main-content");
const authContainer = document.getElementById("auth-container");
const signoutBtn = document.getElementById("signout-btn");
const signinBtn = document.getElementById("signin-btn");
const signupBtn = document.getElementById("signup-btn");

const subscriptionStatus = document.getElementById("subscription-status");
const cancelSubscriptionBtn = document.getElementById("cancel-subscription-btn");
const resumeSubscriptionBtn = document.getElementById("resume-subscription-btn");
const subscribeBtn = document.getElementById("subscribeBtn");
const accessUntil = document.getElementById("access-until");

const resultsDiv = document.getElementById("results");
const progressText = document.getElementById("progressText");
const dateInput = document.getElementById("dateInput");
const loadDataBtn = document.getElementById("loadData");
const stopBtn = document.getElementById("stopBtn");
const refreshBtn = document.getElementById("refreshBtn");
const loadingDiv = document.getElementById("loading");
// Market Containers
const hockeyMarkets = document.getElementById("icehockey_nhlMarkets");
const ncaabMarkets = document.getElementById("ncaabMarkets");
const footballMarkets = document.getElementById("footballMarkets");
const nbaMarkets = document.getElementById("nbaMarkets");
const mlbMarkets = document.getElementById("mlbMarkets");

const sportButtons = document.querySelectorAll(".sport-buttons button");

// 🎮 Game UI Elements
const gameFilterContainer = document.getElementById("gameFilterContainer");
const gameButtonContainer = document.getElementById("gameButtonContainer");
const gameSpinnerOverlay = document.getElementById("gameLoadingSpinner");
const selectAllGamesBtn = document.getElementById("selectAllGames");
const deselectAllGamesBtn = document.getElementById("deselectAllGames");
const gameSearchInput = document.getElementById("gameSearch");

// ----------------------------
// Global State
// ----------------------------
let selectedSport = null;
let selectedMarkets = [];
let selectedGames = [];
let currentController = null;
const eventCache = {}; // Cache for fetched games

// ===================================================
// 🔧 Utility: Safe Event Binding
// ===================================================
function safeAddEventListener(el, evt, fn) {
  if (el) el.addEventListener(evt, fn);
}

// ===================================================
// 🎯 Persistent Bookmaker Filter Logic (Improved Safe Version)
// ===================================================
const bookmakerFilters = document.getElementById("bookmaker-filters");
let selectedBooks = new Set(
  JSON.parse(localStorage.getItem("selectedBooks") || "[]")
);

if (bookmakerFilters) {
  bookmakerFilters.querySelectorAll("input[type='checkbox']").forEach(cb => {
    // Initialize checkbox state
    cb.checked = selectedBooks.size === 0 || selectedBooks.has(cb.value);

    cb.addEventListener("change", () => {
      // Update selected books set
      if (cb.checked) {
        selectedBooks.add(cb.value);
      } else {
        selectedBooks.delete(cb.value);
      }

      // Persist to localStorage
      localStorage.setItem("selectedBooks", JSON.stringify([...selectedBooks]));

      // ✅ Safe re-render only if data exists
      if (window.lastRenderedData && Array.isArray(window.lastRenderedData) && window.lastRenderedData.length > 0) {
        console.log("🔁 Updating table with current bookmaker filters:", [...selectedBooks]);
        rerenderConsensusTable(window.lastRenderedData);
      } else {
        console.warn("⚠️ No cached data available for re-render — table remains unchanged.");
      }
    });
  });
}

// ===================================================
// 🧮 Global American Odds → Implied Probability Helper
// ===================================================
function americanToProb(price) {
  const v = parseFloat(price);
  if (isNaN(v)) return null;
  return v > 0 ? 100 / (v + 100) : (-v) / ((-v) + 100);
}

// ===================================================
// 🏦 Global Helper — Get Consensus Price for a Row
// ===================================================
function getConsensusPrice(row) {
  const bookPriceKeys = {
    Fanduel: "FanduelPrice",
    DraftKings: "DraftKingsPrice",
    BetMGM: "BetMGMPrice",
    Fanatics: "FanaticsPrice",
  };

  // Restore selected books from localStorage (user preference)
  const savedBooks = JSON.parse(localStorage.getItem("selectedBooks") || "[]");
  const selectedBooks = new Set(
    savedBooks.length ? savedBooks : Object.keys(bookPriceKeys)
  );

  const activeBooks = [...selectedBooks];
  const values = activeBooks
    .map((b) => parseFloat(row[bookPriceKeys[b]]))
    .filter((v) => !isNaN(v));

  if (!values.length) return null;
  const avgPrice = values.reduce((a, b) => a + b, 0) / values.length;
  return avgPrice;
}

// ===================================================
// 🧹 Final Smart Dedupe — ignore small consensus noise
// ===================================================
function dedupeMarkets(data) {
  const grouped = {};

  for (const row of data) {
    const rounded = row.ConsensusPoint
      ? Math.round(parseFloat(row.ConsensusPoint) * 2) / 2
      : null;

    const key = `${row.Event}|${row.Market}|${row.Description}|${(row.Outcome || "").toLowerCase()}`;

    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(row);
  }

  const results = [];

  for (const [key, rows] of Object.entries(grouped)) {
    if (rows.length === 1) {
      results.push(rows[0]);
      continue;
    }

    // Sort by strongest edge (NoVigProb), fallback to lowest ConsensusPoint difference
    rows.sort((a, b) => {
      const pA = parseFloat(a.NoVigProb ?? 0);
      const pB = parseFloat(b.NoVigProb ?? 0);
      if (Math.abs(pB - pA) > 0.01) return pB - pA;

      const cA = parseFloat(a.ConsensusPoint ?? 0);
      const cB = parseFloat(b.ConsensusPoint ?? 0);
      return Math.abs(cA - rounded) - Math.abs(cB - rounded);
    });

    // Keep best single row
    results.push(rows[0]);
  }

  return results;
}



// ===================================================
// 🏟️ Refresh Button beside Date Picker
// ===================================================
const refreshGamesBtn = document.createElement("button");
refreshGamesBtn.id = "refreshGamesBtn";
refreshGamesBtn.textContent = "🔄 Refresh Games";
refreshGamesBtn.classList.add("action-btn", "refresh-games-btn");
refreshGamesBtn.style.display = "none";

if (dateInput && dateInput.parentNode) {
  dateInput.parentNode.insertBefore(refreshGamesBtn, dateInput.nextSibling);
}

// ===================================================
// ⛔ Load Data Disabled Until Games Are Ready
// ===================================================
if (loadDataBtn) {
  loadDataBtn.disabled = true;
  loadDataBtn.title = "Load Data unavailable until games are loaded";
}

// ===================================================
// 🎡 Spinner Overlay Control
// ===================================================
function showGameSpinner(show) {
  if (!gameSpinnerOverlay || !gameFilterContainer) return;
  gameSpinnerOverlay.style.display = show ? "flex" : "none";
  gameFilterContainer.style.pointerEvents = show ? "none" : "auto";
  gameFilterContainer.style.opacity = show ? "0.4" : "1";
}

// ===================================================
// 🎮 Load Games (with Cache + Spinner)
// ===================================================
async function loadGames(forceRefresh = false) {
  if (!selectedSport || !dateInput.value) return;

  const cacheKey = `${selectedSport}_${dateInput.value}`;
  disableLoadData();
  showGameSpinner(true);

  // ✅ Use cache if available
  if (!forceRefresh && eventCache[cacheKey]) {
    console.log(`✅ Using cached games for ${cacheKey}`);
    populateGameButtons(eventCache[cacheKey]);
    showGameSpinner(false);
    enableLoadData();
    return;
  }

  try {
    console.log("🌐 Fetching games for", cacheKey);
    progressText.textContent = "Loading games...";
    refreshGamesBtn.classList.add("loading");

    const res = await fetch(
      `${API_BASE}/api/events?sport=${selectedSport}&date=${dateInput.value}`
    );
    if (!res.ok) throw new Error("Failed to fetch events");
    const events = await res.json();

    if (!Array.isArray(events) || events.length === 0) {
      progressText.textContent = "⚠️ No games found for this date.";
      disableLoadData();
      showGameSpinner(false);
      refreshGamesBtn.classList.remove("loading");
      return;
    }

    eventCache[cacheKey] = events;
    populateGameButtons(events);
    enableLoadData();
    refreshGamesBtn.style.display = "inline-block";
    progressText.textContent = "";
  } catch (err) {
    console.error("❌ Error loading games:", err);
    progressText.textContent = "❌ Failed to load games.";
  } finally {
    showGameSpinner(false);
    refreshGamesBtn.classList.remove("loading");
  }
}

// ===================================================
// 🎮 Populate Game Buttons (Modern Multi-Select)
// ===================================================
function populateGameButtons(events) {
  if (!gameButtonContainer) return;
  gameButtonContainer.innerHTML = "";

  if (!Array.isArray(events) || events.length === 0) {
    gameFilterContainer.style.display = "none";
    disableLoadData();
    return;
  }

  // ✅ Re-show the container in grid mode
  gameButtonContainer.style.display = "grid";

  events.forEach((e) => {
    const btn = document.createElement("button");
    btn.classList.add("game-btn");
    btn.dataset.id = e.id;

    // Format kickoff time
    let kickoffText = "TBD";
    try {
      const dateObj = new Date(e.commence_time);
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const tzParts = new Intl.DateTimeFormat("en-US", {
        timeZone: userTimeZone,
        timeZoneName: "short",
      }).formatToParts(dateObj);
      const tzLabel = tzParts.find((p) => p.type === "timeZoneName")?.value || "";
      kickoffText =
        dateObj.toLocaleString([], {
          hour: "numeric",
          minute: "2-digit",
          weekday: "short",
          timeZone: userTimeZone,
        }) + ` ${tzLabel}`;
    } catch {}

    btn.innerHTML = `
      <div class="game-title">${e.name}</div>
      <div class="game-time">🕒 ${kickoffText}</div>
    `;

    btn.addEventListener("click", () => {
      btn.classList.toggle("active");
      updateSelectedGames();
    });

    gameButtonContainer.appendChild(btn);
  });

  gameFilterContainer.style.display = "block";
  enableLoadData();
}


// ===================================================
// 🎯 Game Selection Logic
// ===================================================
function updateSelectedGames() {
  const active = document.querySelectorAll(".game-btn.active");
  selectedGames = Array.from(active).map((b) => b.textContent);
}

// ===================================================
// ✅ Select / Deselect / Search Controls
// ===================================================
safeAddEventListener(selectAllGamesBtn, "click", () => {
  document.querySelectorAll(".game-btn").forEach((b) => b.classList.add("active"));
  updateSelectedGames();
});

safeAddEventListener(deselectAllGamesBtn, "click", () => {
  document.querySelectorAll(".game-btn").forEach((b) => b.classList.remove("active"));
  updateSelectedGames();
});

safeAddEventListener(gameSearchInput, "input", () => {
  const term = gameSearchInput.value.toLowerCase();
  document.querySelectorAll(".game-btn").forEach((b) => {
    b.style.display = b.textContent.toLowerCase().includes(term) ? "" : "none";
  });
});

// ===================================================
// 🧩 Enable/Disable Load Data Button
// ===================================================
function enableLoadData() {
  if (loadDataBtn) {
    loadDataBtn.disabled = false;
    loadDataBtn.classList.remove("disabled");
    loadDataBtn.title = "";
  }
}
function disableLoadData() {
  if (loadDataBtn) {
    loadDataBtn.disabled = true;
    loadDataBtn.classList.add("disabled");
    loadDataBtn.title = "Please load games first";
  }
}

// ===================================================
// 🔁 Refresh Button
// ===================================================
safeAddEventListener(refreshGamesBtn, "click", () => {
  console.log("🔁 Refreshing games...");
  disableLoadData();
  fadeOutGames(() => loadGames(true));
});


// ===================================================
// 🏈 Sport Selection + Market Groups + Auto Game Load (Dynamic Version)
// ===================================================

// 🧠 Define all sport markets in one place
const SPORT_MARKETS = {
  "basketball_nba": {
    "player_points": "Player Points",
    "player_assists": "Player Assists",
    "player_rebounds": "Rebounds",
    "player_threes": "3-Pointers",
    "player_points_rebounds_assists": "Points + Rebounds + Assists",
    "player_points_rebounds": "Points + Rebounds",
    "player_points_assists": "Points + Assists",
    "player_rebounds_assists": "Rebounds + Assists",
  },
  "basketball_ncaab": {
    "player_points": "Player Points",
    "player_assists": "Player Assists",
    "player_rebounds": "Rebounds",
    "player_threes": "3-Pointers",
    "player_points_rebounds_assists": "Points + Rebounds + Assists",
    "player_points_rebounds": "Points + Rebounds",
    "player_points_assists": "Points + Assists",
    "player_rebounds_assists": "Rebounds + Assists",
  },
  "americanfootball_nfl": {
    "player_pass_tds": "Passing TDs",
    "player_pass_rush_yds": "Pass + Rush Yards",
    "player_pass_yds": "Pass Yards",
    "player_receptions": "Receptions",
    "player_reception_tds": "Reception TDs",
    "player_reception_yds": "Reception Yards",
    "player_rush_attempts": "Rush Attempts",
    "player_rush_reception_yds": "Rush + Reception Yards",
    "player_rush_tds": "Rush TDs",
    "player_rush_yds": "Rush Yards",
  },
  "americanfootball_ncaaf": {
    "player_pass_tds": "Passing TDs",
    "player_pass_rush_yds": "Pass + Rush Yards",
    "player_pass_yds": "Pass Yards",
    "player_receptions": "Receptions",
    "player_reception_tds": "Reception TDs",
    "player_reception_yds": "Reception Yards",
    "player_rush_attempts": "Rush Attempts",
    "player_rush_reception_yds": "Rush + Reception Yards",
    "player_rush_tds": "Rush TDs",
    "player_rush_yds": "Rush Yards",
  },
  "baseball_mlb": {
    "player_home_runs": "Player Home Runs",
    "player_total_bases": "Player Total Bases",
    "batter_total_bases": "Batter Total Bases",
    "batter_home_runs": "Batter Home Runs",
    "pitcher_strikeouts": "Pitcher Strikeouts",
    "pitcher_walks": "Pitcher Walks",
    "pitcher_earned_runs": "Pitcher Earned Runs",
    "pitcher_outs": "Pitcher Outs",
  },
  "icehockey_nhl": {
    "player_shots_on_goal": "Shots on Goal",
    "player_total_saves": "Total Saves",
    "player_assists": "Assists",
  },
};

// 🧹 Reset & update helpers
function resetAllMarkets() {
  document.querySelectorAll(".market-list button[data-market]").forEach((b) =>
    b.classList.remove("active")
  );
  selectedMarkets = [];
}
// ===================================================
// ✅ Market Select/Deselect Setup Function (NEW)
// ===================================================
function setupMarketSelectButtons() {
  const marketSections = [
    { container: footballMarkets, selectAll: "selectAllFootball", deselectAll: "deselectAllFootball" },
    { container: nbaMarkets, selectAll: "selectAllNBA", deselectAll: "deselectAllNBA" },
    { container: mlbMarkets, selectAll: "selectAllMLB", deselectAll: "deselectAllMLB" },
    { container: hockeyMarkets, selectAll: "selectAllNHL", deselectAll: "deselectAllNHL" },
    { container: ncaabMarkets, selectAll: "selectAllNCAAB", deselectAll: "deselectAllNCAAB" },
  ];

  marketSections.forEach(({ container, selectAll, deselectAll }) => {
    const selectBtn = document.getElementById(selectAll);
    const deselectBtn = document.getElementById(deselectAll);

    if (!container) return;

    if (selectBtn) {
      selectBtn.onclick = () => {
        container.querySelectorAll("button[data-market]").forEach((b) => b.classList.add("active"));
        updateSelectedMarkets();
      };
    }

    if (deselectBtn) {
      deselectBtn.onclick = () => {
        container.querySelectorAll("button[data-market]").forEach((b) => b.classList.remove("active"));
        updateSelectedMarkets();
      };
    }
  });
}

function updateSelectedMarkets() {
  const activeBtns = Array.from(
    document.querySelectorAll(".market-list button.active[data-market]")
  );
  selectedMarkets = activeBtns.map((b) => b.getAttribute("data-market"));
}

// 🧠 Main sport button logic (auto-renders markets + select/deselect support)
sportButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    // --- UI reset ---
    sportButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedSport = btn.getAttribute("data-sport");

    resultsDiv.innerHTML = "";
    progressText.textContent = "";
    resetAllMarkets();

    if (gameButtonContainer) {
      gameButtonContainer.style.display = "none";
      gameButtonContainer.innerHTML = "";
    }
    if (gameFilterContainer) gameFilterContainer.style.display = "none";

    // --- Render market buttons dynamically ---
    Object.keys(SPORT_MARKETS).forEach((sport) => {
      const groupEl = document.getElementById(`${sport}Markets`);
      if (!groupEl) return;
      const listEl = groupEl.querySelector(".market-list");
      listEl.innerHTML = "";

      if (selectedSport === sport) {
        groupEl.style.display = "block";
        const markets = SPORT_MARKETS[sport];
        Object.entries(markets).forEach(([key, label]) => {
          const btnEl = document.createElement("button");
          btnEl.textContent = label;
          btnEl.setAttribute("data-market", key);
          btnEl.addEventListener("click", () => {
            btnEl.classList.toggle("active");
            updateSelectedMarkets();
          });
          listEl.appendChild(btnEl);
        });

        // ✅ Rebind Select/Deselect All buttons for this sport
        const selectAllBtn = groupEl.querySelector(".select-all-btn");
        const deselectAllBtn = groupEl.querySelector(".deselect-all-btn");
        if (selectAllBtn && deselectAllBtn) {
          selectAllBtn.onclick = () => {
            setActiveFor(marketButtonsIn(groupEl), true);
            updateSelectedMarkets();
          };
          deselectAllBtn.onclick = () => {
            setActiveFor(marketButtonsIn(groupEl), false);
            updateSelectedMarkets();
          };
        }
      } else {
        groupEl.style.display = "none";
      }
    });

    // 🚀 Load games automatically if date chosen
    if (dateInput.value) {
      disableLoadData();
      loadGames();
    }
  });
});



// ✅ Reload when date changes
safeAddEventListener(dateInput, "change", () => {
  if (selectedSport && dateInput.value) loadGames();
});


// ===================================================
// 🎯 Market Button Interactions
// ===================================================
document.querySelectorAll(".market-list button[data-market]").forEach((btn) => {
  btn.addEventListener("click", () => {
    btn.classList.toggle("active");
    updateSelectedMarkets();
  });
});

// Select/Deselect All per sport
const selectAllFootball = document.getElementById("selectAllFootball");
const deselectAllFootball = document.getElementById("deselectAllFootball");
const selectAllNBA = document.getElementById("selectAllNBA");
const deselectAllNBA = document.getElementById("deselectAllNBA");
const selectAllMLB = document.getElementById("selectAllMLB");
const deselectAllMLB = document.getElementById("deselectAllMLB");

safeAddEventListener(selectAllFootball, "click", () => {
  setActiveFor(marketButtonsIn(footballMarkets), true);
  updateSelectedMarkets();
});
safeAddEventListener(deselectAllFootball, "click", () => {
  setActiveFor(marketButtonsIn(footballMarkets), false);
  updateSelectedMarkets();
});
safeAddEventListener(selectAllNBA, "click", () => {
  setActiveFor(marketButtonsIn(nbaMarkets), true);
  updateSelectedMarkets();
});
safeAddEventListener(deselectAllNBA, "click", () => {
  setActiveFor(marketButtonsIn(nbaMarkets), false);
  updateSelectedMarkets();
});
safeAddEventListener(selectAllMLB, "click", () => {
  setActiveFor(marketButtonsIn(mlbMarkets), true);
  updateSelectedMarkets();
});
safeAddEventListener(deselectAllMLB, "click", () => {
  setActiveFor(marketButtonsIn(mlbMarkets), false);
  updateSelectedMarkets();
});

function marketButtonsIn(container) {
  return container
    ? Array.from(container.querySelectorAll("button[data-market]"))
    : [];
}
function setActiveFor(buttons, active = true) {
  buttons.forEach((b) =>
    active ? b.classList.add("active") : b.classList.remove("active")
  );
}

// ===================================================
// 📊 Load Data Handler (Fixed + Diagnostic Logging)
// ===================================================
async function loadData() {
  if (!selectedSport || selectedMarkets.length === 0) {
    alert("Select a sport & markets first.");
    return;
  }
  if (!dateInput.value) {
    alert("Select a date first.");
    return;
  }

  // 🏟️ Collect selected games (by ID)
  const activeGameBtns = document.querySelectorAll(".game-btn.active");
  const selectedGameIds = Array.from(activeGameBtns).map((b) => b.dataset.id);

  // Clear UI
  resultsDiv.innerHTML = "";
  progressText.textContent = "Fetching data...";
  loadingDiv.style.display = "block";

  // Abort previous request if needed
  if (currentController) currentController.abort();
  currentController = new AbortController();
  const signal = currentController.signal;

  try {
    const params = new URLSearchParams();
    params.append("sport", selectedSport);
    params.append("date", dateInput.value);
    selectedMarkets.forEach((m) => params.append("markets", m));

    // ✅ Include only selected events (if any)
    if (selectedGameIds.length > 0) {
      selectedGameIds.forEach((id) => params.append("event_ids", id));
    }

// ===================================================
// 🔍 Fetch + Inspect Response (Safe + Deduped)
// ===================================================
const res = await fetch(`${API_BASE}/api/data?${params.toString()}`, { signal });
const text = await res.text();
console.log("📦 Raw API Response:", text);

if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

let allData;
try {
  allData = JSON.parse(text);
} catch (parseErr) {
  console.error("❌ JSON Parse Error:", parseErr);
  progressText.textContent = "❌ Failed to parse API response.";
  loadingDiv.style.display = "none";
  return;
}

// ✅ Validate response type
if (!allData || !Array.isArray(allData)) {
  console.error("🚨 Invalid data from API:", allData);
  alert("No data returned from server — check your filters or backend logs.");
  loadingDiv.style.display = "none";
  return;
}

// ✅ Deduplicate before rendering
const cleanedData = dedupeMarkets(allData);
console.log(`🧹 Deduped from ${allData.length} → ${cleanedData.length} rows`);
console.log("📦 Sample row:", cleanedData[0]);

progressText.textContent = "Rendering table...";

// Wait for the table to render
await renderTableInBatches(cleanedData);

// ✅ Clear progress text after rendering completes
progressText.textContent = "";




    // ===================================================
    // 🧹 Validate & Render
    // ===================================================

  } catch (err) {
    if (err.name === "AbortError") {
      progressText.textContent = "⚠️ Loading stopped.";
    } else {
      console.error("❌ loadData error:", err);
      alert("Frontend error: " + err.message);
      progressText.textContent = "❌ Error fetching data (see console).";
    }
  } finally {
    loadingDiv.style.display = "none";
  }
}

// ===================================================
// 🎯 Event Listeners
// ===================================================
safeAddEventListener(loadDataBtn, "click", loadData);
safeAddEventListener(refreshBtn, "click", loadData);
safeAddEventListener(stopBtn, "click", () => currentController?.abort());

// ===================================================
// 🎯 Consensus Display Helper (with 55%+ highlight)
// ===================================================
function getConsensusDisplay(row) {
  const point = row.ConsensusPoint ?? null;
  const price = row.ConsensusPrice ?? null;

  // Gracefully handle missing data
  if (point == null && price == null) return "";

  // 🧮 Format helper: 2 decimals max, trim .00 and trailing zero
  const formatNum = n =>
    parseFloat(n)
      .toFixed(2)
      .replace(/\.00$/, "")
      .replace(/(\.\d)0$/, "$1");

  // 🎯 Convert American odds → implied win probability (no-vig estimate)
  const impliedProb =
    price != null
      ? price > 0
        ? 100 / (price + 100)
        : -price / (-price + 100)
      : null;

  // 📊 Build display string
  let display = "";
  if (point != null && price != null) {
    const probText =
      impliedProb != null
        ? ` • <span class="probability ${impliedProb * 100 >= 55 ? "highlight-green" : ""}">
            ${formatNum(impliedProb * 100)}%</span>`
        : "";
    display = `${formatNum(point)} (${price > 0 ? `+${formatNum(price)}` : formatNum(price)})${probText}`;
  } else if (point != null) {
    display = `${formatNum(point)}`;
  }

  return display;
}




// ===================================================
// 🧮 Table Renderer + Local Consensus Summary + No Fetch (Final Cleaned + Safe Dedup Version)
// ===================================================

// 🔁 Safe helper to re-render without recursion
function rerenderConsensusTable(data) {
  resultsDiv.innerHTML = "<p>Updating consensus...</p>";
  setTimeout(() => renderTableInBatches(data), 50);
}

async function renderTableInBatches(data, batchSize = 50) {
  // 🧹 Clear previous results and cache dataset
  resultsDiv.innerHTML = "";
  window.lastRenderedData = data; // 💾 cache last dataset globally

  // 🧩 Restore selected books from localStorage
  const savedBooks = JSON.parse(localStorage.getItem("selectedBooks") || "[]");
  const selectedBooks = new Set(
    savedBooks.length
      ? savedBooks
      : ["Fanduel", "DraftKings", "BetMGM", "Fanatics"]
  );

  const summaryDiv = document.getElementById("consensus-summary");

  // ===================================================
  // 🧮 American Odds → Implied Probability Helper
  // ===================================================
  const americanToProb = (price) => {
    const v = parseFloat(price);
    if (isNaN(v)) return null;
    return v > 0 ? 100 / (v + 100) : (-v) / ((-v) + 100);
  };

  // ===================================================
  // 🏦 Average Consensus Price per Row
  // ===================================================
  const getConsensusPrice = (row) => {
    const bookPriceKeys = {
      Fanduel: "FanduelPrice",
      DraftKings: "DraftKingsPrice",
      BetMGM: "BetMGMPrice",
      Fanatics: "FanaticsPrice",
    };

    const activeBooks =
      selectedBooks.size > 0 ? [...selectedBooks] : Object.keys(bookPriceKeys);

    const values = activeBooks
      .map((b) => parseFloat(row[bookPriceKeys[b]]))
      .filter((v) => !isNaN(v));

    if (!values.length) return null;
    return values.reduce((a, b) => a + b, 0) / values.length;
  };

  // ===================================================
// ===================================================
// 🧩 Group & Deduplicate Rows (Final Cleaned Version)
// ===================================================
const groupedBySide = {};

data.forEach((row) => {
  const key = `${(row.Event || "").toLowerCase().trim()}|${(row.Market || "").toLowerCase().trim()}|${(row.Description || "").toLowerCase().trim()}|${(row.Outcome || "").toLowerCase().trim()}`;

  const outcomeText = (row.Outcome || row.OverUnder || "").toLowerCase();
  const oppSide = outcomeText.includes("over")
    ? "under"
    : outcomeText.includes("under")
    ? "over"
    : null;

  const opp = oppSide
    ? data.find(
        (r) =>
          (r.Event || "").toLowerCase().trim() === (row.Event || "").toLowerCase().trim() &&
          (r.Market || "").toLowerCase().trim() === (row.Market || "").toLowerCase().trim() &&
          (r.Description || "").toLowerCase().trim() === (row.Description || "").toLowerCase().trim() &&
          (r.Outcome || "").toLowerCase().includes(oppSide)
      )
    : null;

  const thisP = getConsensusPrice(row);
  const oppP = opp ? getConsensusPrice(opp) : null;

  // ===================================================
  // 🧮 Compute fair "no-vig" probability for this outcome
  // ===================================================
  let prob = 50; // default fallback if no prices available

  if (thisP != null && oppP != null) {
    const pRaw = americanToProb(thisP);
    const qRaw = americanToProb(oppP);
    if (pRaw != null && qRaw != null) {
      const total = pRaw + qRaw;
      if (total > 0) {
        const noVigOver = (pRaw / total) * 100;
        const noVigUnder = (qRaw / total) * 100;
        prob = outcomeText.includes("over") ? noVigOver : noVigUnder;
      }
    }
  } else if (thisP != null) {
    // fallback when only one side exists — use its implied probability
    const pRaw = americanToProb(thisP);
    prob = pRaw ? pRaw * 100 : 50;
  }

  if (!groupedBySide[key]) groupedBySide[key] = [];
  groupedBySide[key].push({ row, prob });
});

// Collapse duplicates by strongest probability
const collapsed = Object.values(groupedBySide).map((rows) =>
  rows.length === 1
    ? rows[0]
    : rows.reduce((best, curr) =>
        (curr.prob ?? 0) > (best.prob ?? 0) ? curr : best
      )
);

// ===================================================
// 🧩 Regroup by Event/Market/Player for O/U comparison
// ===================================================
const groupedFinal = {};
collapsed.forEach(({ row, prob }) => {
  const baseKey = `${(row.Event || "").toLowerCase().trim()}|${(row.Market || "").toLowerCase().trim()}|${(row.Description || "").toLowerCase().trim()}`;
  const sideText = (row.Outcome || row.OverUnder || "").toLowerCase();
  const side =
    sideText.includes("under") ? "Under" :
    sideText.includes("over") ? "Over" :
    "Even";

  if (!groupedFinal[baseKey])
    groupedFinal[baseKey] = { Over: null, Under: null, Even: null };

  groupedFinal[baseKey][side] = { row, prob };
});

// 🧾 Debugging output
console.log("✅ GroupedFinal keys:", Object.keys(groupedFinal));
console.log(
  `🧹 Deduped frontend: ${data.length} → ${
    Object.values(groupedFinal)
      .flatMap((g) => [g.Over, g.Under, g.Even].filter(Boolean))
      .length
  } grouped entries`
);

// ===================================================
// ✅ Keep both sides for consensus calculation
// ===================================================
// ✅ Keep only the stronger side (prevents duplicates)
const deduped = [];
Object.entries(groupedFinal).forEach(([key, sides]) => {
  const { Over, Under, Even } = sides;

  if (Over && Under) {
    // keep whichever side has the stronger no-vig edge (further from 50%)
    const overEdge = Math.abs((Over.prob ?? 50) - 50);
    const underEdge = Math.abs((Under.prob ?? 50) - 50);
    deduped.push(overEdge >= underEdge ? Over.row : Under.row);
  } else if (Over) deduped.push(Over.row);
  else if (Under) deduped.push(Under.row);
  else if (Even) deduped.push(Even.row);
});


console.log("✅ GroupedFinal keys (post-dedupe):", Object.keys(groupedFinal));
console.log(`🧹 Deduped frontend: ${data.length} → ${deduped.length} rows`);

// Fallback if dedup produced no rows
const finalData = deduped.length > 0 ? deduped : data;

// ✅ Make groupedFinal globally available for Fact Check
window.groupedFinal = groupedFinal;

// ✅ Render table (call your rendering function)
await renderOddsTable(finalData, batchSize, groupedFinal);

}

// ===================================================
// 🧱 Odds Table Renderer (with integrated Fact Check + highlight flash)
// ===================================================
async function renderOddsTable(data, batchSize = 50, groupedFinal = {}) {

  if (!Array.isArray(data) || data.length === 0) {
    resultsDiv.innerHTML = "<p>No data available to render.</p>";
    return;
  }
// ---- helpers (place near top of renderOddsTable) ----
const bookPointKeys = {
  Fanduel: "FanduelPoint",
  DraftKings: "DraftKingsPoint",
  BetMGM: "BetMGMPoint",
  Fanatics: "FanaticsPoint",
};
const bookPriceKeys = {
  Fanduel: "FanduelPrice",
  DraftKings: "DraftKingsPrice",
  BetMGM: "BetMGMPrice",
  Fanatics: "FanaticsPrice",
};

const savedBooks = JSON.parse(localStorage.getItem("selectedBooks") || "[]");
const selectedBooksSet = new Set(
  savedBooks.length ? savedBooks : Object.keys(bookPointKeys)
);

const activeBooks = selectedBooksSet.size
  ? [...selectedBooksSet]
  : Object.keys(bookPointKeys);

const americanToProb = (price) => {
  const v = Number(price);
  if (!Number.isFinite(v)) return null;
  return v > 0 ? 100 / (v + 100) : (-v) / ((-v) + 100);
};

const avg = (arr) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

const getConsensusPoint = (row) => {
  const vals = activeBooks
    .map((b) => Number(row[bookPointKeys[b]]))
    .filter((v) => Number.isFinite(v));
  const a = avg(vals);
  return a == null ? null : Number(a.toFixed(2)); // 2dp
};

const getConsensusPrice = (row) => {
  const vals = activeBooks
    .map((b) => Number(row[bookPriceKeys[b]]))
    .filter((v) => Number.isFinite(v));
  const a = avg(vals);
  return a == null ? null : Math.round(a);
};

const getNoVigProbForRow = (row) => {
  // Normalize keys to avoid whitespace / case mismatches
  const baseKey = `${(row.Event || "").toLowerCase().trim()}|${(row.Market || "").toLowerCase().trim()}|${(row.Description || "").toLowerCase().trim()}`;

  // Look up the grouped entry
  const sideSet = groupedFinal?.[baseKey];
  if (!sideSet) {
    console.warn("❌ No match in groupedFinal for:", baseKey);
    return null;
  }

  // Determine which side (Over / Under / Even)
  const side = (row.Outcome || "").toLowerCase().includes("under")
    ? "Under"
    : (row.Outcome || "").toLowerCase().includes("over")
    ? "Over"
    : "Even";

  const prob = sideSet[side]?.prob ?? null;

  // Optional debug log to confirm values
  if (prob != null) {
    console.log(`✅ No-Vig probability for ${row.Description} (${side}): ${prob.toFixed(2)}%`);
  }

  return prob;
};


  const columns = [
    "Event", "Market", "Description", "OverUnder",
    "FanduelPoint", "DraftKingsPoint", "BetMGMPoint", "FanaticsPoint",
    "ConsensusPoint", "PrizePickPoint", "UnderdogPoint",
    "PrizePicksDifference", "UnderdogDifference"
  ];

  const alwaysShow = ["PrizePicksDifference", "UnderdogDifference"];
  const activeColumns = columns.filter(
    col => alwaysShow.includes(col) || data.some(r => r[col] != null && r[col] !== "")
  );

  // Create table
  const table = document.createElement("table");
  table.classList.add("odds-table");

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  activeColumns.forEach(c => {
    const th = document.createElement("th");
    th.textContent = c
      .replace("Point", "")
      .replace("Difference", " Δ")
      .replace("PrizePick", "PrizePicks")
      .replace("Fanduel", "FanDuel");
      if (c === "ConsensusPoint") th.textContent = "Consensus W/No-Vig Win %";

    th.style.cursor = "pointer";
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
// ===================================================
// 🔼 Sortable Table Columns (Ascending / Descending)
// ===================================================
let sortState = { col: null, asc: true };

thead.querySelectorAll("th").forEach((th, i) => {
  th.addEventListener("click", () => {
    const col = i;
    const asc = sortState.col === col ? !sortState.asc : true;
    sortState = { col, asc };

    const rows = Array.from(tbody.querySelectorAll("tr"));
    rows.sort((a, b) => {
      const aText = a.children[col].textContent.trim();
      const bText = b.children[col].textContent.trim();
      const aNum = parseFloat(aText.replace(/[^\d.-]/g, ""));
      const bNum = parseFloat(bText.replace(/[^\d.-]/g, ""));
      const isNum = !isNaN(aNum) && !isNaN(bNum);
      if (isNum) return asc ? aNum - bNum : bNum - aNum;
      return asc
        ? aText.localeCompare(bText)
        : bText.localeCompare(aText);
    });

    tbody.innerHTML = "";
    rows.forEach((r) => tbody.appendChild(r));

    // Visual indicator (optional)
    thead.querySelectorAll("th").forEach((h) => (h.style.textDecoration = ""));
    th.style.textDecoration = asc ? "underline" : "overline";
  });
});

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);
  resultsDiv.appendChild(table);

 // ===================================================
// 🧱 Render rows in batches for smoother performance
// ===================================================
for (let i = 0; i < data.length; i += batchSize) {
  const batch = data.slice(i, i + batchSize);

  batch.forEach((row) => {
    const tr = document.createElement("tr");

    // --- Compute consensus values for this row ---
    row.ConsensusPoint = getConsensusPoint(row);
    row.ConsensusPrice = getConsensusPrice(row);
    const consensusPoint = row.ConsensusPoint;
    const consensusPrice = row.ConsensusPrice;

    // --- Render each cell ---
    activeColumns.forEach((col) => {
      const td = document.createElement("td");
      let value = row[col];

      // 🧮 Force 2 decimals for key numeric columns
      if (col === "PrizePickPoint" || col === "UnderdogPoint") {
        const num = Number(value);
        value = Number.isFinite(num) ? num.toFixed(2) : "—";
      }

      // 🎲 Combine sportsbook line + price
      if (["FanduelPoint", "DraftKingsPoint", "BetMGMPoint", "FanaticsPoint"].includes(col)) {
        const priceCol = col.replace("Point", "Price");
        const lineNum = Number(row[col]);
        const priceNum = Number(row[priceCol]);
        if (Number.isFinite(lineNum) && Number.isFinite(priceNum)) {
          td.textContent = `${lineNum.toFixed(2)} (${priceNum > 0 ? `+${priceNum}` : priceNum})`;
        } else if (Number.isFinite(lineNum)) {
          td.textContent = lineNum.toFixed(2);
        } else {
          td.textContent = "—";
        }
        tr.appendChild(td);
        return;
      }

      // 🧠 Consensus column: "12.34 (-110) • 53.21%"
      if (col === "ConsensusPoint") {
        const noVig = getNoVigProbForRow(row);
        const parts = [];

        if (Number.isFinite(consensusPoint)) {
          parts.push(consensusPoint.toFixed(2));
        }
        if (Number.isFinite(consensusPrice)) {
          parts.push(`(${consensusPrice > 0 ? `+${consensusPrice}` : consensusPrice})`);
        }

        if (noVig != null && Number.isFinite(noVig)) {
          const span = document.createElement("span");
          span.classList.add("no-vig");
          span.textContent = `${noVig.toFixed(2)}%`;
          if (noVig >= 55) span.classList.add("green-text");
          td.innerHTML = parts.join(" ");
          if (td.innerHTML) td.innerHTML += " • ";
          td.appendChild(span);
        } else {
          td.textContent = parts.length ? parts.join(" ") : "—";
        }

        tr.appendChild(td);
        return;
      }

      // 🎯 Difference columns with color cues + directional arrows
if (col === "PrizePicksDifference" || col === "UnderdogDifference") {
  const diff = Number(value);
  const isPrize = col === "PrizePicksDifference";
  const pointKey = isPrize ? "PrizePickPoint" : "UnderdogPoint";
  const pointVal = Number(row[pointKey]);
  const consensusVal = Number(row.ConsensusPoint);

  if (Number.isFinite(diff)) {
    // 🎨 Color code by strength
    if (diff > 2) td.classList.add("huntergreen");
    else if (diff >= 1.5) td.classList.add("green");
    else if (diff >= 1.0) td.classList.add("darkyellow");
    else td.classList.add("gray");

    // 🧭 Arrow direction based on comparison to consensus
    let arrow = "";
    if (Number.isFinite(consensusVal) && Number.isFinite(pointVal)) {
      if (pointVal > consensusVal) arrow = "⬆️";
      else if (pointVal < consensusVal) arrow = "⬇️";
    }

    // 🧮 Final cell text
    td.innerHTML = `${diff.toFixed(2)} <span class="diff-arrow">${arrow}</span>`;
  } else {
    td.textContent = "—";
  }

  tr.appendChild(td);
  return;
}


      // 🧾 Default text/fallback
      td.textContent =
        value === undefined || value === null || value === "" ? "—" : String(value);
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  // Yield between batches to keep UI responsive
  await new Promise((r) => setTimeout(r, 0));
}
// ===================================================
// ✅ Attach Fact Check listener after table is rendered
// ===================================================
attachFactCheckListener(data);
}

// ===================================================
// 🧠 FACT CHECK MODE — Detailed Breakdown (with No-Vig)
// ===================================================

const factCheckBtn = document.getElementById("factCheckBtn");

if (!window.factCheckEnabled) {
  factCheckBtn.addEventListener("click", () => {
    window.factCheckActive = !window.factCheckActive;
    factCheckBtn.style.backgroundColor = window.factCheckActive ? "#007bff" : "#333";
    console.log(
      window.factCheckActive
        ? "✅ Fact Check Mode enabled — click a row to inspect details."
        : "❌ Fact Check Mode disabled."
    );
  });
  window.factCheckEnabled = true;
}

function attachFactCheckListener(data) {
  const tbody = document.querySelector("#results table tbody");
  if (!tbody) return;

  tbody.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => {
      if (!window.factCheckActive) return;

      // 💡 Flash highlight for user feedback
      tr.classList.add("flash-highlight");
      setTimeout(() => tr.classList.remove("flash-highlight"), 1000);

      const cells = Array.from(tr.querySelectorAll("td")).map(td =>
        td.textContent.trim()
      );

      const eventName = cells[0];
      const description = cells[2];
      const row = data.find(
        (r) =>
          (r.Description || "").trim() === description &&
          (r.Event || "").trim() === eventName
      );

      if (!row) {
        alert("❌ Unable to locate this record for Fact Check.");
        return;
      }

      const books = ["Fanduel", "DraftKings", "BetMGM", "Fanatics"];
      const impliedProbs = [];

      const details = books.map((b) => {
        const point = row[`${b}Point`] ?? "N/A";
        const price = row[`${b}Price`];
        if (price == null || isNaN(price)) return `• ${b}: N/A (N/A) → N/A`;

        const prob =
          price > 0 ? 100 / (price + 100) : -price / (-price + 100);
        impliedProbs.push(prob);
        return `• ${b}: ${point} (${price > 0 ? "+" + price : price}) → ${(prob * 100).toFixed(2)}%`;
      });

      const avgProb =
        impliedProbs.length > 0
          ? (impliedProbs.reduce((a, b) => a + b, 0) / impliedProbs.length) * 100
          : null;

      const avgProbText = avgProb ? avgProb.toFixed(2) + "%" : "N/A";

      // Compute no-vig fair probabilities from Over/Under
      const baseKey = `${(row.Event || "").toLowerCase().trim()}|${(row.Market || "").toLowerCase().trim()}|${(row.Description || "").toLowerCase().trim()}`;
      const sideSet = window.groupedFinal?.[baseKey];
      let noVigOver = null,
        noVigUnder = null;

      if (sideSet?.Over && sideSet?.Under) {
        const pRaw = americanToProb(getConsensusPrice(sideSet.Over.row));
        const qRaw = americanToProb(getConsensusPrice(sideSet.Under.row));
        const total = pRaw + qRaw;
        noVigOver = ((pRaw / total) * 100).toFixed(2);
        noVigUnder = ((qRaw / total) * 100).toFixed(2);
      }

      const noVigDetails =
        noVigOver && noVigUnder
          ? `🎯 No-Vig Fair Win Probabilities:\n   • Over: ${noVigOver}%\n   • Under: ${noVigUnder}%`
          : "🎯 No-Vig Fair Probability: Calculated dynamically.";

      const box = `
🧠 FACT CHECK DETAILS
📊 ${row.Event} — ${row.Description} (${row.Outcome})
Consensus Point: ${row.ConsensusPoint ?? "N/A"}
Average Price: ${getConsensusPrice(row)?.toFixed(2) ?? "N/A"}
Implied Probabilities (per book):
${details.join("\n")}
Average Implied Probability: ${avgProbText}
${noVigDetails}
`;

      console.log(box);
      // Modern modal display
const modal = document.getElementById("factCheckModal");
const detailsEl = document.getElementById("factCheckDetails");
const closeBtn = document.querySelector("#factCheckModal .close-btn");

detailsEl.textContent = box;
modal.style.display = "flex";

closeBtn.onclick = () => (modal.style.display = "none");
modal.onclick = (e) => {
  if (e.target === modal) modal.style.display = "none";
};

    });
  });
}




// ===================================================
// 🔠 Table Sort Helper
// ===================================================
function sortTableByColumn(table, columnIndex, ascending) {
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));
  rows.sort((a, b) => {
    const aText = a.children[columnIndex].textContent.trim();
    const bText = b.children[columnIndex].textContent.trim();
    const aNum = parseFloat(aText);
    const bNum = parseFloat(bText);
    if (!isNaN(aNum) && !isNaN(bNum))
      return ascending ? aNum - bNum : bNum - aNum;
    return ascending
      ? aText.localeCompare(bText)
      : bText.localeCompare(aText);
  });
  rows.forEach((r) => tbody.appendChild(r));
}

// ===================================================
// 🔐 Authentication Logic (Fixed Redirect)
// ===================================================

// --- Sign In ---
signinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signin-email").value.trim();
  const password = document.getElementById("signin-password").value.trim();

  signinBtn.classList.add("loading");
  document.getElementById("signin-spinner").style.display = "inline-block";

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;

    const user = data.user;
    if (!user) throw new Error("No user returned from Supabase.");

    // ✅ Check subscription and redirect to main content
    await checkSubscription(user.id);
    showMainContent();
  } catch (err) {
    console.error("Sign-in error:", err);
    alert(`Sign-in failed: ${err.message}`);
  } finally {
    signinBtn.classList.remove("loading");
    document.getElementById("signin-spinner").style.display = "none";
  }
});

// --- Sign Up ---
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value.trim();
  const pass = document.getElementById("signup-password").value.trim();
  const confirm = document.getElementById("signup-confirm").value.trim();

  if (pass !== confirm) {
    alert("Passwords do not match!");
    return;
  }

  signupBtn.classList.add("loading");
  document.getElementById("signup-spinner").style.display = "inline-block";

  try {
    const { data, error } = await supabase.auth.signUp({ email, password: pass });
    if (error) throw error;

    const user = data.user;
    if (user) {
      await fetch(`${API_BASE}/api/create-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, email }),
      });
      alert("✅ Account created! Please check your email to verify your account before signing in.");
    }
  } catch (err) {
    alert(`Sign-up failed: ${err.message}`);
  } finally {
    signupBtn.classList.remove("loading");
    document.getElementById("signup-spinner").style.display = "none";
  }
});

// --- Sign Out ---
signoutBtn.addEventListener("click", async () => {
  signoutBtn.classList.add("loading");
  document.getElementById("logout-spinner").style.display = "inline-block";

  await supabase.auth.signOut();
  authContainer.style.display = "flex";
  mainContent.style.display = "none";

  signoutBtn.classList.remove("loading");
  document.getElementById("logout-spinner").style.display = "none";
});

// --- Subscription Check + Redirect Helper ---
async function checkSubscription(userId) {
  try {
    const res = await fetch(`${API_BASE}/api/subscription-details?user_id=${userId}`);
    if (!res.ok) throw new Error("Subscription check failed.");
    const data = await res.json();

    subscriptionStatus.textContent = `Subscription: ${data.subscription_status}`;
    accessUntil.textContent = data.access_until
      ? `Access until: ${new Date(data.access_until).toLocaleString()}`
      : "";
    accessUntil.style.display = data.access_until ? "block" : "none";

    cancelSubscriptionBtn.style.display =
      data.subscription_status === "active" ? "inline-block" : "none";
    resumeSubscriptionBtn.style.display =
      data.subscription_status === "pending_cancel" ? "inline-block" : "none";
    subscribeBtn.style.display =
      data.subscription_status === "inactive" ? "inline-block" : "none";

    // ✅ Always show main content after successful check
    showMainContent();
  } catch (err) {
    console.error("Subscription check error:", err);
    alert("Unable to load your account. Please try again.");
  }
}

// --- Show/Hide Main Content ---
function showMainContent() {
  authContainer.style.display = "none";
  mainContent.style.display = "block";
}

// --- Auto-Redirect if Already Logged In ---
supabase.auth.getSession().then(({ data }) => {
  const session = data.session;
  if (session?.user) {
    console.log("Auto-login session found:", session.user.email);
    checkSubscription(session.user.id);
  }
});

// --- Auth State Listener ---
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session && session.user) {
    console.log("Auth state changed: user logged in");
    await checkSubscription(session.user.id);
  } else {
    console.log("Auth state changed: user logged out");
    authContainer.style.display = "flex";
    mainContent.style.display = "none";
  }
});
// ===================================================
// 💾 Export Functions (CSV & Excel)
// ===================================================

// Helper to extract table data
function getTableData() {
  const table = document.querySelector("#results table");
  if (!table) {
    alert("No data to export!");
    return null;
  }

  const rows = Array.from(table.querySelectorAll("tr")).map((row) =>
    Array.from(row.querySelectorAll("th, td")).map((cell) =>
      cell.textContent.replace(/(\r\n|\n|\r)/gm, "").trim()
    )
  );
  return rows;
}

// Export to CSV
function exportToCSV() {
  const rows = getTableData();
  if (!rows) return;

  const csvContent =
    "data:text/csv;charset=utf-8," +
    rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `BenThereBetThat_${selectedSport || "data"}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Export to Excel (.xlsx)
function exportToExcel() {
  const rows = getTableData();
  if (!rows) return;

  // Create a simple Excel file using SheetJS (if available) or fallback to CSV
  if (typeof XLSX !== "undefined") {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Odds Data");
    XLSX.writeFile(wb, `BenThereBetThat_${selectedSport || "data"}.xlsx`);
  } else {
    // fallback to CSV if SheetJS not loaded
    exportToCSV();
  }
}


// Attach event listeners
const exportCsvBtn = document.getElementById("exportCsv");
const exportExcelBtn = document.getElementById("exportExcel");

if (exportCsvBtn) exportCsvBtn.addEventListener("click", exportToCSV);
if (exportExcelBtn) exportExcelBtn.addEventListener("click", exportToExcel);

// ===================================================
// 🔍 Mobile Zoom / Condensed View Toggle (Auto-Hide + Persistent State)
// ===================================================

const zoomBtn = document.getElementById("zoomToggleBtn");
let zoomedOut = localStorage.getItem("zoomedOut") === "true"; // persist state
let hideTimeout;

// --- Show button only when table is loaded ---
function showZoomButtonIfTableExists() {
  const tableExists = document.querySelector(".odds-table");
  if (tableExists) {
    document.body.classList.add("table-active");
  } else {
    document.body.classList.remove("table-active");
  }
}

// Observe table creation/removal dynamically
const observer = new MutationObserver(() => {
  showZoomButtonIfTableExists();

  // 🧠 Restore zoom level when table loads
  const table = document.querySelector(".odds-table");
  if (table) {
    table.style.transform = zoomedOut ? "scale(0.8)" : "scale(1)";
    table.style.transformOrigin = "top left";
    zoomBtn.textContent = zoomedOut ? "🔍 Zoom In" : "🔎 Zoom Out";
  }
});
observer.observe(document.getElementById("results"), { childList: true, subtree: true });

// --- Toggle Zoom on Click ---
if (zoomBtn) {
  zoomBtn.addEventListener("click", () => {
    const table = document.querySelector(".odds-table");
    if (!table) return;

    zoomedOut = !zoomedOut;
    localStorage.setItem("zoomedOut", zoomedOut); // 💾 save user preference

    table.style.transform = zoomedOut ? "scale(0.9)" : "scale(1)";
    table.style.transformOrigin = "top left";
    zoomBtn.textContent = zoomedOut ? "🔍 Zoom In" : "🔎 Zoom Out";
  });
}

// --- Auto-hide the zoom button after inactivity ---
function resetZoomButtonHideTimer() {
  if (!document.body.classList.contains("table-active")) return;
  zoomBtn.style.opacity = "1";
  zoomBtn.style.transition = "opacity 0.5s ease-in-out";

  clearTimeout(hideTimeout);
  hideTimeout = setTimeout(() => {
    zoomBtn.style.opacity = "0";
  }, 5000);
}

// Show button again on user interaction
["scroll", "touchstart", "mousemove"].forEach((evt) => {
  document.addEventListener(evt, resetZoomButtonHideTimer, { passive: true });
});

// Initialize hide timer when button appears
const buttonObserver = new MutationObserver(() => {
  if (document.body.classList.contains("table-active")) {
    resetZoomButtonHideTimer();
  }
});
buttonObserver.observe(document.body, { attributes: true, attributeFilter: ["class"] });
