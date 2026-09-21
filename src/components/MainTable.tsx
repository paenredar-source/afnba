import { useMemo, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Cell, ParsedSheet, Row } from '../types';
import {
  displayValue,
  cellNumber,
  formatNumber,
  getCapColumns,
  getContractColumn,
  getContractStyle,
  getPlayerColumn,
  getTeamColumn,
  getVisibleHeaders,
  isYearHeader,
  parseSalary
} from '../utils/sheet';
import { PlayerImage, TeamLogo } from './Images';

/** Name der berechneten Spalte in der Uebersicht */
const CAP_LIBRE = 'Cap libre';

type SortState = { header: string; dir: 'asc' | 'desc' } | null;

const sortValue = (cell: Cell | undefined): number | string | null => {
  if (!cell || cell.v === null || cell.v === undefined || cell.v === '') return null;
  if (typeof cell.v === 'number') return cell.v;
  return String(cell.v).trim();
};

const compareCells = (a: Cell | undefined, b: Cell | undefined, dir: 'asc' | 'desc') => {
  const va = sortValue(a);
  const vb = sortValue(b);
  // Leere Zellen immer ans Ende
  if (va === null && vb === null) return 0;
  if (va === null) return 1;
  if (vb === null) return -1;
  const result =
    typeof va === 'number' && typeof vb === 'number'
      ? va - vb
      : String(va).localeCompare(String(vb), 'es', { numeric: true, sensitivity: 'base' });
  return dir === 'asc' ? result : -result;
};

/** Farbe je nach freiem Cap (tope = 0, wenn unbekannt) */
const capTone = (free: number, tope: number) => {
  if (free < 0) return { text: 'text-red-600', bar: 'bg-red-600' };
  if (tope > 0 && free / tope < 0.05) return { text: 'text-amber-600', bar: 'bg-amber-500' };
  return { text: 'text-green-600', bar: 'bg-green-600' };
};

interface MainTableProps {
  /** SALARIOS EQUIPOS (Uebersicht) oder EQUIPOS (Teamansicht) */
  sheet: ParsedSheet;
  /** SALARIOS EQUIPOS, fuer die Cap-Leiste in der Teamansicht */
  salarios: ParsedSheet | null;
  selectedTeam: string | null;
  tradeMode: boolean;
  tradeTeamA: string | null;
  tradeTeamB: string | null;
  onRowClick: (row: Row) => void;
  onBack: () => void;
}

