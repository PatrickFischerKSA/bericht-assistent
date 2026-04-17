const CRITERIA = [
  {
    id: "overall",
    label: "Gesamteindruck",
    keywords: ["übersicht", "struktur", "aufbau", "gliederung", "dossier", "darstellung", "einleitung", "schluss"],
    score: (metrics, hits) => scoreFromRanges(hits + metrics.headingCount + metrics.listCount, [4, 8, 12]),
    comment: (score, metrics) => {
      if (score >= 4) {
        return `Der Gesamteindruck ist stimmig und gut organisiert. Der Text wirkt umfangreich genug für eine belastbare Beurteilung und zeigt mit ${metrics.headingCount || "mehreren"} erkennbaren Strukturmarkern eine klare Anlage.`;
      }
      if (score === 3) {
        return "Der Gesamteindruck ist insgesamt gelungen und die Anlage der Arbeit ist gut erkennbar. Für eine noch stärkere Wirkung könnten Aufbau und Schwerpunktsetzung stellenweise klarer profiliert werden.";
      }
      if (score === 2) {
        return "Der Gesamteindruck ist grundsätzlich nachvollziehbar, wirkt aber noch etwas uneinheitlich. Eine klarere Gliederung und ein bewussterer Fokus würden die Arbeit deutlich stärken.";
      }
      return "Der Gesamteindruck bleibt noch zu vage, um eine starke Gesamtwirkung zu entfalten. Vor allem Struktur, Schwerpunktsetzung und inhaltliche Dichte müssten klarer ausgearbeitet werden.";
    }
  },
  {
    id: "handlung",
    label: "Handlung und Inhaltssicherheit",
    keywords: ["handlung", "inhalt", "zusammenfassung", "kapitel", "ereignis", "verlauf", "konflikt", "wendepunkt", "schluss", "chronologie"],
    score: (metrics, hits) => scoreFromRanges(hits + metrics.timelineSignals, [5, 10, 16]),
    comment: (score) => {
      if (score >= 4) {
        return "Die Darstellung des Handlungsverlaufs wirkt sehr sicher. Zentrale Stationen, Konflikte und Wendepunkte sind erkennbar verknüpft und ergeben ein gut nachvollziehbares Gesamtbild.";
      }
      if (score === 3) {
        return "Der Handlungsverlauf ist insgesamt gut erkennbar und die wichtigsten Entwicklungsschritte werden sichtbar. Für eine noch präzisere Bewertung könnten Übergänge und Wendepunkte stellenweise genauer markiert werden.";
      }
      if (score === 2) {
        return "Die Grundhandlung ist vorhanden, bleibt aber eher zusammenfassend als präzise entfaltet. Vor allem Abfolge, Gewichtung und Zuspitzung zentraler Ereignisse könnten klarer herausgearbeitet werden.";
      }
      return "Die Darstellung der Handlung bleibt zu lückenhaft oder zu ungenau. Für eine tragfähige Beurteilung müssten zentrale Ereignisse und ihre Abfolge deutlich klarer dargestellt werden.";
    }
  },
  {
    id: "figuren",
    label: "Figurenanalyse",
    keywords: ["figur", "figuren", "protagonist", "antagonist", "charakter", "motivation", "entwicklung", "beziehung", "rolle", "konflikt"],
    score: (metrics, hits) => scoreFromRanges(hits + metrics.characterSignals, [4, 8, 14]),
    comment: (score) => {
      if (score >= 4) {
        return "Die Figuren werden differenziert erfasst und nicht nur benannt, sondern auch in ihrer Funktion, Motivation und Entwicklung sichtbar gemacht. Das spricht für eine solide analytische Durchdringung.";
      }
      if (score === 3) {
        return "Die Figurenarbeit ist insgesamt überzeugend und geht über reine Beschreibung hinaus. Noch stärker würde die Analyse wirken, wenn Beziehungen und Entwicklungen konsequenter gegeneinander profiliert würden.";
      }
      if (score === 2) {
        return "Figuren werden erkennbar behandelt, bleiben aber eher beschreibend als analytisch. Vor allem Motivation, Funktion und Entwicklung könnten deutlicher herausgearbeitet werden.";
      }
      return "Die Figurenanalyse bleibt noch sehr knapp oder oberflächlich. Für eine fundierte Beurteilung müssten zentrale Figuren genauer beschrieben und in ihrer Funktion deutlicher gedeutet werden.";
    }
  },
  {
    id: "themen",
    label: "Themen und Deutung",
    keywords: ["thema", "deutung", "interpretation", "motiv", "konflikt", "spannung", "aussage", "ambivalenz", "frage", "bedeutung"],
    score: (metrics, hits) => scoreFromRanges(hits + metrics.abstractSignals, [4, 8, 14]),
    comment: (score) => {
      if (score >= 4) {
        return "Zentrale Themen werden nicht nur benannt, sondern differenziert gedeutet. Die Arbeit zeigt, dass über inhaltliche Reproduktion hinaus auch interpretative Zusammenhänge erkannt werden.";
      }
      if (score === 3) {
        return "Die thematische Arbeit ist klar erkennbar und führt zu nachvollziehbaren Deutungen. Für noch mehr Tiefe könnten Gegenpositionen, Spannungen oder Ambivalenzen stärker ausgeleuchtet werden.";
      }
      if (score === 2) {
        return "Themen werden angesprochen, bleiben aber häufig noch auf einer allgemeinen Ebene. Eine stärkere interpretative Zuspitzung würde die Aussagekraft deutlich erhöhen.";
      }
      return "Themen und Deutungen sind bisher nur ansatzweise sichtbar. Für eine belastbare Bewertung müssten zentrale Motive und ihre Bedeutung klarer herausgearbeitet werden.";
    }
  },
  {
    id: "textarbeit",
    label: "Arbeit am Text",
    keywords: ["textstelle", "zitat", "beleg", "sprachlich", "erzähler", "passage", "formulierung", "wortwahl", "stil", "abschnitt"],
    score: (metrics, hits) => scoreFromRanges(hits + metrics.quoteSignals + metrics.quoteCount, [3, 7, 12]),
    comment: (score, metrics) => {
      if (score >= 4) {
        return `Die Arbeit am Text ist deutlich sichtbar. Mit ${metrics.quoteCount} erkannten Zitat- oder Markierungssignalen stützt der Text Aussagen erkennbar durch konkrete Belege und textnahe Beobachtungen.`;
      }
      if (score === 3) {
        return "Es sind passende Ansätze textnaher Arbeit erkennbar und Aussagen werden stellenweise gestützt. Noch überzeugender würde die Analyse wirken, wenn Belege konsequenter ausgewertet und nicht nur erwähnt würden.";
      }
      if (score === 2) {
        return "Einzelne Textbezüge sind vorhanden, bleiben aber eher knapp oder punktuell. Für eine stärkere Bewertung sollten Zitate und Beobachtungen deutlicher in die Argumentation eingebunden werden.";
      }
      return "Echte Textarbeit ist bislang kaum sichtbar. Für eine fundierte literarische Beurteilung wären mehr konkrete Textbelege und deren Auswertung zentral.";
    }
  },
  {
    id: "einordnung",
    label: "Literarische Einordnung",
    keywords: ["autor", "epoche", "gattung", "novelle", "roman", "drama", "historisch", "kontext", "rezeption", "entstehung"],
    score: (_metrics, hits) => scoreFromRanges(hits, [3, 6, 10]),
    comment: (score) => {
      if (score >= 4) {
        return "Die literarische Einordnung ist klar erkennbar und sinnvoll mit der inhaltlichen Arbeit verknüpft. Angaben zu Gattung, Autor, Kontext oder Wirkung werden stimmig eingebunden.";
      }
      if (score === 3) {
        return "Literarische Einordnung ist vorhanden und überwiegend treffend. Noch stärker würde sie wirken, wenn Kontextinformationen konsequenter mit der eigentlichen Analyse verbunden würden.";
      }
      if (score === 2) {
        return "Ansätze literarischer Einordnung sind vorhanden, bleiben aber eher knapp oder additiv. Hier wäre mehr Verknüpfung mit der Textanalyse wünschenswert.";
      }
      return "Eine literarische Einordnung ist bisher kaum sichtbar oder sehr knapp. Für eine vollständige Beurteilung sollten Gattung, Kontext oder Autor deutlicher eingebracht werden.";
    }
  },
  {
    id: "gestaltung",
    label: "Gestaltung und Adressatenbezug",
    keywords: ["übersicht", "navigation", "layout", "lernziel", "zielgruppe", "erklärung", "abschnitt", "aufgabe", "struktur", "darstellung"],
    score: (metrics, hits) => scoreFromRanges(hits + metrics.headingCount + metrics.listCount, [4, 8, 13]),
    comment: (score, metrics) => {
      if (score >= 4) {
        return `Die Gestaltung wirkt übersichtlich und adressatengerecht. Die erkennbare Struktur mit ${metrics.paragraphCount} Absätzen unterstützt das Verständnis und spricht für eine lernfreundliche Anlage.`;
      }
      if (score === 3) {
        return "Die Gestaltung ist gut verständlich und unterstützt die Orientierung. Mit noch klarerer Verdichtung und einer bewussteren Gewichtung zentraler Teile könnte die Leserführung weiter gewinnen.";
      }
      if (score === 2) {
        return "Die Darstellung ist grundsätzlich brauchbar, wirkt aber noch nicht durchgehend klar geführt. Vor allem Struktur, Leseführung und sprachliche Verdichtung könnten verbessert werden.";
      }
      return "Die Gestaltung erschwert den Zugriff auf die Inhalte noch zu stark. Für eine adressatengerechte Wirkung müssten Aufbau, Leseführung und Übersicht deutlicher verbessert werden.";
    }
  },
  {
    id: "quiz",
    label: "Quiz",
    keywords: ["quiz", "frage", "fragen", "multiple choice", "wahr", "falsch", "ordne", "zuordnung", "lückentext", "prüfung"],
    score: (metrics, hits) => scoreFromRanges(hits + metrics.quizSignals + metrics.questionMarkCount, [2, 5, 9]),
    comment: (score) => {
      if (score >= 4) {
        return "Ein eigenständiger Quiz- oder Aufgabenbereich ist deutlich erkennbar und sinnvoll auf die Inhalte abgestimmt. Die Aufgabenform wirkt abwechslungsreich genug, um Wissen nicht nur oberflächlich abzufragen.";
      }
      if (score === 3) {
        return "Ein Quizbereich ist vorhanden und passt grundsätzlich zum Material. Für noch mehr Qualität könnten Anspruchsniveau, Variation oder die Rückbindung an zentrale Inhalte weiter geschärft werden.";
      }
      if (score === 2) {
        return "Es gibt Hinweise auf Aufgaben oder Quiz-Elemente, deren Funktion aber noch etwas begrenzt bleibt. Eine stärkere Verzahnung mit den Kerninhalten wäre sinnvoll.";
      }
      return "Ein klarer Quiz- oder Aufgabenbereich ist kaum erkennbar. Falls er Teil des Dossiers sein soll, müsste er deutlicher ausgearbeitet und inhaltlich angebunden werden.";
    }
  }
];

