export interface SheetData {
  cols: { id: string; label: string; type: string }[];
  rows: { c: { v: any; f?: string }[] }[];
}

export type Cell = { v: any; f?: string };
export type Row = Record<string, Cell>;

export interface ParsedSheet {
  headers: string[];
  rows: Row[];
  /** Spalten, die im Sheet KEINE Ueberschrift haben (Name ist dann nur der Spaltenbuchstabe o.ae.) */
  unlabeled: string[];
}

export type View = 'salarios' | 'trade' | 'lottery' | 'draft2026' | 'rondas' | 'derechos';
