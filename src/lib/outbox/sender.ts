import { DatabaseRepository } from '../db/repo';
import { getChannelAdapter } from '../channels';

export async function processOutboxQueue(repo: DatabaseRepository, limit = 20): Promise<{ processed: number; sent: number; failed: number }> {
  const pending = await repo.getPendingOutboxMessages(limit);
  let sent = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      const adapter = getChannelAdapter(item.channel as any);
      const res = await adapter.sendText(item.recipientId, item.content);
      if (res.ok) {
        await repo.markOutboxSent(item.id);
        sent++;
      } else {
        await repo.markOutboxFailed(item.id, res.error || 'Unknown send failure');
        failed++;
      }
    } catch (err) {
      await repo.markOutboxFailed(item.id, (err as Error).message);
      failed++;
    }
  }

  return { processed: pending.length, sent, failed };
}
