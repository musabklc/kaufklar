# Kaufklar – Markenrichtlinien

## Positionierung
Der unabhängige Kaufberater, der beim Gebrauchtwagenkauf Klarheit schafft – wie ein erfahrener Freund aus der Werkstatt, nicht wie ein Verkäufer.

## Stimme
- **Ehrlich vor beruhigend.** Wir sagen, was wir nicht wissen („keine Datenbasis“), statt Lücken zu füllen.
- **Sachlich, nicht alarmistisch.** Verdacht ist Verdacht, nicht Betrug.
- **Du-Form, kurze Sätze, keine Fachbegriffe ohne Erklärung.**
- Nachrichten an Verkäufer: Sie-Form, höflich, argumentativ.

## Idee
Die Gestaltung kommt aus der Welt des Autokaufs in Deutschland: dem **Fahrzeugschein** (blassgrünes Amtspapier, Felder wie P.1 Hubraum, V.7 CO₂) und dem **Kennzeichen** (schwarz auf weiß, DIN-Schrift, blauer EU-Streifen).

## Farben (Tokens in `src/app/globals.css`)
| Token | Wert | Einsatz |
|---|---|---|
| `--background` (Papier) | #f4f4f0 | Seitengrund |
| `--foreground` / `--primary` (Tinte) | #131417 | Text, Hauptbuttons, Footer-Fläche |
| `--brand` (Kennzeichen-Blau) | #0b3c9e | einziger Akzent: Links, Auswahl, Fokus |
| `--paper` (Fahrzeugschein-Grün) | #dfe8da | ganze Flächen, z. B. Steuer-Rechner, Kopf der Beispielanalyse |
| `--ok` / `--warn` / `--bad` (+ `-soft`) | Grün / Bernstein / Rot | **nur** für Bewertungen und Risiken |

## Typografie
Eine Familie: **Barlow** (nah an der DIN der Kennzeichen). Große Überschriften fett, Laufweite −0,02 bis −0,04 em, Zeilenabstand 0,9. Fließtext ≥ 17 px in voller Tintenfarbe. Zahlen mit `tabular-nums`.

## Hausregeln (gegen „KI-Template“-Optik)
- Überschriften linksbündig, höchstens zwei Zeilen.
- Keine kleinen Labels über Überschriften, keine Großbuchstaben-Mini-Labels, keine Icon-Kacheln.
- Keine Verläufe, keine Schatten auf ruhenden Elementen, kein Milchglas, kein Lila.
- Flächen werden durch Tonstufen getrennt (Weiß auf Papier, Grün als Feld), nicht durch Rahmen und Schatten.
- Fast eckige Formen (Radius 0,2 rem) wie Dokument und Kennzeichen.
- Echte Inhalte statt Deko: echte Motorliste, echter Rechner, echtes Analyse-Beispiel.

## Logo
Kennzeichen-Ausschnitt: blauer EU-Streifen und Haken (`src/components/logo.tsx`). Mindesthöhe 20 px, nicht einfärben.
