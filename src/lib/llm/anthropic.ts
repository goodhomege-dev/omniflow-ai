import Anthropic from '@anthropic-ai/sdk';
import { LlmProvider, LlmMessage } from './types';

export class AnthropicProvider implements LlmProvider {
  name = 'anthropic';
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = 'claude-3-5-sonnet-20241022') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async generateText(systemPrompt: string, messages: LlmMessage[]): Promise<string> {
    const formatted = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const res = await this.client.messages.create({
      model: this.model,
      system: systemPrompt,
      messages: formatted,
      max_tokens: 1024,
    });

    const firstBlock = res.content[0];
    return firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
  }

  async analyzeImage(imageBytes: Uint8Array, mimeType: string, prompt: string): Promise<string> {
    const base64Data = Buffer.from(imageBytes).toString('base64');

    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as any,
                data: base64Data,
              },
            },
            { type: 'text', text: prompt },
          ],
        },
      ],
    });

    const firstBlock = res.content[0];
    return firstBlock && firstBlock.type === 'text' ? firstBlock.text : '';
  }
}
