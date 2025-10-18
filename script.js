// ===================================================
// ✅ Supabase Initialization
// ===================================================
const SUPABASE_URL = "https://pkvkezbakcvrhygowogx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdmtlemJha2N2cmh5Z293b2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NjIzMDQsImV4cCI6MjA3NjEzODMwNH0.6C4WQvS8I2slGc7vfftqU7vOkIsryfY7-xwHa7uZj_g";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const API_BASE = "https://bentherebetthat-api.onrender.com";

// ===================================================
// 1️⃣ DOM References
// ===================================================
const authContainer = document.getElementById("auth-container");
const signinForm = document.getElementById("signin-form");
const signupForm = document.getElementById("signup-form");
const signoutBtn = document.getElementById("signout-btn");
const forgotBtn = document.getElementById("forgot-btn");
const authMessage = document.getElementById("auth-message");

const mainContent = document.getElementById("main-content");
const subscribeBtn = document.getElementById("subscribeBtn");
const subscriptionStatus = document.getElementById("subscription-status");

const sportButtons = document.querySelectorAll("#main-content .sport-buttons button");
const nflMarkets = document.getElementById("nflMarkets");
const nbaMarkets = document.getElementById("nbaMarkets");
const mlbMarkets = document.getElementById("mlbMarkets");

const dateInput = document.getElementById("dateInput");
const loadDataBtn = document.getElementById("loadData");
const stopBtn = document.getElementById("stopBtn");
const refreshBtn = document.getElementById("refreshBtn");

const resultsDiv = document.getElementById("results");
const loadingDiv = document.getElementById("loading");
const progressText = document.getElementById("progressText");

const selectAllNFL = document.getElementById("selectAllNFL");
const deselectAllNFL = document.getElementById("deselectAllNFL");
const selectAllNBA = document.getElementById("selectAllNBA");
const deselectAllNBA = document.getElementById("deselectAllNBA");
const selectAllMLB = document.getElementById("selectAllMLB");
const deselectAllMLB = document.getElementById("deselectAllMLB");

let selectedSport = null;
let selectedMarkets = [];
let currentController = null;
let subscribeListenerAdded = false;

// ===================================================
// 2️⃣ Authentication & Subscription Initialization
// ===================================================

checkUser();

async function checkUser() {
  const { data, error } = await supabaseClient.auth.getUser();
  const user = data?.user;

  if (!user) {
    authContainer.style.display = "flex";
    mainContent.style.display = "none";
    signoutBtn.style.display = "none";
    return;
  }

  authContainer.style.display = "none";
  mainContent.style.display = "block";
  signoutBtn.style.display = "inline-block";

  await createUserIfNeeded(user);

  const res = await fetch(`${API_BASE}/api/check-subscription?user_id=${user.id}`);
  const dataSub = await res.json();
  const status = dataSub.subscription_status || "unknown";
  subscriptionStatus.textContent = `Subscription: ${status}`;

  if (status !== "active") {
    alert("⚠️ Subscription inactive — please subscribe.");
    subscribeBtn.style.display = "inline-block";
    initSubscription(user.id);
    return;
  }

  selectedSport = "americanfootball_nfl";
  sportButtons.forEach((btn) => {
    btn.classList.toggle("active", btn.getAttribute("data-sport") === selectedSport);
  });

  nflMarkets.style.display = "block";
  nbaMarkets.style.display = "none";
  if (mlbMarkets) mlbMarkets.style.display = "none";

  resetAllMarkets();
}

// 🔹 Sign In
signinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signin-email").value;
  const password = document.getElementById("signin-password").value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) authMessage.textContent = error.message;
  else {
    authMessage.textContent = "";
    checkUser();
  }
});

// 🔹 Sign Up
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: "https://bentherebetthat.netlify.app/verify.html" },
  });
  if (error) authMessage.textContent = error.message;
  else
    authMessage.textContent =
      "✅ Sign-up successful! Please check your email to verify your account.";
});

// 🔹 Log Out
signoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  localStorage.clear();
  authContainer.style.display = "flex";
  mainContent.style.display = "none";
  signoutBtn.style.display = "none";
});

