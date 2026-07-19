const STORAGE_KEY = "caneta-football-trip-state-v1";
const TRIP_OVERRIDE_KEY = "caneta-football-trip-override-v1";

const state = loadState();
let trip;
let deferredInstallPrompt = null;

const views = [...document.querySelectorAll(".view")];
const navItems = [...document.querySelectorAll(".nav-item")];
const installButton = document.querySelector("#install-button");
const networkStatus = document.querySelector("#network-status");
const offlinePill = document.querySelector("#offline-pill");
const importFile = document.querySelector("#import-file");

init().catch((error) => {
  console.error(error);
  document.querySelector("#main").innerHTML = `<section class="panel"><h2>Trip could not be loaded</h2><p>${escapeHtml(error.message)}</p></section>`;
});

async function init() {
  trip = await loadTrip();
  validateTrip(trip);
  document.title = `${trip.tripTitle || "My Football Trip"} — Caneta Football`;

  const warning = document.querySelector("#demo-warning");
  if (trip.demo) {
    warning.hidden = false;
    warning.textContent = "Demonstration trip — the fixture, access, transport, ticket and safety details are examples and must be verified before customer use.";
  }

  renderAll();
  bindNavigation();
  bindInstallExperience();
  bindNetworkStatus();
  bindImport();
  registerServiceWorker();
  activateInitialView();
}

async function loadTrip() {
  const localOverride = localStorage.getItem(TRIP_OVERRIDE_KEY);
  if (localOverride) {
    try { return JSON.parse(localOverride); }
    catch { localStorage.removeItem(TRIP_OVERRIDE_KEY); }
  }

  const tripId = new URLSearchParams(location.search).get("trip");
  if (tripId && !/^[A-Za-z0-9_-]+$/.test(tripId)) throw new Error("This trip link is not valid.");
  const path = tripId ? `./data/journeys/${tripId}.json` : "./data/trip.json";
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) throw new Error(`Trip data was not found (${response.status}).`);
  return response.json();
}

function validateTrip(value) {
  const required = ["journeyId", "destination", "tripTitle", "startDate", "endDate", "days", "places", "match"];
  required.forEach((field) => {
    if (value[field] === undefined || value[field] === null) throw new Error(`Trip data is missing: ${field}`);
  });
  if (!Array.isArray(value.days) || !Array.isArray(value.places)) throw new Error("Trip days and places must be arrays.");
}

function loadState() {
  const defaults = {
    saved: {}, completed: {}, notes: {}, checks: {}, tripNotes: "",
    budget: { expenses: [], config: null, panel: "add" }
  };
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    return {
      ...defaults,
      ...parsed,
      budget: { ...defaults.budget, ...(parsed.budget || {}) }
    };
  } catch {
    return defaults;
  }
}

function persistState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function renderAll() {
  renderHome();
  renderMatchday();
  renderTrip();
  renderMap();
  renderSaved();
  renderBudget(state.budget.panel || "add");
  renderGuide();
}

function renderHome() {
  const container = document.querySelector("#view-home");
  const stage = getTripStage();
  const day = getRelevantDay(stage);
  const next = getNextActivity(day);
  const preparation = trip.preparationChecklist || [];
  const completedPreparation = preparation.filter((item) => state.checks[item.id]).length;
  const tripDays = differenceInDays(trip.startDate, trip.endDate) + 1;
  const match = trip.match;

  const stageCopy = {
    before: {
      label: "Before your football trip",
      title: countdownLabel(),
      summary: `Prepare for ${trip.destination}, understand the football geography and keep the matchday essentials in one place.`,
      action: "Open matchday plan",
      target: "matchday"
    },
    during: {
      label: "Today on your football trip",
      title: day?.location || trip.destination,
      summary: day?.summary || "Your route is organised around the match without losing the city around it.",
      action: isSameDate(todayIso(), match.date) ? "Open today's matchday plan" : "Open today's trip plan",
      target: isSameDate(todayIso(), match.date) ? "matchday" : "trip"
    },
    after: {
      label: "Your football trip, remembered",
      title: `Welcome back, ${trip.travellerName || "traveller"}`,
      summary: "Your saved places, spending and notes remain on this device. Use them to remember the trip or improve the next one.",
      action: "View saved places",
      target: "saved"
    }
  }[stage];

  const budget = budgetSummary();

  container.innerHTML = `
    <section class="trip-hero">
      <div class="trip-hero__content">
        <span class="stage-badge"><svg><use href="#icon-ball"/></svg>${stageCopy.label}</span>
        <h1 id="home-heading">${escapeHtml(stageCopy.title)}</h1>
        <p class="trip-hero__summary">${escapeHtml(stageCopy.summary)}</p>
        <div class="hero-meta">
          <span>${escapeHtml(formatDateRange(trip.startDate, trip.endDate))}</span>
          <span>${tripDays} days</span>
          <span>${escapeHtml(match.homeTeam)} v ${escapeHtml(match.awayTeam)}</span>
        </div>
        <button class="button button--gold hero-action" type="button" data-go="${stageCopy.target}">${stageCopy.action}<svg><use href="#icon-chevron"/></svg></button>
      </div>
    </section>

    <div class="section-heading"><div><p class="section-label">At a glance</p><h2>Your football trip</h2><p>${escapeHtml(trip.intro)}</p></div></div>
    <div class="dashboard-grid">
      <article class="dashboard-card dashboard-card--gold">
        <div class="dashboard-card__icon"><svg><use href="#icon-check"/></svg></div>
        <h3>Preparation</h3>
        <p>${completedPreparation} of ${preparation.length} tasks complete</p>
        <div class="progress"><span style="width:${percentage(completedPreparation, preparation.length)}%"></span></div>
        <button class="card-link button-link" data-go="guide">Open checklist <svg><use href="#icon-chevron"/></svg></button>
      </article>

      <article class="dashboard-card dashboard-card--green">
        <div class="dashboard-card__icon"><svg><use href="#icon-ticket"/></svg></div>
        <h3>${escapeHtml(match.homeTeam)} v ${escapeHtml(match.awayTeam)}</h3>
        <p>${escapeHtml(formatDate(match.date, { weekday: "long", day: "numeric", month: "long" }))} · ${escapeHtml(match.kickoff)}</p>
        <p class="dashboard-card__meta">${escapeHtml(match.stadium)} · ${escapeHtml(match.ticketStatus)}</p>
        <button class="card-link button-link" data-go="matchday">Open matchday <svg><use href="#icon-chevron"/></svg></button>
      </article>

      <article class="dashboard-card dashboard-card--blue">
        <div class="dashboard-card__icon"><svg><use href="#icon-wallet"/></svg></div>
        <h3>Trip spending</h3>
        <p>${formatMoney(budget.spent, budget.currency)} recorded</p>
        <p class="dashboard-card__meta">${budget.remaining === null ? "Tracking only" : `${formatMoney(Math.max(0, budget.remaining), budget.currency)} remaining`}</p>
        <button class="card-link button-link" data-go="budget">Open budget <svg><use href="#icon-chevron"/></svg></button>
      </article>
    </div>

    <div class="section-heading"><div><p class="section-label">Next up</p><h2>${stage === "after" ? "Trip complete" : escapeHtml(next?.title || day?.theme || "Your itinerary")}</h2></div></div>
    <section class="panel">
      <p>${stage === "after" ? escapeHtml(`${trip.days.length} days of routes, football culture and notes remain saved on this device.`) : escapeHtml(next ? `${next.time || "Flexible"} · ${next.description || ""}` : day?.summary || trip.routeOverview)}</p>
      <button class="card-link button-link" data-go="trip">View full trip <svg><use href="#icon-chevron"/></svg></button>
    </section>

    <div class="section-heading"><div><p class="section-label">Caneta logic</p><h2>Why this route works</h2></div></div>
    <section class="panel"><p>${escapeHtml(trip.routeOverview)}</p></section>`;

  bindGoButtons(container);
}

