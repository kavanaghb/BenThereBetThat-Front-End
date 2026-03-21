console.log("🏀 March Madness page loaded");

async function loadBracket(){

try{

const API_BASE =
window.API_BASE ||
"https://bentherebetthat-api.onrender.com";

console.log("Fetching bracket data...");

const res = await fetch(`${API_BASE}/api/march-madness-bracket`);

if(!res.ok){
throw new Error("API request failed");
}

const data = await res.json();

console.log("Bracket API response:", data);

const games = data.games;

// ===================================================
// 🔥 RECORD CALCULATION (NEW)
// ===================================================

let wins = 0;
let losses = 0;

games.forEach(g => {
  if (g.completed && g.projected_winner && g.winner){
    if (g.projected_winner === g.winner){
      wins++;
    } else {
      losses++;
    }
  }
});

const total = wins + losses;
const winPct = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";

// inject header
let header = document.getElementById("record-header");
if (!header){
  header = document.createElement("div");
  header.id = "record-header";
  header.className = "record-header";
  document.querySelector(".bracket-container").prepend(header);
}

header.innerHTML = `
<span class="wins">${wins}</span>-
<span class="losses">${losses}</span>
| <span class="pct">${winPct}%</span>
`;


// ===================================================
// RENDER BRACKET
// ===================================================

const container = document.getElementById("bracket");
container.innerHTML = "";

const rounds = {};
const roundStats = {};

games.forEach(g => {

  // group games
  if(!rounds[g.round_number]){
    rounds[g.round_number] = [];
  }
  rounds[g.round_number].push(g);

  // 🔥 NEW: round stats tracking
  if(!roundStats[g.round_number]){
    roundStats[g.round_number] = { wins: 0, losses: 0 };
  }

  if (g.completed && g.projected_winner && g.winner){
    if (g.projected_winner === g.winner){
      roundStats[g.round_number].wins++;
    } else {
      roundStats[g.round_number].losses++;
    }
  }

});

const grid = document.createElement("div");
grid.className = "bracket-grid";

Object.keys(rounds)
.sort((a,b)=>a-b)
.forEach(round => {

const column = document.createElement("div");
column.className = "round-column";

const title = document.createElement("div");
title.className = "round-title";

let roundName = "";

if(round == 0) roundName = "First Four";
else if(round == 1) roundName = "Round of 64";
else if(round == 2) roundName = "Round of 32";
else if(round == 3) roundName = "Sweet 16";
else if(round == 4) roundName = "Elite 8";
else if(round == 5) roundName = "Final Four";
else if(round == 6) roundName = "Championship";

// 🔥 ADD RECORD
const stats = roundStats[round] || { wins: 0, losses: 0 };
const roundTotal = stats.wins + stats.losses;

let recordText = "";

if (roundTotal > 0){
  const pct = ((stats.wins / roundTotal) * 100).toFixed(1);
  recordText = ` (${stats.wins}-${stats.losses} | ${pct}%)`;
}

title.innerText = roundName + recordText;

// 🔥 ADD THIS LINE (YOU ARE MISSING THIS)
column.appendChild(title);


// ===================================
// RENDER GAMES
// ===================================

rounds[round].forEach(game => {

const gameDiv = document.createElement("div");
gameDiv.className = "game";

let team1Class = "";
let team2Class = "";

if (game.completed){

  if (game.projected_winner === game.team1){
    team1Class = game.winner === game.team1 ? "winner" : "loser";
  }

  if (game.projected_winner === game.team2){
    team2Class = game.winner === game.team2 ? "winner" : "loser";
  }

} else {

  // 🔵 upcoming games = blue pick
  if (game.projected_winner === game.team1){
    team1Class = "pending";
  }

  if (game.projected_winner === game.team2){
    team2Class = "pending";
  }

}

let predictedWinner = "";
let modelLine = "";

const hasPlayInPlaceholder =
  (game.team1 && game.team1.includes("PLAYIN")) ||
  (game.team2 && game.team2.includes("PLAYIN"));

if (!hasPlayInPlaceholder && game.projected_winner) {

  predictedWinner = game.projected_winner;

  const spread = Number(game.model_spread);
  const vegas = game.vegas_spread != null ? Number(game.vegas_spread) : null;
  const edge = game.edge != null ? Number(game.edge) : null;
  const prob = game.model_win_prob != null ? Number(game.model_win_prob) : null;

  let modelDisplay = "N/A";
  let vegasDisplay = "N/A";
  let winProb = "N/A";

  if (!Number.isNaN(spread)) {
    modelDisplay = `${predictedWinner} -${Math.abs(spread).toFixed(1)}`;
  }

  if (vegas !== null && !Number.isNaN(vegas)) {
    if (predictedWinner === game.team1) {
      vegasDisplay = `${game.team1} ${vegas > 0 ? "+" : ""}${vegas.toFixed(1)}`;
    } else {
      vegasDisplay = `${game.team2} ${(-vegas) > 0 ? "+" : ""}${(-vegas).toFixed(1)}`;
    }
  }

  if (prob !== null && !Number.isNaN(prob)) {
    winProb = `${(prob * 100).toFixed(1)}%`;
  }

  modelLine = `
    <div class="model">
      Ben's Model Pick: <span class="predicted">${predictedWinner}</span><br>
      Model Spread: ${modelDisplay}<br>
      Vegas Spread: ${vegasDisplay}<br>
      Model Edge: <span class="edge">
        ${edge != null && !Number.isNaN(edge)
            ? (edge > 0 ? "+" : "") + edge.toFixed(2)
            : "0.00"}
      </span><br>
      Win Probability: ${winProb}
    </div>
  `;
}


// ===================================
// TEAM DISPLAY (UPDATED 🔥)
// ===================================

const team1 = `
<div class="team">
<span class="${team1Class}">
<span class="seed">${game.seed1 ?? ""}</span>
${game.team1 ?? ""}
</span>
<span class="score">${game.team1_score ?? "-"}</span>
</div>
`;

const team2 = `
<div class="team">
<span class="${team2Class}">
<span class="seed">${game.seed2 ?? ""}</span>
${game.team2 ?? ""}
</span>
<span class="score">${game.team2_score ?? "-"}</span>
</div>
`;

gameDiv.innerHTML = team1 + team2 + modelLine;

column.appendChild(gameDiv);

});

grid.appendChild(column);

});

container.appendChild(grid);

}
catch(err){

console.error("Bracket load failed:", err);

document.getElementById("bracket").innerHTML =
`<div class="error">Failed to load bracket data</div>`;

}

}

loadBracket();