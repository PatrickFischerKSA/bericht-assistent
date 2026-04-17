import test from "node:test";
import assert from "node:assert/strict";
import {
  analyzeReportSource,
  buildWordReportHtml,
  convertMp3ToTextWithZamzar,
  isZamzarConfigured
} from "../src/services/report-assistant.mjs";

const sampleText = `
Start

Das Dossier ist klar gegliedert und bietet eine Übersicht.

Handlung
Die Handlung wird chronologisch entfaltet. Zuerst wird der Konflikt eingeführt, dann folgen Wendepunkt und Schluss.

Figuren
Die Figurenanalyse beschreibt Protagonist, Antagonist, Motivation, Entwicklung und Beziehungen.

Themen und Deutung
Zentrale Themen, Motive und Deutungen werden interpretiert. Die Bedeutung bleibt nicht nur allgemein, sondern wird als Ambivalenz erklärt.

Textstellen
Eine Textstelle und ein Zitat werden als Beleg ausgewertet. Der Erzähler und die Wortwahl werden erwähnt.

Literarische Einordnung
Die Novelle wird über Autor, Gattung, historischen Kontext und Rezeption eingeordnet.

Quiz
Das Quiz enthält Fragen, Multiple Choice, Wahr/Falsch und eine Zuordnung.
`;

test("analyzeReportSource erzeugt Kommentare für alle Kriterien", () => {
  const result = analyzeReportSource({
    title: "Beispieldossier",
    text: sampleText
  });

  assert.equal(result.criteria.length, 8);
  assert.ok(result.totalPoints > 0);
  assert.match(result.summary, /Beispieldossier/);
  assert.equal(result.criteria.find((entry) => entry.id === "quiz")?.points >= 2, true);
});

test("analyzeReportSource gewichtet mit Auftrag nur ausdrücklich verlangte Bereiche", () => {
  const result = analyzeReportSource({
    title: "Beispieldossier",
    text: sampleText,
    assignmentTitle: "Leseauftrag",
    assignmentText: "Beschreibe die Handlung und analysiere die Figuren. Gehe nicht auf Quiz oder literarische Einordnung ein."
  });

  const handlung = result.criteria.find((entry) => entry.id === "handlung");
  const figuren = result.criteria.find((entry) => entry.id === "figuren");
  const quiz = result.criteria.find((entry) => entry.id === "quiz");

  assert.equal(handlung?.included, true);
  assert.equal(figuren?.included, true);
  assert.equal(quiz?.included, false);
  assert.equal(quiz?.points, null);
  assert.match(quiz?.comment || "", /nicht ausdrücklich im Vordergrund/);
  assert.match(result.summary, /bei der Gewichtung der Kriterien mitberücksichtigt/);
});

test("buildWordReportHtml rendert bearbeitbaren Bericht als HTML", () => {
  const html = buildWordReportHtml({
    reportTitle: "Beurteilungsbericht",
    meta: {
      studentName: "Max Muster",
      className: "3a",
      date: "2026-04-16",
      topic: "Michael Kohlhaas",
      sourceTitle: "Beispieldossier",
      assignmentTitle: "Leseauftrag"
    },
    summary: "Der Gesamteindruck ist stimmig.",
    criteria: [
      {
        label: "Quiz",
        included: true,
        points: 4,
        maxPoints: 4,
        comment: "Das Quiz ist passend aufgebaut."
      }
    ]
  });

  assert.match(html, /Beurteilungsbericht/);
  assert.match(html, /Max Muster/);
  assert.match(html, /Leseauftrag/);
  assert.match(html, /Das Quiz ist passend aufgebaut/);
  assert.match(html, /Punktetotal: 4 \/ 4/);
});

test("isZamzarConfigured reagiert auf API-Key", () => {
  const originalKey = process.env.ZAMZAR_API_KEY;
  delete process.env.ZAMZAR_API_KEY;
  assert.equal(isZamzarConfigured(), false);
  process.env.ZAMZAR_API_KEY = "demo-key";
  assert.equal(isZamzarConfigured(), true);

  if (originalKey) {
    process.env.ZAMZAR_API_KEY = originalKey;
  } else {
    delete process.env.ZAMZAR_API_KEY;
  }
});

test("convertMp3ToTextWithZamzar lädt Job, pollt Status und lädt Textresultat", async () => {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.ZAMZAR_API_KEY;
  process.env.ZAMZAR_API_KEY = "demo-key";

  let callIndex = 0;
  globalThis.fetch = async (url, options = {}) => {
    callIndex += 1;
    if (callIndex === 1) {
      assert.match(String(url), /\/jobs$/);
      assert.equal(options.method, "POST");
      return new Response(JSON.stringify({ id: 42, status: "initialising" }), {
        status: 201,
        headers: { "content-type": "application/json" }
      });
    }

    if (callIndex === 2) {
      assert.match(String(url), /\/jobs\/42$/);
      return new Response(JSON.stringify({
        id: 42,
        status: "successful",
        target_files: [{ id: 99 }]
      }), {
        status: 200,
        headers: { "content-type": "application/json" }
      });
    }

    if (callIndex === 3) {
      assert.match(String(url), /\/files\/99\/content$/);
      assert.equal(options.redirect, "manual");
      return new Response(null, {
        status: 302,
        headers: { location: "https://download.example.com/result.txt" }
      });
    }

    assert.equal(String(url), "https://download.example.com/result.txt");
    return new Response("Transkript aus Zamzar", {
      status: 200,
      headers: { "content-type": "text/plain" }
    });
  };

  try {
    const result = await convertMp3ToTextWithZamzar({
      buffer: new Uint8Array([1, 2, 3, 4]),
      filename: "aufnahme.mp3",
      pollDelayMs: 0,
      maxAttempts: 2
    });

    assert.equal(result.text, "Transkript aus Zamzar");
    assert.equal(result.job.id, 42);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey) {
      process.env.ZAMZAR_API_KEY = originalKey;
    } else {
      delete process.env.ZAMZAR_API_KEY;
    }
  }
});
