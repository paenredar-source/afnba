import { ParsedSheet } from '../types';
import { displayValue, getTeamColumn, isYearHeader } from '../utils/sheet';
import { TeamLogo } from './Images';

interface SheetTableProps {
  sheet: ParsedSheet | null;
  emptyText: string;
  /** Spalten ohne Ueberschrift im Sheet ausblenden (Draft, Rondas) */
  hideEmptyHeaders?: boolean;
  /** In Jahres-Spalten hervorheben, wenn dort ein anderes Team als die Zeile steht (getauschte Picks) */
  highlightTradedPicks?: boolean;
}

/** Einfache Tabelle fuer die Tabs Lottery, Draft und Rondas. */
export function SheetTable({ sheet, emptyText, hideEmptyHeaders = false, highlightTradedPicks = false }: SheetTableProps) {
  if (!sheet) {
    return <div className="p-10 text-center opacity-50">{emptyText}</div>;
  }

  const headers = hideEmptyHeaders ? sheet.headers.filter(h => h.trim() !== '' && !sheet.unlabeled.includes(h)) : sheet.headers;
  const teamCol = getTeamColumn(sheet.headers);

  return (
    <div className="tbl">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th key={i} className="p-3 text-left t-th whitespace-nowrap">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sheet.rows.map((row, rowIndex) => {
            const teamName = String(row[teamCol]?.v || '');
            return (
              <tr key={rowIndex} className="border-b border-line hover:bg-hover transition-colors">
                {headers.map((header, colIndex) => {
                  const isTeamCol = header === teamCol;
                  const cellValue = displayValue(row[header]);

                  // Jahres-Spalte (z.B. 2026-27), in der nicht das eigene Team steht = Pick wurde getauscht
                  const isTraded =
                    highlightTradedPicks &&
                    isYearHeader(header) &&
                    cellValue &&
                    cellValue.toLowerCase() !== teamName.toLowerCase() &&
                    cellValue !== '-';

                  return (
                    <td key={colIndex} className="p-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {isTeamCol && <TeamLogo name={teamName} size="sm" />}
                        {isTraded ? (
                          <span className="px-2 py-1 rounded bg-yellow-300/20 text-yellow-900 border border-yellow-400/50 font-medium">
                            {cellValue}
                          </span>
                        ) : (
                          cellValue
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
