import React from 'react';
import { Check, AlertTriangle, Cloud, Bell, Info } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'SUCCESS' | 'WARNING' | 'INFO' | 'SYNC';
  title: string;
  message: string;
  timestamp: number;
}

interface NotificationToastHubProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const NotificationToastHub: React.FC<NotificationToastHubProps> = ({
  toasts,
  onDismiss,
}) => {
  if (toasts.length === 0) return null;

  // Single active toast (latest one only, no stacking)
  const toast = toasts[0];

  let icon = <Info className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />;
  let iconBg = 'bg-amber-500/20 text-amber-300';
  let badgeColor = 'text-amber-400';

  if (toast.type === 'SUCCESS') {
    icon = <Check className="w-3.5 h-3.5 text-emerald-400 stroke-[2.5]" />;
    iconBg = 'bg-emerald-500/20 text-emerald-300';
    badgeColor = 'text-emerald-400';
  } else if (toast.type === 'WARNING') {
    icon = <AlertTriangle className="w-3.5 h-3.5 text-rose-400 stroke-[2.5]" />;
    iconBg = 'bg-rose-500/20 text-rose-300';
    badgeColor = 'text-rose-400';
  } else if (toast.type === 'SYNC') {
    icon = <Cloud className="w-3.5 h-3.5 text-blue-400 stroke-[2.5]" />;
    iconBg = 'bg-blue-500/20 text-blue-300';
    badgeColor = 'text-blue-400';
  }

  // Combine title and message into a concise single-line string
  const displayText = toast.message 
    ? `${toast.title}: ${toast.message}`
    : toast.title;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none flex justify-center w-full max-w-lg px-4">
      <div
        key={toast.id}
        onClick={() => onDismiss(toast.id)}
        className="pointer-events-auto inline-flex items-center gap-2.5 px-4 py-2 rounded-full shadow-2xl backdrop-blur-xl border border-white/20 dark:border-stone-700/80 bg-stone-900/90 dark:bg-stone-950/95 text-stone-100 text-xs font-semibold select-none transition-all anim-pill hover:scale-105 active:scale-95 cursor-pointer max-w-full"
      >
        <div className={`p-1 rounded-full ${iconBg} shrink-0`}>
          {icon}
        </div>
        <span className="truncate max-w-[260px] sm:max-w-[360px] tracking-tight">
          {displayText}
        </span>
      </div>
    </div>
  );
};
