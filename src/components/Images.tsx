import { createContext, memo, useContext, useMemo, useState } from 'react';

/**
 * Logos und Spielerbilder.
 *
 * Diese Komponenten liegen bewusst AUSSERHALB von App.tsx: Waeren sie innerhalb von App
 * definiert, wuerde React sie bei jedem Re-Render (z.B. bei jedem Buchstaben in der Suche)
 * als neue Komponenten behandeln und alle Bilder neu aufbauen und neu laden.
 */

export interface ImageMaps {
  teamLogos: Record<string, string>;
  playerImages: Record<string, string>;
}

export const ImageContext = createContext<ImageMaps>({ teamLogos: {}, playerImages: {} });

export function getTeamLogo(teamLogos: Record<string, string>, teamName: string | null): string | null {
  if (!teamName) return null;
  const normalizedName = teamName.trim().toLowerCase();
  
  // Special case for the Fantasy League logo
  if (normalizedName === 'fantasy nba liga' || normalizedName === 'asturfantasy nba') {
    return 'https://lh3.googleusercontent.com/d/1eBiYE1DEOIdUYZdLglN3PcTUeo_pUj86';
  }
  
  // 1. Try exact match (case-insensitive)
  const exactMatch = Object.keys(teamLogos).find(k => k.toLowerCase() === normalizedName);
  let logo = exactMatch ? teamLogos[exactMatch] : null;
  
  // 2. Try partial match if no exact match
  if (!logo) {
    const partialMatch = Object.keys(teamLogos).find(k => 
      normalizedName.includes(k.toLowerCase()) || k.toLowerCase().includes(normalizedName)
    );
    if (partialMatch) logo = teamLogos[partialMatch];
  }
  
  if (logo) {
    // If it's a Drive URL, try to make it direct
    if (logo.includes('drive.google.com')) {
      const idMatch = logo.match(/id=([^&]+)/) || logo.match(/\/d\/([^/]+)/);
      const id = idMatch ? idMatch[1] : null;
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    } else if (!logo.startsWith('http') && logo.length > 20) {
      // Assume it's a raw Google Drive ID
      return `https://lh3.googleusercontent.com/d/${logo}`;
    }
    return logo;
  }
  
  // Fallback to standard NBA logos
  const nbaTeams: Record<string, string> = {
    'Lakers': '1610612747',
    'Celtics': '1610612738',
    'Warriors': '1610612744',
    'Bulls': '1610612741',
    'Heat': '1610612748',
    'Knicks': '1610612752',
    'Nets': '1610612751',
    'Bucks': '1610612749',
    'Suns': '1610612756',
    '76ers': '1610612755',
    'Mavericks': '1610612742',
    'Nuggets': '1610612743',
    'Clippers': '1610612746',
    'Grizzlies': '1610612763',
    'Timberwolves': '1610612750',
    'Pelicans': '1610612740',
    'Hawks': '1610612737',
    'Hornets': '1610612766',
    'Cavaliers': '1610612739',
    'Pistons': '1610612765',
    'Pacers': '1610612754',
    'Magic': '1610612753',
    'Raptors': '1610612761',
    'Wizards': '1610612764',
    'Rockets': '1610612745',
    'Spurs': '1610612759',
    'Thunder': '1610612760',
    'Jazz': '1610612762',
    'Kings': '1610612758',
    'Trail Blazers': '1610612757'
  };
  
  const teamKey = Object.keys(nbaTeams).find(key => normalizedName.includes(key.toLowerCase()));
  if (teamKey) {
    return `https://cdn.nba.com/logos/nba/${nbaTeams[teamKey]}/global/L/logo.svg`;
  }
  
  return null;
}

export function getPlayerImage(playerImages: Record<string, string>, playerName: string | null): string | null {
  if (!playerName) return null;
  const normalizedName = playerName.trim().toLowerCase();
  
  // 1. Try exact match (case-insensitive)
  const exactMatch = Object.keys(playerImages).find(k => k.toLowerCase() === normalizedName);
  let logo = exactMatch ? playerImages[exactMatch] : null;
  
  // 2. Try partial match if no exact match
  if (!logo) {
    const partialMatch = Object.keys(playerImages).find(k => 
      normalizedName.includes(k.toLowerCase()) || k.toLowerCase().includes(normalizedName)
    );
    if (partialMatch) logo = playerImages[partialMatch];
  }
  
  if (logo) {
    // If it's a Drive URL, try to make it direct
    if (logo.includes('drive.google.com')) {
      const idMatch = logo.match(/id=([^&]+)/) || logo.match(/\/d\/([^/]+)/);
      const id = idMatch ? idMatch[1] : null;
      if (id) return `https://lh3.googleusercontent.com/d/${id}`;
    } else if (!logo.startsWith('http') && logo.length > 20) {
      // Assume it's a raw Google Drive ID
      return `https://lh3.googleusercontent.com/d/${logo}`;
    }
    return logo;
  }
  
  return null;
}

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-8 h-8 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-16 h-16 md:w-24 md:h-24 text-2xl',
  lg: 'w-16 h-16 md:w-24 md:h-24 text-2xl'
};

export const PlayerImage = memo(function PlayerImage({ name, size = 'sm' }: { name: string; size?: AvatarSize }) {
  const { playerImages } = useContext(ImageContext);
  const imageUrl = useMemo(() => getPlayerImage(playerImages, name), [playerImages, name]);
  // Fehler wird pro URL gemerkt: kommt nach einem Sync eine neue URL, wird es neu versucht.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!imageUrl || failedUrl === imageUrl) {
    return (
      <div className={`${sizeClasses[size]} rounded-full border border-ink bg-ink text-paper flex items-center justify-center font-display font-bold shrink-0`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden border border-ink bg-white flex items-center justify-center shrink-0`}>
      <img
        src={imageUrl}
        alt={name}
        loading="lazy"
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(imageUrl)}
      />
    </div>
  );
});

export const TeamLogo = memo(function TeamLogo({
  name,
  size = 'md',
  noBackground = false
}: {
  name: string;
  size?: AvatarSize;
  noBackground?: boolean;
}) {
  const { teamLogos } = useContext(ImageContext);
  const logoUrl = useMemo(() => getTeamLogo(teamLogos, name), [teamLogos, name]);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!logoUrl || failedUrl === logoUrl) {
    return (
      <div className={`${sizeClasses[size]} rounded-full border border-ink bg-ink text-paper flex items-center justify-center font-display font-bold shrink-0`}>
        {name.charAt(0).toUpperCase()}
      </div>
    );
  }

  if (noBackground) {
    return (
      <div className={`${sizeClasses[size]} flex items-center justify-center shrink-0`}>
        <img
          src={logoUrl}
          alt={name}
          className="w-full h-full object-contain"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(logoUrl)}
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClasses[size]} rounded-full overflow-hidden border border-ink bg-white flex items-center justify-center shrink-0`}>
      <img
        src={logoUrl}
        alt={name}
        className="w-full h-full object-cover"
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(logoUrl)}
      />
    </div>
  );
});
