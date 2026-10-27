import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';

export async function GET() {
  const repo = getRepository();
  const orders = await repo.listOrders(100);
  return NextResponse.json({ orders });
}
