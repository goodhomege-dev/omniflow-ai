import { DatabaseRepository, ProductRecord, ProductVariantRecord, ConversationRecord, MessageRecord, OrderRecord, BusinessConfigMap } from './repo';

export class InMemoryRepository implements DatabaseRepository {
  public config: BusinessConfigMap = {
    BRAND_NAME: 'TechStore Georgia',
    BUSINESS_TYPE: 'პრემიუმ ელექტრონიკისა და აქსესუარების ონლაინ მაღაზია',
    CONTACT_INFO: '+995 32 2 100 200, info@techstore.ge, თბილისი, ჭავჭავაძის გამზ. 25',
    WORKING_HOURS: 'ორშაბათი - კვირა: 10:00 - 20:00 (Asia/Tbilisi)',
    HUMAN_HANDOFF_POLICY: 'ოპერატორზე გადამისამართება ხდება მომხმარებლის მოთხოვნისას, რთული საჩივრის დროს.',
    PRODUCT_CATALOG: 'ხელმისაწვდომია LOOKUP_PRODUCT ხელსაწყოთი შიდა ბაზიდან',
    PRICING_POLICY: 'ყველა ფასი ფიქსირებულია ლარში (GEL), მოიცავს დღგ-ს.',
    DELIVERY_POLICY: 'მიწოდება ხორციელდება მთელი საქართველოს მასშტაბით.',
    CITY_DELIVERY_POLICY: 'თბილისში სტანდარტული მიწოდება ხორციელდება მეორე დღეს.',
    REGIONAL_DELIVERY_POLICY: 'რეგიონებში მიწოდება 2-3 სამუშაო დღეში.',
    EXPRESS_DELIVERY_POLICY: 'თბილისში იმავე დღეს მიწოდება 4-5 საათში.',
    DELIVERY_FEE_POLICY: { city: 5.00, regional: 9.00, express: 10.00 },
    FREE_SHIPPING_POLICY: { threshold: 100.00, enabled: true },
    DELIVERY_TIMEFRAME: 'თბილისი: 24 საათი; რეგიონები: 48-72 საათი',
    RETURN_AND_WARRANTY_POLICY: 'პროდუქციაზე ვრცელდება 1 წლიანი ოფიციალური გარანტია.',
    PAYMENT_METHODS: ['BANK_TRANSFER_TBC', 'BANK_TRANSFER_BOG'],
    ENABLE_COD: false,
    BANK_DETAILS: {
      tbc_iban: 'GE00TB0000000000000000',
      bog_iban: 'GE00BG0000000000000000',
      recipient_name: 'შპს ტექ სთორ ჯორჯია',
      payment_description: 'შეკვეთის გადახდა',
    },
    ACTIVE_PROMOTIONS: 'უფასო მიწოდება 100 ლარზე მეტ შენაძენზე.',
  };

  public products: ProductRecord[] = [
    {
      id: 'prod-airpods-3',
      sku: 'AIRPODS-3',
      name: 'Apple AirPods 3rd Gen',
      name_ka: 'Apple AirPods 3',
      description: 'Spatial audio with dynamic head tracking',
      category: 'Audio',
      base_price: 249.00,
      currency: 'GEL',
      is_active: true,
      warranty_info: '1 წლიანი ოფიციალური გარანტია',
      variants: [
        {
          id: 'var-airpods-3-wht',
          productId: 'prod-airpods-3',
          variantSku: 'AIRPODS-3-WHT',
          name: 'თეთრი (White)',
          stockQuantity: 10,
          reservedQuantity: 0,
          availableQuantity: 10,
          lowStockThreshold: 3,
          isAvailable: true,
        },
      ],
    },
    {
      id: 'prod-iphone-15',
      sku: 'IPHONE-15',
      name: 'Apple iPhone 15',
      name_ka: 'Apple iPhone 15',
      description: 'A16 Bionic chip, 48MP main camera',
      category: 'Smartphones',
      base_price: 2499.00,
      currency: 'GEL',
      is_active: true,
      warranty_info: '1 წლიანი ოფიციალური გარანტია',
      variants: [
        {
          id: 'var-iphone-15-blk',
          productId: 'prod-iphone-15',
          variantSku: 'IPHONE15-128-BLK',
          name: '128GB შავი',
          stockQuantity: 1,
          reservedQuantity: 0,
          availableQuantity: 1,
          lowStockThreshold: 2,
          isAvailable: true,
        },
      ],
    },
  ];

