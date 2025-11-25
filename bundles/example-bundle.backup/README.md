# Example Bundle v2.0 - Fortgeschrittenes NodeCG Next Bundle

Ein umfassendes Beispiel-Bundle, das alle Features von NodeCG Next demonstriert.

## 📋 Überblick

Dieses Bundle zeigt die vollständige Palette der NodeCG Next Features:

- ✅ **8 Replicants** mit JSON-Schema-Validierung
- ✅ **5 Broadcast Graphics** (Lower Third, Scoreboard, Timer, Overlay, Ticker)
- ✅ **5 Dashboard Panels** (Hauptsteuerung, Scoreboard, Timer, Assets, Debug)
- ✅ **Erweiterte Extension** mit Timer-Logic und Event-System
- ✅ **Message Handlers** für bidirektionale Kommunikation
- ✅ **Automatische System-Stats** und Event-Logging
- ✅ **Asset-Management** (Images, Logos, Videos, Audio)

## 🎯 Features im Detail

### 1. Lower Third Graphic

**Verwendung:** Zeigt Name und Titel einer Person an

**Replicants:**

- `currentName` (String) - Name der Person
- `currentTitle` (String) - Titel/Position der Person
- `isVisible` (Boolean) - Sichtbarkeit der Grafik

**Dashboard-Steuerung:**

- Panel: **Hauptsteuerung** → Lower Third Sektion
- Name und Titel eingeben
- "Anzeigen" / "Ausblenden" Buttons

**Graphics:**

- `lower-third.html` - Einzelne Lower Third Grafik
- `overlay.html` - Kombiniert alle Grafiken (inkl. Lower Third)

---

### 2. Scoreboard

**Verwendung:** Team-Scores für Wettbewerbe/Turniere

**Replicant:** `scoreboard` (Object)

```json
{
  "teamA": {
    "name": "Team Alpha",
    "score": 0,
    "logo": "",
    "color": "#667eea"
  },
  "teamB": {
    "name": "Team Beta",
    "score": 0,
    "logo": "",
    "color": "#764ba2"
  },
  "visible": false
}
```

**Schema:** `schemas/scoreboard.json`

**Dashboard-Steuerung:**

- Panel: **Scoreboard**
- Team-Namen und Farben anpassen
- Score mit +1/-1 Buttons ändern
- Sichtbarkeit umschalten
- Alle Scores zurücksetzen

**Messages:**

- `scoreboard:incrementTeamA` - Team A Score +1
- `scoreboard:incrementTeamB` - Team B Score +1
- `scoreboard:decrementTeamA` - Team A Score -1
- `scoreboard:decrementTeamB` - Team B Score -1
- `scoreboard:reset` - Beide Scores auf 0 zurücksetzen

**Graphics:**

- `scoreboard.html` - Dedizierte Scoreboard-Grafik
- `overlay.html` - Kombiniert alle Grafiken

---

### 3. Timer & Countdown

**Verwendung:** Match-Timer, Countdowns, Stopwatch

**Replicant:** `timer` (Object)

```json
{
  "duration": 300,
  "remaining": 300,
  "running": false,
  "visible": false,
  "countUp": false,
  "label": "Match Timer"
}
```

**Schema:** `schemas/timer.json`

**Dashboard-Steuerung:**

- Panel: **Timer & Countdown**
- Start/Stop/Reset Buttons
- Duration einstellen (Minuten:Sekunden)
- Quick-Time Buttons (1m, 5m, 10m, etc.)
- Count Up Modus umschalten
- Timer Label anpassen
- Sichtbarkeit umschalten

**Messages:**

- `timer:start` - Timer starten
- `timer:stop` - Timer stoppen
- `timer:reset` - Timer zurücksetzen

**Automatische Features:**

- Timer läuft automatisch in der Extension
- Sendet `timer:finished` Event bei Ablauf
- Farbwechsel bei niedrigen Zeiten (Warning/Critical)

**Graphics:**

- `timer.html` - Dedizierte Timer-Grafik
- `overlay.html` - Kombiniert alle Grafiken

---

### 4. News Ticker

**Verwendung:** Laufband für Nachrichten/Ankündigungen

**Replicant:** `ticker` (Object)

