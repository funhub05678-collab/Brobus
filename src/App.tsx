import React, { Component, ErrorInfo, ReactNode } from 'react';
import { LedgerProvider, useLedger } from './context/LedgerContext';
import { LoginView } from './components/LoginView';
import { WorkspaceShell } from './components/WorkspaceShell';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

class AppErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error.message || 'An unexpected application error occurred.',
    };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-6 space-y-3">
            <h1 className="text-lg font-bold text-slate-900">
              Something went wrong
            </h1>
            <p className="text-xs text-slate-600 break-words font-mono bg-slate-50 p-3 rounded-lg border border-slate-200">
              {this.state.errorMessage}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-10 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppContent() {
  const { authReady, firebaseUser, userProfile } = useLedger();

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-sm font-medium text-slate-500">
          Connecting to workspace...
        </div>
      </div>
    );
  }

  if (!firebaseUser || !userProfile) {
    return <LoginView />;
  }

  return <WorkspaceShell />;
}

export default function App() {
  return (
    <AppErrorBoundary>
      <LedgerProvider>
        <AppContent />
      </LedgerProvider>
    </AppErrorBoundary>
  );
}
