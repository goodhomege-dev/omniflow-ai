import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { getChannelAdapter } from '@/lib/channels';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repo = getRepository();
  const history = await repo.getConversationHistory(id, 50);

  return NextResponse.json({
    conversationId: id,
    messages: history,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repo = getRepository();

  try {
    const body = await req.json();

    // 1. Action: Toggle AI pause / human takeover
    if (body.action === 'TOGGLE_TAKEOVER') {
      await repo.updateConversation(id, {
        aiPaused: !!body.aiPaused,
        isHumanAssigned: !!body.aiPaused,
      });
      return NextResponse.json({ success: true, aiPaused: !!body.aiPaused });
    }

    // 2. Action: Send Staff message
    if (body.action === 'SEND_MESSAGE') {
      const text = (body.text || '').trim();
      if (!text) {
        return NextResponse.json({ success: false, error: 'Text cannot be empty' }, { status: 400 });
      }

      // Find conversation to get channel & recipient
      const allConvs = await repo.listConversations(500);
      const targetConv = allConvs.find(c => c.id === id);

      const channel = targetConv?.channel || 'telegram';
      const recipientId = targetConv?.channelIdentityId?.split(':')[1] || '';

      // Save message
      await repo.saveMessage({
        conversationId: id,
        channel,
        platformMessageId: `staff_${Date.now()}`,
        senderType: 'human_agent',
        content: text,
      });

      // Send directly via channel adapter if recipient known
      if (recipientId) {
        const adapter = getChannelAdapter(channel);
        await adapter.sendText(recipientId, text);
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
