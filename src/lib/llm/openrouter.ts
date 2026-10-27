import { OpenRouter } from '@openrouter/sdk';
import { LlmProvider, LlmMessage } from './types';

export function isCorruptedGeorgian(text: string): boolean {
  if (!text) return true;
  // Detect foreign scripts that indicate broken BPE tokenizer hallucination
  const hasArabic = /[\u0600-\u06FF]/.test(text);
  const hasCyrillic = /[\u0400-\u04FF]/.test(text);
  // Detect foreign accents typical of Nemotron BPE byte crashes (e.g. kívანiredი)
  const hasWeirdAccents = /[áéíóúőűãõñ]/i.test(text);
  return hasArabic || hasCyrillic || hasWeirdAccents;
}

export function generateSmartFallback(messages: LlmMessage[]): string {
  const allUserText = messages
    .filter(m => m.role === 'user')
    .map(m => m.content)
    .join(' ')
    .toLowerCase();
  
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const lowerLast = lastUserMsg.toLowerCase();

  // 1. Operator handoff
  if (lowerLast.includes('ოპერატორ') || lowerLast.includes('ადამიან') || lowerLast.includes('დამეხმარ')) {
    return JSON.stringify({
      replyText: 'გადაგამისამართებთ ოპერატორთან. ჩვენი გუნდის წევრი უმოკლეს დროში შემოგიერთდებათ ჩათში! 👨‍💼',
      intent: 'escalate',
      isOrderReady: false,
      isEscalate: true,
      missingFields: [],
      order: null,
      actions: [{ name: 'REQUEST_HUMAN_HANDOFF', args: { reason: 'მომხმარებელმა მოითხოვა ოპერატორი' } }]
    });
  }

  // 2. Warranty & returns
  if (lowerLast.includes('გარანტი') || lowerLast.includes('დაბრუნებ') || lowerLast.includes('ორიგინალ')) {
    return JSON.stringify({
      replyText: '🛡️ **გარანტია და დაბრუნების პირობები:**\n\n• ჩვენს ყველა პროდუქტზე ვრცელდება **1-წლიანი ოფიციალური გარანტია**.\n• პროდუქცია არის 100%-ით ორიგინალი და გაუხსნელი ქარხნული შეფუთვით.\n• მოქმედებს 14-დღიანი დაბრუნების/შეცვლის პოლიტიკა ქარხნული წუნის აღმოჩენის შემთხვევაში (ჩეკისა და შეფუთვის შენარჩუნებით).\n\nრით შემიძლია კიდევ დაგეხმაროთ? 😊',
      intent: 'general_question',
      isOrderReady: false,
      isEscalate: false,
      missingFields: [],
      order: null,
      actions: []
    });
  }

  // 3. Delivery policies
  if (lowerLast.includes('მიტან') || lowerLast.includes('მიწოდებ') || lowerLast.includes('კურიერ') || lowerLast.includes('რამდენ დღე')) {
    return JSON.stringify({
      replyText: '🚚 **მიწოდების პირობები:**\n\n• **თბილისი:** სტანდარტული მიწოდება მეორე დღეს — 5.00 ₾ (14:00-მდე შეკვეთისას შესაძლებელია ექსპრეს მიწოდება იმავე დღეს — 10.00 ₾).\n• **რეგიონები:** მიწოდება მთელი საქართველოს მასშტაბით 2-3 სამუშაო დღეში — 9.00 ₾.\n• 🎁 **100 ლარზე მეტ შენაძენზე მიწოდება სრულიად უფასოა!**\n\nსად გსურთ ამანათის მიღება?',
      intent: 'general_question',
      isOrderReady: false,
      isEscalate: false,
      missingFields: [],
      order: null,
      actions: []
    });
  }

  // 4. Specific product inquiries
  if (lowerLast.includes('airpods') || lowerLast.includes('აირპოდს') || lowerLast.includes('ყურსასმენ')) {
    return JSON.stringify({
      replyText: '🎧 **Apple AirPods 3 (MagSafe Charging Case)**\n\n• **ფასი:** 249 ₾\n• **მდგომარეობა:** სრულიად ახალი, ორიგინალი, გაუხსნელი შეფუთვა\n• **გარანტია:** 1 წლიანი ოფიციალური გარანტია\n• **მიწოდება:** უფასო მიწოდება მთელი საქართველოს მასშტაბით (100 ₾-ზე მეტია)!\n\nგსურთ შეკვეთის გაფორმება? შეკვეთისთვის გთხოვთ მომწეროთ თქვენი სახელი, ტელეფონის ნომერი და მისამართი. 😊',
      intent: 'product_inquiry',
      isOrderReady: false,
      isEscalate: false,
      missingFields: ['recipient_name', 'phone', 'address'],
      order: null,
      actions: []
    });
  }

  if (lowerLast.includes('iphone') || lowerLast.includes('აიფონ')) {
    return JSON.stringify({
      replyText: '📱 **Apple iPhone 15 128GB**\n\n• **ფასი:** 2,699 ₾\n• **მდგომარეობა:** სრულიად ახალი, ოფიციალური გარანტიით\n• **ფერები:** Black, Blue, Green, Yellow, Pink\n• **მიწოდება:** უფასო მიწოდება მთელი საქართველოს მასშტაბით!\n\nგსურთ შეკვეთის გაფორმება? 😊',
      intent: 'product_inquiry',
      isOrderReady: false,
      isEscalate: false,
      missingFields: ['recipient_name', 'phone', 'address'],
      order: null,
      actions: []
    });
  }

  if (lowerLast.includes('magsafe') || lowerLast.includes('მაგსეიფ') || lowerLast.includes('დამტენ')) {
    return JSON.stringify({
      replyText: '⚡ **Apple MagSafe Charger (15W)**\n\n• **ფასი:** 129 ₾\n• **თავსებადობა:** iPhone 12/13/14/15 და AirPods MagSafe ქეისით\n• **გარანტია:** 1 წელი\n• **მიწოდება:** უფასო მიწოდება!\n\nგსურთ შეკვეთის გაფორმება?',
      intent: 'product_inquiry',
      isOrderReady: false,
      isEscalate: false,
      missingFields: ['recipient_name', 'phone', 'address'],
      order: null,
      actions: []
    });
  }

  // 5. Catalog request
  if (lowerLast.includes('ფას') || lowerLast.includes('რა გაქვთ') || lowerLast.includes('პროდუქტ') || lowerLast.includes('კატალოგ') || lowerLast.includes('რა გაქ') || lowerLast.includes('რას ყიდით')) {
    return JSON.stringify({
      replyText: '✨ **ჩვენი პროდუქტების კატალოგი:**\n\n1. 🎧 **Apple AirPods 3** — 249 ₾ (1 წლიანი გარანტიით)\n2. 📱 **Apple iPhone 15 128GB** — 2,699 ₾\n3. ⚡ **Apple MagSafe Charger** — 129 ₾\n\n🚚 100 ლარზე ზევით მიწოდება **უფასოა**!\n\nრომელი პროდუქტი გაინტერესებთ უფრო დეტალურად?',
      intent: 'catalog_request',
      isOrderReady: false,
      isEscalate: false,
      missingFields: [],
      order: null,
      actions: []
    });
  }

  // 6. Order submission / phone number provided
  const phoneMatch = allUserText.match(/(?:5\d{2}\s*?\d{2}\s*?\d{2}\s*?\d{2}|5\d{8}|\+995\s*?5\d{8})/);
  const hasPhone = Boolean(phoneMatch);
  const wantsOrder = lowerLast.includes('ყიდვ') || lowerLast.includes('შეკვეთ') || lowerLast.includes('მინდა') || lowerLast.includes('ავიღებ') || lowerLast.includes('გამომიგზავნ');

  if (hasPhone) {
    const rawPhone = phoneMatch ? phoneMatch[0].replace(/\s+/g, '') : '';
    const product = allUserText.includes('iphone')
      ? 'Apple iPhone 15 128GB (2,699 ₾)'
      : (allUserText.includes('magsafe') ? 'Apple MagSafe Charger (129 ₾)' : 'Apple AirPods 3 (249 ₾)');
    
    return JSON.stringify({
      replyText: `🎉 **დიდი მადლობა! თქვენი შეკვეთა მიღებულია:**\n\n• **პროდუქტი:** ${product}\n• **ტელეფონის ნომერი:** ${rawPhone}\n• **მიწოდება:** უფასო მიწოდება მთელი საქართველოს მასშტაბით\n\n💳 **გადახდის რეკვიზიტები (საბანკო გადარიცხვა):**\n• **TBC ბანკი (IBAN):** \`GE00TB0000000000000000\`\n• **საქართველოს ბანკი (BOG IBAN):** \`GE00BG0000000000000000\`\n• **მიმღები:** შპს ტექ სთორ ჯორჯია\n• **დანიშნულება:** შეკვეთის გადახდა\n\nგადარიცხვის შემდეგ გთხოვთ გადმოგვიგზავნოთ გადახდის ქვითარი (სქრინშოტი) და ჩვენი კურიერი დაუყოვნებლივ დაგიკავშირდებათ! 🚀`,
      intent: 'order_confirmed',
      isOrderReady: true,
      isEscalate: false,
      missingFields: [],
      order: {
        product,
        phone: rawPhone,
        status: 'draft'
      },
      actions: []
    });
  }

  if (wantsOrder) {
    return JSON.stringify({
      replyText: 'შეკვეთის გასაფორმებლად, გთხოვთ მოგვწეროთ შემდეგი მონაცემები:\n\n1. 📦 **პროდუქტის დასახელება** (მაგ: AirPods 3)\n2. 👤 **თქვენი სახელი და გვარი**\n3. 📞 **ტელეფონის ნომერი** (მაგ: 599 12 34 56)\n4. 📍 **მიტანის ქალაქი და ზუსტი მისამართი**\n\nთბილისში მიწოდება ხდება 24 საათში, რეგიონებში 2-3 დღეში!',
      intent: 'order_collection',
      isOrderReady: false,
      isEscalate: false,
      missingFields: ['recipient_name', 'phone', 'address'],
      order: null,
      actions: []
    });
  }

  // 7. General greeting
  return JSON.stringify({
    replyText: 'გამარჯობა! 👋 მე ვარ TechStore Georgia-ს AI ასისტენტი. რით შემიძლია დაგეხმაროთ?\n\nჩვენთან შეგიძლიათ შეიძინოთ:\n• 🎧 Apple AirPods 3 — 249 ₾\n• 📱 Apple iPhone 15 128GB — 2,699 ₾\n• ⚡ Apple MagSafe Charger — 129 ₾\n\nმოქმედებს 1-წლიანი გარანტია და უფასო მიწოდება 100 ლარზე ზევით! ✨',
    intent: 'general_greeting',
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
    // Only use clean Google Gemma models. NEVER include Nemotron due to severe Georgian token corruption.
    this.fallbackModels = [
      'google/gemma-4-31b-it:free',
      'google/gemma-4-26b-a4b-it:free',
    ];
  }

  async generateText(systemPrompt: string, messages: LlmMessage[]): Promise<string> {
    const formattedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const modelsToTry = [this.model, ...this.fallbackModels].filter(
      (m, i, arr) => arr.indexOf(m) === i && !m.includes('nemotron')
    );

    for (const modelCandidate of modelsToTry) {
      try {
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
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content && content.trim()) {
            if (isCorruptedGeorgian(content)) {
              console.warn(`[OpenRouter] ${modelCandidate} returned corrupted text with non-Georgian tokens. Skipping to fallback.`);
            } else {
              return content.trim();
            }
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          console.warn(`[OpenRouter] ${modelCandidate} status ${res.status}:`, errData?.error?.message || errData);
        }
      } catch (err: any) {
        console.warn(`[OpenRouter] ${modelCandidate} error (${err.message}), trying next fallback...`);
      }
    }

    console.warn('[OpenRouter] All remote free models rate-limited or corrupt. Using smart Georgian fallback.');
    return generateSmartFallback(messages);
  }

  async analyzeImage(imageBytes: Uint8Array, mimeType: string, prompt: string): Promise<string> {
    const base64Data = Buffer.from(imageBytes).toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    const visionModels = [
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
