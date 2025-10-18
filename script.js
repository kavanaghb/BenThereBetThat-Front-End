// ===================================================
// ✅ Supabase Initialization
// ===================================================
const SUPABASE_URL = "https://pkvkezbakcvrhygowogx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdmtlemJha2N2cmh5Z293b2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1NjIzMDQsImV4cCI6MjA3NjEzODMwNH0.6C4WQvS8I2slGc7vfftqU7vOkIsryfY7-xwHa7uZj_g"; 
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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

// 🔹 Check user on page load
checkUser();

async function checkUser() {
  console.log("🔍 Checking user session...");
  const { data, error } = await supabaseClient.auth.getUser();
  const user = data?.user;

  if (!user) {
    console.log("❌ No user found — showing login");
    authContainer.style.display = "flex";
    mainContent.style.display = "none";
    signoutBtn.style.display = "none";
    return;
  }

  console.log("✅ Logged in as:", user.email);

  // Show dashboard while checking subscription
  authContainer.style.display = "none";
  mainContent.style.display = "block";
  signoutBtn.style.display = "inline-block";

  await createUserIfNeeded(user);

  console.log("🌐 Checking subscription status...");
  const res = await fetch(`${API_BASE}/api/check-subscription?user_id=${user.id}`);
  const dataSub = await res.json();
  console.log("📦 Subscription API Response:", dataSub);

  const status = dataSub.subscription_status || "unknown";
  subscriptionStatus.textContent = `Subscription: ${status}`;

  if (status !== "active") {
    alert("⚠️ Subscription inactive — stopping loop.");
    // Just stop here instead of redirecting
    return;
  }

  console.log("✅ Subscription active — loading dashboard");
  // Continue with dashboard setup
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
  if (error) {
    authMessage.textContent = error.message;
  } else {
    authMessage.textContent = "";
    checkUser();
  }
});

// 🔹 Sign Up
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;
  const { error } = await supabaseClient.auth.signUp({ email, password });
  if (error) {
    authMessage.textContent = error.message;
  } else {
    authMessage.textContent = "✅ Sign-up successful! Please check your email to verify your account.";
  }
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
  const { error } = await supabaseClient.auth.resetPasswordForEmail(email);
  if (error) alert(error.message);
  else alert("📩 Check your email for a password reset link.");
});


// ===================================================
// 3️⃣ Subscription Logic (Stripe + Supabase Integration)
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

// 🔹 Check if user has active subscription
async function checkSubscriptionAndShowButton(userId) {
  try {
    const res = await fetch(`${API_BASE}/check-subscription?user_id=${userId}`);
    const data = await res.json();

    const status = data.subscription_status || "inactive";
    subscriptionStatus.textContent = `Subscription: ${status}`;

    if (status !== "active") {
      subscribeBtn.style.display = "inline-block";
      initSubscription(userId);
    } else {
      subscribeBtn.style.display = "none";
    }
  } catch (err) {
    console.error("Subscription check failed:", err);
    subscriptionStatus.textContent = "Subscription: unknown";
    subscribeBtn.style.display = "inline-block";
  }
}

// 🔹 Initialize Stripe checkout
function initSubscription(userId) {
  if (subscribeListenerAdded) return;

  subscribeBtn.addEventListener("click", async () => {
    try {
      const priceId = "price_1SIzajExPCuJMaCrq8ADxMmx"; // Replace with your Price ID
      const res = await fetch(`${API_BASE}/create-checkout-session`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, price_id: priceId }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Failed to create checkout session");
      }
    } catch (err) {
      console.error("Error initiating subscription:", err);
      alert("Error initiating subscription");
    }
  });

  subscribeListenerAdded = true;
}

// ===================================================
// 3️⃣ Market Button Logic
// ===================================================
function marketButtonsIn(container) {
  if (!container) return [];
  return Array.from(container.querySelectorAll("button[data-market]"));
}

function setActiveFor(buttons, active = true) {
  buttons.forEach(b => active ? b.classList.add("active") : b.classList.remove("active"));
}