function renderMatchday() {
  const container = document.querySelector("#view-matchday");
  const match = trip.match;
  const timeline = match.timeline || [];
  const checklist = match.checklist || [];
  const completed = checklist.filter((item) => state.checks[item.id]).length;

  container.innerHTML = `
    <section class="match-hero">
      <div class="match-hero__content">
        <span class="stage-badge"><svg><use href="#icon-ticket"/></svg>${escapeHtml(match.competition)}</span>
        <div class="scoreline">
          <div class="team"><span class="team-name">${escapeHtml(match.homeTeam)}</span></div>
          <div class="versus">v</div>
          <div class="team"><span class="team-name">${escapeHtml(match.awayTeam)}</span></div>
        </div>
        <p class="match-hero__summary">${escapeHtml(formatDate(match.date, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))} · ${escapeHtml(match.kickoff)} · ${escapeHtml(match.stadium)}</p>
        <div class="hero-meta">
          <span>Arrive ${escapeHtml(match.recommendedArrival)}</span>
          <span>${escapeHtml(match.ticketStatus)}</span>
          <span>${escapeHtml(match.stand || "Stand to confirm")}</span>
        </div>
      </div>
    </section>

    <div class="section-heading"><div><p class="section-label">One job at a time</p><h2 id="matchday-heading">Your matchday timeline</h2><p>The match is the anchor, not the whole day.</p></div></div>
    <section class="match-panel">
      <div class="timeline-compact">
        ${timeline.map((item) => `
          <div class="timeline-compact__item">
            <div class="timeline-compact__time">${escapeHtml(item.time)}</div>
            <div><strong>${escapeHtml(item.title)}</strong><p>${escapeHtml(item.description || "")}</p></div>
          </div>`).join("")}
      </div>
    </section>

    <div class="summary-grid">
      <section class="match-panel">
        <p class="section-label">Before leaving</p>
        <h3>Matchday checklist</h3>
        <p>${completed} of ${checklist.length} complete</p>
        <div class="progress"><span style="width:${percentage(completed, checklist.length)}%"></span></div>
        <ul class="check-list">
          ${checklist.map((item) => `<li class="check-item"><input id="${escapeHtml(item.id)}" type="checkbox" data-check="${escapeHtml(item.id)}" ${state.checks[item.id] ? "checked" : ""}><label for="${escapeHtml(item.id)}">${escapeHtml(item.label)}</label></li>`).join("")}
        </ul>
      </section>

      <section class="match-panel">
        <p class="section-label">Ticket and entry</p>
        <h3>What to have ready</h3>
        <ul class="fact-list">
          ${factRow("Ticket", match.ticketStatus)}
          ${factRow("Stand", match.stand || "Confirm")}
          ${factRow("Entrance", match.entrance || "Confirm")}
          ${factRow("ID", match.idRequirement || "Confirm official requirement")}
          ${factRow("Bag rule", match.bagRule || "Confirm official requirement")}
        </ul>
      </section>

      <section class="match-panel">
        <p class="section-label">Getting there</p>
        <h3>Primary route</h3>
        <p>${escapeHtml(match.transport?.primary || "Confirm route before publication.")}</p>
        <div class="alert alert--info" style="margin-top:.8rem"><svg><use href="#icon-route"/></svg><div><strong>Backup</strong><br>${escapeHtml(match.transport?.backup || "Keep a second route ready.")}</div></div>
        ${match.transport?.postMatch ? `<p style="margin-top:.8rem"><strong>After the whistle:</strong> ${escapeHtml(match.transport.postMatch)}</p>` : ""}
      </section>

      <section class="match-panel">
        <p class="section-label">Supporter context</p>
        <h3>How to approach the day</h3>
        <ul class="guide-list">
          ${(match.supporterAdvice || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>
    </div>

    <div class="section-heading"><div><p class="section-label">Safety and verification</p><h2>Know what still needs checking</h2></div></div>
    <section class="panel">
      <div class="alert alert--danger"><svg><use href="#icon-shield"/></svg><div><strong>This is not live operational data.</strong><br>${escapeHtml(match.safetyNote || "Fixture time, ticket validity, entrances, transport and supporter conditions must be rechecked against official sources.")}</div></div>
      <p class="disclosure"><strong>Last reviewed:</strong> ${escapeHtml(match.verification || "Not supplied")}</p>
    </section>`;

  container.querySelectorAll("[data-check]").forEach((input) => {
    input.addEventListener("change", (event) => {
      state.checks[event.currentTarget.dataset.check] = event.currentTarget.checked;
      persistState();
      renderMatchday();
      renderHome();
    });
  });
}

