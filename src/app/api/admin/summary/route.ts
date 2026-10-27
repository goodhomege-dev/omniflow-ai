import { NextResponse } from 'next/server';
import { getRepository } from '@/lib/db';

export async function GET() {
  const repo = getRepository();

  const reviews = await repo.getPendingPaymentReviews();
  const handoffs = await repo.getOpenHandoffTickets();

  const allOrders = await repo.listOrders(100);
  const allConversations = await repo.listConversations(100);

  const totalOrdersCount = allOrders.length;
  let confirmedSalesAmount = 0;
  for (const o of allOrders) {
    if (['CONFIRMED_PAID', 'PROCESSING', 'READY_FOR_DISPATCH', 'SHIPPED', 'DELIVERED'].includes(o.status)) {
      confirmedSalesAmount += o.totalAmount;
    }
  }

  return NextResponse.json({
    kpis: {
      totalConversations: allConversations.length,
      ordersCreated: totalOrdersCount,
      confirmedSales: confirmedSalesAmount,
      needsAttention: reviews.length + handoffs.length,
      paymentReviewsCount: reviews.length,
      handoffsCount: handoffs.length,
    },
    attentionQueue: [
      ...reviews.map(r => ({
        type: 'PAYMENT_REVIEW',
        title: `გადახდის შემოწმება: შეკვეთა ${r.orderId}`,
        subtitle: `თანხა: ${r.amount} ₾ (მომწოდებელი: ${r.provider})`,
        time: 'ახლახან',
      })),
      ...handoffs.map(h => ({
        type: 'HANDOFF',
        title: `ოპერატორის ჩართვა: ${h.conversationId}`,
        subtitle: h.reason,
        time: 'აქტიური',
      })),
    ],
    recentOrders: allOrders.slice(0, 5),
    lastUpdatedAt: new Date().toISOString(),
  });
}
