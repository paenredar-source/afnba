export interface SheetData {
  cols: { id: string; label: string; type: string }[];
  rows: { c: { v: any; f?: string }[] }[];
}

export interface ParsedSheet {
  headers: string[];
  rows: Record<string, { v: any; f?: string }>[];
}