// 🔹 Forgot Password
forgotBtn.addEventListener("click", async () => {
  const email = prompt("Enter your email for password reset:");
  if (!email) return;
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
    redirectTo: "https://bentherebetthat.com/reset.html",
  });
  if (error) alert(error.message);
  else alert("📩 Check your email for a password reset link.");
});

// ===================================================
// 3️⃣ Subscription Logic
// ===================================================
async function createUserIfNeeded(user) {
  try {
    await fetch(`${API_BASE}/api/create-user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: user.id, email: user.email }),
    });
  } catch (err) {
    console.error("Error creating user:", err);
  }
}

function initSubscription(userId) {
  if (subscribeListenerAdded) return;
  subscribeBtn.addEventListener("click", async () => {
    try {
      const priceId = "price_1SIzajExPCuJMaCrq8ADxMmx";
      const res = await fetch(`${API_BASE}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, price_id: priceId }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("Failed to create checkout session");
    } catch (err) {
      console.error("Error initiating subscription:", err);
      alert("Error initiating subscription");
    }
  });
  subscribeListenerAdded = true;
}

// ===================================================
// 4️⃣ Market Button Logic
// ===================================================
function marketButtonsIn(container) {
  return container ? Array.from(container.querySelectorAll("button[data-market]")) : [];
}

function setActiveFor(buttons, active = true) {
  buttons.forEach((b) =>
    active ? b.classList.add("active") : b.classList.remove("active")
  );
}

function updateSelectedMarkets() {
  const activeBtns = Array.from(
    document.querySelectorAll("#main-content .market-list button.active[data-market]")
  );
  selectedMarkets = activeBtns.map((b) => b.getAttribute("data-market"));
}

function resetAllMarkets() {
  document
    .querySelectorAll("#main-content .market-list button[data-market]")
    .forEach((b) => b.classList.remove("active"));
  selectedMarkets = [];
}

sportButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    sportButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    selectedSport = btn.getAttribute("data-sport");
    resultsDiv.innerHTML = "";
    progressText.textContent = "";
    resetAllMarkets();

    nflMarkets.style.display =
      selectedSport === "americanfootball_nfl" || selectedSport === "americanfootball_ncaaf"
        ? "block"
        : "none";
    nbaMarkets.style.display = selectedSport === "basketball_nba" ? "block" : "none";
    if (mlbMarkets)
      mlbMarkets.style.display = selectedSport === "baseball_mlb" ? "block" : "none";
  });
});

// Market Buttons
document.querySelectorAll("#main-content .market-list").forEach((container) => {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-market]");
    if (!btn) return;
    btn.classList.toggle("active");
    updateSelectedMarkets();
  });
});

// Select/Deselect All
if (selectAllNFL) selectAllNFL.addEventListener("click", () => { setActiveFor(marketButtonsIn(nflMarkets), true); updateSelectedMarkets(); });
if (deselectAllNFL) deselectAllNFL.addEventListener("click", () => { setActiveFor(marketButtonsIn(nflMarkets), false); updateSelectedMarkets(); });
if (selectAllNBA) selectAllNBA.addEventListener("click", () => { setActiveFor(marketButtonsIn(nbaMarkets), true); updateSelectedMarkets(); });
if (deselectAllNBA) deselectAllNBA.addEventListener("click", () => { setActiveFor(marketButtonsIn(nbaMarkets), false); updateSelectedMarkets(); });
if (selectAllMLB && mlbMarkets) selectAllMLB.addEventListener("click", () => { setActiveFor(marketButtonsIn(mlbMarkets), true); updateSelectedMarkets(); });
if (deselectAllMLB && mlbMarkets) deselectAllMLB.addEventListener("click", () => { setActiveFor(marketButtonsIn(mlbMarkets), false); updateSelectedMarkets(); });

