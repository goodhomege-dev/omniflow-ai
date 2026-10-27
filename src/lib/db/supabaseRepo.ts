import { SupabaseClient } from '@supabase/supabase-js';
import { DatabaseRepository, ProductRecord, ProductVariantRecord, ConversationRecord, MessageRecord, OrderRecord, BusinessConfigMap } from './repo';

export class SupabaseRepository implements DatabaseRepository {
  constructor(private client: SupabaseClient) {}

  async getBusinessConfig(): Promise<BusinessConfigMap> {
    const { data, error } = await this.client.from('business_config').select('key, value');
    if (error) throw error;
    const map: BusinessConfigMap = {};
    (data || []).forEach(row => {
      map[row.key] = row.value;
    });
    return map;
  }

  async setBusinessConfig(key: string, value: any, updatedBy = 'admin'): Promise<void> {
    const { error } = await this.client
      .from('business_config')
      .upsert({ key, value, updated_by: updatedBy, updated_at: new Date().toISOString() });
    if (error) throw error;
  }

  async lookupProducts(query?: string, category?: string): Promise<ProductRecord[]> {
    let builder = this.client
      .from('products')
      .select('*, variants:product_variants(*)')
      .eq('is_active', true);

    if (category) {
      builder = builder.ilike('category', category);
    }
    if (query) {
      builder = builder.or(`name.ilike.%${query}%,name_ka.ilike.%${query}%,sku.ilike.%${query}%`);
    }

    const { data, error } = await builder;
    if (error) throw error;

    return (data || []).map(p => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      name_ka: p.name_ka,
      description: p.description,
      description_ka: p.description_ka,
      category: p.category,
      base_price: Number(p.base_price),
      currency: p.currency,
      is_active: p.is_active,
      warranty_info: p.warranty_info,
      variants: (p.variants || []).map((v: any) => ({
        id: v.id,
        productId: v.product_id,
        variantSku: v.variant_sku,
        name: v.name,
        priceOverride: v.price_override ? Number(v.price_override) : null,
        stockQuantity: v.stock_quantity,
        reservedQuantity: v.reserved_quantity,
        availableQuantity: v.stock_quantity - v.reserved_quantity,
        lowStockThreshold: v.low_stock_threshold,
        isAvailable: v.is_available,
      })),
    }));
  }

  async getProductVariant(variantId: string): Promise<ProductVariantRecord | null> {
    const { data, error } = await this.client
      .from('product_variants')
      .select('*')
      .eq('id', variantId)
      .single();

    if (error || !data) return null;
    return {
      id: data.id,
      productId: data.product_id,
      variantSku: data.variant_sku,
      name: data.name,
      priceOverride: data.price_override ? Number(data.price_override) : null,
      stockQuantity: data.stock_quantity,
      reservedQuantity: data.reserved_quantity,
      availableQuantity: data.stock_quantity - data.reserved_quantity,
      lowStockThreshold: data.low_stock_threshold,
      isAvailable: data.is_available,
    };
  }

  async createProduct(data: Partial<ProductRecord>): Promise<ProductRecord> {
    const { data: inserted, error } = await this.client
      .from('products')
      .insert({
        sku: data.sku,
        name: data.name,
        name_ka: data.name_ka,
        description: data.description,
        description_ka: data.description_ka,
        category: data.category,
        base_price: data.base_price,
        currency: data.currency || 'GEL',
        warranty_info: data.warranty_info,
      })
      .select()
      .single();
    if (error) throw error;
    return { ...inserted, variants: [] };
  }

  async updateProduct(id: string, data: Partial<ProductRecord>): Promise<ProductRecord> {
    const { data: updated, error } = await this.client
      .from('products')
      .update(data)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return updated;
  }

  async upsertVariants(productId: string, variants: Array<Partial<ProductVariantRecord>>): Promise<void> {
    for (const v of variants) {
      await this.client.from('product_variants').upsert({
        id: v.id,
        product_id: productId,
        variant_sku: v.variantSku,
        name: v.name,
        price_override: v.priceOverride,
        stock_quantity: v.stockQuantity,
        low_stock_threshold: v.lowStockThreshold || 5,
        is_available: v.isAvailable ?? true,
      });
    }
  }

  async listConversations(limit = 100): Promise<ConversationRecord[]> {
    const { data } = await this.client
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false })
      .limit(limit);

    return (data || []).map(conv => ({
      id: conv.id,
      channel: conv.channel,
      channelIdentityId: conv.channel_identity_id,
      isHumanAssigned: conv.is_human_assigned,
      aiPaused: conv.ai_paused,
      assignedToUserId: conv.assigned_to_user_id,
      currentIntent: conv.current_intent,
      pendingSummary: conv.pending_summary,
      isClosed: conv.is_closed,
      lastMessageAt: new Date(conv.last_message_at),
    }));
  }

  async getOrCreateConversation(channel: 'messenger' | 'whatsapp' | 'telegram', platformUserId: string, displayName?: string): Promise<{ conversation: ConversationRecord; isNew: boolean }> {
    // 1. Find or create channel_identities
    let { data: identity } = await this.client
      .from('channel_identities')
      .select('id')
      .eq('channel', channel)
      .eq('platform_user_id', platformUserId)
      .single();

    if (!identity) {
      const { data: newIdent, error: identErr } = await this.client
        .from('channel_identities')
        .insert({ channel, platform_user_id: platformUserId, display_name: displayName })
        .select('id')
        .single();
      if (identErr) throw identErr;
      identity = newIdent;
    }

    // 2. Find active conversation
    let { data: conv } = await this.client
      .from('conversations')
      .select('*')
      .eq('channel_identity_id', identity.id)
      .eq('is_closed', false)
      .order('last_message_at', { ascending: false })
      .limit(1)
      .single();

    let isNew = false;
    if (!conv) {
      isNew = true;
      const { data: newConv, error: convErr } = await this.client
        .from('conversations')
        .insert({
          channel_identity_id: identity.id,
          channel,
          is_human_assigned: false,
          ai_paused: false,
        })
        .select('*')
        .single();
      if (convErr) throw convErr;
      conv = newConv;
    }

    return {
      conversation: {
        id: conv.id,
        channel: conv.channel,
        channelIdentityId: conv.channel_identity_id,
        isHumanAssigned: conv.is_human_assigned,
        aiPaused: conv.ai_paused,
        assignedToUserId: conv.assigned_to_user_id,
        currentIntent: conv.current_intent,
        pendingSummary: conv.pending_summary,
        isClosed: conv.is_closed,
        lastMessageAt: new Date(conv.last_message_at),
      },
      isNew,
    };
  }

  async getConversationHistory(conversationId: string, limit = 15): Promise<MessageRecord[]> {
    const { data, error } = await this.client
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(m => ({
      id: m.id,
      conversationId: m.conversation_id,
      channel: m.channel,
      platformMessageId: m.platform_message_id,
      senderType: m.sender_type,
      content: m.content,
      attachments: m.attachments || [],
      isRead: m.is_read,
      createdAt: new Date(m.created_at),
    }));
  }

  async saveMessage(msg: {
    conversationId: string;
    channel: 'messenger' | 'whatsapp' | 'telegram';
    platformMessageId: string;
    senderType: 'customer' | 'ai_agent' | 'human_agent' | 'system';
    content: string;
    attachments?: any[];
  }): Promise<{ message: MessageRecord; isDuplicate: boolean }> {
    const { data, error } = await this.client
      .from('messages')
      .insert({
        conversation_id: msg.conversationId,
        channel: msg.channel,
        platform_message_id: msg.platformMessageId,
        sender_type: msg.senderType,
        content: msg.content,
        attachments: msg.attachments || [],
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') { // Postgres unique_violation
        const { data: existing } = await this.client
          .from('messages')
          .select('*')
          .eq('channel', msg.channel)
          .eq('platform_message_id', msg.platformMessageId)
          .single();
        return {
          message: {
            id: existing.id,
            conversationId: existing.conversation_id,
            channel: existing.channel,
            platformMessageId: existing.platform_message_id,
            senderType: existing.sender_type,
            content: existing.content,
            attachments: existing.attachments,
            isRead: existing.is_read,
            createdAt: new Date(existing.created_at),
          },
          isDuplicate: true,
        };
      }
      throw error;
    }

    // Update conversation last_message_at
    await this.client
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', msg.conversationId);

    return {
      message: {
        id: data.id,
        conversationId: data.conversation_id,
        channel: data.channel,
        platformMessageId: data.platform_message_id,
        senderType: data.sender_type,
        content: data.content,
        attachments: data.attachments,
        isRead: data.is_read,
        createdAt: new Date(data.created_at),
      },
      isDuplicate: false,
    };
  }

  async updateConversation(id: string, data: Partial<ConversationRecord>): Promise<void> {
    await this.client
      .from('conversations')
      .update({
        is_human_assigned: data.isHumanAssigned,
        ai_paused: data.aiPaused,
        assigned_to_user_id: data.assignedToUserId,
        current_intent: data.currentIntent,
        pending_summary: data.pendingSummary,
        is_closed: data.isClosed,
      })
      .eq('id', id);
  }

  async listOrders(limit = 100): Promise<OrderRecord[]> {
    const { data } = await this.client
      .from('orders')
      .select('*, items:order_items(*)')
      .order('created_at', { ascending: false })
      .limit(limit);

    return (data || []).map(o => this.mapOrder(o));
  }

  async getActiveDraftOrder(conversationId: string): Promise<OrderRecord | null> {
    const { data } = await this.client
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('conversation_id', conversationId)
      .in('status', ['DRAFT', 'AWAITING_DETAILS', 'AWAITING_PAYMENT'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!data) return null;
    return this.mapOrder(data);
  }

  async getOrderById(id: string): Promise<OrderRecord | null> {
    const { data } = await this.client
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('id', id)
      .single();
    if (!data) return null;
    return this.mapOrder(data);
  }

  async getOrderByNumber(orderNumber: string): Promise<OrderRecord | null> {
    const { data } = await this.client
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('order_number', orderNumber)
      .single();
    if (!data) return null;
    return this.mapOrder(data);
  }

  async createOrderTransaction(params: any): Promise<any> {
    const { data, error } = await this.client.rpc('create_order_tx', {
      p_order_number: params.orderNumber,
      p_conversation_id: params.conversationId,
      p_customer_id: null,
      p_channel: params.channel,
      p_subtotal: params.subtotal,
      p_delivery_fee: params.deliveryFee,
      p_discount: params.discount,
      p_total: params.total,
      p_recipient_name: params.recipientName,
      p_recipient_phone: params.recipientPhone,
      p_city: params.city,
      p_address: params.address,
      p_notes: params.notes || null,
      p_payment_method: params.paymentMethod,
      p_initial_status: 'AWAITING_PAYMENT',
      p_initial_payment_status: 'UNVERIFIED',
      p_items: params.items,
      p_idempotency_key: params.idempotencyKey || null,
    });

    if (error) return { success: false, error: error.message };
    return { success: true, orderId: data?.order_id, isDuplicate: data?.is_duplicate };
  }

  async transitionOrderStatus(orderId: string, toStatus: string, actor: string, reason?: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await this.client.rpc('transition_order', {
      p_order_id: orderId,
      p_to_status: toStatus,
      p_actor: actor,
      p_reason: reason || null,
    });
    if (error) return { success: false, error: error.message };
    return data;
  }

  async recordPaymentEvent(data: any): Promise<any> {
    const { data: res, error } = await this.client
      .from('payment_events')
      .insert({
        order_id: data.orderId,
        provider: data.provider,
        provider_transaction_id: data.providerTxId,
        amount: data.amount,
        status: data.status,
        extracted: data.extracted || {},
        amount_matches: data.amountMatches,
        raw_payload: data.rawPayload || {},
      })
      .select('id')
      .single();

    if (error) throw error;
    return { id: res.id, duplicate: false };
  }

  async getPendingPaymentReviews(): Promise<any[]> {
    const { data } = await this.client
      .from('payment_events')
      .select('*, order:orders(*)')
      .eq('status', 'PAYMENT_REVIEW');
    return data || [];
  }

  async verifyPaymentManually(eventId: string, outcome: 'CONFIRMED_PAID' | 'PAYMENT_FAILED', verifiedBy: string): Promise<{ success: boolean }> {
    const { data: ev } = await this.client
      .from('payment_events')
      .select('order_id')
      .eq('id', eventId)
      .single();

    if (!ev) return { success: false };

    await this.client
      .from('payment_events')
      .update({
        status: outcome,
        verified_by: verifiedBy,
        verified_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (outcome === 'CONFIRMED_PAID') {
      await this.client
        .from('orders')
        .update({ status: 'CONFIRMED_PAID', payment_status: 'CONFIRMED_PAID' })
        .eq('id', ev.order_id);
    }

    return { success: true };
  }

  async createHandoffTicket(conversationId: string, reason: string, priority = 'MEDIUM'): Promise<{ ticketId: string }> {
    const { data, error } = await this.client
      .from('handoff_tickets')
      .insert({ conversation_id: conversationId, reason, priority, status: 'PENDING' })
      .select('id')
      .single();
    if (error) throw error;
    return { ticketId: data.id };
  }

  async getOpenHandoffTickets(): Promise<any[]> {
    const { data } = await this.client
      .from('handoff_tickets')
      .select('*, conversation:conversations(*)')
      .eq('status', 'PENDING');
    return data || [];
  }

  async queueOutboxMessage(channel: 'messenger' | 'whatsapp' | 'telegram', recipientId: string, content: string, attachments: any[] = []): Promise<string> {
    const { data, error } = await this.client
      .from('outbox_messages')
      .insert({ channel, recipient_id: recipientId, content, attachments, status: 'PENDING' })
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }

  async getPendingOutboxMessages(limit = 20): Promise<any[]> {
    const { data } = await this.client
      .from('outbox_messages')
      .select('*')
      .in('status', ['PENDING', 'PROCESSING'])
      .lte('next_attempt_at', new Date().toISOString())
      .limit(limit);
    return data || [];
  }

  async markOutboxSent(id: string): Promise<void> {
    await this.client
      .from('outbox_messages')
      .update({ status: 'SENT', sent_at: new Date().toISOString() })
      .eq('id', id);
  }

  async markOutboxFailed(id: string, error: string): Promise<void> {
    const { data } = await this.client.from('outbox_messages').select('attempts, max_attempts').eq('id', id).single();
    const attempts = (data?.attempts || 0) + 1;
    const isExhausted = attempts >= (data?.max_attempts || 5);
    await this.client
      .from('outbox_messages')
      .update({
        attempts,
        last_error: error,
        status: isExhausted ? 'FAILED' : 'PENDING',
        next_attempt_at: new Date(Date.now() + Math.pow(2, attempts) * 1000).toISOString(),
      })
      .eq('id', id);
  }

  async recordAudit(actor: string, action: string, entity: string, entityId?: string, oldVals?: any, newVals?: any, correlationId?: string): Promise<void> {
    await this.client.from('audit_logs').insert({
      actor_id: actor,
      action,
      entity_name: entity,
      entity_id: entityId,
      old_values: oldVals,
      new_values: newVals,
      correlation_id: correlationId,
    });
  }

  async getAuditLogs(limit = 50): Promise<any[]> {
    const { data } = await this.client
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    return data || [];
  }

  private mapOrder(o: any): OrderRecord {
    return {
      id: o.id,
      orderNumber: o.order_number,
      conversationId: o.conversation_id,
      customerId: o.customer_id,
      channel: o.channel,
      status: o.status,
      paymentStatus: o.payment_status,
      paymentMethod: o.payment_method,
      subtotal: Number(o.subtotal),
      deliveryFee: Number(o.delivery_fee),
      discountAmount: Number(o.discount_amount),
      totalAmount: Number(o.total_amount),
      currency: o.currency,
      recipientName: o.recipient_name,
      recipientPhone: o.recipient_phone,
      deliveryCity: o.delivery_city,
      deliveryAddress: o.delivery_address,
      deliveryNotes: o.delivery_notes,
      confirmedByCustomerAt: o.confirmed_by_customer_at ? new Date(o.confirmed_by_customer_at) : null,
      createdAt: new Date(o.created_at),
      items: (o.items || []).map((i: any) => ({
        variantId: i.variant_id,
        productName: i.product_name,
        variantName: i.variant_name,
        quantity: i.quantity,
        unitPrice: Number(i.unit_price),
        totalPrice: Number(i.total_price),
      })),
    };
  }
}
