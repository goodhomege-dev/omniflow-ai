import { NextRequest, NextResponse, after } from 'next/server';
import { TelegramAdapter } from '@/lib/channels/telegram';
import { getRepository } from '@/lib/db';
import { getLlmProvider } from '@/lib/llm';
import { AgentOrchestrator } from '@/lib/agent/orchestrator';

export const maxDuration = 60;

const adapter = new TelegramAdapter();

export async function POST(req: NextRequest) {
  // 1. Verify webhook secret
  const isVerified = await adapter.verify(req);
  if (!isVerified) {
    return NextResponse.json({ error: 'Unauthorized webhook secret' }, { status: 403 });
  }

  // 2. Parse body
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const messages = adapter.parse(body);
  if (messages.length === 0) {
    // Non-message update (e.g. status, callback), acknowledge 200
    return NextResponse.json({ ok: true });
  }

  // 3. Process asynchronously so Telegram gets instant 200 OK
  after(async () => {
    try {
      const repo = getRepository();
      const llm = getLlmProvider();
      const orchestrator = new AgentOrchestrator(repo, llm);

      for (const msg of messages) {
        const res = await orchestrator.processIncomingMessage({
          channel: 'telegram',
          platformUserId: msg.platformUserId,
          platformMessageId: msg.platformMessageId,
          text: msg.text,
          displayName: msg.displayName,
          attachments: msg.attachments,
        });

        // If response was generated and not taken over by human, send reply immediately
        if (res.replyText && !res.isHumanTakeover) {
          const sendResult = await adapter.sendText(msg.platformUserId, res.replyText);
          if (!sendResult.ok) {
            console.error('[Telegram Send Error]:', sendResult.error);
          }
        }
      }
    } catch (error: any) {
      console.error('[Telegram Background Process Exception]:', error);
    }
  });

  return NextResponse.json({ ok: true });
}
