import { useEffect, useState } from 'react';
import { AlertCircle, ArrowRightLeft, CheckCircle2, Copy, Plus } from 'lucide-react';
import { ParsedSheet, Row } from '../types';
import {
  cellNumber,
  formatNumber,
  formatSigned,
  getCapColumns,
  getContractColumn,
  getContractStyle,
  getPlayerColumn,
  getSalaryColumn,
  getTeamColumn,
  isYearHeader,
  parseSalary
} from '../utils/sheet';
import { PlayerImage, TeamLogo } from './Images';

interface TradeMachineProps {
  equipos: ParsedSheet;
  salarios: ParsedSheet;
  teamA: string | null;
  teamB: string | null;
  onResetTeams: () => void;
  onExit: () => void;
}

/** Simulador de traspasos: Auswahl der Teams erfolgt ueber die Tabelle darunter (siehe App.tsx). */
export function TradeMachine({ equipos, salarios, teamA, teamB, onResetTeams, onExit }: TradeMachineProps) {
  if (!teamA || !teamB) {
    return (
      <div className="border border-[#141414] p-8 flex flex-col items-center text-center max-w-2xl mx-auto bg-white/50 backdrop-blur-sm mb-8">
        <ArrowRightLeft className="w-12 h-12 mb-4 opacity-40" />
        <h2 className="text-2xl font-serif italic mb-2">Simulador de traspasos</h2>
        <p className="opacity-70 mb-6">
          {!teamA
            ? 'Elige el primer equipo de la lista para empezar un traspaso.'
            : `Seleccionado: ${teamA}. Ahora elige el segundo equipo.`}
        </p>
        {teamA && (
          <button
            onClick={onResetTeams}
            className="text-[10px] font-mono uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
          >
            Reiniciar selección
          </button>
        )}
      </div>
    );
  }

  // key: bei einem neuen Team-Paar startet die Spielerauswahl wieder leer
  return (
    <TradeBoard
      key={`${teamA}|${teamB}`}
      equipos={equipos}
      salarios={salarios}
      teamA={teamA}
      teamB={teamB}
      onResetTeams={onResetTeams}
      onExit={onExit}
    />
  );
}

// Handelbare Vertragstypen. "Cut" ist nicht handelbar. "Derechos"-Spieler schon (zwischen Saisonstart und Markt-Nacht).
const TRADABLE_TYPES = ['standard', 'gratis', 'extension', 'extensión', 'rookie', 'd-league', 'dleague', 'derecho'];

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

interface TradeBoardProps extends Omit<TradeMachineProps, 'teamA' | 'teamB'> {
  teamA: string;
  teamB: string;
}

