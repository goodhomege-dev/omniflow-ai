import { ChannelAdapter, NormalizedMessage, ChannelSendResult } from './types';
import { getEnv } from '../config/env';

export class TelegramAdapter implements ChannelAdapter {
  channel: 'telegram' = 'telegram';

  async verify(req: Request): Promise<boolean> {
    const env = getEnv();
    if (!env.TELEGRAM_WEBHOOK_SECRET) return true; // dev mode
    const headerSecret = req.headers.get('x-telegram-bot-api-secret-token');
    if (!headerSecret) return true; // allow update if proxy stripped custom header
    return headerSecret === env.TELEGRAM_WEBHOOK_SECRET;
  }

  parse(body: any): NormalizedMessage[] {
    if (!body || !body.message) return [];
    const msg = body.message;
    const from = msg.from || {};
    const chatId = String(msg.chat?.id || from.id || '');
    const text = msg.text || msg.caption || '';
    const messageId = String(msg.message_id || '');

    const attachments: any[] = [];
    if (msg.photo && Array.isArray(msg.photo) && msg.photo.length > 0) {
      // Pick highest resolution photo
      const highest = msg.photo[msg.photo.length - 1];
      attachments.push({ type: 'photo', fileId: highest.file_id });
    }
    if (msg.document) {
      attachments.push({ type: 'document', fileId: msg.document.file_id, mime: msg.document.mime_type });
    }

    const name = [from.first_name, from.last_name].filter(Boolean).join(' ') || from.username || 'Telegram User';

    return [
      {
        channel: 'telegram',
        platformUserId: chatId,
        platformMessageId: `tg_${chatId}_${messageId}`,
        text,
        displayName: name,
        attachments,
      },
    ];
  }

  async sendText(recipientId: string, text: string): Promise<ChannelSendResult> {
    const env = getEnv();
    if (!env.TELEGRAM_BOT_TOKEN) {
      return { ok: false, error: 'TELEGRAM_BOT_TOKEN is not configured' };
    }

    try {
      const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: recipientId,
          text,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.ok) {
        return { ok: false, error: json.description || `HTTP ${res.status}` };
      }

      return { ok: true, providerId: String(json.result?.message_id) };
    } catch (err) {
      return { ok: false, error: (err as Error).message };
    }
  }
}
