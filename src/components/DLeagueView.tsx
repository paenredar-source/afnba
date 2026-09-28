import { ParsedSheet } from '../types';
import { isDLeague } from '../utils/sheet';
import { ContractGroupView, ContractGroup } from './ContractGroupView';

interface DLeagueViewProps {
  equipos: ParsedSheet | null;
  onSelectTeam: (team: string) => void;
}

const groupLabel = (group: ContractGroup) =>
  `${group.players.length} ${group.players.length === 1 ? 'jugador' : 'jugadores'}`;

/**
 * Uebersicht aller Spieler mit "D-League" in der Spalte "Contrato", nach Team gruppiert.
 * Wie viele pro Team erlaubt sind (1 oder 2), legt das Sheet fest: die App zeigt einfach alle.
 */
export function DLeagueView({ equipos, onSelectTeam }: DLeagueViewProps) {
  return (
    <ContractGroupView
      equipos={equipos}
      onSelectTeam={onSelectTeam}
      matches={isDLeague}
      intro="Jugadores con contrato D-League de cada equipo."
      emptyText='Todavía no hay jugadores con "D-League".'
      groupLabel={groupLabel}
    />
  );
}
