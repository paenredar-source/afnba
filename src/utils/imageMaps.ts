import { ParsedSheet } from '../types';
import { getPlayerColumn, getTeamColumn } from './sheet';

/**
 * Baut aus den Sheet-Tabs die Zuordnung Team -> Logo und Spieler -> Foto.
 * Reihenfolge: 1. Tab LOGOS, 2. Logo-Spalte in SALARIOS EQUIPOS, 3. Bild-Spalte in EQUIPOS (nur Spielerfotos).
 */
export function buildImageMaps(
  salariosData: ParsedSheet,
  equiposData: ParsedSheet | null,
  logosData: ParsedSheet | null
): { logos: Record<string, string>; players: Record<string, string> } {
  const logos: Record<string, string> = {};
  const players: Record<string, string> = {};
  const teamCol = getTeamColumn(salariosData.headers);

  // 1. Logos und Spielerbilder aus dem eigenen LOGOS-Tab (bevorzugt)
  if (logosData) {
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

  // 2. Fallback: Logos direkt in SALARIOS EQUIPOS
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

  // 3. Spielerbilder direkt in der EQUIPOS-Tabelle
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
          // URL oder Google-Drive-ID
          if (imgStr.startsWith('http') || imgStr.length > 20) {
            players[playerStr] = imgStr;
          }
        }
      });
    }
  }

  return { logos, players };
}
