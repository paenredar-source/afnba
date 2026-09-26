import { useMemo, useState, type CSSProperties } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Cell, ParsedSheet, Row } from '../types';
import {
  displayValue,
  cellNumber,
  countActiveContracts,
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

/** Farbe je nach freiem Cap (tope = 0, wenn unbekannt). Rot ab 0 abwaerts: kein Platz mehr unter dem Tope. */
const capTone = (free: number, tope: number) => {
  if (Math.round(free * 100) / 100 <= 0) return { text: 'text-bad', bar: 'bg-bad', css: 'var(--color-bad)' };
  if (tope > 0 && free / tope < 0.05) return { text: 'text-warn', bar: 'bg-warn', css: 'var(--color-warn)' };
  return { text: 'text-good', bar: 'bg-good', css: 'var(--color-good)' };
};

/** Spalten mit Zahlen: rechtsbuendig */
const isNumericHeader = (h: string) => isYearHeader(h) || /libre|tope|gastado|bono|salario|extra|anual/i.test(h);

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

  // Zahl der aktiven Vertraege des Teams (Standard, Rookie, Gratis, D-League, Extension), fuer die Teamansicht
  const activeContracts = useMemo(() => {
    if (!isDetailView || !selectedTeam) return null;
    return countActiveContracts(sheet).get(selectedTeam) ?? 0;
  }, [isDetailView, selectedTeam, sheet]);

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
  const capStripTone = teamCap ? capTone(teamCap.free, teamCap.tope) : null;

  return (
    <>
      {isDetailView && (
        <button
          onClick={onBack}
          className="mb-6 flex items-center gap-2 t-btn hover:opacity-70 transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a los equipos
        </button>
      )}

      {teamCap && capStripTone && (
        <div className="mb-6 py-4 border-y border-line grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-x-6 gap-y-3">
          <div>
            <span className="t-label block mb-0.5">Gastado</span>
            <span className="t-num text-3xl leading-none tabular-nums">{formatNumber(teamCap.spent)}</span>
          </div>
          <div>
            <span className="t-label block mb-0.5">Tope</span>
            <span className="t-num text-3xl leading-none tabular-nums">{formatNumber(teamCap.tope)}</span>
          </div>
          <div>
            <span className="t-label block mb-0.5">Libre</span>
            <span className={`t-num text-3xl leading-none tabular-nums ${capStripTone.text}`}>{formatNumber(teamCap.free)}</span>
          </div>
          {activeContracts !== null && (
            <div>
              <span className="t-label block mb-0.5">Contratos activos</span>
              <span className="t-num text-3xl leading-none tabular-nums">{activeContracts}</span>
            </div>
          )}
          <div className="bar-track col-span-full">
            <div
              className={`bar-fill ${capStripTone.bar}`}
              style={{ width: `${Math.max(0, Math.min(100, (teamCap.spent / teamCap.tope) * 100))}%` }}
            />
          </div>
        </div>
      )}
      {!teamCap && activeContracts !== null && (
        <div className="mb-6 py-4 border-y border-line">
          <span className="t-label block mb-0.5">Contratos activos</span>
          <span className="t-num text-3xl leading-none tabular-nums">{activeContracts}</span>
        </div>
      )}

      <div className="tbl">
        <table className="w-full border-collapse text-[15px]">
          <thead>
            <tr>
              {headers.map((header, i) => {
                const active = sort?.header === header;
                const numeric = isNumericHeader(header) && header !== contractCol;
                return (
                  <th
                    key={i}
                    aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`p-3 t-th whitespace-nowrap ${numeric ? 'text-right' : 'text-left'} ${i === 0 ? 'sticky left-0 z-[1] bg-paper' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(header)}
                      title="Ordenar"
                      className={`inline-flex items-center gap-1 cursor-pointer hover:opacity-70 ${active ? 'text-ink font-bold' : ''}`}
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

                // Cap-Status der Zeile (Uebersicht): Farbe fuer den Streifen links (Schrift "Marcador")
                let rowTone: ReturnType<typeof capTone> | null = null;
                if (!isDetailView && freeHeader) {
                  const f = cellNumber(row[freeHeader]);
                  if (f !== null) rowTone = capTone(f, topeCol ? parseSalary(row[topeCol]?.v) : 0);
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
                    className={`group border-b border-line transition-colors ${
                      isSelectedInTrade
                        ? 'bg-accent text-on-accent'
                        : !isDetailView
                          ? 'cursor-pointer hover:bg-hover'
                          : 'hover:bg-hover'
                    }`}
                  >
                    {headers.map((header, colIndex) => {
                      const isTeamCol = !isDetailView && header === teamCol;
                      const isPlayerCol = isDetailView && header === playerCol;
                      const isNameCol = isTeamCol || isPlayerCol;
                      const isContractCol = header === contractCol;
                      const isBonoCol = header.toLowerCase().includes('bono');
                      const isHighlightedYear = lastTwoYearCols.includes(header);
                      const numeric = isNumericHeader(header) && !isNameCol && !isContractCol;

                      const stickyClass =
                        colIndex === 0
                          ? `sticky left-0 z-[1] ${isSelectedInTrade ? 'bg-accent' : 'bg-paper group-hover:bg-hover'}`
                          : '';
                      const tdClass = `p-3 whitespace-nowrap ${numeric ? 'text-right tabular-nums' : ''} ${stickyClass}`;

                      if (freeHeader && header === freeHeader && !isDetailView) {
                        const free = cellNumber(row[freeHeader]);
                        if (free !== null) {
                          const spent = spentCol ? parseSalary(row[spentCol]?.v) : 0;
                          const tope = topeCol ? parseSalary(row[topeCol]?.v) : 0;
                          const tone = capTone(free, tope);
                          return (
                            <td key={colIndex} className={tdClass}>
                              <div className="flex flex-col items-end gap-1.5 min-w-[6.5rem]">
                                <span className={`t-num text-xl leading-none tabular-nums ${isSelectedInTrade ? '' : tone.text}`}>{displayValue(row[freeHeader])}</span>
                                {tope > 0 && spentCol && (
                                  <div className="bar-track w-full">
                                    <div
                                      className={`bar-fill ${isSelectedInTrade ? 'bg-on-accent' : tone.bar}`}
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
                      const stripe = colIndex === 0 && rowTone;

                      return (
                        <td
                          key={colIndex}
                          className={`${tdClass} ${stripe ? 'stripe' : ''}`}
                          style={stripe && rowTone ? ({ '--tone': rowTone.css } as CSSProperties) : undefined}
                        >
                          <div className={`flex items-center gap-3 ${numeric ? 'justify-end' : ''}`}>
                            {isTeamCol && <span className="logo-slot"><TeamLogo name={String(row[header]?.v)} size="sm" /></span>}
                            {isPlayerCol && <span className="logo-slot"><PlayerImage name={String(row[header]?.v)} size="sm" /></span>}
                            {isNameCol ? (
                              <span className="name t-team text-[17px]">{value}</span>
                            ) : isContractCol && contractStyle ? (
                              <span className={`px-2 py-0.5 pill text-[11px] font-semibold uppercase tracking-wide border ${contractStyle}`}>
                                {value}
                              </span>
                            ) : isHighlightedYear ? (
                              <span className="px-1.5 py-0.5 pill border border-accent font-semibold">
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
                <td colSpan={headers.length} className="p-10 text-center opacity-50">
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
