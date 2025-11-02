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

// ============================================================
// 💳 Stripe Checkout + Subscription Management (Frontend)
// ============================================================

// --------------
// 🧩 Forgot Password
// --------------
document.getElementById("forgot-btn")?.addEventListener("click", async () => {
  const email = prompt("Enter your email to reset your password:");
  if (!email) return;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
    alert("✅ Password reset link sent! Check your email.");
  } catch (err) {
    console.error("Password reset error:", err);
    alert("❌ Unable to send password reset email.");
  }
});

// --------------
// 💰 Subscribe (Stripe Checkout Session)
// --------------
document.getElementById("subscribeBtn")?.addEventListener("click", async () => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return alert("You must be logged in.");

  try {
    const priceId = "price_1SIzajExPCuJMaCrq8ADxMmx"; // 🔧 replace with your actual Stripe price ID
    const res = await fetch(`${window.API_BASE}/create-checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, price_id: priceId }),
    });

    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
    } else {
      alert("❌ Error creating checkout session.");
    }
  } catch (err) {
    console.error("Checkout error:", err);
    alert("❌ Unable to start checkout.");
  }
});

// --------------
// 🛑 Cancel Subscription
// --------------
document.getElementById("cancel-subscription-btn")?.addEventListener("click", async () => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return alert("You must be logged in.");

  if (!confirm("Cancel your subscription? You’ll retain access until the end of your billing cycle.")) return;

  try {
    const res = await fetch(`${window.API_BASE}/api/cancel-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    });
    const data = await res.json();

    if (data.success) {
      alert(data.message);
      await checkSubscriptionStatus(user.id);
    } else {
      alert("❌ Error canceling subscription.");
    }
  } catch (err) {
    console.error("Cancel error:", err);
  }
});

