import crypto from 'crypto';
import { ChannelAdapter, NormalizedMessage, ChannelSendResult } from './types';
import { getEnv } from '../config/env';

export class WhatsAppAdapter implements ChannelAdapter {
  channel: 'whatsapp' = 'whatsapp';

  async verify(req: Request, rawBody: string): Promise<boolean> {
    const env = getEnv();
    const appSecret = env.WHATSAPP_APP_SECRET || env.META_APP_SECRET;
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
      for (const change of entry.changes || []) {
        const val = change.value;
        if (!val || !val.messages) continue;
        const contact = (val.contacts && val.contacts[0]) || {};
        const displayName = contact.profile?.name || 'WhatsApp Customer';

        for (const msg of val.messages) {
          const from = msg.from; // phone number e.g. 995599123456
          const text = msg.text?.body || msg.caption || '';
          const attachments: any[] = [];

          if (msg.image) {
            attachments.push({ type: 'image', id: msg.image.id, mime: msg.image.mime_type });
          }
          if (msg.document) {
            attachments.push({ type: 'document', id: msg.document.id, mime: msg.document.mime_type });
          }

          results.push({
            channel: 'whatsapp',
            platformUserId: from,
            platformMessageId: msg.id,
            text,
            displayName,
            attachments,
          });
        }
      }
    }
    return results;
  }

  async sendText(recipientId: string, text: string): Promise<ChannelSendResult> {
    const env = getEnv();
    if (!env.WHATSAPP_ACCESS_TOKEN || !env.WHATSAPP_PHONE_NUMBER_ID) {
      return { ok: false, error: 'WhatsApp credentials not configured' };
    }

    try {
      const url = `https://graph.facebook.com/v21.0/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: recipientId,
          type: 'text',
          text: { body: text },
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        return { ok: false, error: json.error?.message || `HTTP ${res.status}` };
      }

      return { ok: true, providerId: json.messages?.[0]?.id };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}
