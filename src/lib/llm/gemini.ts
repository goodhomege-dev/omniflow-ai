import { GoogleGenAI } from '@google/genai';
import { LlmProvider, LlmMessage } from './types';

export class GeminiProvider implements LlmProvider {
  name = 'gemini';
  private client: GoogleGenAI;
  private model: string;

  constructor(apiKey: string, model = 'gemini-2.5-flash') {
    this.client = new GoogleGenAI({ apiKey });
    this.model = model;
  }

  async generateText(systemPrompt: string, messages: LlmMessage[]): Promise<string> {
    const formattedContents = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const response = await this.client.models.generateContent({
      model: this.model,
      contents: formattedContents,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.2,
      },
    });

    return response.text || '';
  }

  async analyzeImage(imageBytes: Uint8Array, mimeType: string, prompt: string): Promise<string> {
    const base64Data = Buffer.from(imageBytes).toString('base64');
    const response = await this.client.models.generateContent({
      model: this.model,
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
          ],
        },
      ],
      config: {
        temperature: 0.1,
      },
    });

    return response.text || '';
  }
}
