import test from "node:test";
import assert from "node:assert/strict";
import {
  buildCsvExport,
  buildStudentSession,
  buildTeacherOverview,
  registerOrResumeParticipant,
  saveDraft,
  submitSurvey
} from "../src/services/evaluation-store.mjs";

function createStore() {
  return { responses: [] };
}

function completeAnswers() {
  return {
    dashboard_orientation: 5,
    navigation_clarity: 4,
    companion_tools: 4,
    two_person_mode: 4,
    einstieg_comment: "Die 5 Phasen und der Fortschrittsbalken haben den Einstieg erleichtert.",
    upload_support: 5,
    notebooklm_help: 5,
    ai_prompts_help: 4,
    analysis_tools_help: 4,
    phase12_comment: "NotebookLM und die Promptbeispiele waren für meine Unterlagen am nützlichsten.",
    mock_exam_help: 5,
    quiz_help: 4,
    learning_strategies_help: 5,
    implementation_plans_help: 4,
    phase34_comment: "Die Probeprüfung und Retrieval Practice waren besonders hilfreich.",
    journal_help: 5,
    reflection_ai_help: 4,
    peer_feedback_help: 4,
    teacher_view_relevance: 4,
    phase5_comment: "Das Lernjournal war gut, Peer-Feedback braucht etwas mehr Anleitung.",
    exam_preparation: 5,
    confidence: 4,
    overall_rating: 9,
    recommend: 5,
    fms_fit_comment: "Für die FMS passt das Tool gut, vor allem als strukturierte Vorbereitung in Partnerarbeit.",
    most_helpful_phase: "Phase 2 mit NotebookLM und den Prompts war am hilfreichsten.",
    missing_or_confusing: "Die vielen Tools in Phase 2 waren anfangs etwas viel.",
    tool_improvements: "Mehr konkrete Fachbeispiele für Probeprüfungen wären hilfreich.",
    school_use_comment: "Ich würde den Navigator vor allem im Unterricht anbahnen und danach zu Hause weiterführen.",
    additional_comment: "Insgesamt sehr hilfreich."
  };
}

test("registerOrResumeParticipant erstellt keine Dublette bei gleicher Klasse und gleichem Namen", () => {
  const store = createStore();
  const first = registerOrResumeParticipant(store, {
    className: "3a",
    studentName: "Lea M."
  });
  const second = registerOrResumeParticipant(store, {
    className: "3A",
    studentName: "  lea   m. "
  });

  assert.equal(store.responses.length, 1);
  assert.equal(first.id, second.id);
});

test("saveDraft speichert Antworten und Student-Session zeigt Fortschritt", () => {
  const store = createStore();
  const participant = registerOrResumeParticipant(store, {
    className: "BM2",
    studentName: "LM"
  });

  saveDraft(store, participant.id, {
    dashboard_orientation: 4,
    most_helpful_phase: "Die Navigation.",
    einstieg_comment: "Die Navigation war klar."
  });

  const session = buildStudentSession(store, participant.id);
  assert.equal(session.answers.dashboard_orientation, 4);
  assert.equal(session.answers.most_helpful_phase, "Die Navigation.");
  assert.equal(session.answers.einstieg_comment, "Die Navigation war klar.");
  assert.equal(session.completion.answeredRequired, 2);
});

test("submitSurvey verlangt alle Pflichtfragen", () => {
  const store = createStore();
  const participant = registerOrResumeParticipant(store, {
    className: "4b",
    studentName: "Test"
  });

  assert.throws(() => {
    submitSurvey(store, participant.id, { dashboard_orientation: 5 });
  }, /Pflichtfragen/);
});

test("buildTeacherOverview aggregiert abgeschickte Antworten und CSV enthält Werte", () => {
  const store = createStore();
  const one = registerOrResumeParticipant(store, {
    className: "3a",
    studentName: "Lea"
  });
  const two = registerOrResumeParticipant(store, {
    className: "3a",
    studentName: "Noah"
  });

  submitSurvey(store, one.id, completeAnswers());
  submitSurvey(store, two.id, {
    ...completeAnswers(),
    overall_rating: 7,
    learning_strategies_help: 3,
    student_freeform: ""
  });

  const overview = buildTeacherOverview(store);
  const overall = overview.averages.find((entry) => entry.id === "overall_rating");
  const csv = buildCsvExport(store);

  assert.equal(overview.summary.totalRegistrations, 2);
  assert.equal(overview.summary.submittedCount, 2);
  assert.equal(overview.classes[0].submitted, 2);
  assert.equal(overall.average, 8);
  assert.match(csv, /overall_rating/);
  assert.match(csv, /Lea/);
});
