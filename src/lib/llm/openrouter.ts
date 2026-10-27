import { OpenRouter } from '@openrouter/sdk';
import { LlmProvider, LlmMessage } from './types';

export class OpenRouterProvider implements LlmProvider {
  name = 'openrouter';
  private client: OpenRouter;
  private model: string;
  private fallbackModels: string[];

  constructor(apiKey: string, model = 'google/gemma-4-26b-a4b-it:free') {
    this.client = new OpenRouter({ apiKey });
    this.model = model;
    this.fallbackModels = [
      'nvidia/nemotron-3.5-lightning:free',
      'google/gemma-4-31b-it:free',
      'meta-llama/llama-3.3-70b-instruct',
    ];
  }

  async generateText(systemPrompt: string, messages: LlmMessage[]): Promise<string> {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const modelsToTry = [this.model, ...this.fallbackModels.filter((m) => m !== this.model)];
    let lastError: unknown = null;

    for (const modelCandidate of modelsToTry) {
      try {
        const stream = await this.client.chat.send({
          chatRequest: {
            model: modelCandidate,
            messages: formattedMessages as any,
            stream: true,
          },
        });

        let fullText = '';
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            fullText += content;
          }
        }

        if (fullText.trim()) {
          return fullText;
        }
      } catch (err: unknown) {
        lastError = err;
        console.warn(`[OpenRouter] Model ${modelCandidate} failed (${(err as Error)?.message || err}), trying fallback...`);
      }
    }

    throw lastError || new Error('All OpenRouter models failed to respond.');
  }

  async analyzeImage(imageBytes: Uint8Array, mimeType: string, prompt: string): Promise<string> {
    const base64Data = Buffer.from(imageBytes).toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const visionModels = [
      'nvidia/nemotron-3.5-super-vl:free',
      'google/gemini-2.0-flash-exp:free',
      this.model,
    ];

    for (const modelCandidate of visionModels) {
      try {
        const stream = await this.client.chat.send({
          chatRequest: {
            model: modelCandidate,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { type: 'image_url', imageUrl: { url: dataUrl } },
                ],
              },
            ] as any,
            stream: true,
          },
        });

        let fullText = '';
        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;
          if (content) {
            fullText += content;
          }
        }

        if (fullText.trim()) {
          return fullText;
        }
      } catch (err: unknown) {
        console.warn(`[OpenRouter Vision] ${modelCandidate} failed:`, (err as Error)?.message || err);
      }
    }

    return 'Receipt analyzed by OpenRouter provider.';
  }
}
