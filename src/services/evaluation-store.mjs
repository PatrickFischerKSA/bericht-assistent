import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "../..");
const dataDir = path.join(projectRoot, "data");
const storePath = path.join(dataDir, "pruefungsnavigator-evaluation-store.json");

let inMemoryStore = null;

const QUESTION_SECTIONS = [
  {
    id: "einstieg",
    title: "Einstieg und Dashboard",
    description: "Wie gut hat dir der Einstieg in die FMS-Prüfungsvorbereitung mit Übersicht, Navigation und Begleitfunktionen geholfen?",
    items: [
      {
        id: "dashboard_orientation",
        type: "likert5",
        required: true,
        label: "Die Startübersicht mit den 5 Phasen hat mir geholfen, den Prüfungsnavigator für die Prüfungsvorbereitung schnell zu verstehen."
      },
      {
        id: "navigation_clarity",
        type: "likert5",
        required: true,
        label: "Die Navigation mit Sidebar, Fortschrittsanzeige und Phasenwechsel war klar."
      },
      {
        id: "companion_tools",
        type: "likert5",
        required: true,
        label: "Zusatzfunktionen wie Lernziele, 21-Tage-Tracker oder Pomodoro waren nützlich für meine FMS-Prüfungsvorbereitung."
      },
      {
        id: "two_person_mode",
        type: "likert5",
        required: true,
        label: "Der Zwei-Personen-Modus mit Person A und Person B war für die Zusammenarbeit sinnvoll."
      },
      {
        id: "einstieg_comment",
        type: "text",
        required: false,
        label: "Wenn du willst: Was hat dir beim Einstieg besonders geholfen oder gefehlt?",
        placeholder: "Zum Beispiel Übersicht, Navigation, Ziele, Tracker, Pomodoro, Zusammenarbeit ..."
      }
    ]
  },
  {
    id: "phase12",
    title: "Phase 1 und 2",
    description: "Wie hilfreich waren Material-Upload und KI-gestützte Analyse für deinen Unterrichtsstoff?",
    items: [
      {
        id: "upload_support",
        type: "likert5",
        required: true,
        label: "Das Hochladen von Unterrichtsunterlagen und Modellprüfungen war sinnvoll für den Start."
      },
      {
        id: "notebooklm_help",
        type: "likert5",
        required: true,
        label: "Die Arbeit mit NotebookLM hat mir geholfen, meinen Unterrichtsstoff übersichtlich zu strukturieren."
      },
      {
        id: "ai_prompts_help",
        type: "likert5",
        required: true,
        label: "Die vorgeschlagenen Prompts für NotebookLM oder ChatGPT waren hilfreich."
      },
      {
        id: "analysis_tools_help",
        type: "likert5",
        required: true,
        label: "Die zusätzlichen Tools in Phase 2 wie Fobizz, CryptPad oder Excalidraw waren für meine Vorbereitung nützlich."
      },
      {
        id: "phase12_comment",
        type: "text",
        required: false,
        label: "Wenn du willst: Welche Aufgabe, welches Tool oder welcher Prompt aus Phase 1 oder 2 war besonders hilfreich oder störend?",
        placeholder: "Zum Beispiel Upload, NotebookLM, ChatGPT, Fobizz, CryptPad, Excalidraw ..."
      }
    ]
  },
  {
    id: "phase34",
    title: "Phase 3 und 4",
    description: "Wie hilfreich waren Probeprüfung und Lernstrategien für dein Lernen vor der FMS-Prüfung?",
    items: [
      {
        id: "mock_exam_help",
        type: "likert5",
        required: true,
        label: "Die generierten Probeprüfungen haben mir geholfen, meinen Lernstand einzuschätzen."
      },
      {
        id: "quiz_help",
        type: "likert5",
        required: true,
        label: "Das Demo-Quiz zum Lernverhalten war sinnvoll eingebunden."
      },
      {
        id: "learning_strategies_help",
        type: "likert5",
        required: true,
        label: "Die Lernstrategien in Phase 4, zum Beispiel Feynman, Retrieval Practice oder Interleaving, waren hilfreich."
      },
      {
        id: "implementation_plans_help",
        type: "likert5",
        required: true,
        label: "Die Wenn-Dann-Planung hat mir geholfen, konkrete nächste Lernschritte festzulegen."
      },
      {
        id: "phase34_comment",
        type: "text",
        required: false,
        label: "Wenn du willst: Was hat dir in Phase 3 oder 4 konkret beim Lernen geholfen oder nicht geholfen?",
        placeholder: "Zum Beispiel Probeprüfung, Demo-Quiz, Feynman-Technik, Retrieval Practice, Interleaving, Wenn-Dann-Planung ..."
      }
    ]
  },
  {
    id: "phase5",
    title: "Phase 5 Reflexion",
    description: "Wie hilfreich waren Lernjournal, KI-Feedback und Peer-Feedback für deine Reflexion?",
    items: [
      {
        id: "journal_help",
        type: "likert5",
        required: true,
        label: "Das Lernjournal hat mir geholfen, meinen Lernprozess bewusster zu reflektieren."
      },
      {
        id: "reflection_ai_help",
        type: "likert5",
        required: true,
        label: "Die KI-Feedback-Prompts in der Reflexionsphase waren hilfreich."
      },
      {
        id: "peer_feedback_help",
        type: "likert5",
        required: true,
        label: "Das Fünf-Finger-Peer-Feedback war nützlich."
      },
      {
        id: "teacher_view_relevance",
        type: "likert5",
        required: true,
        label: "Die Möglichkeit, Arbeitsergebnisse für die Lehrperson sichtbar zu machen, erscheint mir sinnvoll."
      },
      {
        id: "phase5_comment",
        type: "text",
        required: false,
        label: "Wenn du willst: Was hat dir in der Reflexionsphase besonders gebracht oder was war unangenehm?",
        placeholder: "Zum Beispiel Lernjournal, KI-Feedback, Peer-Feedback, Lehrperson-Kommentare ..."
      }
    ]
  },
  {
    id: "gesamt",
    title: "Gesamteindruck",
    description: "Deine Gesamteinschätzung des Prüfungsnavigators für die FMS-Prüfungsvorbereitung.",
    items: [
      {
        id: "exam_preparation",
        type: "likert5",
        required: true,
        label: "Der Prüfungsnavigator hat mich insgesamt gut auf die FMS-Prüfung vorbereitet."
      },
      {
        id: "confidence",
        type: "likert5",
        required: true,
        label: "Nach der Arbeit mit dem Prüfungsnavigator fühle ich mich sicherer für die Prüfung."
      },
      {
        id: "overall_rating",
        type: "scale10",
        required: true,
        label: "Wie bewertest du den Prüfungsnavigator insgesamt?"
      },
      {
        id: "recommend",
        type: "likert5",
        required: true,
        label: "Ich würde den Prüfungsnavigator auch anderen Schüler*innen empfehlen."
      },
      {
        id: "fms_fit_comment",
        type: "text",
        required: false,
        label: "Wenn du willst: Wie gut passt der Prüfungsnavigator deiner Meinung nach zur FMS oder zu deinem Unterricht?",
        placeholder: "Zum Beispiel passend für das pädagogische Profil, allgemein nützlich, zu breit, zu knapp ..."
      }
    ]
  },
  {
    id: "freitext",
    title: "Offene Rückmeldung",
    description: "Hier kannst du ausführlicher rückmelden, wie der Prüfungsnavigator im schulischen Kontext gewirkt hat.",
    items: [
      {
        id: "most_helpful_phase",
        type: "text",
        required: true,
        label: "Welche Phase oder Funktion des Prüfungsnavigators hat dir am meisten geholfen und warum?",
        placeholder: "Zum Beispiel Upload, KI-Analyse, Probeprüfung, Lernstrategien, Lernjournal, Tracker ..."
      },
      {
        id: "missing_or_confusing",
        type: "text",
        required: true,
        label: "Was war unklar, schwierig oder weniger hilfreich?",
        placeholder: "Beschreibe möglichst konkret, in welcher Phase oder bei welcher Funktion du ins Stocken gekommen bist ..."
      },
      {
        id: "tool_improvements",
        type: "text",
        required: true,
        label: "Welche Verbesserung würdest du dir für eine nächste Version des Prüfungsnavigators wünschen?",
        placeholder: "Zum Beispiel andere Prompts, klarere Navigation, mehr Fächerbeispiele, bessere Zusammenarbeit ..."
      },
      {
        id: "school_use_comment",
        type: "text",
        required: true,
        label: "Wie sollte der Prüfungsnavigator deiner Meinung nach im Unterricht oder zu Hause eingesetzt werden?",
        placeholder: "Zum Beispiel allein, in Partnerarbeit, vor Prüfungen, als Hausaufgabe, mit Lehrperson-Begleitung ..."
      },
      {
        id: "additional_comment",
        type: "text",
        required: false,
        label: "Gibt es noch etwas, das du ergänzen möchtest?",
        placeholder: "Optionaler Zusatzkommentar"
      }
    ]
  }
];

