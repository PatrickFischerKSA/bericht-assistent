const app = document.querySelector("#teacher-app");
const config = window.APP_CONFIG || {};

const state = {
  loading: true,
  error: "",
  selectedClass: "all",
  overview: null
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function request(url) {
  const response = await fetch(url, { credentials: "same-origin" });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Anfrage fehlgeschlagen.");
  }

  return payload;
}

function filteredResponses() {
  if (!state.overview) {
    return [];
  }

  if (state.selectedClass === "all") {
    return state.overview.responses;
  }

  return state.overview.responses.filter((entry) => entry.className === state.selectedClass);
}

function classOptions() {
  return [
    '<option value="all">Alle Klassen</option>',
    ...state.overview.classes.map((entry) => (
      `<option value="${escapeHtml(entry.className)}" ${entry.className === state.selectedClass ? "selected" : ""}>${escapeHtml(entry.className)}</option>`
    ))
  ].join("");
}

function renderAverages() {
  const rows = state.overview.averages.filter((entry) => entry.average !== null);
  if (!rows.length) {
    return '<div class="panel empty">Noch keine abgeschickten Skalenwerte vorhanden.</div>';
  }

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Mittelwerte</p>
          <h2>Skalenfragen im Überblick</h2>
        </div>
      </div>
      <div class="average-list">
        ${rows.map((row) => `
          <article class="average-card">
            <strong>${escapeHtml(row.label)}</strong>
            <div class="average-metric">${escapeHtml(String(row.average))}</div>
            <span>${escapeHtml(`${row.count} Antworten`)}</span>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderResponses() {
  const responses = filteredResponses();
  if (!responses.length) {
    return '<section class="panel empty">Für diesen Filter liegen noch keine Einträge vor.</section>';
  }

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Einzelantworten</p>
          <h2>Alle Rückmeldungen</h2>
        </div>
      </div>
      <div class="response-list">
        ${responses.map((entry) => `
          <details class="response-card">
            <summary>
              <div>
                <strong>${escapeHtml(entry.studentName)}</strong>
                <span>${escapeHtml(entry.className)}</span>
              </div>
              <div class="response-meta">
                <span class="badge badge--${entry.status}">${escapeHtml(entry.status === "submitted" ? "abgeschickt" : "Entwurf")}</span>
                <span>${escapeHtml(`${entry.completion.answeredRequired}/${entry.completion.totalRequired} Pflichtfragen`)}</span>
              </div>
            </summary>
            <div class="response-body">
              <div class="response-grid">
                ${state.overview.questions.map((section) => `
                  <section class="response-section">
                    <h3>${escapeHtml(section.title)}</h3>
                    ${section.items.map((question) => `
                      <article class="answer-row">
                        <strong>${escapeHtml(question.label)}</strong>
                        <p>${escapeHtml(String(entry.answers?.[question.id] || "—"))}</p>
                      </article>
                    `).join("")}
                  </section>
                `).join("")}
              </div>
              <div class="response-times">
                <span>Erstellt: ${entry.createdAt ? new Date(entry.createdAt).toLocaleString("de-CH") : "—"}</span>
                <span>Aktualisiert: ${entry.updatedAt ? new Date(entry.updatedAt).toLocaleString("de-CH") : "—"}</span>
                <span>Abgeschickt: ${entry.submittedAt ? new Date(entry.submittedAt).toLocaleString("de-CH") : "—"}</span>
              </div>
            </div>
          </details>
        `).join("")}
      </div>
    </section>
  `;
}

function render() {
  if (state.loading) {
    app.innerHTML = '<section class="panel"><h1>Lädt ...</h1><p>Dashboard wird vorbereitet.</p></section>';
    return;
  }

  if (state.error) {
    app.innerHTML = `<section class="panel"><h1>Dashboard nicht verfügbar</h1><p>${escapeHtml(state.error)}</p></section>`;
    return;
  }

  const { summary } = state.overview;
  app.innerHTML = `
    <section class="hero panel">
      <div>
        <p class="eyebrow">Lehrerdashboard</p>
        <h1>Prüfungsnavigator Evaluation</h1>
        <p class="lead">
          Übersicht über Registrierungen, abgeschickte Befragungen, Klassenfilter
          und alle Skalen- sowie Freitext-Antworten der Schüler*innen zur FMS-Prüfungsvorbereitung.
        </p>
      </div>
      <div class="hero-actions">
        <a class="button button--ghost" href="${escapeHtml(config.navigatorUrl || "#")}" target="_blank" rel="noreferrer">Prüfungsnavigator</a>
        <a class="button button--ghost" href="/bericht-assistent">Berichtsassistent</a>
        <a class="button button--ghost" href="${escapeHtml(config.exportUrl || "/api/teacher/export.csv")}">CSV exportieren</a>
        <a class="button button--ghost" href="/auth/teacher/logout">Abmelden</a>
      </div>
    </section>

    <section class="stats-grid">
      <article class="panel stat-card">
        <span>Registrierungen</span>
        <strong>${escapeHtml(String(summary.totalRegistrations))}</strong>
      </article>
      <article class="panel stat-card">
        <span>Abgeschickt</span>
        <strong>${escapeHtml(String(summary.submittedCount))}</strong>
      </article>
      <article class="panel stat-card">
        <span>In Bearbeitung</span>
        <strong>${escapeHtml(String(summary.inProgressCount))}</strong>
      </article>
      <article class="panel stat-card">
        <span>Abgabequote</span>
        <strong>${escapeHtml(`${summary.submissionRate}%`)}</strong>
      </article>
    </section>

    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">Filter</p>
          <h2>Klassen auswählen</h2>
        </div>
      </div>
      <div class="filter-row">
        <label class="field">
          <span>Klasse</span>
          <select id="class-filter">${classOptions()}</select>
        </label>
      </div>
      <div class="class-summary-grid">
        ${state.overview.classes.map((entry) => `
          <article class="class-summary-card">
            <strong>${escapeHtml(entry.className)}</strong>
            <span>${escapeHtml(`${entry.submitted}/${entry.registrations} abgeschickt`)}</span>
          </article>
        `).join("")}
      </div>
    </section>

    ${renderAverages()}
    ${renderResponses()}
  `;

  document.querySelector("#class-filter")?.addEventListener("change", (event) => {
    state.selectedClass = event.target.value;
    render();
  });
}

async function init() {
  try {
    state.overview = await request("/api/teacher/overview");
  } catch (error) {
    state.error = error.message;
  } finally {
    state.loading = false;
    render();
  }
}

init();
