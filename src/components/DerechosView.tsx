import { useMemo, useState } from 'react';
import { ParsedSheet } from '../types';
import {
  formatNumber,
  getContractColumn,
  getContractStyle,
  getPlayerColumn,
  getSalaryColumn,
  getTeamColumn,
  isDerechos,
  parseSalary
} from '../utils/sheet';
import { PlayerImage, TeamLogo } from './Images';

interface DerechosViewProps {
  equipos: ParsedSheet | null;
  onSelectTeam: (team: string) => void;
}

/**
 * Uebersicht aller Spieler mit auslaufendem Vertrag: Im Sheet steht bei "Contrato" der Wert "Derechos".
 * Diese Spieler gehen auf den Markt, das eigene Team hat aber zuerst die Rechte.
 */
export function DerechosView({ equipos, onSelectTeam }: DerechosViewProps) {
  const [teamFilter, setTeamFilter] = useState<string | null>(null);

  const groups = useMemo(() => {
    if (!equipos) return [];
    const teamCol = getTeamColumn(equipos.headers);
    const playerCol = getPlayerColumn(equipos.headers);
    const salaryCol = getSalaryColumn(equipos.headers);
    const contractCol = getContractColumn(equipos.headers);
    if (!contractCol) return [];

    const byTeam = new Map<string, { name: string; salary: number; contract: string }[]>();
    equipos.rows.forEach(row => {
      const contract = String(row[contractCol]?.v || '').trim();
      if (!isDerechos(contract)) return;
      const team = String(row[teamCol]?.v || '').trim();
      const name = String(row[playerCol]?.v || '').trim();
      if (!team || !name) return;
      if (!byTeam.has(team)) byTeam.set(team, []);
      byTeam.get(team)!.push({ name, salary: parseSalary(row[salaryCol || '']?.v), contract });
    });

    return Array.from(byTeam.entries()).map(([team, players]) => ({
      team,
      players,
      total: players.reduce((sum, p) => sum + p.salary, 0)
    }));
  }, [equipos]);

  if (!equipos) {
    return <div className="p-10 text-center opacity-50 font-serif italic">No se encontraron datos.</div>;
  }

  if (groups.length === 0) {
    return (
      <div className="p-10 text-center opacity-50 font-serif italic">
        Todavía no hay jugadores con "Derechos".
      </div>
    );
  }

  const visible = teamFilter ? groups.filter(g => g.team === teamFilter) : groups;
  const totalPlayers = visible.reduce((sum, g) => sum + g.players.length, 0);
  const totalSalary = visible.reduce((sum, g) => sum + g.total, 0);

  return (
    <div className="flex flex-col gap-8">
      <p className="text-sm opacity-70 max-w-2xl">
        Jugadores con contrato que termina. Salen al mercado, pero su equipo tiene los derechos primero.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setTeamFilter(null)}
          className={`px-3 py-1.5 border border-[#141414] font-mono text-[11px] uppercase tracking-widest transition-colors ${
            teamFilter === null ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/10'
          }`}
        >
          Todos ({groups.reduce((sum, g) => sum + g.players.length, 0)})
        </button>
        {groups.map(g => (
          <button
            key={g.team}
            onClick={() => setTeamFilter(teamFilter === g.team ? null : g.team)}
            className={`px-3 py-1.5 border border-[#141414] font-mono text-[11px] uppercase tracking-widest transition-colors flex items-center gap-2 ${
              teamFilter === g.team ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/10'
            }`}
          >
            {g.team} ({g.players.length})
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-x-8 gap-y-2 font-mono text-xs uppercase tracking-widest opacity-70">
        <span>{totalPlayers} jugadores</span>
        <span>Salario que se libera: {formatNumber(totalSalary)}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {visible.map(group => (
          <div key={group.team} className="border border-[#141414] bg-white/30">
            <button
              onClick={() => onSelectTeam(group.team)}
              title="Ver plantilla"
              className="w-full p-4 border-b border-[#141414] bg-[#141414]/5 flex justify-between items-center gap-4 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors text-left"
            >
              <span className="flex items-center gap-3 min-w-0">
                <TeamLogo name={group.team} size="sm" />
                <span className="font-serif italic text-lg truncate">{group.team}</span>
              </span>
              <span className="font-mono text-xs uppercase tracking-widest opacity-60 shrink-0">
                {group.players.length} · {formatNumber(group.total)}
              </span>
            </button>
            <div>
              {group.players.map((p, i) => {
                const style = getContractStyle(p.contract);
                return (
                  <div key={i} className="p-3 border-b border-[#141414]/10 last:border-b-0 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <PlayerImage name={p.name} size="sm" />
                      <span className="text-sm font-medium truncate">{p.name}</span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {style && (
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border ${style}`}>
                          {p.contract}
                        </span>
                      )}
                      <span className="font-mono text-sm">{formatNumber(p.salary)}</span>
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
