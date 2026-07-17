import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0f172a', color: 'white', textAlign: 'center' }}>
          <h2>Oops, there was an error loading the game.</h2>
          <p style={{ color: '#94a3b8', marginBottom: '20px' }}>This can happen if the app was updated recently.</p>
          <button 
            onClick={async () => {
              try {
                if ('serviceWorker' in navigator) {
                  const regs = await navigator.serviceWorker.getRegistrations();
                  for (const r of regs) await r.unregister();
                }
                if ('caches' in window) {
                  const keys = await caches.keys();
                  for (const k of keys) await caches.delete(k);
                }
              } catch (e) {
                console.error(e);
              }
              window.location.href = window.location.origin + window.location.pathname + '?t=' + Date.now();
            }}
            style={{ padding: '10px 20px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Clear Cache & Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
