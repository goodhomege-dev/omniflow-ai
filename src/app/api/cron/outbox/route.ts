import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { processOutboxQueue } from '@/lib/outbox/sender';
import { getEnv } from '@/lib/config/env';

export async function GET(req: NextRequest) {
  return handleCron(req);
}

export async function POST(req: NextRequest) {
  return handleCron(req);
}

async function handleCron(req: NextRequest) {
  const env = getEnv();
  const authHeader = req.headers.get('authorization');
  const token = req.nextUrl.searchParams.get('token');

  const isAuthorized =
    authHeader === `Bearer ${env.CRON_SECRET}` ||
    token === env.CRON_SECRET ||
    env.NODE_ENV === 'development';

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized cron token' }, { status: 401 });
  }

  const repo = getRepository();
  const result = await processOutboxQueue(repo);

  return NextResponse.json({ ok: true, ...result });
}
