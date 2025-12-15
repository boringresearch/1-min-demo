
export type AppStep = 'idle' | 'recording' | 'processing' | 'result' | 'preview';

export interface AppState {
  sourceMode: 'text' | 'github';
  sourceCode: string;
  githubUrl: string;
  githubToken: string; // Optional for rate limits
  requirements: string; // Used for "Director's Voiceover"
  modelName: string;
  musicEnabled: boolean; // Background music in generated demo
  textDescriptionEnabled: boolean; // On-screen text descriptions/captions
}

export interface GenerationState {
  outline: string;
  isOutlineComplete: boolean;
  generatedCode: string;
  isCodeComplete: boolean;
  finalHtml: string | null;
  error: string | null;
  fixAttemptCount: number;
  // Expanded stages for the interactive terminal flow
  stage: 'idle' | 'generating_outline' | 'waiting_confirmation' | 'editing_outline' | 'generating_code' | 'complete';
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

export const DEFAULT_MODEL = 'gemini-3-pro-preview'; // High speed/quality balance
