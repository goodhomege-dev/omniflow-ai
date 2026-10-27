import OpenAI from 'openai';
import { LlmProvider, LlmMessage } from './types';

export class OpenAiProvider implements LlmProvider {
  name = 'openai';
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model = 'gpt-4o') {
    this.client = new OpenAI({ apiKey });
    this.model = model;
  }

  async generateText(systemPrompt: string, messages: LlmMessage[]): Promise<string> {
    const formatted: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    ];

    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: formatted,
      temperature: 0.2,
      response_format: { type: 'json_object' },
    });

    return res.choices[0]?.message?.content || '';
  }

  async analyzeImage(imageBytes: Uint8Array, mimeType: string, prompt: string): Promise<string> {
    const base64Data = Buffer.from(imageBytes).toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const res = await this.client.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            { type: 'image_url', image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.1,
    });

    return res.choices[0]?.message?.content || '';
  }
}
