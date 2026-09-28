import { useMemo, useState } from 'react';
import { ParsedSheet } from '../types';
import {
  formatNumber,
  getContractColumn,
  getContractStyle,
  getPlayerColumn,
  getSalaryColumn,
  getTeamColumn,
  parseSalary
} from '../utils/sheet';
import { PlayerImage, TeamLogo } from './Images';

export interface ContractGroup {
  team: string;
  players: { name: string; salary: number; contract: string }[];
}

interface ContractGroupViewProps {
  equipos: ParsedSheet | null;
  onSelectTeam: (team: string) => void;
  /** Welche Vertraege (Wert aus der Spalte "Contrato") gehoeren auf diese Seite? */
  matches: (contract: string) => boolean;
  /** Erklaerung oberhalb der Filter */
  intro: string;
  /** Text, wenn kein Spieler passt */
  emptyText: string;
  /** Beschriftung rechts im Kopf jeder Team-Karte */
  groupLabel: (group: ContractGroup, equipos: ParsedSheet) => string;
}

/**
 * Gemeinsame Ansicht fuer Seiten, die Spieler eines bestimmten Vertragstyps nach Team gruppiert zeigen
 * (Derechos, D-League). Spieler ohne Namen (leere Reservezeilen im Sheet) werden ignoriert.
 */
export function ContractGroupView({ equipos, onSelectTeam, matches, intro, emptyText, groupLabel }: ContractGroupViewProps) {
  const [teamFilter, setTeamFilter] = useState<string | null>(null);

  const groups = useMemo<ContractGroup[]>(() => {
    if (!equipos) return [];
    const teamCol = getTeamColumn(equipos.headers);
    const playerCol = getPlayerColumn(equipos.headers);
    const salaryCol = getSalaryColumn(equipos.headers);
    const contractCol = getContractColumn(equipos.headers);
    if (!contractCol) return [];

    const byTeam = new Map<string, ContractGroup['players']>();
    equipos.rows.forEach(row => {
      const contract = String(row[contractCol]?.v || '').trim();
      const team = String(row[teamCol]?.v || '').trim();
      const name = String(row[playerCol]?.v || '').trim();
      if (!matches(contract) || !team || !name) return;
      if (!byTeam.has(team)) byTeam.set(team, []);
      byTeam.get(team)!.push({ name, salary: parseSalary(row[salaryCol || '']?.v), contract });
    });

    return Array.from(byTeam.entries()).map(([team, players]) => ({ team, players }));
  }, [equipos, matches]);

  if (!equipos) {
    return <div className="p-10 text-center opacity-50">No se encontraron datos.</div>;
  }

  if (groups.length === 0) {
    return <div className="p-10 text-center opacity-50">{emptyText}</div>;
  }

  const visible = teamFilter ? groups.filter(g => g.team === teamFilter) : groups;
  const totalPlayers = visible.reduce((sum, g) => sum + g.players.length, 0);

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm opacity-70 max-w-2xl">{intro}</p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTeamFilter(null)}
          className={`px-3 py-1.5 border border-ink tabular-nums text-[11px] uppercase tracking-widest transition-colors ${
            teamFilter === null ? 'bg-ink text-paper' : 'hover:bg-ink/10'
          }`}
        >
          Todos ({groups.reduce((sum, g) => sum + g.players.length, 0)})
        </button>
        {groups.map(g => (
          <button
            key={g.team}
            onClick={() => setTeamFilter(teamFilter === g.team ? null : g.team)}
            className={`px-3 py-1.5 border border-ink tabular-nums text-[11px] uppercase tracking-widest transition-colors flex items-center gap-2 ${
              teamFilter === g.team ? 'bg-ink text-paper' : 'hover:bg-ink/10'
            }`}
          >
            {g.team} ({g.players.length})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-2 t-label">
        <span>{totalPlayers} jugadores</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {visible.map(group => (
          <div key={group.team} className="border border-line bg-surface/50">
            <button
              onClick={() => onSelectTeam(group.team)}
              title="Ver plantilla"
              className="w-full p-4 border-b border-line bg-ink/5 flex justify-between items-center gap-4 hover:bg-ink hover:text-paper transition-colors text-left"
            >
              <span className="flex items-center gap-3 min-w-0">
                <TeamLogo name={group.team} size="sm" />
                <span className="t-team text-lg truncate">{group.team}</span>
              </span>
              <span className="t-label shrink-0">{groupLabel(group, equipos)}</span>
            </button>
            <div>
              {group.players.map((p, i) => {
                const style = getContractStyle(p.contract);
                return (
                  <div key={i} className="p-3 border-b border-line last:border-b-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerImage name={p.name} size="sm" />
                      <span className="text-sm font-medium truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {style && (
                        <span className={`px-2 py-0.5 pill text-[11px] font-semibold uppercase tracking-wide border ${style}`}>
                          {p.contract}
                        </span>
                      )}
                      <span className="tabular-nums text-sm">{formatNumber(p.salary)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
