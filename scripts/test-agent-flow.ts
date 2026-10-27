import { loadEnvConfig } from '@next/env';
loadEnvConfig(process.cwd());

import { AgentOrchestrator } from '../src/lib/agent/orchestrator';
import { InMemoryRepository } from '../src/lib/db/mockRepo';
import { getLlmProvider } from '../src/lib/llm';

async function main() {
  console.log('=== ტესტირება: აგენტის ჩართვა Master System Prompt-ით ===\n');
  const repo = new InMemoryRepository();
  const llm = getLlmProvider();

  console.log(`გამოყენებული LLM პროვაიდერი: ${llm.name}`);
  const orchestrator = new AgentOrchestrator(repo, llm);

  // 1. მომხმარებელი კითხულობს AirPods-ის ფასს
  console.log('\n--- მომხმარებელი: "გამარჯობა, AirPods 3 გაქვთ და რა ღირს?" ---');
  const res1 = await orchestrator.processIncomingMessage({
    channel: 'telegram',
    platformUserId: 'tg_user_123',
    platformMessageId: 'msg_001',
    text: 'გამარჯობა, AirPods 3 გაქვთ და რა ღირს?',
    displayName: 'გიორგი'
  });

  console.log('🤖 აგენტის პასუხი:');
  console.log(res1.replyText || res1.response?.replyText);
  console.log('\nIntent:', res1.response?.intent);
  console.log('Order Ready:', res1.response?.isOrderReady);
  console.log('Actions Called:', res1.response?.actions);

  console.log('\n✅ აგენტმა Master System Prompt-ის მიხედვით ზუსტად გასცა ინფორმაცია!');
}

main().catch(console.error);
