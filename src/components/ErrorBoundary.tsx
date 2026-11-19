import React from 'react';
import { AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { generateBackupPayload, buildBackupFileName } from '../services/gmailBackupService';
import { shareFile } from '../services/native/files';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'เกิดข้อผิดพลาดที่ไม่คาดคิดในระบบ',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('[KlongTua ErrorBoundary]', error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  handleEmergencyExport = async (): Promise<void> => {
    try {
      const payload = generateBackupPayload();
      await shareFile({
        fileName: buildBackupFileName(),
        contents: JSON.stringify(payload, null, 2),
        mimeType: 'application/json',
        title: 'สำรองข้อมูลฉุกเฉิน คล่องตัว',
      });
    } catch {
      // ignore
    }
  };

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF8F5] dark:bg-slate-950 p-6">
        <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl p-6 text-center space-y-5">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-extrabold text-slate-900 dark:text-white">
              ขออภัย ระบบพบข้อผิดพลาดชั่วคราว
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              ข้อมูลหนี้สินของคุณยังปลอดภัยอยู่ในเครื่อง สามารถกดโหลดแอปใหม่ หรือสำรองข้อมูลฉุกเฉินเก็บไว้ได้ทันที
            </p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/80 text-left text-[11px] font-mono text-slate-600 dark:text-slate-300 break-words max-h-24 overflow-y-auto">
            {this.state.errorMessage}
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={this.handleReload}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-bold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              โหลดแอปใหม่
            </button>
            <button
              type="button"
              onClick={this.handleEmergencyExport}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold transition-colors"
            >
              <Download className="w-4 h-4" />
              สำรองข้อมูลฉุกเฉิน
            </button>
          </div>
        </div>
      </div>
    );
  }
}
