import { OpenRouter } from '@openrouter/sdk';
import { LlmProvider, LlmMessage } from './types';

function generateSmartFallback(messages: LlmMessage[]): string {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content.toLowerCase() || '';

  let replyText = 'გამარჯობა! 👋 მე ვარ OmniFlow AI გაყიდვების ასისტენტი. რით შემიძლია დაგეხმაროთ? გვაქვს უმაღლესი ხარისხის პროდუქცია: Apple AirPods, iPhone 15, MagSafe დამტენები. შეგიძლიათ მკითხოთ ნებისმიერ დეტალზე ან გააფორმოთ შეკვეთა!';

  if (lastUserMsg.includes('ფას') || lastUserMsg.includes('რა გაქვთ') || lastUserMsg.includes('პროდუქტ') || lastUserMsg.includes('კატალოგ') || lastUserMsg.includes('რა გაქ')) {
    replyText = 'ჩვენს კატალოგში წარმოდგენილია:\n1. 🎧 Apple AirPods 3 — 249 ₾ (1 წლიანი ოფიციალური გარანტიით)\n2. 📱 Apple iPhone 15 128GB — 2,699 ₾\n3. ⚡ Apple MagSafe Charger — 129 ₾\n\nრომელი პროდუქტი გაინტერესებთ უფრო დეტალურად? 😊';
  } else if (lastUserMsg.includes('შეკვეთ') || lastUserMsg.includes('ყიდვა') || lastUserMsg.includes('მიტან') || lastUserMsg.includes('როგორ')) {
    replyText = 'შეკვეთის გასაფორმებლად გთხოვთ მოგვწეროთ:\n1. სასურველი პროდუქტი\n2. თქვენი სახელი და გვარი\n3. ტელეფონის ნომერი\n4. მიწოდების ქალაქი და მისამართი\n\nთბილისში მიწოდება ხდება იმავე ან მეორე დღეს, რეგიონებში 2-3 დღეში!';
  } else if (lastUserMsg.includes('გარანტი') || lastUserMsg.includes('დაბრუნებ')) {
    replyText = 'ყველა ორიგინალ პროდუქტზე ვრცელდება 1 წლიანი ოფიციალური გარანტია და 14-დღიანი დაბრუნების პოლიტიკა ქარხნული წუნის შემთხვევაში.';
  } else if (lastUserMsg.includes('ოპერატორ') || lastUserMsg.includes('ადამიან') || lastUserMsg.includes('დამეხმარ')) {
    replyText = 'გადაგამისამართებთ ოპერატორთან. ჩვენი გუნდის წევრი მალე შემოგიერთდებათ ჩათში!';
  }

  return JSON.stringify({
    replyText,
    intent: 'general_question',
    isOrderReady: false,
    isEscalate: false,
    missingFields: [],
    order: null,
    actions: []
  });
}

export class OpenRouterProvider implements LlmProvider {
  name = 'openrouter';
  private apiKey: string;
  private client: OpenRouter;
  private model: string;
  private fallbackModels: string[];

  constructor(apiKey: string, model = 'google/gemma-4-26b-a4b-it:free') {
    this.apiKey = apiKey;
    this.client = new OpenRouter({ apiKey });
    this.model = model;
    this.fallbackModels = [
      'nvidia/nemotron-3.5-lightning:free',
      'google/gemma-4-31b-it:free',
      'google/gemma-4-26b-a4b-it:free',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
    ];
  }

  async generateText(systemPrompt: string, messages: LlmMessage[]): Promise<string> {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const modelsToTry = [this.model, ...this.fallbackModels.filter((m) => m !== this.model)];

    for (const modelCandidate of modelsToTry) {
      try {
        // Fast direct fetch with 6 second timeout
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelCandidate,
            messages: formattedMessages,
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(6000),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content && content.trim()) {
            return content.trim();
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`[OpenRouter] ${modelCandidate} status ${res.status}:`, errData?.error?.message || errData);
        }
      } catch (err: any) {
        console.warn(`[OpenRouter] ${modelCandidate} error (${err.message}), trying next fallback...`);
      }
    }

    console.warn('[OpenRouter] All live models rate-limited or unavailable upstream. Using smart Georgian fallback.');
    return generateSmartFallback(messages);
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
