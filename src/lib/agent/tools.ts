import { DatabaseRepository } from '../db/repo';
import { validatePhoneNumber } from '../validation/phone';
import { validateDeliveryAddress } from '../validation/address';
import { calculateOrderTotals } from '../orders/totals';

export interface ToolExecutionResult {
  toolName: string;
  result: any;
  error?: string;
}

export class ToolExecutor {
  constructor(private repo: DatabaseRepository) {}

  async execute(toolName: string, args: Record<string, any>, context: { conversationId: string; channel: 'messenger' | 'whatsapp' | 'telegram' }): Promise<ToolExecutionResult> {
    try {
      switch (toolName) {
        case 'LOOKUP_PRODUCT': {
          const products = await this.repo.lookupProducts(args.query, args.category);
          return {
            toolName,
            result: {
              found: products.length > 0,
              count: products.length,
              products: products.map(p => ({
                id: p.id,
                name: p.name_ka || p.name,
                sku: p.sku,
                basePrice: p.base_price,
                currency: p.currency,
                warranty: p.warranty_info,
                variants: p.variants.map(v => ({
                  variantId: v.id,
                  name: v.name,
                  price: v.priceOverride || p.base_price,
                  availableStock: v.availableQuantity,
                  inStock: v.availableQuantity > 0,
                })),
              })),
            },
          };
        }

        case 'CHECK_STOCK': {
          const variant = await this.repo.getProductVariant(args.variantId);
          if (!variant) {
            return { toolName, result: { found: false, inStock: false, availableQuantity: 0 } };
          }
          return {
            toolName,
            result: {
              found: true,
              variantId: variant.id,
              name: variant.name,
              availableQuantity: variant.availableQuantity,
              inStock: variant.availableQuantity > 0,
            },
          };
        }

        case 'CALCULATE_ORDER_TOTAL': {
          const config = await this.repo.getBusinessConfig();
          const deliveryFees = config.DELIVERY_FEE_POLICY || {};
          const freeShip = config.FREE_SHIPPING_POLICY || {};

          const totals = calculateOrderTotals({
            items: args.items || [],
            city: args.city,
            isExpress: args.isExpress,
            discountAmount: args.discountAmount,
            policy: {
              cityFee: deliveryFees.city ?? 5.00,
              regionalFee: deliveryFees.regional ?? 9.00,
              expressFee: deliveryFees.express ?? 10.00,
              freeShippingThreshold: freeShip.threshold ?? 100.00,
              freeShippingEnabled: freeShip.enabled ?? true,
            },
          });

          // Save pending summary on conversation for gate check
          await this.repo.updateConversation(context.conversationId, {
            pendingSummary: {
              ...totals,
              items: args.items,
              timestamp: Date.now(),
            },
          });

          return { toolName, result: totals };
        }

        case 'VALIDATE_PHONE': {
          const phoneRes = validatePhoneNumber(args.phone);
          return { toolName, result: phoneRes };
        }

        case 'VALIDATE_ADDRESS': {
          const addrRes = validateDeliveryAddress(args.city, args.address);
          return { toolName, result: addrRes };
        }

        case 'CREATE_ORDER': {
          // Strict server gate: validate phone
          const phoneRes = validatePhoneNumber(args.recipientPhone);
          if (!phoneRes.valid) {
            return {
              toolName,
              result: { success: false, error: 'INVALID_PHONE', message: phoneRes.error },
            };
          }

          // Strict server gate: validate address
          const addrRes = validateDeliveryAddress(args.city, args.address);
          if (!addrRes.valid) {
            return {
              toolName,
              result: { success: false, error: 'INVALID_ADDRESS', message: addrRes.error },
            };
          }

          // Normalize items
          const rawItems = (args.items && args.items.length > 0)
            ? args.items
            : (args.variantId ? [{ variantId: args.variantId, quantity: args.quantity || 1, unitPrice: args.unitPrice || 0, productName: args.productName }] : []);

          if (rawItems.length === 0) {
            return {
              toolName,
              result: { success: false, error: 'NO_ITEMS', message: 'შეკვეთა უნდა შეიცავდეს მინიმუმ 1 პროდუქტს' },
            };
          }

          // Strict server gate: calculate totals authoritatively on server
          const config = await this.repo.getBusinessConfig();
          const totals = calculateOrderTotals({
            items: rawItems,
            city: addrRes.city,
            isExpress: args.isExpress,
            policy: {
              cityFee: config.DELIVERY_FEE_POLICY?.city ?? 5.00,
              regionalFee: config.DELIVERY_FEE_POLICY?.regional ?? 9.00,
              expressFee: config.DELIVERY_FEE_POLICY?.express ?? 10.00,
              freeShippingThreshold: config.FREE_SHIPPING_POLICY?.threshold ?? 100.00,
              freeShippingEnabled: config.FREE_SHIPPING_POLICY?.enabled ?? true,
            },
          });

          const orderNum = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;

          const txResult = await this.repo.createOrderTransaction({
            orderNumber: orderNum,
            conversationId: context.conversationId,
            channel: context.channel,
            subtotal: totals.subtotal,
            deliveryFee: totals.deliveryFee,
            discount: totals.discount,
            total: totals.total,
            recipientName: args.recipientName || 'მომხმარებელი',
            recipientPhone: phoneRes.normalized!,
            city: addrRes.city!,
            address: addrRes.address!,
            notes: args.notes,
            paymentMethod: args.paymentMethod || 'BANK_TRANSFER_TBC',
            items: rawItems.map((i: any) => ({
              variantId: i.variantId,
              productName: i.productName || 'პროდუქტი',
              variantName: i.variantName,
              quantity: i.quantity,
              unitPrice: i.unitPrice,
              totalPrice: i.quantity * i.unitPrice,
            })),
            idempotencyKey: `${context.conversationId}-${totals.total}-${Date.now().toString().slice(0, 6)}`,
          });

          if (!txResult.success) {
            return { toolName, result: { success: false, error: txResult.error } };
          }

          // Clear pending summary
          await this.repo.updateConversation(context.conversationId, { pendingSummary: null });

          return {
            toolName,
            result: {
              success: true,
              orderId: txResult.orderId,
              orderNumber: orderNum,
              total: totals.total,
              currency: totals.currency,
              status: 'AWAITING_PAYMENT',
              paymentMethod: args.paymentMethod || 'BANK_TRANSFER_TBC',
            },
          };
        }

        case 'GET_ORDER_STATUS': {
          const order = await this.repo.getOrderByNumber(args.orderNumber);
          if (!order) {
            return { toolName, result: { found: false, message: 'შეკვეთა ამ ნომრით ვერ მოიძებნა' } };
          }
          return {
            toolName,
            result: {
              found: true,
              orderNumber: order.orderNumber,
              status: order.status,
              paymentStatus: order.paymentStatus,
              totalAmount: order.totalAmount,
              currency: order.currency,
              createdAt: order.createdAt,
            },
          };
        }

        case 'REQUEST_HUMAN_HANDOFF': {
          const ticket = await this.repo.createHandoffTicket(context.conversationId, args.reason || 'მომხმარებელმა მოითხოვა ოპერატორი', args.priority);
          // Pause AI in conversation
          await this.repo.updateConversation(context.conversationId, {
            isHumanAssigned: true,
            aiPaused: true,
          });
          return {
            toolName,
            result: {
              success: true,
              ticketId: ticket.ticketId,
              message: 'საკითხი გადაეცა ადამიან ოპერატორს.',
            },
          };
        }

        default:
          return { toolName, result: null, error: `Unknown tool: ${toolName}` };
      }
    } catch (err) {
      return { toolName, result: null, error: (err as Error).message };
    }
  }
}