function renderTrip() {
  const container = document.querySelector("#view-trip");
  const relevantDay = getRelevantDay(getTripStage());
  container.innerHTML = `
    <div class="section-heading"><div><p class="section-label">Day by day</p><h2 id="trip-heading">Your complete football trip</h2><p>Matchday, football culture, city context and room to make your own choices.</p></div></div>
    ${(trip.days || []).map((day, index) => `
      <details class="day-card" ${day.id === relevantDay?.id || index === 0 ? "open" : ""}>
        <summary class="day-card__header">
          <div><p>Day ${index + 1} · ${escapeHtml(formatDate(day.date, { weekday: "short", day: "numeric", month: "short" }))}</p><h3>${escapeHtml(day.location)} — ${escapeHtml(day.theme)}</h3></div>
          <svg><use href="#icon-chevron"/></svg>
        </summary>
        <div class="route-note"><svg><use href="#icon-route"/></svg><div><strong>Route logic</strong><br>${escapeHtml(day.routeLogic || day.summary || "Stops are grouped to keep travel realistic.")}</div></div>
        <div class="timeline">
          ${(day.activities || []).map((activity) => activityTimeline(activity)).join("")}
        </div>
      </details>`).join("")}`;

  bindActivityActions(container);
}

function activityTimeline(activity) {
  const type = activity.type || "suggested";
  const savedId = activity.placeId || activity.id;
  return `
    <article class="timeline-item">
      <div class="timeline-item__time">${escapeHtml(activity.time || "Flexible")}</div>
      <div class="timeline-item__content">
        <span class="type-badge type-${escapeHtml(type)}">${escapeHtml(typeLabel(type))}</span>
        <h4>${state.completed[activity.id] ? "✓ " : ""}${escapeHtml(activity.title)}</h4>
        <p>${escapeHtml(activity.description || "")}</p>
        <div class="activity-facts">
          ${activity.travelTime ? `<span>↳ ${escapeHtml(activity.travelTime)}</span>` : ""}
          ${activity.duration ? `<span>${escapeHtml(activity.duration)}</span>` : ""}
          ${activity.cost ? `<span>${escapeHtml(activity.cost)}</span>` : ""}
        </div>
        ${activity.practicalNote ? `<p class="place-card__note"><strong>Practical:</strong> ${escapeHtml(activity.practicalNote)}</p>` : ""}
        ${activity.alternative ? `<div class="alternative-box"><strong>Alternative</strong><p>${escapeHtml(activity.alternative)}</p></div>` : ""}
        <div class="activity-actions">
          <button class="icon-button save-action ${state.saved[savedId] ? "is-active" : ""}" type="button" data-save="${escapeHtml(savedId)}"><svg><use href="#icon-heart"/></svg>${state.saved[savedId] ? "Saved" : "Save"}</button>
          <button class="icon-button complete-action ${state.completed[activity.id] ? "is-active" : ""}" type="button" data-complete="${escapeHtml(activity.id)}"><svg><use href="#icon-check"/></svg>${state.completed[activity.id] ? "Done" : "Mark done"}</button>
          <a class="icon-button" href="${escapeHtml(buildMapUrl(activity))}" target="_blank" rel="noopener noreferrer"><svg><use href="#icon-pin"/></svg>Map</a>
        </div>
      </div>
    </article>`;
}

