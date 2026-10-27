import { AgentResponse } from './schema';

export interface GuardContext {
  orderCreatedThisTurn: boolean;
  paymentConfirmedThisTurn: boolean;
  activeOrderExists: boolean;
}

const FORBIDDEN_UNCONFIRMED_ORDER_PHRASES = [
  'შეკვეთა გაფორმებულია',
  'შეკვეთა გაფორმდა',
  'წარმატებით გაფორმდა',
  'შეკვეთა მიღებულია',
  'კურიერს გადავეცით',
  'უკვე იგზავნება',
  'order has been placed',
  'order is confirmed',
];

const FORBIDDEN_UNCONFIRMED_PAYMENT_PHRASES = [
  'გადახდა დადასტურებულია',
  'გადახდა დადასტურდა',
  'თანხა ჩარიცხულია',
  'თანხა მიღებულია',
  'ჩარიცხვა დადასტურდა',
  'დადასტურდა! შეკვეთა',
  'payment confirmed',
  'payment received',
];

/**
 * Post-execution safety guard.
 * Prevents hallucinations regarding transactional success.
 */
export function applySafetyGuards(response: AgentResponse, ctx: GuardContext): AgentResponse {
  const guarded = { ...response };
  const lowerText = guarded.replyText.toLowerCase();

  // Guard 1: Order created claims
  if (!ctx.orderCreatedThisTurn && !ctx.activeOrderExists) {
    const hasFalseClaim = FORBIDDEN_UNCONFIRMED_ORDER_PHRASES.some(phrase => lowerText.includes(phrase));
    if (hasFalseClaim) {
      guarded.replyText = 'შეკვეთის გაფორმება ვერ მოხერხდა. გთხოვთ დააზუსტოთ დეტალები ან მიმართოთ ოპერატორს.';
      guarded.isOrderReady = false;
    }
  }

  // Guard 2: Payment confirmed claims
  if (!ctx.paymentConfirmedThisTurn) {
    const hasFalsePayClaim = FORBIDDEN_UNCONFIRMED_PAYMENT_PHRASES.some(phrase => lowerText.includes(phrase));
    if (hasFalsePayClaim) {
      guarded.replyText = 'ქვითარი მიღებულია. გადახდა შემოწმების პროცესშია და დადასტურების შემდეგ შეგატყობინებთ.';
    }
  }

  // Guard 3: isOrderReady is strictly false unless order was actually created or ready
  if (!ctx.orderCreatedThisTurn && !ctx.activeOrderExists) {
    guarded.isOrderReady = false;
  }

  return guarded;
}