// ===================================================
// 5️⃣ Load Data + Render
// ===================================================
async function loadData() {
  if (!selectedSport || selectedMarkets.length === 0) {
    alert("Select sport & markets first");
    return;
  }
  const date = dateInput.value;
  if (!date) {
    alert("Select a date");
    return;
  }

  resultsDiv.innerHTML = "";
  progressText.textContent = "";
  loadingDiv.style.display = "block";

  if (currentController) currentController.abort();
  currentController = new AbortController();
  const signal = currentController.signal;

  try {
    progressText.textContent = "Fetching all data from server...";
    const params = new URLSearchParams();
    params.append("sport", selectedSport);
    params.append("date", date);
    selectedMarkets.forEach((m) => params.append("markets", m));

    const res = await fetch(`${API_BASE}/api/data?${params.toString()}`, { signal });
    const allData = await res.json();

    if (!Array.isArray(allData) || allData.length === 0) {
      progressText.textContent = "⚠️ No data found.";
      loadingDiv.style.display = "none";
      return;
    }

    let uniqueData = allData;
    if (
      selectedSport === "americanfootball_nfl" ||
      selectedSport === "americanfootball_ncaaf"
    ) {
      const map = {};
      allData.forEach((r) => {
        const key = `${r.Event}|${r.Market}|${r.Description}`;
        if (!map[key]) map[key] = r;
      });
      uniqueData = Object.values(map);
    }

    if (selectedSport === "baseball_mlb") {
      const map = {};
      uniqueData.forEach((r) => {
        const key = `${r.Event}|${r.Market}|${r.Description}`;
        const price = parseFloat(r.FanduelPrice ?? Infinity);
        if (!map[key] || price < parseFloat(map[key].FanduelPrice ?? Infinity))
          map[key] = r;
      });
      uniqueData = Object.values(map);
    }

    await renderTableInBatches(uniqueData, 50);
  } catch (err) {
    if (err.name === "AbortError")
      progressText.textContent = "⚠️ Loading stopped by user";
    else resultsDiv.innerHTML = `<p style="color:red;">${err.message}</p>`;
  } finally {
    loadingDiv.style.display = "none";
    currentController = null;
  }
}

loadDataBtn.addEventListener("click", loadData);
refreshBtn.addEventListener("click", () => loadDataBtn.click());
stopBtn.addEventListener("click", () => { if (currentController) currentController.abort(); });

// ===================================================
// 6️⃣ Render Table
// ===================================================
async function renderTableInBatches(data, batchSize = 50) {
  if (!data || !Array.isArray(data)) return;
  resultsDiv.innerHTML = "";
  const table = document.createElement("table");
  table.innerHTML =
    "<thead><tr><th>Event</th><th>Market</th><th>Description</th><th>Outcome</th><th>FanduelPoint</th><th>PrizePickPoint</th><th>UnderdogPoint</th><th>PrizePicksDifference</th><th>UnderdogDifference</th></tr></thead>";
  const tbody = document.createElement("tbody");
  table.appendChild(tbody);
  resultsDiv.appendChild(table);

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const tr = document.createElement("tr");
    const fanduel = parseFloat(r.FanduelPoint ?? r.FanduelPrice ?? null);
    const prize = parseFloat(r.PrizePickPoint ?? null);
    const underdog = parseFloat(r.UnderdogPoint ?? null);

    const prizeDiff =
      fanduel != null && prize != null ? Math.abs(fanduel - prize) : null;
    const underdogDiff =
      fanduel != null && underdog != null ? Math.abs(fanduel - underdog) : null;

    tr.innerHTML = `
      <td>${r.Event}</td>
      <td>${r.Market}</td>
      <td>${r.Description}</td>
      <td>${r.Outcome ?? ""}</td>
      <td>${r.FanduelPoint ?? ""}</td>
      <td>${r.PrizePickPoint ?? ""}</td>
      <td>${r.UnderdogPoint ?? ""}</td>
      <td>${prizeDiff ?? ""}</td>
      <td>${underdogDiff ?? ""}</td>`;
    tbody.appendChild(tr);

    if (i % batchSize === 0)
      await new Promise((r) => setTimeout(r, 0));
  }

  progressText.textContent = `✅ Rendered ${data.length} rows successfully.`;
}
