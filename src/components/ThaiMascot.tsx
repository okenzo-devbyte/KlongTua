import React, { useState, useEffect } from 'react';
import { MascotGreetingType, buildMascotGreetingSpeech, speakMascotGreeting } from '../services/thaiVoiceService';
import { ThaiVoiceConfig } from '../types/loan';
import { Sparkles, Heart } from 'lucide-react';

interface ThaiMascotProps {
  type: MascotGreetingType;
  size?: number;
  className?: string;
  showBubbleOnClick?: boolean;
  voiceConfig?: ThaiVoiceConfig;
  lowSpecMode?: boolean;
  triggerTimestamp?: number; // Allows parent KPI card click to trigger speech
  onTap?: () => void;
}

export const ThaiMascot: React.FC<ThaiMascotProps> = ({
  type,
  size = 60,
  className = '',
  showBubbleOnClick = true,
  voiceConfig,
  lowSpecMode = false,
  triggerTimestamp,
  onTap,
}) => {
  const [bubbleText, setBubbleText] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  // Trigger speech function
  const triggerGreeting = () => {
    const config = voiceConfig || {
      enabled: true,
      privacyMode: false,
      politeParticle: 'KA',
      chimeStyle: 'ENTERPRISE',
      speechRate: 1.0,
      volume: 1.0,
      speakOnDueReminder: true,
      speakOnMarkPaid: true,
      speakOnShortfallAlert: true,
      mascotGreetingEnabled: true,
    };

    const text = buildMascotGreetingSpeech(type, config);
    setBubbleText(text);
    setIsSpeaking(true);
    setIsBouncing(true);

    setTimeout(() => setIsBouncing(false), 600);

    if (config.mascotGreetingEnabled) {
      speakMascotGreeting(type, config, false).catch(() => {});
    }
  };

  // Listen to parent triggerTimestamp changes
  useEffect(() => {
    if (triggerTimestamp && triggerTimestamp > 0) {
      triggerGreeting();
    }
  }, [triggerTimestamp]);

  // Bubble auto-dismiss timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (bubbleText) {
      timer = setTimeout(() => {
        setBubbleText(null);
        setIsSpeaking(false);
      }, 4200);
    }
    return () => clearTimeout(timer);
  }, [bubbleText]);

  const handleMascotClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTap) onTap();
    triggerGreeting();
  };

  return (
    <div 
      className={`relative inline-flex items-center justify-center cursor-pointer select-none group ${className}`}
      onClick={handleMascotClick}
      title="แตะที่ตัวน้องต้นหอม หรือแตะที่การ์ดเพื่อฟังเสียงสดใสเป็นกันเอง"
    >
      {/* Pop-up Speech Bubble */}
      {showBubbleOnClick && bubbleText && (
        <div className={`absolute bottom-full mb-2.5 left-1/2 -translate-x-1/2 z-40 w-52 sm:w-64 p-3 rounded-2xl bg-white dark:bg-stone-900 border-2 border-amber-500/80 dark:border-amber-400 shadow-2xl text-xs text-stone-800 dark:text-stone-100 anim-bubble pointer-events-none ${lowSpecMode ? '' : 'backdrop-blur-md'}`}>
          <div className="flex items-center justify-between gap-1.5 mb-1.5 font-extrabold text-amber-700 dark:text-amber-400 text-[11px]">
            <div className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-500" />
              <span>น้องต้นหอม (หนูน้อยชิบิ) บอกว่า:</span>
            </div>
            <Heart className="w-3 h-3 text-rose-500 fill-rose-500 animate-pulse" />
          </div>
          <p className="leading-relaxed font-medium text-stone-700 dark:text-stone-200">{bubbleText}</p>
          {/* Bubble Pointer */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-amber-500/80 dark:border-t-amber-400" />
        </div>
      )}

      {/* SVG Chibi Nong Kanok Mascot */}
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 64 68" 
        className={`transition-all duration-300 transform group-hover:scale-110 active:scale-90 ${
          isBouncing ? 'animate-bounce' : ''
        } ${isSpeaking ? 'anim-sparkle' : ''}`}
      >
        <defs>
          {/* Gold Kanok Flame Ornament */}
          <linearGradient id="goldKanokGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#B45309" />
          </linearGradient>

          {/* Rosy Cheek Blush Filter */}
          <radialGradient id="cheekBlush" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FB7185" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FB7185" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ================= POSTURE 1: WAVING (AVAILABLE FUNDS) ================= */}
        {type === 'WAVING' && (
          <g>
            {/* Chibi Body with Traditional Sash & Pencil Texture */}
            <path 
              d="M20,44 C20,38 44,38 44,44 L48,62 C48,65 16,65 16,62 Z" 
              fill="currentColor" 
              fillOpacity="0.08" 
              stroke="currentColor" 
              strokeWidth="1.8" 
              strokeLinejoin="round" 
            />
            {/* Golden Belt / Sash */}
            <path d="M18,54 Q32,58 46,54" fill="none" stroke="url(#goldKanokGrad)" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M22,46 Q32,49 42,46" fill="none" stroke="currentColor" strokeWidth="0.8" strokeDasharray="1 2" opacity="0.6" />

            {/* Left Hand on Hip / Resting */}
            <path d="M20,45 Q14,50 17,54" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="17" cy="54" r="2.2" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.2" />

            {/* Right Arm Enthusiastically Waving */}
            <g className={lowSpecMode ? '' : 'anim-wave-arm'}>
              <path d="M44,43 Q56,36 54,22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              {/* Chubby Waving Palm with Cute Fingers */}
              <circle cx="54" cy="21" r="3.4" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.4" />
              <path d="M52,19 Q54,16 56,18" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              {/* Little Floating Gold Sparkles */}
              <circle cx="58" cy="14" r="1.2" fill="#F59E0B" />
              <circle cx="61" cy="22" r="1" fill="#FBBF24" />
            </g>

            {/* Chubby Round Chibi Head */}
            <circle cx="32" cy="27" r="16" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.8" />

            {/* Hair: Traditional Thai Topknot (มวยผมจุก) */}
            <circle cx="32" cy="12" r="6.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.6" />
            {/* Golden Kanok Flame Hairpin (ปิ่นทองลายกนก) */}
            <path 
              d="M32,10 C30,4 32,1 35,3 C38,5 35,8 32,10 Z" 
              fill="url(#goldKanokGrad)" 
              stroke="#D97706" 
              strokeWidth="1.2" 
              strokeLinejoin="round" 
            />
            <circle cx="32" cy="11" r="2.2" fill="#F59E0B" />

            {/* Rosy Pencil Blush Cheeks */}
            <circle cx="21" cy="30" r="3.5" fill="url(#cheekBlush)" />
            <circle cx="43" cy="30" r="3.5" fill="url(#cheekBlush)" />

            {/* Big Sparkling Anime/Chibi Eyes */}
            <ellipse cx="25" cy="26" rx="3.2" ry="4" fill="currentColor" />
            <circle cx="24" cy="24.5" r="1.4" fill="#FFFFFF" />
            <circle cx="26.5" cy="27.5" r="0.7" fill="#FFFFFF" />
            <ellipse cx="39" cy="26" rx="3.2" ry="4" fill="currentColor" />
            <circle cx="38" cy="24.5" r="1.4" fill="#FFFFFF" />
            <circle cx="40.5" cy="27.5" r="0.7" fill="#FFFFFF" />

            {/* Sweet Eyebrows */}
            <path d="M22,20 Q25,18 28,20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            <path d="M36,20 Q39,18 42,20" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />

            {/* Sweet Childish Smile */}
            <path d="M29,31 Q32,35 35,31" fill="none" stroke="#E11D48" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        )}

        {/* ================= POSTURE 2: PLANNING / BUDGET (TOTAL DUE) ================= */}
        {type === 'PLANNING' && (
          <g>
            {/* Body */}
            <path 
              d="M20,44 C20,38 44,38 44,44 L48,62 C48,65 16,65 16,62 Z" 
              fill="currentColor" 
              fillOpacity="0.08" 
              stroke="currentColor" 
              strokeWidth="1.8" 
              strokeLinejoin="round" 
            />
            {/* Royal Indigo/Gold Belt */}
            <path d="M18,54 Q32,58 46,54" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M22,46 Q32,49 42,46" fill="none" stroke="url(#goldKanokGrad)" strokeWidth="1.4" strokeLinecap="round" />

            {/* Left Hand Holding Golden Calculator / Abacus */}
            <g>
              {/* Mini Calculator Device */}
              <rect x="10" y="42" width="16" height="20" rx="3" fill="#1E293B" stroke="url(#goldKanokGrad)" strokeWidth="1.5" />
              {/* LCD Screen */}
              <rect x="12" y="44" width="12" height="4.5" rx="1" fill="#10B981" fillOpacity="0.85" />
              <text x="14" y="47.5" fontSize="3" fontWeight="bold" fill="#064E3B" fontFamily="monospace">123</text>
              {/* Calculator Buttons */}
              <circle cx="14" cy="51" r="1.2" fill="#F59E0B" />
              <circle cx="18" cy="51" r="1.2" fill="#94A3B8" />
              <circle cx="22" cy="51" r="1.2" fill="#94A3B8" />
              <circle cx="14" cy="55" r="1.2" fill="#94A3B8" />
              <circle cx="18" cy="55" r="1.2" fill="#94A3B8" />
              <circle cx="22" cy="55" r="1.2" fill="#3B82F6" />
              <circle cx="18" cy="59" r="1.2" fill="#10B981" />
            </g>

            {/* Right Arm Pointing / Calculating Gesture */}
            <g className={lowSpecMode ? '' : 'anim-nod'}>
              <path d="M44,45 Q52,38 48,28" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
              <circle cx="48" cy="27" r="2.8" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.2" />
              {/* Pointing index finger */}
              <path d="M48,27 L51,23" fill="none" stroke="#F59E0B" strokeWidth="1.6" strokeLinecap="round" />
              {/* Calculation Sparkle */}
              <path d="M54,19 L56,15 M52,17 L58,17" stroke="#3B82F6" strokeWidth="1.2" strokeLinecap="round" />
            </g>

            {/* Head with Focused Nod */}
            <circle cx="32" cy="27" r="16" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.8" />

            {/* Hair & Topknot with Blue-Gold Accent */}
            <circle cx="32" cy="12" r="6.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.6" />
            <path d="M32,10 C30,4 32,1 35,3 C38,5 35,8 32,10 Z" fill="url(#goldKanokGrad)" stroke="#1D4ED8" strokeWidth="1.2" />
            <circle cx="32" cy="11" r="2.2" fill="#3B82F6" />

            {/* Rosy Cheeks */}
            <circle cx="21" cy="30" r="3.5" fill="url(#cheekBlush)" />
            <circle cx="43" cy="30" r="3.5" fill="url(#cheekBlush)" />

            {/* Smart Sparkling Eyes with Determined Sparkle */}
            <ellipse cx="25" cy="26" rx="3.2" ry="3.8" fill="currentColor" />
            <circle cx="24" cy="24.5" r="1.3" fill="#FFFFFF" />
            <circle cx="26.5" cy="27" r="0.6" fill="#38BDF8" />
            <ellipse cx="39" cy="26" rx="3.2" ry="3.8" fill="currentColor" />
            <circle cx="38" cy="24.5" r="1.3" fill="#FFFFFF" />
            <circle cx="40.5" cy="27" r="0.6" fill="#38BDF8" />

            {/* Confident Planner Smile */}
            <path d="M29,32 Q32,36 35,32" fill="none" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" />
          </g>
        )}

        {/* ================= POSTURE 2: SUCCESS CELEBRATION (TOTAL PAID) ================= */}
        {type === 'SUCCESS' && (
          <g>
            {/* Body */}
            <path 
              d="M20,44 C20,38 44,38 44,44 L48,62 C48,65 16,65 16,62 Z" 
              fill="currentColor" 
              fillOpacity="0.08" 
              stroke="currentColor" 
              strokeWidth="1.8" 
            />
            {/* Emerald/Green Belt */}
            <path d="M18,54 Q32,58 46,54" fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />

            {/* Double V Arms Cheering Upwards */}
            <g className={lowSpecMode ? '' : 'anim-bounce'}>
              {/* Left V Arm */}
              <path d="M20,43 Q10,32 12,20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="12" cy="19" r="3.2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.4" />
              {/* Peace V Fingers */}
              <path d="M9,15 L12,19 L15,14" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" />

              {/* Right V Arm */}
              <path d="M44,43 Q54,32 52,20" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
              <circle cx="52" cy="19" r="3.2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.4" />
              {/* Peace V Fingers */}
              <path d="M49,14 L52,19 L55,15" fill="none" stroke="#059669" strokeWidth="1.8" strokeLinecap="round" />
            </g>

            {/* Head */}
            <circle cx="32" cy="27" r="16" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.8" />

            {/* Hair & Green Topknot Flame */}
            <circle cx="32" cy="12" r="6.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.6" />
            <path d="M32,10 C30,4 32,1 35,3 C38,5 35,8 32,10 Z" fill="#10B981" stroke="#059669" strokeWidth="1.2" />
            <circle cx="32" cy="11" r="2.2" fill="#10B981" />

            {/* Big Rosy Cheeks */}
            <circle cx="21" cy="30" r="3.8" fill="url(#cheekBlush)" />
            <circle cx="43" cy="30" r="3.8" fill="url(#cheekBlush)" />

            {/* Joyful Happy Wink Eyes (⌒ ⌒) */}
            <path d="M22,25 Q25,21 28,25" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M36,25 Q39,21 42,25" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />

            {/* Big Cheerful Laugh Mouth */}
            <path d="M28,30 Q32,38 36,30 Z" fill="#F43F5E" stroke="currentColor" strokeWidth="1.2" />
          </g>
        )}

        {/* ================= POSTURE 3: CHECKING PENCIL (REMAINING DUE) ================= */}
        {type === 'CHECKING' && (
          <g>
            {/* Body */}
            <path 
              d="M20,44 C20,38 44,38 44,44 L48,62 C48,65 16,65 16,62 Z" 
              fill="currentColor" 
              fillOpacity="0.08" 
              stroke="currentColor" 
              strokeWidth="1.8" 
            />

            {/* Head with Playful Nodding Tilt */}
            <g className={lowSpecMode ? '' : 'anim-nod'}>
              <circle cx="32" cy="27" r="16" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.8" />
              {/* Topknot */}
              <circle cx="32" cy="12" r="6.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.6" />
              <path d="M32,10 C30,4 32,1 35,3 C38,5 35,8 32,10 Z" fill="url(#goldKanokGrad)" stroke="#D97706" strokeWidth="1.2" />
              <circle cx="32" cy="11" r="2.2" fill="#F59E0B" />

              {/* Eyes looking studious */}
              <ellipse cx="26" cy="26" rx="2.8" ry="3.6" fill="currentColor" />
              <circle cx="25" cy="25" r="1.2" fill="#FFFFFF" />
              <ellipse cx="38" cy="26" rx="2.8" ry="3.6" fill="currentColor" />
              <circle cx="37" cy="25" r="1.2" fill="#FFFFFF" />

              {/* Soft Cheeks */}
              <circle cx="22" cy="30" r="3.2" fill="url(#cheekBlush)" />
              <circle cx="42" cy="30" r="3.2" fill="url(#cheekBlush)" />

              {/* Curious Child Smile */}
              <path d="M30,32 Q32,34 34,32" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </g>

            {/* Golden Pencil in Hand */}
            <path d="M42,46 L56,26" stroke="url(#goldKanokGrad)" strokeWidth="3.8" strokeLinecap="round" />
            <polygon points="56,26 60,20 62,25" fill="#1C1917" />
            {/* Checklist Notebook Pad */}
            <rect x="11" y="44" width="14" height="17" rx="3" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.4" />
            <line x1="14" y1="49" x2="22" y2="49" stroke="#10B981" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="14" y1="54" x2="20" y2="54" stroke="#F59E0B" strokeWidth="1.4" strokeLinecap="round" />
          </g>
        )}

        {/* ================= POSTURE 4: ALERT WATCHDOG (OVERDUE & SHORTFALL) ================= */}
        {type === 'ALERT' && (
          <g>
            {/* Body */}
            <path 
              d="M20,44 C20,38 44,38 44,44 L48,62 C48,65 16,65 16,62 Z" 
              fill="currentColor" 
              fillOpacity="0.08" 
              stroke="currentColor" 
              strokeWidth="1.8" 
            />
            {/* Red Alert Sash */}
            <path d="M18,54 Q32,58 46,54" fill="none" stroke="#E11D48" strokeWidth="2.5" strokeLinecap="round" />

            {/* Head */}
            <circle cx="32" cy="27" r="16" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1.8" />

            {/* Red Alert Topknot Flame */}
            <circle cx="32" cy="12" r="6.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.6" />
            <path d="M32,10 C30,4 32,1 35,3 C38,5 35,8 32,10 Z" fill="#E11D48" stroke="#BE123C" strokeWidth="1.2" />
            <circle cx="32" cy="11" r="2.2" fill="#E11D48" />

            {/* Surprised Large Puppy Eyes */}
            <ellipse cx="25" cy="25" rx="3.6" ry="4.4" fill="currentColor" />
            <circle cx="24" cy="23.5" r="1.6" fill="#FFFFFF" />
            <circle cx="26.5" cy="26.5" r="0.8" fill="#FFFFFF" />

            <ellipse cx="39" cy="25" rx="3.6" ry="4.4" fill="currentColor" />
            <circle cx="38" cy="23.5" r="1.6" fill="#FFFFFF" />
            <circle cx="40.5" cy="26.5" r="0.8" fill="#FFFFFF" />

            {/* Surprised 'O' Mouth */}
            <ellipse cx="32" cy="33" rx="2" ry="2.6" fill="none" stroke="#E11D48" strokeWidth="1.6" />

            {/* Hands to Chubby Cheeks (Surprised Gesture) */}
            <path d="M19,45 Q17,35 21,33" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="21" cy="33" r="2.6" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2" />

            <path d="M45,45 Q47,35 43,33" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="43" cy="33" r="2.6" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2" />
          </g>
        )}
      </svg>
    </div>
  );
};
