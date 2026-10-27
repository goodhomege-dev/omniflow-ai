import { NextRequest, NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';
import { canTransitionOrder, OrderStatus } from '@/lib/orders/stateMachine';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repo = getRepository();
  const order = await repo.getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({ order });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const repo = getRepository();

  try {
    const { toStatus, reason } = await req.json();
    const order = await repo.getOrderById(id);
    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (!canTransitionOrder(order.status as OrderStatus, toStatus as OrderStatus)) {
      return NextResponse.json({
        error: `დაუშვებელი სტატუსის გადასვლა: ${order.status} -> ${toStatus}`,
      }, { status: 400 });
    }

    const res = await repo.transitionOrderStatus(id, toStatus, 'ADMIN', reason);
    return NextResponse.json(res);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
