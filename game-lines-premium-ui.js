
/* ============================================================
   BenThereBetThat — Game Lines Premium UI Enhancer
   UI only. No odds/model/EV math is changed.
   Load AFTER game-lines.js.
   ============================================================ */

(function () {
  "use strict";

  function buildHero() {
    if (document.querySelector(".btbt-game-lines-hero")) return;

    const nav = document.querySelector(".tracker-button-row");
    if (!nav || !nav.parentNode) return;

    const hero = document.createElement("section");
    hero.className = "btbt-game-lines-hero";
    hero.innerHTML = `
      <div class="btbt-game-lines-brand">
        <div class="btbt-game-lines-mark">↗</div>
        <div>
          <div class="btbt-game-lines-kicker">BenThereBetThat</div>
          <h1 class="btbt-game-lines-title">Game Lines Intelligence</h1>
          <p class="btbt-game-lines-subtitle">
            Multi-book pricing, no-vig market probability and BTBT model edge.
          </p>
        </div>
      </div>

      <div class="btbt-game-lines-status">
        <span class="btbt-game-lines-status-dot"></span>
        Market feed active
      </div>
    `;

    nav.parentNode.insertBefore(hero, nav);
  }

  function enhanceConverter() {
    const card = document.querySelector(".odds-converter-card");
    if (!card || card.dataset.btbtEnhanced === "1") return;

    card.dataset.btbtEnhanced = "1";
    card.classList.add("is-collapsed");

    const heading = card.querySelector(".odds-converter-heading");
    if (!heading) return;

    const reset = heading.querySelector(".odds-converter-reset");

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "btbt-converter-toggle";
    toggle.setAttribute("aria-expanded", "false");
    toggle.textContent = "Show converter";

    const controls = document.createElement("div");
    controls.style.display = "flex";
    controls.style.alignItems = "center";
    controls.style.gap = "6px";

    if (reset) {
      reset.parentNode.removeChild(reset);
      controls.appendChild(reset);
    }

    controls.appendChild(toggle);
    heading.appendChild(controls);

    toggle.addEventListener("click", () => {
      const collapsed = card.classList.toggle("is-collapsed");
      toggle.setAttribute("aria-expanded", String(!collapsed));
      toggle.textContent = collapsed ? "Show converter" : "Hide converter";
    });
  }

  function addSemanticClasses() {
    document.body.classList.add("btbt-terminal");

    // Keep visual status meaningful without modifying API state.
    const summary = document.getElementById("mlbAnalyticsSummary");
    if (summary) summary.setAttribute("aria-label", "Market intelligence summary");
  }

  function init() {
    addSemanticClasses();
    buildHero();
    enhanceConverter();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

/* ============================================================
   Phase 2 — convert raw text cells into easier-to-read pills
   ============================================================ */

function applyBtbtPills() {
  document.querySelectorAll("td").forEach((td) => {
    const text = (td.textContent || "").trim();

    if (!text) return;
    if (td.querySelector(".btbt-pill")) return;

    if (text === "High") {
      td.innerHTML = `<span class="btbt-pill btbt-pill-high">High</span>`;
      return;
    }

    if (text === "Medium") {
      td.innerHTML = `<span class="btbt-pill btbt-pill-medium">Medium</span>`;
      return;
    }

    if (text === "Low") {
      td.innerHTML = `<span class="btbt-pill btbt-pill-low">Low</span>`;
      return;
    }

    if (text.toLowerCase() === "market-only") {
      td.innerHTML = `<span class="btbt-pill btbt-pill-market">Market-only</span>`;
      return;
    }

    if (text.toLowerCase().includes("team model")) {
      td.innerHTML = `<span class="btbt-pill btbt-pill-model">${text}</span>`;
      return;
    }

    if (text.toLowerCase().includes("insufficient")) {
      td.innerHTML = `<span class="btbt-pill btbt-pill-warn">${text}</span>`;
      return;
    }
  });
}

const _btbtOriginalInit = init;
init = function () {
  _btbtOriginalInit();
  setTimeout(applyBtbtPills, 300);
  setTimeout(applyBtbtPills, 1000);
};