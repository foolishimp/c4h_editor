import React from 'react';
// Try default import instead of named import
import PromptLibrary from './components/PromptLibrary/PromptLibrary';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <h1>C4H Prompt Editor</h1>
      </header>
      <main>
        <PromptLibrary />
      </main>
    </div>
  );
}

export default App;
