// File: frontend/src/components/PromptEditor/PromptEditor.tsx

import { useState, useEffect } from 'react';
import { Prompt } from '../../types/prompt';
// Fix import statements to use default imports
import MetadataPanel from './MetadataPanel';
import ParameterPanel from './ParameterPanel';

// Define the component props interface
interface PromptEditorProps {
  prompt: Prompt | null;
  onSave: (prompt: Prompt) => Promise<void>; // Keep for compatibility
  onUpdate: (prompt: Prompt) => Promise<void>;
  onTest: (promptId: string, parameters: Record<string, any>) => Promise<any>;
  onGetHistory: (promptId: string) => Promise<any>;
  onGetVersion: (promptId: string, version: string) => Promise<Prompt>;
}

export const PromptEditor: React.FC<PromptEditorProps> = ({
  prompt,
  onUpdate,
  onTest,
  onGetHistory,
  onGetVersion,
}) => {
  const [editedPrompt, setEditedPrompt] = useState<Prompt | null>(null);
  const [promptText, setPromptText] = useState('');
  const [activeTab, setActiveTab] = useState('editor');

  useEffect(() => {
    if (prompt) {
      setEditedPrompt(prompt);
      setPromptText(prompt.template.text);
    }
  }, [prompt]);

  if (!editedPrompt) {
    return (
      <div className="p-4">
        <h2>Select or create a prompt</h2>
      </div>
    );
  }

  const handleSave = async () => {
    if (!editedPrompt) return;

    const updatedPrompt = {
      ...editedPrompt,
      template: {
        ...editedPrompt.template,
        text: promptText,
      },
    };

    try {
      await onUpdate(updatedPrompt);
      setEditedPrompt(updatedPrompt);
    } catch (error) {
      console.error('Failed to save prompt:', error);
      // Handle error (show error message)
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPromptText(e.target.value);
  };

  const handleMetadataChange = (metadata: any) => {
    if (!editedPrompt) return;

    setEditedPrompt({
      ...editedPrompt,
      metadata: {
        ...editedPrompt.metadata,
        ...metadata,
      },
    });
  };

  const handleParameterChange = (parameters: any[]) => {
    if (!editedPrompt) return;

    setEditedPrompt({
      ...editedPrompt,
      template: {
        ...editedPrompt.template,
        parameters,
      },
    });
  };

  const handleConfigChange = (config: any) => {
    if (!editedPrompt) return;

    setEditedPrompt({
      ...editedPrompt,
      template: {
        ...editedPrompt.template,
        config,
      },
    });
  };

  return (
    <div className="prompt-editor card">
      <div className="flex justify-between items-center mb-4">
        <h2>{editedPrompt.id} - {editedPrompt.metadata.description || 'Untitled'}</h2>
        <div className="button-group">
          <button className="btn-primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>

      <div className="tabs">
        <div 
          className={`tab ${activeTab === 'editor' ? 'active' : ''}`}
          onClick={() => setActiveTab('editor')}
        >
          Editor
        </div>
        <div 
          className={`tab ${activeTab === 'versions' ? 'active' : ''}`}
          onClick={() => setActiveTab('versions')}
        >
          Versions
        </div>
        <div 
          className={`tab ${activeTab === 'test' ? 'active' : ''}`}
          onClick={() => setActiveTab('test')}
        >
          Test
        </div>
      </div>

      {activeTab === 'editor' && (
        <>
          <div className="grid grid-2 mb-4">
            <div>
              <label htmlFor="promptText" className="mb-2">Prompt Template</label>
              <textarea
                id="promptText"
                value={promptText}
                onChange={handleTextChange}
                rows={15}
                className="w-full p-3 border rounded"
                style={{ minHeight: "300px" }}
              />
            </div>
            <div className="flex flex-col">
              <div className="card p-3 mb-3">
                <h4>Parameters</h4>
                <ParameterPanel
                  parameters={editedPrompt.template.parameters}
                  onChange={handleParameterChange}
                />
                
                <div className="mt-3">
                  <h5 className="mb-2">Model Configuration</h5>
                  <div className="grid grid-2 gap-2">
                    <div>
                      <label htmlFor="temperature">Temperature</label>
                      <input
                        type="number"
                        id="temperature"
                        value={editedPrompt.template.config.temperature}
                        onChange={(e) => handleConfigChange({
                          ...editedPrompt.template.config,
                          temperature: parseFloat(e.target.value)
                        })}
                        step="0.1"
                        min="0"
                        max="1"
                      />
                    </div>
                    <div>
                      <label htmlFor="maxTokens">Max Tokens</label>
                      <input
                        type="number"
                        id="maxTokens"
                        value={editedPrompt.template.config.max_tokens}
                        onChange={(e) => handleConfigChange({
                          ...editedPrompt.template.config,
                          max_tokens: parseInt(e.target.value)
                        })}
                        min="1"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="card p-3">
                <h4>Metadata</h4>
                <MetadataPanel
                  metadata={editedPrompt.metadata}
                  onChange={handleMetadataChange}
                />
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'versions' && (
        // Assuming VersionControl takes different props than previously defined
        <div className="card p-3">
          <h4>Version History</h4>
          {/* Replace with your actual VersionControl implementation */}
          <div>
            Version control component would go here.
            <button 
              className="btn-primary mt-3" 
              onClick={() => onGetHistory(editedPrompt.id)}
            >
              Load History
            </button>
          </div>
        </div>
      )}

      {activeTab === 'test' && (
        // Assuming TestRunner takes different props than previously defined
        <div className="card p-3">
          <h4>Test Prompt</h4>
          {/* Replace with your actual TestRunner implementation */}
          <div>
            <p>Test with the following parameters:</p>
            <div className="mt-3">
              <button 
                className="btn-primary" 
                onClick={() => onTest(editedPrompt.id, {})}
              >
                Run Test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PromptEditor;