const ZAMZAR_API_BASE = "https://api.zamzar.com/v1";

function scoreFromRanges(value, thresholds) {
  if (value >= thresholds[2]) {
    return 4;
  }
  if (value >= thresholds[1]) {
    return 3;
  }
  if (value >= thresholds[0]) {
    return 2;
  }
  return 1;
}

function decodeHtmlEntities(text) {
  return text
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function extractTitleFromHtml(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch?.[1]) {
    return decodeHtmlEntities(cleanText(titleMatch[1]));
  }

  const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([\s\S]*?)["']/i);
  if (ogTitleMatch?.[1]) {
    return decodeHtmlEntities(cleanText(ogTitleMatch[1]));
  }

  return "";
}

function stripHtml(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<\/(p|div|section|article|li|ul|ol|h1|h2|h3|h4|h5|h6|blockquote|tr)>/gi, "\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, " ")
  );
}

function cleanText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeForSearch(text) {
  return cleanText(text).toLowerCase();
}

function countKeywordHits(searchText, keywords) {
  return keywords.reduce((sum, keyword) => {
    const pattern = new RegExp(`\\b${escapeRegExp(keyword.toLowerCase())}\\b`, "g");
    const matches = searchText.match(pattern);
    return sum + (matches ? matches.length : 0);
  }, 0);
}

