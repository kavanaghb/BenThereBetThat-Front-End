let currentGameLines = [];
let visibleBooks = new Set();
let bookDisplayNames = {};

// =====================================================
// 📈 Game Lines EV — Rendering + Pick Tracker Integration
// =====================================================

document.addEventListener("DOMContentLoaded", initGameLines);

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

    let url = `${window.API_BASE}/api/game-lines`;

    if (dateInput?.value)
      url += `?date=${dateInput.value}`;

    const res = await fetch(url);

    const games = await res.json();

    if (!games || games.length === 0) {
      container.innerHTML = "No games found";
      return;
    }

    currentGameLines = games;

    bookDisplayNames = games[0].book_names || {};

    visibleBooks = new Set(Object.keys(bookDisplayNames));

    renderSportsbookFilters();

    renderGameLines();

  }
  catch (err) {

    console.error(err);

    container.innerHTML = "Failed to load game lines";

  }

}

function renderGameLines() {

  const container = document.getElementById("gameLinesResults");

  container.innerHTML = "";

  const table = document.createElement("table");

  table.className = "odds-table";

  let header = `
    <thead>
      <tr>
        <th>Game</th>
        <th>Time</th>
        <th>Team</th>
  `;

  visibleBooks.forEach(book => {

    header += `<th>${bookDisplayNames[book]}</th>`;

  });

  header += `
        <th>Model</th>
        <th>Edge</th>
        <th>Add</th>
      </tr>
    </thead>
    <tbody></tbody>
  `;

  table.innerHTML = header;

  const tbody = table.querySelector("tbody");

  currentGameLines.forEach(game => {

    [game.home_team, game.away_team].forEach(team => {

      const tr = document.createElement("tr");

      if (Math.abs(game.edge) >= 2)
        tr.style.backgroundColor = "#e6ffe6";

      let rowHTML = `
        <td>${game.event_title}</td>
        <td>${game.game_time}</td>
        <td>${team}</td>
      `;

      visibleBooks.forEach(book => {

        const spread = game.books?.[team]?.[book];

        rowHTML += `<td>${spread ?? "-"}</td>`;

      });

      rowHTML += `
        <td>${game.model_spread}</td>
        <td>${game.edge}</td>
        <td>
          <button class="add-to-slip-btn">➕ Add</button>
        </td>
      `;

      tr.innerHTML = rowHTML;

      const button = tr.querySelector(".add-to-slip-btn");

      button.addEventListener("click", () => {

        const firstBook = [...visibleBooks][0];

        const spread = game.books?.[team]?.[firstBook];

        const pick = {

          sport: game.sport_key,
          event: game.event_title,
          game_date: game.game_date,

          player: team,
          market: "spread",

          outcome: spread < 0 ? "favorite" : "underdog",

          line: spread,

          platform: window.pickTracker?.platform || "regular"

        };

        togglePickTrackerSelection(pick);

      });

      tbody.appendChild(tr);

    });

  });

  container.appendChild(table);


  
}

function renderSportsbookFilters() {

  const container = document.getElementById("sportsbookFilters");

  if (!container)
    return;

  container.innerHTML = "";

  Object.entries(bookDisplayNames).forEach(([key, name]) => {

    const label = document.createElement("label");

    label.innerHTML = `
      <input type="checkbox" value="${key}" checked> ${name}
    `;

    label.querySelector("input").addEventListener("change", e => {

      if (e.target.checked)
        visibleBooks.add(key);
      else
        visibleBooks.delete(key);

      renderGameLines();

    });

    container.appendChild(label);

  });

}

// =====================================================
// 📅 Date picker handler
// =====================================================
document.addEventListener("DOMContentLoaded", () => {

  initGameLines();

  const btn = document.getElementById("loadGameLinesBtn");

  if (btn) {
    btn.addEventListener("click", initGameLines);
  }

});

document.getElementById("gameLinesDate").value =
  new Date().toISOString().split("T")[0];