function updateSelectedMarkets() {
  const activeBtns = Array.from(document.querySelectorAll("#main-content .market-list button.active[data-market]"));
  selectedMarkets = activeBtns.map(b => b.getAttribute("data-market"));
}

function resetAllMarkets() {
  document.querySelectorAll("#main-content .market-list button[data-market]").forEach(b => b.classList.remove("active"));
  selectedMarkets = [];
}

// Sport button logic
sportButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    sportButtons.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    selectedSport = btn.getAttribute("data-sport");
    resultsDiv.innerHTML = "";
    progressText.textContent = "";
    resetAllMarkets();

    // Show/hide market containers
    nflMarkets.style.display = (selectedSport === "americanfootball_nfl" || selectedSport === "americanfootball_ncaaf") ? "block" : "none";
    nbaMarkets.style.display = (selectedSport === "basketball_nba") ? "block" : "none";
    if (mlbMarkets) mlbMarkets.style.display = (selectedSport === "baseball_mlb") ? "block" : "none";

    // Update header text
    if (selectedSport === "americanfootball_nfl" || selectedSport === "americanfootball_ncaaf") {
      const h3 = nflMarkets.querySelector("h3");
      if (h3) h3.textContent = (selectedSport === "americanfootball_nfl") ? "NFL Markets" : "NCAAF Markets";
    }
  });
});

// Market button click behavior
document.querySelectorAll("#main-content .market-list").forEach(container => {
  container.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-market]");
    if (!btn) return;
    btn.classList.toggle("active");
    updateSelectedMarkets();
  });
});

// Select/Deselect All handlers
if (selectAllNFL) selectAllNFL.addEventListener("click", () => { setActiveFor(marketButtonsIn(nflMarkets), true); updateSelectedMarkets(); });
if (deselectAllNFL) deselectAllNFL.addEventListener("click", () => { setActiveFor(marketButtonsIn(nflMarkets), false); updateSelectedMarkets(); });

if (selectAllNBA) selectAllNBA.addEventListener("click", () => { setActiveFor(marketButtonsIn(nbaMarkets), true); updateSelectedMarkets(); });
if (deselectAllNBA) deselectAllNBA.addEventListener("click", () => { setActiveFor(marketButtonsIn(nbaMarkets), false); updateSelectedMarkets(); });

if (selectAllMLB && mlbMarkets) selectAllMLB.addEventListener("click", () => { setActiveFor(marketButtonsIn(mlbMarkets), true); updateSelectedMarkets(); });
if (deselectAllMLB && mlbMarkets) deselectAllMLB.addEventListener("click", () => { setActiveFor(marketButtonsIn(mlbMarkets), false); updateSelectedMarkets(); });

// ===================================================
// 4️⃣ Load Data & Render Table
// ===================================================
// loadData(), renderTableInBatches(), sortTableByColumn(), exportTableToCSV() functions go here
// Add your existing implementations

// ----------------------------
// Load Data
// ----------------------------
async function loadData() {
  if (!selectedSport || selectedMarkets.length === 0) { alert("Select sport & markets"); return; }
  const date = dateInput.value;
  if (!date) { alert("Select date"); return; }

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
    selectedMarkets.forEach(m => params.append("markets", m));

    const res = await fetch(`${API_BASE}/api/data?${params.toString()}`, { signal });text
    const allData = await res.json();
    if (!Array.isArray(allData) || allData.length === 0) {
      progressText.textContent = "⚠️ No data found for selected sport/date.";
      loadingDiv.style.display = "none";
      return;
    }

    // ----------------------------
    // Deduplicate for NFL/NCAAF
    // ----------------------------
    let uniqueData = allData;
    if (selectedSport === "americanfootball_nfl" || selectedSport === "americanfootball_ncaaf") {
      const map = {};
      allData.forEach(r => {
        const key = `${r.Event}|${r.Market}|${r.Description}`;
        if (!map[key]) map[key] = r;
      });
      uniqueData = Object.values(map);
    }

    // ----------------------------
    // For MLB, keep row with lowest FanduelPrice per Outcome
    // ----------------------------
    if (selectedSport === "baseball_mlb") {
      const map = {};
      uniqueData.forEach(r => {
        const key = `${r.Event}|${r.Market}|${r.Description}`;
        const price = parseFloat(r.FanduelPrice ?? Infinity);
        if (!map[key] || price < parseFloat(map[key].FanduelPrice ?? Infinity)) map[key] = r;
      });
      uniqueData = Object.values(map);
    }

    await renderTableInBatches(uniqueData, 50);
  } catch (err) {
    if (err.name === "AbortError") progressText.textContent = "⚠️ Loading stopped by user";
    else resultsDiv.innerHTML = `<p style="color:red;">${err.message}</p>`;
  } finally {
    loadingDiv.style.display = "none";
    currentController = null;
  }
}

