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

Wichtig: Die Spaltennamen `Jugador`, `Equipo`, `Contrato`, `Salario`, `Imagen` sollten so bleiben, weil die App die Spalten darüber findet. In `SALARIOS EQUIPOS` sind es `Gastado`, `Tope Salarial` und `LIBRE`. Der Vertragstyp `Derechos` muss in `Contrato` genau so geschrieben werden.

In `SALARIOS EQUIPOS` blendet die App die Spalten `Anual` und `Extra` sowie Spalten ohne Überschrift aus (siehe `getVisibleHeaders` in `src/utils/sheet.ts`). Die Position der Spalten ist egal, nur die Namen müssen stimmen.

## Cap-Logik (Trade-Simulator)

- Für die Cap zählt die Spalte `Salario` (inklusive `Extra`, den Zusatzkosten der besten Spieler des Vorjahres, nur für die laufende Saison).
- Die Jahres-Spalten enthalten den Vertrag des Spielers und werden für die Cap nicht verwendet.

## Ansichten

- **Salarios Equipos:** Übersicht aller Teams. Die Spalte `LIBRE` aus dem Sheet wird farbig dargestellt (rot = über dem Tope) und bekommt einen Auslastungsbalken. Gibt es keine `LIBRE`-Spalte, berechnet die App „Cap libre“ selbst (Tope Salarial minus Gastado). Die Spaltenköpfe sind anklickbar zum Sortieren. Klick auf ein Team öffnet die Plantilla, oben mit Gastado / Tope / Libre.
- **Derechos:** Alle Spieler, bei denen im Tab `EQUIPOS` in der Spalte `Contrato` der Wert `Derechos` steht (Vertrag läuft aus, das Team hat zuerst die Rechte), gruppiert nach Team.
- **Lottery 2026, DRAFT 2026, RONDAS:** Tabellen aus den gleichnamigen Tabs. Bei RONDAS werden getauschte Picks hervorgehoben.
- **Simulador de traspasos:** Zwei Teams in der Tabelle anklicken, dann Spieler auswählen. Er zeigt das neue „Gastado“ und den neuen freien Cap (ausgehend von `LIBRE`) und warnt, wenn ein Team über dem Tope landet. Außerdem zeigt er die Änderung der Vertragssummen pro Saison und kopiert eine Zusammenfassung für WhatsApp. Spieler mit `Cut` können nicht getradet werden, `Derechos`-Spieler schon.

## Projektstruktur

- `src/App.tsx`: Daten laden, Header und Navigation
- `src/components/MainTable.tsx`: Tabelle für Salarios Equipos und Teamansicht
- `src/components/TradeMachine.tsx`: Trade-Simulator
- `src/components/DerechosView.tsx`: Übersicht der Derechos-Spieler
- `src/components/SheetTable.tsx`: Lottery, Draft und Rondas
- `src/components/SideMenu.tsx`: Menü und Spielersuche
- `src/components/Images.tsx`: Team-Logos und Spielerbilder
- `src/utils/sheet.ts`: Spalten finden (immer über den Namen), Zahlen lesen und formatieren
- `src/utils/imageMaps.ts`: Zuordnung Team/Spieler zu Bildern
- `src/services/googleSheetService.ts`: liest die Sheet-Tabs
- `scripts/fetch_test.ts`: kleines Testskript, um ein Sheet-Tab abzurufen
