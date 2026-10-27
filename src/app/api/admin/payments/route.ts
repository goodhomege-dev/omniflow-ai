import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';

export async function GET() {
  const repo = getRepository();
  const list = await repo.getPendingPaymentReviews();
  return NextResponse.json({ pendingReviews: list });
}

export async function POST(req: NextRequest) {
  const repo = getRepository();
  try {
    const { eventId, outcome } = await req.json();
    if (!eventId || !['CONFIRMED_PAID', 'PAYMENT_FAILED'].includes(outcome)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const res = await repo.verifyPaymentManually(eventId, outcome, 'ADMIN');
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
