import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseCookies } from "./services/access.mjs";
import {
  buildCsvExport,
  buildStudentSession,
  buildTeacherOverview,
  getQuestionSections,
  readEvaluationStore,
  registerOrResumeParticipant,
  saveDraft,
  submitSurvey,
  updateEvaluationStore
} from "./services/evaluation-store.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "../public");

const STUDENT_COOKIE = "pruefungsnavigator_eval_student";
const TEACHER_COOKIE = "pruefungsnavigator_eval_teacher";
const NAVIGATOR_URL = process.env.NAVIGATOR_URL || "https://patrickfischerksa.github.io/pruefungsnavigator/";
const TEACHER_PASSWORD = process.env.TEACHER_DASHBOARD_PASSWORD || "pruefungsnavigator";

function renderPage({ title, body, script = "", stylesheet = "", config = null }) {
  return `<!doctype html>
  <html lang="de">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <title>${title}</title>
      ${stylesheet ? `<link rel="stylesheet" href="${stylesheet}">` : ""}
    </head>
    <body>
      ${body}
      ${config ? `<script>window.APP_CONFIG = ${JSON.stringify(config)};</script>` : ""}
      ${script ? `<script type="module" src="${script}"></script>` : ""}
    </body>
  </html>`;
}

function renderHomePage() {
  return renderPage({
    title: "Prüfungsnavigator Evaluation",
    stylesheet: "/student-styles.css",
    body: `
      <main class="shell shell--landing">
        <section class="hero-card">
          <p class="eyebrow">Evaluationstool</p>
          <h1>Prüfungsnavigator Rückmeldungen sammeln</h1>
          <p class="lead">
            Diese App erfasst Schüler*innen-Feedback zum Prüfungsnavigator für die FMS-Prüfungsvorbereitung
            mit Registrierung, verbindlichem Fragebogen, Freitext-Antworten und passwortgeschütztem Lehrerdashboard.
          </p>
          <div class="hero-actions">
            <a class="button" href="/student">Zur Schüler*innen-Befragung</a>
            <a class="button button--ghost" href="/teacher-entry">Zum Lehrerdashboard</a>
            <a class="button button--ghost" href="${NAVIGATOR_URL}" target="_blank" rel="noreferrer">Prüfungsnavigator öffnen</a>
          </div>
        </section>
      </main>
    `
  });
}

function renderTeacherLoginPage(error = "") {
  return renderPage({
    title: "Lehrerdashboard Login",
    stylesheet: "/student-styles.css",
    body: `
      <main class="shell shell--landing">
        <section class="hero-card hero-card--compact">
          <p class="eyebrow">Lehrerdashboard</p>
          <h1>Passwortgeschützter Zugang</h1>
          <p class="lead">Mit dem Lehrkraft-Passwort werden alle Registrierungen und Antworten sichtbar.</p>
          ${error ? `<div class="alert alert--error">${error}</div>` : ""}
          <form method="post" action="/auth/teacher" class="stack">
            <input type="hidden" name="redirect" value="/teacher">
            <label class="field">
              <span>Passwort</span>
              <input type="password" name="password" autocomplete="current-password" required>
            </label>
            <div class="hero-actions">
              <button class="button" type="submit">Anmelden</button>
              <a class="button button--ghost" href="/student">Zur Befragung</a>
            </div>
          </form>
        </section>
      </main>
    `
  });
}

function getCookies(request) {
  return parseCookies(request.headers.cookie || "");
}

function getStudentId(request) {
  return getCookies(request)[STUDENT_COOKIE] || "";
}

function hasTeacherAccess(request) {
  return getCookies(request)[TEACHER_COOKIE] === "1";
}

function setSessionCookie(response, name, value, maxAgeSeconds) {
  response.cookie(name, value, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: maxAgeSeconds * 1000,
    path: "/"
  });
}

function clearSessionCookie(response, name) {
  response.clearCookie(name, {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });
}

