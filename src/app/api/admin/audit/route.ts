import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';

export async function GET(req: NextRequest) {
  const repo = getRepository();
  const limit = Number(req.nextUrl.searchParams.get('limit')) || 100;
  const logs = await repo.getAuditLogs(limit);
  return NextResponse.json({ logs });
}
