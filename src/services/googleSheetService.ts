import { SheetData, ParsedSheet } from '../types';

const SHEET_ID = '1awwvd85-BLPT45034PjeVLNThIGdDF10XQBtKDBEEXw';

export async function fetchSheet(sheetName: string): Promise<ParsedSheet> {
  try {
    const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    const response = await fetch(url);
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error('La hoja de Google no es pública. Activa "Cualquier persona con el enlace puede ver" en la configuración de compartir.');
      }
      throw new Error(`No se pudo cargar la hoja ${sheetName}: ${response.statusText}`);
    }

    const text = await response.text();
    const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const data: { table: SheetData } = JSON.parse(jsonStr);

    return parseGenericSheet(data.table);
  } catch (error) {
    console.error(`Error fetching sheet ${sheetName}:`, error);
    throw error;
  }
}

function parseGenericSheet(table: SheetData): ParsedSheet {
  let headers = table.cols.map((col, i) => col.label || col.id || `Column ${i + 1}`);
  let rowsData = table.rows;

  // If headers are just letters (A, B, C...) or generic, and the first row has values,
  // it's likely the first row contains the actual headers.
  const isGenericHeader = headers.every(h => /^[A-Z]$/.test(h) || h.startsWith('Column '));
  if (isGenericHeader && rowsData.length > 0) {
    const firstRow = rowsData[0].c;
    if (firstRow && firstRow.some(cell => cell && cell.v !== null)) {
      headers = firstRow.map((cell, i) => cell ? String(cell.v) : `Column ${i + 1}`);
      rowsData = rowsData.slice(1);
    }
  }
  
  const rows = rowsData.map(row => {
    const obj: Record<string, { v: any; f?: string }> = {};
    row.c.forEach((cell, index) => {
      const header = headers[index];
      if (header) {
        obj[header] = {
          v: cell ? cell.v : null,
          f: cell ? cell.f : undefined
        };
      }
    });
    return obj;
  });
  
  // Filter out completely empty rows
  const nonEmptyRows = rows.filter(row => 
    Object.values(row).some(cell => cell.v !== null && cell.v !== undefined && cell.v !== '')
  );
  
  return { headers, rows: nonEmptyRows };
}
