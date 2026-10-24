import React from 'react';
import { LenderInfo } from '../types/loan';
import { 
  Building2, 
  CreditCard, 
  Smartphone, 
  Car, 
  HelpCircle, 
  User, 
  ShieldCheck,
  Coins
} from 'lucide-react';

interface LenderIconProps {
  lender: LenderInfo;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showBadge?: boolean;
  className?: string;
}

export const LenderIcon: React.FC<LenderIconProps> = ({
  lender,
  size = 'md',
  showBadge = false,
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7 text-xs rounded-lg',
    md: 'w-10 h-10 text-sm rounded-xl',
    lg: 'w-12 h-12 text-base rounded-2xl',
    xl: 'w-16 h-16 text-lg rounded-2xl',
  };

  const iconSizes = {
    sm: 14,
    md: 20,
    lg: 24,
    xl: 32,
  };

  const currentIconSize = iconSizes[size];

  // Render stylized SVG brand icon depending on logoType
  const renderBrandIcon = () => {
    switch (lender.logoType) {
      case 'kbank':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full p-1" fill="none">
            <rect width="40" height="40" rx="10" fill="#138F2D" />
            <path d="M12 28V12H16.5V19.5L24 12H29.5L20.5 20.5L30 28H24.5L16.5 21.5V28H12Z" fill="#FFFFFF" />
          </svg>
        );

      case 'scb':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full p-1" fill="none">
            <rect width="40" height="40" rx="10" fill="#4E2A84" />
            <path d="M20 9L27 15L24 23L20 20L16 23L13 15L20 9Z" fill="#F4B400" />
            <path d="M20 20L25 31H15L20 20Z" fill="#FFFFFF" />
          </svg>
        );

      case 'bbl':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full p-1" fill="none">
            <rect width="40" height="40" rx="10" fill="#1E3F8A" />
            <path d="M20 8L29 17L20 26L11 17L20 8Z" fill="#F37021" />
            <path d="M20 17L29 26L20 35L11 26L20 17Z" fill="#FFFFFF" />
          </svg>
        );

      case 'ktb':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full p-1" fill="none">
            <rect width="40" height="40" rx="10" fill="#00A4E4" />
            <path d="M10 24C15 15 25 15 30 24C25 21 15 21 10 24Z" fill="#FFFFFF" />
            <path d="M15 14C17 11 23 11 25 14C23 16 17 16 15 14Z" fill="#FFFFFF" />
          </svg>
        );

      case 'bay':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full p-1" fill="none">
            <rect width="40" height="40" rx="10" fill="#FEC424" />
            <path d="M20 8L28 16V28H12V16L20 8Z" fill="#423300" />
            <rect x="17" y="20" width="6" height="8" fill="#FEC424" />
          </svg>
        );

      case 'ttb':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full p-1" fill="none">
            <rect width="40" height="40" rx="10" fill="#002D62" />
            <text x="20" y="26" textAnchor="middle" fill="#FFFFFF" fontSize="13" fontWeight="bold" fontFamily="sans-serif">ttb</text>
            <circle cx="31" cy="14" r="3" fill="#F37021" />
          </svg>
        );

      case 'gsb':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full p-1" fill="none">
            <rect width="40" height="40" rx="10" fill="#EC068D" />
            <circle cx="20" cy="20" r="9" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
            <circle cx="20" cy="20" r="4" fill="#FFFFFF" />
          </svg>
        );

      case 'linebk':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full p-1" fill="none">
            <rect width="40" height="40" rx="10" fill="#00C300" />
            <path d="M20 10C13.9 10 9 14.1 9 19.2C9 22.4 10.9 25.2 14 26.7L13 30.5L17.5 28.2C18.3 28.3 19.1 28.4 20 28.4C26.1 28.4 31 24.3 31 19.2C31 14.1 26.1 10 20 10Z" fill="#FFFFFF" />
            <text x="20" y="22" textAnchor="middle" fill="#00C300" fontSize="9" fontWeight="bold">BK</text>
          </svg>
        );

      case 'finnix':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full p-1" fill="none">
            <rect width="40" height="40" rx="10" fill="#582C83" />
            <path d="M12 14L20 8L28 14L24 28L16 28L12 14Z" fill="#F3A812" />
            <path d="M16 16L20 12L24 16L22 24L18 24L16 16Z" fill="#FFFFFF" />
          </svg>
        );

      case 'moneythunder':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full p-1" fill="none">
            <rect width="40" height="40" rx="10" fill="#FF6F00" />
            <path d="M22 8L12 21H19L16 32L28 17H21L22 8Z" fill="#FFFFFF" />
          </svg>
        );

      case 'spaylater':
      case 'seasycash':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full p-1" fill="none">
            <rect width="40" height="40" rx="10" fill="#EE4D2D" />
            <path d="M15 15C15 12.2 17.2 10 20 10C22.8 10 25 12.2 25 15V16H15V15Z" stroke="#FFFFFF" strokeWidth="2.5" fill="none" />
            <rect x="11" y="15" width="18" height="15" rx="3" fill="#FFFFFF" />
            <path d="M20 20C18.5 20 17 21 17 22.5C17 25 23 24 23 26.5C23 27.5 21.5 28 20 28C18.5 28 17 27 17 27" stroke="#EE4D2D" strokeWidth="2" strokeLinecap="round" fill="none" />
          </svg>
        );

      case 'lazada':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full p-1" fill="none">
            <rect width="40" height="40" rx="10" fill="#0F156D" />
            <path d="M20 28L12 20C10 18 10 14 13 12C16 10 19 12 20 14C21 12 24 10 27 12C30 14 30 18 28 20L20 28Z" fill="#FF007A" />
            <path d="M20 25L14 19C13 18 13 15 15 14C17 13 19 14 20 16L20 25Z" fill="#00D2D3" />
          </svg>
        );

      case 'truemoney':
        return (
          <svg viewBox="0 0 40 40" className="w-full h-full p-1" fill="none">
            <rect width="40" height="40" rx="10" fill="#FF5C00" />
            <circle cx="20" cy="20" r="10" stroke="#FFFFFF" strokeWidth="3" fill="none" />
            <path d="M16 16H24M20 16V25" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );

      case 'ktc':
      case 'firstchoice':
      case 'cardx':
      case 'aeon':
      case 'umayplus':
      case 'promise':
      case 'amoney':
        return (
          <div 
            className="w-full h-full flex flex-col items-center justify-center font-bold text-white shadow-sm"
            style={{ backgroundColor: lender.primaryColor, borderRadius: 'inherit' }}
          >
            <CreditCard size={currentIconSize * 0.75} className="mb-0.5 opacity-90" />
            <span className="text-[9px] uppercase tracking-tighter leading-none">{lender.badgeText}</span>
          </div>
        );

      case 'tidlor':
      case 'srisawad':
      case 'mtc':
      case 'somwang':
        return (
          <div 
            className="w-full h-full flex flex-col items-center justify-center font-bold text-white shadow-sm"
            style={{ backgroundColor: lender.primaryColor, borderRadius: 'inherit' }}
          >
            <Car size={currentIconSize * 0.75} className="mb-0.5 opacity-90" />
            <span className="text-[9px] uppercase tracking-tighter leading-none truncate max-w-[90%]">{lender.badgeText}</span>
          </div>
        );

      default:
        // Generic fallback by category
        return (
          <div 
            className="w-full h-full flex items-center justify-center text-white font-bold shadow-sm"
            style={{ backgroundColor: lender.primaryColor || '#4A5568', borderRadius: 'inherit' }}
          >
            {lender.category === 'BANK' && <Building2 size={currentIconSize} />}
            {lender.category === 'DIGITAL_LOAN' && <Smartphone size={currentIconSize} />}
            {lender.category === 'CREDIT_CARD' && <CreditCard size={currentIconSize} />}
            {lender.category === 'AUTO_TITLE' && <Car size={currentIconSize} />}
            {lender.category === 'OTHER' && <User size={currentIconSize} />}
          </div>
        );
    }
  };

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${sizeClasses[size]} ${className}`}>
      <div className="w-full h-full overflow-hidden shadow-sm" style={{ borderRadius: 'inherit' }}>
        {renderBrandIcon()}
      </div>

      {showBadge && (
        <span 
          className="absolute -bottom-1 -right-1 px-1 py-0.2 text-[8px] font-bold rounded shadow-sm border border-white"
          style={{ 
            backgroundColor: lender.primaryColor, 
            color: lender.textColor || '#ffffff' 
          }}
        >
          {lender.badgeText}
        </span>
      )}
    </div>
  );
};