  public conversations: Map<string, ConversationRecord> = new Map();
  public messages: MessageRecord[] = [];
  public orders: Map<string, OrderRecord> = new Map();
  public paymentEvents: any[] = [];
  public handoffTickets: any[] = [];
  public outbox: any[] = [];
  public auditLogs: any[] = [];

  async getBusinessConfig(): Promise<BusinessConfigMap> {
    return { ...this.config };
  }

  async setBusinessConfig(key: string, value: any): Promise<void> {
    this.config[key] = value;
  }

  async lookupProducts(query?: string, category?: string): Promise<ProductRecord[]> {
    return this.products.filter(p => {
      if (!p.is_active) return false;
      if (category && p.category.toLowerCase() !== category.toLowerCase()) return false;
      if (query) {
        const q = query.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q) || (p.name_ka && p.name_ka.toLowerCase().includes(q));
        const matchesSku = p.sku.toLowerCase().includes(q);
        return matchesName || matchesSku;
      }
      return true;
    });
  }

  async getProductVariant(variantId: string): Promise<ProductVariantRecord | null> {
    for (const p of this.products) {
      const v = p.variants.find(x => x.id === variantId);
      if (v) return v;
    }
    return null;
  }

  async createProduct(data: Partial<ProductRecord>): Promise<ProductRecord> {
    const id = `prod-${Date.now()}`;
    const prod: ProductRecord = {
      id,
      sku: data.sku || `SKU-${Date.now()}`,
      name: data.name || 'New Product',
      name_ka: data.name_ka || null,
      description: data.description || null,
      description_ka: data.description_ka || null,
      category: data.category || 'General',
      base_price: data.base_price || 0,
      currency: data.currency || 'GEL',
      is_active: data.is_active ?? true,
      warranty_info: data.warranty_info || null,
      variants: data.variants || [],
    };
    this.products.push(prod);
    return prod;
  }

  async updateProduct(id: string, data: Partial<ProductRecord>): Promise<ProductRecord> {
    const prod = this.products.find(p => p.id === id);
    if (!prod) throw new Error('Product not found');
    Object.assign(prod, data);
    return prod;
  }

  async upsertVariants(productId: string, variants: Array<Partial<ProductVariantRecord>>): Promise<void> {
    const prod = this.products.find(p => p.id === productId);
    if (!prod) throw new Error('Product not found');
    for (const v of variants) {
      const existing = prod.variants.find(x => x.id === v.id);
      if (existing) {
        Object.assign(existing, v);
      } else {
        prod.variants.push({
          id: v.id || `var-${Date.now()}`,
          productId,
          variantSku: v.variantSku || `SKU-${Date.now()}`,
          name: v.name || 'Default Variant',
          stockQuantity: v.stockQuantity || 0,
          reservedQuantity: v.reservedQuantity || 0,
          availableQuantity: (v.stockQuantity || 0) - (v.reservedQuantity || 0),
          lowStockThreshold: v.lowStockThreshold || 3,
          isAvailable: v.isAvailable ?? true,
        });
      }
    }
  }

  async listConversations(limit = 100): Promise<ConversationRecord[]> {
    const list = Array.from(this.conversations.values());
    list.sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
    return list.slice(0, limit);
  }

  async getOrCreateConversation(channel: 'messenger' | 'whatsapp' | 'telegram', platformUserId: string, displayName?: string): Promise<{ conversation: ConversationRecord; isNew: boolean }> {
    const key = `${channel}:${platformUserId}`;
    let conv = this.conversations.get(key);
    let isNew = false;
    if (!conv) {
      isNew = true;
      conv = {
        id: crypto.randomUUID(),
        channel,
        channelIdentityId: key,
        isHumanAssigned: false,
        aiPaused: false,
        currentIntent: 'general_question',
        isClosed: false,
        lastMessageAt: new Date(),
      };
      this.conversations.set(key, conv);
    }
    return { conversation: conv, isNew };
  }

  async getConversationHistory(conversationId: string, limit = 15): Promise<MessageRecord[]> {
    return this.messages
      .filter(m => m.conversationId === conversationId)
      .slice(-limit);
  }

  async saveMessage(msg: {
    conversationId: string;
    channel: 'messenger' | 'whatsapp' | 'telegram';
    platformMessageId: string;
    senderType: 'customer' | 'ai_agent' | 'human_agent' | 'system';
    content: string;
    attachments?: any[];
  }): Promise<{ message: MessageRecord; isDuplicate: boolean }> {
    const isDup = this.messages.some(m => m.channel === msg.channel && m.platformMessageId === msg.platformMessageId);
    if (isDup) {
      const existing = this.messages.find(m => m.channel === msg.channel && m.platformMessageId === msg.platformMessageId)!;
      return { message: existing, isDuplicate: true };
    }

    const newMsg: MessageRecord = {
      id: crypto.randomUUID(),
      conversationId: msg.conversationId,
      channel: msg.channel,
      platformMessageId: msg.platformMessageId,
      senderType: msg.senderType,
      content: msg.content,
      attachments: msg.attachments || [],
      isRead: false,
      createdAt: new Date(),
    };
    this.messages.push(newMsg);
    return { message: newMsg, isDuplicate: false };
  }

  async updateConversation(id: string, data: Partial<ConversationRecord>): Promise<void> {
    for (const [k, v] of this.conversations.entries()) {
      if (v.id === id) {
        Object.assign(v, data);
        this.conversations.set(k, v);
        break;
      }
    }
  }

  async listOrders(limit = 100): Promise<OrderRecord[]> {
    const list = Array.from(this.orders.values());
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return list.slice(0, limit);
  }

  async getActiveDraftOrder(conversationId: string): Promise<OrderRecord | null> {
    for (const order of this.orders.values()) {
      if (order.conversationId === conversationId && ['DRAFT', 'AWAITING_DETAILS', 'AWAITING_PAYMENT'].includes(order.status)) {
        return order;
      }
    }
    return null;
  }

  async getOrderById(id: string): Promise<OrderRecord | null> {
    return this.orders.get(id) || null;
  }

  async getOrderByNumber(orderNumber: string): Promise<OrderRecord | null> {
    for (const o of this.orders.values()) {
      if (o.orderNumber === orderNumber) return o;
    }
    return null;
  }

  async createOrderTransaction(params: {
    orderNumber: string;
    conversationId: string;
    channel: 'messenger' | 'whatsapp' | 'telegram';
    subtotal: number;
    deliveryFee: number;
    discount: number;
    total: number;
    recipientName: string;
    recipientPhone: string;
    city: string;
    address: string;
    notes?: string;
    paymentMethod: string;
    items: Array<{
      variantId: string;
      productName: string;
      variantName?: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }>;
    idempotencyKey?: string;
  }): Promise<{ success: boolean; orderId?: string; isDuplicate?: boolean; error?: string }> {
    // Check stock for each variant
    for (const item of params.items) {
      const variant = await this.getProductVariant(item.variantId);
      if (!variant) return { success: false, error: `Variant not found: ${item.variantId}` };
      const avail = variant.stockQuantity - variant.reservedQuantity;
      if (avail < item.quantity) {
        return { success: false, error: `INSUFFICIENT_STOCK: only ${avail} left` };
      }
    }

    // Deduct available stock (reserve)
    for (const item of params.items) {
      const variant = await this.getProductVariant(item.variantId);
      if (variant) {
        variant.reservedQuantity += item.quantity;
        variant.availableQuantity = variant.stockQuantity - variant.reservedQuantity;
      }
    }

    const orderId = `ord-${Date.now()}`;
    const order: OrderRecord = {
      id: orderId,
      orderNumber: params.orderNumber,
      conversationId: params.conversationId,
      channel: params.channel,
      status: 'AWAITING_PAYMENT',
      paymentStatus: 'UNVERIFIED',
      paymentMethod: params.paymentMethod,
      subtotal: params.subtotal,
      deliveryFee: params.deliveryFee,
      discountAmount: params.discount,
      totalAmount: params.total,
      currency: 'GEL',
      recipientName: params.recipientName,
      recipientPhone: params.recipientPhone,
      deliveryCity: params.city,
      deliveryAddress: params.address,
      deliveryNotes: params.notes || null,
      confirmedByCustomerAt: new Date(),
      createdAt: new Date(),
      items: params.items,
    };

    this.orders.set(orderId, order);
    await this.recordAudit('SYSTEM', 'ORDER_CREATED', 'orders', orderId, null, { total: params.total });

    return { success: true, orderId, isDuplicate: false };
  }

  async transitionOrderStatus(orderId: string, toStatus: string, actor: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    const order = this.orders.get(orderId);
    if (!order) return { success: false, error: 'Order not found' };
    const oldStatus = order.status;
    order.status = toStatus;
    await this.recordAudit(actor, 'ORDER_STATUS_CHANGED', 'orders', orderId, { status: oldStatus }, { status: toStatus, reason });
    return { success: true };
  }

  async recordPaymentEvent(data: {
    orderId: string;
    provider: string;
    providerTxId?: string;
    amount: number;
    status: string;
    extracted?: any;
    duplicateOf?: string;
    amountMatches?: boolean;
    rawPayload?: any;
  }): Promise<{ id: string; duplicate: boolean }> {
    const id = `pay-${Date.now()}`;
    const duplicate = !!(data.providerTxId && this.paymentEvents.some(p => p.providerTxId === data.providerTxId));
    this.paymentEvents.push({ id, ...data, duplicate });
    return { id, duplicate };
  }

  async getPendingPaymentReviews(): Promise<any[]> {
    return this.paymentEvents.filter(p => p.status === 'PAYMENT_REVIEW');
  }

  async verifyPaymentManually(eventId: string, outcome: 'CONFIRMED_PAID' | 'PAYMENT_FAILED', verifiedBy: string): Promise<{ success: boolean }> {
    const ev = this.paymentEvents.find(p => p.id === eventId);
    if (!ev) return { success: false };
    ev.status = outcome;
    ev.verifiedBy = verifiedBy;
    ev.verifiedAt = new Date();

    if (outcome === 'CONFIRMED_PAID' && ev.orderId) {
      const order = this.orders.get(ev.orderId);
      if (order) {
        order.paymentStatus = 'CONFIRMED_PAID';
        order.status = 'CONFIRMED_PAID';
      }
    }
    return { success: true };
  }

  async createHandoffTicket(conversationId: string, reason: string, priority = 'MEDIUM'): Promise<{ ticketId: string }> {
    const ticketId = `ticket-${Date.now()}`;
    this.handoffTickets.push({ ticketId, conversationId, reason, priority, status: 'PENDING', createdAt: new Date() });
    return { ticketId };
  }

  async getOpenHandoffTickets(): Promise<any[]> {
    return this.handoffTickets.filter(t => t.status === 'PENDING');
  }

  async queueOutboxMessage(channel: 'messenger' | 'whatsapp' | 'telegram', recipientId: string, content: string, attachments: any[] = []): Promise<string> {
    const id = `out-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    this.outbox.push({ id, channel, recipientId, content, attachments, status: 'PENDING', attempts: 0 });
    return id;
  }

  async getPendingOutboxMessages(): Promise<Array<{ id: string; channel: string; recipientId: string; content: string; attempts: number }>> {
    return this.outbox.filter(m => m.status === 'PENDING');
  }

  async markOutboxSent(id: string): Promise<void> {
    const item = this.outbox.find(m => m.id === id);
    if (item) item.status = 'SENT';
  }

  async markOutboxFailed(id: string, error: string): Promise<void> {
    const item = this.outbox.find(m => m.id === id);
    if (item) {
      item.attempts += 1;
      item.lastError = error;
      if (item.attempts >= 5) item.status = 'FAILED';
    }
  }

  async recordAudit(actor: string, action: string, entity: string, entityId?: string, oldVals?: any, newVals?: any, correlationId?: string): Promise<void> {
    this.auditLogs.push({
      id: `audit-${Date.now()}`,
      actor,
      action,
      entity,
      entityId,
      oldVals,
      newVals,
      correlationId,
      createdAt: new Date(),
    });
  }

  async getAuditLogs(limit = 50): Promise<any[]> {
    return this.auditLogs.slice(-limit).reverse();
  }
}
