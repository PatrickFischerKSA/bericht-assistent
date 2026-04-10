# pruefungsnavigator_evaluation

Eigenständiges Evaluationstool zum [Prüfungsnavigator](https://patrickfischerksa.github.io/pruefungsnavigator/).

Die App bietet:

- Schüler*innen-Registrierung mit Klasse und Name/Kürzel
- verbindlichen Evaluationsfragebogen mit Zwischenspeichern und Abschicken
- Wiederaufnahme derselben Rückmeldung bei erneuter Registrierung
- passwortgeschütztes Lehrerdashboard
- Übersicht über alle Antworten, Klassenfilter und CSV-Export
- dateibasierte Speicherung in `data/pruefungsnavigator-evaluation-store.json`

## Start

```bash
npm install
npm test
npm start
```

Danach läuft die App standardmäßig unter [http://127.0.0.1:3026](http://127.0.0.1:3026).

## Zugänge

- `/` Startseite
- `/student` Schüler*innen-Befragung
- `/teacher-entry` Login fürs Lehrerdashboard
- `/teacher` Lehrerdashboard

## Standardpasswort

Das Lehrerdashboard verwendet lokal standardmäßig dieses Passwort:

```text
pruefungsnavigator
```

Du kannst es über die Umgebungsvariable `TEACHER_DASHBOARD_PASSWORD` überschreiben.

Optional kannst du mit `NAVIGATOR_URL` einen anderen Link zum Prüfungsnavigator hinterlegen.

## Hinweis zur Datenspeicherung

Die Antworten werden lokal als JSON-Datei gespeichert. Auf Hosting-Plattformen ohne persistentes Volume
ist dieses Dateisystem nicht dauerhaft. Für längeren Live-Betrieb solltest du später persistenten Storage ergänzen.
