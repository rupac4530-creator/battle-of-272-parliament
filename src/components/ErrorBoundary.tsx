import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Last-resort screen so a render error shows a message and a Reload button
 * instead of a blank page. Inline styles only, so it still reads if the
 * stylesheet is what failed. Errors thrown in event handlers or the game loop
 * are not caught here (React does not route those through error boundaries).
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Battle of 272 crashed while rendering:', error, info.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        role="alert"
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          padding: 24,
          background: '#040906',
          color: '#f4efe0',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <h1 style={{ margin: 0, fontSize: 28 }}>Something broke.</h1>
        <p style={{ margin: 0, fontSize: 16, maxWidth: 420 }}>
          The House has been adjourned by an unexpected error. Reload to try again.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            minWidth: 160,
            minHeight: 48,
            padding: '0 24px',
            fontSize: 18,
            fontWeight: 700,
            color: '#040906',
            background: '#ffd700',
            border: 'none',
            borderRadius: 8,
            cursor: 'pointer',
          }}
        >
          Reload
        </button>
        <details style={{ maxWidth: 560, fontSize: 13, opacity: 0.8 }}>
          <summary style={{ cursor: 'pointer' }}>Technical details</summary>
          <pre style={{ whiteSpace: 'pre-wrap', textAlign: 'left' }}>{String(error.stack || error.message)}</pre>
        </details>
      </div>
    );
  }
}
