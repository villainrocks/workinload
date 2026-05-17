/* This code fixed By Tg:@ImxCodex */
import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * ErrorBoundary — catches render-time JS errors and shows a recovery UI.
 * Wrap the entire app or individual route sections with this.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-[#0d0f14] flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
            <AlertTriangle size={36} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100 mb-3">Something went wrong</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-2">
            An unexpected error occurred in the application.
          </p>
          {this.state.error?.message && (
            <p className="text-xs text-slate-700 font-mono bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 mb-6 text-left break-all">
              {this.state.error.message}
            </p>
          )}
          <button
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700
              text-white text-sm font-medium transition-all shadow-lg shadow-blue-900/30"
          >
            <RefreshCw size={14} /> Reload Application
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