function renderMap(activeFilter = "all") {
  const container = document.querySelector("#view-map");
  const filters = [
    ["all", "All"],
    ["in-trip", "In trip"],
    ["before-match", "Before match"],
    ["after-match", "After match"],
    ["stadium", "Stadiums"],
    ["history", "History"],
    ["fan-culture", "Fan culture"],
    ["food", "Food"],
    ["shopping", "Shops"],
    ["free", "Free"],
    ["rainy-day", "Rainy day"]
  ];
  const places = activeFilter === "all"
    ? activePlaces()
    : activePlaces().filter((place) => activeFilter === "in-trip" ? place.scheduled : (place.tags || []).includes(activeFilter));
  const stops = trip.map?.stops || [];

  container.innerHTML = `
    <div class="section-heading"><div><p class="section-label">Football geography</p><h2 id="map-heading">Football Map</h2><p>Understand why each place matters, then use external maps for live navigation.</p></div></div>
    <section class="map-card">
      <div class="map-preview" role="img" aria-label="Stylised overview of the football trip route">
        <span class="map-pin map-pin--1"><span>1</span></span><span class="map-pin map-pin--2"><span>2</span></span><span class="map-pin map-pin--3"><span>3</span></span>
      </div>
      <div class="map-card__body">
        <h3>${escapeHtml(trip.map?.title || `${trip.destination} football map`)}</h3>
        <p>${escapeHtml(trip.map?.summary || "Your principal match, culture and city stops in one route overview.")}</p>
        <div class="panel-actions">
          ${trip.map?.myMapsUrl ? `<a class="button button--primary" href="${escapeHtml(safeUrl(trip.map.myMapsUrl))}" target="_blank" rel="noopener noreferrer"><svg><use href="#icon-external"/></svg>Open full map</a>` : ""}
          ${trip.map?.routeUrl ? `<a class="button" href="${escapeHtml(safeUrl(trip.map.routeUrl))}" target="_blank" rel="noopener noreferrer">Open route</a>` : ""}
        </div>
        ${stops.length ? `<div class="stop-list">${stops.map((stop, index) => `<a class="stop" href="${escapeHtml(stop.mapUrl || buildMapUrl(stop))}" target="_blank" rel="noopener noreferrer"><span class="stop__number">${index + 1}</span><span><strong>${escapeHtml(stop.name)}</strong><span>${escapeHtml(stop.note || "Football trip stop")}</span></span><svg><use href="#icon-external"/></svg></a>`).join("")}</div>` : ""}
      </div>
    </section>

    <div class="filter-bar" role="group" aria-label="Filter football places">
      ${filters.map(([id, label]) => `<button class="filter-chip ${id === activeFilter ? "is-active" : ""}" type="button" data-filter="${id}">${label}</button>`).join("")}
    </div>
    <p class="explore-summary">Showing ${places.length} approved ${places.length === 1 ? "place" : "places"}.</p>
    <div id="place-grid" class="place-grid"></div>`;

  const grid = container.querySelector("#place-grid");
  if (!places.length) grid.innerHTML = `<div class="empty-state">No approved places match this filter.</div>`;
  places.forEach((place) => grid.append(createPlaceCard(place)));
  container.querySelectorAll("[data-filter]").forEach((button) => button.addEventListener("click", () => renderMap(button.dataset.filter)));
}

function createPlaceCard(place) {
  const fragment = document.querySelector("#place-template").content.cloneNode(true);
  const saveButton = fragment.querySelector(".save-button");
  fragment.querySelector(".place-card__initials").textContent = initials(place.name);
  fragment.querySelector(".place-card__status").textContent = place.scheduled ? "IN TRIP" : "EXTRA";
  fragment.querySelector(".category-chip").textContent = place.category || "place";
  fragment.querySelector(".place-card__location").textContent = place.neighbourhood || place.destination || "";
  fragment.querySelector(".place-card__title").textContent = place.name;
  fragment.querySelector(".place-card__significance").textContent = place.footballSignificance || "";
  fragment.querySelector(".place-card__description").textContent = place.description || "";
  fragment.querySelector(".place-card__note").textContent = place.practicalNote || "Check current information before visiting.";
  saveButton.innerHTML = `<svg><use href="#icon-heart"/></svg>${state.saved[place.id] ? "Saved" : "Save"}`;
  saveButton.classList.toggle("is-active", Boolean(state.saved[place.id]));
  fragment.querySelector(".map-button").href = buildMapUrl(place);
  saveButton.addEventListener("click", () => toggleSaved(place.id));
  return fragment;
}

function renderSaved() {
  const container = document.querySelector("#view-saved");
  const saved = activePlaces().filter((place) => state.saved[place.id]);
  container.innerHTML = `
    <div class="section-heading"><div><p class="section-label">Your shortlist</p><h2 id="saved-heading">Saved places</h2><p>Keep possible stops, personal notes and places to revisit together on this device.</p></div></div>
    <div class="place-grid" id="saved-grid"></div>
    <div class="section-heading"><div><p class="section-label">Your record</p><h2>Trip notes</h2><p>These notes stay in this browser unless you export your data.</p></div></div>
    <section class="panel">
      <label class="notes-field"><strong>Overall trip note</strong><textarea id="trip-notes" class="notes-area" rows="6" placeholder="What should you remember or tell Caneta?">${escapeHtml(state.tripNotes || "")}</textarea></label>
      <div class="panel-actions">
        <button class="button" type="button" id="export-state"><svg><use href="#icon-download"/></svg>Export my data</button>
        <button class="button button--danger" type="button" id="clear-state">Clear local data</button>
      </div>
    </section>`;

  const grid = container.querySelector("#saved-grid");
  if (!saved.length) grid.innerHTML = `<div class="empty-state"><strong>No saved places yet.</strong><br>Use Save in Trip or Football Map to build your shortlist.</div>`;
  saved.forEach((place) => grid.append(createSavedCard(place)));

  container.querySelector("#trip-notes").addEventListener("input", (event) => {
    state.tripNotes = event.currentTarget.value;
    persistState();
  });
  container.querySelector("#export-state").addEventListener("click", exportState);
  container.querySelector("#clear-state").addEventListener("click", clearLocalState);
}

function createSavedCard(place) {
  const wrapper = document.createElement("article");
  wrapper.className = "panel";
  wrapper.innerHTML = `
    <span class="category-chip">${escapeHtml(place.category || "place")}</span>
    <h3>${escapeHtml(place.name)}</h3>
    <p>${escapeHtml(place.footballSignificance || place.description || "")}</p>
    <label class="notes-field"><strong>Personal note</strong><textarea class="notes-area" rows="3" data-note="${escapeHtml(place.id)}" placeholder="Why save this place?">${escapeHtml(state.notes[place.id] || "")}</textarea></label>
    <div class="panel-actions">
      <button class="icon-button is-active" type="button" data-remove="${escapeHtml(place.id)}"><svg><use href="#icon-heart"/></svg>Remove</button>
      <a class="icon-button" href="${escapeHtml(buildMapUrl(place))}" target="_blank" rel="noopener noreferrer"><svg><use href="#icon-pin"/></svg>Map</a>
    </div>`;
  wrapper.querySelector("[data-remove]").addEventListener("click", () => toggleSaved(place.id));
  wrapper.querySelector("[data-note]").addEventListener("input", (event) => {
    state.notes[place.id] = event.currentTarget.value;
    persistState();
  });
  return wrapper;
}

