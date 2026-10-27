import crypto from 'crypto';
import { ChannelAdapter, NormalizedMessage, ChannelSendResult } from './types';
import { getEnv } from '../config/env';

export class MessengerAdapter implements ChannelAdapter {
  channel: 'messenger' = 'messenger';

  async verify(req: Request, rawBody: string): Promise<boolean> {
    const env = getEnv();
    const appSecret = env.MESSENGER_APP_SECRET || env.META_APP_SECRET;
    if (!appSecret) return true; // dev fallback if not configured

    const signature = req.headers.get('x-hub-signature-256');
    if (!signature) return false;

    const hmac = crypto.createHmac('sha256', appSecret);
    const expected = `sha256=${hmac.update(rawBody).digest('hex')}`;

    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  parse(body: any): NormalizedMessage[] {
    const results: NormalizedMessage[] = [];
    if (!body || !body.entry) return results;

    for (const entry of body.entry) {
      for (const event of entry.messaging || []) {
        if (!event.message) continue;
        const senderId = event.sender?.id;
        const text = event.message.text || '';
        const messageId = event.message.mid || `mid_${Date.now()}`;
        const attachments = event.message.attachments || [];

        results.push({
          channel: 'messenger',
          platformUserId: senderId,
          platformMessageId: messageId,
          text,
          displayName: 'Messenger User',
          attachments,
        });
      }
    }
    return results;
  }

  async sendText(recipientId: string, text: string): Promise<ChannelSendResult> {
    const env = getEnv();
    if (!env.MESSENGER_PAGE_ACCESS_TOKEN) {
      return { ok: false, error: 'MESSENGER_PAGE_ACCESS_TOKEN is not configured' };
    }

    try {
      const url = `https://graph.facebook.com/v21.0/me/messages?access_token=${env.MESSENGER_PAGE_ACCESS_TOKEN}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipient: { id: recipientId },
          message: { text },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        return { ok: false, error: json.error?.message || `HTTP ${res.status}` };
      }

      return { ok: true, providerId: json.message_id };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}
