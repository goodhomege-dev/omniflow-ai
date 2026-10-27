export type OrderStatus =
  | 'DRAFT'
  | 'AWAITING_DETAILS'
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_REVIEW'
  | 'CONFIRMED_PAID'
  | 'CONFIRMED_COD'
  | 'PROCESSING'
  | 'READY_FOR_DISPATCH'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

export type PaymentStatus =
  | 'UNVERIFIED'
  | 'AWAITING_PAYMENT'
  | 'PAYMENT_REVIEW'
  | 'CONFIRMED_PAID'
  | 'PAYMENT_FAILED'
  | 'REFUND_PENDING'
  | 'REFUNDED';

const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ['AWAITING_DETAILS', 'CANCELLED'],
  AWAITING_DETAILS: ['AWAITING_PAYMENT', 'CONFIRMED_COD', 'CANCELLED'],
  AWAITING_PAYMENT: ['PAYMENT_REVIEW', 'CONFIRMED_PAID', 'CANCELLED'],
  PAYMENT_REVIEW: ['CONFIRMED_PAID', 'AWAITING_PAYMENT', 'CANCELLED'],
  CONFIRMED_COD: ['PROCESSING', 'CANCELLED'],
  CONFIRMED_PAID: ['PROCESSING', 'REFUND_PENDING', 'CANCELLED'],
  PROCESSING: ['READY_FOR_DISPATCH', 'CANCELLED'],
  READY_FOR_DISPATCH: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['REFUND_PENDING'],
  REFUND_PENDING: ['REFUNDED'],
  CANCELLED: [],
  REFUNDED: [],
};

export function canTransitionOrder(from: OrderStatus, to: OrderStatus): boolean {
  if (from === to) return true;
  const allowed = ALLOWED_TRANSITIONS[from];
  return allowed ? allowed.includes(to) : false;
}

export function assertValidTransition(from: OrderStatus, to: OrderStatus): void {
  if (!canTransitionOrder(from, to)) {
    throw new Error(`დაუშვებელი სტატუსის გადასვლა: ${from} -> ${to}`);
  }
}
