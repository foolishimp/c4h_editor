// file: minimal-test/shell/src/App.tsx
import React, { lazy, Suspense, useState } from 'react';
import Shell from './Shell';

// Lazy load the remote component
const RemoteForm = lazy(() => import('form/SimpleForm'));

const App: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleButtonClick = () => {
    setError(null);
    setShowForm(true);
  };

  return (
    <Shell>
      <h1>Shell Application</h1>
      <p>This is the main shell that will load the form microfrontend.</p>
      
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={handleButtonClick}
          style={{ 
            padding: '10px 20px', 
            background: '#4a90e2', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Load Form Component
        </button>
      </div>
      
      {showForm && (
        <div style={{ marginTop: '30px', padding: '20px', border: '1px solid #ddd', borderRadius: '4px' }}>
          <h2>Remote Form:</h2>
          <Suspense fallback={<div>Loading form component...</div>}>
            <ErrorBoundary onError={setError}>
              <RemoteForm />
            </ErrorBoundary>
          </Suspense>
        </div>
      )}
      
      {error && (
        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#ffebee', borderRadius: '4px', color: '#c62828' }}>
          <h3>Error Loading Form:</h3>
          <p>{error.message}</p>
          <details>
            <summary>Technical Details</summary>
            <pre>{error.stack}</pre>
          </details>
          <div>
            <p>
              <strong>Debug Steps:</strong>
            </p>
            <ol>
              <li>Check if form application is running on port 3001</li>
              <li>Visit <a href="http://localhost:3001/remoteEntry.js" target="_blank" rel="noopener noreferrer">http://localhost:3001/remoteEntry.js</a> directly to check if it returns JavaScript</li>
              <li>Check browser console for CORS errors</li>
            </ol>
          </div>
        </div>
      )}
    </Shell>
  );
};

// Simple error boundary component
interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError: (error: Error) => void;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, { hasError: boolean }> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export default App;
