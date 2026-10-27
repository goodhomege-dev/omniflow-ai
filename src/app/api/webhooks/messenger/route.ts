import { NextRequest, NextResponse } from 'next/server';
import { MessengerAdapter } from '@/lib/channels/messenger';
import { getRepository } from '@/lib/db';
import { getLlmProvider } from '@/lib/llm';
import { AgentOrchestrator } from '@/lib/agent/orchestrator';
import { getEnv } from '@/lib/config/env';

const adapter = new MessengerAdapter();

// Meta Webhook Verification Handshake
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const env = getEnv();
  if (mode === 'subscribe' && token === env.MESSENGER_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Forbidden', { status: 403 });
}

// Ingest Messenger Messages
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const isVerified = await adapter.verify(req, rawBody);
  if (!isVerified) {
    return NextResponse.json({ error: 'Invalid HMAC signature' }, { status: 403 });
  }

  let body: any;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const messages = adapter.parse(body);
  if (messages.length === 0) {
    return NextResponse.json({ status: 'ok' });
  }

  const repo = getRepository();
  const llm = getLlmProvider();
  const orchestrator = new AgentOrchestrator(repo, llm);

  for (const msg of messages) {
    const res = await orchestrator.processIncomingMessage({
      channel: 'messenger',
      platformUserId: msg.platformUserId,
      platformMessageId: msg.platformMessageId,
      text: msg.text,
      displayName: msg.displayName,
      attachments: msg.attachments,
    });

    if (res.replyText && !res.isHumanTakeover) {
      await adapter.sendText(msg.platformUserId, res.replyText);
    }
  }

  return NextResponse.json({ status: 'ok' });
}
