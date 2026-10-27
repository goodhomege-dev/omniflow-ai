export interface OrderItemInput {
  variantId: string;
  productName: string;
  variantName?: string;
  unitPrice: number;
  quantity: number;
}

export interface DeliveryPolicyConfig {
  cityFee: number;
  regionalFee: number;
  expressFee: number;
  freeShippingThreshold: number;
  freeShippingEnabled: boolean;
}

export interface CalculatedOrderTotals {
  subtotal: number;
  deliveryFee: number;
  discount: number;
  tax: number;
  total: number;
  currency: 'GEL';
  isFreeShipping: boolean;
  deliveryType: 'city' | 'regional' | 'express';
}

const DEFAULT_POLICY: DeliveryPolicyConfig = {
  cityFee: 5.00,
  regionalFee: 9.00,
  expressFee: 10.00,
  freeShippingThreshold: 100.00,
  freeShippingEnabled: true,
};

/**
 * Calculates authoritative order totals on the server.
 * Never trust total amounts submitted directly by clients or AI text.
 */
export function calculateOrderTotals(params: {
  items: Array<{ unitPrice: number; quantity: number }>;
  city?: string;
  isExpress?: boolean;
  discountAmount?: number;
  policy?: Partial<DeliveryPolicyConfig>;
}): CalculatedOrderTotals {
  const policy = { ...DEFAULT_POLICY, ...(params.policy || {}) };
  const items = params.items || [];

  // Calculate Subtotal with exact 2 decimal places rounding
  const subtotalRaw = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const subtotal = Math.round(subtotalRaw * 100) / 100;

  // Determine delivery type and fee
  const city = (params.city || '').toLowerCase().trim();
  const isTbilisi = city.includes('თბილისი') || city.includes('tbilisi') || city === '';
  
  let deliveryType: 'city' | 'regional' | 'express' = isTbilisi ? 'city' : 'regional';
  if (params.isExpress) {
    deliveryType = 'express';
  }

  let deliveryFee = 0;
  const isFreeShipping = policy.freeShippingEnabled && subtotal >= policy.freeShippingThreshold && deliveryType !== 'express';

  if (!isFreeShipping) {
    if (deliveryType === 'express') {
      deliveryFee = policy.expressFee;
    } else if (deliveryType === 'city') {
      deliveryFee = policy.cityFee;
    } else {
      deliveryFee = policy.regionalFee;
    }
  }

  const discount = Math.min(subtotal, Math.max(0, Math.round((params.discountAmount || 0) * 100) / 100));
  const tax = 0.00; // Prices in GEL already include VAT (დღგ) per Georgian law
  const total = Math.round((subtotal + deliveryFee - discount + tax) * 100) / 100;

  return {
    subtotal,
    deliveryFee,
    discount,
    tax,
    total,
    currency: 'GEL',
    isFreeShipping,
    deliveryType,
  };
}
