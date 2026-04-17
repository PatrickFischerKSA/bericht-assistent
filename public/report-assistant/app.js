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
  assignmentTitle: "",
  assignmentText: "",
  audioSource: null,
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
  return state.criteria.reduce((sum, entry) => {
    if (entry.included === false) {
      return sum;
    }
    return sum + Number(entry.points || 0);
  }, 0);
}

function maxPoints() {
  return state.criteria.reduce((sum, entry) => {
    if (entry.included === false) {
      return sum;
    }
    return sum + Number(entry.maxPoints || 4);
  }, 0);
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
    included: entry.included !== false,
    points: entry.points == null ? null : Number(entry.points || 0),
    maxPoints: Number(entry.maxPoints || 4)
  }));
}

function hasAudioSource() {
  return Boolean(state.audioSource?.file);
}

function revokeAudioUrl() {
  if (state.audioSource?.url) {
    URL.revokeObjectURL(state.audioSource.url);
  }
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
        sourceLabel: state.sourceLabel,
        assignmentText: state.assignmentText,
        assignmentTitle: state.assignmentTitle
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
          sourceTitle: state.sourceTitle || state.sourceLabel,
          assignmentTitle: state.assignmentTitle
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

async function transcribeAudioWithZamzar() {
  if (!hasAudioSource()) {
    state.error = "Bitte zuerst eine MP3-Datei laden.";
    render();
    return;
  }

  if (!config.zamzarEnabled) {
    state.error = "Zamzar ist auf diesem Server noch nicht konfiguriert.";
    render();
    return;
  }

  state.busy = true;
  state.error = "";
  state.notice = "MP3 wird an Zamzar übergeben und in Text umgewandelt. Das kann kurz dauern.";
  render();

  try {
    const response = await fetch("/api/report-assistant/zamzar/mp3-to-text", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "content-type": "audio/mpeg",
        "x-file-name": encodeURIComponent(state.audioSource.file.name)
      },
      body: state.audioSource.file
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Die Zamzar-Umwandlung ist fehlgeschlagen.");
    }

    state.sourceTitle = payload.source?.title || state.sourceTitle;
    state.sourceLabel = payload.source?.sourceLabel || state.sourceLabel;
    state.sourceText = payload.source?.text || "";
    state.notice = "Das MP3-Transkript wurde von Zamzar geladen. Du kannst es jetzt prüfen, ergänzen und analysieren.";
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
    const isAudio = file.type === "audio/mpeg" || /\.mp3$/i.test(file.name);
    state.sourceTitle = file.name;
    state.sourceLabel = `Datei: ${file.name}`;
    state.meta.topic ||= file.name.replace(/\.[^.]+$/, "");

    if (isAudio) {
      revokeAudioUrl();
      state.audioSource = {
        name: file.name,
        file,
        url: URL.createObjectURL(file),
        size: file.size,
        duration: null
      };
      state.sourceText = "";
      state.notice = "MP3-Datei geladen. Bitte ergänze darunter ein Transkript oder Stichworte zur Aufnahme und starte danach die Analyse.";
    } else {
      const text = await file.text();
      revokeAudioUrl();
      state.audioSource = null;
      state.sourceText = text;
      state.notice = "Datei eingelesen. Du kannst den Text jetzt prüfen und die Analyse starten.";
    }
  } catch (error) {
    state.error = `Datei konnte nicht gelesen werden: ${error.message}`;
  } finally {
    state.busy = false;
    render();
  }
}

async function handleAssignmentFile(event) {
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
    state.assignmentTitle = file.name;
    state.assignmentText = text;
    state.notice = "Auftrag eingelesen. Prüfe den Text kurz und starte danach die Analyse neu.";
  } catch (error) {
    state.error = `Auftrag konnte nicht gelesen werden: ${error.message}`;
  } finally {
    state.busy = false;
    render();
  }
}

function bindAudioMetadata() {
  const audio = document.querySelector("#audio-preview");
  if (!audio) {
    return;
  }

  audio.addEventListener("loadedmetadata", () => {
    if (!state.audioSource) {
      return;
    }

    state.audioSource.duration = Number.isFinite(audio.duration) ? audio.duration : null;
    const seconds = state.audioSource.duration ? Math.round(state.audioSource.duration) : null;
    state.notice = seconds
      ? `MP3-Datei bereit (${seconds} Sekunden). Ergänze jetzt ein Transkript oder Stichworte für die Analyse.`
      : "MP3-Datei bereit. Ergänze jetzt ein Transkript oder Stichworte für die Analyse.";
    render();
  }, { once: true });
}