```json
{
  "messages": [
    {
      "id": "ticker-123456",
      "text": "Beispielnachricht",
      "priority": "normal",
      "timestamp": "2025-01-15T10:30:00Z"
    }
  ],
  "visible": false,
  "speed": 50
}
```

**Schema:** `schemas/ticker.json`

**Prioritäten:**

- `low` - Normale Farbe, niedriger Rang
- `normal` - Standard-Nachrichten
- `high` - Orange Farbe, höherer Rang
- `urgent` - Rot blinkend, höchster Rang

**Dashboard-Steuerung:**

- Panel: **Hauptsteuerung** → News Ticker Sektion
- Neue Nachricht eingeben und hinzufügen
- Ticker anzeigen/ausblenden
- Alle Nachrichten löschen

**Messages:**

- `ticker:addMessage` - Nachricht hinzufügen
  - Parameter: `{ text: "...", priority: "normal" }`
- `ticker:removeMessage` - Nachricht löschen (nach ID)
  - Parameter: `messageId` (String)
- `ticker:clearMessages` - Alle Nachrichten löschen

**Automatische Features:**

- Nachrichten werden nach Priorität sortiert
- Maximale Anzahl: 50 Nachrichten
- Maximale Länge: 200 Zeichen pro Nachricht
- Automatisches Scrolling mit konfigurierbarer Geschwindigkeit

**Graphics:**

- `ticker.html` - Dedizierte Ticker-Grafik
- `overlay.html` - Kombiniert alle Grafiken

---

### 5. Full Overlay

**Verwendung:** Alle Grafiken in einer einzigen Overlay-Datei

**Graphics:** `overlay.html`

**Features:**

- Kombiniert Lower Third, Scoreboard, Timer und Ticker
- Jede Komponente kann individuell ein-/ausgeblendet werden
- Synchronisiert mit allen Replicants
- Optimiert für 1920x1080 Output

**Verwendung in OBS:**

1. Browser Source hinzufügen
2. URL: `http://localhost:3000/bundles/example-bundle/graphics/overlay.html`
3. Größe: 1920x1080
4. Alle Elemente werden automatisch positioniert

---

## 🎛️ Dashboard Panels

### 1. Hauptsteuerung (Control Panel)

**Breite:** 3 Spalten

**Features:**

- Quick Controls für alle Komponenten
- Lower Third Name/Titel
- Scoreboard Visibility & Reset
- Timer Start/Stop/Reset
- News Ticker hinzufügen
- Quick Actions (Alles anzeigen, verstecken, zurücksetzen)
- Test-Modus mit Beispieldaten

---

### 2. Scoreboard Panel

**Breite:** 2 Spalten

**Features:**

- Detaillierte Team-Konfiguration
- Team-Namen anpassen
- Team-Farben mit Color Picker
- Score +1/-1 Buttons
- Live Score-Anzeige
- Visibility Toggle
- Reset Button mit Bestätigung

---

### 3. Timer & Countdown Panel

**Breite:** 2 Spalten

**Features:**

- Große Timer-Anzeige mit Echtzeit-Update
- Start/Stop/Reset Controls
- Duration Input (Minuten & Sekunden)
- Quick-Time Buttons (1m, 5m, 10m, 15m, 30m, 60m)
- Count Up / Count Down Toggle
- Timer Label Customization
- Visibility Toggle
- Status Indicator (Running/Paused)

---

### 4. Asset Manager Panel

**Breite:** 2 Spalten

**Features:**

- 4 Asset-Kategorien (Images, Logos, Videos, Audio)
- Drag & Drop Upload Areas
- Asset-Liste mit Thumbnails
- Delete-Buttons pro Asset
- Upload-Fortschrittsanzeige

**Hinweis:** Asset-Upload ist in dieser Demo-Version als Platzhalter implementiert.

---

### 5. Debug & Monitor Panel

**Breite:** 3 Spalten

**Features:**

- **System Stats:**
  - Uptime (Laufzeit)
  - Replicant Count
  - Message Count
  - Last Update Timestamp
- **Event Log:**
  - Alle Bundle-Events in Echtzeit
  - Farbcodiert nach Event-Type
  - Auto-Scroll Toggle
  - Clear Log Button
