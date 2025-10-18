// ===================================================
// 1️⃣ Supabase Initialization
// ===================================================
const supabaseUrl = "https://pkvkezbakcvrhygowogx.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrdmtlemJha2N2cmh5Z293b2d4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjg0OTk1MzIsImV4cCI6MjA0NDA3NTUzMn0.AuYjWyjFGaUqIg2KcMx9QmAplQiE7D9e7z5lsN3MtV0";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseAnonKey);

// ===================================================
// 2️⃣ Authentication Elements
// ===================================================
const authContainer = document.getElementById("auth-container");
const mainContent = document.getElementById("main-content");
const authMessage = document.getElementById("auth-message");
const signoutBtn = document.getElementById("signout-btn");
const subscribeBtn = document.getElementById("subscribeBtn");
const forgotBtn = document.getElementById("forgot-btn");

// ===================================================
// 3️⃣ Authentication Logic
// ===================================================

// --- Sign Up ---
const signupForm = document.getElementById("signup-form");
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signup-email").value;
  const password = document.getElementById("signup-password").value;

  const spinner = document.getElementById("forgot-spinner");
  spinner.style.display = "block";

  const { error } = await supabaseClient.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: "https://bentherebetthat.netlify.app/verify.html",
    },
  });

  spinner.style.display = "none";
  if (error)
    authMessage.textContent = error.message;
  else
    authMessage.textContent =
      "✅ Sign-up successful! Please check your email to verify your account.";
});

// --- Sign In ---
const signinForm = document.getElementById("signin-form");
signinForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("signin-email").value;
  const password = document.getElementById("signin-password").value;

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error) authMessage.textContent = error.message;
  else handleAuthSuccess(data.user);
});

// --- Forgot Password ---
if (forgotBtn) {
  forgotBtn.addEventListener("click", async () => {
    const email = prompt("Enter your email for password reset:");
    if (!email) return;

    const spinner = document.getElementById("forgot-spinner");
    spinner.style.display = "block";

    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
      redirectTo: "https://bentherebetthat.com/reset.html",
    });

    spinner.style.display = "none";
    if (error)
      authMessage.textContent = error.message;
    else
      authMessage.textContent =
        "📧 Password reset email sent! Please check your inbox.";
  });
}

// --- Sign Out ---
signoutBtn.addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  localStorage.clear();
  authContainer.style.display = "flex";
  mainContent.style.display = "none";
  signoutBtn.style.display = "none";
});

// --- On Load Check ---
async function handleAuth() {
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  if (user) handleAuthSuccess(user);
  else {
    authContainer.style.display = "flex";
    mainContent.style.display = "none";
  }
}
handleAuth();

async function handleAuthSuccess(user) {
  authContainer.style.display = "none";
  mainContent.style.display = "block";
  signoutBtn.style.display = "block";
  await createUserIfNeeded(user);
  await checkSubscription(user.id);
}

// ===================================================
// 4️⃣ User / Subscription Logic
// ===================================================
async function createUserIfNeeded(user) {
  await fetch("https://bentherebetthat-api.onrender.com/api/create-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: user.id, email: user.email }),
  });
}

async function checkSubscription(user_id) {
  const statusEl = document.getElementById("subscription-status");
  const res = await fetch(
    `https://bentherebetthat-api.onrender.com/api/check-subscription?user_id=${user_id}`
  );
  const data = await res.json();
  const status = data.subscription_status;
  statusEl.textContent = `Subscription: ${status}`;

  if (status !== "active") {
    subscribeBtn.style.display = "block";
    subscribeBtn.addEventListener("click", () => {
      window.location.href = "https://bentherebetthat.com/subscribe.html";
    });
  } else {
    subscribeBtn.style.display = "none";
  }
}

// ===================================================
// 5️⃣ Sport & Market Logic
// ===================================================
const sportButtons = document.querySelectorAll(".sport-buttons button");
const marketSections = document.querySelectorAll(".market-buttons");
let selectedSport = null;

sportButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    sportButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    selectedSport = btn.getAttribute("data-sport");
    marketSections.forEach((section) => (section.style.display = "none"));

    const sectionId =
      selectedSport === "americanfootball_nfl"
        ? "nflMarkets"
        : selectedSport === "americanfootball_ncaaf"
        ? "nflMarkets"
        : selectedSport === "basketball_nba"
        ? "nbaMarkets"
        : selectedSport === "baseball_mlb"
        ? "mlbMarkets"
        : null;

    if (sectionId) document.getElementById(sectionId).style.display = "block";
  });
});

