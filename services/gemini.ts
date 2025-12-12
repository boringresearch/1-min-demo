import { GoogleGenAI } from "@google/genai";

export class GeminiService {
  private client: GoogleGenAI;
  private modelName: string;

  constructor(modelName: string) {
    // API Key must be obtained from process.env.API_KEY in the AI Studio environment
    const apiKey = process.env.API_KEY || '';
    this.client = new GoogleGenAI({ apiKey });
    this.modelName = modelName;
  }

  async generateOutlineStream(
    sourceCode: string,
    requirements: string,
    onChunk: (text: string) => void,
    signal?: AbortSignal,
    previousContent?: string,
    musicEnabled: boolean = true
  ): Promise<string> {
    const prompt = (await import('./prompts')).STAGE_1_PROMPT(sourceCode, requirements, musicEnabled);
    const systemInstruction = (await import('./prompts')).SYSTEM_PROMPT_TEMPLATE;

    let fullText = previousContent || "";

    try {
      // We use a chat session to allow for continuation if needed
      let history: { role: string; parts: { text: string }[] }[] = [];
      
      let messageToSend = prompt;

      if (previousContent) {
        // If continuing, we reconstruct the history
        history = [
          { role: 'user', parts: [{ text: prompt }] },
          { role: 'model', parts: [{ text: previousContent }] }
        ];
        messageToSend = "Please continue generating the response from exactly where you left off. Do not repeat the last sentence.";
      }

      const chat = this.client.chats.create({
        model: this.modelName,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
          maxOutputTokens: 65536,
        },
        history: history as any
      });

      const response = await chat.sendMessageStream({ message: messageToSend });

      for await (const chunk of response) {
        if (signal?.aborted) {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          throw err;
        }
        const text = chunk.text;
        if (text) {
          fullText += text;
          onChunk(text);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Generation stopped by user');
        throw error;
      }
      console.error("Gemini Outline Error:", error);
      throw error;
    }

    return fullText;
  }

  async generateCodeStream(
    history: { role: string; parts: { text: string }[] }[],
    onChunk: (text: string) => void,
    signal?: AbortSignal,
    previousContent?: string,
    musicEnabled: boolean = true
  ): Promise<string> {
    const prompt = (await import('./prompts')).STAGE_2_PROMPT(musicEnabled);
    const systemInstruction = (await import('./prompts')).SYSTEM_PROMPT_TEMPLATE;
    
    // Deep copy history to avoid mutating the original array when adding continuation parts
    let validHistory = history.map(h => ({
        role: h.role,
        parts: h.parts.map(p => ({ text: p.text }))
    }));

    let messageToSend = prompt;

    if (previousContent) {
       // If continuing, assume the last "User" message (prompt) was sent, 
       // and we need to add the partial model response to history
       // Then send a "continue" message
       validHistory.push({ role: 'user', parts: [{ text: prompt }] });
       validHistory.push({ role: 'model', parts: [{ text: previousContent }] });
       messageToSend = "Please continue generating the code from exactly where you stopped. Return the rest of the code.";
    }

    let fullText = previousContent || "";

    try {
      const chat = this.client.chats.create({
        model: this.modelName,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.4, // Lower temperature for code
          maxOutputTokens: 65536,
        },
        history: validHistory as any
      });

      const response = await chat.sendMessageStream({ message: messageToSend });

      for await (const chunk of response) {
        if (signal?.aborted) {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          throw err;
        }
        const text = chunk.text; // Access text directly
        if (text) {
          fullText += text;
          onChunk(text);
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
         console.log('Generation stopped by user');
         throw error;
      }
      console.error("Gemini Code Error:", error);
      throw error;
    }

    return fullText;
  }
}