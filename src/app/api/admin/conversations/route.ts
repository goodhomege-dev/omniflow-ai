import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';

export async function GET() {
  const repo = getRepository();
  const conversations = await repo.listConversations(100);
  return NextResponse.json({ conversations });
}
