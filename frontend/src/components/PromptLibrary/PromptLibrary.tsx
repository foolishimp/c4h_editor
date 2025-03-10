// File: frontend/src/components/PromptLibrary/PromptLibrary.tsx

import { useState, useEffect } from 'react';
import { Prompt } from '../../types/prompt';
import PromptEditor from '../PromptEditor/PromptEditor';
import TimeAgo from '../common/TimeAgo';
import { usePromptApi } from '../../hooks/usePromptApi';

export const PromptLibrary: React.FC = () => {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<Prompt | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPromptId, setNewPromptId] = useState('');
  const [newPromptDesc, setNewPromptDesc] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { 
    getPrompts, 
    getPrompt, 
    createPrompt, 
    updatePrompt, 
    testPrompt, 
    getPromptHistory
  } = usePromptApi();

  // Add missing getPromptVersion function since it's used by PromptEditor
  const getPromptVersion = async (promptId: string, version: string): Promise<Prompt> => {
    // Call getPrompt with version parameter
    return getPrompt(promptId, version);
  };

  useEffect(() => {
    // Fetch prompts on component mount
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    setLoading(true);
    try {
      const data = await getPrompts();
      setPrompts(data);
      setError(null);
    } catch (err) {
      setError('Failed to load prompts. Please try again.');
      console.error('Error fetching prompts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPrompt = async (promptId: string) => {
    try {
      const prompt = await getPrompt(promptId);
      setSelectedPrompt(prompt);
      setError(null);
    } catch (err) {
      setError(`Failed to load prompt ${promptId}.`);
      console.error('Error fetching prompt:', err);
    }
  };

  const handleCreatePrompt = async () => {
    if (!newPromptId) {
      setError('Prompt ID is required');
      return;
    }

    try {
      // Create basic prompt template
      const newPrompt = {
        id: newPromptId,
        template: {
          text: "# Prompt Template\n\nYour prompt content here...",
          parameters: [],
          config: {
            temperature: 0.7,
            max_tokens: 1000,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
            stop_sequences: []
          }
        },
        metadata: {
          author: "User",
          description: newPromptDesc || "",
          tags: [],
          version: "1.0.0",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        commit_message: "Initial creation",
        author: "User"
      };

      await createPrompt(newPrompt);
      await fetchPrompts();
      setShowCreateForm(false);
      setNewPromptId('');
      setNewPromptDesc('');
      setError(null);
      
      // Select the newly created prompt
      const createdPrompt = await getPrompt(newPromptId);
      setSelectedPrompt(createdPrompt);
    } catch (err) {
      setError('Failed to create prompt. Please check if the ID already exists.');
      console.error('Error creating prompt:', err);
    }
  };

  // Adapter function for updatePrompt to match PromptEditor's expected signature
  const handleUpdatePrompt = async (prompt: Prompt): Promise<void> => {
    try {
      // Assuming updatePrompt expects id and data separately
      await updatePrompt(prompt.id, {
        template: prompt.template,
        metadata: prompt.metadata,
        commit_message: "Updated via editor",
        author: prompt.metadata.author || "User"
      });
      await fetchPrompts();
      setError(null);
    } catch (err) {
      setError('Failed to update prompt.');
      console.error('Error updating prompt:', err);
      throw err; // Re-throw for the PromptEditor to handle
    }
  };

  // Adapter function for onSave to match PromptEditor's expected signature
  const handleSavePrompt = async (prompt: Prompt): Promise<void> => {
    return handleUpdatePrompt(prompt);
  };

  return (
    <div className="card">
      <div className="grid grid-2">
        {/* Left sidebar */}
        <div className="prompt-list p-3" style={{ maxHeight: '80vh', overflowY: 'auto' }}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="card-title">Prompts</h3>
            <button 
              className="btn-primary" 
              onClick={() => setShowCreateForm(!showCreateForm)}
            >
              {showCreateForm ? 'Cancel' : 'New Prompt'}
            </button>
          </div>

          {/* Create form */}
          {showCreateForm && (
            <div className="card mb-4 p-3">
              <h4 className="mb-3">Create New Prompt</h4>
              
              <div className="mb-3">
                <label htmlFor="newPromptId">ID (required)</label>
                <input
                  id="newPromptId"
                  value={newPromptId}
                  onChange={(e) => setNewPromptId(e.target.value)}
                  placeholder="e.g., my-prompt-001"
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="mb-3">
                <label htmlFor="newPromptDesc">Description</label>
                <input
                  id="newPromptDesc"
                  value={newPromptDesc}
                  onChange={(e) => setNewPromptDesc(e.target.value)}
                  placeholder="Brief description"
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <button 
                className="btn-success w-full"
                onClick={handleCreatePrompt}
              >
                Create Prompt
              </button>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="p-3 mb-3 bg-red-100 border border-red-300 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Prompts list */}
          {loading ? (
            <p>Loading prompts...</p>
          ) : prompts.length === 0 ? (
            <p>No prompts found. Create your first prompt!</p>
          ) : (
            <div>
              {prompts.map((prompt) => (
                <div 
                  key={prompt.id}
                  className={`card mb-2 p-3 cursor-pointer ${selectedPrompt?.id === prompt.id ? 'border-blue-500 bg-blue-50' : ''}`}
                  onClick={() => handleSelectPrompt(prompt.id)}
                >
                  <div className="font-bold">{prompt.id}</div>
                  <div className="text-gray-700">{prompt.title || 'Untitled'}</div>
                  <div className="text-sm text-gray-500 mt-1">
                    <div>Version: {prompt.version}</div>
                    <div>By: {prompt.author}</div>
                    <div>Updated: <TimeAgo date={prompt.updated_at} /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right side - editor */}
        <div className="p-3">
          <PromptEditor
            prompt={selectedPrompt}
            onSave={handleSavePrompt}
            onUpdate={handleUpdatePrompt}
            onTest={testPrompt}
            onGetHistory={getPromptHistory}
            onGetVersion={getPromptVersion}
          />
        </div>
      </div>
    </div>
  );
};

export default PromptLibrary;