export function MainTable({
  sheet,
  salarios,
  selectedTeam,
  tradeMode,
  tradeTeamA,
  tradeTeamB,
  onRowClick,
  onBack
}: MainTableProps) {
  const isDetailView = selectedTeam !== null;
  const [sort, setSort] = useState<SortState>(null);

  const teamCol = getTeamColumn(sheet.headers);
  const contractCol = getContractColumn(sheet.headers);
  const playerCol = getPlayerColumn(sheet.headers);

  // --- Cap-Spalten der Uebersicht (Gastado / Tope Salarial / LIBRE) ---
  // Gibt es im Sheet schon eine Spalte "LIBRE", wird sie genutzt (nur gefaerbt und mit Balken versehen).
  // Sonst wird "Cap libre" = Tope Salarial minus Gastado berechnet.
  const { spentCol, topeCol, sheetFreeCol } = useMemo(() => {
    if (isDetailView) return { spentCol: null, topeCol: null, sheetFreeCol: null };
    const caps = getCapColumns(sheet);
    return {
      spentCol: sheet.headers.find(h => h.toLowerCase().includes('gastado')) || null,
      topeCol: caps.topeCol,
      sheetFreeCol: caps.freeCol
    };
  }, [sheet, isDetailView]);
  const deriveFreeCap = !isDetailView && !sheetFreeCol && !!spentCol && !!topeCol;
  const freeHeader = sheetFreeCol ?? (deriveFreeCap ? CAP_LIBRE : null);

  const headers = useMemo(() => {
    const base = getVisibleHeaders(sheet, isDetailView);
    if (!deriveFreeCap) return base;
    const idx = base.indexOf(spentCol!);
    if (idx < 0) return [...base, CAP_LIBRE];
    return [...base.slice(0, idx + 1), CAP_LIBRE, ...base.slice(idx + 1)];
  }, [sheet, isDetailView, deriveFreeCap, spentCol]);

  // --- Zeilen: filtern, Cap libre berechnen, sortieren ---
  const items = useMemo(() => {
    let rows = sheet.rows.map((row, id) => ({ row, id }));

    if (isDetailView) {
      rows = rows.filter(({ row }) => {
        const cellVal = row[teamCol]?.v;
        return cellVal && String(cellVal).toLowerCase() === selectedTeam!.toLowerCase();
      });
    }

    if (deriveFreeCap) {
      rows = rows.map(({ row, id }) => {
        const tope = parseSalary(row[topeCol!]?.v);
        if (tope <= 0) return { row: { ...row, [CAP_LIBRE]: { v: null } }, id };
        const free = tope - parseSalary(row[spentCol!]?.v);
        return { row: { ...row, [CAP_LIBRE]: { v: free, f: formatNumber(free) } }, id };
      });
    }

    if (sort) {
      rows = [...rows].sort((a, b) => compareCells(a.row[sort.header], b.row[sort.header], sort.dir));
    }
    return rows;
  }, [sheet, isDetailView, selectedTeam, teamCol, deriveFreeCap, spentCol, topeCol, sort]);

  const toggleSort = (header: string) => {
    setSort(prev => {
      if (!prev || prev.header !== header) return { header, dir: 'asc' };
      if (prev.dir === 'asc') return { header, dir: 'desc' };
      return null;
    });
  };

  // --- Cap-Leiste in der Teamansicht ---
  const teamCap = useMemo(() => {
    if (!isDetailView || !salarios) return null;
    const { teamCol: sTeamCol, topeCol: sTopeCol, freeCol: sFreeCol } = getCapColumns(salarios);
    const sSpentCol = salarios.headers.find(h => h.toLowerCase().includes('gastado'));
    if (!sSpentCol || !sTopeCol) return null;
    const teamRow = salarios.rows.find(r => String(r[sTeamCol]?.v || '').toLowerCase() === selectedTeam!.toLowerCase());
    if (!teamRow) return null;
    const spent = parseSalary(teamRow[sSpentCol]?.v);
    const tope = parseSalary(teamRow[sTopeCol]?.v);
    if (tope <= 0) return null;
    const free = (sFreeCol ? cellNumber(teamRow[sFreeCol]) : null) ?? tope - spent;
    return { spent, tope, free };
  }, [isDetailView, salarios, selectedTeam]);

  const yearHeaders = headers.filter(isYearHeader);

  return (
    <>
      {isDetailView && (
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 text-sm font-mono uppercase tracking-wider hover:opacity-70 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a los equipos
        </button>
      )}

      {teamCap && (
        <div className="mb-6 border border-[#141414] p-4 bg-white/30 flex flex-col gap-3">
          <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-xs uppercase tracking-widest">
            <span className="opacity-60">Gastado <span className="text-base normal-case tracking-normal opacity-100 ml-1">{formatNumber(teamCap.spent)}</span></span>
            <span className="opacity-60">Tope <span className="text-base normal-case tracking-normal opacity-100 ml-1">{formatNumber(teamCap.tope)}</span></span>
            <span className="opacity-60">Libre <span className={`text-base normal-case tracking-normal ml-1 font-medium ${capTone(teamCap.free, teamCap.tope).text}`}>{formatNumber(teamCap.free)}</span></span>
          </div>
          <div className="h-1.5 bg-[#141414]/10">
            <div
              className={`h-full ${capTone(teamCap.free, teamCap.tope).bar}`}
              style={{ width: `${Math.max(0, Math.min(100, (teamCap.spent / teamCap.tope) * 100))}%` }}
            />
          </div>
        </div>
      )}

      <div className="overflow-x-auto border border-[#141414]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#141414] bg-[#141414]/5">
              {headers.map((header, i) => {
                const active = sort?.header === header;
                return (
                  <th
                    key={i}
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className="p-3 text-left font-mono uppercase tracking-wider text-[11px] opacity-70 whitespace-nowrap"
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(header)}
                      title="Ordenar"
                      className={`inline-flex items-center gap-1 uppercase tracking-wider cursor-pointer hover:opacity-70 ${active ? 'font-bold' : ''}`}
                    >
                      {header}
                      {active && (sort!.dir === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />)}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {items.map(({ row, id }) => {
                const rowTeamName = !isDetailView ? String(row[teamCol]?.v || '') : '';
                const isSelectedInTrade = tradeMode && (rowTeamName === tradeTeamA || rowTeamName === tradeTeamB);

                const contractType = contractCol ? String(row[contractCol]?.v || '').toLowerCase() : '';
                const isHighlightedContract =
                  contractType.includes('rookie') ||
                  contractType.includes('extension') ||
                  contractType.includes('extensión') ||
                  contractType.includes('d-league') ||
                  contractType.includes('dleague');

                // Bei Rookie/Extension/D-League: die letzten zwei Vertragsjahre hervorheben
                let lastTwoYearCols: string[] = [];
                if (isHighlightedContract) {
                  const filled = yearHeaders.filter(h => row[h]?.v !== undefined && row[h]?.v !== null && String(row[h]?.v).trim() !== '');
                  lastTwoYearCols = filled.slice(-2);
                }

                return (
                  <motion.tr
                    key={id}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => onRowClick(row)}
                    className={`border-b border-[#141414]/10 transition-colors ${
                      isSelectedInTrade
                        ? 'bg-[#141414] text-[#E4E3E0]'
                        : !isDetailView
                          ? 'cursor-pointer hover:bg-[#141414] hover:text-[#E4E3E0]'
                          : 'hover:bg-[#141414]/5'
                    }`}
                  >
                    {headers.map((header, colIndex) => {
                      const isTeamCol = !isDetailView && header === teamCol;
                      const isPlayerCol = isDetailView && header === playerCol;
                      const isContractCol = header === contractCol;
                      const isBonoCol = header.toLowerCase().includes('bono');
                      const isHighlightedYear = lastTwoYearCols.includes(header);

                      if (freeHeader && header === freeHeader && !isDetailView) {
                        const free = cellNumber(row[freeHeader]);
                        if (free !== null) {
                          const spent = spentCol ? parseSalary(row[spentCol]?.v) : 0;
                          const tope = topeCol ? parseSalary(row[topeCol]?.v) : 0;
                          const tone = capTone(free, tope);
                          return (
                            <td key={colIndex} className="p-3 whitespace-nowrap">
                              <div className="flex flex-col gap-1 min-w-[6rem]">
                                <span className={`font-mono font-medium ${tone.text}`}>{displayValue(row[freeHeader])}</span>
                                {tope > 0 && spentCol && (
                                  <div className="h-1 bg-[#141414]/15">
                                    <div
                                      className={`h-full ${tone.bar}`}
                                      style={{ width: `${Math.max(0, Math.min(100, (spent / tope) * 100))}%` }}
                                    />
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        }
                      }

                      let value = displayValue(row[header]);
                      if (isBonoCol) {
                        const numVal = parseSalary(row[header]?.v);
                        if (numVal <= 0) {
                          value = '-';
                        }
                      }

                      const contractStyle = isContractCol ? getContractStyle(value) : null;

                      return (
                        <td key={colIndex} className="p-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {isTeamCol && <TeamLogo name={String(row[header]?.v)} size="sm" />}
                            {isPlayerCol && <PlayerImage name={String(row[header]?.v)} size="sm" />}
                            {isContractCol && contractStyle ? (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${contractStyle}`}>
                                {value}
                              </span>
                            ) : isHighlightedYear ? (
                              <span className="px-1.5 py-0.5 rounded border border-purple-400 bg-purple-400/10 text-purple-900 font-medium">
                                {value}
                              </span>
                            ) : (
                              value
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
            {items.length === 0 && (
              <tr>
                <td colSpan={headers.length} className="p-10 text-center opacity-50 font-serif italic">
                  Sin datos.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
