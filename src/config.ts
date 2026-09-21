/**
 * Zentrale Einstellungen: welches Google Sheet und welche Tabs die App liest.
 */

/** ID der Google-Sheet-Tabelle (der lange Code im Link). Der Dateiname der Tabelle spielt keine Rolle. */
export const SHEET_ID = '1awwvd85-BLPT45034PjeVLNThIGdDF10XQBtKDBEEXw';

/**
 * Jahr des aktuellen Drafts. Wird nur gebraucht, wenn bei einem Tab unten KEINE gid eingetragen ist:
 * Dann heissen die Tabs "Lottery <Jahr>" und "DRAFT <Jahr>", und hier muss das Jahr stimmen.
 */
export const DRAFT_YEAR = 2026;

export interface TabRef {
  /** Name des Tabs im Sheet (muss exakt stimmen). Wird ignoriert, wenn eine gid gesetzt ist. */
  name: string;
  /**
   * gid des Tabs: die Zahl nach "gid=" in der Adresszeile, wenn der Tab im Sheet geoeffnet ist.
   * Die gid bleibt beim Umbenennen des Tabs gleich, der Name ist dann egal.
   * Sie aendert sich nur, wenn ein Tab neu angelegt oder dupliziert wird. Dann hier die neue gid eintragen.
   */
  gid?: string;
}

export const TABS: Record<'salarios' | 'equipos' | 'logos' | 'rondas' | 'lottery' | 'draft', TabRef> = {
  salarios: { name: 'SALARIOS EQUIPOS' },
  equipos: { name: 'EQUIPOS' },
  logos: { name: 'LOGOS' },
  rondas: { name: 'RONDAS' },
  // Lottery und Draft werden ueber die gid gefunden: Die Tabs koennen jedes Jahr einfach umbenannt werden.
  lottery: { name: `Lottery ${DRAFT_YEAR}`, gid: '472043855' },
  draft: { name: `DRAFT ${DRAFT_YEAR}`, gid: '534065349' }
};

/** Titel der Ansichten in Menue und Kopfzeile (ohne Jahreszahl, damit sie nie veralten) */
export const LOTTERY_LABEL = 'Lottery';
export const DRAFT_LABEL = 'DRAFT';
