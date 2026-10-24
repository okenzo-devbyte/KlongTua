import React, { useCallback, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAndroidBack } from '../hooks/useAndroidBack';

interface AdaptiveDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  footerActions?: React.ReactNode;
  maxWidthClass?: string;
}

export const AdaptiveDetailSheet: React.FC<AdaptiveDetailSheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  badge,
  children,
  footerActions,
  maxWidthClass = 'max-w-xl',
}) => {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleBack = useCallback(() => {
    onClose();
    return true;
  }, [onClose]);
  useAndroidBack(handleBack, isOpen);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
      {/* Click outside to dismiss backdrop */}
      <div 
        className="fixed inset-0 -z-10" 
        onClick={onClose} 
        aria-hidden="true" 
      />

      {/* Main Drawer Sheet (Bottom sheet on mobile, centered modal on tablet/desktop) */}
      <div 
        className={`w-full ${maxWidthClass} rounded-t-[32px] sm:rounded-3xl max-h-[90vh] flex flex-col bg-white dark:bg-stone-900 border-t sm:border border-stone-200 dark:border-stone-800 shadow-2xl text-stone-900 dark:text-stone-100 overflow-hidden animate-in slide-in-from-bottom-6 sm:zoom-in-95 duration-250`}
      >
        {/* Mobile Swipe Grab Handle Indicator */}
        <div className="pt-2.5 pb-1 sm:hidden flex justify-center">
          <div className="w-12 h-1.5 rounded-full bg-stone-300 dark:bg-stone-700" />
        </div>

        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            {icon && <div className="shrink-0">{icon}</div>}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 truncate">
                  {title}
                </h3>
                {badge}
              </div>
              {subtitle && (
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors shrink-0"
            title="ปิดหน้าต่าง"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body Content */}
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {children}
        </div>

        {/* Footer Actions (Optional) */}
        {footerActions && (
          <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50/80 dark:bg-stone-950/60 shrink-0">
            {footerActions}
          </div>
        )}
      </div>
    </div>
  );
};
