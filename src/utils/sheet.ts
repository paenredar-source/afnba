import { Cell, ParsedSheet } from '../types';

/**
 * Hilfsfunktionen fuer das Lesen der Sheet-Daten.
 * Spalten werden immer ueber ihren NAMEN gefunden, nie ueber ihre Position.
 */

export const getTeamColumn = (headers: string[]) => {
  return headers.find(h => h.toLowerCase().includes('equip') || h.toLowerCase().includes('team') || h.toLowerCase().includes('afnba')) || headers[0];
};

export const getPlayerColumn = (headers: string[]) => {
  return headers.find(h => h.toLowerCase().includes('jugador') || h.toLowerCase().includes('player') || h.toLowerCase().includes('nombre')) || headers[0];
};

export const getSalaryColumn = (headers: string[]) => {
  return headers.find(h =>
    h.toLowerCase().includes('salario') ||
    h.toLowerCase().includes('sueldo') ||
    h.toLowerCase().includes('salary') ||
    h.toLowerCase().includes('total') ||
    h.includes('$') ||
    h.includes('€')
  ) || null;
};

export const getContractColumn = (headers: string[]) => {
  return headers.find(h => h.toLowerCase().includes('contrat') || h.toLowerCase().includes('contract') || h.toLowerCase().includes('tipo')) || null;
};

/** Spalten der Tabelle "SALARIOS EQUIPOS", die fuer die Cap-Berechnung gebraucht werden. */
export const getCapColumns = (salarios: ParsedSheet) => {
  const teamCol = getTeamColumn(salarios.headers);
  const spentCol = salarios.headers.find(h => h.toLowerCase().includes('gastado')) || getSalaryColumn(salarios.headers);
  const topeCol = salarios.headers.find(h => h.toLowerCase().includes('tope salarial')) || null;
  // Eigene "LIBRE"-Spalte des Sheets (freier Cap). Wenn vorhanden, ist sie die massgebliche Berechnung.
  const freeCol = salarios.headers.find(h => /libre|disponible/i.test(h)) || null;
  return { teamCol, spentCol, topeCol, freeCol };
};

/** Zahl aus einer Zelle, oder null wenn die Zelle leer ist. */
export const cellNumber = (cell: Cell | undefined): number | null => {
  if (!cell || cell.v === null || cell.v === undefined || String(cell.v).trim() === '') return null;
  return parseSalary(cell.v);
};

/** Jahres-Spalten wie "2026-27" */
export const isYearHeader = (header: string) => /^\d{4}-\d{2}$/.test(header);

export const parseSalary = (value: any) => {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  let str = String(value).trim();

  // Handle European format: 1.234,56 or 1.234
  if (str.includes(',')) {
    // Has comma: dots are thousands, comma is decimal
    str = str.replace(/\./g, '').replace(',', '.');
  } else if (str.includes('.')) {
    // No comma, but has dots: dots are likely thousands separators in European context
    // e.g. "1.234" -> 1234
    // We remove dots if they look like thousands separators (followed by 3 digits or multiple dots)
    const dotCount = (str.match(/\./g) || []).length;
    if (dotCount > 1 || /\.\d{3}$/.test(str)) {
      str = str.replace(/\./g, '');
    }
  }

  const cleaned = str.replace(/[^0-9.-]+/g, '');
  return parseFloat(cleaned) || 0;
};

const numberFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
});

export const formatNumber = (val: number) => numberFormat.format(val);

/** Mit Vorzeichen, z.B. "+2,5" / "-1" / "0" */
export const formatSigned = (val: number) => {
  const rounded = Math.round(val * 100) / 100;
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : '-'}${formatNumber(Math.abs(rounded))}`;
};

export const displayValue = (cell: Cell | undefined) => {
  if (!cell) return '';
  const val = cell.f !== undefined ? cell.f : (cell.v === null || cell.v === undefined ? '' : String(cell.v));
  return val.replace('$', '').trim();
};

export const getContractStyle = (type: string) => {
  const t = type.toLowerCase();
  if (t.includes('standard')) return 'bg-blue-300 text-blue-900 border-blue-400';
  if (t.includes('gratis')) return 'bg-slate-300 text-slate-900 border-slate-400';
  if (t.includes('rookie')) return 'bg-yellow-300 text-yellow-900 border-yellow-400';
  if (t.includes('extension') || t.includes('extensión')) return 'bg-purple-300 text-purple-900 border-purple-400';
  if (t.includes('d-league') || t.includes('dleague')) return 'bg-orange-300 text-orange-900 border-orange-400';
  if (t.includes('derecho')) return 'bg-teal-300 text-teal-900 border-teal-400';
  if (t.includes('cut')) return 'bg-rose-300 text-rose-900 border-rose-400';
  return null;
};

/** Ist der Vertrag ein "Derechos"-Vertrag (Vertrag laeuft aus, Team hat zuerst die Rechte)? */
export const isDerechos = (contract: string) => contract.toLowerCase().includes('derecho');

/**
 * Welche Spalten werden angezeigt?
 * - Uebersicht ("SALARIOS EQUIPOS"): Spalten ohne Ueberschrift sowie "Anual" und "Extra" werden ausgeblendet.
 * - Teamansicht ("EQUIPOS"): "Control", "Anual" und alles ab der Spalte "Imagen" werden ausgeblendet.
 * Alles ueber Spaltennamen, nicht ueber Positionen.
 */
export const getVisibleHeaders = (sheet: ParsedSheet, isDetailView: boolean): string[] => {
  const imageColIndex = sheet.headers.findIndex(h => /imag|image|foto/i.test(h));
  const hideFromIndex = imageColIndex >= 0 ? imageColIndex : 13;

  return sheet.headers.filter((header, i) => {
    const h = header.toLowerCase().trim();
    if (!isDetailView) {
      // Spalten ohne Ueberschrift im Sheet ausblenden (der Parser merkt sich diese in sheet.unlabeled)
      if (h === '' || sheet.unlabeled.includes(header)) return false;
      return h !== 'anual' && h !== 'extra';
    }
    if (h === 'control' || h === 'anual') return false;
    return i < hideFromIndex;
  });
};
