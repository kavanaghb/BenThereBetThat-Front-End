// ===================================================
// 🧠 Global Error & Debug Handler (Silent-Safe Version)
// ===================================================

let lastErrorShown = "";
window.onerror = function (msg, src, line, col, err) {
  const formatted = [
    "⚠️ JavaScript Error Detected!",
    `🧩 Message: ${msg}`,
    `📄 File: ${src || "(unknown)"}`,
    `📍 Line: ${line}:${col}`,
    err ? `🪲 Stack: ${err.stack || "n/a"}` : ""
  ].join("\n");

  // 🧩 Define known harmless messages to ignore
  const ignoredPatterns = [
    "checkSubscriptionStatus is not defined",
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed",
    "Script error",

    



    // Chrome/Edge phrasing
    "Cannot read properties of null",
   "null (reading",

    // iOS Safari phrasing
    "null is not an object",
    "undefined is not an object",
    "evaluating 'signinForm.addEventListener'",
    "evaluating 'signupForm.addEventListener'",
      // ADD THESE ↓↓↓
  "Cannot read properties of undefined",
  "Cannot read properties of null",
  "reading 'Price'",
  "reading 'Point'",

  // Chrome/Edge phrasing
  "Cannot read properties of null",
  "null (reading",

  // iOS Safari phrasing
  "null is not an object",
  "undefined is not an object",
  ];


  const isIgnored = ignoredPatterns.some(p => msg?.includes(p));
  if (isIgnored) {
    console.warn("⚠️ Ignored non-fatal JS error:", msg);
    return true; // ✅ Suppress browser alert + default error output
  }

  // Avoid repeat alerts for the same error
  if (formatted !== lastErrorShown) {
    console.error(formatted);

    lastErrorShown = formatted;
  }

  // Always log full info for debugging
  console.group("%c🚨 JS ERROR", "color:red;font-weight:bold");
  console.error(formatted);
  console.groupEnd();

  // Return false so console still shows stack traces
  return false;
};

// Initial startup log
console.log(
  `%c✅ script.js loaded & global error handler active — ${new Date().toLocaleTimeString()}`,
  "color:green;font-weight:bold;"
);

// ===================================================
// 📌 Pick Tracker — Core State (NO UI)
// ===================================================

/**
 * Global Pick Tracker state
 * - platform: active platform for slip building
 * - selections: Map<key, pickData>
 */
window.pickTracker = {
  platform: "prizepicks", // default
  selections: new Map()
};

function updatePickTrackerUI() {
  // existing code
}

// ===================================================
// 🧹 Reset Pick Tracker UI After Submit (CORRECTED)
// ===================================================
function resetPickTrackerUI() {
  console.log("🧹 Resetting Pick Tracker UI");

  /* ===============================
     1️⃣ Clear Pick Tracker state
     =============================== */
  if (window.pickTracker?.selections) {
    window.pickTracker.selections.clear();
  }

  /* ===============================
     2️⃣ Clear highlighted TABLE rows
     =============================== */
  document.querySelectorAll("tr").forEach(row => {
    row.classList.remove("picked", "tracker-selected", "selected", "highlighted");
    row.style.backgroundColor = "";
    row.removeAttribute("data-selected");
  });

  /* ===============================
     3️⃣ Reset tap-to-card platform buttons
     =============================== */
  document.querySelectorAll("button").forEach(btn => {
    btn.classList.remove("active", "selected", "picked");
    btn.removeAttribute("data-active");
    btn.removeAttribute("aria-pressed");
  });

  /* ===============================
     4️⃣ Reset card containers (mobile view)
     =============================== */
  document.querySelectorAll("[data-pick-key]").forEach(card => {
    card.classList.remove("selected", "picked", "active");
    card.removeAttribute("data-selected");
  });

  /* ===============================
     5️⃣ Hide Pick Tracker banner
     =============================== */
  const banner = document.getElementById("pick-tracker-banner");
  if (banner) banner.style.display = "none";

  /* ===============================
     6️⃣ Reset counter text
     =============================== */
  const countEl = document.getElementById("tracker-pick-count");
  if (countEl) countEl.textContent = "0";

  console.log("♻️ Pick Tracker UI fully reset");
}


// ===================================================
// 🎮 Sports Odds Dashboard — Full Fixed Script
// ===================================================

/**
 * Determine outcome (over / under) from model best no-vig side
 */
function getOutcomeFromRow(row) {
  if (row.BestNoVigSide) {
    return row.BestNoVigSide.toLowerCase(); // "over" | "under"
  }

  // Fallback: try older fields if present
  if (row.Outcome) {
    return row.Outcome.toLowerCase();
  }

  // Final fallback (should be rare)
  return "over";
}

function formatSportLabel(sport) {
  const map = {
    nba: "🏀 NBA",
    nfl: "🏈 NFL",
    mlb: "⚾ MLB",
    nhl: "🏒 NHL",
    ncaab: "🏀 NCAAB",
    ncaaw: "🏀 WNBA",
    ncaaf: "🏈 NCAAF"
  };
  return map[sport] || sport?.toUpperCase() || "Sport";
}

function formatDateLabel(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}
// ⚠️ game_date is a calendar label — DO NOT use Date() or timezone logic

function buildSlipCardTitleFromPicks(picks = []) {
  if (!picks.length) return "Slip";

  const sports = [...new Set(picks.map(p => p.sport).filter(Boolean))];
  const events = [...new Set(picks.map(p => p.event).filter(Boolean))];
  const dates  = [...new Set(picks.map(p => p.game_date).filter(Boolean))];

  const sportLabel =
    sports.length === 1 ? formatSportLabel(sports[0]) : "🏆 Multi-Sport";

  const eventLabel =
    events.length === 1 ? events[0] : `${events.length} Games`;

  // ✅ SAFE date formatting — NO Date()
  const dateLabel =
    dates.length === 1
      ? (() => {
          const [y, m, d] = dates[0].split("-");
          return `${m}/${d}/${y}`;
        })()
      : "Multiple Dates";

  return `${sportLabel} · ${eventLabel} · ${dateLabel}`;
}





/**
 * Generate a stable unique key for a pick
 * (used for both table rows & card views)
 */
function getPickTrackerKey(pick) {
  return [
    pick.event,
    pick.player,
    pick.market,
    pick.outcome,     // ✅ distinguish Over vs Under
    pick.line,        // ✅ distinguish different lines
    pick.platform
  ].join("|");
}

function isPickSelected(pick) {
  const key = getPickTrackerKey(pick);
  return window.pickTracker.selections.has(key);
}



/**
 * Toggle a pick in the tracker
 * This function has NO DOM or API side effects
 */
function togglePickTrackerSelection(pick) {
  const tracker = window.pickTracker;
  const key = getPickTrackerKey(pick);

  if (tracker.selections.has(key)) {
    tracker.selections.delete(key);
    console.log("➖ Pick removed from tracker:", key);
  } else {
    tracker.selections.set(key, pick);
    console.log("➕ Pick added to tracker:", key);
  }

  console.log(`📊 Tracker: ${tracker.selections.size} pick(s) selected`);

  // ✅ FIX #3 — force UI refresh for banner & buttons
updatePickTrackerBarUI();

  // ✅ UI refresh (THIS WAS MISSING)
  updatePickTrackerBarUI();
}


/**
 * Clear all tracker selections
 */
function clearPickTrackerSelections() {
  window.pickTracker.selections.clear();
  console.log("♻️ Pick Tracker cleared");
}

/**
 * Set active Pick Tracker platform
 * (does NOT affect filters or analytics)
 */
function setPickTrackerPlatform(platform) {
  if (!["prizepicks", "underdog", "betr"].includes(platform)) return;


  window.pickTracker.platform = platform;
  console.log("🎯 Pick Tracker platform set:", platform);

  const prizeBtn = document.getElementById("pickTrackerPrizePicksBtn");
  const dogBtn = document.getElementById("pickTrackerUnderdogBtn");
  const betrBtn = document.getElementById("pickTrackerBetrBtn");


  if (!prizeBtn || !dogBtn) return;

  // 🔴 RESET BOTH (neutral)


  [prizeBtn, dogBtn, betrBtn].forEach(btn => {
  if (!btn) return;
  btn.style.background = "#e0e0e0";
  btn.style.color = "#333";
  btn.style.boxShadow = "none";
});


  // 🟢 ACTIVATE SELECTED
  if (platform === "prizepicks") {
  prizeBtn.style.background =
    "linear-gradient(135deg, #28a745, #1e7e34)";
  prizeBtn.style.color = "#fff";
  prizeBtn.style.boxShadow = "0 0 10px rgba(40,167,69,0.6)";

} else if (platform === "underdog") {

  dogBtn.style.background =
    "linear-gradient(135deg, #007bff, #0056b3)";
  dogBtn.style.color = "#fff";
  dogBtn.style.boxShadow = "0 0 10px rgba(0,123,255,0.6)";

} else if (platform === "betr") {

  betrBtn.style.background =
    "linear-gradient(135deg, #ff6600, #cc5200)";
  betrBtn.style.color = "#fff";
  betrBtn.style.boxShadow = "0 0 10px rgba(255,102,0,0.6)";
}


  updatePickTrackerBarUI();
}


function bindCardPlatformToggles() {
  const container = document.getElementById("cardViewContent");
  if (!container) return;

  container.querySelectorAll(".platform-row").forEach(row => {
    row.addEventListener("click", (e) => {
      e.stopPropagation();

      const platform = row.dataset.platform;
      if (!platform) return;

      setPickTrackerPlatform(platform);
      updateCardPlatformHighlights();
    });
  });
}

function bindCardPlatformToggles() {
  const container = document.getElementById("cardViewContent");
  if (!container) return;

  container.querySelectorAll(".platform-row").forEach(row => {
    row.addEventListener("click", (e) => {
      e.stopPropagation();

      const platform = row.dataset.platform;
      if (!platform) return;

      setPickTrackerPlatform(platform);
      updateCardPlatformHighlights();
    });
  });
}

function updateCardPlatformHighlights() {
  const container = document.getElementById("cardViewContent");
  if (!container) return;

  const active = window.pickTracker.platform;

  container.querySelectorAll(".platform-row").forEach(row => {
    const rowPlatform = row.dataset.platform;
    row.classList.toggle(
      "active-platform",
      rowPlatform === active
    );
  });
}

// ===================================================
// 📦 Pick Tracker — Bottom Bar UI
// ===================================================
function updatePickTrackerBarUI() {
  const bar = document.getElementById("pickTrackerBar");
  const countEl = document.getElementById("trackerPickCount");
  const platformEl = document.getElementById("trackerPlatformLabel");
  const saveBtn = document.getElementById("trackerSaveBtn");

  if (!bar || !countEl || !platformEl) return;

  const count = window.pickTracker.selections.size;
  const platform = window.pickTracker.platform;

  if (count === 0) {
    bar.classList.add("hidden");
    if (saveBtn) saveBtn.disabled = true;
    return;
  }

  bar.classList.remove("hidden");

  platformEl.textContent =
  platform === "underdog"
    ? "Underdog"
    : platform === "betr"
    ? "Betr"
    : "PrizePicks";


  countEl.textContent =
    `${count} pick${count !== 1 ? "s" : ""} selected`;

  if (saveBtn) saveBtn.disabled = false;
}



// ===================================================
// 💾 Pick Tracker — Save Slip
// ===================================================


async function savePickTrackerSlip() {
  const picks = Array.from(window.pickTracker.selections.values());

  if (!picks.length) {
    alert("No picks selected.");
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.access_token) {
      alert("Please sign in to save slips.");
      return;
    }

    const platformNameMap = {
  prizepicks: "PrizePicks",
  underdog: "Underdog",
  betr: "Betr"
};

const platform = window.pickTracker.platform;

const payload = {
  platform: platform,

  title: `${platformNameMap[platform] || "Slip"} slip (${picks.length} picks)`,

  picks: picks.map(p => ({
    sport: p.sport,
    event: p.event,
    game_date: p.game_date,
    player: p.player,
    market: p.market,
    outcome: p.outcome,
    line: Number(p.line)
  }))
};


    console.log("📤 Saving slip payload:", payload);

    const res = await fetch(`${window.API_BASE}/api/slips`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text();
      throw new Error(txt || "Failed to save slip");
    }

    const data = await res.json();
    console.log("✅ Slip saved:", data);

    // ✅ FULL UI RESET (table rows, cards, buttons, banner)
    resetPickTrackerUI();

    clearPickTrackerSelections();
    updatePickTrackerBarUI();

    alert("✅ Slip saved to Pick Tracker!");

  } catch (err) {
    console.error("❌ Save slip failed:", err);
    alert("Failed to save slip. See console for details.");
  }
}




// ----------------------------
// Global Constants
// ----------------------------
const API_BASE = window.API_BASE || "https://bentherebetthat-api.onrender.com";
const SUPABASE_URL = "https://pkvkezbakcvrhygowogx.supabase.co";
const SUPABASE_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdmtlemJha2N2cmh5Z293b2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NjIzMDQsImV4cCI6MjA3NjEzODMwNH0.6C4WQvS8I2slGc7vfftqU7vOkIsryfY7-xwHa7uZj_g";

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

let sb = null;

if (window.supabase && typeof window.supabase.createClient === "function") {
  supabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
  window.supabaseClient = supabase; // optional but useful
  console.log("🔑 Supabase initialized in script.js");
} else {
  console.warn(
    "⚠️ Supabase library not loaded yet — skipping init in script.js"
  );
}



// ============================================================
// 🚦 Temporary Button Lock (before login/subscription check)
// ============================================================
function disableDataButtonsTemporarily() {
  if (loadDataBtn) {
    loadDataBtn.disabled = true;
    loadDataBtn.style.opacity = "0.5";
    loadDataBtn.style.cursor = "not-allowed";
    loadDataBtn.title = "Please sign in and subscribe to enable data loading";
  }
  if (refreshBtn) {
    refreshBtn.disabled = true;
    refreshBtn.style.opacity = "0.5";
    refreshBtn.style.cursor = "not-allowed";
    refreshBtn.title = "Please sign in and subscribe to enable data loading";
  }
}
// ============================================================
// 🕹️ Refresh Button Controller
// ============================================================
function setRefreshEnabled(enabled) {
  if (!refreshBtn) return;
  if (enabled) {
    refreshBtn.disabled = false;
    refreshBtn.style.opacity = "";
    refreshBtn.style.cursor = "";
    refreshBtn.title = "";
  } else {
    refreshBtn.disabled = true;
    refreshBtn.style.opacity = "0.5";
    refreshBtn.style.cursor = "not-allowed";
    refreshBtn.title = "Load data first to enable refresh";
  }
}

function setRefreshEnabled(isEnabled) {
  const refreshBtn = document.getElementById("refreshBtn");
  if (!refreshBtn) return;

  refreshBtn.disabled = !isEnabled;
  refreshBtn.style.opacity = isEnabled ? "1.0" : "0.5";
  refreshBtn.style.cursor = isEnabled ? "pointer" : "not-allowed";
  refreshBtn.title = isEnabled ? "" : "Refresh available after data loads.";
}
// ===================================================
// 🌐 Global Fetch Wrapper (with timeout + spinner + alerts)
// ===================================================
async function safeFetch(url, options = {}, timeoutMs = 15000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const overlay =
    document.getElementById("subscription-loading-overlay") ||
    document.getElementById("gameLoadingSpinner");

  if (overlay) overlay.classList.remove("hidden");

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      alert("⚠️ Request timed out. Please check your connection and try again.");
    } else if (!navigator.onLine) {
      alert("⚠️ You appear to be offline. Please reconnect and try again.");
    } else {
      console.error("🌐 safeFetch error:", err);
      alert("⚠️ Error connecting to server. Please try again in a few seconds.");
    }
    throw err;
  } finally {
    if (overlay) overlay.classList.add("hidden");
  }
}


