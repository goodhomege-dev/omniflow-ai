import { z } from 'zod';

export const agentActionSchema = z.object({
  name: z.enum([
    'LOOKUP_PRODUCT',
    'CHECK_STOCK',
    'CALCULATE_ORDER_TOTAL',
    'VALIDATE_PHONE',
    'VALIDATE_ADDRESS',
    'CREATE_ORDER',
    'VERIFY_PAYMENT',
    'GET_ORDER_STATUS',
    'REQUEST_HUMAN_HANDOFF',
  ]),
  args: z.record(z.string(), z.any()).optional().default({}),
});

export const orderPayloadSchema = z.object({
  orderId: z.string().nullable().optional(),
  productId: z.string().nullable().optional(),
  product: z.string().nullable().optional(),
  quantity: z.number().nullable().optional(),
  unitPrice: z.number().nullable().optional(),
  deliveryFee: z.number().nullable().optional(),
  totalPrice: z.number().nullable().optional(),
  currency: z.string().default('GEL'),
  customerName: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  deliveryNotes: z.string().nullable().optional(),
  paymentMethod: z.string().nullable().optional(),
  paymentStatus: z.enum([
    'UNVERIFIED',
    'AWAITING_PAYMENT',
    'PAYMENT_REVIEW',
    'CONFIRMED_PAID',
    'PAYMENT_FAILED',
    'REFUND_PENDING',
    'REFUNDED',
  ]).nullable().optional().default('UNVERIFIED'),
  status: z.enum([
    'DRAFT',
    'AWAITING_DETAILS',
    'AWAITING_PAYMENT',
    'PAYMENT_REVIEW',
    'CONFIRMED_PAID',
    'CONFIRMED_COD',
    'PROCESSING',
    'READY_FOR_DISPATCH',
    'SHIPPED',
    'DELIVERED',
    'CANCELLED',
    'REFUND_PENDING',
    'REFUNDED',
  ]).nullable().optional().default('DRAFT'),
});

export const agentResponseSchema = z.object({
  replyText: z.string(),
  platform: z.enum(['messenger', 'whatsapp', 'telegram']),
  intent: z.enum([
    'general_question',
    'product_inquiry',
    'order',
    'payment',
    'delivery',
    'complaint',
    'human_handoff',
    'other',
  ]),
  isOrderReady: z.boolean(),
  isEscalate: z.boolean(),
  missingFields: z.array(z.string()).default([]),
  order: orderPayloadSchema.nullable().optional(),
  actions: z.array(agentActionSchema).default([]),
});

export type AgentResponse = z.infer<typeof agentResponseSchema>;
export type AgentAction = z.infer<typeof agentActionSchema>;
export type OrderPayload = z.infer<typeof orderPayloadSchema>;

/**
 * Strips code fences and parses raw LLM output into AgentResponse.
 */
export function parseAgentJson(rawText: string): { success: true; data: AgentResponse } | { success: false; error: string } {
  if (!rawText || typeof rawText !== 'string') {
    return { success: false, error: 'Empty LLM response' };
  }

  // Strip ```json and ``` if model accidentally returned markdown code fences
  let cleaned = rawText.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
  }

  try {
    const json = JSON.parse(cleaned);
    const parsed = agentResponseSchema.safeParse(json);
    if (!parsed.success) {
      return { success: false, error: JSON.stringify(parsed.error.flatten().fieldErrors) };
    }
    return { success: true, data: parsed.data };
  } catch (err) {
    return { success: false, error: `Invalid JSON syntax: ${(err as Error).message}` };
  }
}