function budgetConfig() {
  const planned = (trip.budget || []).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  return {
    mode: state.budget.config?.mode || "pot",
    amount: Number(state.budget.config?.amount ?? planned),
    currency: state.budget.config?.currency || trip.homeCurrency || trip.currency || "GBP",
    localCurrency: state.budget.config?.localCurrency || trip.currency || "ARS",
    exchangeRate: Number(state.budget.config?.exchangeRate || 1),
    ...state.budget.config
  };
}

function budgetSummary() {
  const cfg = budgetConfig();
  const spent = (state.budget.expenses || []).reduce((sum, expense) => sum + Number(expense.homeAmount || 0), 0);
  return {
    spent,
    remaining: cfg.mode === "tracking" ? null : Number(cfg.amount || 0) - spent,
    currency: cfg.currency
  };
}

function renderBudget(panel = "add") {
  state.budget.panel = panel;
  const container = document.querySelector("#view-budget");
  const cfg = budgetConfig();
  const summary = budgetSummary();
  const expenses = [...(state.budget.expenses || [])].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
  const categories = categoryTotals(expenses);
  const topCategory = categories[0];

  container.innerHTML = `
    <div class="section-heading"><div><p class="section-label">Trip spending</p><h2 id="budget-heading">Budget</h2><p>Record what the football trip actually costs without turning it into admin.</p></div></div>
    <section class="budget-hero">
      <div>
        <span class="stage-badge">${cfg.mode === "tracking" ? "Tracking only" : "Trip budget"}</span>
        <h3>${summary.remaining === null ? formatMoney(summary.spent, cfg.currency) : formatMoney(Math.abs(summary.remaining), cfg.currency)}</h3>
        <p>${summary.remaining === null ? "recorded so far" : summary.remaining >= 0 ? "remaining" : "over budget"}</p>
      </div>
      <div class="budget-hero__stats">
        <div><strong>${formatMoney(summary.spent, cfg.currency)}</strong><span>Spent</span></div>
        <div><strong>${expenses.length}</strong><span>Entries</span></div>
        <div><strong>${escapeHtml(topCategory?.label || "—")}</strong><span>Top category</span></div>
      </div>
    </section>

    <nav class="budget-tabs" aria-label="Budget sections">
      ${[["add","Add"],["ledger","Ledger"],["settings","Settings"]].map(([id,label]) => `<button type="button" class="filter-chip ${panel === id ? "is-active" : ""}" data-budget-panel="${id}">${label}</button>`).join("")}
    </nav>
    <div id="budget-panel">${budgetPanelHtml(panel, cfg, expenses, categories)}</div>`;

  container.querySelectorAll("[data-budget-panel]").forEach((button) => button.addEventListener("click", () => renderBudget(button.dataset.budgetPanel)));
  bindBudgetPanel(container, panel);
  container.querySelectorAll("[data-delete-expense]").forEach((button) => button.addEventListener("click", () => {
    state.budget.expenses = state.budget.expenses.filter((expense) => expense.id !== button.dataset.deleteExpense);
    persistState();
    renderBudget(panel);
    renderHome();
  }));
  persistState();
}

function budgetPanelHtml(panel, cfg, expenses, categories) {
  if (panel === "ledger") {
    return `
      <section class="panel">
        <h3>Expense ledger</h3>
        ${expenses.length ? expenses.map((expense) => expenseRowHtml(expense, cfg)).join("") : `<div class="empty-state">No expenses recorded yet.</div>`}
      </section>
      ${categories.length ? `<section class="panel" style="margin-top:1rem"><h3>By category</h3>${categories.map((row) => `<div class="expense-row"><div><strong>${escapeHtml(row.label)}</strong></div><div class="expense-row__amount">${formatMoney(row.total, cfg.currency)}</div></div>`).join("")}</section>` : ""}`;
  }
  if (panel === "settings") {
    return `
      <section class="panel">
        <h3>Budget settings</h3>
        <form id="budget-settings" class="form-grid">
          <label class="form-field"><span>Mode</span><select name="mode"><option value="pot" ${cfg.mode === "pot" ? "selected" : ""}>Total trip pot</option><option value="tracking" ${cfg.mode === "tracking" ? "selected" : ""}>Record only</option></select></label>
          <label class="form-field"><span>Budget amount</span><input name="amount" type="number" min="0" step="0.01" value="${escapeHtml(String(cfg.amount || 0))}"></label>
          <label class="form-field"><span>Home currency</span><input name="currency" maxlength="3" value="${escapeHtml(cfg.currency)}"></label>
          <label class="form-field"><span>Local currency</span><input name="localCurrency" maxlength="3" value="${escapeHtml(cfg.localCurrency)}"></label>
          <label class="form-field"><span>1 local currency equals this much home currency</span><input name="exchangeRate" type="number" min="0" step="0.000001" value="${escapeHtml(String(cfg.exchangeRate || 1))}"></label>
          <div class="panel-actions"><button class="button button--primary" type="submit">Save settings</button><button class="button" type="button" id="export-budget">Export CSV</button></div>
        </form>
      </section>`;
  }
  return `
    <section class="panel budget-add-card">
      <p class="section-label">Write it how you would say it</p>
      <h3>What did you spend?</h3>
      <form id="expense-form"><label class="sr-only" for="expense-entry">Expense</label><input id="expense-entry" class="budget-entry" placeholder="e.g. Boca museum 15000 ARS" autocomplete="off" required><button class="button button--gold" type="submit">Review</button></form>
      <p class="input-hint">Include a description and amount. You can correct every field before saving.</p>
      <div id="expense-confirm"></div>
    </section>
    <section class="panel" style="margin-top:1rem">
      <h3>Recent</h3>
      ${expenses.length ? expenses.slice(0, 5).map((expense) => expenseRowHtml(expense, cfg)).join("") : `<div class="empty-state">Nothing spent yet. Your first entry will appear here.</div>`}
    </section>`;
}

