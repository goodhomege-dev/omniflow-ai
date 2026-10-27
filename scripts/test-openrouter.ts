import { OpenRouter } from "@openrouter/sdk";
import { getEnv } from "../src/lib/config/env";

const env = getEnv();
const apiKey = env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || "";

const openrouter = new OpenRouter({ apiKey });

async function streamQuery(model: string, userPrompt: string) {
  console.log(`\n======================================================`);
  console.log(`🚀 მოდელი: ${model}`);
  console.log(`💬 შეკითხვა: "${userPrompt}"`);
  console.log(`======================================================\n`);

  try {
    const stream = await openrouter.chat.send({
      chatRequest: {
        model,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
        stream: true,
      },
    });

    let fullText = "";
    let reasoningTokens: number | undefined;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        fullText += content;
        process.stdout.write(content);
      }

      // Usage information comes in the final chunk
      if (chunk.usage?.completionTokensDetails?.reasoningTokens) {
        reasoningTokens = chunk.usage.completionTokensDetails.reasoningTokens;
      }
    }

    if (reasoningTokens !== undefined) {
      console.log(`\n\n🧠 Reasoning Tokens: ${reasoningTokens}`);
    }

    console.log(`\n\n✅ პასუხი წარმატებით დასრულდა! (სიმბოლოების რაოდენობა: ${fullText.length})`);
    return true;
  } catch (error: any) {
    console.error(`\n❌ შეცდომა [${model}]:`, error?.message || error);
    return false;
  }
}

async function main() {
  const prompt = "How many r's are in the word 'strawberry'? Explain your answer step by step.";
  
  // 1. First try the requested model
  const preferredModel = env.OPENROUTER_MODEL || "google/gemma-4-26b-a4b-it:free";
  const ok = await streamQuery(preferredModel, prompt);

  // 2. If primary model is rate-limited upstream, fall back to high-availability free models
  if (!ok) {
    console.log("\n⚠️ პირველადი მოდელი დროებით გადატვირთულია upstream პროვაიდერზე (429 Rate Limit).");
    console.log("🔄 გადავდივართ ალტერნატიულ ხელმისაწვდომ მოდელზე...");
    
    const fallbackModels = [
      "nvidia/nemotron-3.5-lightning:free",
      "google/gemma-4-31b-it:free",
    ];

    for (const altModel of fallbackModels) {
      if (altModel === preferredModel) continue;
      const fallbackOk = await streamQuery(altModel, prompt);
      if (fallbackOk) break;
    }
  }
}

main().catch(console.error);
