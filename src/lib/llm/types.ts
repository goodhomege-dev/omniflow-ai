export interface LlmMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LlmProvider {
  name: string;
  generateText(systemPrompt: string, messages: LlmMessage[]): Promise<string>;
  analyzeImage(imageBytes: Uint8Array, mimeType: string, prompt: string): Promise<string>;
}