function bindBudgetPanel(container, panel) {
  if (panel === "add") {
    container.querySelector("#expense-form").addEventListener("submit", (event) => {
      event.preventDefault();
      const input = container.querySelector("#expense-entry");
      const parsed = parseExpense(input.value, budgetConfig());
      container.querySelector("#expense-confirm").innerHTML = expenseConfirmHtml(parsed, budgetConfig());
      bindExpenseConfirm(container, parsed);
    });
  }
  if (panel === "settings") {
    container.querySelector("#budget-settings").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      state.budget.config = {
        mode: form.get("mode"),
        amount: Number(form.get("amount") || 0),
        currency: String(form.get("currency") || "GBP").toUpperCase().slice(0, 3),
        localCurrency: String(form.get("localCurrency") || "ARS").toUpperCase().slice(0, 3),
        exchangeRate: Number(form.get("exchangeRate") || 1)
      };
      persistState();
      renderBudget("add");
      renderHome();
    });
    container.querySelector("#export-budget").addEventListener("click", exportBudgetCsv);
  }
}

function parseExpense(text, cfg) {
  const matches = [...text.matchAll(/(?:^|\s)(\d+(?:[.,]\d+)?)(?:\s|$)/g)];
  const chosen = matches.sort((a, b) => Number(b[1].replace(",", ".")) - Number(a[1].replace(",", ".")))[0];
  const localAmount = chosen ? Number(chosen[1].replace(",", ".")) : 0;
  const description = (chosen ? text.replace(chosen[0], " ") : text).replace(/\b[A-Z]{3}\b/g, " ").replace(/\s+/g, " ").trim() || "Football trip expense";
  const lower = description.toLowerCase();
  const rules = [
    ["match", "Match tickets", ["match ticket", "football ticket", "game ticket"]],
    ["football", "Football experiences", ["stadium", "museum", "tour", "football", "shirt", "merch"]],
    ["food", "Food & drink", ["food", "meal", "lunch", "dinner", "breakfast", "coffee", "beer", "restaurant", "cafe"]],
    ["transport", "Transport", ["bus", "train", "metro", "taxi", "uber", "transport", "flight"]],
    ["accommodation", "Accommodation", ["hotel", "hostel", "apartment", "room", "accommodation"]],
    ["city", "Other activities", ["museum", "entry", "activity", "tour"]],
    ["shopping", "Shopping", ["shop", "shopping", "souvenir", "gift"]]
  ];
  const category = rules.find(([, , words]) => words.some((word) => lower.includes(word))) || ["other", "Other", []];
  const localCurrency = (text.match(/\b[A-Z]{3}\b/) || [cfg.localCurrency])[0];
  return {
    description,
    localAmount,
    localCurrency,
    homeAmount: localCurrency === cfg.currency ? localAmount : localAmount * Number(cfg.exchangeRate || 1),
    categoryId: category[0],
    categoryLabel: category[1],
    date: todayIso()
  };
}

function expenseConfirmHtml(expense, cfg) {
  return `
    <form id="expense-confirm-form" class="panel" style="margin-top:1rem">
      <h3>Check before saving</h3>
      <div class="form-grid">
        <label class="form-field"><span>Description</span><input name="description" value="${escapeHtml(expense.description)}" required></label>
        <label class="form-field"><span>Date</span><input name="date" type="date" value="${escapeHtml(expense.date)}" required></label>
        <label class="form-field"><span>Local amount</span><input name="localAmount" type="number" min="0" step="0.01" value="${escapeHtml(String(expense.localAmount))}" required></label>
        <label class="form-field"><span>Local currency</span><input name="localCurrency" maxlength="3" value="${escapeHtml(expense.localCurrency)}" required></label>
        <label class="form-field"><span>Home amount (${escapeHtml(cfg.currency)})</span><input name="homeAmount" type="number" min="0" step="0.01" value="${escapeHtml(String(Number(expense.homeAmount).toFixed(2)))}" required></label>
        <label class="form-field"><span>Category</span><select name="categoryId">${budgetCategories().map(([id,label]) => `<option value="${id}" ${id === expense.categoryId ? "selected" : ""}>${label}</option>`).join("")}</select></label>
      </div>
      <div class="panel-actions"><button class="button button--primary" type="submit">Save expense</button><button class="button" type="button" id="cancel-expense">Cancel</button></div>
    </form>`;
}

function bindExpenseConfirm(container, parsed) {
  const form = container.querySelector("#expense-confirm-form");
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const categoryId = data.get("categoryId");
    const categoryLabel = budgetCategories().find(([id]) => id === categoryId)?.[1] || "Other";
    state.budget.expenses.push({
      id: `exp-${Date.now()}-${Math.random().toString(16).slice(2)}`,
      description: String(data.get("description")),
      date: String(data.get("date")),
      localAmount: Number(data.get("localAmount")),
      localCurrency: String(data.get("localCurrency")).toUpperCase().slice(0, 3),
      homeAmount: Number(data.get("homeAmount")),
      categoryId,
      categoryLabel,
      createdAt: new Date().toISOString()
    });
    persistState();
    renderBudget("add");
    renderHome();
  });
  container.querySelector("#cancel-expense").addEventListener("click", () => {
    container.querySelector("#expense-confirm").innerHTML = "";
  });
}

