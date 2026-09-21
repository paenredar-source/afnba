import { useState, useEffect, useMemo } from 'react';
import { fetchSheet } from './services/googleSheetService';
import { ParsedSheet } from './types';
import { ImageContext, PlayerImage, TeamLogo } from './components/Images';
import { 
  Search, 
  RefreshCw, 
  AlertCircle, 
  ArrowLeft,
  ArrowRightLeft,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  XCircle,
  User,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
  const [currentView, setCurrentView] = useState<'salarios' | 'trade' | 'lottery' | 'draft2026' | 'rondas'>('salarios');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [tradeTeamA, setTradeTeamA] = useState<string | null>(null);
  const [tradeTeamB, setTradeTeamB] = useState<string | null>(null);
  const [selectedPlayersA, setSelectedPlayersA] = useState<string[]>([]);
  const [selectedPlayersB, setSelectedPlayersB] = useState<string[]>([]);

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
      
      const logos: Record<string, string> = {};
      const players: Record<string, string> = {};
      const teamCol = getTeamColumn(salariosData.headers);

      // 1. Try to get logos and player images from the dedicated LOGOS sheet (preferred)
      if (logosData) {
        console.log('LOGOS Sheet Headers:', logosData.headers);
        
        const logoSheetTeamCol = logosData.headers.find(h => 
          h.toLowerCase().includes('equipo') || 
          h.toLowerCase().includes('team')
        );
        
        const logoSheetPlayerCol = logosData.headers.find(h => 
          h.toLowerCase().includes('jugador') || 
          h.toLowerCase().includes('player') ||
          h.toLowerCase().includes('nombre')
        );
        
        const logoSheetUrlCol = logosData.headers.find(h => 
          h.toLowerCase().includes('link') || 
          h.toLowerCase().includes('url') || 
          h.toLowerCase().includes('drive') ||
          h.toLowerCase().includes('enlace')
        );
        
        const logoSheetImgCol = logosData.headers.find(h => 
          h.toLowerCase().includes('imagen') || 
          h.toLowerCase().includes('logo') || 
          h.toLowerCase().includes('image')
        );
        
        logosData.rows.forEach(row => {
          const team = row[logoSheetTeamCol || '']?.v;
          const player = row[logoSheetPlayerCol || '']?.v;
          const logo = row[logoSheetImgCol || '']?.v || row[logoSheetUrlCol || '']?.v;
          
          if (logo) {
            const logoUrl = String(logo).trim();
            if (team) {
              logos[String(team).trim()] = logoUrl;
            } else if (player) {
              players[String(player).trim()] = logoUrl;
            }
          }
        });
      }

      // 2. Fallback to logos in the SALARIOS EQUIPOS sheet if not found in LOGOS sheet
      const logoCol = salariosData.headers.find(h => h.toLowerCase().includes('logo') || h.toLowerCase().includes('imagen'));
      if (logoCol) {
        salariosData.rows.forEach(row => {
          const team = row[teamCol]?.v;
          const logo = row[logoCol]?.v;
          const teamStr = String(team || '').trim();
          if (teamStr && logo && !logos[teamStr]) {
            logos[teamStr] = String(logo).trim();
          }
        });
      }
      
      console.log('Final Logo Map:', logos);
      console.log('Final Player Image Map:', players);

      // 3. Look for player images inside the EQUIPOS sheet itself
      if (equiposData) {
        const playerCol = getPlayerColumn(equiposData.headers);
        const imageCol = equiposData.headers.find(h => 
          h.toLowerCase().includes('image') || 
          h.toLowerCase().includes('foto') ||
          h.toLowerCase().includes('picture')
        );
        
        if (imageCol) {
          equiposData.rows.forEach(row => {
            const player = row[playerCol]?.v;
            const img = row[imageCol]?.v;
            const playerStr = String(player || '').trim();
            if (playerStr && img && !players[playerStr]) {
              const imgStr = String(img).trim();
              // If it's a URL or a Google Drive ID, we can use it
              if (imgStr.startsWith('http') || imgStr.length > 20) {
                players[playerStr] = imgStr;
              }
            }
          });
        }
      }

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

  const getTeamColumn = (headers: string[]) => {
    return headers.find(h => h.toLowerCase().includes('equip') || h.toLowerCase().includes('team') || h.toLowerCase().includes('afnba')) || headers[0];
  };

  const getPlayerColumn = (headers: string[]) => {
    return headers.find(h => h.toLowerCase().includes('jugador') || h.toLowerCase().includes('player') || h.toLowerCase().includes('nombre')) || headers[0];
  };

  const getSalaryColumn = (headers: string[]) => {
    return headers.find(h => 
      h.toLowerCase().includes('salario') || 
      h.toLowerCase().includes('sueldo') || 
      h.toLowerCase().includes('salary') ||
      h.toLowerCase().includes('total') ||
      h.includes('$') || 
      h.includes('€')
    ) || null;
  };

  const parseSalary = (value: any) => {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    let str = String(value).trim();
    
    // Handle European format: 1.234,56 or 1.234
    if (str.includes(',')) {
      // Has comma: dots are thousands, comma is decimal
      str = str.replace(/\./g, '').replace(',', '.');
    } else if (str.includes('.')) {
      // No comma, but has dots: dots are likely thousands separators in European context
      // e.g. "1.234" -> 1234
      // We remove dots if they look like thousands separators (followed by 3 digits or multiple dots)
      const dotCount = (str.match(/\./g) || []).length;
      if (dotCount > 1 || /\.\d{3}$/.test(str)) {
        str = str.replace(/\./g, '');
      }
    }
    
    const cleaned = str.replace(/[^0-9.-]+/g, "");
    return parseFloat(cleaned) || 0;
  };

  const getContractColumn = (headers: string[]) => {
    return headers.find(h => h.toLowerCase().includes('contrat') || h.toLowerCase().includes('contract') || h.toLowerCase().includes('tipo')) || null;
  };

  const getContractStyle = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('standard')) return 'bg-blue-300 text-blue-900 border-blue-400';
    if (t.includes('gratis')) return 'bg-slate-300 text-slate-900 border-slate-400';
    if (t.includes('rookie')) return 'bg-yellow-300 text-yellow-900 border-yellow-400';
    if (t.includes('extension') || t.includes('extensión')) return 'bg-purple-300 text-purple-900 border-purple-400';
    if (t.includes('d-league') || t.includes('dleague')) return 'bg-orange-300 text-orange-900 border-orange-400';
    if (t.includes('cut')) return 'bg-rose-300 text-rose-900 border-rose-400';
    return null;
  };

  const displayValue = (cell: { v: any; f?: string } | undefined) => {
    if (!cell) return '';
    const val = cell.f !== undefined ? cell.f : (cell.v === null || cell.v === undefined ? '' : String(cell.v));
    return val.replace('$', '').trim();
  };

  // Determine which sheet to show
  const currentSheet = selectedTeam ? equipos : salarios;
  const isDetailView = selectedTeam !== null;

  // Determine which headers to display
  // Teamansicht: Alles ab der Spalte "Imagen" (bzw. "Foto") wird ausgeblendet. Die Position wird ueber den
  // Spaltennamen gefunden, nicht ueber feste Nummern. Neue Spalten davor sind damit kein Problem.
  const imageColIndex = currentSheet ? currentSheet.headers.findIndex(h => /imag|image|foto/i.test(h)) : -1;
  const hideFromIndex = imageColIndex >= 0 ? imageColIndex : 13;

  const headersToDisplay = currentSheet ? currentSheet.headers.filter((header, i) => {
    const h = header.toLowerCase();
    if (!isDetailView) {
      // Summary view: hide the "Anual" and "Extra" columns (by name, not by position)
      const hn = h.trim();
      return hn !== 'anual' && hn !== 'extra';
    } else {
      // Detail view: remove "control", "anual" and everything from the image column onwards
      if (h === 'control' || h === 'anual') return false;
      if (i >= hideFromIndex) return false;
      return true;
    }
  }) : [];

  // Filter data
  let filteredRows = currentSheet?.rows || [];
  
  if (isDetailView && equipos) {
    const teamCol = getTeamColumn(equipos.headers);
    filteredRows = filteredRows.filter(row => {
      const cellVal = row[teamCol]?.v;
      return cellVal && String(cellVal).toLowerCase() === selectedTeam.toLowerCase();
    });
  }

  const handleRowClick = (row: Record<string, { v: any; f?: string }>) => {
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

  const renderTradeMachine = () => {
    if (currentView !== 'trade' || !equipos || !salarios) return null;

    if (!tradeTeamA || !tradeTeamB) {
      return (
        <div className="border border-[#141414] p-8 flex flex-col items-center text-center max-w-2xl mx-auto bg-white/50 backdrop-blur-sm mb-8">
          <ArrowRightLeft className="w-12 h-12 mb-4 opacity-40" />
          <h2 className="text-2xl font-serif italic mb-2">Simulador de traspasos</h2>
          <p className="opacity-70 mb-6">
            {!tradeTeamA 
              ? "Elige el primer equipo de la lista para empezar un traspaso." 
              : `Seleccionado: ${tradeTeamA}. Ahora elige el segundo equipo.`}
          </p>
          {tradeTeamA && (
            <button 
              onClick={() => { setTradeTeamA(null); setTradeTeamB(null); }}
              className="text-[10px] font-mono uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
            >
              Reiniciar selección
            </button>
          )}
        </div>
      );
    }

    const teamCol = getTeamColumn(equipos.headers);
    const playerCol = getPlayerColumn(equipos.headers);
    const salaryCol = getSalaryColumn(equipos.headers);
    const contractCol = getContractColumn(equipos.headers);
    
    const tradableTypes = ['standard', 'gratis', 'extension', 'extensión', 'rookie', 'd-league', 'dleague'];

    const rosterA = equipos.rows.filter(r => {
      const isTeam = String(r[teamCol]?.v) === tradeTeamA;
      if (!isTeam) return false;
      const contract = String(r[contractCol || '']?.v || '').toLowerCase();
      return tradableTypes.some(t => contract.includes(t));
    });

    const rosterB = equipos.rows.filter(r => {
      const isTeam = String(r[teamCol]?.v) === tradeTeamB;
      if (!isTeam) return false;
      const contract = String(r[contractCol || '']?.v || '').toLowerCase();
      return tradableTypes.some(t => contract.includes(t));
    });

    const capCol = salarios.headers.find(h => h.toLowerCase().includes('gastado')) || getSalaryColumn(salarios.headers);
    const topeCol = salarios.headers.find(h => h.toLowerCase().includes('tope salarial'));
    const salariosTeamCol = getTeamColumn(salarios.headers);
    const teamAData = salarios.rows.find(r => String(r[salariosTeamCol]?.v) === tradeTeamA);
    const teamBData = salarios.rows.find(r => String(r[salariosTeamCol]?.v) === tradeTeamB);

    const initialCapA = parseSalary(teamAData?.[capCol || '']?.v);
    const initialCapB = parseSalary(teamBData?.[capCol || '']?.v);
    const topeSalarialA = topeCol ? parseSalary(teamAData?.[topeCol]?.v) : 0;
    const topeSalarialB = topeCol ? parseSalary(teamBData?.[topeCol]?.v) : 0;

    const tradedSalaryA = selectedPlayersA.reduce((sum, playerName) => {
      const player = rosterA.find(r => String(r[playerCol]?.v) === playerName);
      return sum + parseSalary(player?.[salaryCol || '']?.v);
    }, 0);

    const tradedSalaryB = selectedPlayersB.reduce((sum, playerName) => {
      const player = rosterB.find(r => String(r[playerCol]?.v) === playerName);
      return sum + parseSalary(player?.[salaryCol || '']?.v);
    }, 0);

    const newCapA = initialCapA - tradedSalaryA + tradedSalaryB;
    const newCapB = initialCapB - tradedSalaryB + tradedSalaryA;

    const formatCurrency = (val: number) => {
      return new Intl.NumberFormat('es-ES', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 2 
      }).format(val);
    };

    const togglePlayer = (playerName: string, team: 'A' | 'B') => {
      if (team === 'A') {
        setSelectedPlayersA(prev => 
          prev.includes(playerName) ? prev.filter(p => p !== playerName) : [...prev, playerName]
        );
      } else {
        setSelectedPlayersB(prev => 
          prev.includes(playerName) ? prev.filter(p => p !== playerName) : [...prev, playerName]
        );
      }
    };

    return (
      <div className="flex flex-col gap-8">
        <div className="flex justify-between items-center bg-[#141414] text-[#E4E3E0] p-4 rounded-sm">
          <div className="flex items-center gap-4">
            <TeamLogo name={tradeTeamA} size="sm" />
            <div>
              <div className="text-xs font-mono uppercase opacity-50">Equipo A</div>
              <div className="font-serif italic text-xl">{tradeTeamA}</div>
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <ArrowRightLeft className="w-6 h-6 opacity-50" />
            <div className="text-[10px] font-mono uppercase tracking-widest">Traspaso</div>
          </div>
          <div className="flex items-center gap-4 text-right">
            <div>
              <div className="text-xs font-mono uppercase opacity-50">Equipo B</div>
              <div className="font-serif italic text-xl">{tradeTeamB}</div>
            </div>
            <TeamLogo name={tradeTeamB} size="sm" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Team A Roster */}
          <div className="border border-[#141414] bg-white/30">
            <div className="p-4 border-b border-[#141414] bg-[#141414]/5 flex justify-between items-center">
              <span className="font-mono text-xs uppercase tracking-widest">Plantilla</span>
              <span className="font-mono text-xs uppercase tracking-widest opacity-50">{rosterA.length} jugadores</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {rosterA.map((row, i) => {
                const name = String(row[playerCol]?.v);
                const salary = parseSalary(row[salaryCol || '']?.v);
                const isSelected = selectedPlayersA.includes(name);
                return (
                  <div 
                    key={i} 
                    onClick={() => togglePlayer(name, 'A')}
                    className={`p-3 border-b border-[#141414]/10 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-blue-500/20' : 'hover:bg-[#141414]/5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <PlayerImage name={name} size="sm" />
                      <div>
                        <div className="text-sm font-medium">{name}</div>
                        <div className="text-[10px] font-mono opacity-50">{formatCurrency(salary)}</div>
                      </div>
                    </div>
                    {isSelected ? <CheckCircle2 className="w-4 h-4 text-blue-600" /> : <Plus className="w-4 h-4 opacity-20" />}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Team B Roster */}
          <div className="border border-[#141414] bg-white/30">
            <div className="p-4 border-b border-[#141414] bg-[#141414]/5 flex justify-between items-center">
              <span className="font-mono text-xs uppercase tracking-widest">Plantilla</span>
              <span className="font-mono text-xs uppercase tracking-widest opacity-50">{rosterB.length} jugadores</span>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              {rosterB.map((row, i) => {
                const name = String(row[playerCol]?.v);
                const salary = parseSalary(row[salaryCol || '']?.v);
                const isSelected = selectedPlayersB.includes(name);
                return (
                  <div 
                    key={i} 
                    onClick={() => togglePlayer(name, 'B')}
                    className={`p-3 border-b border-[#141414]/10 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-orange-500/20' : 'hover:bg-[#141414]/5'}`}
                  >
                    <div className="flex items-center gap-3">
                      <PlayerImage name={name} size="sm" />
                      <div>
                        <div className="text-sm font-medium">{name}</div>
                        <div className="text-[10px] font-mono opacity-50">{formatCurrency(salary)}</div>
                      </div>
                    </div>
                    {isSelected ? <CheckCircle2 className="w-4 h-4 text-orange-600" /> : <Plus className="w-4 h-4 opacity-20" />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Trade Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-[#141414] pt-8">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">Resumen Equipo A</div>
              <div className="font-serif italic text-lg leading-tight">{tradeTeamA}</div>
            </div>
            {topeSalarialA > 0 && (
              <div className="bg-[#141414]/5 p-3 flex justify-between items-center rounded-sm border border-[#141414]/10">
                <span className="text-[10px] font-mono uppercase tracking-widest opacity-60">Tope salarial</span>
                <span className="font-mono font-medium">{formatCurrency(topeSalarialA)}</span>
              </div>
            )}
            <div className="flex justify-between items-end border-b border-[#141414]/10 pb-2">
              <span className="text-sm opacity-70">Gastado actual</span>
              <span className="font-mono">{formatCurrency(initialCapA)}</span>
            </div>
            <div className="flex justify-between items-end border-b border-[#141414]/10 pb-2 text-red-600">
              <span className="text-sm">Salario saliente</span>
              <span className="font-mono">-{formatCurrency(tradedSalaryA)}</span>
            </div>
            <div className="flex justify-between items-end border-b border-[#141414]/10 pb-2 text-green-600">
              <span className="text-sm">Salario entrante</span>
              <span className="font-mono">+{formatCurrency(tradedSalaryB)}</span>
            </div>
            <div className="flex justify-between items-end pt-2">
              <span className="font-serif italic text-lg">Nuevo gastado</span>
              <div className="flex items-center gap-2">
                {topeSalarialA > 0 && newCapA > topeSalarialA && (
                  <AlertCircle className="w-5 h-5 text-red-600 animate-pulse" />
                )}
                <span className={`font-mono text-xl ${newCapA > (topeSalarialA || initialCapA) ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(newCapA)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-50">Resumen Equipo B</div>
              <div className="font-serif italic text-lg leading-tight">{tradeTeamB}</div>
            </div>
            {topeSalarialB > 0 && (
              <div className="bg-[#141414]/5 p-3 flex justify-between items-center rounded-sm border border-[#141414]/10">
                <span className="text-[10px] font-mono uppercase tracking-widest opacity-60">Tope salarial</span>
                <span className="font-mono font-medium">{formatCurrency(topeSalarialB)}</span>
              </div>
            )}
            <div className="flex justify-between items-end border-b border-[#141414]/10 pb-2">
              <span className="text-sm opacity-70">Gastado actual</span>
              <span className="font-mono">{formatCurrency(initialCapB)}</span>
            </div>
            <div className="flex justify-between items-end border-b border-[#141414]/10 pb-2 text-red-600">
              <span className="text-sm">Salario saliente</span>
              <span className="font-mono">-{formatCurrency(tradedSalaryB)}</span>
            </div>
            <div className="flex justify-between items-end border-b border-[#141414]/10 pb-2 text-green-600">
              <span className="text-sm">Salario entrante</span>
              <span className="font-mono">+{formatCurrency(tradedSalaryA)}</span>
            </div>
            <div className="flex justify-between items-end pt-2">
              <span className="font-serif italic text-lg">Nuevo gastado</span>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-xl ${newCapB > (topeSalarialB || initialCapB) ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(newCapB)}
                </span>
                {topeSalarialB > 0 && newCapB > topeSalarialB && (
                  <AlertCircle className="w-5 h-5 text-red-600 animate-pulse" />
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 mt-4">
          <button 
            onClick={() => {
              setTradeTeamA(null);
              setTradeTeamB(null);
              setSelectedPlayersA([]);
              setSelectedPlayersB([]);
            }}
            className="border border-[#141414] px-6 py-2 font-mono text-xs uppercase tracking-widest hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
          >
            Reiniciar traspaso
          </button>
          <button 
            onClick={() => setCurrentView('salarios')}
            className="bg-[#141414] text-[#E4E3E0] px-6 py-2 font-mono text-xs uppercase tracking-widest hover:opacity-80 transition-opacity"
          >
            Salir del simulador
          </button>
        </div>
      </div>
    );
  };

  const renderLottery = () => {
    if (currentView !== 'lottery') return null;
    if (!lottery) return <div className="p-10 text-center opacity-50 font-serif italic">No se encontraron datos de la Lottery.</div>;
    
    return (
      <div className="overflow-x-auto border border-[#141414]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#141414] bg-[#141414]/5">
              {lottery.headers.map((header, i) => (
                <th key={i} className="p-3 text-left font-mono uppercase tracking-wider text-[11px] opacity-70 whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {lottery.rows.map((row, rowIndex) => {
              const teamCol = getTeamColumn(lottery.headers);
              const teamName = String(row[teamCol]?.v || '');
              return (
                <tr key={rowIndex} className="border-b border-[#141414]/10 hover:bg-[#141414]/5 transition-colors">
                  {lottery.headers.map((header, colIndex) => {
                    const isTeamCol = header === teamCol;
                    return (
                      <td key={colIndex} className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {isTeamCol && <TeamLogo name={teamName} size="sm" />}
                          {displayValue(row[header])}
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
  };

  const renderDraft2026 = () => {
    if (currentView !== 'draft2026') return null;
    if (!draft2026) return <div className="p-10 text-center opacity-50 font-serif italic">No se encontraron datos del DRAFT 2026.</div>;
    
    // Hide empty columns
    const draft2026Headers = draft2026.headers.filter(h => h.trim() !== '');

    return (
      <div className="overflow-x-auto border border-[#141414]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#141414] bg-[#141414]/5">
              {draft2026Headers.map((header, i) => (
                <th key={i} className="p-3 text-left font-mono uppercase tracking-wider text-[11px] opacity-70 whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {draft2026.rows.map((row, rowIndex) => {
              const teamCol = getTeamColumn(draft2026.headers);
              const teamName = String(row[teamCol]?.v || '');
              return (
                <tr key={rowIndex} className="border-b border-[#141414]/10 hover:bg-[#141414]/5 transition-colors">
                  {draft2026Headers.map((header, colIndex) => {
                    const isTeamCol = header === teamCol;
                    return (
                      <td key={colIndex} className="p-3 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {isTeamCol && <TeamLogo name={teamName} size="sm" />}
                          {displayValue(row[header])}
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
  };

  const renderRondas = () => {
    if (currentView !== 'rondas') return null;
    if (!rondas) return <div className="p-10 text-center opacity-50 font-serif italic">No se encontraron datos de RONDAS.</div>;
    
    // Hide empty columns
    const rondasHeaders = rondas.headers.filter(h => h.trim() !== '');

    return (
      <div className="overflow-x-auto border border-[#141414]">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[#141414] bg-[#141414]/5">
              {rondasHeaders.map((header, i) => (
                <th key={i} className="p-3 text-left font-mono uppercase tracking-wider text-[11px] opacity-70 whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rondas.rows.map((row, rowIndex) => {
              const teamCol = getTeamColumn(rondas.headers);
              const teamName = String(row[teamCol]?.v || '');
              return (
                <tr key={rowIndex} className="border-b border-[#141414]/10 hover:bg-[#141414]/5 transition-colors">
                  {rondasHeaders.map((header, colIndex) => {
                    const isTeamCol = header === teamCol;
                    const cellValue = displayValue(row[header]);
                    
                    // Check if it's a year column (e.g., 2026-27) and the value doesn't match the teamName
                    const isYearCol = /^\d{4}-\d{2}$/.test(header);
                    const isTraded = isYearCol && cellValue && cellValue.toLowerCase() !== teamName.toLowerCase() && cellValue !== '-';

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
  };

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
          onClick={() => {
            setSelectedTeam(teamName);
            setCurrentView('salarios');
            setSearchTerm('');
            setIsMenuOpen(false);
          }}
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

  const renderMainTable = () => {
    if (currentView === 'lottery' || currentView === 'draft2026' || currentView === 'rondas') return null;
    if (currentView === 'trade' && tradeTeamA && tradeTeamB) return null;

    return (
      <>
        {isDetailView && (
          <button 
            onClick={() => {
              setSelectedTeam(null);
              setSearchTerm('');
            }}
            className="mb-6 flex items-center gap-2 text-sm font-mono uppercase tracking-wider hover:opacity-70 transition-opacity"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a los equipos
          </button>
        )}
        <div className="overflow-x-auto border border-[#141414]">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-[#141414] bg-[#141414]/5">
                {headersToDisplay.map((header, i) => (
                  <th key={i} className="p-3 text-left font-mono uppercase tracking-wider text-[11px] opacity-70 whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredRows.map((row, rowIndex) => {
                  const rowTeamName = !isDetailView ? String(row[getTeamColumn(currentSheet!.headers)]?.v || '') : '';
                  const isSelectedInTrade = currentView === 'trade' && (rowTeamName === tradeTeamA || rowTeamName === tradeTeamB);
                  
                  const contractCol = getContractColumn(currentSheet!.headers);
                  const contractType = contractCol ? String(row[contractCol]?.v || '').toLowerCase() : '';
                  const isHighlightedContract = contractType.includes('rookie') || contractType.includes('extension') || contractType.includes('extensión') || contractType.includes('d-league') || contractType.includes('dleague');
                  
                  let lastTwoYearCols: string[] = [];
                  if (isHighlightedContract) {
                    const yearCols = headersToDisplay.filter(h => /^\d{4}-\d{2}$/.test(h) && row[h]?.v !== undefined && row[h]?.v !== null && String(row[h]?.v).trim() !== '');
                    lastTwoYearCols = yearCols.slice(-2);
                  }
                  
                  return (
                    <motion.tr 
                      key={rowIndex}
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => handleRowClick(row)}
                      className={`border-b border-[#141414]/10 transition-colors ${
                        isSelectedInTrade 
                          ? 'bg-[#141414] text-[#E4E3E0]' 
                          : !isDetailView 
                            ? 'cursor-pointer hover:bg-[#141414] hover:text-[#E4E3E0]' 
                            : 'hover:bg-[#141414]/5'
                      }`}
                    >
                      {headersToDisplay.map((header, colIndex) => {
                        const isTeamCol = !isDetailView && header === getTeamColumn(currentSheet!.headers);
                        const isPlayerCol = isDetailView && header === getPlayerColumn(currentSheet!.headers);
                        const isContractCol = header === contractCol;
                        const isBonoCol = header.toLowerCase().includes('bono');
                        const isHighlightedYear = lastTwoYearCols.includes(header);
                        
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
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={headersToDisplay.length} className="p-10 text-center opacity-50 font-serif italic">
                    Sin datos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <ImageContext.Provider value={imageMaps}>
      <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
        {/* Sidebar Overlay */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 bg-[#141414]/20 backdrop-blur-sm z-40"
                onClick={() => setIsMenuOpen(false)}
              />
              <motion.div 
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', bounce: 0, duration: 0.4 }}
                className="fixed top-0 right-0 bottom-0 w-80 bg-[#E4E3E0] border-l border-[#141414] z-50 flex flex-col"
              >
                <div className="p-6 border-b border-[#141414] flex justify-between items-center">
                  <span className="font-serif italic text-xl">Menú</span>
                  <button onClick={() => setIsMenuOpen(false)} className="hover:opacity-70"><X className="w-6 h-6" /></button>
                </div>
                <div className="p-6 flex flex-col gap-6 flex-grow overflow-hidden">
                  <div className="relative shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-40" />
                    <input 
                      type="text" 
                      placeholder="Buscar jugador..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-transparent border border-[#141414] py-2 pl-10 pr-4 focus:outline-none focus:bg-[#141414] focus:text-[#E4E3E0] transition-colors placeholder:text-[#141414]/30"
                    />
                  </div>
                  {searchTerm ? (
                    <div className="flex flex-col gap-3 overflow-y-auto flex-grow pr-2">
                      {renderSearchResults()}
                    </div>
                  ) : (
                    <nav className="flex flex-col gap-2 shrink-0">
                      <button onClick={() => { setCurrentView('salarios'); setSelectedTeam(null); setIsMenuOpen(false); }} className={`text-left px-4 py-3 font-mono uppercase tracking-widest text-sm border border-[#141414] transition-colors ${currentView === 'salarios' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/10'}`}>Salarios & Equipos</button>
                      <button onClick={() => { setCurrentView('lottery'); setIsMenuOpen(false); }} className={`text-left px-4 py-3 font-mono uppercase tracking-widest text-sm border border-[#141414] transition-colors ${currentView === 'lottery' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/10'}`}>Lottery 2026</button>
                      <button onClick={() => { setCurrentView('draft2026'); setIsMenuOpen(false); }} className={`text-left px-4 py-3 font-mono uppercase tracking-widest text-sm border border-[#141414] transition-colors ${currentView === 'draft2026' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/10'}`}>DRAFT 2026</button>
                      <button onClick={() => { setCurrentView('rondas'); setIsMenuOpen(false); }} className={`text-left px-4 py-3 font-mono uppercase tracking-widest text-sm border border-[#141414] transition-colors ${currentView === 'rondas' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/10'}`}>RONDAS</button>
                      <button onClick={() => { setCurrentView('trade'); setSelectedTeam(null); setIsMenuOpen(false); }} className={`text-left px-4 py-3 font-mono uppercase tracking-widest text-sm border border-[#141414] transition-colors ${currentView === 'trade' ? 'bg-[#141414] text-[#E4E3E0]' : 'hover:bg-[#141414]/10'}`}>Simulador de traspasos</button>
                    </nav>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

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
              {currentView === 'trade' ? 'Simulador de traspasos' : 
               currentView === 'lottery' ? 'Lottery 2026' : 
               currentView === 'draft2026' ? 'DRAFT 2026' : 
               currentView === 'rondas' ? 'RONDAS' : 
               (isDetailView ? selectedTeam : 'Salarios Equipos')}
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
              {currentView === 'trade' && renderTradeMachine()}
              {currentView === 'lottery' && renderLottery()}
              {currentView === 'draft2026' && renderDraft2026()}
              {currentView === 'rondas' && renderRondas()}
              {(currentView === 'salarios' || (currentView === 'trade' && (!tradeTeamA || !tradeTeamB))) && renderMainTable()}
            </>
          )}
        </main>
      </div>
    </ImageContext.Provider>
  );
}