// --------------
// 🔁 Resume Subscription
// --------------
document.getElementById("resume-subscription-btn")?.addEventListener("click", async () => {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) return alert("You must be logged in.");

  try {
    const res = await fetch(`${window.API_BASE}/api/resume-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    });
    const data = await res.json();

    if (data.success) {
      alert(data.message);
      await checkSubscriptionStatus(user.id);
    } else {
      alert("❌ Error resuming subscription.");
    }
  } catch (err) {
    console.error("Resume error:", err);
  }
});



// ===================================================
// 📚 Global Bookmaker List (used across all modules)
// ===================================================
const BOOKMAKERS = ["Fanduel", "DraftKings", "BetMGM", "Fanatics"];
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
// 🌍 GLOBAL BOOKMAKER LIST + HELPERS (Unified)
// ===================================================
window.BOOKMAKERS = ["Fanduel", "DraftKings", "BetMGM", "Fanatics"];

/** Convert American odds → implied probability (0–1) */
function americanToProb(odds) {
  const v = Number(odds);
  if (!Number.isFinite(v)) return null;
  return v > 0 ? 100 / (v + 100) : (-v) / ((-v) + 100);
}

/** Average all available bookmaker prices (Consensus) */
function getConsensusPrice(row) {
  const prices = [];
  for (const book of window.BOOKMAKERS) {
    const price = parseFloat(row[`${book}Price`]);
    if (!isNaN(price)) prices.push(price);
  }
  if (!prices.length) return null;
  return Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100;
}
// ===================================================
// 🧠 FACT CHECK MODE TOGGLE BUTTON
// ===================================================
const factCheckBtn = document.getElementById("factCheckBtn");

if (factCheckBtn && !window.factCheckEnabled) {
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

/** ===================================================
 * 🧮 STEP 1: Compute true No-Vig fair probability (Over/Under normalization)
 * — Compares both sides (Over vs Under) per bookmaker, removes vig
 * =================================================== */
function computeNoVig(data, row) {
  const outcome = (row.Outcome || row.OverUnder || "").toLowerCase();
  const isOver = outcome.includes("over");
  const isUnder = outcome.includes("under");
  const oppSide = isOver ? "under" : isUnder ? "over" : null;

  // 🔍 1️⃣ Find the matching opposite-side line (same event, market, player)
  const opposite = oppSide
    ? data.find(
        (r) =>
          (r.Event || "").toLowerCase().trim() === (row.Event || "").toLowerCase().trim() &&
          (r.Market || "").toLowerCase().trim() === (row.Market || "").toLowerCase().trim() &&
          (r.Description || "").toLowerCase().trim() === (row.Description || "").toLowerCase().trim() &&
          (r.Outcome || "").toLowerCase().includes(oppSide)
      )
    : null;

  const fairProbs = [];

  // 🧾 2️⃣ Loop each bookmaker and pair Over/Under prices
  for (const book of window.BOOKMAKERS) {
    const overOdds = isOver
      ? parseFloat(row[`${book}Price`])
      : opposite
      ? parseFloat(opposite[`${book}Price`])
      : NaN;
    const underOdds = isUnder
      ? parseFloat(row[`${book}Price`])
      : opposite
      ? parseFloat(opposite[`${book}Price`])
      : NaN;

    if (!Number.isFinite(overOdds) || !Number.isFinite(underOdds)) continue;

    const pOver = americanToProb(overOdds);
    const pUnder = americanToProb(underOdds);
    if (!pOver || !pUnder) continue;

    // 🎯 3️⃣ Normalize to remove vig only if both sides valid
    const total = pOver + pUnder;
    if (total <= 0.01 || total > 2) continue; // skip unrealistic sums

    const fairOver = (pOver / total) * 100;
    const fairUnder = (pUnder / total) * 100;

    // 🧱 keep in realistic [0–100] range
    const boundedOver = Math.min(Math.max(fairOver, 0), 100);
    const boundedUnder = Math.min(Math.max(fairUnder, 0), 100);

    fairProbs.push(isOver ? boundedOver : boundedUnder);
  }

  // 🩹 4️⃣ Fallback — if we never found a valid pair, just average implied %
  if (!fairProbs.length) {
    const implied = window.BOOKMAKERS
      .map((b) => americanToProb(row[`${b}Price`]))
      .filter(Boolean);
    if (!implied.length) return null;
    return (implied.reduce((a, b) => a + b, 0) / implied.length) * 100;
  }

  // 🧮 5️⃣ Average normalized fair probabilities across books
  const avg = fairProbs.reduce((a, b) => a + b, 0) / fairProbs.length;
  return Math.min(Math.max(avg, 0), 100);
}

/** ===================================================
 * 🧠 Table Fact-Check listener (shows Consensus + No-Vig in modal)
 * =================================================== */
function attachFactCheckListener(data) {
  const tbody = document.querySelector("#results table tbody");
  if (!tbody) return;

  tbody.querySelectorAll("tr").forEach((tr) => {
    tr.addEventListener("click", () => {
      if (!window.factCheckActive) return;

      // 💡 Flash highlight feedback
      tr.classList.add("flash-highlight");
      setTimeout(() => tr.classList.remove("flash-highlight"), 800);

      const cells = Array.from(tr.querySelectorAll("td")).map(td => td.textContent.trim());
      const eventName = cells[0];
      const description = cells[2];

      const row = data.find(
        (r) =>
          (r.Description || "").trim() === description &&
          (r.Event || "").trim() === eventName
      );
      if (!row) return;

      // --- Market (vig-included) implied probabilities per book
      const impliedProbs = [];
      const details = getSelectedBooksArray().map((b) => {
        const point = row[b + "Point"] || "N/A";
        const price = parseFloat(row[b + "Price"]);
        if (isNaN(price)) return `• ${b}: N/A (N/A) → N/A`;
        const prob = americanToProb(price);
        impliedProbs.push(prob);
        return `• ${b}: ${point} (${price > 0 ? "+" + price : price}) → ${(prob * 100).toFixed(2)}%`;
      });

      const marketProb = impliedProbs.length
        ? (impliedProbs.reduce((a, b) => a + b, 0) / impliedProbs.length) * 100
        : null;

      // --- Compute true no-vig for both sides
      const nv = computeNoVigBothSides(window.lastRenderedData || data, row);

      // Per-book no-vig lines
      let perBookLines = [];
      if (nv.perBook.length) {
        perBookLines = nv.perBook.map(({ book, over, under }) =>
          `• ${book}: Over ${over.toFixed(2)}% | Under ${under.toFixed(2)}%`
        );
      } else {
        perBookLines = ["• No matching Over/Under pairs across selected books."];
      }

      // Average no-vig percentages
      const avgOverTxt = nv.avgOver != null ? nv.avgOver.toFixed(2) + "%" : "—";
      const avgUnderTxt = nv.avgUnder != null ? nv.avgUnder.toFixed(2) + "%" : "—";

      // Determine this row’s fair % for its side
      let rowSideFairTxt = "—";
      if (nv.sideIsOver && nv.avgOver != null) rowSideFairTxt = nv.avgOver.toFixed(2) + "%";
      if (nv.sideIsUnder && nv.avgUnder != null) rowSideFairTxt = nv.avgUnder.toFixed(2) + "%";
      if (rowSideFairTxt === "—" && nv.fallbackSide != null)
        rowSideFairTxt = nv.fallbackSide.toFixed(2) + "%";

      // --- Build Fact-Check modal text
      const box =
        "🧠 FACT CHECK DETAILS\n" +
        `📊 ${row.Event} — ${row.Description} (${row.Outcome || "Even"})\n` +
        `Consensus Point: ${row.ConsensusPoint ?? "N/A"}\n` +
        `Average Price: ${
          Number.isFinite(getConsensusPrice(row))
            ? getConsensusPrice(row).toFixed(2)
            : "N/A"
        }\n` +
        "Implied Probabilities (per book):\n" +
        details.join("\n") +
        `\nConsensus (Market) Probability: ${
          marketProb != null ? marketProb.toFixed(2) + "%" : "N/A"
        }\n` +
        "\n🎯 No-Vig (per book):\n" +
        perBookLines.join("\n") +
        `\n🧮 No-Vig Averages — Over: ${avgOverTxt} • Under: ${avgUnderTxt}\n` +
        `➡️ Selected Side (Fair): ${rowSideFairTxt}`;

      const modal = document.getElementById("factCheckModal");
      const detailsEl = document.getElementById("factCheckDetails");
      const closeBtn = modal.querySelector(".close-btn");
      if (!modal || !detailsEl || !closeBtn) return;

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
// 🧮 Average No-Vig Probability (Book-Aware)
// ===================================================
function getAverageNoVigProb(row, data) {
  const selectedBooks = new Set(
    Array.from(document.querySelectorAll('#bookmaker-filters input[type="checkbox"]:checked'))
      .map(cb => cb.value)
  );

  const baseKey = `${(row.Event || "").toLowerCase().trim()}|${(row.Market || "").toLowerCase().trim()}|${(row.Description || "").toLowerCase().trim()}`;
  const side = (row.Outcome || row.OverUnder || "").toLowerCase();
  const isOver = side.includes("over");
  const oppSide = isOver ? "under" : side.includes("under") ? "over" : null;

  const opposite = oppSide
    ? data.find(
        r =>
          (r.Event || "").toLowerCase().trim() === (row.Event || "").toLowerCase().trim() &&
          (r.Market || "").toLowerCase().trim() === (row.Market || "").toLowerCase().trim() &&
          (r.Description || "").toLowerCase().trim() === (row.Description || "").toLowerCase().trim() &&
          (r.Outcome || "").toLowerCase().includes(oppSide)
      )
    : null;

  const results = [];

  for (const book of BOOKMAKERS) {
    if (!selectedBooks.has(book)) continue;

    const overPrice = parseFloat(isOver ? row[`${book}Price`] : opposite?.[`${book}Price`]);
    const underPrice = parseFloat(isOver ? opposite?.[`${book}Price`] : row[`${book}Price`]);

    if (isNaN(overPrice) && isNaN(underPrice)) continue;

    const pOver = !isNaN(overPrice)
      ? (overPrice > 0 ? 100 / (overPrice + 100) : -overPrice / (-overPrice + 100))
      : null;
    const pUnder = !isNaN(underPrice)
      ? (underPrice > 0 ? 100 / (underPrice + 100) : -underPrice / (-underPrice + 100))
      : null;

    if (pOver == null && pUnder == null) continue;
    if (pOver != null && pUnder == null) {
      results.push({ book, noVigOver: pOver * 100, noVigUnder: null });
      continue;
    }
    if (pUnder != null && pOver == null) {
      results.push({ book, noVigOver: null, noVigUnder: pUnder * 100 });
      continue;
    }

    const total = pOver + pUnder;
    if (total > 0.05) {
      const noVigOver = (pOver / total) * 100;
      const noVigUnder = (pUnder / total) * 100;
      results.push({ book, noVigOver, noVigUnder });
    }
  }

  if (results.length === 0)
    return { avgOver: null, avgUnder: null, details: [] };

  const avgOver =
    results.reduce((sum, r) => sum + (r.noVigOver ?? 0), 0) /
    results.filter(r => r.noVigOver != null).length;
  const avgUnder =
    results.reduce((sum, r) => sum + (r.noVigUnder ?? 0), 0) /
    results.filter(r => r.noVigUnder != null).length;

  return {
    avgOver: avgOver ? avgOver.toFixed(2) : null,
    avgUnder: avgUnder ? avgUnder.toFixed(2) : null,
    details: results,
  };
}

// ===================================================
// 🏦 Global Helper — Get Consensus Price for a Row
// ===================================================
function getConsensusPrice(row) {
  const impliedProbs = [];

  for (const book of BOOKMAKERS) {
    const price = parseFloat(row[`${book}Price`]);
    if (isNaN(price)) continue;

    const prob = price > 0 ? 100 / (price + 100) : -price / (-price + 100);
    impliedProbs.push(prob);
  }

  if (impliedProbs.length === 0) return null;
  const avgProb = impliedProbs.reduce((a, b) => a + b, 0) / impliedProbs.length;
  const fairDecimal = 1 / avgProb;
  const consensus = fairDecimal >= 2
    ? (fairDecimal - 1) * 100
    : -100 / (fairDecimal - 1);

  return Math.round(consensus * 100) / 100; // ✅ Round to 2 decimals
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
  loadGames(true); // directly reloads games without animation
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
    "player_kicking_points": "Kicking Points",
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
    "player_kicking_points": "Kicking Points",

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
// Selected books from UI (falls back to all)
function getSelectedBooksArray() {
  const fromUI = Array.from(
    document.querySelectorAll('#bookmaker-filters input[type="checkbox"]:checked')
  ).map(cb => cb.value);
  if (fromUI.length) return fromUI;
  const saved = JSON.parse(localStorage.getItem("selectedBooks") || "[]");
  if (saved.length) return saved;
  return window.BOOKMAKERS || ["Fanduel", "DraftKings", "BetMGM", "Fanatics"];
}

/** Compute true No-Vig for BOTH sides (per-book + averages) */
function computeNoVigBothSides(data, row) {
  const sideTxt = (row.Outcome || row.OverUnder || "").toLowerCase();
  const isOverRow = sideTxt.includes("over");
  const isUnderRow = sideTxt.includes("under");
  const oppSide = isOverRow ? "under" : isUnderRow ? "over" : null;

  // Find the opposite row (same event/market/player)
  const opposite = oppSide
    ? data.find(r =>
        (r.Event || "").toLowerCase().trim()       === (row.Event || "").toLowerCase().trim() &&
        (r.Market || "").toLowerCase().trim()      === (row.Market || "").toLowerCase().trim() &&
        (r.Description || "").toLowerCase().trim() === (row.Description || "").toLowerCase().trim() &&
        (r.Outcome || r.OverUnder || "").toLowerCase().includes(oppSide)
      )
    : null;

  const perBook = [];
  const overVals = [];
  const underVals = [];

  const books = getSelectedBooksArray();
  for (const book of books) {
    const oOdds = opposite ? parseFloat(opposite[`${book}Price`]) : NaN;
    const thisOdds = parseFloat(row[`${book}Price`]);

    // We need BOTH sides' prices for the **same book** to de-vig correctly
    const overOdds  = isOverRow  ? thisOdds : oOdds;
    const underOdds = isUnderRow ? thisOdds : oOdds;

    if (!Number.isFinite(overOdds) || !Number.isFinite(underOdds)) continue;

    const pOver  = americanToProb(overOdds);
    const pUnder = americanToProb(underOdds);
    if (pOver == null || pUnder == null) continue;

    const total = pOver + pUnder;
    // Skip broken pairs
    if (total <= 0.01 || total > 2.0) continue;

    const fairOver  = (pOver  / total) * 100;
    const fairUnder = (pUnder / total) * 100;

    // bound
    const o = Math.min(Math.max(fairOver, 0), 100);
    const u = Math.min(Math.max(fairUnder, 0), 100);

    perBook.push({ book, over: o, under: u });
    overVals.push(o);
    underVals.push(u);
  }

  const avgOver  = overVals.length  ? overVals.reduce((a,b)=>a+b,0)   / overVals.length  : null;
  const avgUnder = underVals.length ? underVals.reduce((a,b)=>a+b,0)  / underVals.length : null;

  // Fallback: if we couldn’t pair, use simple implied avg for this row’s side only
  let fallbackSide = null;
  if (avgOver == null && avgUnder == null) {
    const implied = [];
    for (const book of getSelectedBooksArray()) {
      const price = parseFloat(row[`${book}Price`]);
      const p = americanToProb(price);
      if (p != null) implied.push(p * 100);
    }
    if (implied.length) fallbackSide = implied.reduce((a,b)=>a+b,0) / implied.length;
  }

  return {
    perBook,                // [{book, over, under}]
    avgOver,                // number | null
    avgUnder,               // number | null
    fallbackSide,           // number | null (used when no pairing)
    sideIsOver: isOverRow,  // which side the row is
    sideIsUnder: isUnderRow
  };
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



const avg = (arr) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

const getConsensusPoint = (row) => {
  const vals = activeBooks
    .map((b) => Number(row[bookPointKeys[b]]))
    .filter((v) => Number.isFinite(v));
  const a = avg(vals);
  return a == null ? null : Number(a.toFixed(2)); // 2dp
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
  "ConsensusPoint",
  "BestNoVig",        // 🆕 new column
  "PrizePickPoint", "UnderdogPoint",
  "PrizePicksDifference", "UnderdogDifference"
];

 
  const alwaysShow = ["PrizePicksDifference", "UnderdogDifference", "BestNoVig"];
const activeColumns = columns.filter(
  col => alwaysShow.includes(col) || data.some(r => r[col] != null && r[col] !== "")
);


  // Create table
const table = document.createElement("table");
table.classList.add("odds-table");

const thead = document.createElement("thead");
const headerRow = document.createElement("tr");

activeColumns.forEach((c) => {
  // 🧹 Skip the OverUnder column entirely
  if (c === "OverUnder") return;

  const th = document.createElement("th");
  th.textContent = c
    .replace("Point", "")
    .replace("Difference", " Δ")
    .replace("PrizePick", "PrizePicks")
    .replace("Fanduel", "FanDuel");

if (c === "ConsensusPoint") th.textContent = "Consensus";

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

     // 🎲 Combine sportsbook line + price + direction arrow
if (["FanduelPoint", "DraftKingsPoint", "BetMGMPoint", "FanaticsPoint"].includes(col)) {
  const priceCol = col.replace("Point", "Price");
  const lineNum = Number(row[col]);
  const priceNum = Number(row[priceCol]);

  // Determine directional arrow (use existing logic from your backend)
  // row.DirectionArrow should already be available per row, otherwise fallback to ⟷
  const arrow = row.DirectionArrow || "⟷";

  const arrowSpan = document.createElement("span");
  arrowSpan.textContent = ` ${arrow}`;
  arrowSpan.classList.add("diff-arrow");

  if (arrow === "▲") arrowSpan.style.color = "#28a745"; // green = Over
  else if (arrow === "▼") arrowSpan.style.color = "#d94f4f"; // red = Under
  else arrowSpan.style.color = "#888"; // gray = Even / N/A

  if (Number.isFinite(lineNum) && Number.isFinite(priceNum)) {
    td.textContent = `${lineNum.toFixed(2)} (${priceNum > 0 ? `+${priceNum}` : priceNum})`;
    td.appendChild(arrowSpan);
  } else if (Number.isFinite(lineNum)) {
    td.textContent = lineNum.toFixed(2);
    td.appendChild(arrowSpan);
  } else {
    td.textContent = "—";
  }

  tr.appendChild(td);
  return;
}


// ===================================================
// 🧠 Consensus column — show ONLY Fair (No-Vig) % + sort-ready
// ===================================================
// ===================================================
// 🧠 Consensus column — show Consensus line only (no %)
// ===================================================
if (col === "ConsensusPoint") {
  const consensusPoint = Number(row.ConsensusPoint);
  const consensusPrice = getConsensusPrice(row);

  const parts = [];
  if (Number.isFinite(consensusPoint)) parts.push(consensusPoint.toFixed(2));
  if (Number.isFinite(consensusPrice))
    parts.push(`(${consensusPrice > 0 ? `+${consensusPrice}` : consensusPrice})`);

  td.textContent = parts.join(" ") || "—";
  td.dataset.sort = consensusPrice || 0; // keep sorting usable
  tr.appendChild(td);
  return;
}


// ===================================================
// 🌟 NEW COLUMN — Best No-Vig Win % (Over vs Under)
// ===================================================
if (col === "BestNoVig") {
  const nv = computeNoVigBothSides(window.lastRenderedData || data, row);
  let text = "—";
  let pct = 0;

  if (nv.avgOver != null && nv.avgUnder != null) {
    const over = nv.avgOver;
    const under = nv.avgUnder;

    const isOverBetter = over > under;
    pct = isOverBetter ? over : under;
    const side = isOverBetter ? "Over" : "Under";
    const arrow = isOverBetter ? "▲" : "▼";

    // 🧮 Build label
    text = `${arrow} 🧮 ${side} ${pct.toFixed(2)}%`;

    // 🎨 Conditional formatting — only highlight if statistically meaningful
    if (pct >= 52) td.style.color = "#007b1a";        // dark green (strong edge)
    else if (pct >= 51) td.style.color = "#29a329";   // medium green
    else td.style.color = "";                         // default text color
  } else if (nv.fallbackSide != null) {
    const side = nv.sideIsOver ? "Over" : "Under";
    pct = nv.fallbackSide;
    text = `🧮 ${side} ${pct.toFixed(2)}%`;

    if (pct >= 52) td.style.color = "#007b1a";
    else if (pct >= 51) td.style.color = "#29a329";
  }

  td.textContent = text;
  td.dataset.sort = pct.toFixed(2);
  tr.appendChild(td);
  return;
}




// 🎯 Difference columns with bet recommendation signals (Over/Under - enhanced contrast)
if (col === "PrizePicksDifference" || col === "UnderdogDifference") {
  const diff = Number(value);
  const isPrize = col === "PrizePicksDifference";
  const pointKey = isPrize ? "PrizePickPoint" : "UnderdogPoint";
  const pointVal = Number(row[pointKey]);
  const consensusVal = Number(row.ConsensusPoint);

  if (Number.isFinite(diff) && Number.isFinite(pointVal) && Number.isFinite(consensusVal)) {
    // 🎨 Color intensity based on diff
    if (Math.abs(diff) > 2) td.classList.add("huntergreen");
    else if (Math.abs(diff) >= 1.5) td.classList.add("green");
    else if (Math.abs(diff) >= 1.0) td.classList.add("darkyellow");
    else td.classList.add("gray");

    // 🧠 Betting signal with visible badges
    if (pointVal < consensusVal) {
      // Bet Over
      td.innerHTML = `
        <span class="bet-badge over-badge">O↑ Over</span>
        <span class="diff-val">${diff.toFixed(2)}</span>
      `;
    } else if (pointVal > consensusVal) {
      // Bet Under
      td.innerHTML = `
        <span class="bet-badge under-badge">U↓ Under</span>
        <span class="diff-val">${diff.toFixed(2)}</span>
      `;
    } else {
      td.innerHTML = `<span class="diff-val">${diff.toFixed(2)}</span>`;
    }
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
    await checkSubscriptionStatus(user.id);

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
    showMainContent();
    checkSubscriptionStatus(session.user.id); // ✅ updated call
  }
});

// --- Auth State Listener ---
supabase.auth.onAuthStateChange(async (event, session) => {
  if (session && session.user) {
    console.log("Auth state changed: user logged in");
    showMainContent();
    await checkSubscriptionStatus(session.user.id); // ✅ updated call
  } else {
    console.log("Auth state changed: user logged out");
    authContainer.style.display = "flex";
    mainContent.style.display = "none";
  }
});



// ============================================================
// 💳 Subscription Status Checker + UI Updater
// ============================================================

async function checkSubscriptionStatus(user_id) {
  try {
    const res = await fetch(`${window.API_BASE}/api/subscription-details?user_id=${user_id}`);
    const data = await res.json();

    const statusEl = document.getElementById("subscription-status");
    const accessEl = document.getElementById("access-until");
    const subscribeBtn = document.getElementById("subscribeBtn");
    const cancelBtn = document.getElementById("cancel-subscription-btn");
    const resumeBtn = document.getElementById("resume-subscription-btn");

    // Reset visibility
    subscribeBtn.style.display = "none";
    cancelBtn.style.display = "none";
    resumeBtn.style.display = "none";
    accessEl.style.display = "none";

    const subStatus = data.subscription_status || "inactive";
    const accessUntil = data.access_until;
    const lastPayment = data.last_payment_date;

    statusEl.textContent = `Subscription: ${subStatus.charAt(0).toUpperCase() + subStatus.slice(1)}`;

    // -----------------------------------------------------------
    // 🗓️ Compute Remaining Days
    // -----------------------------------------------------------
    if (accessUntil) {
      const accessDate = new Date(accessUntil);
      const today = new Date();
      const diffMs = accessDate - today;
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (daysLeft > 0) {
        accessEl.style.display = "block";
        accessEl.textContent = `Access until: ${accessDate.toLocaleDateString()} (${daysLeft} days left)`;
      } else {
        accessEl.style.display = "block";
        accessEl.textContent = `Access expired on ${accessDate.toLocaleDateString()}`;
      }
    }

    // -----------------------------------------------------------
    // 🎛️ Determine Which Buttons to Show
    // -----------------------------------------------------------
    if (subStatus === "active") {
      cancelBtn.style.display = "inline-block";
    } else if (subStatus === "pending_cancel") {
      resumeBtn.style.display = "inline-block";
      if (accessUntil) accessEl.style.display = "block";
    } else if (subStatus === "inactive" || subStatus === "canceled") {
      // Check if it's been more than 31 days since last payment
      let showSubscribe = true;
      if (lastPayment) {
        const lastPayDate = new Date(lastPayment);
        const today = new Date();
        const diffDays = Math.floor((today - lastPayDate) / (1000 * 60 * 60 * 24));
        if (diffDays < 31) {
          accessEl.style.display = "block";
          accessEl.textContent = `Access ended recently (${31 - diffDays} days until renewal eligible)`;
          showSubscribe = false;
        }
      }
      if (showSubscribe) subscribeBtn.style.display = "inline-block";
    } else {
      subscribeBtn.style.display = "inline-block";
    }

  } catch (err) {
    console.error("❌ Error fetching subscription status:", err);
    document.getElementById("subscription-status").textContent = "Subscription: Unknown";
  }
}

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

// ===================================================
// ℹ️ Column Info Modal Logic
// ===================================================
const columnModal = document.getElementById("columnInfoModal");
const columnBtn = document.getElementById("columnInfoBtn");
const closeBtns = columnModal ? columnModal.querySelectorAll(".close, .close-modal-btn") : [];

if (columnBtn && columnModal) {
  columnBtn.addEventListener("click", () => {
    columnModal.style.display = "block";
    document.body.style.overflow = "hidden";
  });

  closeBtns.forEach(btn => btn.addEventListener("click", () => {
    columnModal.style.display = "none";
    document.body.style.overflow = "";
  }));

  window.addEventListener("click", (e) => {
    if (e.target === columnModal) {
      columnModal.style.display = "none";
      document.body.style.overflow = "";
    }
  });
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
// ===================================================
// 🏈 Enhanced Game Lines Table Renderer
// ===================================================
function renderGameTable(data) {
  const resultsDiv = document.getElementById("results");
  resultsDiv.innerHTML = "";

  if (!Array.isArray(data) || data.length === 0) {
    resultsDiv.innerHTML = "<p>No game line data available.</p>";
    return;
  }

  const table = document.createElement("table");
  table.classList.add("odds-table");

  // Define headers
  const headers = [
    "Event",
    "Market",
    "FanDuel",
    "DraftKings",
    "BetMGM",
    "Fanatics",
    "Spreads (+/-)",
    "Over / Under"
  ];

  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  data.forEach(row => {
    const tr = document.createElement("tr");

    // Event
    const eventCell = document.createElement("td");
    eventCell.textContent = row.Event || "—";
    tr.appendChild(eventCell);

    // Market
    const marketCell = document.createElement("td");
    marketCell.textContent = row.Market || "—";
    tr.appendChild(marketCell);

    // Bookmaker columns
    ["Fanduel", "DraftKings", "BetMGM", "Fanatics"].forEach(book => {
      const cell = document.createElement("td");
      const line = row[`${book}Line`];
      const price = row[`${book}Price`];

      if (line != null && price != null) {
        cell.textContent = `${line > 0 ? "+" + line : line} (${price > 0 ? "+" + price : price})`;
      } else {
        cell.textContent = "—";
      }

      tr.appendChild(cell);
    });

    // Spread (+/-)
    const spreadCell = document.createElement("td");
    if (row.HomeSpread != null && row.AwaySpread != null) {
      spreadCell.textContent = `${row.HomeSpread > 0 ? "+" + row.HomeSpread : row.HomeSpread} / ${row.AwaySpread > 0 ? "+" + row.AwaySpread : row.AwaySpread}`;
    } else {
      spreadCell.textContent = "—";
    }
    tr.appendChild(spreadCell);

    // Over / Under
    const ouCell = document.createElement("td");
    if (row.Over != null && row.Under != null) {
      ouCell.innerHTML = `
        <div>O ${row.Over} (${row.OverPrice != null ? (row.OverPrice > 0 ? "+" + row.OverPrice : row.OverPrice) : "—"})</div>
        <div>U ${row.Under} (${row.UnderPrice != null ? (row.UnderPrice > 0 ? "+" + row.UnderPrice : row.UnderPrice) : "—"})</div>
      `;
    } else {
      ouCell.textContent = "—";
    }
    tr.appendChild(ouCell);

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  resultsDiv.appendChild(table);
}


// Attach event listeners
const exportCsvBtn = document.getElementById("exportCsv");
const exportExcelBtn = document.getElementById("exportExcel");

if (exportCsvBtn) exportCsvBtn.addEventListener("click", exportToCSV);
if (exportExcelBtn) exportExcelBtn.addEventListener("click", exportToExcel);



// ===================================================
// 🔁 View Toggle Logic (Props ↔ Game Lines)
// ===================================================
const viewPropsBtn = document.getElementById("viewProps");
const viewGamesBtn = document.getElementById("viewGames");

if (viewPropsBtn && viewGamesBtn) {
  // 🎯 Player Props View
  viewPropsBtn.addEventListener("click", () => {
    viewPropsBtn.classList.add("active");
    viewGamesBtn.classList.remove("active");
    resultsDiv.innerHTML = "";
    // Re-render last known dataset if available
    if (window.lastRenderedData) {
      renderTableInBatches(window.lastRenderedData);
    } else {
      resultsDiv.innerHTML = "<p>Select a sport and click Load Data to begin.</p>";
    }
  });

  // 🏈 Game Lines View
  viewGamesBtn.addEventListener("click", async () => {
    viewGamesBtn.classList.add("active");
    viewPropsBtn.classList.remove("active");
    resultsDiv.innerHTML = "<p>Loading game line data...</p>";

    const date = document.getElementById("dateInput").value;
    const sport = window.selectedSport || "americanfootball_nfl"; // fallback if none selected

    try {
      const res = await fetch(`${window.API_BASE}/api/game-lines?sport=${sport}&date=${date}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      renderGameTable(data);
    } catch (err) {
      console.error("Error fetching game lines:", err);
      resultsDiv.innerHTML = "<p>⚠️ Error loading game line data. Please try again.</p>";
    }
  });
}