async function buildBootstrapPayload(request) {
  const store = await readEvaluationStore();
  return {
    navigatorUrl: NAVIGATOR_URL,
    questions: getQuestionSections(),
    session: buildStudentSession(store, getStudentId(request))
  };
}

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: false }));
  app.use(express.static(publicDir, { index: false }));

  app.get("/", (_request, response) => {
    response.send(renderHomePage());
  });

  app.get("/student", async (request, response) => {
    const bootstrap = await buildBootstrapPayload(request);
    response.send(renderPage({
      title: "Prüfungsnavigator Evaluation",
      stylesheet: "/student-styles.css",
      script: "/student-app.js",
      config: bootstrap,
      body: '<main id="app" class="shell"></main>'
    }));
  });

  app.get("/api/bootstrap", async (request, response) => {
    response.json(await buildBootstrapPayload(request));
  });

  app.post("/api/register", async (request, response) => {
    try {
      const session = await updateEvaluationStore(async (store) => {
        const participant = registerOrResumeParticipant(store, request.body || {});
        return buildStudentSession(store, participant.id);
      });

      setSessionCookie(response, STUDENT_COOKIE, session.id, 60 * 60 * 24 * 14);
      response.status(201).json({
        navigatorUrl: NAVIGATOR_URL,
        questions: getQuestionSections(),
        session
      });
    } catch (error) {
      response.status(400).json({ error: error.message });
    }
  });

  app.post("/api/student/save", async (request, response) => {
    const studentId = getStudentId(request);
    if (!studentId) {
      return response.status(401).json({ error: "Bitte registriere dich zuerst." });
    }

    try {
      const session = await updateEvaluationStore(async (store) => {
        saveDraft(store, studentId, request.body?.answers || {});
        return buildStudentSession(store, studentId);
      });
      return response.json({ session });
    } catch (error) {
      return response.status(400).json({ error: error.message });
    }
  });

  app.post("/api/student/submit", async (request, response) => {
    const studentId = getStudentId(request);
    if (!studentId) {
      return response.status(401).json({ error: "Bitte registriere dich zuerst." });
    }

    try {
      const session = await updateEvaluationStore(async (store) => {
        submitSurvey(store, studentId, request.body?.answers || {});
        return buildStudentSession(store, studentId);
      });
      return response.json({ session });
    } catch (error) {
      return response.status(400).json({ error: error.message });
    }
  });

  app.get("/auth/student/logout", (_request, response) => {
    clearSessionCookie(response, STUDENT_COOKIE);
    response.redirect("/student");
  });

  app.get("/teacher-entry", (request, response) => {
    if (hasTeacherAccess(request)) {
      return response.redirect("/teacher");
    }

    return response.send(renderTeacherLoginPage());
  });

  app.post("/auth/teacher", (request, response) => {
    if (String(request.body?.password || "") !== TEACHER_PASSWORD) {
      return response.status(401).send(renderTeacherLoginPage("Das Passwort ist nicht korrekt."));
    }

    setSessionCookie(response, TEACHER_COOKIE, "1", 60 * 60 * 8);
    return response.redirect("/teacher");
  });

  app.get("/teacher", (request, response) => {
    if (!hasTeacherAccess(request)) {
      return response.redirect("/teacher-entry");
    }

    return response.send(renderPage({
      title: "Lehrerdashboard · Prüfungsnavigator Evaluation",
      stylesheet: "/teacher/styles.css",
      script: "/teacher/app.js",
      config: {
        exportUrl: "/api/teacher/export.csv",
        navigatorUrl: NAVIGATOR_URL
      },
      body: '<main id="teacher-app" class="teacher-shell"></main>'
    }));
  });

  app.get("/api/teacher/overview", async (request, response) => {
    if (!hasTeacherAccess(request)) {
      return response.status(401).json({ error: "Lehrerdashboard-Passwort erforderlich." });
    }

    const store = await readEvaluationStore();
    response.json(buildTeacherOverview(store));
  });

  app.get("/api/teacher/export.csv", async (request, response) => {
    if (!hasTeacherAccess(request)) {
      return response.status(401).send("Lehrerdashboard-Passwort erforderlich.");
    }

    const store = await readEvaluationStore();
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", 'attachment; filename="pruefungsnavigator-evaluation.csv"');
    response.send(buildCsvExport(store));
  });

  app.get("/auth/teacher/logout", (_request, response) => {
    clearSessionCookie(response, TEACHER_COOKIE);
    response.redirect("/teacher-entry");
  });

  return app;
}