// ============================================================
// 🚀 Initialize UI Lockdown
// ============================================================
disableDataButtonsTemporarily();
setRefreshEnabled(false); // ⛔ Grey out refresh until first successful load

// ===================================================
// 📦 Pick Tracker — Banner Button Wiring (FIX #2)
// ===================================================
// ===================================================
// 📦 Pick Tracker — Banner + Platform Button Wiring
// ===================================================
document.addEventListener("DOMContentLoaded", () => {

  const clearBtn = document.getElementById("trackerClearBtn");
  const saveBtn = document.getElementById("trackerSaveBtn");

  const prizeBtn = document.getElementById("pickTrackerPrizePicksBtn");
  const dogBtn = document.getElementById("pickTrackerUnderdogBtn");
  const betrBtn = document.getElementById("pickTrackerBetrBtn");


  // -----------------------------
  // Clear button
  // -----------------------------
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      clearPickTrackerSelections();
      updatePickTrackerBarUI();
      console.log("🧹 Pick Tracker cleared via banner");
    });
  }


  // -----------------------------
  // Save button
  // -----------------------------
  if (saveBtn) {
    saveBtn.addEventListener("click", () => {
      console.log("💾 Save Slip clicked");
      savePickTrackerSlip();
    });
  }


  // -----------------------------
  // Platform buttons
  // -----------------------------
  if (prizeBtn) {
    prizeBtn.addEventListener("click", () => {
      setPickTrackerPlatform("prizepicks");
    });
  }

  if (dogBtn) {
    dogBtn.addEventListener("click", () => {
      setPickTrackerPlatform("underdog");
    });
  }

  if (betrBtn) {
    betrBtn.addEventListener("click", () => {
      setPickTrackerPlatform("betr");
    });
  }


  // Initialize default platform UI
  updatePickTrackerBarUI();

});

const openGameLinesBtn = document.getElementById("openGameLinesBtn");

if (openGameLinesBtn) {
  openGameLinesBtn.addEventListener("click", () => {
    window.location.href = "game-lines.html";
  });
}


// Market Containers
const hockeyMarkets = document.getElementById("icehockey_nhlMarkets");
const ncaabMarkets = document.getElementById("basketball_ncaabMarkets");
const wnbaMarkets = document.getElementById("basketball_wnbaMarkets"); // ✅ FIXED
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

// ===================================================
// 💳 Subscribe (Stripe Checkout Session)
// ===================================================
document.getElementById("subscribeBtn")?.addEventListener("click", async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return alert("⚠️ You must be logged in to subscribe.");

  const subscribeBtn = document.getElementById("subscribeBtn");
  const priceId = "price_1SQwKqRQcEP77lM7mAFxdp6T"; // ✅ LIVE price ID
  subscribeBtn.disabled = true;
  subscribeBtn.textContent = "Redirecting to Checkout...";
  subscribeBtn.style.opacity = "0.6";

  try {
    const response = await fetch(`${window.API_BASE}/api/create-checkout-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id, price_id: priceId }),
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    if (data?.url) {
      console.log("✅ Redirecting to Stripe Checkout:", data.url);
      window.location.href = data.url;
    } else {
      alert("⚠️ Could not start checkout. Please try again later.");
    }
  } catch (err) {
    console.error("❌ Checkout error:", err);
    alert("⚠️ Error connecting to server. Please try again in a few seconds.");
  } finally {
    subscribeBtn.disabled = false;
    subscribeBtn.textContent = "Subscribe";
    subscribeBtn.style.opacity = "1";
  }
});



// ===================================================
// 🛑 Cancel Subscription (End at Period End)
// ===================================================
document.getElementById("cancel-subscription-btn")?.addEventListener("click", async () => {
  const cancelBtn = document.getElementById("cancel-subscription-btn");

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("⚠️ You must be logged in to cancel your subscription.");

    if (!confirm("Are you sure you want to cancel your subscription at the period end?")) return;

    cancelBtn.disabled = true;
    cancelBtn.textContent = "Processing...";
    cancelBtn.style.opacity = "0.6";

    const data = await safeFetch(`${window.API_BASE}/api/cancel-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    });

    if (data?.success) {
      alert("✅ Your subscription will end at the current billing period.");
      checkSubscriptionStatus(user.id);
    } else {
      alert("⚠️ Unable to cancel subscription. Please contact support.");
    }
  } catch (err) {
    console.error("❌ Cancel subscription error:", err);
    alert("⚠️ Error connecting to server. Please try again shortly.");
  } finally {
    cancelBtn.disabled = false;
    cancelBtn.textContent = "Cancel Subscription";
    cancelBtn.style.opacity = "1";
  }
});



// ===================================================
// 🔄 Resume Subscription (Reactivate)
// ===================================================
document.getElementById("resume-subscription-btn")?.addEventListener("click", async () => {
  const resumeBtn = document.getElementById("resume-subscription-btn");

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("⚠️ You must be logged in to resume your subscription.");

    resumeBtn.disabled = true;
    resumeBtn.textContent = "Resuming...";
    resumeBtn.style.opacity = "0.6";

    const data = await safeFetch(`${window.API_BASE}/api/resume-subscription`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: user.id }),
    });

    if (data?.success) {
      alert("✅ Your subscription has been resumed successfully!");
      checkSubscriptionStatus(user.id);
    } else {
      alert("⚠️ Unable to resume subscription. Please contact support.");
    }
  } catch (err) {
    console.error("❌ Resume subscription error:", err);
    alert("⚠️ Error connecting to server. Please try again shortly.");
  } finally {
    resumeBtn.disabled = false;
    resumeBtn.textContent = "Resume Subscription";
    resumeBtn.style.opacity = "1";
  }
});



