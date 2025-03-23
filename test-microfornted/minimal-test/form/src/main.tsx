// file: minimal-test/form/src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import SimpleForm from './SimpleForm'

// Log to confirm the app is bootstrapping
console.log('Form app bootstrapping...');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div style={{ padding: '20px', maxWidth: '500px', margin: '0 auto' }}>
      <h1>Test Form App</h1>
      <p>This is the standalone form app. Below is the form component that will be exposed to the shell:</p>
      <div style={{ marginTop: '20px', padding: '20px', border: '1px solid #ccc', borderRadius: '4px' }}>
        <SimpleForm />
      </div>
    </div>
  </React.StrictMode>,
)
