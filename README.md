# AsturFantasy NBA

Web-App für unsere Fantasy-Basketball-Liga: Salarios, Verträge, Lottery, Draft, Rondas und ein Trade-Simulator.
Alle Daten kommen live aus einer Google-Sheet-Tabelle (Tabs `SALARIOS EQUIPOS`, `EQUIPOS`, `LOGOS`, `Lottery 2026`, `DRAFT 2026`, `RONDAS`).

- Live: https://afnba.netlify.app/
- Stack: React + Vite + Tailwind. Veröffentlicht über Netlify (deployt automatisch bei jedem Push auf `main`).
- Das Google Sheet muss auf „Jeder mit dem Link kann ansehen“ stehen, sonst kann die App es nicht lesen.

## Lokal starten

```bash
npm install
npm run dev
```

## Neue Saison: was ist im Sheet zu tun?

Tab `EQUIPOS`:

1. Daten der Jahres-Spalten nach links verschieben und die sechs Header umbenennen (z. B. `2026-27` … `2031-32`).
2. **Keine Spalte einfügen oder löschen.** Es bleiben immer genau sechs Jahres-Spalten direkt vor `Imagen`.
3. Die App erkennt Jahres-Spalten am Format `JJJJ-JJ` und blendet in der Teamansicht alles ab der Spalte `Imagen` aus.
   Es spielt also keine Rolle, welche Jahre in den Headern stehen.

Wichtig: Die Spaltennamen `Jugador`, `Equipo`, `Contrato`, `Salario`, `Imagen` sollten so bleiben, weil die App die Spalten darüber findet.

In `SALARIOS EQUIPOS` blendet die App die Spalten `Anual` und `Extra` nach Namen aus (siehe `headersToDisplay` in `src/App.tsx`). Die Position der Spalten ist egal, nur die Namen müssen stimmen.

## Cap-Logik (Trade-Simulator)

- Für die Cap zählt die Spalte `Salario` (inklusive `Extra`, den Zusatzkosten der besten Spieler des Vorjahres, nur für die laufende Saison).
- Die Jahres-Spalten enthalten den Vertrag des Spielers und werden für die Cap nicht verwendet.

## Projektstruktur

- `src/App.tsx`: Ansichten und Logik
- `src/components/Images.tsx`: Team-Logos und Spielerbilder
- `src/services/googleSheetService.ts`: liest die Sheet-Tabs
- `scripts/fetch_test.ts`: kleines Testskript, um ein Sheet-Tab abzurufen
