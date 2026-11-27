import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * AirWish Telemetry Error Boundary
 * Prevents unexpected rendering crashes from breaking the entire safety dashboard.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log telemetry rendering errors without crashing the main thread
    console.error('[AirWish ErrorBoundary caught an exception]:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="rounded-2xl border border-red-500/40 bg-[#160B12] p-6 text-center space-y-4 shadow-xl"
        >
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/20 text-red-400">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-display text-lg font-bold text-[#F8FAFC]">
              {this.props.fallbackTitle || 'Telemetry View Fault Intercepted'}
            </h3>
            <p className="mt-1 text-xs text-[#94A3B8] max-w-md mx-auto">
              AirWish safety guard prevented a rendering disruption. Your indoor purifiers and background calculations remain active.
            </p>
            {this.state.error?.message && (
              <p className="mt-2 text-[11px] font-mono text-red-300/80 bg-red-950/40 px-3 py-1.5 rounded-lg max-w-lg mx-auto overflow-x-auto">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-500/20 border border-red-500/50 px-4 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/30 transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Reset View Component</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
