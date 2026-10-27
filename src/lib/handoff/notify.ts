import { getEnv } from '../config/env';

export async function notifyStaffHandoff(params: {
  conversationId: string;
  channel: string;
  reason: string;
  customerName?: string;
}): Promise<void> {
  const env = getEnv();
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_STAFF_CHAT_ID) {
    return;
  }

  const text = `🚨 *ოპერატორის ჩართვა აუცილებელია!*
• *არხი:* ${params.channel.toUpperCase()}
• *საუბრის ID:* \`${params.conversationId}\`
• *მომხმარებელი:* ${params.customerName || 'უცნობი'}
• *მიზეზი:* ${params.reason}

გთხოვთ შეხვიდეთ ადმინ დაშბორდში საუბრის გასაგრძელებლად.`;

  try {
    const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_STAFF_CHAT_ID,
        text,
        parse_mode: 'Markdown',
      }),
    });
  } catch (err) {
    console.error('Failed to notify staff on Telegram:', err);
  }
}