// ===================================================
// 🧾 Manage Billing Button (Stripe Portal)
// ===================================================
document.getElementById("manageBillingBtn")?.addEventListener("click", async () => {
  const manageBillingBtn = document.getElementById("manageBillingBtn");

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("⚠️ You must be signed in to manage your billing.");

    manageBillingBtn.disabled = true;
    manageBillingBtn.textContent = "Opening...";
    manageBillingBtn.style.opacity = "0.6";

    const customerData = await safeFetch(`${window.API_BASE}/api/get-customer-id?user_id=${user.id}`);
    const customer_id = customerData?.customer_id;
    if (!customer_id) return alert("⚠️ Unable to retrieve your billing information.");

    const portalData = await safeFetch(`${window.API_BASE}/api/create-billing-portal-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id }),
    });

    if (!portalData?.url) throw new Error("No billing portal URL returned.");

    window.location.href = portalData.url;
  } catch (err) {
    console.error("❌ Billing portal error:", err);
    alert("⚠️ We couldn’t open your billing page. Please try again in a few seconds.");
  } finally {
    manageBillingBtn.disabled = false;
    manageBillingBtn.textContent = "Manage Billing";
    manageBillingBtn.style.opacity = "1";
  }
});


// ===================================================
// 🔍 Check Subscription Status (Frontend UI Updater)
// ===================================================
async function checkSubscriptionStatus(user_id) {
  const overlay = document.getElementById("subscription-loading-overlay");
  if (overlay) overlay.classList.remove("hidden"); // 🔄 show spinner

  try {
    // ✅ Unified safe fetch with timeout + user alerts
    const data = await safeFetch(`${window.API_BASE}/api/subscription-details?user_id=${user_id}`);

    const subStatus = data.subscription_status || "inactive";
    const accessUntil = data.access_until;
    const lastPayment = data.last_payment_date;

    console.log("💳 Subscription status:", subStatus, "Access until:", accessUntil);

    // --- UI Elements ---
    const statusEl = document.getElementById("subscription-status");
    const accessEl = document.getElementById("access-until");
    const subscribeBtn = document.getElementById("subscribeBtn");
    const cancelBtn = document.getElementById("cancel-subscription-btn");
    const resumeBtn = document.getElementById("resume-subscription-btn");
    const manageBillingBtn = document.getElementById("manageBillingBtn");
    const loadBtn = document.getElementById("loadData");

    // 🧹 Reset all buttons + hide date
    [subscribeBtn, cancelBtn, resumeBtn, manageBillingBtn].forEach((btn) => {
      if (btn) btn.style.display = "none";
    });
    if (accessEl) accessEl.style.display = "none";


// -----------------------------------------------------------
// ⚙️ Enable or Disable Load Data Button
// -----------------------------------------------------------
const enableLoad = (enable) => {
  const loadBtn = document.getElementById("loadData");
  const refreshBtn = document.getElementById("refreshBtn");
  if (!loadBtn || !refreshBtn) return;

  [loadBtn, refreshBtn].forEach((btn) => {
    btn.disabled = !enable;
    btn.style.opacity = enable ? "1" : "0.5";
    btn.style.cursor = enable ? "pointer" : "not-allowed";
    btn.title = enable
      ? ""
      : "Data available only for active subscribers";
  });

  setRefreshEnabled(enable);
};

// ✅ Only active users can load or refresh
enableLoad(subStatus === "active");


    // -----------------------------------------------------------
    // 🗓️ Handle Access Dates and Status Display
    // -----------------------------------------------------------
    if (accessUntil) {
      const accessDate = new Date(accessUntil);
      const today = new Date();
      const diffMs = accessDate - today;
      const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

      if (subStatus === "pending_cancel") {
        accessEl.textContent = `Access until: ${accessDate.toLocaleDateString()} (${daysLeft} days left)`;
        accessEl.style.display = "block";
      } else if (subStatus === "inactive" || subStatus === "canceled") {
        accessEl.textContent =
          daysLeft > 0
            ? `Access until: ${accessDate.toLocaleDateString()} (${daysLeft} days left)`
            : `Access expired on ${accessDate.toLocaleDateString()}`;
        accessEl.style.display = "block";
      } else {
        // Active → hide date to avoid clutter
        accessEl.style.display = "none";
      }
    }

    // -----------------------------------------------------------
    // 🎛️ Determine Which Buttons to Show
    // -----------------------------------------------------------
    switch (subStatus) {
      case "active":
        if (cancelBtn) cancelBtn.style.display = "inline-block";
        if (manageBillingBtn) manageBillingBtn.style.display = "inline-block";
        break;

      case "pending_cancel":
        if (resumeBtn) resumeBtn.style.display = "inline-block";
        if (accessEl) accessEl.style.display = "block";
        break;

      case "inactive":
      case "canceled": {
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
        if (showSubscribe && subscribeBtn) subscribeBtn.style.display = "inline-block";
        break;
      }

      default:
        if (subscribeBtn) subscribeBtn.style.display = "inline-block";
    }

    // -----------------------------------------------------------
    // 🧾 Update Text Status Label
    // -----------------------------------------------------------
    if (statusEl) {
      const label = subStatus
        .charAt(0)
        .toUpperCase() +
        subStatus.slice(1).replace("_", " ");
      statusEl.textContent = `Subscription: ${label}`;
      statusEl.style.color =
        subStatus === "active"
          ? "#22bb33"
          : subStatus === "pending_cancel"
          ? "#e67e22"
          : "#cc0000";
    }
  } catch (err) {
    console.error("❌ Error fetching subscription status:", err);
    const statusEl = document.getElementById("subscription-status");
    if (statusEl) {
      statusEl.textContent = "Subscription: Error fetching status";
      statusEl.style.color = "#ff4444";
    }
    const loadBtn = document.getElementById("loadData");
    if (loadBtn) {
      loadBtn.disabled = true;
      loadBtn.style.opacity = "0.5";
      loadBtn.style.cursor = "not-allowed";
    }
  } finally {
    // ✅ Always hide overlay, even on failure
    if (overlay) overlay.classList.add("hidden");
  }
}



// ===================================================
// 📚 Global Bookmaker List (used across all modules)
// ===================================================
const BOOKMAKERS = [
  "fanduel",
  "draftkings",
  "betmgm",
  "fanatics",
  "prizepicks",
  "underdog",
  "betr"
];

// ===================================================
// 🔧 Utility: Safe Event Binding
// ===================================================
function safeAddEventListener(el, evt, fn) {
  if (el && typeof el.addEventListener === "function") {
    el.addEventListener(evt, fn);
  }
}

// ----------------------------
// Global State
// ----------------------------
let selectedSport = null;
let selectedMarkets = [];
let selectedGames = [];
let currentController = null;
const eventCache = {}; // Cache for fetched games


// ===================================================
// 🎯 Persistent Bookmaker Filter Logic (CANONICAL SINGLE SOURCE)
// ===================================================



// Full supported books list (must match checkbox values in HTML)
const ALL_BOOKS = [
  "fanduel",
  "draftkings",
  "betmgm",
  "fanatics",
  "prizepicks",
  "underdog",
  "betr"
];




// ===================================================
// 🧠 CONSENSUS BOOKS (sportsbooks only — exclude DFS)
// ===================================================
const CONSENSUS_BOOKS = [
  "fanduel",
  "draftkings",
  "betmgm",
  "fanatics"
];

// Core sportsbooks required for consensus calculations
const REQUIRED_CORE_BOOKS = [
  "fanduel",
  "draftkings",
  "betmgm",
  "fanatics"
];

/** ===================================================
 * 🧮 Dynamic Consensus Price (SPORTSBOOKS ONLY, checkbox-aware)
 * =================================================== */
function getConsensusPrice(row) {

  if (!row || !window.selectedBooks || !(window.selectedBooks instanceof Set)) {
    return null;
  }

  const activeSportsbooks =
    CONSENSUS_BOOKS.filter(book => window.selectedBooks.has(book));

  const prices = [];

  for (const book of activeSportsbooks) {

    const price = getSafePrice(row, book);

    if (price !== null && price !== undefined && Number.isFinite(price)) {
      prices.push(price);
    }

  }

  // 🚨 CRITICAL FIX — prevent divide-by-zero
  if (prices.length === 0) {
    return null;
  }

  const avg =
    prices.reduce((sum, p) => sum + p, 0) / prices.length;

  return Number.isFinite(avg)
    ? Math.round(avg)
    : null;
}

// ===================================================
// 📱 Mobile-friendly toast notification
// ===================================================
function showToast(message, type = "error") {

  let toast =
    document.getElementById("filter-toast");

  if (!toast) {

    toast =
      document.createElement("div");

    toast.id = "filter-toast";

    document.body.appendChild(toast);

  }

  toast.textContent = message;

  toast.className = "";
  toast.classList.add("show");

  if (type === "success")
    toast.classList.add("success");

  if (type === "info")
    toast.classList.add("info");

  // auto hide
  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);

}

// ---------------------------------------------------
// Helpers
// ---------------------------------------------------
function sanitizeSavedBooks(saved) {
  if (!Array.isArray(saved)) return [];

  // keep only valid
  let cleaned = saved.filter(b => ALL_BOOKS.includes(b));

  // ensure at least one CORE book remains selected
  const coreCount = cleaned.filter(b => REQUIRED_CORE_BOOKS.includes(b)).length;
  if (coreCount === 0) cleaned.push("fanduel");

  // de-dupe
  cleaned = [...new Set(cleaned)];
  return cleaned;
}

function persistSelectedBooks() {
  localStorage.setItem(
    "selectedBooks",
    JSON.stringify([...window.selectedBooks])
  );
}


function syncBookmakerCheckboxes() {
  const container = document.getElementById("bookmaker-filters");
  if (!container) return;

  const checkboxes = container.querySelectorAll("input[type='checkbox']");
  checkboxes.forEach(cb => {
    cb.checked = window.selectedBooks.has(cb.value.toLowerCase());
  });
}

function getSelectedBooksArray() {
  const s = window.selectedBooks;
  if (!(s instanceof Set) || s.size === 0) return ALL_BOOKS;
  return [...s];
}

// Expose helper (if other parts of script.js call it)
window.getSelectedBooksArray = getSelectedBooksArray;

// ---------------------------------------------------
// Init state ONCE
// ---------------------------------------------------
function initializeBookmakerState() {
  let saved = null;

  try {
    saved = JSON.parse(localStorage.getItem("selectedBooks"));
  } catch (e) {
    saved = null;
  }

  // ✅ FORCE defaults if nothing valid
  if (!Array.isArray(saved) || saved.length === 0) {
    saved = [...ALL_BOOKS];
  }

  // ✅ sanitize
  saved = sanitizeSavedBooks(saved);

  // ✅ create global Set
  window.selectedBooks = new Set(saved);

  if (window.selectedBooks.size === 0) {
  window.selectedBooks = new Set(ALL_BOOKS);
  persistSelectedBooks();
}


  // ✅ persist corrected version
  persistSelectedBooks();

  console.log("📚 Bookmaker state initialized:", [...window.selectedBooks]);

  // ✅ CRITICAL: sync checkboxes AFTER state exists
  setTimeout(syncBookmakerCheckboxes, 0);
}

// ---------------------------------------------------
// Bind checkbox listeners (safe, single-bind)
// ---------------------------------------------------
// ---------------------------------------------------
// Bind checkbox listeners (ENFORCE ≥1 CORE SPORTSBOOK)
// ---------------------------------------------------
function attachBookmakerListeners() {

  const container =
    document.getElementById("bookmaker-filters");

  if (!container) return;

  const checkboxes =
    container.querySelectorAll("input[type='checkbox']");

  checkboxes.forEach(cb => {

    if (cb.dataset.bound === "1") return;
    cb.dataset.bound = "1";

    cb.addEventListener("change", () => {

      const book = cb.value.toLowerCase();

      // Update selectedBooks first
      if (cb.checked)
        window.selectedBooks.add(book);
      else
        window.selectedBooks.delete(book);

      // ------------------------------------------------
      // 🚨 CRITICAL SAFETY CHECK
      // Ensure at least ONE CORE sportsbook remains
      // ------------------------------------------------

      const coreStillSelected =
        CONSENSUS_BOOKS.some(core =>
          window.selectedBooks.has(core)
        );

      if (!coreStillSelected) {

        showToast(
      "At least one sportsbook must remain selected. Filters reset.",
      "error"
      );


        // ✅ Reset EVERYTHING to defaults
        window.selectedBooks =
          new Set(ALL_BOOKS);

        persistSelectedBooks();

        syncBookmakerCheckboxes();

        // Force rerender
        if (window.lastRenderedData?.length)
          rerenderConsensusTable(
            window.lastRenderedData
          );

        return;
      }

      // ------------------------------------------------
      // Persist valid state
      // ------------------------------------------------
      persistSelectedBooks();

      console.log(
        "📚 Active bookmaker filters:",
        [...window.selectedBooks]
      );

      // Rerender safely
      if (window.lastRenderedData?.length)
        rerenderConsensusTable(
          window.lastRenderedData
        );

    });

  });

}


// ---------------------------------------------------
// Single DOMContentLoaded init for bookmaker filters
// ---------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  initializeBookmakerState();
  syncBookmakerCheckboxes();
  attachBookmakerListeners();
});







// ===================================================
// ⭐ LOAD TEAM LOGOS FROM JSON
// ===================================================
let TEAM_LOGO_MAP = {};

async function loadMetaMaps() {
  try {
    // FIXED: correct relative path for Live Server
    const res = await fetch("team_logos.json");

    TEAM_LOGO_MAP = await res.json();
    console.log("Loaded TEAM_LOGO_MAP:", Object.keys(TEAM_LOGO_MAP).length);
  } catch (err) {
    console.error("Failed to load team_logos.json:", err);
    TEAM_LOGO_MAP = {};
  }
}

// ===================================================
// ⭐ GET TEAM LOGO URL — Final Working Version
// ===================================================
function getTeamLogoUrl(teamName) {
  if (!teamName) {
    console.warn("❌ getTeamLogoUrl(): no teamName received");
    return null;
  }

  const key = teamName.toLowerCase().trim();
  const meta = TEAM_LOGO_MAP[key];

  if (!meta) {
    console.warn(`❌ No logo meta found for key="${key}"`);
    return null;
  }

  const baseByLeague = {
    nfl:   "https://a.espncdn.com/i/teamlogos/nfl/500",
    nba:   "https://a.espncdn.com/i/teamlogos/nba/500",
    mlb:   "https://a.espncdn.com/i/teamlogos/mlb/500",
    nhl:   "https://a.espncdn.com/i/teamlogos/nhl/500",
    ncaaf: "https://a.espncdn.com/i/teamlogos/ncaa/500",
    ncaab: "https://a.espncdn.com/i/teamlogos/ncaa/500"
  };

  const base = baseByLeague[meta.league];
  const url = `${base}/${meta.slug}.png`;

  console.log(
    `🟦 Logo URL generated for "${teamName}" (league=${meta.league} slug=${meta.slug}):`,
    url
  );

  return url;
}



// ===================================================
// ⭐ EXTRACT TEAM NAMES ("Team A vs Team B")
// ===================================================
function extractTeams(eventStr) {
  if (!eventStr || typeof eventStr !== "string") return [null, null];

  const parts = eventStr.split(/vs/i);
  if (parts.length !== 2) return [null, null];

  return [
    parts[0].trim(),
    parts[1].trim()
  ];
}


// ===================================================
// 📇 Helper: build a sorted list for Tap-to-Card view
// ===================================================
function getSortedCardRows(baseData) {
  // 🚫 HARD STOP — no data means NO card rows
  if (!Array.isArray(baseData) || baseData.length === 0) {
    return [];
  }

  const key = window.activeOptimalFilter || null;

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function abs(v) {
    const n = Number(v);
    return Number.isFinite(n) ? Math.abs(n) : 0;
  }

  // ✅ Work on a copy only
  const rows = baseData.slice();

  rows.sort((a, b) => {
    const ppA = num(a.PrizePicksDifference);
    const ppB = num(b.PrizePicksDifference);
    const udA = num(a.UnderdogDifference);
    const udB = num(b.UnderdogDifference);
    const nvA = num(a.NoVigWinProb);
    const nvB = num(b.NoVigWinProb);

    switch (key) {

      // ---------------------------------------------------
      // ⭐ PrizePicks + EV → sort descending by PP diff
      // ---------------------------------------------------
      case "prize":
        return ppB - ppA;

      // ---------------------------------------------------
      // ⭐ Underdog + EV → sort descending by UD diff
      // ---------------------------------------------------
      case "underdog":
        return udB - udA;

      // ---------------------------------------------------
      // ⭐ Point Value Plays → largest absolute point diff
      // ---------------------------------------------------
      case "fantasy":
      case "pointvalue":
        return Math.max(abs(udB), abs(ppB)) - Math.max(abs(udA), abs(ppA));

      // ---------------------------------------------------
      // ⭐ High Confidence → by No-Vig Win % descending
      // ---------------------------------------------------
      case "high":
        return nvB - nvA;

      // ---------------------------------------------------
      // ⭐ DFS Line Difference (>2)
      //     → largest absolute PP/UD difference
      // ---------------------------------------------------
      case "dfs":
        return Math.max(abs(ppB), abs(udB)) - Math.max(abs(ppA), abs(udA));

      // ---------------------------------------------------
      // ⭐ Default Sort → blended edge + EV boost
      // ---------------------------------------------------
      default:
        const edgeA = Math.max(abs(ppA), abs(udA));
        const edgeB = Math.max(abs(ppB), abs(udB));
        const boostA = nvA ? (nvA - 50) / 5 : 0;
        const boostB = nvB ? (nvB - 50) / 5 : 0;
        return (edgeB + boostB) - (edgeA + boostA);
    }
  });

  return rows;
}




// ===================================================
// 🌍 GLOBAL BOOKMAKER LIST (CANONICAL — LOWERCASE)
// MUST match checkbox values and ALL_BOOKS
// ===================================================
window.BOOKMAKERS = [
  "fanduel",
  "draftkings",
  "betmgm",
  "fanatics",
  "prizepicks",
  "underdog",
  "betr"
];


/** Convert American odds → implied probability (0–1) */
function americanToProb(odds) {
  const v = Number(odds);
  if (!Number.isFinite(v)) return null;
  return v > 0 ? 100 / (v + 100) : (-v) / ((-v) + 100);
}
// ===================================================
// 🛡️ SAFE HELPER — prevents crashes when price missing
// ===================================================
// ===================================================
// 🛡️ SAFE HELPER — correct casing lookup
// ===================================================
function getSafePrice(row, book) {

  if (!row || !book) return null;

  // Convert lowercase book → proper field prefix
  const keyMap = {
    fanduel: "Fanduel",
    draftkings: "DraftKings",
    betmgm: "BetMGM",
    fanatics: "Fanatics",
    prizepicks: "PrizePicks",
    underdog: "Underdog",
    betr: "Betr"
  };

  const proper = keyMap[book.toLowerCase()];
  if (!proper) return null;

 const val = row?.[`${proper}Price`] ?? null;

  const num = Number(val);
  return Number.isFinite(num) ? num : null;
}






// ===================================================
// 🧮 Dynamic Consensus Point (sportsbooks only, checkbox-aware)
// ===================================================
// ===================================================
// 🧮 SAFE Consensus Point (sportsbooks only, timing-safe)
// ===================================================
function getFilteredConsensusPoint(row) {

  if (!row) return null;

  const keyMap = {
    fanduel: "Fanduel",
    draftkings: "DraftKings",
    betmgm: "BetMGM",
    fanatics: "Fanatics"
  };

  // 🚨 FALLBACK: use all consensus books if selectedBooks not ready
  let activeBooks = CONSENSUS_BOOKS;

  if (
    window.selectedBooks &&
    window.selectedBooks instanceof Set &&
    window.selectedBooks.size > 0
  ) {
    activeBooks =
      CONSENSUS_BOOKS.filter(book =>
        window.selectedBooks.has(book)
      );
  }

  const points = [];

  for (const book of activeBooks) {

    const proper = keyMap[book];
    if (!proper) continue;

    const value = Number(row?.[`${proper}Point`]);

    if (Number.isFinite(value)) {
      points.push(value);
    }

  }

  if (points.length === 0) {
    return null;
  }

  const avg =
    points.reduce((sum, val) => sum + val, 0) / points.length;

  return Math.round(avg * 100) / 100;
}



// ===================================================
// 🧠 FACT CHECK MODE — GLOBAL SAFE INIT
// ===================================================

// ✅ ALWAYS define globally first
window.factCheckActive = false;
window.factCheckEnabled = window.factCheckEnabled || false;

const factCheckBtn = document.getElementById("factCheckBtn");

if (factCheckBtn && !window.factCheckEnabled) {

  factCheckBtn.addEventListener("click", () => {

    window.factCheckActive = !window.factCheckActive;

    factCheckBtn.style.backgroundColor =
      window.factCheckActive ? "#007bff" : "#333";

    console.log(
      window.factCheckActive
        ? "✅ Fact Check Mode enabled — click a row to inspect details."
        : "❌ Fact Check Mode disabled."
    );

  });

  window.factCheckEnabled = true;
}

// ===================================================
// 🔎 OPEN FACT CHECK MODAL (SAFE GLOBAL HANDLER)
// ===================================================
function openFactCheckModal(pick) {

  if (!pick) {
    console.warn("Fact Check called with invalid pick");
    return;
  }

  console.log("🔎 Fact Check Pick:", pick);

  // If you already have a modal system, call it here
  if (typeof showFactCheckModal === "function") {
    showFactCheckModal(pick);
    return;
  }

  // Safe fallback modal (never crashes)
  alert(
    `Fact Check\n\n` +
    `${pick.Description}\n` +
    `${pick.Market}\n\n` +
    `Consensus: ${pick.ConsensusPoint ?? "N/A"}`
  );
}


/** ===================================================
 * 🔎 SAFE FACT CHECK HELPER (prevents overOdds crash)
 * =================================================== */
function getFactCheckOdds(row) {

  const sportsbooks =
    CONSENSUS_BOOKS.filter(book =>
      window.selectedBooks?.has(book)
    );

  for (const book of sportsbooks) {

    const overKey =
      book.charAt(0).toUpperCase() +
      book.slice(1) +
      "Price";

    const odds = Number(row[overKey]);

    if (Number.isFinite(odds)) {

      return {
        book,
        odds
      };

    }

  }

  return {
    book: null,
    odds: null
  };
}


/** ===================================================
 * 🕹️ Toggle Refresh Button State
 * =================================================== */
function setRefreshEnabled(enabled) {

  const refreshBtn =
    document.getElementById("refreshBtn");

  if (!refreshBtn) return;

  if (enabled) {

    refreshBtn.disabled = false;
    refreshBtn.style.opacity = "";
    refreshBtn.style.cursor = "";
    refreshBtn.title = "";

  }
  else {

    refreshBtn.disabled = true;
    refreshBtn.style.opacity = "0.5";
    refreshBtn.style.cursor = "not-allowed";
    refreshBtn.title =
      "Load data first to enable refresh";

  }

}


// ===================================================
// 🔎 FACT CHECK MODAL FUNCTION (REQUIRED)
// ===================================================
// ===================================================
// 🔎 FACT CHECK MODAL FUNCTION (FINAL CORRECT VERSION)
// ===================================================
function openFactCheckModal(row) {

  if (!row) {
    alert("Fact Check Error: No row data available.");
    return;
  }

  const event =
    row.Event ||
    row.event ||
    "Unknown Event";

  const player =
    row.Description ||
    row.player ||
    "Unknown Player";

  const market =
    row.Market ||
    row.market ||
    "";

  const outcome =
    row.Outcome ||
    row.outcome ||
    "";

// ✅ FIX — SAFE LIVE sportsbook-filtered consensus (NO ERRORS)

// ===================================================
// ✅ USE BACKEND CONSENSUS + DIRECT SPORTSBOOK PRICES
// ===================================================

let consensusPoint = "N/A";
let consensusPrice = "N/A";

// Use backend consensus point directly (already correct)
if (Number.isFinite(Number(row.ConsensusPoint))) {
  consensusPoint = Number(row.ConsensusPoint).toFixed(2);
}

// Compute average sportsbook price directly from row data
const sportsbookPrices = [
  row.FanduelPrice,
  row.DraftKingsPrice,
  row.BetMGMPrice,
  row.FanaticsPrice
].map(Number).filter(Number.isFinite);

if (sportsbookPrices.length > 0) {

  const avgPrice =
    sportsbookPrices.reduce((sum, price) => sum + price, 0)
    / sportsbookPrices.length;

  const roundedPrice = Math.round(avgPrice);

  consensusPrice =
    roundedPrice > 0
      ? `+${roundedPrice}`
      : `${roundedPrice}`;
}



// ✅ Always safe message
const message =
`Fact Check

Event: ${event || "Unknown Event"}

Player: ${player || "Unknown Player"}

Market: ${(market || "").trim()} ${(outcome || "").trim()}

Consensus Point: ${consensusPoint}

Consensus Price: ${consensusPrice}`;

console.log(message);

console.log("🔎 Fact Check Row:", row);
}

// ===================================================
// STRICT sportsbook-only list (never include DFS books)
// ===================================================
const SPORTSBOOKS = [
  "Fanduel",
  "DraftKings",
  "BetMGM",
  "Fanatics"
];

/** ===================================================
 * 🧮 STEP 1: Compute true No-Vig fair probability (STRICT sportsbook-only)
 * — Requires BOTH Over and Under prices from same sportsbook
 * — NO FALLBACKS (prevents fake 100%)
 * =================================================== */
function computeNoVig(data, row) {

  const outcome =
    (row.Outcome || "").toLowerCase();

  const isOver =
    outcome.includes("over");

  const oppSide =
    isOver ? "under" :
    outcome.includes("under") ? "over" :
    null;

  if (!oppSide)
    return null;

  // find opposite row
  const opposite =
    data.find(r =>
      (r.Event || "").toLowerCase().trim() ===
      (row.Event || "").toLowerCase().trim() &&

      (r.Market || "").toLowerCase().trim() ===
      (row.Market || "").toLowerCase().trim() &&

      (r.Description || "").toLowerCase().trim() ===
      (row.Description || "").toLowerCase().trim() &&

      (r.Outcome || "").toLowerCase().includes(oppSide)
    );

  if (!opposite)
    return null;

  const fairValues = [];

  for (const book of SPORTSBOOKS) {

    const overOdds =
      Number(
        isOver
          ? row[`${book}Price`]
          : opposite[`${book}Price`]
      );

    const underOdds =
      Number(
        isOver
          ? opposite[`${book}Price`]
          : row[`${book}Price`]
      );

    if (
      !Number.isFinite(overOdds) ||
      !Number.isFinite(underOdds)
    )
      continue;

    const pOver =
      americanToProb(overOdds);

    const pUnder =
      americanToProb(underOdds);

    if (
      !Number.isFinite(pOver) ||
      !Number.isFinite(pUnder)
    )
      continue;

    const total =
      pOver + pUnder;

    if (total <= 0)
      continue;

    const fair =
      isOver
        ? (pOver / total) * 100
        : (pUnder / total) * 100;

    fairValues.push(fair);

  }

  if (!fairValues.length)
    return null;

  return fairValues.reduce((a,b)=>a+b,0) / fairValues.length;

}

/** ===================================================
 * 🧠 Table Fact-Check listener (With-Vig + True No-Vig comparison)
 * FULLY FIXED — NO SYNTAX ERRORS
 * =================================================== */
function attachFactCheckListener(data) {

  const tbody = document.querySelector("#results table tbody");
  if (!tbody) {
    console.warn("⚠️ Fact Check: tbody not found");
    return;
  }

  tbody.querySelectorAll("tr").forEach((tr) => {

    tr.addEventListener("click", () => {

      if (!window.factCheckActive) return;

      // Flash highlight
      tr.classList.add("flash-highlight");
      setTimeout(() => {
        tr.classList.remove("flash-highlight");
      }, 800);

      // Identify row
      const cells =
        Array.from(tr.querySelectorAll("td"))
          .map(td => td.textContent.trim());

      const eventName = cells[0];
      const description = cells[2];

      const index = tr.dataset.index;

let row = null;

if (
  index !== undefined &&
  window.lastRenderedData &&
  window.lastRenderedData[index]
) {
  row = window.lastRenderedData[index];
}

if (!row) {
  console.warn("⚠️ Fact Check row lookup failed, using fallback.");
  row = data.find(r =>
    (r.Description || "").trim() === description &&
    (r.Event || "").trim() === eventName
  );
}

if (!row) {
  alert("Fact Check Error: Could not locate sportsbook data.");
  return;
}


      if (!row) {
        console.warn("⚠️ Fact Check row not found");
        return;
      }

      // -------------------------------
      // 🧮 SPORTSBOOK ONLY books
      // -------------------------------

      let books =
        CONSENSUS_BOOKS.filter(b =>
          window.selectedBooks?.has(b)
        );

      if (books.length === 0)
        books = [...CONSENSUS_BOOKS];

      const impliedLines = [];
      const noVigLines = [];

      const fmtAmerican = (n) =>
        Number.isFinite(n)
          ? (n > 0 ? `+${n}` : `${n}`)
          : "N/A";

      const toProb = (odds) => {
        if (!Number.isFinite(odds)) return null;
        return odds > 0
          ? 100 / (odds + 100)
          : (-odds) / ((-odds) + 100);
      };

      const sideTxt =
        (row.Outcome || row.OverUnder || "")
        .toLowerCase();

      const rowIsOver = sideTxt.includes("over");
      const rowIsUnder = sideTxt.includes("under");

      const oppSide =
        rowIsOver ? "under"
        : rowIsUnder ? "over"
        : null;

      // find opposite row
      const opposite =
        oppSide
          ? (window.lastRenderedData || data).find(r =>
              (r.Event || "").toLowerCase().trim() === (row.Event || "").toLowerCase().trim() &&
              (r.Market || "").toLowerCase().trim() === (row.Market || "").toLowerCase().trim() &&
              (r.Description || "").toLowerCase().trim() === (row.Description || "").toLowerCase().trim() &&
              (r.Outcome || r.OverUnder || "").toLowerCase().includes(oppSide)
            )
          : null;

      for (const book of books) {

        const thisOdds =
          getSafePrice(row, book);

        const oppOdds =
          opposite
            ? getSafePrice(opposite, book)
            : null;

        const overOdds =
          rowIsOver ? thisOdds : oppOdds;

        const underOdds =
          rowIsOver ? oppOdds : thisOdds;

        const Otxt = fmtAmerican(overOdds);
        const Utxt = fmtAmerican(underOdds);

        const pO = toProb(overOdds);
        const pU = toProb(underOdds);

        const Owith =
          pO != null ? (pO * 100).toFixed(2) + "%" : "—";

        const Uwith =
          pU != null ? (pU * 100).toFixed(2) + "%" : "—";

        impliedLines.push(
          `• ${book}: O ${Otxt} / U ${Utxt} → Over ${Owith} | Under ${Uwith}`
        );

        if (pO != null && pU != null) {

          const total = pO + pU;

          if (total > 0) {

            const fairO =
              (pO / total) * 100;

            const fairU =
              (pU / total) * 100;

            noVigLines.push(
              `• ${book}: O ${Otxt} / U ${Utxt} → Over ${fairO.toFixed(2)}% | Under ${fairU.toFixed(2)}%`
            );

          }

        }
        else {

          noVigLines.push(
            `• ${book}: O ${Otxt} / U ${Utxt} → Over ${Owith} | Under ${Uwith}`
          );

        }

      }

      // -------------------------------
      // averages
      // -------------------------------

      const nv =
        computeNoVigBothSides(
          window.lastRenderedData || data,
          row
        );

      const avgOverTxt =
        nv.avgOver != null
          ? nv.avgOver.toFixed(2) + "%"
          : "—";

      const avgUnderTxt =
        nv.avgUnder != null
          ? nv.avgUnder.toFixed(2) + "%"
          : "—";

      let rowSideFairTxt = "—";

      if (nv.sideIsOver && nv.avgOver != null)
        rowSideFairTxt = nv.avgOver.toFixed(2) + "%";

      if (nv.sideIsUnder && nv.avgUnder != null)
        rowSideFairTxt = nv.avgUnder.toFixed(2) + "%";

      if (rowSideFairTxt === "—" && nv.fallbackSide != null)
        rowSideFairTxt = nv.fallbackSide.toFixed(2) + "%";

      // -------------------------------
      // build modal text
      // -------------------------------

      const factText =
`🧠 FACT CHECK DETAILS
📊 ${row.Event} — ${row.Description} (${row.Outcome || "Even"})

Consensus Point: ${
  Number.isFinite(row.ConsensusPoint)
    ? row.ConsensusPoint.toFixed(2)
    : "—"
}

Average Price: ${
  Number.isFinite(getConsensusPrice(row))
    ? getConsensusPrice(row).toFixed(2)
    : "—"
}

📈 With-Vig Probabilities:
${impliedLines.join("\n")}

🎯 No-Vig Probabilities:
${noVigLines.join("\n")}

🧮 No-Vig Averages:
Over: ${avgOverTxt}
Under: ${avgUnderTxt}

➡️ Selected Side Fair:
${rowSideFairTxt}
`;

      // -------------------------------
      // show modal safely
      // -------------------------------

      const modal =
        document.getElementById("factCheckModal");

      const detailsEl =
        document.getElementById("factCheckDetails");

      const closeBtn =
        modal?.querySelector(".close-btn");

      if (!modal || !detailsEl || !closeBtn) {
        console.warn("⚠️ Fact check modal elements missing");
        return;
      }

      detailsEl.textContent = factText;

      modal.style.display = "flex";

      closeBtn.onclick =
        () => modal.style.display = "none";

      modal.onclick =
        (e) => {
          if (e.target === modal)
            modal.style.display = "none";
        };

    });

  });

}

// ===================================================
// 🧮 Average No-Vig Probability (SPORTSBOOKS ONLY)
//   - Uses only FanDuel / DraftKings / BetMGM / Fanatics
//   - Requires BOTH sides from at least ONE sportsbook
// ===================================================
function getAverageNoVigProb(row, data) {

  const CONSENSUS_BOOKS = ["fanduel", "draftkings", "betmgm", "fanatics"];

  const selectedBooks =
    window.selectedBooks instanceof Set
      ? window.selectedBooks
      : new Set(CONSENSUS_BOOKS);

  const baseKey =
    `${(row.Event || "").toLowerCase().trim()}|${(row.Market || "").toLowerCase().trim()}|${(row.Description || "").toLowerCase().trim()}`;

  const side =
    (row.Outcome || row.OverUnder || "").toLowerCase();

  const isOver =
    side.includes("over");

  const oppSide =
    isOver
      ? "under"
      : side.includes("under")
      ? "over"
      : null;

  const opposite =
    oppSide
      ? data.find(
          (r) =>
            `${(r.Event || "").toLowerCase().trim()}|${(r.Market || "").toLowerCase().trim()}|${(r.Description || "").toLowerCase().trim()}` === baseKey &&
            (r.Outcome || "").toLowerCase().includes(oppSide)
        )
      : null;

  // convert American odds to implied prob (0..1)
  const americanToProb = (odds) => {
    const o = Number(odds);
    if (!Number.isFinite(o) || o === 0) return null;
    return o > 0
      ? 100 / (o + 100)
      : (-o) / ((-o) + 100);
  };

  const overProbs = [];
  const underProbs = [];

  // ===================================================
  // 🚨 STRICT sportsbook-only calculation
  // ===================================================
  for (const book of CONSENSUS_BOOKS) {

    if (selectedBooks.size && !selectedBooks.has(book))
      continue;

    const overOdds =
      americanToProb(
        isOver
          ? getSafePrice(row, book)
          : getSafePrice(opposite, book)
      );

    const underOdds =
      americanToProb(
        isOver
          ? getSafePrice(opposite, book)
          : getSafePrice(row, book)
      );

    // 🚨 REQUIRE BOTH SIDES
    if (
      overOdds == null ||
      underOdds == null
    ) {
      continue;
    }

    const total =
      overOdds + underOdds;

    if (total <= 0)
      continue;

    overProbs.push(
      (overOdds / total) * 100
    );

    underProbs.push(
      (underOdds / total) * 100
    );

  }

  // 🚨 CRITICAL: require at least ONE valid sportsbook pair
  if (
    overProbs.length === 0 ||
    underProbs.length === 0
  ) {

    return {
      avgOver: null,
      avgUnder: null,
      details: []
    };

  }

  const avgOver =
    overProbs.reduce((a, b) => a + b, 0) /
    overProbs.length;

  const avgUnder =
    underProbs.reduce((a, b) => a + b, 0) /
    underProbs.length;

  return {

    avgOver: Number.isFinite(avgOver)
      ? avgOver
      : null,

    avgUnder: Number.isFinite(avgUnder)
      ? avgUnder
      : null,

    details: overProbs.map((v, i) => ({
      book: CONSENSUS_BOOKS[i],
      noVigOver: overProbs[i],
      noVigUnder: underProbs[i]
    }))

  };

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
      `${window.API_BASE}/api/events?sport=${selectedSport}&date=${dateInput.value}`
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

  "basketball_wnba": {
    "player_points": "Player Points",
    "player_assists": "Player Assists",
    "player_rebounds": "Rebounds",
    "player_threes": "3-Pointers",
    "player_points_rebounds_assists": "Points + Rebounds + Assists",
    "player_points_rebounds": "Points + Rebounds",
    "player_points_assists": "Points + Assists",
    "player_rebounds_assists": "Rebounds + Assists"
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
// ===================================================
// STRICT sportsbook-only no-vig computation
// NEVER uses PrizePicks / Underdog / Betr
// ===================================================
function computeNoVigBothSides(data, row) {

  const SPORTSBOOKS = [
    "Fanduel",
    "DraftKings",
    "BetMGM",
    "Fanatics"
  ];

  const outcome =
    (row.Outcome || "").toLowerCase();

  const isOver =
    outcome.includes("over");

  const oppSide =
    isOver
      ? "under"
      : outcome.includes("under")
      ? "over"
      : null;

  if (!oppSide)
    return {
      avgOver: null,
      avgUnder: null
    };

  const opposite =
    data.find(r =>
      (r.Event || "").toLowerCase().trim() ===
      (row.Event || "").toLowerCase().trim() &&

      (r.Market || "").toLowerCase().trim() ===
      (row.Market || "").toLowerCase().trim() &&

      (r.Description || "").toLowerCase().trim() ===
      (row.Description || "").toLowerCase().trim() &&

      (r.Outcome || "").toLowerCase().includes(oppSide)
    );

  if (!opposite)
    return {
      avgOver: null,
      avgUnder: null
    };

  const overVals = [];
  const underVals = [];

  for (const book of SPORTSBOOKS) {

    const overOdds =
      Number(
        isOver
          ? row[`${book}Price`]
          : opposite[`${book}Price`]
      );

    const underOdds =
      Number(
        isOver
          ? opposite[`${book}Price`]
          : row[`${book}Price`]
      );

    if (
      !Number.isFinite(overOdds) ||
      !Number.isFinite(underOdds)
    )
      continue;

    const pOver =
      americanToProb(overOdds);

    const pUnder =
      americanToProb(underOdds);

    if (
      !Number.isFinite(pOver) ||
      !Number.isFinite(pUnder)
    )
      continue;

    const total =
      pOver + pUnder;

    if (total <= 0)
      continue;

    overVals.push((pOver / total) * 100);
    underVals.push((pUnder / total) * 100);

  }

  if (!overVals.length)
    return {
      avgOver: null,
      avgUnder: null
    };

  return {

    avgOver:
      overVals.reduce((a,b)=>a+b,0) /
      overVals.length,

    avgUnder:
      underVals.reduce((a,b)=>a+b,0) /
      underVals.length

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
// 📊 Load Data Handler (with user_id + subscription check + inline banner)
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

  // Clear UI + show loading state
  resultsDiv.innerHTML = "";
  progressText.textContent = "Fetching data...";
  loadingDiv.style.display = "block";

  if (typeof setRefreshEnabled === "function") setRefreshEnabled(false);

  if (currentController) currentController.abort();
  currentController = new AbortController();
  const signal = currentController.signal;

  try {
    // ✅ Get logged-in user (for subscription validation)
    const { data: { user } } = await supabase.auth.getUser();
    const user_id = user?.id || "";

    if (!user_id) {
      // 🧱 Inline message for guests
      resultsDiv.innerHTML = `
        <div class="subscription-banner fade-in">
          <p>🚫 You must be signed in to access player data.</p>
          <button id="signinRedirectBtn" class="cta-btn">Sign In</button>
        </div>`;
      document.getElementById("signinRedirectBtn")?.addEventListener("click", () => {
        window.location.href = "/signin.html";
      });
      loadingDiv.style.display = "none";
      return;
    }

    // ✅ Check subscription status before fetching
    const subRes = await fetch(`${window.API_BASE}/api/subscription-details?user_id=${user_id}`);
    const subData = await subRes.json();
    if (subData.subscription_status !== "active") {
      // 🚫 Inline banner for non-subscribers
      resultsDiv.innerHTML = `
        <div class="subscription-banner fade-in">
          <h3>🔒 Subscription Required</h3>
          <p>Your account does not have an active subscription.</p>
          <button id="subscribeNowBtn" class="cta-btn">Subscribe Now</button>
        </div>`;
      document.getElementById("subscribeNowBtn")?.addEventListener("click", () => {
        window.location.href = "/subscribe.html";
      });
      loadingDiv.style.display = "none";
      return;
    }

    // ===================================================
    // 🔍 Build query params
    // ===================================================
    const params = new URLSearchParams();
    params.append("sport", selectedSport);
    params.append("date", dateInput.value);
    params.append("user_id", user_id);
    selectedMarkets.forEach((m) => params.append("markets", m));
    selectedGameIds.forEach((id) => params.append("event_ids", id));

    // ===================================================
    // 🔍 Fetch + Inspect Response (Safe + Deduped)
    // ===================================================
    const res = await fetch(`${window.API_BASE}/api/data?${params.toString()}`, { signal });
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

    if (!allData || !Array.isArray(allData)) {
      console.error("🚨 Invalid data from API:", allData);
      alert("No data returned from server — check your filters or backend logs.");
      loadingDiv.style.display = "none";
      return;
    }

    // ✅ Deduplicate + Render
    const cleanedData = dedupeMarkets(allData);
    console.log(`🧹 Deduped from ${allData.length} → ${cleanedData.length} rows`);
    console.log("📦 Sample row:", cleanedData[0]);

    progressText.textContent = "Rendering table...";
    await renderTableInBatches(cleanedData);

    window.fullDataset = JSON.parse(JSON.stringify(cleanedData));
    window.lastRenderedData = cleanedData;
    progressText.textContent = "";

    if (typeof setRefreshEnabled === "function") {
      setRefreshEnabled(cleanedData.length > 0);
    }
  } catch (err) {
    if (err.name === "AbortError") {
      progressText.textContent = "⚠️ Loading stopped.";
    } else {
      console.error("❌ loadData error:", err);
      alert("Frontend error: " + err.message);
      progressText.textContent = "❌ Error fetching data (see console).";
    }
    if (typeof setRefreshEnabled === "function") setRefreshEnabled(false);
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

async function renderTableInBatches(data, batchSize = 50, isFiltered = false) {

  // 🧹 Clear previous results and cache dataset pointer
  resultsDiv.innerHTML = "";

  // ===================================================
  // ✅ CRITICAL: Always store raw dataset
  // ===================================================
  window.lastRenderedData = data;

  // ===================================================
  // 🔥 FIX #1: recompute No-Vig and BestNoVigSide safely
  // SPORTSBOOK ONLY — ignores PrizePicks / Underdog / Betr
  // ===================================================
  window.lastRenderedData.forEach(row => {

    const fair =
      computeNoVig(window.lastRenderedData, row);

    // overwrite backend values completely
    row.NoVigProb =
      Number.isFinite(fair)
        ? fair
        : null;

    // determine side safely
    if (!Number.isFinite(fair)) {

      row.BestNoVigSide = null;

    } else {

      const outcome =
        (row.Outcome || "").toLowerCase();

      if (outcome.includes("over")) {

        row.BestNoVigSide = "Over";

      } else if (outcome.includes("under")) {

        row.BestNoVigSide = "Under";

      } else {

        row.BestNoVigSide = null;

      }

    }

  });

  // ===================================================
  // 💾 Keep stable dataset reference
  // ===================================================
  if (!window.fullDataset || !window.fullDataset.length) {
    window.fullDataset = data;
  }

  // ===================================================
  // ⚙️ Cache initialization
  // ===================================================
  if (!window.baseNoVigCache) {
    window.baseNoVigCache = {};
  }

  if (isFiltered) {
    console.log("♻️ Reusing existing baseNoVigCache for filtered render.");
  } else {
    console.log("🧮 Fresh full render — baseNoVigCache intact or newly created.");
  }

  // ===================================================
  // 🧩 Restore selected books safely
  // (UI can still include DFS books — computeNoVig ignores them)
  // ===================================================
  let savedBooks = [];

  try {
    savedBooks =
      JSON.parse(
        localStorage.getItem("selectedBooks") || "[]"
      );
  } catch (e) {
    console.warn("⚠️ Failed to parse selectedBooks");
    savedBooks = [];
  }

  const selectedBooks =
    new Set(
      savedBooks.length > 0
        ? savedBooks
        : [
            "Fanduel",
            "DraftKings",
            "BetMGM",
            "Fanatics",
            "PrizePicks",
            "Underdog",
            "Betr"
          ]
    );

  console.log("📚 Active books in render:", [...selectedBooks]);

  const summaryDiv =
    document.getElementById("consensus-summary");






 

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
  // ===================================================
// 🧮 Compute fair "no-vig" probability (SPORTBOOK ONLY)
// ===================================================

let prob = null;

// ===================================================
// 🧮 Use ONLY sportsbook prices
// ===================================================

const sportsbookPrices = [
  row.FanduelPrice,
  row.DraftKingsPrice,
  row.BetMGMPrice,
  row.FanaticsPrice
].filter(p => p != null && Number.isFinite(Number(p)));

if (sportsbookPrices.length >= 2) {

  // convert all sportsbook odds to probabilities
  const probs = sportsbookPrices
    .map(p => americanToProb(Number(p)))
    .filter(p => p != null);

  if (probs.length >= 2) {

    const avgProb = probs.reduce((a, b) => a + b, 0) / probs.length;

    prob = avgProb * 100;

  }

}

// prob remains NULL if no sportsbook data exists





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
    const overEdge =
    Over.prob != null ? Math.abs(Over.prob - 50) : -1;

    const underEdge =
    Under.prob != null ? Math.abs(Under.prob - 50) : -1;
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
await renderOddsTable(finalData, batchSize, groupedFinal, isFiltered);

}

// ===================================================
// 🧱 Odds Table Renderer (with integrated Fact Check + highlight flash)
// ===================================================
async function renderOddsTable(data, batchSize = 50, groupedFinal = {}, isFiltered = false) {

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


// ===================================================
// ✅ SAFE GLOBAL BOOKMAKER STATE
// ===================================================

// Always use global shared Set
window.selectedBooks =
  window.selectedBooks instanceof Set
    ? window.selectedBooks
    : new Set(
        JSON.parse(localStorage.getItem("selectedBooks") || "[]")
      );

// fallback to all books if empty
if (window.selectedBooks.size === 0) {
  window.selectedBooks = new Set(Object.keys(bookPointKeys));
}

// Use global everywhere
const activeBookmakers =
  window.selectedBooks.size > 0
    ? [...window.selectedBooks]
    : Object.keys(bookPointKeys);



const avg = (arr) =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;

// ===================================================
// 🧮 Consensus Point Calculator (SPORTSBOOKS ONLY)
//   - Only uses core sportsbooks (NOT DFS)
//   - Respects window.selectedBooks filter, but guarantees
//     at least 1 core sportsbook is used
// ===================================================

const CONSENSUS_BOOKS = ["fanduel", "draftkings", "betmgm", "fanatics"];



// ===================================================
// 🧮 Consensus Point Calculator (checkbox-aware, sportsbook-only)
// ===================================================
const getConsensusPoint = (row) => {

  if (!(window.selectedBooks instanceof Set))
    return null;

  // Only sportsbooks AND only those selected
  const activeBooks =
    CONSENSUS_BOOKS.filter(book =>
      window.selectedBooks.has(book)
    );

  // 🚨 Correct behavior: NO FALLBACK — consensus invalid
  if (activeBooks.length === 0) {

    console.warn(
      "⚠️ No sportsbooks selected — consensus point unavailable."
    );

    // Optional: show alert once
    if (!window.consensusWarningShown) {

      window.consensusWarningShown = true;

      alert(
        "⚠️ All sportsbooks are unchecked.\n\n" +
        "Consensus values require at least one sportsbook:\n\n" +
        "FanDuel, DraftKings, BetMGM, or Fanatics."
      );

    }

    return null;
  }

  const vals = [];

  activeBooks.forEach(book => {

    const key =
      book.charAt(0).toUpperCase() +
      book.slice(1) +
      "Point";

    const val = Number(row[key]);

    if (Number.isFinite(val))
      vals.push(val);

  });

  if (!vals.length)
    return null;

  return vals.reduce((a, b) => a + b, 0) / vals.length;
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

  return Number.isFinite(prob) ? prob : null;
};

const columns = [
  "Event", "Market", "Description", "OverUnder",

  "FanduelPoint",
  "DraftKingsPoint",
  "BetMGMPoint",
  "FanaticsPoint",

  // ✅ DFS platforms added
  "PrizePickPoint",
  "UnderdogPoint",
  "BetrPoint",

  "ConsensusPoint",
  "BestNoVig",

  "PrizePicksDifference",
  "UnderdogDifference",
  "BetrDifference"
];


 
  const alwaysShow = [
  "PrizePicksDifference",
  "UnderdogDifference",
  "BetrDifference",
  "BestNoVig"
];

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

    // -----------------------------------
// 📌 Build pick object ONCE per row
// -----------------------------------

const platform = window.pickTracker.platform;

const lineMap = {
  prizepicks: row.PrizePickPoint,
  underdog: row.UnderdogPoint,
  betr: row.BetrPoint
};

const pick = {
  sport: selectedSport,
  event: row.Event,
  game_date: dateInput?.value || null,
  player: row.Description,
  market: row.Market,
  outcome: getOutcomeFromRow(row),

  line: Number(
    lineMap[platform]
    ?? row.PrizePickPoint
    ?? row.UnderdogPoint
    ?? row.BetrPoint
    ?? row.ConsensusPoint
  ),

  platform: platform
};


const pickKey = getPickTrackerKey(pick);
tr.dataset.pickKey = pickKey;


// -----------------------------------
// 🖱️ Row click → Fact Check OR Pick Tracker (mode-aware)
// -----------------------------------
tr.addEventListener("click", (e) => {

  // ===================================================
  // 🧠 FACT CHECK MODE — override everything
  // ===================================================
  if (window.factCheckActive) {

    e.stopPropagation();
    e.preventDefault();

    // Call your existing fact check logic
    openFactCheckModal(pick);

    return; // 🔥 prevents pick tracker from firing
  }

  // ===================================================
  // 🎯 NORMAL PICK TRACKER MODE
  // ===================================================
  togglePickTrackerSelection(pick);

  const isSelected =
    window.pickTracker.selections.has(pickKey);

  tr.classList.toggle("tracker-selected", isSelected);

});





// ===================================================
// 🧮 Dynamic consensus based on selected sportsbooks
// ===================================================

const consensusPoint =
  getFilteredConsensusPoint(row);

const consensusPrice =
  getConsensusPrice(row);



// --- Render each cell ---
activeColumns.forEach((col) => {
  const td = document.createElement("td");
  let value = row[col];

  // ===================================================
  // 🌟 Best No-Vig Win % (Over vs Under) — MUST RUN FIRST
  // ===================================================
  if (col === "BestNoVig") {
    // Ensure cache exists
    if (!window.baseNoVigCache) window.baseNoVigCache = {};

    // Reuse cached values during filtered re-renders
    if (isFiltered) {
      const cacheKey = `${row.Event}|${row.Market}|${row.Description}`;
      const cached = window.baseNoVigCache[cacheKey];
      if (cached) {
        td.textContent = cached.text || "—";
        td.dataset.sort = cached.pct ?? 0;
        row.NoVigWinProb = cached.pct ?? null;
        row.BestNoVigSide = cached.side ?? null;
        tr.appendChild(td);
        return;
      }
    }

    // Fresh compute (first render / unfiltered)
    const baseForCompute =
      Array.isArray(window.lastRenderedData) && window.lastRenderedData.length
        ? window.lastRenderedData
        : Array.isArray(data)
        ? data
        : [];

    const nv = computeNoVigBothSides(baseForCompute, row);

    let text = "—";
    let pct = null;
    let side = null;

    // STRICT sportsbook-only requirement
    if (
      nv &&
      Number.isFinite(nv.avgOver) &&
      Number.isFinite(nv.avgUnder)
    ) {

      const over = nv.avgOver;
      const under = nv.avgUnder;

      const isOverBetter = over >= under;

      pct = isOverBetter ? over : under;
      side = isOverBetter ? "Over" : "Under";

      text = `${isOverBetter ? "▲" : "▼"} 🧮 ${side} ${pct.toFixed(2)}%`;

    }

// 🚨 REMOVE fallbackSide completely — DO NOT allow single-sided values

    // Color tiering
    if (Number.isFinite(pct)) {
      if (pct >= 54) td.style.color = "#007b1a";
      else if (pct >= 52) td.style.color = "#29a329";
    }

    row.NoVigWinProb =
      Number.isFinite(pct)
        ? pct
        : null;

    row.BestNoVigSide =
      Number.isFinite(pct)
        ? side
        : null;

    // Cache for later filter re-renders
    if (row.Event && row.Market && row.Description) {
      const cacheKey = `${row.Event}|${row.Market}|${row.Description}`;
      window.baseNoVigCache[cacheKey] =
      Number.isFinite(pct)
        ? { pct, side, text }
        : { pct: null, side: null, text: "—" };
        }

    // Optional “Mismatch” badge (market vs model)
    // NOTE: this is a lightweight heuristic since we only have one price per book here.
    const marketFavoredOver =
      ["FanduelPrice", "DraftKingsPrice", "BetMGMPrice", "FanaticsPrice"].some(
        (k) => Number(row[k]) < 0
      );
    const marketFavored = marketFavoredOver ? "Over" : "Under";
    const modelFavored = side || "—";

    td.textContent = text;
    td.dataset.sort = Number.isFinite(pct) ? pct.toFixed(2) : 0;

    if (
      modelFavored !== "—" &&
      marketFavored !== "—" &&
      modelFavored !== marketFavored &&
      Number.isFinite(pct) &&
      Math.abs(pct - 50) >= 2
    ) {
      const badge = document.createElement("span");
      badge.textContent = "⚡ Mismatch";
      badge.classList.add("mismatch-badge");
      badge.title = `Market favors ${marketFavored}, model favors ${modelFavored}`;
      badge.style.marginLeft = "4px";
      badge.style.fontSize = "11px";
      badge.style.color = "#d94f4f";
      badge.style.fontWeight = "bold";
      td.appendChild(badge);
    }

    tr.appendChild(td);
    return;
  }

  // ===================================================
  // 🛡️ SAFE DFS PLATFORM HANDLING
  // ===================================================
  if (col === "PrizePickPoint") value = row.PrizePickPoint ?? null;
  else if (col === "UnderdogPoint") value = row.UnderdogPoint ?? null;
  else if (col === "BetrPoint") value = row.BetrPoint ?? null;

  // ===================================================
  // 🧮 Format DFS numeric columns
  // ===================================================
  if (col === "PrizePickPoint" || col === "UnderdogPoint" || col === "BetrPoint") {
    const num = Number(value);
    td.textContent = Number.isFinite(num) ? num.toFixed(2) : "—";
    tr.appendChild(td);
    return;
  }

  // ===================================================
  // 🎲 Sportsbook columns (line + price + favored arrow)
  // ===================================================
  if (["FanduelPoint", "DraftKingsPoint", "BetMGMPoint", "FanaticsPoint"].includes(col)) {
    const priceCol = col.replace("Point", "Price");
    const lineNum = Number(row[col]);
    const priceNum = Number(row[priceCol]);

    let arrow = "⟷";
    let arrowColor = "#888";
    let tooltip = "Even odds";

    if (Number.isFinite(priceNum)) {
      if (priceNum < 0) {
        arrow = "▲";
        arrowColor = "#28a745";
        tooltip = "Over favored";
      } else if (priceNum > 0) {
        arrow = "▼";
        arrowColor = "#d94f4f";
        tooltip = "Under favored";
      }
    }

    const arrowSpan = document.createElement("span");
    arrowSpan.textContent = ` ${arrow}`;
    arrowSpan.style.color = arrowColor;
    arrowSpan.title = tooltip;

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
// 🧠 Consensus column (FULLY FILTERED + LIVE)
// ===================================================
if (col === "ConsensusPoint") {

  // 🔥 USE FILTERED sportsbooks only
  const consensusPoint = getFilteredConsensusPoint(row);

  const consensusPrice = getConsensusPrice(row);

  const parts = [];

  if (Number.isFinite(consensusPoint))
    parts.push(consensusPoint.toFixed(2));

  if (Number.isFinite(consensusPrice))
    parts.push(`(${consensusPrice > 0 ? `+${consensusPrice}` : consensusPrice})`);

  td.textContent = parts.join(" ") || "—";

  td.dataset.sort =
    Number.isFinite(consensusPoint)
      ? consensusPoint
      : -9999;

  tr.appendChild(td);
  return;
}





  // ===================================================
  // 🎯 Difference columns (PrizePicks / Underdog / Betr)
  //   - Adds side markers for filters: _PrizePicksSide, _UnderdogSide, _BetrSide
  // ===================================================
  if (col === "PrizePicksDifference" || col === "UnderdogDifference" || col === "BetrDifference") {
    const diff = Number(row[col]);

    const pointKey =
      col === "PrizePicksDifference"
        ? "PrizePickPoint"
        : col === "UnderdogDifference"
        ? "UnderdogPoint"
        : "BetrPoint";

    const sideKey =
      col === "PrizePicksDifference"
        ? "_PrizePicksSide"
        : col === "UnderdogDifference"
        ? "_UnderdogSide"
        : "_BetrSide";

    const pointVal = Number(row[pointKey]);
    const consVal = Number(row.ConsensusPoint);

    // reset marker by default
    row[sideKey] = null;

    if (Number.isFinite(diff)) {
      // color tiering
      if (Math.abs(diff) >= 2) td.style.color = "#007b1a";
      else if (Math.abs(diff) >= 1) td.style.color = "#29a329";

      // optional badge + side marker (based on point vs consensus)
      if (Number.isFinite(pointVal) && Number.isFinite(consVal)) {
        const isOver = pointVal < consVal;
        const isUnder = pointVal > consVal;

        if (isOver) row[sideKey] = "over";
        else if (isUnder) row[sideKey] = "under";

        if (isOver || isUnder) {
          td.innerHTML = `<span class="bet-badge ${isOver ? "over-badge" : "under-badge"}">${
            isOver ? "O↑ Over" : "U↓ Under"
          }</span> <span class="diff-val">${diff.toFixed(2)}</span>`;
          tr.appendChild(td);
          return;
        }
      }

      td.textContent = diff.toFixed(2);
    } else {
      td.textContent = "—";
    }

    tr.appendChild(td);
    return;
  }

  // ===================================================
  // 🧾 Default fallback
  // ===================================================
  td.textContent = value === null || value === undefined || value === "" ? "—" : String(value);
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
// 🧮 Filters that match visible table fields (Δ columns)
// ===================================================

// Helper to extract direction and numeric value from Δ strings
function parseDelta(deltaText) {
  const text = (deltaText || "").toLowerCase();
  const isOver = text.includes("over");
  const isUnder = text.includes("under");
  const value = parseFloat(text.match(/(-?\d+(\.\d+)?)/)?.[0] || "0");
  return { isOver, isUnder, value };
}

// ===================================================
// 🧮 Optimal Filters Logic — must come before setupOptimalFilters()
// ===================================================

// ------------------------------
// 🔎 Helpers
// ------------------------------
function getBestSide(row) {
  if (row.BestNoVigSide) return row.BestNoVigSide.toLowerCase();
  const t = (row.BestNoVig || "").toLowerCase();
  if (t.includes("over")) return "over";
  if (t.includes("under")) return "under";
  return null;
}

function getPPside(row) {
  if (row._PrizePicksSide) return row._PrizePicksSide.toLowerCase();
  const pp = Number(row.PrizePickPoint);
  const cons = Number(row.ConsensusPoint);
  if (Number.isFinite(pp) && Number.isFinite(cons)) {
    return pp < cons ? "over" : pp > cons ? "under" : null;
  }
  return null;
}

function getUDside(row) {
  if (row._UnderdogSide) return row._UnderdogSide.toLowerCase();
  const ud = Number(row.UnderdogPoint);
  const cons = Number(row.ConsensusPoint);
  if (Number.isFinite(ud) && Number.isFinite(cons)) {
    return ud < cons ? "over" : ud > cons ? "under" : null;
  }
  return null;
}

function hasMeaningfulDelta(val, min = 0.25) {
  const n = Number(val);
  return Number.isFinite(n) && Math.abs(n) >= min;
}

// ===================================================
// 🎯 Robust Optimal Filters — derive best side from groupedFinal
// ===================================================

// Get the best side (over/under) using groupedFinal (preferred) or computeNoVigBothSides (fallback)
function getBestSideStrict(row) {
  const baseKey = `${(row.Event || "").toLowerCase().trim()}|${(row.Market || "").toLowerCase().trim()}|${(row.Description || "").toLowerCase().trim()}`;

  // 1) Use groupedFinal if present (built in renderTableInBatches)
  const gf = (window.groupedFinal && window.groupedFinal[baseKey]) ? window.groupedFinal[baseKey] : null;
  if (gf) {
    const overProb  = gf.Over?.prob ?? null;
    const underProb = gf.Under?.prob ?? null;
    if (overProb != null || underProb != null) {
      if (overProb != null && underProb != null) {
        return overProb >= underProb ? "over" : "under";
      }
      if (overProb != null)  return "over";
      if (underProb != null) return "under";
    }
  }

  // 2) Fallback: compute on the fly from the currently rendered dataset
  const dataForCompute = Array.isArray(window.lastRenderedData) && window.lastRenderedData.length
    ? window.lastRenderedData
    : Array.isArray(window.fullDataset) ? window.fullDataset : [];

  const nv = computeNoVigBothSides(dataForCompute, row);
  if (nv && (nv.avgOver != null || nv.avgUnder != null)) {
    if (nv.avgOver != null && nv.avgUnder != null) {
      return nv.avgOver >= nv.avgUnder ? "over" : "under";
    }
    if (nv.avgOver != null)  return "over";
    if (nv.avgUnder != null) return "under";
  }

  return null;
}

// Direction of PrizePicks relative to consensus (over if PP line < consensus)
function getPPside(row) {
  const pp = Number(row.PrizePickPoint);
  const cons = Number(row.ConsensusPoint);
  if (!Number.isFinite(pp) || !Number.isFinite(cons)) return null;
  return pp < cons ? "over" : pp > cons ? "under" : null;
}

// Direction of Underdog relative to consensus
function getUDside(row) {
  const ud = Number(row.UnderdogPoint);
  const cons = Number(row.ConsensusPoint);
  if (!Number.isFinite(ud) || !Number.isFinite(cons)) return null;
  return ud < cons ? "over" : ud > cons ? "under" : null;
}

// Numeric Δ guard
function hasMeaningfulDelta(val, min = 0.25) {
  const n = Number(val);
  return Number.isFinite(n) && Math.abs(n) >= min;
}

// ================================
// 🧪 Filters
// ================================
window.addEventListener("DOMContentLoaded", () => {

  // ===========================================
  // ♻️ Clear All Filters (Restore Full Table)
  // ===========================================
  function clearAllOptimalFilters() {
    console.log("♻️ Clearing all optimal filters...");

    // 🔹 Remove the blue-glow active filter highlight
    document
      .querySelectorAll(".active-filter")
      .forEach((b) => b.classList.remove("active-filter"));

    // 🔹 Reset the global card-sorter filter state
    window.activeOptimalFilter = null;

    // 🔹 Choose best available dataset
    const base =
      Array.isArray(window.fullDataset) && window.fullDataset.length
        ? window.fullDataset
        : Array.isArray(window.lastRenderedData)
        ? window.lastRenderedData
        : [];

    if (!Array.isArray(base) || base.length === 0) {
      console.warn("⚠️ No cached data to restore.");
      const resultsDiv = document.getElementById("results");
      if (resultsDiv)
        resultsDiv.innerHTML = `
          <div class="no-results-message">
            <p>No data available to display.</p>
          </div>`;
      return;
    }

    // 🔹 Restore full unfiltered table
    renderTableInBatches(base, 50, true);

    console.log(`✅ Filters cleared — restored ${base.length} rows.`);
  }

  // 🔹 Make available globally so card-view can call it if needed
  window.clearAllOptimalFilters = clearAllOptimalFilters;
});


  // ===========================================
  // ✅ PrizePicks Optimal — uses true best side + Δ guard
  // ===========================================
  function filterPrizePicksOptimal(data) {
    if (!Array.isArray(data)) return [];
    const seen = new Set();

    const result = data.filter((row) => {
      const key = `${(row.Event || "")}|${(row.Market || "")}|${(row.Description || "")}`;
      if (seen.has(key)) return false;

      const bestSide = (row.BestNoVigSide || "").toLowerCase();
      const ppPoint = Number(row.PrizePickPoint);
      const cons = Number(row.ConsensusPoint);
      const delta = Number(row.PrizePicksDifference);

      if (!bestSide || !Number.isFinite(ppPoint) || !Number.isFinite(cons)) return false;
      if (!Number.isFinite(delta) || Math.abs(delta) < 0.25) return false;

      const favorable =
        (bestSide === "over" && ppPoint < cons) ||
        (bestSide === "under" && ppPoint > cons);

      if (favorable) {
        seen.add(key);
        return true;
      }
      return false;
    });

    console.log(`🎯 PrizePicks Optimal: ${result.length}/${data.length} rows`);
    return result;
  }

  // ===========================================
  // ✅ Underdog Optimal — uses stored BestNoVigSide + Δ guard
  // ===========================================
  function filterUnderdogOptimal(data) {
    if (!Array.isArray(data)) return [];
    const seen = new Set();

    const result = data.filter((row) => {
      const key = `${(row.Event || "")}|${(row.Market || "")}|${(row.Description || "")}`;
      if (seen.has(key)) return false;

      const bestSide = (row.BestNoVigSide || "").toLowerCase();
      const udPoint = Number(row.UnderdogPoint);
      const cons = Number(row.ConsensusPoint);
      const delta = Number(row.UnderdogDifference);

      if (!bestSide || !Number.isFinite(udPoint) || !Number.isFinite(cons)) return false;
      if (!Number.isFinite(delta) || Math.abs(delta) < 0.25) return false;

      const favorable =
        (bestSide === "over" && udPoint < cons) ||
        (bestSide === "under" && udPoint > cons);

      if (favorable) {
        seen.add(key);
        return true;
      }
      return false;
    });

    console.log(`🎯 Underdog Optimal: ${result.length}/${data.length} rows`);
    return result;
  }

  // ===========================================
// ✅ Betr Optimal — uses stored BestNoVigSide + Δ guard
// ===========================================
function filterBetrOptimal(data) {
  if (!Array.isArray(data)) return [];

  const seen = new Set();

  const result = data.filter((row) => {
    const key = `${(row.Event || "")}|${(row.Market || "")}|${(row.Description || "")}`;
    if (seen.has(key)) return false;

    const bestSide = (row.BestNoVigSide || "").toLowerCase();

    const betrPoint = Number(row.BetrPoint);
    const cons = Number(row.ConsensusPoint);
    const delta = Number(row.BetrDifference);

    // Must have valid data
    if (!bestSide || !Number.isFinite(betrPoint) || !Number.isFinite(cons))
      return false;

    // Require meaningful edge
    if (!Number.isFinite(delta) || Math.abs(delta) < 0.25)
      return false;

    const favorable =
      (bestSide === "over" && betrPoint < cons) ||
      (bestSide === "under" && betrPoint > cons);

    if (favorable) {
      seen.add(key);
      return true;
    }

    return false;
  });

  console.log(`🎯 Betr Optimal: ${result.length}/${data.length} rows`);
  return result;
}

  // ===========================================
  // ✅ Fantasy Edge — PrizePicks or Underdog Δ ≥ 0.25
  // ===========================================
  function filterFantasyEdge(data) {
    if (!Array.isArray(data)) return [];
    const out = data.filter((row) => {
      const pp = Number(row.PrizePicksDifference);
      const ud = Number(row.UnderdogDifference);
      return (Number.isFinite(pp) && Math.abs(pp) >= 0.25) ||
             (Number.isFinite(ud) && Math.abs(ud) >= 0.25);
    });
    console.log(`🎯 Fantasy Edge: ${out.length}/${data.length} match`);
    return out;
  }

  // ===========================================
  // ✅ High No-Vig (DOM-only)
  // ===========================================
  function filterHighNoVig(threshold = 54) {
    const table = document.querySelector("#results table");
    if (!table) return;
    const rows = table.querySelectorAll("tbody tr");
    let visibleCount = 0;

    rows.forEach((row) => {
      const bestNoVigCell = Array.from(row.querySelectorAll("td"))
        .find((td) => td.textContent.includes("🧮"));
      const match = bestNoVigCell?.textContent.match(/([\d.]+)%/);
      const pct = match ? parseFloat(match[1]) : NaN;
      const show = Number.isFinite(pct) && pct >= threshold;
      row.style.display = show ? "" : "none";
      if (show) visibleCount++;
    });

    console.log(`💪 High No-Vig ≥ ${threshold}% → showing ${visibleCount} rows`);
  }

  // ===========================================
  // ⚔️ DFS Line Difference (≥ 2.0 points difference)
  // ===========================================
  function filterDfsDifference(data) {
    if (!Array.isArray(data)) return [];

    const filtered = data.filter((row) => {
      const ppRaw = String(row.PrizePickPoint || row.PrizePicksPoint || "").trim();
      const udRaw = String(row.UnderdogPoint || "").trim();
      if (!ppRaw || !udRaw || ppRaw === "—" || udRaw === "—") return false;

      const ppVal = parseFloat(ppRaw);
      const udVal = parseFloat(udRaw);
      if (!Number.isFinite(ppVal) || !Number.isFinite(udVal)) return false;

      return Math.abs(ppVal - udVal) >= 2;
    });

    console.log(`⚔️ DFS Difference (≥2): ${filtered.length}/${data.length} rows`);
    return filtered;
  }
// ===================================================
// 🧮 Filter Button Wiring (Toggle + Reset)
// ===================================================
const filterBtns = {
  prize: document.getElementById("filterPrizePicksOptimalBtn"),
  underdog: document.getElementById("filterUnderdogOptimalBtn"),
  betr: document.getElementById("filterBetrOptimalBtn"),   // ✅ ADD THIS
  fantasy: document.getElementById("filterFantasyEdgeBtn"),
  dfs: document.getElementById("filterDfsDifferenceBtn"),
  high: document.getElementById("filterHighNoVigBtn"),
  clear: document.getElementById("clearOptimalFiltersBtn"),
};


let activeFilter = null;

function clearActiveHighlights() {
  Object.values(filterBtns).forEach((btn) =>
    btn?.classList.remove("active-filter")
  );
}

Object.entries(filterBtns).forEach(([key, btn]) => {
  if (!btn) return;

  btn.addEventListener("click", () => {
      // 🔑 Base must reflect what is currently shown in the table
    const base = Array.isArray(window.lastRenderedData)
  ? window.lastRenderedData
  : [];


    let filtered = [];

    // --------------------------------------
    // Toggle OFF if clicking same filter
    // --------------------------------------
    if (activeFilter === key && key !== "clear") {
      activeFilter = null;
      window.activeOptimalFilter = null;     // ← NEW: disable modal sort
      clearActiveHighlights();
      clearAllOptimalFilters();
      return;
    }

    // --------------------------------------
    // Run the appropriate filter logic
    // --------------------------------------
    switch (key) {
      case "prize":
        filtered = filterPrizePicksOptimal(base);
        window.activeOptimalFilter = "prize";   // ← NEW
        break;

      case "underdog":
        filtered = filterUnderdogOptimal(base);
        window.activeOptimalFilter = "underdog"; // ← NEW
        break;

      case "betr":
        filtered = filterBetrOptimal(base);
        window.activeOptimalFilter = "betr";
        break;


      case "fantasy":
        filtered = filterFantasyEdge(base);
        window.activeOptimalFilter = "pointvalue"; // ← NEW
        break;

      case "dfs":
        filtered = filterDfsDifference(base);
        window.activeOptimalFilter = "dfs";       // ← NEW
        break;

      case "high":
        filterHighNoVig(54);
        clearActiveHighlights();
        btn.classList.add("active-filter");
        activeFilter = key;
        window.activeOptimalFilter = "high";      // ← NEW
        console.log("🔍 Active filter set:", window.activeOptimalFilter);
        return;

      case "clear":
        clearActiveHighlights();
        clearAllOptimalFilters();
        activeFilter = null;
        window.activeOptimalFilter = null;        // ← NEW
        console.log("🔄 Filters reset");
        return;
    }

    // --------------------------------------
    // UI updates after filtering
    // --------------------------------------
    clearActiveHighlights();
    btn.classList.add("active-filter");
    activeFilter = key;

    const resultsDiv = document.getElementById("results");
    const shimmer = document.getElementById("shimmerOverlay");

    if (shimmer) shimmer.classList.remove("hidden");

    const currentScroll = window.scrollY || document.documentElement.scrollTop;

    setTimeout(() => {
      if (filtered.length > 0) {
        rerenderConsensusTable(filtered);
        window.lastRenderedData = filtered;
        console.log(
          `✅ Applied filter "${key}" → ${filtered.length}/${base.length} rows`
        );
        
      } else {
        console.log(
          `⚠️ Filter "${key}" → 0 results (showing no-results message)`
        );
        window.lastRenderedData = [];
        resultsDiv.innerHTML = `
          <div class="no-results-message fade-in">
            <p>⚠️ No props matched your filters.</p>
            <button id="resetFiltersInline" class="reset-inline-btn">Reset Filters</button>
          </div>
        `;

        document
          .getElementById("resetFiltersInline")
          ?.addEventListener("click", clearAllOptimalFilters);
      }

      if (shimmer) setTimeout(() => shimmer.classList.add("hidden"), 250);

      window.scrollTo({ top: currentScroll, behavior: "instant" });
    }, 100);

    console.log("🔍 Active filter set:", window.activeOptimalFilter);
  });
});







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
// ===================================================
// 🔐 Authentication Logic (Fixed Redirect)
// ===================================================

// --- Sign In ---

if (signinForm) {
  signinForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("signin-email")?.value.trim();
    const password = document.getElementById("signin-password")?.value.trim();

    if (!email || !password) {
      alert("Please enter email and password.");
      return;
    }

    signinBtn.classList.add("loading");
    const spinner = document.getElementById("signin-spinner");
    if (spinner) spinner.style.display = "inline-block";

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
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
      if (spinner) spinner.style.display = "none";
    }
  });
}


// --- Sign Up ---
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("signup-email")?.value.trim();
    const pass = document.getElementById("signup-password")?.value.trim();
    const confirm = document.getElementById("signup-confirm")?.value.trim();

    if (!email || !pass || !confirm) {
      alert("Please complete all sign-up fields.");
      return;
    }

    if (pass !== confirm) {
      alert("Passwords do not match!");
      return;
    }

    // these elements may not exist on every page
    if (signupBtn) signupBtn.classList.add("loading");
    const signupSpinner = document.getElementById("signup-spinner");
    if (signupSpinner) signupSpinner.style.display = "inline-block";

    try {
      const { data, error } = await supabase.auth.signUp({ email, password: pass });
      if (error) throw error;

      const user = data.user;
      if (user) {
        await fetch(`${window.API_BASE}/api/create-user`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: user.id, email }),
        });

        alert("✅ Account created! Please check your email to verify your account before signing in.");
      }
    } catch (err) {
      alert(`Sign-up failed: ${err.message}`);
    } finally {
      if (signupBtn) signupBtn.classList.remove("loading");
      if (signupSpinner) signupSpinner.style.display = "none";
    }
  });
} else {
  // Not an error: many pages (like pick-tracker.html) don't include the signup form
  // console.log("ℹ️ No signup form on this page — skipping signup binding.");
}


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
supabase.auth.onAuthStateChange((event, session) => {
  const body = document.body;
  const authContainer = document.getElementById("auth-container");
  const mainContent = document.getElementById("main-content");

  if (session && session.user) {
    console.log("✅ Authenticated user:", session.user.email);
    // Show dashboard, hide login
    body.classList.remove("auth-mode");
    authContainer.style.display = "none";
    mainContent.style.display = "block";
  } else {
    console.log("🚪 User logged out or not authenticated");
    // Hide dashboard completely
    body.classList.add("auth-mode");
    authContainer.style.display = "block";
    mainContent.style.display = "none";
  }
});

// Set initial state on page load
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const body = document.body;

  if (session && session.user) {
    body.classList.remove("auth-mode");
  } else {
    body.classList.add("auth-mode");
  }
})();



// -----------------------------------------------------------
// ⚙️ Enable or Disable Data Buttons
// -----------------------------------------------------------
if (typeof subStatus !== "undefined") {
  if (subStatus === "active") {
    // ✅ Active subscribers can load data
    if (loadBtn) {
      loadBtn.disabled = false;
      loadBtn.style.opacity = "1";
      loadBtn.style.cursor = "pointer";
      loadBtn.title = "";
    }
    // Keep "Refresh" disabled until actual data load occurs
    setRefreshEnabled(false);
  } else {
    // ❌ Inactive / canceled / pending users — disable "Load Data"
    if (loadBtn) {
      loadBtn.disabled = true;
      loadBtn.style.opacity = "0.5";
      loadBtn.style.cursor = "not-allowed";
      loadBtn.title = "Data access available only for active subscribers";
    }
    setRefreshEnabled(false);
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

// ===============================
// 📘 Column Info Modal Controls
// ===============================
const columnInfoModal = document.getElementById("columnInfoModal");
const openInfoBtn = document.getElementById("columnInfoBtn");
const closeColumnInfo = document.getElementById("closeColumnInfo");
const bottomCloseColumnInfo = document.getElementById("bottomCloseColumnInfo");

// Open modal
openInfoBtn?.addEventListener("click", () => {
  columnInfoModal.style.display = "block";
  document.body.style.overflow = "hidden"; // lock background scroll
});

// Close modal (both buttons)
[closeColumnInfo, bottomCloseColumnInfo].forEach(btn =>
  btn?.addEventListener("click", () => {
    columnInfoModal.style.display = "none";
    document.body.style.overflow = "auto";
  })
);

// Close when tapping outside
window.addEventListener("click", (e) => {
  if (e.target === columnInfoModal) {
    columnInfoModal.style.display = "none";
    document.body.style.overflow = "auto";
  }
});

// ==============================
// 📱 Collapsible Table Controls
// ==============================
document.querySelectorAll('.collapse-toggle').forEach((btn) => {
  btn.addEventListener('click', () => {
    const section = btn.closest('.collapsible-section');
    section.classList.toggle('active');
    btn.classList.toggle('open');
  });
});


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

 data.forEach((row, index) => {

  const tr = document.createElement("tr");

  // ✅ CRITICAL FIX — store index for fact check
  tr.dataset.index = index;

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
    // ===================================================
    // 🏟️ FIX: Always include selected game IDs
    // ===================================================
    const params = new URLSearchParams({
      sport,
      date
    });

    // ✅ THIS IS THE IMPORTANT FIX
    if (Array.isArray(selectedGames) && selectedGames.length > 0) {
      selectedGames.forEach(eventId => {
        params.append("event_ids", eventId);
      });
    }

    const res = await fetch(
      `${window.API_BASE}/api/game-lines?${params.toString()}`
    );

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const data = await res.json();
    renderGameTable(data);

  } catch (err) {
    console.error("Error fetching game lines:", err);
    resultsDiv.innerHTML =
      "<p>⚠️ Error loading game line data. Please try again.</p>";
  }
});

}

// ===================================================
// 💬 Support Button + Modal Logic
// ===================================================
document.addEventListener("DOMContentLoaded", () => {
  const supportBtn = document.getElementById("support-btn");
  const supportModal = document.getElementById("supportModal");
  const closeSupportModal = document.getElementById("closeSupportModal");
  const emailSupportBtn = document.getElementById("emailSupportBtn");
  // ===================================================
// 🎯 Pick Tracker — Platform Buttons (NEW)
// ===================================================
// ===================================================
// 🎯 Pick Tracker — Platform Buttons (UPDATED: PrizePicks, Underdog, Betr)
// ===================================================
const ppTrackerBtn = document.getElementById("pickTrackerPrizePicksBtn");
const udTrackerBtn = document.getElementById("pickTrackerUnderdogBtn");
const betrTrackerBtn = document.getElementById("pickTrackerBetrBtn");

function setActiveTrackerButton(activePlatform) {

  if (ppTrackerBtn)
    ppTrackerBtn.classList.toggle(
      "active",
      activePlatform === "prizepicks"
    );

  if (udTrackerBtn)
    udTrackerBtn.classList.toggle(
      "active",
      activePlatform === "underdog"
    );

  if (betrTrackerBtn)
    betrTrackerBtn.classList.toggle(
      "active",
      activePlatform === "betr"
    );

}

if (ppTrackerBtn) {
  ppTrackerBtn.addEventListener("click", () => {

    setPickTrackerPlatform("prizepicks");

    setActiveTrackerButton("prizepicks");

    console.log("🎯 Pick Tracker platform → PrizePicks");

  });
}

if (udTrackerBtn) {
  udTrackerBtn.addEventListener("click", () => {

    setPickTrackerPlatform("underdog");

    setActiveTrackerButton("underdog");

    console.log("🎯 Pick Tracker platform → Underdog");

  });
}

if (betrTrackerBtn) {
  betrTrackerBtn.addEventListener("click", () => {

    setPickTrackerPlatform("betr");

    setActiveTrackerButton("betr");

    console.log("🎯 Pick Tracker platform → Betr");

  });
}



  if (!supportBtn || !supportModal) {
    console.warn("⚠️ Support elements not found in DOM.");
    return;
  }

  // Open modal
  supportBtn.addEventListener("click", () => {
    supportModal.style.display = "flex";
  });

  // Close modal
  closeSupportModal.addEventListener("click", () => {
    supportModal.style.display = "none";
  });

  // Close when clicking outside the modal
  supportModal.addEventListener("click", (e) => {
    if (e.target === supportModal) supportModal.style.display = "none";
  });

  // Launch default mail app
  emailSupportBtn.addEventListener("click", () => {
    const subject = encodeURIComponent("Ben There Bet That! Support Request");
    const body = encodeURIComponent(
      "Hi Ben There Bet That! team,\n\nI'm experiencing an issue with my account or app.\n\nDetails:\n(Please describe your issue here)\n\nThank you!"
    );
    window.location.href = `mailto:bentherebetthat@gmail.com?subject=${subject}&body=${body}`;
    supportModal.style.display = "none";
  });
});




// ===================================================//
// 📇 Tap-to-Card View Modal Logic – Pro Analytics
// ===================================================
function buildPickCardHtml(row) {
  const event = row.Event || "Event";
  const desc = row.Description || "Player Prop";
  const market = row.Market || "";

  // ==============================
  // 🏈 Extract teams for logo display
  // ==============================
  const [homeTeam, awayTeam] = extractTeams(event);
  console.log("📌 Event:", event);
  console.log("➡️ Extracted Teams:", homeTeam, awayTeam);
  console.log("🏈 Home Logo:", homeTeam, getTeamLogoUrl(homeTeam));
  console.log("🏈 Away Logo:", awayTeam, getTeamLogoUrl(awayTeam));
  const homeLogoUrl = homeTeam ? getTeamLogoUrl(homeTeam) : null;
  const awayLogoUrl = awayTeam ? getTeamLogoUrl(awayTeam) : null;


  // ====================================
  // 🔢 Data values
  // ====================================
  const cons = Number(row.ConsensusPoint);
  const ppLine = Number(row.PrizePickPoint);
  const udLine = Number(row.UnderdogPoint);
  const betrLine = Number(row.BetrPoint);
  const ppDiff = Number(row.PrizePicksDifference);
  const udDiff = Number(row.UnderdogDifference);
  const betrDiff = Number(row.BetrDifference);
  const noVig = Number(row.NoVigWinProb);

  const consStr = Number.isFinite(cons) ? cons.toFixed(2) : "—";
  const ppLineStr = Number.isFinite(ppLine) ? ppLine.toFixed(2) : "—";
  const udLineStr = Number.isFinite(udLine) ? udLine.toFixed(2) : "—";
  const betrLineStr = Number.isFinite(betrLine) ? betrLine.toFixed(2) : "—";

  const ppDiffStr = Number.isFinite(ppDiff) ? `${ppDiff.toFixed(2)} pts` : "—";
  const udDiffStr = Number.isFinite(udDiff) ? `${udDiff.toFixed(2)} pts` : "—";
  const betrDiffStr = Number.isFinite(betrDiff) ? `${betrDiff.toFixed(2)} pts` : "—";

  // ====================================
  // 🎯 EV Strength classification
  // ====================================
  const bestSide = (row.BestNoVigSide || "").toLowerCase();
  const bestSideLabel =
    bestSide === "over" ? "Over" :
    bestSide === "under" ? "Under" : null;

  let novigClass = "neutral";
  if (Number.isFinite(noVig)) {
    if (noVig >= 54) novigClass = "strong";
    else if (noVig >= 52) novigClass = "soft";
  }

  const evPct = Number.isFinite(noVig)
    ? Math.max(0, Math.min(noVig, 100))
    : 0;

  const evSideClass = bestSide === "under" ? "under" : "over";

// ====================================
// ⚡ Mismatch logic (FULL — detect ALL platform mismatches)
// ====================================
let mismatchPlatforms = [];

if (
  row.BestNoVigSide &&
  row._PrizePicksSide &&
  row._PrizePicksSide.toLowerCase() !== row.BestNoVigSide.toLowerCase()
) {
  mismatchPlatforms.push("PrizePicks");
}

if (
  row.BestNoVigSide &&
  row._UnderdogSide &&
  row._UnderdogSide.toLowerCase() !== row.BestNoVigSide.toLowerCase()
) {
  mismatchPlatforms.push("Underdog");
}

if (
  row.BestNoVigSide &&
  row._BetrSide &&
  row._BetrSide.toLowerCase() !== row.BestNoVigSide.toLowerCase()
) {
  mismatchPlatforms.push("Betr");
}

// Build final message
let mismatchText = "";

if (mismatchPlatforms.length === 1) {
  mismatchText = `⚡ ${mismatchPlatforms[0]} line opposes the sharp side.`;
}
else if (mismatchPlatforms.length > 1) {
  mismatchText =
    `⚡ ${mismatchPlatforms.join(" & ")} lines oppose the sharp side.`;
}


  // ====================================
  // 🧑 Inline badge formatting
  // ====================================
  const novigLabel = Number.isFinite(noVig)
    ? `${noVig.toFixed(2)}% fair win`
    : "No-vig not available";

  const novigBadgeClasses = `pro-card-novig-badge ${
    novigClass === "strong" ? "strong" :
    novigClass === "soft" ? "soft" : ""
  }`;

  const ppDeltaClass = !Number.isFinite(ppDiff)
    ? "neutral"
    : ppDiff < 0
      ? (bestSide === "over" ? "pos" : "neg")
      : (bestSide === "under" ? "pos" : "neg");

  const udDeltaClass = !Number.isFinite(udDiff)
    ? "neutral"
    : udDiff < 0
      ? (bestSide === "over" ? "pos" : "neg")
      : (bestSide === "under" ? "pos" : "neg");

  const betrDeltaClass = !Number.isFinite(betrDiff)
  ? "neutral"
  : betrDiff < 0
    ? (bestSide === "over" ? "pos" : "neg")
    : (bestSide === "under" ? "pos" : "neg");


  const evLabelText = bestSideLabel
    ? `Model leans ${bestSideLabel}${Number.isFinite(noVig) ? ` · ${noVig.toFixed(1)}%` : ""}`
    : (Number.isFinite(noVig) ? `Model edge · ${noVig.toFixed(1)}%` : "Model edge");
// ====================================
// 🧩 FINAL HTML
// ====================================
return `
  <article class="pro-pick-card">

    <header class="pro-card-hero">

      <!-- Player + Event Details -->
      <div class="pro-card-header-text">
        <div class="pro-card-player-name">${desc}</div>
        <div class="pro-card-event">${event}</div>
        <div class="pro-card-market">${market}</div>
      </div>

      <!-- ⭐ TEAM LOGOS -->
      <div class="pro-card-team-logos">
        ${
          homeLogoUrl
            ? `<img 
                 src="${homeLogoUrl}" 
                 alt="${homeTeam} logo"
                 class="pro-card-team-logo card-img-fade"
                 loading="lazy"
                 onload="this.classList.add('loaded')"
               />`
            : ""
        }
        ${
          awayLogoUrl
            ? `<img 
                 src="${awayLogoUrl}" 
                 alt="${awayTeam} logo"
                 class="pro-card-team-logo card-img-fade"
                 loading="lazy"
                 onload="this.classList.add('loaded')"
               />`
            : ""
        }
      </div>

    </header>

    <!-- EV Row -->
    <section class="pro-card-ev-row">
      <div class="pro-ev-label"><strong>${evLabelText}</strong></div>
      <div class="pro-ev-bar-shell">
        <div class="pro-ev-bar-fill ${evSideClass}" style="width: ${evPct}%;"></div>
      </div>
    </section>

    <!-- Metrics -->
    <section class="pro-card-metrics">

      <div class="pro-card-metric-row">
        <span class="pro-metric-label">Consensus</span>
        <span class="pro-metric-value">${consStr}</span>
        <span class="pro-metric-delta">
          <span class="${novigBadgeClasses}">${novigLabel}</span>
        </span>
      </div>

      <!-- PrizePicks (default highlighted) -->
      <div
        class="pro-card-metric-row platform-row prizepicks active-platform"
        data-platform="prizepicks"
      >
        <span class="pro-metric-label">PrizePicks</span>
        <span class="pro-metric-value">${ppLineStr}</span>
        <span class="pro-metric-delta ${ppDeltaClass}">${ppDiffStr}</span>
      </div>

      <!-- Underdog -->
      <div
        class="pro-card-metric-row platform-row underdog"
        data-platform="underdog"
      >
        <span class="pro-metric-label">Underdog</span>
        <span class="pro-metric-value">${udLineStr}</span>
        <span class="pro-metric-delta ${udDeltaClass}">${udDiffStr}</span>
      </div>
      
      <!-- Betr -->
      <div
        class="pro-card-metric-row platform-row betr"
        data-platform="betr"
      >     
        <span class="pro-metric-label">Betr</span>
        <span class="pro-metric-value">${betrLineStr}</span>
        <span class="pro-metric-delta ${betrDeltaClass}">${betrDiffStr}</span>
      </div>

      
    </section>

    ${mismatchText ? `<footer class="pro-card-footnote">${mismatchText}</footer>` : ""}

    <!-- Pick Tracker Button -->
    <button
      class="tap-pick-btn"
      data-event="${row.Event}"
      data-player="${row.Description}"
      data-market="${row.Market}"
    >
      ➕ Add to Pick Tracker
    </button>

  </article>
`;

}
// ===================================================
// 🧠 Deduplicate card rows — prefer model-lean rows
// ===================================================
function dedupeCardRowsPreferModel(rows) {
  const map = new Map();

  rows.forEach(row => {
    const key = [
      row.Event,
      row.Description,
      row.Market
    ].join("|").toLowerCase();

    const hasModelLean =
      row.BestNoVigSide &&
      row.BestNoVigSide !== "" &&
      Number.isFinite(row.NoVigWinProb);

    if (!map.has(key)) {
      map.set(key, row);
      return;
    }

    const existing = map.get(key);
    const existingHasLean =
      existing.BestNoVigSide &&
      existing.BestNoVigSide !== "" &&
      Number.isFinite(existing.NoVigWinProb);

    // ✅ Prefer rows WITH model lean
    if (hasModelLean && !existingHasLean) {
      map.set(key, row);
    }
  });

  return Array.from(map.values());
}

// ===================================================
// 🎨 Sync platform highlight inside card modal
// ===================================================
function syncCardPlatformHighlight() {
  const content = document.getElementById("cardViewContent");
  if (!content) return;

  const activePlatform = window.pickTracker.platform || "prizepicks";

  content.querySelectorAll(".platform-row").forEach(row => {
    row.classList.remove("active-platform", "underdog-active");
  });

  content
    .querySelectorAll(`.platform-row.${activePlatform}`)
    .forEach(row => {
      row.classList.add("active-platform");
      if (activePlatform === "underdog") {
        row.classList.add("underdog-active");
      }
    });
}


// ===================================================
// 📇 Open the modal and render cards
// ===================================================
function renderCardViewModal() {
  const modal = document.getElementById("cardViewModal");
  const content = document.getElementById("cardViewContent");
  const closeBtn = document.getElementById("cardCloseBtn");

  if (!modal || !content) return;

  // 🚫 DO NOT FALL BACK when filters return zero rows
    const base = Array.isArray(window.lastRenderedData)
      ? window.lastRenderedData
      : [];

      if (!base.length) {
  content.innerHTML = `
    <div style="padding:24px;text-align:center;color:#666;">
      ⚠️ No props matched your filters.
    </div>
  `;
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";
  if (closeBtn) closeBtn.classList.remove("hidden");
  return;
}



  if (!base.length) {
    content.innerHTML = `<p>No data available. Load a sport + markets first.</p>`;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    if (closeBtn) closeBtn.classList.remove("hidden");
    return;
  }

  // 🧠 Sort first
const sortedRows = getSortedCardRows(base);

// 🧹 Deduplicate — keep only model-lean cards
const dedupedRows = dedupeCardRowsPreferModel(sortedRows);

// ✂️ Limit cards
const topN = dedupedRows.slice(0, 40);


  content.innerHTML = topN.map(buildPickCardHtml).join("");

  bindCardPlatformToggles();
  updateCardPlatformHighlights(); // ⭐ default PrizePicks highlight


// ===================================================
// 🎨 Sync platform highlight inside card modal
// ===================================================
function syncCardPlatformHighlight() {
  const content = document.getElementById("cardViewContent");
  if (!content) return;

  const activePlatform = window.pickTracker.platform || "prizepicks";

  content.querySelectorAll(".platform-row").forEach(row => {
    row.classList.remove("active-platform", "underdog-active");
  });

  content
    .querySelectorAll(`.platform-row.${activePlatform}`)
    .forEach(row => {
      row.classList.add("active-platform");
      if (activePlatform === "underdog") {
        row.classList.add("underdog-active");
      }
    });
}


  // ===================================================
// 🎨 Highlight active platform in cards (default)
// ===================================================
const activePlatform = window.pickTracker.platform || "prizepicks";

content.querySelectorAll(".platform-row").forEach(row => {
  row.classList.remove("active-platform", "underdog");
});

content.querySelectorAll(`.platform-row.${activePlatform}`).forEach(row => {
  row.classList.add("active-platform");
  if (activePlatform === "underdog") {
    row.classList.add("underdog");
  }
});


// ===================================================
// 🧠 Wire Pick Tracker buttons inside Tap-to-Card view
// ===================================================

const pickButtons = content.querySelectorAll(".tap-pick-btn");

pickButtons.forEach((btn, index) => {

  const row = topN[index];

  const platform = window.pickTracker.platform;

  let selectedLine = null;

  if (platform === "prizepicks") {

    selectedLine =
      row.PrizePickPoint ??
      row.UnderdogPoint ??
      row.BetrPoint ??
      row.ConsensusPoint;

  }
  else if (platform === "underdog") {

    selectedLine =
      row.UnderdogPoint ??
      row.PrizePickPoint ??
      row.BetrPoint ??
      row.ConsensusPoint;

  }
  else if (platform === "betr") {

    selectedLine =
      row.BetrPoint ??
      row.PrizePickPoint ??
      row.UnderdogPoint ??
      row.ConsensusPoint;

  }
  else {

    selectedLine =
      row.PrizePickPoint ??
      row.UnderdogPoint ??
      row.BetrPoint ??
      row.ConsensusPoint;

  }

  const pick = {

    sport: selectedSport,
    event: row.Event,
    game_date: dateInput?.value || null,
    player: row.Description,
    market: row.Market,
    outcome: getOutcomeFromRow(row),

    line: Number(selectedLine),

    platform: platform

  };

  const pickKey = getPickTrackerKey(pick);

  function syncButtonState() {

    const selected =
      window.pickTracker.selections.has(pickKey);

    btn.textContent =
      selected
        ? "✔ Picked"
        : "➕ Add to Pick Tracker";

    btn.classList.toggle("picked", selected);

  }

  btn.addEventListener("click", (e) => {

    e.stopPropagation();

    togglePickTrackerSelection(pick);

    syncButtonState();

  });

  syncButtonState();

});



  // Show modal
  modal.classList.remove("hidden");
  document.body.style.overflow = "hidden";

  // ⭐ Show floating close button
  if (closeBtn) {
    closeBtn.classList.remove("hidden");
  }
}






// ===================================================
// ❌ Close the modal
// ===================================================
function closeCardViewModal() {
  const modal = document.getElementById("cardViewModal");
  const closeBtn = document.getElementById("cardCloseBtn");
  if (!modal) return;

  modal.classList.add("hidden");
  document.body.style.overflow = "";

  // ⭐ Hide floating close button
  if (closeBtn) {
    closeBtn.classList.add("hidden");
  }
}

// ===================================================
// ⭐ Register floating close button — SINGLE listener
// ===================================================
const cardCloseBtn = document.getElementById("cardCloseBtn");
if (cardCloseBtn) {
  cardCloseBtn.addEventListener("click", closeCardViewModal);
}

// ===================================================
// 🎛 Event Wiring + Initial Load
// ===================================================
document.addEventListener("DOMContentLoaded", () => {

  // Load team logos (team_logos.json) and player photos if enabled
  loadMetaMaps();

  // Tap-to-card modal button
  const tapBtn = document.getElementById("tapToCardBtn");
  const modal = document.getElementById("cardViewModal");

  if (tapBtn) {
    tapBtn.addEventListener("click", () => renderCardViewModal());
  }

  // Close modal when clicking outside content
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeCardViewModal();
    });
  }

  // Escape key closes modal
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCardViewModal();
  });
});





// ===================================================
// 🧩 Diagnostic Startup Check — Verify Script Loading
// ===================================================

// Confirm script executed
console.log("✅ script.js loaded and running!");

// Check if DOM and key elements are available
document.addEventListener("DOMContentLoaded", () => {
  const prizeBtn = document.getElementById("filterPrizePicksOptimalBtn");
  const underdogBtn = document.getElementById("filterUnderdogOptimalBtn");
  const resultsDiv = document.getElementById("results");

  console.group("🔍 DOM Element Diagnostic");
  console.log("PrizePicks Button:", prizeBtn ? "✅ Found" : "❌ Missing");
  console.log("Underdog Button:", underdogBtn ? "✅ Found" : "❌ Missing");
  console.log("Results Div:", resultsDiv ? "✅ Found" : "❌ Missing");
  console.groupEnd();

  // Confirm your JS is allowed to run (no blocking errors)
  console.log("🧮 Checking if filters initialized...");
  if (window.initializeOptimalFilters) {
    console.log("✅ Filter logic function exists and ready.");
  } else {
    console.warn("⚠️ Filter logic function not found — check filter script block.");
  }

  // Simple sanity check for data
  if (window.lastRenderedData) {
    console.log(`📊 lastRenderedData loaded (${window.lastRenderedData.length} rows)`);
  } else {
    console.warn("⚠️ lastRenderedData not yet populated — data may not have loaded.");
  }
});

// ===================================================
// 🎯 Pick Tracker Platform Button Wiring (STEP 3)
// ===================================================
document.addEventListener("DOMContentLoaded", () => {
  const prizeBtn = document.getElementById("pickTrackerPrizePicksBtn");
  const dogBtn = document.getElementById("pickTrackerUnderdogBtn");

  if (!prizeBtn || !dogBtn) {
    console.warn("⚠️ Pick Tracker platform buttons not found");
    return;
  }

  prizeBtn.addEventListener("click", () => {
    setPickTrackerPlatform("prizepicks");
  });

  dogBtn.addEventListener("click", () => {
    setPickTrackerPlatform("underdog");
  });

  // Initial visual + state sync
  setPickTrackerPlatform(
    window.pickTracker?.platform || "prizepicks"
  );
});


// ===================================================
// PICK TRACKER LOGIC
// ===================================================

const trackerBtn = document.getElementById("openPickTrackerBtn");
if (trackerBtn) {
  trackerBtn.addEventListener("click", () => {
    window.location.href = "pick-tracker.html";
  });
}