function setupMarketButtons(sectionId) {
  const section = document.getElementById(sectionId);
  if (!section) return;

  const buttons = section.querySelectorAll(".market-list button");
  const selectAllBtn = section.querySelector(`#selectAll${sectionId.replace("Markets","")}`);
  const deselectAllBtn = section.querySelector(`#deselectAll${sectionId.replace("Markets","")}`);

  buttons.forEach((btn) =>
    btn.addEventListener("click", () => btn.classList.toggle("active"))
  );

  selectAllBtn.addEventListener("click", () =>
    buttons.forEach((btn) => btn.classList.add("active"))
  );

  deselectAllBtn.addEventListener("click", () =>
    buttons.forEach((btn) => btn.classList.remove("active"))
  );
}

setupMarketButtons("nflMarkets");
setupMarketButtons("nbaMarkets");
setupMarketButtons("mlbMarkets");

// ===================================================
// 6️⃣ Load Data Logic
// ===================================================
const loadDataBtn = document.getElementById("loadData");
const stopBtn = document.getElementById("stopBtn");
const refreshBtn = document.getElementById("refreshBtn");
const loadingDiv = document.getElementById("loading");
const progressText = document.getElementById("progressText");
const resultsDiv = document.getElementById("results");
let currentController = null;

async function loadData() {
  try {
    const date = document.getElementById("dateInput").value;
    if (!selectedSport) throw new Error("Select a sport first.");

    const activeMarketBtns = document.querySelectorAll(
      ".market-list button.active"
    );
    const markets = Array.from(activeMarketBtns).map((b) =>
      b.getAttribute("data-market")
    );
    if (markets.length === 0) throw new Error("Select at least one market.");

    resultsDiv.innerHTML = "";
    progressText.textContent = "Fetching data from server...";
    loadingDiv.style.display = "block";

    currentController = new AbortController();
    const signal = currentController.signal;

    const { data: user } = await supabaseClient.auth.getUser();
    const userId = user?.user?.id;

    const response = await fetch(
      `https://bentherebetthat-api.onrender.com/api/data?sport=${selectedSport}&date=${date}&markets=${markets.join(
        "&markets="
      )}&user_id=${userId}`,
      { signal }
    );

    if (!response.ok) throw new Error("Error fetching data.");

    const allData = await response.json();
    await renderTableInBatches(allData, 50);
  } catch (err) {
    if (err.name === "AbortError")
      progressText.textContent = "⚠️ Loading stopped by user";
    else {
      resultsDiv.innerHTML = `<p style="color:red;">${err.message}</p>`;
      console.error("Error loading data:", err);
    }
  } finally {
    loadingDiv.style.display = "none";
    currentController = null;
  }
}

loadDataBtn.addEventListener("click", loadData);
refreshBtn.addEventListener("click", () => loadDataBtn.click());
stopBtn.addEventListener("click", () => {
  if (currentController) currentController.abort();
});

// ===================================================
// 7️⃣ Render Table Logic
// ===================================================
async function renderTableInBatches(data, batchSize = 50) {
  if (!Array.isArray(data) || data.length === 0) {
    resultsDiv.innerHTML = "<p>No results found.</p>";
    return;
  }

  let table =
    "<table><thead><tr><th>Event</th><th>Market</th><th>Description</th><th>Outcome</th><th>FanduelPoint</th><th>PrizePickPoint</th><th>UnderdogPoint</th><th>PrizePicksDifference</th><th>UnderdogDifference</th></tr></thead><tbody>";

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    table += `<tr>
      <td>${row.Event}</td>
      <td>${row.Market}</td>
      <td>${row.Description}</td>
      <td>${row.Outcome}</td>
      <td>${row.FanduelPoint ?? ""}</td>
      <td>${row.PrizePickPoint ?? ""}</td>
      <td>${row.UnderdogPoint ?? ""}</td>
      <td>${row.PrizePicksDifference ?? ""}</td>
      <td>${row.UnderdogDifference ?? ""}</td>
    </tr>`;

    if ((i + 1) % batchSize === 0) {
      resultsDiv.innerHTML = table + "</tbody></table>";
      await new Promise((r) => setTimeout(r, 25));
    }
  }
  resultsDiv.innerHTML = table + "</tbody></table>";
}
