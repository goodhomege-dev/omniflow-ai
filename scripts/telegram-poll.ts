import { getEnv } from '../src/lib/config/env';
import { getRepository } from '../src/lib/db';
import { getLlmProvider } from '../src/lib/llm';
import { AgentOrchestrator } from '../src/lib/agent/orchestrator';
import { TelegramAdapter } from '../src/lib/channels/telegram';

async function main() {
  const env = getEnv();
  const token = env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.error('❌ შეცდომა: TELEGRAM_BOT_TOKEN არ არის მითითებული .env.local-ში!');
    process.exit(1);
  }

  console.log('🤖 OmniFlow AI — Telegram Polling რეჟიმი გაეშვა...');
  console.log('📡 ბოტი მზადაა შეტყობინებების მისაღებად (Ctrl+C გასათიშად).\n');

  const repo = getRepository();
  const llm = getLlmProvider();
  const orchestrator = new AgentOrchestrator(repo, llm);
  const adapter = new TelegramAdapter();

  let offset = 0;

  while (true) {
    try {
      const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=25`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.ok) {
        console.error('⚠️ Telegram API შეცდომა:', data.description);
        await new Promise(r => setTimeout(r, 4000));
        continue;
      }

      for (const update of data.result || []) {
        offset = update.update_id + 1;

        const messages = adapter.parse(update);
        for (const msg of messages) {
          console.log(`\n📩 [${msg.displayName}] (${msg.platformUserId}): "${msg.text}"`);

          const result = await orchestrator.processIncomingMessage({
            channel: 'telegram',
            platformUserId: msg.platformUserId,
            platformMessageId: msg.platformMessageId,
            text: msg.text,
            displayName: msg.displayName,
            attachments: msg.attachments,
          });

          if (result.isDuplicate) {
            console.log('   ↳ ⏭️ დუბლირებული შეტყობინება, გამოტოვებულია.');
            continue;
          }

          if (result.isHumanTakeover) {
            console.log('   ↳ 👤 საუბარი გადაცემულია ოპერატორზე — AI პასუხი შეჩერებულია.');
            continue;
          }

          if (result.replyText) {
            console.log(`   ↳ ⚡ AI პასუხი: "${result.replyText.slice(0, 80)}..."`);
            await adapter.sendText(msg.platformUserId, result.replyText);
          }
        }
      }
    } catch (err) {
      console.error('⚠️ Polling შეცდომა:', (err as Error).message);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

main().catch(console.error);
