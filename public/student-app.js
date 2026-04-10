const app = document.querySelector("#app");
const state = {
  loading: true,
  saving: false,
  error: "",
  notice: "",
  navigatorUrl: window.APP_CONFIG?.navigatorUrl || "",
  questions: window.APP_CONFIG?.questions || [],
  session: window.APP_CONFIG?.session || null
};

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function flattenQuestions() {
  return state.questions.flatMap((section) => section.items);
}

function answeredCount() {
  const answers = state.session?.answers || {};
  return flattenQuestions().filter((question) => {
    if (question.type === "text") {
      return Boolean(String(answers[question.id] || "").trim());
    }

    return Number.isInteger(Number(answers[question.id]));
  }).length;
}

async function request(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "Anfrage fehlgeschlagen.");
  }

  return payload;
}

function card(content, extraClass = "") {
  return `<section class="card ${extraClass}">${content}</section>`;
}

function renderScale(question, max) {
  const current = String(state.session?.answers?.[question.id] || "");
  const labels = max === 10
    ? ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"]
    : ["1", "2", "3", "4", "5"];

  return `
    <div class="scale-grid scale-grid--${max}">
      ${labels.map((label, index) => {
        const value = String(index + 1);
        return `
          <label class="scale-option ${current === value ? "is-active" : ""}">
            <input type="radio" name="${question.id}" value="${value}" ${current === value ? "checked" : ""}>
            <span>${label}</span>
          </label>
        `;
      }).join("")}
    </div>
    <div class="scale-hint">
      <span>trifft wenig zu</span>
      <span>trifft voll zu</span>
    </div>
  `;
}

function renderQuestion(question) {
  if (question.type === "text") {
    return `
      <article class="question-card">
        <label class="stack">
          <span class="question-label">${escapeHtml(question.label)}${question.required ? " *" : ""}</span>
          <textarea name="${question.id}" rows="4" placeholder="${escapeHtml(question.placeholder || "")}">${escapeHtml(state.session?.answers?.[question.id] || "")}</textarea>
        </label>
      </article>
    `;
  }

  const scale = question.type === "scale10" ? renderScale(question, 10) : renderScale(question, 5);
  return `
    <article class="question-card">
      <fieldset class="stack">
        <legend class="question-label">${escapeHtml(question.label)}${question.required ? " *" : ""}</legend>
        ${scale}
      </fieldset>
    </article>
  `;
}

function renderRegistration() {
  app.innerHTML = `
    <section class="hero-card">
      <p class="eyebrow">Schüler*innen-Befragung</p>
      <h1>Evaluation zum Prüfungsnavigator</h1>
      <p class="lead">
        Registriere dich mit Klasse und Namen oder Kürzel. Danach kannst du die Befragung
        mit Skalen und offenen Freitext-Antworten ausfüllen und verbindlich abschicken.
      </p>
      ${state.error ? `<div class="alert alert--error">${escapeHtml(state.error)}</div>` : ""}
      <form id="registration-form" class="stack">
        <label class="field">
          <span>Klasse / Kurs</span>
          <input name="className" placeholder="z. B. 3a, Deutsch 4B, BM2" required>
        </label>
        <label class="field">
          <span>Name oder Kürzel</span>
          <input name="studentName" placeholder="z. B. Lea M. oder LM" required>
        </label>
        <div class="hero-actions">
          <button class="button" type="submit">Registrieren und starten</button>
          ${state.navigatorUrl ? `<a class="button button--ghost" href="${escapeHtml(state.navigatorUrl)}" target="_blank" rel="noreferrer">Prüfungsnavigator öffnen</a>` : ""}
        </div>
      </form>
      <div class="meta-note">
        Gespeichert werden Klasse, Name/Kürzel und deine Antworten. Wenn du dich später mit derselben Kombination erneut registrierst, setzt du deine Rückmeldung fort.
      </div>
    </section>
  `;

  document.querySelector("#registration-form")?.addEventListener("submit", handleRegister);
}

function renderCompletion() {
  if (!state.session) {
    return "";
  }

  const total = flattenQuestions().length;
  const answered = answeredCount();
  return `
    <section class="status-bar">
      <div>
        <strong>${escapeHtml(state.session.studentName)}</strong>
        <span>${escapeHtml(state.session.className)}</span>
      </div>
      <div>
        <strong>${answered} / ${total}</strong>
        <span>${state.session.status === "submitted" ? "abgeschickt" : "beantwortet"}</span>
      </div>
      <div>
        <strong>${escapeHtml(String(state.session.completion?.percent || 0))}%</strong>
        <span>Pflichtfragen ausgefüllt</span>
      </div>
    </section>
  `;
}

