const app = document.querySelector("#report-assistant-app");
const config = window.APP_CONFIG || {};

const state = {
  busy: false,
  error: "",
  notice: "",
  sourceUrl: "",
  sourceTitle: "",
  sourceLabel: "",
  sourceText: "",
  summary: "",
  criteria: [],
  meta: {
    studentName: "",
    className: "",
    date: new Date().toISOString().slice(0, 10),
    topic: ""
  }
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function totalPoints() {
  return state.criteria.reduce((sum, entry) => sum + Number(entry.points || 0), 0);
}

function maxPoints() {
  return state.criteria.reduce((sum, entry) => sum + Number(entry.maxPoints || 4), 0);
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    headers: {
      "content-type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  if (options.expectBlob) {
    const blob = await response.blob();
    if (!response.ok) {
      throw new Error("Export fehlgeschlagen.");
    }
    return blob;
  }

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Anfrage fehlgeschlagen.");
  }
  return payload;
}

function applyAnalysis(analysis) {
  state.summary = analysis.summary || "";
  state.criteria = (analysis.criteria || []).map((entry) => ({
    ...entry,
    points: Number(entry.points || 0),
    maxPoints: Number(entry.maxPoints || 4)
  }));
}

async function loadFromUrl() {
  if (!state.sourceUrl.trim()) {
    state.error = "Bitte zuerst eine URL eingeben.";
    render();
    return;
  }

  state.busy = true;
  state.error = "";
  state.notice = "";
  render();

  try {
    const payload = await request(config.analyzeUrlEndpoint || "/api/report-assistant/fetch-url", {
      method: "POST",
      body: JSON.stringify({ url: state.sourceUrl })
    });
    state.sourceTitle = payload.source.title || state.sourceTitle;
    state.sourceLabel = payload.source.url || state.sourceLabel;
    state.sourceText = payload.source.text || "";
    state.meta.topic ||= payload.source.title || "";
    applyAnalysis(payload.analysis);
    state.notice = "URL geladen und erste Kommentare generiert.";
  } catch (error) {
    state.error = error.message;
  } finally {
    state.busy = false;
    render();
  }
}

async function analyzeCurrentText() {
  if (!state.sourceText.trim()) {
    state.error = "Bitte zuerst eine URL laden, eine Datei einlesen oder Text einfügen.";
    render();
    return;
  }

  state.busy = true;
  state.error = "";
  state.notice = "";
  render();

  try {
    const payload = await request("/api/report-assistant/analyze-text", {
      method: "POST",
      body: JSON.stringify({
        text: state.sourceText,
        title: state.sourceTitle,
        sourceLabel: state.sourceLabel
      })
    });
    applyAnalysis(payload.analysis);
    state.notice = "Kommentare aus dem aktuellen Text neu berechnet.";
  } catch (error) {
    state.error = error.message;
  } finally {
    state.busy = false;
    render();
  }
}