loadDataBtn.addEventListener("click", loadData);
refreshBtn.addEventListener("click", () => loadDataBtn.click());
stopBtn.addEventListener("click", () => { if (currentController) currentController.abort(); });

// ----------------------------
// Render Table
// ----------------------------
async function renderTableInBatches(data, batchSize = 50) {
  resultsDiv.innerHTML = "";
  const table = document.createElement("table");
  table.classList.add("odds-table");

  // Columns - UnderdogPoint moved left
  let columns = ["Event", "Market", "Outcome", "Description", "FanduelPoint", "PrizePickPoint", "UnderdogPoint", "PrizePicksDifference", "UnderdogDifference"];
  const hideOutcome = selectedSport === "americanfootball_nfl" || selectedSport === "americanfootball_ncaaf";
  if (hideOutcome) columns = ["Event", "Market", "Description", "FanduelPoint", "PrizePickPoint", "UnderdogPoint", "PrizePicksDifference", "UnderdogDifference"];
  if (selectedSport === "baseball_mlb") columns = ["Event","Market","Outcome","Description","FanduelPrice","FanduelPoint","PrizePickPoint","UnderdogPoint","PrizePicksDifference","UnderdogDifference"];

  // Table header
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");
  columns.forEach(col => {
    const th = document.createElement("th");
    th.textContent = col;
    th.style.cursor = "pointer";
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);
  resultsDiv.appendChild(table);

  // Default sort by PrizePicksDifference descending
  let sortedData = [...data];
  sortedData.sort((a,b) => (parseFloat(b.FanduelPoint ?? b.FanduelPrice ?? 0) - parseFloat(b.PrizePickPoint ?? 0)) -
                            (parseFloat(a.FanduelPoint ?? a.FanduelPrice ?? 0) - parseFloat(a.PrizePickPoint ?? 0)));

  for (let i=0; i<sortedData.length; i+=batchSize) {
    const batch = sortedData.slice(i, i+batchSize);
    batch.forEach(row => {
      const tr = document.createElement("tr");

      const fanduel = parseFloat(row.FanduelPoint ?? row.FanduelPrice ?? null);
      const prize = parseFloat(row.PrizePickPoint ?? null);
      const underdog = parseFloat(row.UnderdogPoint ?? null);

      const prizeDiff = (fanduel != null && prize != null) ? Math.abs(fanduel - prize) : null;
      const underdogDiff = (fanduel != null && underdog != null) ? Math.abs(fanduel - underdog) : null;

      columns.forEach(col => {
        const td = document.createElement("td");

        if (col === "PrizePicksDifference") {
          td.textContent = prizeDiff != null ? prizeDiff.toFixed(2) : "";
          if (prizeDiff != null) {
            if (["americanfootball_nfl","americanfootball_ncaaf","basketball_nba"].includes(selectedSport)) {
              if (prizeDiff > 2) td.classList.add("huntergreen");
              else if (prizeDiff === 2) td.classList.add("green");
              else if (prizeDiff === 1) td.classList.add("darkyellow");
              else td.classList.add("gray");
            } else if (selectedSport === "baseball_mlb") {
              if (prizeDiff > 0) td.classList.add("green-mlb");
              else td.classList.add("gray");
            }
            if (fanduel > prize) td.innerHTML += `<span class="diff-arrow">🔺</span>`;
            else if (fanduel < prize) td.innerHTML += `<span class="diff-arrow">🔻</span>`;
          } else td.classList.add("white");

        } else if (col === "UnderdogDifference") {
          td.textContent = underdogDiff != null ? underdogDiff.toFixed(2) : "";
          if (underdogDiff != null) {
            if (["americanfootball_nfl","americanfootball_ncaaf","basketball_nba"].includes(selectedSport)) {
              if (underdogDiff > 2) td.classList.add("huntergreen");
              else if (underdogDiff === 2) td.classList.add("green");
              else if (underdogDiff === 1) td.classList.add("darkyellow");
              else td.classList.add("gray");
            } else if (selectedSport === "baseball_mlb") {
              if (underdogDiff > 0) td.classList.add("green-mlb");
              else td.classList.add("gray");
            }
            if (fanduel > underdog) td.innerHTML += `<span class="diff-arrow">🔺</span>`;
            else if (fanduel < underdog) td.innerHTML += `<span class="diff-arrow">🔻</span>`;
          } else td.classList.add("white");

        } else {
          td.textContent = row[col] ?? "";
        }

        tr.appendChild(td);
      });

      tbody.appendChild(tr);
    });

    progressText.textContent = `Rendering rows ${i+1}-${Math.min(i+batchSize, sortedData.length)} of ${sortedData.length}...`;
    await new Promise(r => setTimeout(r, 0));
  }

  progressText.textContent = `✅ All ${sortedData.length} rows rendered successfully!`;

  // Default sort by PrizePicksDifference descending
  const diffIndex = columns.indexOf("PrizePicksDifference");
  if (diffIndex !== -1) sortTableByColumn(table, diffIndex, false);

  // Sortable headers
  table.querySelectorAll("th").forEach((th, index) => {
    if (th.textContent === "UnderdogDifference" || th.textContent === "Event" || th.textContent === "PrizePicksDifference") {
      let ascending = false;
      th.addEventListener("click", () => {
        sortTableByColumn(table, index, ascending);
        ascending = !ascending;
      });
    }
  });
}

// ----------------------------
// Table sorting helper
// ----------------------------
function sortTableByColumn(table, columnIndex, ascending = false) {
  const tbody = table.querySelector("tbody");
  const rows = Array.from(tbody.querySelectorAll("tr"));

  rows.sort((a, b) => {
    let cellA = a.children[columnIndex].textContent.trim();
    let cellB = b.children[columnIndex].textContent.trim();
    cellA = cellA.replace(/[🔺🔻\s]/g, "");
    cellB = cellB.replace(/[🔺🔻\s]/g, "");
    const numA = parseFloat(cellA);
    const numB = parseFloat(cellB);
    const isNumA = !isNaN(numA);
    const isNumB = !isNaN(numB);

    if (isNumA && isNumB) return ascending ? numA - numB : numB - numA;
    else if (!isNumA && !isNumB) return 0;
    else if (!isNumA) return 1;
    else return -1;
  });

  rows.forEach(row => tbody.appendChild(row));
}

// ----------------------------
// Export CSV / Excel
// ----------------------------
function exportTableToCSV(filename) {
  const table = resultsDiv.querySelector("table");
  if (!table) return;
  let csv = [];
  const rows = table.querySelectorAll("tr");
  rows.forEach(row => {
    const cols = row.querySelectorAll("th, td");
    const rowData = Array.from(cols).map(td => `"${td.textContent.replace(/🔺|🔻/g,'').trim()}"`);
    csv.push(rowData.join(","));
  });
  const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// Hook export buttons
const exportCsvBtn = document.getElementById("exportCsv");
const exportExcelBtn = document.getElementById("exportExcel");
if (exportCsvBtn) exportCsvBtn.addEventListener("click",()=>exportTableToCSV(`${selectedSport || "export"}_${Date.now()}.csv`));
if (exportExcelBtn) exportExcelBtn.addEventListener("click",()=>exportTableToCSV(`${selectedSport || "export"}_${Date.now()}.xlsx`));