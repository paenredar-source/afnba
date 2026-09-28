import { ParsedSheet } from '../types';
import { countActiveContracts, isDerechos } from '../utils/sheet';
import { ContractGroupView, ContractGroup } from './ContractGroupView';

interface DerechosViewProps {
  equipos: ParsedSheet | null;
  onSelectTeam: (team: string) => void;
}

const groupLabel = (group: ContractGroup, equipos: ParsedSheet) => {
  const active = countActiveContracts(equipos).get(group.team) || 0;
  return `${active} ${active === 1 ? 'contrato activo' : 'contratos activos'}`;
};

/**
 * Uebersicht aller Spieler mit auslaufendem Vertrag: Im Sheet steht bei "Contrato" der Wert "Derechos".
 * Diese Spieler gehen auf den Markt, das eigene Team hat aber zuerst die Rechte.
 */
export function DerechosView({ equipos, onSelectTeam }: DerechosViewProps) {
  return (
    <ContractGroupView
      equipos={equipos}
      onSelectTeam={onSelectTeam}
      matches={isDerechos}
      intro="Jugadores con contrato que termina. Salen al mercado, pero su equipo tiene los derechos primero."
      emptyText='Todavía no hay jugadores con "Derechos".'
      groupLabel={groupLabel}
    />
  );
}
