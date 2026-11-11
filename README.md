# Kaufklar – KI-Kaufberater für Gebrauchtwagen

Inserat-Link oder Screenshots einfügen → Kaufklar zeigt motorspezifische Schwachstellen mit Reparatur-Richtwerten, prüft das Inserat auf Auffälligkeiten, bewertet den Preis (nur mit echten Vergleichsdaten), erstellt eine Besichtigungs-Checkliste, Verkäuferfragen, einen Probefahrt-Leitfaden und eine Verhandlungsstrategie mit fertiger Nachricht.

## Schnellstart

Voraussetzung: Node.js ≥ 20.

```bash
npm install
```

```bash
cp .env.example .env.local
```

1. **Gemini-Schlüssel (kostenlos):** https://aistudio.google.com → „Get API key“ → in `.env.local` als `GEMINI_API_KEY` eintragen.
2. **Preisindex (optional, kostenlos):** Supabase-Projekt anlegen (https://supabase.com), im SQL-Editor den Inhalt von `supabase/migrations/20261111000000_price_index.sql` ausführen, dann `SUPABASE_URL` (Dashboard → Connect) und `SUPABASE_SECRET_KEY` (Settings → API Keys, beginnt mit `sb_secret_`) eintragen.

```bash
npm run dev
```

App läuft auf http://localhost:3000.

```bash
npm test
```

## Konfiguration

| Variable | Bedeutung |
|---|---|
| `GEMINI_API_KEY` | Kostenlose KI (Auslesen von Screenshots/Links, Inserat-Prüfung, Alternativen). **Im Gratis-Tarif nutzt Google die Eingaben zur Produktverbesserung** – steht so in der Datenschutzseite. |
| `GEMINI_MODEL` | Standard `gemini-3.8-flash`. |
| `GEMINI_SEARCH_ENABLED` | `true` = Websuche nach Vergleichsangeboten. Nur im **bezahlten** Gemini-Tarif (5.000 Suchen/Monat inklusive). Standard `false`. |
| `ANTHROPIC_API_KEY` | Alternative KI (kostenpflichtig); nur aktiv, wenn kein Gemini-Schlüssel gesetzt ist. |
| `SUPABASE_URL`, `SUPABASE_SECRET_KEY` | Kaufklar-Preisindex. Ohne sie läuft alles, nur ohne automatische Marktpreise. Secret Key nur serverseitig. |
| `LINK_IMPORT_ENABLED` | `true` aktiviert den Link-Import: AutoScout24 und Kleinanzeigen werden direkt gelesen (getestet 11/2026); mobile.de blockt automatische Abrufe bewusst, dort führt die App zum Screenshot-Weg (Sperren werden nicht umgangen). **Nutzungsbedingungen der Portale vor öffentlichem Betrieb rechtlich prüfen.** |

Ohne jeden Schlüssel funktionieren manuelle Eingabe, Wissensdatenbank, Regelprüfung, Monatskosten, Checklisten, Vergleich und Verhandlung.

## Alleinstellungsmerkmale

- **Kaufklar-Preisindex** (`src/lib/server/price-index.ts`): Jedes per Link/Screenshot ausgelesene Inserat wird anonym gespeichert (Marke, Modell, Baujahr, km, kW, Preis). Vergleichbare Angebote (Baujahr ±2, km ±40 %, letzte 18 Monate, Ausreißer gefiltert) ergeben automatisch den Marktwert – kein manuelles Suchen. Manuelle Eingaben fließen bewusst nicht ein. Mit `GEMINI_SEARCH_ENABLED` kommen zusätzlich Websuche-Treffer mit Links hinzu.
- **Echte Monatskosten** (`src/lib/analysis/costs.ts`): Kfz-Steuer exakt nach KraftStG (alle Regelungen seit 2009, progressiver CO₂-Tarif ab 2021, E-Auto-Befreiung), Sprit, Wartung, absehbare Reparaturen. Getestet mit Rechenbeispielen.
- **Alternativen im gleichen Budget**: KI-Vorschläge „zuverlässiger / schöner / sparsamer / mehr Platz“ mit Preisindex-Daten und Suchlink.
- **Inserate-Vergleich** (`/vergleich`, `src/lib/analysis/compare.ts`): transparente Rangfolge mit Begründung; Kosten werden nur über Posten verglichen, die für alle Autos bekannt sind.

## Ablauf für Kunden

Link oder Screenshot → KI liest alle Daten aus → Analyse startet sofort (das Datenformular erscheint nur, wenn Marke/Modell fehlen) → im Ergebnis lassen sich Angaben unter „Korrigieren“ anpassen und sofort neu berechnen. Die KI schreibt zusätzlich ein Gutachter-Fazit in Klartext. Im Inserat genannte Reparaturen (z. B. „Steuerkette neu“) werden erkannt und nicht mehr als akutes Risiko gewertet.

## Offene Datenquellen

| Quelle | Wofür | Anbindung | Lizenz |
|---|---|---|---|
| EEA CO₂-Monitoring Pkw | CO₂, Verbrauch, Hubraum, kW, Motorcode, Typgenehmigung für alle EU-Typen 2010–2025 | Tabelle `vehicle_types`, Import: `node scripts/import-eea.mjs 2010 2025` (jährlich um das neue Jahr ergänzen); Live-Abfrage bei der EEA nur als Reserve (`src/lib/server/eea.ts`) | CC BY 4.0, Quellenangabe in Analyse + Methodik |
| EU Safety Gate | offizielle Pkw-Rückrufe seit 2010 (3.569 Fälle beim Erstimport) | Tabelle `recalls_eu`, Import: `node scripts/import-safety-gate.mjs 2010` (wöchentlich wiederholen, idempotent) | CC BY 4.0 |
| Kaufklar-Community | von Nutzern gemeldete Probleme | Tabelle `problem_reports`, API `/api/reports`, Formular unter jeder Analyse und unter `/melden` | eigene Daten |

**Community-Filter:** Eingabeprüfung → Spamfalle → Limit pro Person (5/Tag, 5/Minute) → KI-Moderation (Spam, persönliche Daten, Plausibilität, einheitlicher Titel) → sichtbar erst ab 3 unabhängigen Meldern (`MIN_REPORTERS` in `src/lib/analysis/community.ts`). Meldungen, die mangels KI nicht moderiert werden konnten, bleiben `pending` und zählen nicht.

Neue Tabellen anlegen: Inhalte von `supabase/migrations/*.sql` im Supabase-SQL-Editor ausführen.

## Monetarisierung (vorbereitet, noch nicht aktiv)

Pro-Funktionen sind in der UI mit „Pro“ markiert (Preisbewertung, Monatskosten, Alternativen, Vergleich) und in der Startphase kostenlos. Vorschlag für später: 1 Analyse gratis, „Kaufpass“ als Einmalzahlung (z. B. 14,99 € für 30 Tage), plus Partnerprovisionen (Gebrauchtwagencheck, Fahrzeughistorie, Versicherung). Ein Bezahlsystem (Stripe) ist **noch nicht eingebaut**.

## Veröffentlichen (Webseite + installierbare App)

Kaufklar ist eine **PWA**: Auf dem Handy über „Zum Startbildschirm hinzufügen“ (iPhone: Teilen-Menü in Safari; Android: Chrome-Menü bzw. Installations-Hinweis) wird es wie eine App mit eigenem Icon installiert. Dafür sorgen `src/app/manifest.ts` und die generierten Icons (`src/app/apple-icon.tsx`, `src/app/pwa-icon`).

**Schritte bei Vercel:**

1. Code auf GitHub hochladen (privates Repository).
2. Auf https://vercel.com mit GitHub anmelden → „Add New… → Project“ → das Repository importieren. Framework „Next.js“ wird erkannt, **Root Directory** auf `kaufklar` setzen, falls das Repository den übergeordneten Ordner enthält.
3. Unter „Environment Variables“ alle Werte aus `.env.local` eintragen: `GEMINI_API_KEY`, `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `LINK_IMPORT_ENABLED`, `CRON_SECRET` (und optional `GEMINI_MODEL`, `REPORT_SALT`).
4. „Deploy“. Danach unter „Settings → Domains“ die eigene Domain verbinden (DNS-Einträge beim Domain-Anbieter setzen, Vercel zeigt sie an).
5. Der wöchentliche Rückruf-Import läuft automatisch (`vercel.json`, samstags 6 Uhr UTC).

**Hinweise:**
- Der Vercel-Tarif „Hobby“ ist nur für nicht-kommerzielle Nutzung. Mit Einnahmen auf „Pro“ wechseln.
- Analysen dauern bis zu ca. 75 s (KI). Die Routen setzen `maxDuration` (180 s Analyse, 120 s Auslesen) – der Tarif muss diese Laufzeit erlauben, sonst den Wert in `src/app/api/*/route.ts` senken.
- Das Ratelimit ist im Speicher je Instanz (`src/lib/server/http.ts`). Bei viel Verkehr auf einen gemeinsamen Speicher (z. B. Upstash Redis) umstellen.
- Vor dem Livegang: Impressum (`src/app/impressum/page.tsx`) und Datenschutz ausfüllen und prüfen lassen, bezahlten Gemini-Tarif aktivieren, Nutzungsbedingungen der Portale für den Link-Import prüfen lassen.

**App-Stores (später):** Google Play über eine „Trusted Web Activity“ (z. B. mit https://www.pwabuilder.com, 25 $ einmalig). Apple App Store (99 $/Jahr) lehnt reine Web-Hüllen oft ab – dafür braucht die App eigene native Funktionen.

## Architektur

```
src/
  app/
    page.tsx                 Startseite + Eingabe
    analyse/[id]/page.tsx    Analyse-Dashboard
    analysen/                Verlauf (nur im Browser gespeichert)
    api/extract/route.ts     Link/Screenshots → Fahrzeugdaten (KI)
    api/analyze/route.ts     Fahrzeugdaten (+Bilder, Vergleichspreise) → Analyse
    methodik/, datenschutz/
  lib/
    types.ts                 zod-Schemas (gleichzeitig Structured-Output-Schemas für die KI)
    analysis/knowledge.ts    Kuratierte Motor-/Getriebe-Wissensdatenbank
    analysis/engine.ts       Deterministische Analyse: Scores, Preis, Verhandlung, Checklisten
    analysis/engine.test.ts  Tests (node --test)
    ai/provider.ts           Austauschbare KI-Schnittstelle
    ai/gemini.ts             Google-Gemini-Implementierung (Gratis-Tarif, JSON-Schema, Vision, optional Websuche)
    ai/claude.ts             Anthropic-Implementierung (Alternative)
    ai/schema.ts             zod → Gemini-JSON-Schema, tolerante Validierung
    analysis/costs.ts        Kfz-Steuer + Monatskosten
    analysis/compare.ts      Inserate-Vergleich
    server/price-index.ts    Kaufklar-Preisindex (Supabase)
    server/link.ts           Link-Import mit Host-Allowlist (SSRF-Schutz)
    server/http.ts           Upload-Prüfung (Magic Bytes, 5 MB, max. 8), Ratelimit
    storage.ts               localStorage (Analysen, Checklistenstand)
  components/                UI (shadcn/ui auf Base UI, Tailwind v4)
```

**Prinzip: Die KI ergänzt, die Regeln entscheiden.** Scores, Preisbereiche, Empfehlung und Verhandlungszahlen berechnet `engine.ts` deterministisch und nachvollziehbar. Die KI liefert nur (a) ausgelesene Inseratsdaten, die der Nutzer bestätigt, und (b) zusätzliche Auffälligkeiten/Modellhinweise, die in der UI immer als „KI-Einschätzung“ markiert sind. Fällt die KI aus, wird die Analyse trotzdem erstellt und der Ausfall angezeigt.

**Ehrlichkeitsregeln im Code:**
- Fehlende Felder bleiben `null`; die Extraktion darf nichts raten.
- Marktwert nur ab 3 Vergleichspreisen (vom Nutzer eingetragen) – sonst „keine Datenbasis“.
- Jede Aussage trägt eine Herkunft: Gesichert / Modelltypisch / KI-Einschätzung / Zu prüfen.
- Kosten sind als unverbindliche Richtwerte gekennzeichnet.

**Anderes KI-Modell anbinden:** `AiProvider` in `src/lib/ai/provider.ts` implementieren und in `getProvider()` auswählen.

**Wissensdatenbank erweitern:** Eintrag in `KNOWLEDGE` (`src/lib/analysis/knowledge.ts`) ergänzen: `match()`-Regel, Schwachstellen mit Risiko, Kosten, km-Relevanz, Erkennung und optional Checklisten-, Probefahrt- und Fragetext. Danach `npm test`.

## Datenschutz

- Bilder werden nur im Arbeitsspeicher verarbeitet und an die Anthropic-API übermittelt, nicht gespeichert.
- Analysen liegen ausschließlich im localStorage des Browsers; kein Konto, keine Server-Datenbank.
- `src/app/datenschutz` ist ein **Entwurf** und muss vor dem Livegang fachlich geprüft und ergänzt werden (Verantwortlicher, Hosting, Impressum).

## Stand & bekannte Grenzen

| Bereich | Status |
|---|---|
| Eingabe (Link, Screenshots, manuell), Datenprüfung | fertig |
| Wissensdatenbank | 16 Motor-/Getriebefamilien (BMW N47/B47, VW EA189/EA288/EA111/EA888, MB OM651, PSA PureTech, Ford EcoBoost, Renault TCe, DSG DQ200/nass, S tronic DL501, ZF 8HP, 7G-Tronic, PowerShift) |
| Analyse, Scores, Preis, Checkliste, Fragen, Probefahrt, Verhandlung, Fazit | fertig |
| Preisindex (Supabase) | fertig und live getestet (Schreiben, Lesen, Duplikatschutz per Fingerabdruck). Startet leer und wird mit jeder Analyse besser |
| Gemini-Anbindung | fertig und live getestet (Screenshot-Auslesen ca. 4 s, Inserat-Prüfung ca. 15–30 s) |
| Websuche nach Vergleichsangeboten | fertig, nur mit bezahltem Gemini-Tarif nutzbar |
| Konten, Bezahlung (Stripe) | **noch nicht implementiert** |
| Ratelimit | In-Memory pro Instanz; für Serverless/mehrere Instanzen auf Redis umstellen |
| Impressum | fehlt (vor Livegang Pflicht) |