function now() {
  return new Date().toISOString();
}

function defaultStore() {
  return {
    responses: []
  };
}

function normalizeName(value = "") {
  return String(value).trim().replace(/\s+/g, " ");
}

function normalizeKey(value = "") {
  return normalizeName(value).toLowerCase();
}

function makeId(prefix) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${timestamp}-${random}`;
}

function allQuestions() {
  return QUESTION_SECTIONS.flatMap((section) => section.items);
}

function questionMap() {
  return new Map(allQuestions().map((question) => [question.id, question]));
}

function defaultAnswers() {
  return Object.fromEntries(allQuestions().map((question) => [question.id, ""]));
}

function normalizeTextAnswer(value) {
  return String(value || "").trim().replace(/\r\n/g, "\n").slice(0, 2500);
}

function normalizeScaleAnswer(question, value) {
  const number = Number(value);
  if (!Number.isInteger(number)) {
    return "";
  }

  const [min, max] = question.type === "scale10" ? [1, 10] : [1, 5];
  if (number < min || number > max) {
    return "";
  }

  return number;
}

function sanitizeAnswers(input = {}, { includeDefaults = true } = {}) {
  const questions = questionMap();
  const answers = includeDefaults ? defaultAnswers() : {};

  for (const [id, rawValue] of Object.entries(input || {})) {
    const question = questions.get(id);
    if (!question) {
      continue;
    }

    answers[id] = question.type === "text"
      ? normalizeTextAnswer(rawValue)
      : normalizeScaleAnswer(question, rawValue);
  }

  return answers;
}

function mergeAnswers(previousAnswers = {}, nextAnswers = {}) {
  return {
    ...sanitizeAnswers(previousAnswers),
    ...sanitizeAnswers(nextAnswers, { includeDefaults: false })
  };
}

function isAnswered(question, value) {
  if (question.type === "text") {
    return Boolean(String(value || "").trim());
  }

  return value !== "" && Number.isInteger(Number(value));
}

function completionStats(answers = {}) {
  const questions = allQuestions();
  const required = questions.filter((question) => question.required);
  const answeredRequired = required.filter((question) => isAnswered(question, answers[question.id]));
  const answeredTotal = questions.filter((question) => isAnswered(question, answers[question.id])).length;

  return {
    answeredRequired: answeredRequired.length,
    totalRequired: required.length,
    answeredTotal,
    totalQuestions: questions.length,
    percent: Math.round((answeredRequired.length / required.length) * 100)
  };
}

function validateRequiredAnswers(answers) {
  const missing = allQuestions().filter((question) => question.required && !isAnswered(question, answers[question.id]));
  if (missing.length) {
    throw new Error("Bitte beantworte alle Pflichtfragen, bevor du die Evaluation abschickst.");
  }
}

function normalizeStore(store) {
  store.responses = Array.isArray(store.responses) ? store.responses : [];
  return store;
}

async function ensureStoreFile() {
  try {
    await fs.access(storePath);
  } catch {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(storePath, `${JSON.stringify(defaultStore(), null, 2)}\n`);
  }
}

export function getQuestionSections() {
  return structuredClone(QUESTION_SECTIONS);
}

export async function readEvaluationStore() {
  if (inMemoryStore) {
    return structuredClone(inMemoryStore);
  }

  await ensureStoreFile();
  const raw = await fs.readFile(storePath, "utf8");
  inMemoryStore = normalizeStore(JSON.parse(raw));
  return structuredClone(inMemoryStore);
}

export async function writeEvaluationStore(nextStore) {
  inMemoryStore = structuredClone(nextStore);
  await fs.writeFile(storePath, `${JSON.stringify(nextStore, null, 2)}\n`);
  return structuredClone(inMemoryStore);
}

export async function updateEvaluationStore(mutator) {
  const store = await readEvaluationStore();
  const result = await mutator(store);
  await writeEvaluationStore(store);
  return result;
}

export function getParticipant(store, participantId) {
  return store.responses.find((entry) => entry.id === participantId) || null;
}

export function registerOrResumeParticipant(store, { className, studentName }) {
  const safeClassName = normalizeName(className);
  const safeStudentName = normalizeName(studentName);

  if (safeClassName.length < 2) {
    throw new Error("Bitte gib eine Klasse oder einen Kurs an.");
  }

  if (safeStudentName.length < 2) {
    throw new Error("Bitte gib einen Namen, ein Kürzel oder einen Alias an.");
  }

  const existing = store.responses.find((entry) => (
    normalizeKey(entry.className) === normalizeKey(safeClassName)
    && normalizeKey(entry.studentName) === normalizeKey(safeStudentName)
  ));

  if (existing) {
    existing.updatedAt = now();
    return existing;
  }

  const timestamp = now();
  const participant = {
    id: makeId("pn-eval"),
    className: safeClassName,
    studentName: safeStudentName,
    status: "draft",
    answers: defaultAnswers(),
    createdAt: timestamp,
    updatedAt: timestamp,
    submittedAt: ""
  };

  store.responses.push(participant);
  return participant;
}

export function saveDraft(store, participantId, nextAnswers) {
  const participant = getParticipant(store, participantId);
  if (!participant) {
    throw new Error("Schüler*innen-Sitzung nicht gefunden.");
  }

  participant.answers = mergeAnswers(participant.answers, nextAnswers);
  participant.updatedAt = now();
  return participant;
}

export function submitSurvey(store, participantId, nextAnswers) {
  const participant = saveDraft(store, participantId, nextAnswers);
  validateRequiredAnswers(participant.answers);
  const timestamp = now();
  participant.status = "submitted";
  participant.updatedAt = timestamp;
  participant.submittedAt = timestamp;
  return participant;
}

export function buildStudentSession(store, participantId) {
  const participant = getParticipant(store, participantId);
  if (!participant) {
    return null;
  }

  return {
    id: participant.id,
    className: participant.className,
    studentName: participant.studentName,
    status: participant.status,
    answers: structuredClone(participant.answers),
    completion: completionStats(participant.answers),
    updatedAt: participant.updatedAt,
    submittedAt: participant.submittedAt
  };
}

function averageForQuestion(responses, questionId) {
  const values = responses
    .map((response) => Number(response.answers?.[questionId]))
    .filter((value) => Number.isFinite(value) && value > 0);

  if (!values.length) {
    return null;
  }

  return {
    average: Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2)),
    count: values.length
  };
}

function classSummaries(responses) {
  const grouped = new Map();

  for (const response of responses) {
    const key = response.className;
    const bucket = grouped.get(key) || [];
    bucket.push(response);
    grouped.set(key, bucket);
  }

  return [...grouped.entries()]
    .map(([className, entries]) => ({
      className,
      registrations: entries.length,
      submitted: entries.filter((entry) => entry.status === "submitted").length,
      inProgress: entries.filter((entry) => entry.status !== "submitted").length
    }))
    .sort((left, right) => left.className.localeCompare(right.className, "de"));
}

export function buildTeacherOverview(store) {
  const responses = [...store.responses].sort((left, right) => (
    new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()
  ));
  const submitted = responses.filter((entry) => entry.status === "submitted");
  const averages = allQuestions()
    .filter((question) => question.type !== "text")
    .map((question) => ({
      id: question.id,
      label: question.label,
      type: question.type,
      ...(averageForQuestion(submitted, question.id) || { average: null, count: 0 })
    }));

  return {
    summary: {
      totalRegistrations: responses.length,
      submittedCount: submitted.length,
      inProgressCount: responses.length - submitted.length,
      classCount: new Set(responses.map((entry) => entry.className)).size,
      submissionRate: responses.length ? Math.round((submitted.length / responses.length) * 100) : 0
    },
    classes: classSummaries(responses),
    questions: getQuestionSections(),
    averages,
    responses: responses.map((entry) => ({
      id: entry.id,
      className: entry.className,
      studentName: entry.studentName,
      status: entry.status,
      answers: structuredClone(entry.answers),
      completion: completionStats(entry.answers),
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      submittedAt: entry.submittedAt
    }))
  };
}

function csvEscape(value) {
  const stringValue = String(value ?? "");
  if (!/[",\n]/.test(stringValue)) {
    return stringValue;
  }

  return `"${stringValue.replaceAll('"', '""')}"`;
}

export function buildCsvExport(store) {
  const headers = [
    "id",
    "klasse",
    "schueler_in",
    "status",
    "created_at",
    "updated_at",
    "submitted_at",
    ...allQuestions().map((question) => question.id)
  ];

  const lines = [headers.join(",")];

  for (const response of store.responses) {
    const row = [
      response.id,
      response.className,
      response.studentName,
      response.status,
      response.createdAt,
      response.updatedAt,
      response.submittedAt || "",
      ...allQuestions().map((question) => response.answers?.[question.id] ?? "")
    ].map(csvEscape);

    lines.push(row.join(","));
  }

  return `${lines.join("\n")}\n`;
}