function TradeBoard({ equipos, salarios, teamA, teamB, onResetTeams, onExit }: TradeBoardProps) {
  const [selectedPlayersA, setSelectedPlayersA] = useState<string[]>([]);
  const [selectedPlayersB, setSelectedPlayersB] = useState<string[]>([]);
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'error'>('idle');

  useEffect(() => {
    if (copyState === 'idle') return;
    const t = setTimeout(() => setCopyState('idle'), 2000);
    return () => clearTimeout(t);
  }, [copyState]);

  const teamCol = getTeamColumn(equipos.headers);
  const playerCol = getPlayerColumn(equipos.headers);
  const salaryCol = getSalaryColumn(equipos.headers);
  const contractCol = getContractColumn(equipos.headers);
  const yearCols = equipos.headers.filter(isYearHeader);

  const rosterOf = (team: string) =>
    equipos.rows.filter((r: Row) => {
      if (String(r[teamCol]?.v) !== team) return false;
      const contract = String(r[contractCol || '']?.v || '').toLowerCase();
      return TRADABLE_TYPES.some(t => contract.includes(t));
    });

  const rosterA = rosterOf(teamA);
  const rosterB = rosterOf(teamB);

  // Cap: "Gastado", "Tope Salarial" und "LIBRE" aus SALARIOS EQUIPOS. Fuer die Cap zaehlt die Spalte "Salario".
  const { teamCol: salariosTeamCol, spentCol, topeCol, freeCol } = getCapColumns(salarios);
  const teamAData = salarios.rows.find(r => String(r[salariosTeamCol]?.v) === teamA);
  const teamBData = salarios.rows.find(r => String(r[salariosTeamCol]?.v) === teamB);

  const initialCapA = parseSalary(teamAData?.[spentCol || '']?.v);
  const initialCapB = parseSalary(teamBData?.[spentCol || '']?.v);
  const topeA = topeCol ? parseSalary(teamAData?.[topeCol]?.v) : 0;
  const topeB = topeCol ? parseSalary(teamBData?.[topeCol]?.v) : 0;

  // Freier Cap vor dem Trade: bevorzugt die eigene LIBRE-Spalte des Sheets, sonst Tope minus Gastado.
  const freeOf = (data: Row | undefined, tope: number, initialCap: number): number | null => {
    const fromSheet = freeCol && data ? cellNumber(data[freeCol]) : null;
    if (fromSheet !== null) return fromSheet;
    return tope > 0 ? tope - initialCap : null;
  };
  const initialFreeA = freeOf(teamAData, topeA, initialCapA);
  const initialFreeB = freeOf(teamBData, topeB, initialCapB);

  const pickedA = selectedPlayersA
    .map(name => rosterA.find(r => String(r[playerCol]?.v) === name))
    .filter((r): r is Row => !!r);
  const pickedB = selectedPlayersB
    .map(name => rosterB.find(r => String(r[playerCol]?.v) === name))
    .filter((r): r is Row => !!r);

  const salaryOf = (row: Row) => parseSalary(row[salaryCol || '']?.v);
  const tradedSalaryA = pickedA.reduce((sum, r) => sum + salaryOf(r), 0);
  const tradedSalaryB = pickedB.reduce((sum, r) => sum + salaryOf(r), 0);

  const newCapA = initialCapA - tradedSalaryA + tradedSalaryB;
  const newCapB = initialCapB - tradedSalaryB + tradedSalaryA;

  // Freier Cap nach dem Trade: Aenderung des Gastado wird vom freien Cap abgezogen
  const newFreeA = initialFreeA !== null ? initialFreeA - (newCapA - initialCapA) : null;
  const newFreeB = initialFreeB !== null ? initialFreeB - (newCapB - initialCapB) : null;
  const overA = newFreeA !== null ? Math.max(0, -newFreeA) : 0;
  const overB = newFreeB !== null ? Math.max(0, -newFreeB) : 0;
  const hasSelection = selectedPlayersA.length + selectedPlayersB.length > 0;

  // Aenderung der Vertragssummen pro Saison (eingehend minus ausgehend) fuer Team A; Team B ist genau das Gegenteil.
  const futureRows = yearCols
    .map(col => {
      const outgoingA = pickedA.reduce((sum, r) => sum + parseSalary(r[col]?.v), 0);
      const incomingA = pickedB.reduce((sum, r) => sum + parseSalary(r[col]?.v), 0);
      return { col, deltaA: incomingA - outgoingA, involved: outgoingA !== 0 || incomingA !== 0 };
    })
    .filter(y => y.involved);

  const togglePlayer = (playerName: string, team: 'A' | 'B') => {
    const setter = team === 'A' ? setSelectedPlayersA : setSelectedPlayersB;
    setter(prev => (prev.includes(playerName) ? prev.filter(p => p !== playerName) : [...prev, playerName]));
  };

  const capLine = (team: string, newCap: number, tope: number, newFree: number | null, over: number) => {
    const spentPart = tope > 0 ? `${formatNumber(newCap)} / ${formatNumber(tope)}` : formatNumber(newCap);
    if (newFree === null) return `${team}: ${spentPart}`;
    return over > 0
      ? `${team}: ${spentPart} (supera el tope en ${formatNumber(over)})`
      : `${team}: ${spentPart} (libre ${formatNumber(newFree)})`;
  };

  const buildSummaryText = () => {
    const listOf = (picked: Row[]) =>
      picked.length > 0
        ? picked.map(r => `• ${String(r[playerCol]?.v)} (${formatNumber(salaryOf(r))})`)
        : ['• (nadie)'];

    return [
      '🏀 Propuesta de traspaso',
      '',
      `${teamA} envía (${formatNumber(tradedSalaryA)}):`,
      ...listOf(pickedA),
      '',
      `${teamB} envía (${formatNumber(tradedSalaryB)}):`,
      ...listOf(pickedB),
      '',
      'Gastado tras el traspaso:',
      capLine(teamA, newCapA, topeA, newFreeA, overA),
      capLine(teamB, newCapB, topeB, newFreeB, overB)
    ].join('\n');
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(buildSummaryText());
    setCopyState(ok ? 'ok' : 'error');
  };

  const renderRoster = (team: 'A' | 'B') => {
    const roster = team === 'A' ? rosterA : rosterB;
    const selected = team === 'A' ? selectedPlayersA : selectedPlayersB;
    const selectedBg = team === 'A' ? 'bg-blue-500/20' : 'bg-orange-500/20';
    const selectedIcon = team === 'A' ? 'text-blue-600' : 'text-orange-600';

    return (
      <div className="border border-[#141414] bg-white/30">
        <div className="p-4 border-b border-[#141414] bg-[#141414]/5 flex justify-between items-center">
          <span className="font-mono text-xs uppercase tracking-widest">Plantilla</span>
          <span className="font-mono text-xs uppercase tracking-widest opacity-50">{roster.length} jugadores</span>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          {roster.map((row, i) => {
            const name = String(row[playerCol]?.v);
            const salary = salaryOf(row);
            const contract = String(row[contractCol || '']?.v || '');
            const contractStyle = contractCol ? getContractStyle(contract) : null;
            const isSelected = selected.includes(name);
            return (
              <div
                key={i}
                onClick={() => togglePlayer(name, team)}
                className={`p-3 border-b border-[#141414]/10 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? selectedBg : 'hover:bg-[#141414]/5'}`}
              >
                <div className="flex items-center gap-3">
                  <PlayerImage name={name} size="sm" />
                  <div>
                    <div className="text-sm font-medium">{name}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono opacity-50">{formatNumber(salary)}</span>
                      {contractStyle && (
                        <span className={`px-1.5 rounded-full text-[8px] font-mono uppercase tracking-wider border ${contractStyle}`}>
                          {contract}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                {isSelected ? <CheckCircle2 className={`w-4 h-4 ${selectedIcon}`} /> : <Plus className="w-4 h-4 opacity-20" />}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSummary = (team: string, label: string, initialCap: number, outgoing: number, incoming: number, newCap: number, tope: number, newFree: number | null, over: number) => (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">Resumen {label}</div>
        <div className="font-serif italic text-lg leading-tight">{team}</div>
      </div>
      {tope > 0 && (
        <div className="bg-[#141414]/5 p-3 flex justify-between items-center rounded-sm border border-[#141414]/10">
          <span className="text-[10px] font-mono uppercase tracking-widest opacity-60">Tope salarial</span>
          <span className="font-mono font-medium">{formatNumber(tope)}</span>
        </div>
      )}
      <div className="flex justify-between items-end border-b border-[#141414]/10 pb-2">
        <span className="text-sm opacity-70">Gastado actual</span>
        <span className="font-mono">{formatNumber(initialCap)}</span>
      </div>
      <div className="flex justify-between items-end border-b border-[#141414]/10 pb-2 text-red-600">
        <span className="text-sm">Salario saliente</span>
        <span className="font-mono">-{formatNumber(outgoing)}</span>
      </div>
      <div className="flex justify-between items-end border-b border-[#141414]/10 pb-2 text-green-600">
        <span className="text-sm">Salario entrante</span>
        <span className="font-mono">+{formatNumber(incoming)}</span>
      </div>
      <div className="flex justify-between items-end pt-2">
        <span className="font-serif italic text-lg">Nuevo gastado</span>
        <div className="flex items-center gap-2">
          {over > 0 && <AlertCircle className="w-5 h-5 text-red-600 animate-pulse" />}
          <span className={`font-mono text-xl ${newCap > (tope || initialCap) ? 'text-red-600' : 'text-green-600'}`}>
            {formatNumber(newCap)}
          </span>
        </div>
      </div>
      {newFree !== null && (
        <div className="flex justify-between items-end">
          <span className="text-sm opacity-70">{over > 0 ? 'Supera el tope en' : 'Cap libre tras el traspaso'}</span>
          <span className={`font-mono ${over > 0 ? 'text-red-600 font-medium' : ''}`}>
            {formatNumber(over > 0 ? over : newFree)}
          </span>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-8">
      <div className="flex justify-between items-center bg-[#141414] text-[#E4E3E0] p-4 rounded-sm">
        <div className="flex items-center gap-4">
          <TeamLogo name={teamA} size="sm" />
          <div>
            <div className="text-xs font-mono uppercase opacity-50">Equipo A</div>
            <div className="font-serif italic text-xl">{teamA}</div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <ArrowRightLeft className="w-6 h-6 opacity-50" />
          <div className="text-[10px] font-mono uppercase tracking-widest">Traspaso</div>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <div className="text-xs font-mono uppercase opacity-50">Equipo B</div>
            <div className="font-serif italic text-xl">{teamB}</div>
          </div>
          <TeamLogo name={teamB} size="sm" />
        </div>
      </div>

      {/* Ergebnis auf einen Blick, damit man es sieht, waehrend man Spieler auswaehlt */}
      {hasSelection && (newFreeA !== null || newFreeB !== null) && (
        overA > 0 || overB > 0 ? (
          <div className="flex items-start gap-3 border border-red-600 bg-red-600/10 text-red-700 p-4 rounded-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-sm">
              {overA > 0 && <div><span className="font-medium">{teamA}</span> supera el tope salarial en {formatNumber(overA)}.</div>}
              {overB > 0 && <div><span className="font-medium">{teamB}</span> supera el tope salarial en {formatNumber(overB)}.</div>}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 border border-green-600 bg-green-600/10 text-green-700 p-4 rounded-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div className="text-sm">Ambos equipos quedan dentro del tope salarial.</div>
          </div>
        )
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {renderRoster('A')}
        {renderRoster('B')}
      </div>

      {/* Trade Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[#141414] pt-8">
        {renderSummary(teamA, 'Equipo A', initialCapA, tradedSalaryA, tradedSalaryB, newCapA, topeA, newFreeA, overA)}
        {renderSummary(teamB, 'Equipo B', initialCapB, tradedSalaryB, tradedSalaryA, newCapB, topeB, newFreeB, overB)}
      </div>

      {futureRows.length > 0 && (
        <div className="border border-[#141414] bg-white/30">
          <div className="p-4 border-b border-[#141414] bg-[#141414]/5">
            <div className="font-mono text-xs uppercase tracking-widest">Contratos en próximas temporadas</div>
            <div className="text-[11px] opacity-60 mt-1">Cambio por temporada según las columnas de años (entrante − saliente). Positivo = el equipo se compromete a más dinero.</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#141414]/10">
                  <th className="p-3 text-left font-mono uppercase tracking-wider text-[11px] opacity-70"></th>
                  {futureRows.map(y => (
                    <th key={y.col} className="p-3 text-right font-mono uppercase tracking-wider text-[11px] opacity-70 whitespace-nowrap">{y.col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[{ team: teamA, sign: 1 }, { team: teamB, sign: -1 }].map(({ team, sign }) => (
                  <tr key={team} className="border-b border-[#141414]/10">
                    <td className="p-3 font-medium whitespace-nowrap">{team}</td>
                    {futureRows.map(y => {
                      const delta = y.deltaA * sign;
                      return (
                        <td
                          key={y.col}
                          className={`p-3 text-right font-mono ${delta > 0 ? 'text-red-600' : delta < 0 ? 'text-green-600' : 'opacity-60'}`}
                        >
                          {formatSigned(delta)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-4 mt-4">
        <button
          onClick={onResetTeams}
          className="border border-[#141414] px-6 py-2 font-mono text-xs uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
        >
          Reiniciar traspaso
        </button>
        <button
          onClick={handleCopy}
          disabled={!hasSelection}
          className="border border-[#141414] px-6 py-2 font-mono text-xs uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors disabled:opacity-30 disabled:pointer-events-none flex items-center gap-2"
        >
          <Copy className="w-3.5 h-3.5" />
          {copyState === 'ok' ? '¡Copiado!' : copyState === 'error' ? 'No se pudo copiar' : 'Copiar resumen'}
        </button>
        <button
          onClick={onExit}
          className="bg-[#141414] text-[#E4E3E0] px-6 py-2 font-mono text-xs uppercase tracking-widest hover:opacity-80 transition-opacity"
        >
          Salir del simulador
        </button>
      </div>
    </div>
  );
}
