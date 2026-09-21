import { Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { ParsedSheet, View } from '../types';
import { displayValue, getContractColumn, getContractStyle, getPlayerColumn, getTeamColumn } from '../utils/sheet';
import { PlayerImage, TeamLogo } from './Images';

const NAV_ITEMS: { view: View; label: string }[] = [
  { view: 'salarios', label: 'Salarios & Equipos' },
  { view: 'derechos', label: 'Derechos' },
  { view: 'lottery', label: 'Lottery 2026' },
  { view: 'draft2026', label: 'DRAFT 2026' },
  { view: 'rondas', label: 'RONDAS' },
  { view: 'trade', label: 'Simulador de traspasos' }
];

interface SideMenuProps {
  open: boolean;
  onClose: () => void;
  currentView: View;
  onNavigate: (view: View) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  equipos: ParsedSheet | null;
  /** Klick auf ein Suchergebnis: Teamansicht des Spielers oeffnen */
  onSelectTeam: (team: string) => void;
}

export function SideMenu({ open, onClose, currentView, onNavigate, searchTerm, onSearchChange, equipos, onSelectTeam }: SideMenuProps) {
  const renderSearchResults = () => {
    if (!equipos || !searchTerm) return null;

    const lowerSearch = searchTerm.toLowerCase();
    const playerCol = getPlayerColumn(equipos.headers);
    const teamCol = getTeamColumn(equipos.headers);
    const contractCol = getContractColumn(equipos.headers);

    const results = equipos.rows.filter(row => {
      const playerName = displayValue(row[playerCol]).toLowerCase();
      return playerName.includes(lowerSearch);
    });

    if (results.length === 0) {
      return <div className="text-sm opacity-50 italic text-center py-4">No se encontraron jugadores.</div>;
    }

    return results.map((row, i) => {
      const playerName = displayValue(row[playerCol]);
      const teamName = displayValue(row[teamCol]);
      const contract = displayValue(row[contractCol || '']);
      const contractStyle = contractCol ? getContractStyle(contract) : null;

      return (
        <div
          key={i}
          className="border border-[#141414] p-3 flex items-center gap-3 bg-white/50 cursor-pointer hover:bg-[#141414]/5 transition-colors"
          onClick={() => onSelectTeam(teamName)}
        >
          <PlayerImage name={playerName} size="md" />
          <div className="flex flex-col flex-grow min-w-0">
            <span className="font-bold truncate text-sm">{playerName}</span>
            <div className="flex items-center gap-2 mt-1">
              <TeamLogo name={teamName} size="xs" noBackground />
              <span className="text-xs opacity-70 truncate">{teamName}</span>
            </div>
            {contractStyle && (
              <span className={`mt-2 self-start px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border ${contractStyle}`}>
                {contract}
              </span>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#141414]/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
            className="fixed top-0 right-0 bottom-0 w-80 bg-[#E4E3E0] border-l border-[#141414] z-50 flex flex-col"
          >
            <div className="p-6 border-b border-[#141414] flex justify-between items-center">
              <span className="font-serif italic text-xl">Menú</span>
              <button onClick={onClose} className="hover:opacity-70"><X className="w-6 h-6" /></button>
            </div>
            <div className="p-6 flex flex-col gap-6 flex-grow overflow-hidden">
              <div className="relative shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                <input
                  type="text"
                  placeholder="Buscar jugador..."
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-transparent border border-[#141414] py-2 pl-10 pr-4 focus:outline-none focus:bg-[#141414] focus:text-[#E4E3E0] transition-colors placeholder:text-[#141414]/30"
                />
              </div>
              {searchTerm ? (
                <div className="flex flex-col gap-3 overflow-y-auto flex-grow pr-2">
                  {renderSearchResults()}
                </div>
              ) : (
                <nav className="flex flex-col gap-2 shrink-0">
                  {NAV_ITEMS.map(item => (
                    <button
                      key={item.view}
                      onClick={() => onNavigate(item.view)}
                      className={`text-left px-4 py-3 font-mono uppercase tracking-widest text-sm border border-[#141414] transition-colors ${currentView === item.view ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/10'}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </nav>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
