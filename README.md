# pruefungsnavigator_evaluation

Eigenständiges Evaluationstool zum [Prüfungsnavigator](https://patrickfischerksa.github.io/pruefungsnavigator/).

Die App bietet:

- Schüler*innen-Registrierung mit Klasse und Name/Kürzel
- verbindlichen Evaluationsfragebogen mit Zwischenspeichern und Abschicken
- Wiederaufnahme derselben Rückmeldung bei erneuter Registrierung
- passwortgeschütztes Lehrerdashboard
- Übersicht über alle Antworten, Klassenfilter und CSV-Export
- dateibasierte Speicherung in `data/pruefungsnavigator-evaluation-store.json`
- vorbereitete Render-Konfiguration mit persistentem Speicher

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

## Render

Das Repo ist für Render als Node Web Service vorbereitet.

In [render.yaml](/Users/patrickfischer/Documents/New%20project/pruefungsnavigator_evaluation/render.yaml) ist bereits hinterlegt:

- `npm install` als Build Command
- `npm start` als Start Command
- `HOST=0.0.0.0`
- `DATA_DIR=/var/data`
- `healthCheckPath=/healthz`
- persistente Disk unter `/var/data`

Für Render solltest du mindestens diese Variable setzen:

- `TEACHER_DASHBOARD_PASSWORD`

Optional:

- `NAVIGATOR_URL`

Wichtig:

- Die Antworten werden auf Render in der persistenten Disk unter `/var/data/pruefungsnavigator-evaluation-store.json` gespeichert.
- Wenn du `render.yaml` beim Erstellen des Services verwendest, ist die Grundkonfiguration bereits vorbereitet.
- Nach dem ersten Deploy erreichst du die App über die von Render vergebene URL.