function bindEvents() {
  document.querySelector("#source-url")?.addEventListener("input", (event) => {
    state.sourceUrl = event.target.value;
  });

  document.querySelector("#load-url")?.addEventListener("click", loadFromUrl);
  document.querySelector("#source-file")?.addEventListener("change", handleFile);
  document.querySelector("#assignment-file")?.addEventListener("change", handleAssignmentFile);
  document.querySelector("#analyze-text")?.addEventListener("click", analyzeCurrentText);
  document.querySelector("#export-word")?.addEventListener("click", exportWord);
  document.querySelector("#zamzar-transcribe")?.addEventListener("click", transcribeAudioWithZamzar);

  document.querySelector("#source-title")?.addEventListener("input", (event) => {
    state.sourceTitle = event.target.value;
  });
  document.querySelector("#source-label")?.addEventListener("input", (event) => {
    state.sourceLabel = event.target.value;
  });
  document.querySelector("#source-text")?.addEventListener("input", (event) => {
    state.sourceText = event.target.value;
  });
  document.querySelector("#assignment-title")?.addEventListener("input", (event) => {
    state.assignmentTitle = event.target.value;
  });
  document.querySelector("#assignment-text")?.addEventListener("input", (event) => {
    state.assignmentText = event.target.value;
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
      if (entry.included === false) {
        return;
      }
      const next = Math.max(0, Math.min(entry.maxPoints, Number(event.target.value || 0)));
      entry.points = Number.isNaN(next) ? 0 : next;
      render();
    });

    card.querySelector("[data-role='included']")?.addEventListener("change", (event) => {
      entry.included = event.target.checked;
      if (entry.included && entry.points == null) {
        entry.points = Math.min(2, entry.maxPoints);
      }
      if (!entry.included) {
        entry.points = null;
      }
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
                <input data-role="points" type="number" min="0" max="${escapeHtml(String(entry.maxPoints))}" value="${entry.points == null ? "" : escapeHtml(String(entry.points))}" ${entry.included === false ? "disabled" : ""}>
              </label>
            </div>
            <label class="toggle-row">
              <input data-role="included" type="checkbox" ${entry.included === false ? "" : "checked"}>
              <span>Dieses Kriterium im Bericht gewichten</span>
            </label>
            <textarea data-role="comment" rows="6">${escapeHtml(entry.comment)}</textarea>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function renderAudioPanel() {
  if (!state.audioSource) {
    return "";
  }

  const sizeMb = (state.audioSource.size / (1024 * 1024)).toFixed(1);
  const durationText = state.audioSource.duration
    ? `${Math.floor(state.audioSource.duration / 60)}:${String(Math.round(state.audioSource.duration % 60)).padStart(2, "0")} min`
    : "Länge wird geladen";

  return `
    <section class="panel stack">
      <div class="section-head">
        <div>
          <p class="eyebrow">Audioquelle</p>
          <h2>MP3-Vorschau</h2>
        </div>
      </div>
      <div class="audio-card">
        <div class="audio-meta">
          <strong>${escapeHtml(state.audioSource.name)}</strong>
          <span>${escapeHtml(sizeMb)} MB</span>
          <span>${escapeHtml(durationText)}</span>
        </div>
        <audio id="audio-preview" controls preload="metadata">
          <source src="${escapeHtml(state.audioSource.url)}" type="audio/mpeg">
        </audio>
        <div class="audio-actions">
          <button class="button" id="zamzar-transcribe" ${state.busy || !config.zamzarEnabled ? "disabled" : ""}>Mit Zamzar in Text umwandeln</button>
          ${!config.zamzarEnabled ? '<p class="hint">Zamzar ist noch nicht konfiguriert. Hinterlege auf dem Server zuerst <code>ZAMZAR_API_KEY</code>.</p>' : ""}
        </div>
        <p class="hint">Die App kann MP3-Dateien lokal laden und abspielen. Für die Beurteilung braucht sie darunter weiterhin ein Transkript, eine Zusammenfassung oder aussagekräftige Stichworte aus der Aufnahme.</p>
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
          <input id="source-file" type="file" accept=".txt,.md,.html,.htm,.json,.csv,.xml,.mp3,audio/mpeg">
        </label>
        <p class="hint">Unterstützt werden weiterhin lesbare Textdateien und neu auch MP3-Dateien. Bei MP3 ergänzt du unten ein Transkript oder präzise Notizen, damit die Analyse daraus Kommentare erzeugen kann.</p>
      </article>

      <article class="stack">
        <div class="section-head">
          <div>
            <p class="eyebrow">Auftrag</p>
            <h2>Auftrag hochladen</h2>
          </div>
        </div>
        <label class="field">
          <span>Auftragsdatei auswählen</span>
          <input id="assignment-file" type="file" accept=".txt,.md,.html,.htm,.json,.csv,.xml">
        </label>
        <p class="hint">Lade hier den konkreten Arbeitsauftrag hoch. Die Analyse gewichtet dann nur jene Bereiche, die im Auftrag ausdrücklich verlangt werden. Danach kannst du alles weiterhin händisch ergänzen oder korrigieren.</p>
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

    ${renderAudioPanel()}

    <section class="panel stack">
      <div class="section-head">
        <div>
          <p class="eyebrow">Auftrag</p>
          <h2>Auftrag prüfen und händisch korrigieren</h2>
        </div>
      </div>
      <label class="field">
        <span>Auftragstitel</span>
        <input id="assignment-title" type="text" value="${escapeHtml(state.assignmentTitle)}" placeholder="Titel oder Dateiname des Auftrags">
      </label>
      <label class="field">
        <span>Auftragstext</span>
        <textarea id="assignment-text" rows="10" placeholder="Hier steht der hochgeladene Auftrag. Du kannst ihn bei Bedarf kürzen, ergänzen oder korrigieren, bevor die Kriterien neu gewichtet werden.">${escapeHtml(state.assignmentText)}</textarea>
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
        <span>Auswertbarer Text / Transkript / Stichworte</span>
        <textarea id="source-text" rows="16" placeholder="Hier steht der geladene oder eingefügte Text. Bei MP3-Dateien trägst du hier das Transkript oder aussagekräftige Stichworte zur Aufnahme ein.">${escapeHtml(state.sourceText)}</textarea>
      </label>
    </section>

    ${renderCriteria()}
  `;

  bindEvents();
  bindAudioMetadata();
}

render();
