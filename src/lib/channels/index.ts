import { ChannelAdapter } from './types';
import { TelegramAdapter } from './telegram';
import { WhatsAppAdapter } from './whatsapp';
import { MessengerAdapter } from './messenger';

const adapters: Record<string, ChannelAdapter> = {
  telegram: new TelegramAdapter(),
  whatsapp: new WhatsAppAdapter(),
  messenger: new MessengerAdapter(),
};

export function getChannelAdapter(channel: 'messenger' | 'whatsapp' | 'telegram'): ChannelAdapter {
  const adapter = adapters[channel];
  if (!adapter) throw new Error(`Unsupported channel: ${channel}`);
  return adapter;
}

export * from './types';
export * from './telegram';
export * from './whatsapp';
export * from './messenger';
