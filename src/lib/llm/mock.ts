import { LlmProvider, LlmMessage } from './types';

export class MockLlmProvider implements LlmProvider {
  name = 'mock';
  public responses: string[] = [];
  public callCount = 0;
  public lastPrompt = '';
  public lastMessages: LlmMessage[] = [];

  constructor(initialResponses: string[] = []) {
    this.responses = [...initialResponses];
  }

  queueResponse(response: string | object) {
    this.responses.push(typeof response === 'string' ? response : JSON.stringify(response));
  }

  async generateText(systemPrompt: string, messages: LlmMessage[]): Promise<string> {
    this.callCount++;
    this.lastPrompt = systemPrompt;
    this.lastMessages = messages;

    if (this.responses.length > 0) {
      return this.responses.shift()!;
    }

    // Default mock response
    return JSON.stringify({
      replyText: 'გამარჯობა! რით შემიძლია დაგეხმაროთ?',
      platform: 'telegram',
      intent: 'general_question',
      isOrderReady: false,
      isEscalate: false,
      missingFields: [],
      order: null,
      actions: [],
    });
  }

  async analyzeImage(_imageBytes: Uint8Array, _mimeType: string, _prompt: string): Promise<string> {
    return JSON.stringify({
      bank: 'TBC Bank',
      amount: 249.00,
      currency: 'GEL',
      date: '2026-10-26',
      txRef: 'TBC-MOCK-12345',
      visibleStatus: 'SUCCESS',
    });
  }
}
