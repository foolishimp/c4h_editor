// File: frontend/src/App.tsx

// Use JSX without explicitly importing React
import { PromptLibrary } from './components/PromptLibrary/PromptLibrary';
import './index.css';

function App() {
  return (
    <div className="container">
      <header className="p-3 mb-4">
        <h1>C4H Prompt Editor</h1>
        <p className="mb-3">Edit and manage prompt templates with version control</p>
      </header>
      <main>
        <PromptLibrary />
      </main>
    </div>
  );
}

export default App;