async function exportWord() {
  if (!state.criteria.length) {
    state.error = "Bitte zuerst eine Analyse erstellen.";
    render();
    return;
  }

  state.busy = true;
  state.error = "";
  state.notice = "";
  render();

  try {
    const filenameBase = [state.meta.studentName, state.meta.topic || "beurteilungsbericht"]
      .filter(Boolean)
      .join("-")
      .toLowerCase()
      .replace(/[^a-z0-9äöüß_-]+/gi, "-");

    const blob = await request("/api/report-assistant/export.doc", {
      method: "POST",
      body: JSON.stringify({
        filename: filenameBase || "beurteilungsbericht",
        reportTitle: "Beurteilungsbericht zum Dossier",
        meta: {
          ...state.meta,
          sourceTitle: state.sourceTitle || state.sourceLabel
        },
        summary: state.summary,
        criteria: state.criteria
      }),
      expectBlob: true
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenameBase || "beurteilungsbericht"}.doc`;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    state.notice = "Word-Datei exportiert.";
  } catch (error) {
    state.error = error.message;
  } finally {
    state.busy = false;
    render();
  }
}

async function handleFile(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  state.busy = true;
  state.error = "";
  state.notice = "";
  render();

  try {
    const text = await file.text();
    state.sourceTitle = file.name;
    state.sourceLabel = `Datei: ${file.name}`;
    state.sourceText = text;
    state.meta.topic ||= file.name.replace(/\.[^.]+$/, "");
    state.notice = "Datei eingelesen. Du kannst den Text jetzt prüfen und die Analyse starten.";
  } catch (error) {
    state.error = `Datei konnte nicht gelesen werden: ${error.message}`;
  } finally {
    state.busy = false;
    render();
  }
}

function bindEvents() {
  document.querySelector("#source-url")?.addEventListener("input", (event) => {
    state.sourceUrl = event.target.value;
  });

  document.querySelector("#load-url")?.addEventListener("click", loadFromUrl);
  document.querySelector("#source-file")?.addEventListener("change", handleFile);
  document.querySelector("#analyze-text")?.addEventListener("click", analyzeCurrentText);
  document.querySelector("#export-word")?.addEventListener("click", exportWord);

  document.querySelector("#source-title")?.addEventListener("input", (event) => {
    state.sourceTitle = event.target.value;
  });
  document.querySelector("#source-label")?.addEventListener("input", (event) => {
    state.sourceLabel = event.target.value;
  });
  document.querySelector("#source-text")?.addEventListener("input", (event) => {
    state.sourceText = event.target.value;
  });
  document.querySelector("#summary-text")?.addEventListener("input", (event) => {
    state.summary = event.target.value;
  });

  ["studentName", "className", "date", "topic"].forEach((field) => {
    document.querySelector(`[data-meta="${field}"]`)?.addEventListener("input", (event) => {
      state.meta[field] = event.target.value;
    });
  });

  document.querySelectorAll("[data-criterion-id]").forEach((card) => {
    const id = card.getAttribute("data-criterion-id");
    const entry = state.criteria.find((item) => item.id === id);
    if (!entry) {
      return;
    }

    card.querySelector("[data-role='points']")?.addEventListener("input", (event) => {
      const next = Math.max(0, Math.min(entry.maxPoints, Number(event.target.value || 0)));
      entry.points = Number.isNaN(next) ? 0 : next;
      render();
    });

    card.querySelector("[data-role='comment']")?.addEventListener("input", (event) => {
      entry.comment = event.target.value;
    });
  });
}

function renderCriteria() {
  if (!state.criteria.length) {
    return `
      <section class="panel panel--empty">
        <h2>Noch keine Kommentare</h2>
        <p>Lade eine URL, lies eine Datei ein oder füge Rohtext ein und starte danach die Analyse.</p>
      </section>
    `;
  }

  return `
    <section class="panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Editierbarer Bericht</p>
          <h2>Kommentare pro Kategorie</h2>
        </div>
        <div class="total-badge">${escapeHtml(String(totalPoints()))} / ${escapeHtml(String(maxPoints()))} Punkte</div>
      </div>
      <label class="field">
        <span>Gesamteindruck</span>
        <textarea id="summary-text" rows="4">${escapeHtml(state.summary)}</textarea>
      </label>
      <div class="criteria-grid">
        ${state.criteria.map((entry) => `
          <article class="criterion-card" data-criterion-id="${escapeHtml(entry.id)}">
            <div class="criterion-head">
              <strong>${escapeHtml(entry.label)}</strong>
              <label class="points-field">
                <span>Punkte</span>
                <input data-role="points" type="number" min="0" max="${escapeHtml(String(entry.maxPoints))}" value="${escapeHtml(String(entry.points))}">
              </label>
            </div>
            <textarea data-role="comment" rows="6">${escapeHtml(entry.comment)}</textarea>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function render() {
  app.innerHTML = `
    <section class="hero panel">
      <div>
        <p class="eyebrow">Berichtsassistent</p>
        <h1>Kommentare aus URL oder Datei generieren</h1>
        <p class="lead">
          Lade ein Dossier per URL, lies eine Datei ein oder füge Rohtext ein. Die App erzeugt editierbare Kommentare
          zu den Bewertungskategorien und exportiert den Bericht anschliessend als bearbeitbare Word-Datei.
        </p>
      </div>
      <div class="hero-actions">
        <button class="button button--ghost" id="analyze-text" ${state.busy ? "disabled" : ""}>Analyse aktualisieren</button>
        <button class="button" id="export-word" ${state.busy ? "disabled" : ""}>Word exportieren</button>
      </div>
    </section>

    ${state.error ? `<section class="panel panel--error">${escapeHtml(state.error)}</section>` : ""}
    ${state.notice ? `<section class="panel panel--notice">${escapeHtml(state.notice)}</section>` : ""}

    <section class="panel input-grid">
      <article class="stack">
        <div class="section-head">
          <div>
            <p class="eyebrow">Quelle</p>
            <h2>URL laden</h2>
          </div>
        </div>
        <label class="field">
          <span>Webadresse</span>
          <input id="source-url" type="url" value="${escapeHtml(state.sourceUrl)}" placeholder="https://...">
        </label>
        <button class="button" id="load-url" ${state.busy ? "disabled" : ""}>URL laden und analysieren</button>
      </article>

      <article class="stack">
        <div class="section-head">
          <div>
            <p class="eyebrow">Datei</p>
            <h2>Datei einlesen</h2>
          </div>
        </div>
        <label class="field">
          <span>Datei auswählen</span>
          <input id="source-file" type="file">
        </label>
        <p class="hint">Am zuverlässigsten funktionieren Text-, HTML-, Markdown- und ähnlich lesbare Dateien. Danach kannst du den Rohtext unten jederzeit manuell korrigieren.</p>
      </article>
    </section>

    <section class="panel meta-grid">
      <div class="section-head">
        <div>
          <p class="eyebrow">Berichtsdaten</p>
          <h2>Felder für den Export</h2>
        </div>
      </div>
      <label class="field">
        <span>Name</span>
        <input data-meta="studentName" type="text" value="${escapeHtml(state.meta.studentName)}">
      </label>
      <label class="field">
        <span>Klasse</span>
        <input data-meta="className" type="text" value="${escapeHtml(state.meta.className)}">
      </label>
      <label class="field">
        <span>Datum</span>
        <input data-meta="date" type="date" value="${escapeHtml(state.meta.date)}">
      </label>
      <label class="field">
        <span>Thema</span>
        <input data-meta="topic" type="text" value="${escapeHtml(state.meta.topic)}">
      </label>
    </section>

    <section class="panel stack">
      <div class="section-head">
        <div>
          <p class="eyebrow">Rohtext</p>
          <h2>Quelle prüfen und händisch korrigieren</h2>
        </div>
      </div>
      <label class="field">
        <span>Quellentitel</span>
        <input id="source-title" type="text" value="${escapeHtml(state.sourceTitle)}" placeholder="Titel der Seite oder Datei">
      </label>
      <label class="field">
        <span>Quellenhinweis</span>
        <input id="source-label" type="text" value="${escapeHtml(state.sourceLabel)}" placeholder="URL oder Dateiname">
      </label>
      <label class="field">
        <span>Auswertbarer Text</span>
        <textarea id="source-text" rows="16" placeholder="Hier steht der geladene oder eingefügte Text. Du kannst ihn vor der Analyse beliebig ergänzen oder korrigieren.">${escapeHtml(state.sourceText)}</textarea>
      </label>
    </section>

    ${renderCriteria()}
  `;

  bindEvents();
}

render();