function countNegatedKeywordHits(searchText, keywords) {
  return keywords.reduce((sum, keyword) => {
    const escapedKeyword = escapeRegExp(keyword.toLowerCase());
    const beforePattern = new RegExp(`\\b(?:nicht|kein(?:e|en|er|em)?|ohne)\\b(?:\\W+\\w+){0,4}\\W+${escapedKeyword}\\b`, "g");
    const afterPattern = new RegExp(`\\b${escapedKeyword}\\b(?:\\W+\\w+){0,4}\\W+\\b(?:fehlt|fehlen|optional|freiwillig)\\b`, "g");
    const beforeMatches = searchText.match(beforePattern);
    const afterMatches = searchText.match(afterPattern);
    return sum + (beforeMatches ? beforeMatches.length : 0) + (afterMatches ? afterMatches.length : 0);
  }, 0);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function computeMetrics(text) {
  const normalized = cleanText(text);
  const searchText = normalizeForSearch(normalized);
  const lines = normalized.split("\n").map((line) => line.trim()).filter(Boolean);
  const paragraphs = normalized.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const words = normalized.split(/\s+/).filter(Boolean);
  const headingCount = lines.filter((line) => line.length > 0 && line.length <= 80 && !/[.?!:]$/.test(line)).length;
  const listCount = normalized.split("\n").filter((line) => /^\s*(?:[-*•]|\d+\.)\s+/.test(line)).length;
  const quoteCount = (normalized.match(/[„“"«»]/g) || []).length;
  const questionMarkCount = (normalized.match(/\?/g) || []).length;

  return {
    wordCount: words.length,
    paragraphCount: paragraphs.length,
    headingCount,
    listCount,
    quoteCount,
    questionMarkCount,
    timelineSignals: countKeywordHits(searchText, ["zuerst", "dann", "später", "schliesslich", "schließlich", "am ende", "zunächst", "darauf"]),
    characterSignals: countKeywordHits(searchText, ["figur", "figuren", "person", "beziehung", "motivation", "entwicklung"]),
    abstractSignals: countKeywordHits(searchText, ["thema", "motiv", "deutung", "interpretation", "bedeutung", "ambivalenz"]),
    quoteSignals: countKeywordHits(searchText, ["zitat", "textstelle", "beleg", "erzähler", "wortwahl"]),
    quizSignals: countKeywordHits(searchText, ["quiz", "frage", "fragen", "wahr", "falsch", "multiple choice", "ordne", "zu"]),
    readingMinutes: Math.max(1, Math.round(words.length / 180))
  };
}

function defaultAssignmentScope(id) {
  return id === "overall";
}

function buildOutOfScopeComment(label, assignmentTitle) {
  return `${label} steht im${assignmentTitle ? ` Auftrag „${assignmentTitle}“` : " Auftrag"} nicht ausdrücklich im Vordergrund. Dieser Aspekt sollte daher nur ergänzend und nicht als zentrales Bewertungskriterium gewichtet werden.`;
}

function summarizeText(metrics, sourceTitle) {
  const base = `Grundlage der Analyse ist ${sourceTitle ? `„${sourceTitle}“` : "das eingelesene Material"} mit ungefähr ${metrics.wordCount} Wörtern.`;
  if (metrics.wordCount >= 1400) {
    return `${base} Die Textmenge ist ausreichend, um Inhalt, Aufbau und Vertiefung differenziert einzuschätzen.`;
  }
  if (metrics.wordCount >= 700) {
    return `${base} Die Textmenge erlaubt eine solide Einschätzung, lässt aber an einzelnen Stellen offen, wie tief bestimmte Bereiche ausgearbeitet sind.`;
  }
  return `${base} Die Materialbasis ist eher knapp; Kommentare sollten deshalb besonders sorgfältig händisch überprüft und ergänzt werden.`;
}

export function analyzeReportSource({
  text = "",
  title = "",
  sourceLabel = "",
  assignmentText = "",
  assignmentTitle = ""
} = {}) {
  const cleanedText = cleanText(/<[^>]+>/.test(text) ? stripHtml(text) : text);
  if (!cleanedText) {
    throw new Error("Es konnte kein auswertbarer Text erkannt werden.");
  }

  const metrics = computeMetrics(cleanedText);
  const cleanedAssignmentText = cleanText(/<[^>]+>/.test(assignmentText) ? stripHtml(assignmentText) : assignmentText);
  const assignmentSearchText = cleanedAssignmentText ? normalizeForSearch(cleanedAssignmentText) : "";
  const assignmentMetrics = cleanedAssignmentText ? computeMetrics(cleanedAssignmentText) : null;
  const sourceSearchText = normalizeForSearch(cleanedText);
  const criteria = CRITERIA.map((criterion) => {
    const hits = countKeywordHits(sourceSearchText, criterion.keywords);
    const assignmentHits = assignmentSearchText ? countKeywordHits(assignmentSearchText, criterion.keywords) : 0;
    const negatedAssignmentHits = assignmentSearchText ? countNegatedKeywordHits(assignmentSearchText, criterion.keywords) : 0;
    const effectiveAssignmentHits = Math.max(0, assignmentHits - negatedAssignmentHits);
    const inScope = cleanedAssignmentText
      ? effectiveAssignmentHits > 0 || defaultAssignmentScope(criterion.id)
      : true;
    const points = inScope ? criterion.score(metrics, hits) : null;
    return {
      id: criterion.id,
      label: criterion.label,
      points,
      maxPoints: 4,
      included: inScope,
      assignmentHits: effectiveAssignmentHits,
      comment: inScope
        ? criterion.comment(points, metrics, hits)
        : buildOutOfScopeComment(criterion.label, assignmentTitle)
    };
  });

  const totalPoints = criteria.reduce((sum, entry) => sum + (entry.included ? entry.points : 0), 0);
  const maxPoints = criteria.reduce((sum, entry) => sum + (entry.included ? entry.maxPoints : 0), 0);

  return {
    title: title || sourceLabel || "Unbenannte Analysegrundlage",
    sourceLabel,
    metrics,
    assignment: cleanedAssignmentText
      ? {
          title: assignmentTitle || "Auftrag",
          metrics: assignmentMetrics
        }
      : null,
    summary: cleanedAssignmentText
      ? `${summarizeText(metrics, title || sourceLabel)} Der hochgeladene Auftrag${assignmentTitle ? ` „${assignmentTitle}“` : ""} wurde bei der Gewichtung der Kriterien mitberücksichtigt.`
      : summarizeText(metrics, title || sourceLabel),
    criteria,
    totalPoints,
    maxPoints
  };
}

export async function fetchSourceFromUrl(inputUrl) {
  let parsedUrl;
  try {
    parsedUrl = new URL(String(inputUrl || "").trim());
  } catch {
    throw new Error("Bitte eine vollständige URL mit http:// oder https:// eingeben.");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("Es werden nur http- und https-Adressen unterstützt.");
  }

  const response = await fetch(parsedUrl, {
    headers: {
      "user-agent": "bericht-assistent/1.0"
    }
  });

  if (!response.ok) {
    throw new Error(`Die URL konnte nicht geladen werden (${response.status}).`);
  }

  const contentType = String(response.headers.get("content-type") || "");
  const rawText = await response.text();
  const title = contentType.includes("text/html")
    ? extractTitleFromHtml(rawText)
    : parsedUrl.hostname;
  const extractedText = contentType.includes("text/html")
    ? stripHtml(rawText)
    : rawText;

  return {
    url: parsedUrl.toString(),
    title: title || parsedUrl.hostname,
    contentType,
    text: cleanText(extractedText).slice(0, 120000)
  };
}

export function buildWordReportHtml(payload = {}) {
  const title = escapeHtml(payload.reportTitle || "Beurteilungsbericht");
  const meta = payload.meta || {};
  const criteria = Array.isArray(payload.criteria) ? payload.criteria : [];
  const totalPoints = criteria.reduce((sum, entry) => sum + (entry.included ? Number(entry.points || 0) : 0), 0);
  const maxPoints = criteria.reduce((sum, entry) => sum + (entry.included ? Number(entry.maxPoints || 4) : 0), 0);

  return `<!doctype html>
  <html lang="de">
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        body { font-family: Calibri, Arial, sans-serif; color: #202124; margin: 32px; line-height: 1.45; }
        h1, h2 { font-family: Georgia, "Times New Roman", serif; }
        h1 { margin-bottom: 12px; }
        .meta { margin-bottom: 24px; }
        .meta p { margin: 4px 0; }
        .summary, .criterion { margin-bottom: 18px; }
        .criterion { border: 1px solid #d7dce1; padding: 14px; border-radius: 10px; }
        .criterion-head { display: flex; justify-content: space-between; gap: 16px; margin-bottom: 8px; }
        .criterion p { white-space: pre-wrap; margin: 0; }
        .total { margin-top: 24px; font-weight: 700; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <section class="meta">
        <p><strong>Name:</strong> ${escapeHtml(meta.studentName || "")}</p>
        <p><strong>Klasse:</strong> ${escapeHtml(meta.className || "")}</p>
        <p><strong>Datum:</strong> ${escapeHtml(meta.date || "")}</p>
        <p><strong>Thema:</strong> ${escapeHtml(meta.topic || "")}</p>
        <p><strong>Quelle:</strong> ${escapeHtml(meta.sourceTitle || "")}</p>
        <p><strong>Auftrag:</strong> ${escapeHtml(meta.assignmentTitle || "")}</p>
      </section>
      <section class="summary">
        <h2>Gesamteindruck</h2>
        <p>${escapeHtml(payload.summary || "")}</p>
      </section>
      ${criteria.map((entry) => `
        <section class="criterion">
          <div class="criterion-head">
            <strong>${escapeHtml(entry.label || "")}</strong>
            <span>${entry.included ? `${escapeHtml(String(entry.points || 0))} / ${escapeHtml(String(entry.maxPoints || 4))}` : "nicht gewichtet"}</span>
          </div>
          <p>${escapeHtml(entry.comment || "")}</p>
        </section>
      `).join("")}
      <p class="total">Punktetotal: ${escapeHtml(String(totalPoints))} / ${escapeHtml(String(maxPoints))}</p>
    </body>
  </html>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function buildBasicAuthHeader(apiKey) {
  return `Basic ${Buffer.from(`${apiKey}:`).toString("base64")}`;
}

function parseFailureMessage(payload, fallbackMessage) {
  if (payload?.failure?.message) {
    return payload.failure.message;
  }
  if (payload?.message) {
    return payload.message;
  }
  if (payload?.errors && Array.isArray(payload.errors) && payload.errors[0]?.message) {
    return payload.errors[0].message;
  }
  return fallbackMessage;
}

async function parseJsonSafely(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return { message: text };
  }
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isZamzarConfigured() {
  return Boolean(process.env.ZAMZAR_API_KEY);
}

export async function convertMp3ToTextWithZamzar({
  buffer,
  filename = "audio.mp3",
  targetFormat = "txt",
  pollDelayMs = 2500,
  maxAttempts = 25
} = {}) {
  const apiKey = process.env.ZAMZAR_API_KEY;
  if (!apiKey) {
    throw new Error("Zamzar ist noch nicht konfiguriert. Bitte zuerst die Umgebungsvariable ZAMZAR_API_KEY setzen.");
  }

  if (!buffer || !(buffer instanceof Uint8Array) || buffer.byteLength === 0) {
    throw new Error("Für die Zamzar-Umwandlung wurde keine MP3-Datei übergeben.");
  }

  const authHeader = buildBasicAuthHeader(apiKey);
  const form = new FormData();
  form.append("source_file", new Blob([buffer], { type: "audio/mpeg" }), filename);
  form.append("target_format", targetFormat);

  const createResponse = await fetch(`${ZAMZAR_API_BASE}/jobs`, {
    method: "POST",
    headers: {
      Authorization: authHeader
    },
    body: form
  });

  const createPayload = await parseJsonSafely(createResponse);
  if (!createResponse.ok) {
    throw new Error(parseFailureMessage(createPayload, "Die MP3-Datei konnte nicht an Zamzar übergeben werden."));
  }

  const jobId = createPayload?.id;
  if (!jobId) {
    throw new Error("Zamzar hat keine gültige Job-ID zurückgegeben.");
  }

  let job = createPayload;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    if (job?.status === "successful" && Array.isArray(job.target_files) && job.target_files.length > 0) {
      break;
    }

    if (job?.status === "failed") {
      throw new Error(parseFailureMessage(job, "Die Zamzar-Umwandlung ist fehlgeschlagen."));
    }

    await delay(pollDelayMs);
    const statusResponse = await fetch(`${ZAMZAR_API_BASE}/jobs/${jobId}`, {
      headers: {
        Authorization: authHeader
      }
    });
    const statusPayload = await parseJsonSafely(statusResponse);
    if (!statusResponse.ok) {
      throw new Error(parseFailureMessage(statusPayload, "Der Zamzar-Status konnte nicht abgefragt werden."));
    }
    job = statusPayload;
  }

  if (job?.status !== "successful" || !Array.isArray(job.target_files) || job.target_files.length === 0) {
    throw new Error("Zamzar hat nicht rechtzeitig ein Textresultat geliefert. Bitte versuche es erneut.");
  }

  const targetFileId = job.target_files[0]?.id;
  if (!targetFileId) {
    throw new Error("Zamzar hat kein herunterladbares Textresultat geliefert.");
  }

  const downloadResponse = await fetch(`${ZAMZAR_API_BASE}/files/${targetFileId}/content`, {
    headers: {
      Authorization: authHeader
    },
    redirect: "manual"
  });

  if (downloadResponse.status >= 300 && downloadResponse.status < 400) {
    const redirectUrl = downloadResponse.headers.get("location");
    if (!redirectUrl) {
      throw new Error("Das Zamzar-Resultat verweist auf keinen gültigen Download-Link.");
    }

    const redirected = await fetch(redirectUrl);
    if (!redirected.ok) {
      throw new Error("Das konvertierte Textresultat konnte nicht heruntergeladen werden.");
    }
    return {
      text: cleanText(await redirected.text()),
      job
    };
  }

  if (!downloadResponse.ok) {
    const downloadPayload = await parseJsonSafely(downloadResponse);
    throw new Error(parseFailureMessage(downloadPayload, "Das konvertierte Textresultat konnte nicht heruntergeladen werden."));
  }

  return {
    text: cleanText(await downloadResponse.text()),
    job
  };
}