function expenseRowHtml(expense, cfg) {
  return `
    <div class="expense-row">
      <div><strong>${escapeHtml(expense.description)}</strong><div class="expense-row__meta">${escapeHtml(expense.date)} · ${escapeHtml(expense.categoryLabel || "Other")} · ${formatMoney(expense.localAmount, expense.localCurrency)}</div></div>
      <div><div class="expense-row__amount">${formatMoney(expense.homeAmount, cfg.currency)}</div><button class="button-link card-link" type="button" data-delete-expense="${escapeHtml(expense.id)}">Delete</button></div>
    </div>`;
}

function budgetCategories() {
  return [
    ["match", "Match tickets"],
    ["football", "Football experiences"],
    ["food", "Food & drink"],
    ["transport", "Transport"],
    ["accommodation", "Accommodation"],
    ["city", "Other activities"],
    ["shopping", "Shopping"],
    ["other", "Other"]
  ];
}

function categoryTotals(expenses) {
  const map = new Map();
  expenses.forEach((expense) => {
    const key = expense.categoryId || "other";
    const current = map.get(key) || { id: key, label: expense.categoryLabel || "Other", total: 0 };
    current.total += Number(expense.homeAmount || 0);
    map.set(key, current);
  });
  return [...map.values()].sort((a, b) => b.total - a.total);
}