- **Active Replicants:**
  - Liste aller aktiven Replicants
  - Aktuelle Werte

**Event Types:**

- `name_changed` - Lower Third Name geändert
- `title_changed` - Lower Third Titel geändert
- `score_changed` - Team Score geändert
- `timer_state` - Timer gestartet/gestoppt
- `ticker_messages_changed` - Ticker Nachrichten aktualisiert
- `bundle_loaded` - Bundle erfolgreich geladen
- `bundle_unloaded` - Bundle wird entladen

---

## 🔧 Extension Features

### Event-Driven Architecture

Die Extension nutzt ein Event-System für alle Änderungen:

```javascript
// Replicant Changes werden automatisch geloggt
currentName.on('change', (newValue, oldValue) => {
  nodecg.log.info(`Name geändert: "${oldValue}" → "${newValue}"`);
  logMessage('name_changed', { from: oldValue, to: newValue });
});
```

### Timer-Logic

Der Timer läuft automatisch in der Extension:

- **Count Down:** Zählt von `duration` auf 0
- **Count Up:** Zählt von 0 aufwärts
- **Auto-Stop:** Stoppt bei 0 (Count Down)
- **Finished Event:** Sendet `timer:finished` Message bei Ablauf

### Message System

Alle Messages sind bidirektional:

**Von Dashboard zu Extension:**

```javascript
nodecg.sendMessage('scoreboard:incrementTeamA');
nodecg.sendMessage('ticker:addMessage', {
  text: 'Breaking News!',
  priority: 'urgent',
});
```

**Von Extension zu Dashboard/Graphics:**

```javascript
nodecg.sendMessage('timer:finished');
```

### Event Logging

Alle wichtigen Events werden in `messageLog` Replicant gespeichert:

- Automatische ID-Generierung
- ISO Timestamps
- Action Type & Details
- Maximale Größe: 100 Einträge (FIFO)

### System Stats

`systemStats` Replicant wird alle 5 Sekunden aktualisiert:

```javascript
{
  uptime: 1234,              // Prozess Uptime in Sekunden
  replicantCount: 8,         // Anzahl aktiver Replicants
  messageCount: 42,          // Anzahl Log-Einträge
  lastUpdate: "2025-01-15T..." // ISO Timestamp
}
```

---

## 📦 Replicant-Übersicht

| Name           | Type    | Persistent | Schema | Beschreibung             |
| -------------- | ------- | ---------- | ------ | ------------------------ |
| `currentName`  | String  | ✅         | ❌     | Lower Third Name         |
| `currentTitle` | String  | ✅         | ❌     | Lower Third Titel        |
| `isVisible`    | Boolean | ❌         | ❌     | Lower Third Sichtbarkeit |
| `scoreboard`   | Object  | ✅         | ✅     | Team Scores & Config     |
| `timer`        | Object  | ✅         | ✅     | Timer/Countdown State    |
| `ticker`       | Object  | ✅         | ✅     | News Ticker Nachrichten  |
| `messageLog`   | Array   | ✅         | ❌     | Event Log Einträge       |
| `systemStats`  | Object  | ❌         | ❌     | System Statistiken       |

**Persistent:** Wird beim Neustart wiederhergestellt
**Schema:** JSON Schema Validierung aktiv

---

## 🚀 Quick Start

### 1. Bundle in NodeCG laden

```bash
# Bundle ist bereits in bundles/example-bundle/
cd /path/to/nodecg-next
npm start
```

### 2. Dashboard öffnen

```
http://localhost:3000/dashboard
```

### 3. Graphics in OBS einbinden

**Einzelne Graphics:**

- Lower Third: `http://localhost:3000/bundles/example-bundle/graphics/lower-third.html`
- Scoreboard: `http://localhost:3000/bundles/example-bundle/graphics/scoreboard.html`
- Timer: `http://localhost:3000/bundles/example-bundle/graphics/timer.html`
- Ticker: `http://localhost:3000/bundles/example-bundle/graphics/ticker.html`

**Full Overlay:**

- `http://localhost:3000/bundles/example-bundle/graphics/overlay.html`

### 4. OBS Browser Source Settings

