export interface NormalizedMessage {
  channel: 'messenger' | 'whatsapp' | 'telegram';
  platformUserId: string;
  platformMessageId: string;
  text: string;
  displayName?: string;
  attachments?: Array<{ type: string; url?: string; payload?: any }>;
}

export interface ChannelSendResult {
  ok: boolean;
  providerId?: string;
  error?: string;
}

export interface ChannelAdapter {
  channel: 'messenger' | 'whatsapp' | 'telegram';
  verify(req: Request, rawBody: string): Promise<boolean>;
  parse(body: any): NormalizedMessage[];
  sendText(recipientId: string, text: string): Promise<ChannelSendResult>;
}