function renderSubmittedView() {
  app.innerHTML = `
    ${renderCompletion()}
    ${card(`
      <p class="eyebrow">Danke</p>
      <h1>Deine Rückmeldung ist gespeichert.</h1>
      <p class="lead">
        Du hast die Evaluation erfolgreich abgeschickt. Falls du dich mit derselben Registrierung
        erneut anmeldest, kannst du deine Antworten weiterhin sehen.
      </p>
      <div class="hero-actions">
        <a class="button button--ghost" href="/auth/student/logout">Abmelden</a>
        ${state.navigatorUrl ? `<a class="button" href="${escapeHtml(state.navigatorUrl)}" target="_blank" rel="noreferrer">Prüfungsnavigator öffnen</a>` : ""}
      </div>
    `)}
  `;
}

function renderSurvey() {
  app.innerHTML = `
    ${renderCompletion()}
    ${card(`
      <p class="eyebrow">Evaluation</p>
      <h1>Prüfungsnavigator rückmelden</h1>
      <p class="lead">
        Bitte beantworte alle Pflichtfragen. Neben den Skalen kannst du in mehreren Bereichen
        auch offene Rückmeldungen zu FMS, Unterricht und Prüfungsvorbereitung geben.
      </p>
      ${state.error ? `<div class="alert alert--error">${escapeHtml(state.error)}</div>` : ""}
      ${state.notice ? `<div class="alert alert--notice">${escapeHtml(state.notice)}</div>` : ""}
      <form id="survey-form" class="stack stack--large">
        ${state.questions.map((section) => `
          <section class="survey-section">
            <div class="section-head">
              <h2>${escapeHtml(section.title)}</h2>
              <p>${escapeHtml(section.description || "")}</p>
            </div>
            <div class="stack">
              ${section.items.map(renderQuestion).join("")}
            </div>
          </section>
        `).join("")}
        <div class="form-actions">
          <button class="button button--ghost" type="button" data-action="save" ${state.saving ? "disabled" : ""}>Zwischenspeichern</button>
          <button class="button" type="button" data-action="submit" ${state.saving ? "disabled" : ""}>Verbindlich abschicken</button>
          <a class="button button--ghost" href="/auth/student/logout">Abmelden</a>
        </div>
      </form>
    `)}
  `;

  document.querySelector('[data-action="save"]')?.addEventListener("click", () => handleSave(false));
  document.querySelector('[data-action="submit"]')?.addEventListener("click", () => handleSave(true));
}

function renderLoading() {
  app.innerHTML = card("<h1>Lädt ...</h1><p class=\"lead\">Die Evaluation wird vorbereitet.</p>");
}

function render() {
  if (state.loading) {
    renderLoading();
    return;
  }

  if (!state.session) {
    renderRegistration();
    return;
  }

  if (state.session.status === "submitted") {
    renderSubmittedView();
    return;
  }

  renderSurvey();
}

async function handleRegister(event) {
  event.preventDefault();
  state.error = "";
  state.notice = "";

  const formData = new FormData(event.currentTarget);
  try {
    const payload = await request("/api/register", {
      method: "POST",
      body: JSON.stringify({
        className: formData.get("className"),
        studentName: formData.get("studentName")
      })
    });
    state.session = payload.session;
    render();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

function collectAnswers() {
  const form = document.querySelector("#survey-form");
  const formData = new FormData(form);
  const answers = {};

  for (const question of flattenQuestions()) {
    answers[question.id] = formData.get(question.id) || "";
  }

  return answers;
}

async function handleSave(submit) {
  state.error = "";
  state.notice = "";
  const answers = collectAnswers();
  state.saving = true;
  render();

  try {
    const payload = await request(submit ? "/api/student/submit" : "/api/student/save", {
      method: "POST",
      body: JSON.stringify({
        answers
      })
    });
    state.session = payload.session;
    state.notice = submit ? "" : "Deine Antworten wurden gespeichert.";
  } catch (error) {
    state.error = error.message;
  } finally {
    state.saving = false;
    render();
  }
}

render();