- **Breite:** 1920
- **Höhe:** 1080
- **FPS:** 60 (optional)
- **Custom CSS:** Nicht erforderlich
- **Shutdown source when not visible:** ❌ (Empfohlen)
- **Refresh browser when scene becomes active:** ❌

---

## 🎨 Anpassung

### Farben ändern

**Scoreboard:**

- Team-Farben im Scoreboard Panel mit Color Picker anpassen
- Standardfarben: `#667eea` (Team A), `#764ba2` (Team B)

**Lower Third:**

- CSS in `graphics/lower-third.html` bearbeiten
- Gradient: `.lower-third-box { background: linear-gradient(...) }`

**Timer:**

- CSS in `graphics/timer.html` bearbeiten
- Border-Farbe: `border: 4px solid #667eea`

### Positionen anpassen

**Lower Third:**

- `#lower-third { bottom: 100px; left: 50px; }`

**Scoreboard:**

- `#scoreboard { top: 50px; left: 50%; }`

**Timer:**

- `#timer { top: 50px; right: 50px; }`

**Ticker:**

- `#ticker { bottom: 20px; }`

### Animationen anpassen

Alle Grafiken nutzen CSS Transitions:

```css
#element {
  transition: all 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

Geschwindigkeit ändern: `0.5s` → `1s` (langsamer) oder `0.3s` (schneller)

---

## 🐛 Troubleshooting

### Graphics zeigen nicht an

1. ✅ Bundle in NodeCG geladen?
2. ✅ OBS Browser Source URL korrekt?
3. ✅ Visibility in Dashboard aktiviert?
4. ✅ Browser Cache leeren (Ctrl+Shift+R in OBS)

### Replicants synchronisieren nicht

1. ✅ WebSocket Connection aktiv?
2. ✅ Console Errors in Browser DevTools?
3. ✅ NodeCG Server läuft?

### Timer läuft nicht

1. ✅ Extension geladen? (Check Server Logs)
2. ✅ Timer auf "Start" geklickt?
3. ✅ Duration > 0 gesetzt?

### Dashboard Panels fehlen

1. ✅ `package.json` korrekt?
2. ✅ HTML-Dateien in `dashboard/` Ordner?
3. ✅ NodeCG Neustart nach Änderungen

---

## 📚 Bundle Struktur

```
example-bundle/
├── package.json           # Bundle Manifest
├── README.md             # Diese Datei
├── extension/
│   └── index.js          # Server-Side Logic
├── graphics/
│   ├── lower-third.html  # Lower Third Grafik
│   ├── scoreboard.html   # Scoreboard Grafik
│   ├── timer.html        # Timer Grafik
│   ├── overlay.html      # Full Overlay
│   └── ticker.html       # Ticker Grafik
├── dashboard/
│   ├── control.html      # Hauptsteuerung Panel
│   ├── scoreboard.html   # Scoreboard Panel
│   ├── timer.html        # Timer Panel
│   ├── assets.html       # Asset Manager Panel
│   └── debug.html        # Debug & Monitor Panel
└── schemas/
    ├── scoreboard.json   # Scoreboard Schema
    ├── timer.json        # Timer Schema
    └── ticker.json       # Ticker Schema
```

---

## 🔄 Version History

### v2.0.0 (Current)

**Neu:**

- ✅ 5 Graphics (Scoreboard, Timer, Overlay, Ticker)
- ✅ 5 Dashboard Panels
- ✅ 3 JSON Schemas
- ✅ Erweiterte Extension mit Timer-Logic
- ✅ Event-Logging System
- ✅ System Stats Monitoring
- ✅ Message Handlers (Scoreboard, Timer, Ticker)
- ✅ 8 Replicants
- ✅ Umfassende Dokumentation

### v1.0.0

- ✅ Basis Lower Third
- ✅ Simple Dashboard Control
- ✅ 3 Replicants

---

## 📝 Lizenz

MIT License - Frei verwendbar für alle NodeCG Next Projekte

---

## 🤝 Support

Bei Fragen oder Problemen:

1. Check diese README
2. Check NodeCG Next Dokumentation
3. Debug Panel im Dashboard verwenden
4. Server Logs prüfen
5. GitHub Issues öffnen

---

**Viel Erfolg mit NodeCG Next! 🚀**
