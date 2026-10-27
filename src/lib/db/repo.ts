export interface ProductRecord {
  id: string;
  sku: string;
  name: string;
  name_ka?: string | null;
  description?: string | null;
  description_ka?: string | null;
  category: string;
  base_price: number;
  currency: string;
  is_active: boolean;
  warranty_info?: string | null;
  variants: ProductVariantRecord[];
}

export interface ProductVariantRecord {
  id: string;
  productId: string;
  variantSku: string;
  name: string;
  priceOverride?: number | null;
  stockQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  isAvailable: boolean;
}

export interface ConversationRecord {
  id: string;
  channel: 'messenger' | 'whatsapp' | 'telegram';
  channelIdentityId: string;
  isHumanAssigned: boolean;
  aiPaused: boolean;
  assignedToUserId?: string | null;
  currentIntent: string;
  pendingSummary?: any | null;
  isClosed: boolean;
  lastMessageAt: Date;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  channel: 'messenger' | 'whatsapp' | 'telegram';
  platformMessageId: string;
  senderType: 'customer' | 'ai_agent' | 'human_agent' | 'system';
  content: string;
  attachments: any[];
  isRead: boolean;
  createdAt: Date;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  conversationId?: string | null;
  customerId?: string | null;
  channel: 'messenger' | 'whatsapp' | 'telegram';
  status: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  recipientName?: string | null;
  recipientPhone?: string | null;
  deliveryCity?: string | null;
  deliveryAddress?: string | null;
  deliveryNotes?: string | null;
  confirmedByCustomerAt?: Date | null;
  createdAt: Date;
  items?: Array<{
    variantId: string;
    productName: string;
    variantName?: string | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;
}

export interface BusinessConfigMap {
  [key: string]: any;
}

export interface DatabaseRepository {
  // Config
  getBusinessConfig(): Promise<BusinessConfigMap>;
  setBusinessConfig(key: string, value: any, updatedBy?: string): Promise<void>;

  // Products
  lookupProducts(query?: string, category?: string): Promise<ProductRecord[]>;
  getProductVariant(variantId: string): Promise<ProductVariantRecord | null>;
  createProduct(data: Partial<ProductRecord>): Promise<ProductRecord>;
  updateProduct(id: string, data: Partial<ProductRecord>): Promise<ProductRecord>;
  upsertVariants(productId: string, variants: Array<Partial<ProductVariantRecord>>): Promise<void>;

  // Conversations & Messages
  listConversations(limit?: number): Promise<ConversationRecord[]>;
  getOrCreateConversation(channel: 'messenger' | 'whatsapp' | 'telegram', platformUserId: string, displayName?: string): Promise<{ conversation: ConversationRecord; isNew: boolean }>;
  getConversationHistory(conversationId: string, limit?: number): Promise<MessageRecord[]>;
  saveMessage(msg: {
    conversationId: string;
    channel: 'messenger' | 'whatsapp' | 'telegram';
    platformMessageId: string;
    senderType: 'customer' | 'ai_agent' | 'human_agent' | 'system';
    content: string;
    attachments?: any[];
  }): Promise<{ message: MessageRecord; isDuplicate: boolean }>;
  updateConversation(id: string, data: Partial<ConversationRecord>): Promise<void>;

  // Orders
  listOrders(limit?: number): Promise<OrderRecord[]>;
  getActiveDraftOrder(conversationId: string): Promise<OrderRecord | null>;
  getOrderById(id: string): Promise<OrderRecord | null>;
  getOrderByNumber(orderNumber: string): Promise<OrderRecord | null>;
  createOrderTransaction(params: {
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
  }): Promise<{ success: boolean; orderId?: string; isDuplicate?: boolean; error?: string }>;
  transitionOrderStatus(orderId: string, toStatus: string, actor: string, reason?: string): Promise<{ success: boolean; error?: string }>;

  // Payments
  recordPaymentEvent(data: {
    orderId: string;
    provider: string;
    providerTxId?: string;
    amount: number;
    status: string;
    extracted?: any;
    duplicateOf?: string;
    amountMatches?: boolean;
    rawPayload?: any;
  }): Promise<{ id: string; duplicate: boolean }>;
  getPendingPaymentReviews(): Promise<any[]>;
  verifyPaymentManually(eventId: string, outcome: 'CONFIRMED_PAID' | 'PAYMENT_FAILED', verifiedBy: string): Promise<{ success: boolean }>;

  // Handoff & Tickets
  createHandoffTicket(conversationId: string, reason: string, priority?: string): Promise<{ ticketId: string }>;
  getOpenHandoffTickets(): Promise<any[]>;

  // Outbox
  queueOutboxMessage(channel: 'messenger' | 'whatsapp' | 'telegram', recipientId: string, content: string, attachments?: any[]): Promise<string>;
  getPendingOutboxMessages(limit?: number): Promise<Array<{ id: string; channel: string; recipientId: string; content: string; attempts: number }>>;
  markOutboxSent(id: string): Promise<void>;
  markOutboxFailed(id: string, error: string): Promise<void>;

  // Audit
  recordAudit(actor: string, action: string, entity: string, entityId?: string, oldVals?: any, newVals?: any, correlationId?: string): Promise<void>;
  getAuditLogs(limit?: number): Promise<any[]>;
}
