import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught React ErrorBoundary error:', error, errorInfo);
  }

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#070a10] text-slate-100 flex items-center justify-center p-6 font-sans">
          <div className="max-w-md w-full bg-[#0d131f] border border-rose-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(244,63,94,0.25)] flex flex-col gap-4 text-center">
            <div className="w-12 h-12 rounded-full bg-rose-500/20 border border-rose-500/50 flex items-center justify-center mx-auto text-rose-400">
              <AlertTriangle className="w-6 h-6 animate-pulse" />
            </div>

            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-extrabold text-white">Application State Reset Required</h2>
              <p className="text-xs text-slate-300">
                A transient rendering error occurred. Click below to clear cached session state and resume operation.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#04060a] p-3 rounded-xl border border-[#1e293b] text-left text-[11px] font-mono text-rose-300 max-h-28 overflow-y-auto break-all">
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Clear Cache &amp; Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
