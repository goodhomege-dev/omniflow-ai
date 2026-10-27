import { describe, it, expect } from 'vitest';
import { validatePhoneNumber } from '../src/lib/validation/phone';
import { validateDeliveryAddress } from '../src/lib/validation/address';
import { calculateOrderTotals } from '../src/lib/orders/totals';
import { canTransitionOrder, assertValidTransition } from '../src/lib/orders/stateMachine';
import { parseAgentJson } from '../src/lib/agent/schema';

describe('Phone Number Validation', () => {
  it('validates 9-digit Georgian mobile starting with 5', () => {
    const res = validatePhoneNumber('599123456');
    expect(res.valid).toBe(true);
    expect(res.normalized).toBe('+995599123456');
    expect(res.national).toBe('599123456');
  });

  it('validates formatted international Georgian mobile', () => {
    const res = validatePhoneNumber('+995 599 12 34 56');
    expect(res.valid).toBe(true);
    expect(res.normalized).toBe('+995599123456');
  });

  it('rejects short numbers', () => {
    const res = validatePhoneNumber('12345');
    expect(res.valid).toBe(false);
  });

  it('rejects Georgian landlines for mobile courier contact', () => {
    // 032 2 12 34 56 is Tbilisi landline, does not start with 5
    const res = validatePhoneNumber('+995322123456');
    expect(res.valid).toBe(false);
  });
});

describe('Delivery Address Validation', () => {
  it('accepts city with valid street address', () => {
    const res = validateDeliveryAddress('თბილისი', 'რუსთაველის გამზ. 14, ბინა 8');
    expect(res.valid).toBe(true);
    expect(res.city).toBe('თბილისი');
  });

  it('rejects empty address or only city name', () => {
    const res = validateDeliveryAddress('თბილისი', 'თბილისი');
    expect(res.valid).toBe(false);
  });

  it('rejects missing address details', () => {
    const res = validateDeliveryAddress('ბათუმი', 'b');
    expect(res.valid).toBe(false);
  });
});

describe('Authoritative Order Totals', () => {
  it('calculates subtotal and adds city delivery fee for under 100 GEL', () => {
    const res = calculateOrderTotals({
      items: [{ unitPrice: 50.00, quantity: 1 }],
      city: 'თბილისი',
    });
    expect(res.subtotal).toBe(50.00);
    expect(res.deliveryFee).toBe(5.00);
    expect(res.total).toBe(55.00);
    expect(res.isFreeShipping).toBe(false);
  });

  it('applies free shipping for subtotal >= 100 GEL', () => {
    const res = calculateOrderTotals({
      items: [{ unitPrice: 249.00, quantity: 1 }],
      city: 'თბილისი',
    });
    expect(res.subtotal).toBe(249.00);
    expect(res.deliveryFee).toBe(0.00);
    expect(res.total).toBe(249.00);
    expect(res.isFreeShipping).toBe(true);
  });

  it('applies regional delivery fee for non-Tbilisi city', () => {
    const res = calculateOrderTotals({
      items: [{ unitPrice: 40.00, quantity: 1 }],
      city: 'ქუთაისი',
    });
    expect(res.deliveryFee).toBe(9.00);
    expect(res.total).toBe(49.00);
  });

  it('applies express delivery fee even when above free shipping threshold', () => {
    const res = calculateOrderTotals({
      items: [{ unitPrice: 200.00, quantity: 1 }],
      city: 'თბილისი',
      isExpress: true,
    });
    expect(res.deliveryFee).toBe(10.00);
    expect(res.total).toBe(210.00);
    expect(res.deliveryType).toBe('express');
  });
});

describe('Order State Machine', () => {
  it('allows valid progression: DRAFT -> AWAITING_DETAILS -> AWAITING_PAYMENT -> CONFIRMED_PAID', () => {
    expect(canTransitionOrder('DRAFT', 'AWAITING_DETAILS')).toBe(true);
    expect(canTransitionOrder('AWAITING_DETAILS', 'AWAITING_PAYMENT')).toBe(true);
    expect(canTransitionOrder('AWAITING_PAYMENT', 'CONFIRMED_PAID')).toBe(true);
  });

  it('blocks illegal status jumps', () => {
    expect(canTransitionOrder('DRAFT', 'SHIPPED')).toBe(false);
    expect(canTransitionOrder('AWAITING_PAYMENT', 'DELIVERED')).toBe(false);
    expect(() => assertValidTransition('DRAFT', 'DELIVERED')).toThrow();
  });
});

describe('Agent Response JSON Contract', () => {
  it('parses valid JSON response', () => {
    const raw = JSON.stringify({
      replyText: 'გამარჯობა! რით შემიძლია დაგეხმაროთ?',
      platform: 'telegram',
      intent: 'general_question',
      isOrderReady: false,
      isEscalate: false,
      missingFields: [],
      order: null,
      actions: [],
    });
    const parsed = parseAgentJson(raw);
    expect(parsed.success).toBe(true);
  });

  it('strips markdown code fences cleanly', () => {
    const raw = '```json\n{"replyText":"ტესტი","platform":"whatsapp","intent":"order","isOrderReady":false,"isEscalate":false,"missingFields":["phone"],"order":null,"actions":[]}\n```';
    const parsed = parseAgentJson(raw);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.replyText).toBe('ტესტი');
      expect(parsed.data.missingFields).toEqual(['phone']);
    }
  });

  it('rejects invalid JSON syntax safely', () => {
    const parsed = parseAgentJson('{ bad_json: true');
    expect(parsed.success).toBe(false);
  });
});