function renderGuide() {
  const container = document.querySelector("#view-guide");
  container.innerHTML = `
    <div class="section-heading"><div><p class="section-label">Know the place</p><h2 id="guide-heading">Local Guide</h2><p>Football culture, practical guidance and the information that should not be buried inside an itinerary.</p></div></div>
    <div class="guide-grid">
      ${(trip.guideSections || []).map((section) => `
        <section class="panel guide-card">
          <p class="section-label">${escapeHtml(section.eyebrow || "Caneta guide")}</p>
          <h3>${escapeHtml(section.title)}</h3>
          ${section.intro ? `<p>${escapeHtml(section.intro)}</p>` : ""}
          <ul class="guide-list">${(section.items || []).map((item) => typeof item === "string" ? `<li>${escapeHtml(item)}</li>` : `<li><strong>${escapeHtml(item.label)}</strong>${escapeHtml(item.text)}</li>`).join("")}</ul>
        </section>`).join("")}
    </div>

    <div class="section-heading"><div><p class="section-label">Preparation</p><h2>Before you travel</h2><p>Complete these tasks while you still have reliable internet and time to correct problems.</p></div></div>
    <section class="panel">
      <ul class="check-list">
        ${(trip.preparationChecklist || []).map((item) => `<li class="check-item"><input id="${escapeHtml(item.id)}" type="checkbox" data-check="${escapeHtml(item.id)}" ${state.checks[item.id] ? "checked" : ""}><label for="${escapeHtml(item.id)}">${escapeHtml(item.label)}</label></li>`).join("")}
      </ul>
    </section>

    <div class="section-heading"><div><p class="section-label">Practical</p><h2>Trip information</h2></div></div>
    <div class="guide-grid">
      ${(trip.practicalInfo || []).map((section) => `
        <section class="panel guide-card"><h3>${escapeHtml(section.title)}</h3><ul class="guide-list">${(section.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section>`).join("")}
      ${(trip.emergencyInfo || []).length ? `<section class="panel guide-card"><h3>Emergency and backup</h3><ul class="guide-list">${trip.emergencyInfo.map((item) => `<li><strong>${escapeHtml(item.label)}</strong>${escapeHtml(item.text)}</li>`).join("")}</ul></section>` : ""}
    </div>

    <div class="section-heading"><div><p class="section-label">Your data</p><h2>Local controls</h2><p>No account is required. Saves, notes, checklists and spending stay in this browser.</p></div></div>
    <section class="panel">
      <div class="data-tools">
        <button class="button" type="button" id="export-state-guide"><svg><use href="#icon-download"/></svg>Export my data</button>
        <button class="button" type="button" id="import-state-guide">Import data</button>
        <button class="button button--danger" type="button" id="clear-state-guide">Clear local data</button>
      </div>
      <p class="disclosure">Do not store passport numbers, payment-card details, medical records or other sensitive documents in trip notes.</p>
    </section>`;

  container.querySelectorAll("[data-check]").forEach((input) => {
    input.addEventListener("change", (event) => {
      state.checks[event.currentTarget.dataset.check] = event.currentTarget.checked;
      persistState();
      renderGuide();
      renderHome();
      renderMatchday();
    });
  });
  container.querySelector("#export-state-guide").addEventListener("click", exportState);
  container.querySelector("#import-state-guide").addEventListener("click", () => importFile.click());
  container.querySelector("#clear-state-guide").addEventListener("click", clearLocalState);
}

function bindNavigation() {
  navItems.forEach((item) => item.addEventListener("click", () => showView(item.dataset.target)));
  window.addEventListener("hashchange", () => {
    const requested = location.hash.replace("#", "");
    if (views.some((view) => view.dataset.view === requested)) showView(requested, false);
  });
}

function activateInitialView() {
  const requested = location.hash.replace("#", "");
  showView(views.some((view) => view.dataset.view === requested) ? requested : "home", false);
}

function showView(name, updateHash = true) {
  views.forEach((view) => view.classList.toggle("is-active", view.dataset.view === name));
  navItems.forEach((item) => {
    const active = item.dataset.target === name;
    item.classList.toggle("is-active", active);
    if (active) item.setAttribute("aria-current", "page");
    else item.removeAttribute("aria-current");
  });
  if (updateHash && location.hash !== `#${name}`) history.replaceState(null, "", `#${name}`);
  document.querySelector("#main").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function bindGoButtons(container) {
  container.querySelectorAll("[data-go]").forEach((button) => button.addEventListener("click", () => showView(button.dataset.go)));
}

function bindActivityActions(container) {
  container.querySelectorAll("[data-save]").forEach((button) => button.addEventListener("click", () => toggleSaved(button.dataset.save)));
  container.querySelectorAll("[data-complete]").forEach((button) => button.addEventListener("click", () => {
    const id = button.dataset.complete;
    state.completed[id] = !state.completed[id];
    if (!state.completed[id]) delete state.completed[id];
    persistState();
    renderTrip();
    renderHome();
  }));
}

function toggleSaved(id) {
  state.saved[id] = !state.saved[id];
  if (!state.saved[id]) delete state.saved[id];
  persistState();
  renderTrip();
  renderMap();
  renderSaved();
  renderHome();
}

function activePlaces() {
  return (trip.places || []).filter((place) => place.active !== false);
}

function getTripStage() {
  const today = todayIso();
  if (today < trip.startDate) return "before";
  if (today > trip.endDate) return "after";
  return "during";
}

function getRelevantDay(stage) {
  if (!trip.days?.length) return null;
  if (stage === "before") return trip.days[0];
  if (stage === "after") return trip.days.at(-1);
  return trip.days.find((day) => day.date === todayIso()) || trip.days[0];
}

function getNextActivity(day) {
  if (!day?.activities?.length) return null;
  if (day.date !== todayIso()) return day.activities[0];
  const now = new Date();
  const minutes = now.getHours() * 60 + now.getMinutes();
  return day.activities.find((activity) => {
    const match = String(activity.time || "").match(/^(\d{2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) >= minutes : false;
  }) || day.activities.at(-1);
}

function countdownLabel() {
  const days = differenceInDays(todayIso(), trip.startDate);
  if (days <= 0) return "Your football trip begins today";
  return `${days} ${days === 1 ? "day" : "days"} to ${trip.destination}`;
}

function differenceInDays(start, end) {
  const a = new Date(`${start}T12:00:00Z`);
  const b = new Date(`${end}T12:00:00Z`);
  return Math.round((b - a) / 86400000);
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function isSameDate(a, b) {
  return a === b;
}

function formatDate(value, options = { day: "numeric", month: "short", year: "numeric" }) {
  try { return new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...options }).format(new Date(`${value}T12:00:00Z`)); }
  catch { return value; }
}

function formatDateRange(start, end) {
  return `${formatDate(start, { day: "numeric", month: "short" })}–${formatDate(end, { day: "numeric", month: "short", year: "numeric" })}`;
}

function percentage(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

function typeLabel(type) {
  return ({ fixed: "Fixed", suggested: "Suggested", optional: "Optional", food: "Food", task: "Practical" })[type] || type;
}

function factRow(label, value) {
  return `<li class="fact-row"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value || "Confirm")}</span></li>`;
}

function initials(value) {
  return String(value || "CF").split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function buildMapUrl(item) {
  if (item.mapUrl) return safeUrl(item.mapUrl);
  if (Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude))) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${item.latitude},${item.longitude}`)}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address || item.name || trip.destination)}`;
}

function safeUrl(value) {
  try {
    const url = new URL(value, location.href);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

function formatMoney(amount, currency) {
  const safe = Number(amount || 0);
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency: currency || "GBP", maximumFractionDigits: 2 }).format(safe); }
  catch { return `${currency || ""} ${safe.toFixed(2)}`.trim(); }
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function exportState() {
  const payload = {
    exportedAt: new Date().toISOString(),
    journeyId: trip.journeyId,
    app: "Caneta Football Trip Companion",
    state
  };
  downloadText(`caneta-${trip.journeyId}-data.json`, JSON.stringify(payload, null, 2), "application/json");
}

function bindImport() {
  importFile.addEventListener("change", async () => {
    const file = importFile.files?.[0];
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      const incoming = payload.state || payload;
      Object.assign(state, incoming);
      state.budget = { expenses: [], config: null, panel: "add", ...(incoming.budget || {}) };
      persistState();
      renderAll();
      showView("guide");
    } catch {
      alert("That file could not be imported.");
    } finally {
      importFile.value = "";
    }
  });
}

function exportBudgetCsv() {
  const rows = [["date","description","category","local_amount","local_currency","home_amount","home_currency"]];
  const cfg = budgetConfig();
  (state.budget.expenses || []).forEach((expense) => rows.push([
    expense.date, expense.description, expense.categoryLabel, expense.localAmount, expense.localCurrency, expense.homeAmount, cfg.currency
  ]));
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
  downloadText(`caneta-${trip.journeyId}-budget.csv`, csv, "text/csv");
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function downloadText(filename, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function clearLocalState() {
  const confirmed = confirm("Clear saved places, notes, checklists and budget entries from this browser?");
  if (!confirmed) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

function bindInstallExperience() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    installButton.hidden = false;
  });
  installButton.addEventListener("click", async () => {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    installButton.hidden = true;
  });
  window.addEventListener("appinstalled", () => {
    installButton.hidden = true;
    offlinePill.hidden = false;
  });
}

function bindNetworkStatus() {
  const update = () => {
    if (navigator.onLine) {
      networkStatus.classList.remove("is-visible");
      networkStatus.textContent = "";
    } else {
      networkStatus.textContent = "You are offline. Saved trip content remains available; external maps and live checks may not work.";
      networkStatus.classList.add("is-visible");
    }
  };
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  update();
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register("./sw.js");
    await navigator.serviceWorker.ready;
    offlinePill.hidden = false;
    registration.update().catch(() => {});
  } catch (error) {
    console.warn("Service worker registration failed", error);
  }
}
