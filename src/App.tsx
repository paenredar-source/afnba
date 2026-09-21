import { useState, useEffect, useMemo } from 'react';
import { RefreshCw, AlertCircle, Menu } from 'lucide-react';
import { motion } from 'motion/react';
import { fetchSheet } from './services/googleSheetService';
import { ParsedSheet, Row, View } from './types';
import { buildImageMaps } from './utils/imageMaps';
import { getTeamColumn } from './utils/sheet';
import { ImageContext, TeamLogo } from './components/Images';
import { MainTable } from './components/MainTable';
import { TradeMachine } from './components/TradeMachine';
import { DerechosView } from './components/DerechosView';
import { SheetTable } from './components/SheetTable';
import { SideMenu } from './components/SideMenu';

export default function App() {
  const [salarios, setSalarios] = useState<ParsedSheet | null>(null);
  const [equipos, setEquipos] = useState<ParsedSheet | null>(null);
  const [lottery, setLottery] = useState<ParsedSheet | null>(null);
  const [draft2026, setDraft2026] = useState<ParsedSheet | null>(null);
  const [rondas, setRondas] = useState<ParsedSheet | null>(null);
  const [teamLogos, setTeamLogos] = useState<Record<string, string>>({});
  const [playerImages, setPlayerImages] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('salarios');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tradeTeamA, setTradeTeamA] = useState<string | null>(null);
  const [tradeTeamB, setTradeTeamB] = useState<string | null>(null);

  // Stabiler Wert fuer den ImageContext: Bilder werden nur neu geladen, wenn sich die Sheet-Daten aendern.
  const imageMaps = useMemo(() => ({ teamLogos, playerImages }), [teamLogos, playerImages]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [salariosData, equiposData, logosData, lotteryData, draft2026Data, rondasData] = await Promise.all([
        fetchSheet('SALARIOS EQUIPOS'),
        fetchSheet('EQUIPOS'),
        fetchSheet('LOGOS').catch((err) => {
          console.warn('LOGOS sheet fetch failed:', err);
          return null;
        }),
        fetchSheet('Lottery 2026').catch((err) => {
          console.warn('Lottery 2026 sheet fetch failed:', err);
          return null;
        }),
        fetchSheet('DRAFT 2026').catch((err) => {
          console.warn('DRAFT 2026 sheet fetch failed:', err);
          return null;
        }),
        fetchSheet('RONDAS').catch((err) => {
          console.warn('RONDAS sheet fetch failed:', err);
          return null;
        })
      ]);

      const { logos, players } = buildImageMaps(salariosData, equiposData, logosData);

      setTeamLogos(logos);
      setPlayerImages(players);
      setSalarios(salariosData);
      setEquipos(equiposData);
      setLottery(lotteryData);
      setDraft2026(draft2026Data);
      setRondas(rondasData);
    } catch (err: any) {
      setError(err.message || 'Ha ocurrido un error inesperado');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isDetailView = selectedTeam !== null;
  const currentSheet = isDetailView ? equipos : salarios;

  const goToTeam = (team: string) => {
    setSelectedTeam(team);
    setCurrentView('salarios');
    setSearchTerm('');
    setIsMenuOpen(false);
  };

  const navigate = (view: View) => {
    setCurrentView(view);
    setSelectedTeam(null);
    setIsMenuOpen(false);
  };

  const handleRowClick = (row: Row) => {
    if (!isDetailView && salarios) {
      const teamCol = getTeamColumn(salarios.headers);
      const teamName = String(row[teamCol]?.v || '');
      if (!teamName) return;

      if (currentView === 'trade') {
        if (!tradeTeamA) {
          setTradeTeamA(teamName);
        } else if (!tradeTeamB && teamName !== tradeTeamA) {
          setTradeTeamB(teamName);
        }
      } else if (currentView === 'salarios') {
        setSelectedTeam(teamName);
        setSearchTerm('');
      }
    }
  };

  const showMainTable =
    (currentView === 'salarios' || (currentView === 'trade' && (!tradeTeamA || !tradeTeamB))) && currentSheet;

  const title =
    currentView === 'trade' ? 'Simulador de traspasos' :
    currentView === 'lottery' ? 'Lottery 2026' :
    currentView === 'draft2026' ? 'DRAFT 2026' :
    currentView === 'rondas' ? 'RONDAS' :
    currentView === 'derechos' ? 'Derechos' :
    (isDetailView ? selectedTeam : 'Salarios Equipos');

  return (
    <ImageContext.Provider value={imageMaps}>
      <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
        <SideMenu
          open={isMenuOpen}
          onClose={() => setIsMenuOpen(false)}
          currentView={currentView}
          onNavigate={navigate}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          equipos={equipos}
          onSelectTeam={goToTeam}
        />

        {/* Header */}
        <header className="border-b border-[#141414] p-6 md:p-10 flex flex-col gap-8">
          <div className="flex justify-between items-center gap-6">
            <button
              onClick={() => {
                setCurrentView('salarios');
                setSelectedTeam(null);
                setSearchTerm('');
              }}
              className="flex items-center gap-3 hover:opacity-70 transition-opacity text-left"
            >
              <TeamLogo name="AsturFantasy NBA" size="xs" noBackground />
              <span className="text-[11px] font-mono uppercase tracking-widest opacity-50 italic">AsturFantasy NBA</span>
            </button>

            <div className="flex items-center gap-4">
              <button
                onClick={loadData}
                disabled={loading}
                className="flex items-center gap-2 border border-[#141414] px-4 py-2 hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span className="text-sm font-mono uppercase tracking-wider hidden sm:inline">Actualizar</span>
              </button>
              <button onClick={() => setIsMenuOpen(true)} className="p-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors">
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {currentView === 'salarios' && isDetailView && <TeamLogo name={selectedTeam!} size="lg" />}
            <h1 className="text-4xl md:text-6xl font-serif italic tracking-tight leading-none">
              {title}
            </h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-6 md:p-10">
          {error ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="border border-[#141414] p-8 flex flex-col items-center text-center max-w-2xl mx-auto"
            >
              <AlertCircle className="w-12 h-12 mb-4 text-red-600" />
              <h2 className="text-2xl font-serif italic mb-2">Error al conectar con la hoja</h2>
              <p className="opacity-70 mb-6">{error}</p>
            </motion.div>
          ) : loading && !salarios && !lottery && !draft2026 && !rondas ? (
            <div className="flex flex-col items-center justify-center py-20 opacity-30">
              <RefreshCw className="w-12 h-12 animate-spin mb-4" />
              <p className="font-mono uppercase tracking-widest text-sm">Cargando datos...</p>
            </div>
          ) : (
            <>
              {currentView === 'trade' && equipos && salarios && (
                <TradeMachine
                  equipos={equipos}
                  salarios={salarios}
                  teamA={tradeTeamA}
                  teamB={tradeTeamB}
                  onResetTeams={() => {
                    setTradeTeamA(null);
                    setTradeTeamB(null);
                  }}
                  onExit={() => setCurrentView('salarios')}
                />
              )}
              {currentView === 'derechos' && <DerechosView equipos={equipos} onSelectTeam={goToTeam} />}
              {currentView === 'lottery' && (
                <SheetTable sheet={lottery} emptyText="No se encontraron datos de la Lottery." />
              )}
              {currentView === 'draft2026' && (
                <SheetTable sheet={draft2026} emptyText="No se encontraron datos del DRAFT 2026." hideEmptyHeaders />
              )}
              {currentView === 'rondas' && (
                <SheetTable sheet={rondas} emptyText="No se encontraron datos de RONDAS." hideEmptyHeaders highlightTradedPicks />
              )}
              {showMainTable && currentSheet && (
                <MainTable
                  // Beim Wechsel zwischen Uebersicht und Teams startet die Sortierung neu
                  key={selectedTeam ?? 'all'}
                  sheet={currentSheet}
                  salarios={salarios}
                  selectedTeam={selectedTeam}
                  tradeMode={currentView === 'trade'}
                  tradeTeamA={tradeTeamA}
                  tradeTeamB={tradeTeamB}
                  onRowClick={handleRowClick}
                  onBack={() => {
                    setSelectedTeam(null);
                    setSearchTerm('');
                  }}
                />
              )}
            </>
          )}
        </main>
      </div>
    </ImageContext.Provider>
  );
}
