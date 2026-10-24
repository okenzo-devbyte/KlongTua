import React from 'react';

interface ThaiPencilBackdropProps {
  intensity?: number; // 10 to 60 (represents percentage)
  isDark?: boolean;
}

export const ThaiPencilBackdrop: React.FC<ThaiPencilBackdropProps> = ({
  intensity = 35,
  isDark = false,
}) => {
  const opacityVal = Math.max(0.08, Math.min(0.65, intensity / 100));

  return (
    <div 
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden select-none transition-opacity duration-300"
      style={{ opacity: opacityVal }}
      aria-hidden="true"
    >
      {/* Top Right Kanok Flame Sketch */}
      <div className={`absolute -top-16 -right-16 w-96 h-96 transform rotate-12 scale-125 transition-colors duration-300 ${isDark ? 'text-amber-400/40' : 'text-stone-700/30'}`}>
        <svg viewBox="0 0 120 120" className="w-full h-full">
          {/* Main pencil outline */}
          <path 
            d="M0,80 C15,65 35,50 40,25 C45,0 25,12 15,22 C30,8 55,-5 65,15 C75,35 60,60 50,70 C65,55 80,45 85,25 C90,5 75,18 68,26 C82,12 105,8 115,30 C125,55 100,85 80,100 C60,115 30,120 0,120 Z" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.8" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
          {/* Internal pencil shading hatchings */}
          <path 
            d="M12,75 Q25,60 32,45 M18,85 Q35,70 42,52 M25,95 Q45,80 52,62 M35,105 Q55,90 65,75 M48,112 Q68,98 78,85 M65,115 Q82,102 92,92" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="0.9" 
            strokeLinecap="round" 
            strokeDasharray="1 2" 
          />
        </svg>
      </div>

      {/* Bottom Left Kanok Flame Sketch (Flipped) */}
      <div className={`absolute -bottom-20 -left-20 w-80 h-80 transform -rotate-45 scale-110 transition-colors duration-300 ${isDark ? 'text-amber-400/30' : 'text-stone-700/25'}`}>
        <svg viewBox="0 0 120 120" className="w-full h-full transform scale-x-[-1]">
          <path 
            d="M0,80 C15,65 35,50 40,25 C45,0 25,12 15,22 C30,8 55,-5 65,15 C75,35 60,60 50,70 C65,55 80,45 85,25 C90,5 75,18 68,26 C82,12 105,8 115,30 C125,55 100,85 80,100 C60,115 30,120 0,120 Z" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="1.6" 
            strokeLinecap="round" 
          />
          <path 
            d="M12,75 Q25,60 32,45 M18,85 Q35,70 42,52 M25,95 Q45,80 52,62 M35,105 Q55,90 65,75" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="0.8" 
            strokeLinecap="round" 
            strokeDasharray="1 2" 
          />
        </svg>
      </div>

      {/* Subtle Central Prajam-Yam Rosette Watermark */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 pointer-events-none transition-colors duration-300 ${isDark ? 'text-stone-500/10' : 'text-stone-400/15'}`}>
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="14" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="2 3" />
          <path d="M50,15 C45,35 35,45 15,50 C35,55 45,65 50,85 C55,65 65,55 85,50 C65,45 55,35 50,15 Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
          <circle cx="50" cy="50" r="4" fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      </div>
    </div>
  );
};
