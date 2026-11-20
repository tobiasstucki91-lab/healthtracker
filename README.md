# Health & Habit Tracker

Persönlicher Kalorien-, Makro-, Habit- und Gewichtstracker als installierbare Web-App (PWA) für Handy und PC. Die Daten liegen offline auf jedem Gerät und werden über dein Google Drive abgeglichen.

## Wie der Sync funktioniert

- **Beim Öffnen** (Start der App oder Rückkehr aus dem Hintergrund): Drive lesen, zusammenführen, hochladen.
- **Beim Schließen** (App geht in den Hintergrund, Tab wird verlassen): Ungesynchte Änderungen werden hochgeladen. Wird die App dabei hart beendet, bleibt die Markierung „ungesynct" stehen, und der nächste Start holt den Upload nach.
- **Anmeldung:** Google gibt Browser-Apps ohne Server nur ein Token, das 1 Stunde gilt. Ist es abgelaufen, zeigt die App oben den Hinweis **„Synchronisieren"**. Ein Tipp darauf genügt. Wahlweise meldet die App sich beim Öffnen automatisch neu an (Einstellungen → Google Drive). Dafür leitet sie kurz zu Google weiter.
- **Zusammenführen:** Jeder Eintrag (Mahlzeit, Habit-Haken, Gewicht, Favorit …) hat einen Änderungszeitstempel. Pro Eintrag gewinnt die jüngere Änderung. Löschungen werden mit übertragen. So gehen Offline-Einträge beider Geräte am selben Tag nicht verloren.
- **In Drive:** Ordner `Health Habit Tracker` mit `health-habit-tracker-sync.json` und Tages-Backups der letzten 14 Tage (`backup-JJJJ-MM-TT.json`). Die App hat nur Zugriff auf Dateien, die sie selbst angelegt hat (Zugriffsrecht `drive.file`).
- **Zurücksetzen / Import:** Danach pausiert der Sync, und du entscheidest im Banner: „Hochladen" (dieser Stand gilt überall) oder „Drive-Stand laden".

## Einmalige Einrichtung

### 1. App hosten (GitHub Pages, kostenlos)

1. Neues GitHub-Repository anlegen, z. B. `health-tracker` (darf privat sein, wenn dein GitHub-Plan Pages für private Repos erlaubt; sonst öffentlich – deine Daten liegen nie im Repo).
2. Diesen Ordner hochladen (Branch `main`).
3. Im Repo: **Settings → Pages → Source: GitHub Actions**.
4. Nach dem ersten Push baut `.github/workflows/deploy.yml` die App. Sie ist dann unter `https://<github-name>.github.io/health-tracker/` erreichbar.

### 2. Google-Zugang (Google Cloud Console, kostenlos)

1. <https://console.cloud.google.com> → neues Projekt, z. B. „Health Tracker".
2. **APIs & Dienste → Bibliothek → „Google Drive API" → Aktivieren.**
3. **OAuth-Zustimmungsbildschirm** (Google Auth Platform): Typ *Extern*, App-Name eintragen, Status *Testing* lassen. Unter **Testnutzer** deine eigene Gmail-Adresse hinzufügen. Bei Datenzugriff den Bereich `.../auth/drive.file` hinzufügen.
4. **Clients → Client erstellen → Webanwendung**:
   - *Autorisierte JavaScript-Quellen:* `https://<github-name>.github.io` und für lokale Tests `http://localhost:5173`
   - *Autorisierte Weiterleitungs-URIs:* `https://<github-name>.github.io/health-tracker/` und `http://localhost:5173/`
     (exakt die Adresse, die die App unter Einstellungen → Google Drive anzeigt, inkl. Schrägstrich am Ende)
5. Die angezeigte **Client-ID** kopieren.

### 3. Auf jedem Gerät

1. App-Adresse öffnen → **Ziele & Backup → Google Drive** → Client-ID einfügen → **Bei Google anmelden & synchronisieren**.
2. Installieren:
   - **Android (Chrome):** Menü ⋮ → „App installieren" bzw. „Zum Startbildschirm hinzufügen".
   - **iPhone (Safari):** Teilen → „Zum Home-Bildschirm".
   - **PC (Chrome/Edge):** Installieren-Symbol in der Adressleiste.

   Auf dem iPhone die App unbedingt installieren: Safari löscht sonst lokale Daten von Websites nach ca. 7 Tagen ohne Besuch.
3. Bei der Anmeldung in der installierten App einmal bei Google einloggen. Installierte Apps haben auf iOS einen eigenen Cookie-Speicher.

### Daten aus der alten Version übernehmen

In der alten Version **Ziele & Backup → JSON-Backup → Backup exportieren**. In der neuen App importieren und danach im Banner **Hochladen** wählen.

## Entwicklung

```bash
npm install
```

```bash
npm run dev
```

```bash
npm test
```

```bash
npm run build
```

| Pfad | Inhalt |
|---|---|
| `src/App.tsx` | UI (aus Version 1 übernommen, noch untypisiert: `@ts-nocheck`) |
| `src/sync/model.ts` | Datenmodell für den Sync: Records, Zeitstempel, Tombstones, Merge |
| `src/sync/drive.ts` | Google-Anmeldung (OAuth-Redirect) und Drive-Dateizugriff |
| `src/sync/useSyncedAppData.ts` | React-Hook: lokale Speicherung, Sync beim Öffnen/Schließen |
| `src/components/SyncUi.tsx` | Sync-Button, Hinweis-Banner, Einstellungen |
| `health_habit_tracker.tsx` | Originaldatei (Version 1) als Referenz |
