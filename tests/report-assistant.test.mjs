import test from "node:test";
import assert from "node:assert/strict";
import { analyzeReportSource, buildWordReportHtml } from "../src/services/report-assistant.mjs";

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

test("buildWordReportHtml rendert bearbeitbaren Bericht als HTML", () => {
  const html = buildWordReportHtml({
    reportTitle: "Beurteilungsbericht",
    meta: {
      studentName: "Max Muster",
      className: "3a",
      date: "2026-04-16",
      topic: "Michael Kohlhaas",
      sourceTitle: "Beispieldossier"
    },
    summary: "Der Gesamteindruck ist stimmig.",
    criteria: [
      {
        label: "Quiz",
        points: 4,
        maxPoints: 4,
        comment: "Das Quiz ist passend aufgebaut."
      }
    ]
  });

  assert.match(html, /Beurteilungsbericht/);
  assert.match(html, /Max Muster/);
  assert.match(html, /Das Quiz ist passend aufgebaut/);
  assert.match(html, /Punktetotal: 4 \/ 4/);
});
