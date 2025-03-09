// File: frontend/src/types/prompt.ts

export interface ParameterType {
  STRING: 'string';
  NUMBER: 'number';
  BOOLEAN: 'boolean';
  ARRAY: 'array';
  OBJECT: 'object';
}

export interface PromptParameter {
  name: string;
  type: string;
  description?: string;
  default?: any;
  required: boolean;
}

export interface PromptMetadata {
  author: string;
  created_at: string;
  updated_at: string;
  description?: string;
  tags: string[];
  target_model?: string;
  version: string;
}

export interface PromptConfig {
  temperature: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop_sequences: string[];
}

export interface PromptTemplate {
  text: string;
  parameters: PromptParameter[];
  config: PromptConfig;
}

export interface Prompt {
  id: string;
  template: PromptTemplate;
  metadata: PromptMetadata;
  parent_id?: string;
  lineage: string[];
}

// Add the missing PromptListItem interface
export interface PromptListItem {
  id: string;
  version: string;
  title: string;
  author: string;
  updated_at: string;
  last_commit: string;
  last_commit_message: string;
}

export interface PromptVersion {
  prompt_id: string;
  version: string;
  commit_hash: string;
  created_at: string;
  author: string;
  message: string;
  prompt: Prompt;
}

export interface PromptTestCase {
  name: string;
  parameters: Record<string, any>;
  expected_output?: string;
  metadata: Record<string, any>;
}

export interface PromptTestResponse {
  prompt_id: string;
  rendered_prompt: string;
  parameters: Record<string, any>;
  model_response?: string;
  test_results?: Array<Record<string, any>>;
  execution_time: number;
  timestamp: string;
}