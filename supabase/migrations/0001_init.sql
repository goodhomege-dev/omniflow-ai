-- ==============================================================================
-- OMNIFLOW AI — MASTER SUPABASE MIGRATION (0001_init.sql)
-- Version: 1.1 | Compatible with PostgreSQL 14+ / Supabase
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE platform_channel_type AS ENUM ('messenger', 'whatsapp', 'telegram');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE order_status_type AS ENUM (
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
        'REFUNDED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_status_type AS ENUM (
        'UNVERIFIED',
        'AWAITING_PAYMENT',
        'PAYMENT_REVIEW',
        'CONFIRMED_PAID',
        'PAYMENT_FAILED',
        'REFUND_PENDING',
        'REFUNDED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_type AS ENUM (
        'BANK_TRANSFER_TBC',
        'BANK_TRANSFER_BOG',
        'CARD_ONLINE',
        'CASH_ON_DELIVERY'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE handoff_status_type AS ENUM (
        'PENDING',
        'ASSIGNED',
        'RESOLVED',
        'REJECTED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE outbox_status_type AS ENUM (
        'PENDING',
        'PROCESSING',
        'SENT',
        'FAILED'
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. BUSINESS CONFIGURATION TABLE
CREATE TABLE IF NOT EXISTS business_config (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by VARCHAR(100) DEFAULT 'system'
);

-- 4. PRODUCTS & INVENTORY
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    name_ka VARCHAR(255),
    description TEXT,
    description_ka TEXT,
    category VARCHAR(100) NOT NULL,
    base_price DECIMAL(12, 2) NOT NULL CHECK (base_price >= 0),
    currency VARCHAR(3) DEFAULT 'GEL',
    is_active BOOLEAN DEFAULT TRUE,
    warranty_info TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS product_variants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    variant_sku VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    price_override DECIMAL(12, 2) CHECK (price_override >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    low_stock_threshold INTEGER DEFAULT 5,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT stock_availability_check CHECK (stock_quantity >= reserved_quantity)
);

CREATE TABLE IF NOT EXISTS inventory_reservations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    order_id UUID,
    session_id VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_released BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. CUSTOMERS & MULTI-CHANNEL IDENTITIES
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    city VARCHAR(100),
    delivery_address TEXT,
    notes TEXT,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS channel_identities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    channel platform_channel_type NOT NULL,
    platform_user_id VARCHAR(255) NOT NULL,
    platform_username VARCHAR(255),
    display_name VARCHAR(255),
    is_confirmed_link BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(channel, platform_user_id)
);

-- 6. CONVERSATIONS & MESSAGES (With Deduplication & Handoff Flags)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_identity_id UUID NOT NULL REFERENCES channel_identities(id) ON DELETE CASCADE,
    channel platform_channel_type NOT NULL,
    is_human_assigned BOOLEAN DEFAULT FALSE,
    ai_paused BOOLEAN DEFAULT FALSE,
    assigned_to_user_id VARCHAR(100),
    current_intent VARCHAR(100) DEFAULT 'general_question',
    pending_summary JSONB DEFAULT NULL,
    is_closed BOOLEAN DEFAULT FALSE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    channel platform_channel_type NOT NULL,
    platform_message_id VARCHAR(255) NOT NULL,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'ai_agent', 'human_agent', 'system')),
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_channel_message UNIQUE(channel, platform_message_id)
);

-- 7. ORDERS & ITEMS
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    channel platform_channel_type NOT NULL,
    
    status order_status_type NOT NULL DEFAULT 'DRAFT',
    payment_status payment_status_type NOT NULL DEFAULT 'UNVERIFIED',
    payment_method payment_method_type,
    
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    delivery_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (delivery_fee >= 0),
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    currency VARCHAR(3) DEFAULT 'GEL',
    
    recipient_name VARCHAR(255),
    recipient_phone VARCHAR(50),
    delivery_city VARCHAR(100),
    delivery_address TEXT,
    delivery_notes TEXT,
    
    confirmed_by_customer_at TIMESTAMPTZ,
    idempotency_key VARCHAR(255) UNIQUE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    variant_id UUID NOT NULL REFERENCES product_variants(id) ON DELETE RESTRICT,
    product_name VARCHAR(255) NOT NULL,
    variant_name VARCHAR(255),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(12, 2) NOT NULL CHECK (unit_price >= 0),
    total_price DECIMAL(12, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. PAYMENTS & REFUNDS
CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    provider VARCHAR(50) NOT NULL,
    provider_transaction_id VARCHAR(255),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'GEL',
    status payment_status_type NOT NULL DEFAULT 'PAYMENT_REVIEW',
    extracted JSONB DEFAULT '{}'::jsonb,
    duplicate_of UUID REFERENCES payment_events(id) ON DELETE SET NULL,
    amount_matches BOOLEAN DEFAULT FALSE,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    is_verified_by_provider BOOLEAN DEFAULT FALSE,
    verified_by VARCHAR(100),
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    payment_event_id UUID REFERENCES payment_events(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED')),
    authorized_by VARCHAR(100),
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. SHIPMENTS
CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    courier_service VARCHAR(100),
    tracking_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'MANIFESTED' CHECK (status IN ('MANIFESTED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED')),
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    courier_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. HANDOFF TICKETS
CREATE TABLE IF NOT EXISTS handoff_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status handoff_status_type NOT NULL DEFAULT 'PENDING',
    priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    assigned_to VARCHAR(100),
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. AUDIT LOGS
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) DEFAULT 'SYSTEM',
    action VARCHAR(100) NOT NULL,
    entity_name VARCHAR(100) NOT NULL,
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    correlation_id VARCHAR(255),
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. OUTBOX MESSAGES (Async Send Queue & Retries without Redis)
CREATE TABLE IF NOT EXISTS outbox_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel platform_channel_type NOT NULL,
    recipient_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb,
    status outbox_status_type NOT NULL DEFAULT 'PENDING',
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 5,
    next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
    last_error TEXT,
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. INDEXES
CREATE INDEX IF NOT EXISTS idx_product_variants_lookup ON product_variants(product_id, is_available);
CREATE INDEX IF NOT EXISTS idx_channel_identities_lookup ON channel_identities(channel, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_active ON conversations(channel, is_closed, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, payment_status);
CREATE INDEX IF NOT EXISTS idx_payment_events_order ON payment_events(order_id);
CREATE INDEX IF NOT EXISTS idx_inventory_reservations_variant ON inventory_reservations(variant_id, expires_at) WHERE is_released = FALSE;
CREATE INDEX IF NOT EXISTS idx_handoff_tickets_status ON handoff_tickets(status, priority);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox_messages(status, next_attempt_at) WHERE status IN ('PENDING', 'PROCESSING');

-- 14. UPDATED_AT TRIGGER
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    CREATE TRIGGER trg_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    CREATE TRIGGER trg_handoff_tickets_updated_at BEFORE UPDATE ON handoff_tickets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    CREATE TRIGGER trg_business_config_updated_at BEFORE UPDATE ON business_config FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 15. TRANSACTIONAL RPC: CREATE ORDER WITH STOCK RESERVATION
CREATE OR REPLACE FUNCTION create_order_tx(
    p_order_number VARCHAR,
    p_conversation_id UUID,
    p_customer_id UUID,
    p_channel platform_channel_type,
    p_subtotal DECIMAL,
    p_delivery_fee DECIMAL,
    p_discount DECIMAL,
    p_total DECIMAL,
    p_recipient_name VARCHAR,
    p_recipient_phone VARCHAR,
    p_city VARCHAR,
    p_address TEXT,
    p_notes TEXT,
    p_payment_method payment_method_type,
    p_initial_status order_status_type,
    p_initial_payment_status payment_status_type,
    p_items JSONB,
    p_idempotency_key VARCHAR
)
RETURNS JSONB AS $$
DECLARE
    v_order_id UUID;
    v_item JSONB;
    v_variant_id UUID;
    v_quantity INT;
    v_unit_price DECIMAL;
    v_item_total DECIMAL;
    v_product_name VARCHAR;
    v_variant_name VARCHAR;
    v_current_stock INT;
    v_current_reserved INT;
BEGIN
    -- Check idempotency
    IF p_idempotency_key IS NOT NULL THEN
        SELECT id INTO v_order_id FROM orders WHERE idempotency_key = p_idempotency_key;
        IF v_order_id IS NOT NULL THEN
            RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'is_duplicate', true);
        END IF;
    END IF;

    -- Insert Order
    INSERT INTO orders (
        order_number, conversation_id, customer_id, channel,
        subtotal, delivery_fee, discount_amount, total_amount,
        recipient_name, recipient_phone, delivery_city, delivery_address, delivery_notes,
        payment_method, status, payment_status, confirmed_by_customer_at, idempotency_key
    ) VALUES (
        p_order_number, p_conversation_id, p_customer_id, p_channel,
        p_subtotal, p_delivery_fee, p_discount, p_total,
        p_recipient_name, p_recipient_phone, p_city, p_address, p_notes,
        p_payment_method, p_initial_status, p_initial_payment_status, NOW(), p_idempotency_key
    ) RETURNING id INTO v_order_id;

    -- Process and reserve each line item
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_variant_id := (v_item->>'variant_id')::UUID;
        v_quantity := (v_item->>'quantity')::INT;
        v_unit_price := (v_item->>'unit_price')::DECIMAL;
        v_item_total := (v_item->>'total_price')::DECIMAL;
        v_product_name := v_item->>'product_name';
        v_variant_name := v_item->>'variant_name';

        -- Lock row and check stock
        SELECT stock_quantity, reserved_quantity 
        INTO v_current_stock, v_current_reserved
        FROM product_variants 
        WHERE id = v_variant_id 
        FOR UPDATE;

        IF (v_current_stock - v_current_reserved) < v_quantity THEN
            RAISE EXCEPTION 'INSUFFICIENT_STOCK: variant % has only % available', v_variant_id, (v_current_stock - v_current_reserved);
        END IF;

        -- Update reserved quantity
        UPDATE product_variants 
        SET reserved_quantity = reserved_quantity + v_quantity 
        WHERE id = v_variant_id;

        -- Insert Reservation Record (15 minutes)
        INSERT INTO inventory_reservations (variant_id, quantity, order_id, session_id, expires_at)
        VALUES (v_variant_id, v_quantity, v_order_id, COALESCE(p_idempotency_key, v_order_id::text), NOW() + INTERVAL '15 minutes');

        -- Insert Order Item
        INSERT INTO order_items (order_id, variant_id, product_name, variant_name, quantity, unit_price, total_price)
        VALUES (v_order_id, v_variant_id, v_product_name, v_variant_name, v_quantity, v_unit_price, v_item_total);
    END LOOP;

    -- Audit log
    INSERT INTO audit_logs (actor_id, actor_role, action, entity_name, entity_id, new_values, correlation_id)
    VALUES ('SYSTEM', 'AI_ORCHESTRATOR', 'ORDER_CREATED', 'orders', v_order_id, jsonb_build_object('order_number', p_order_number, 'total', p_total), p_idempotency_key);

    RETURN jsonb_build_object('success', true, 'order_id', v_order_id, 'is_duplicate', false);
END;
$$ LANGUAGE plpgsql;

-- 16. STATE MACHINE RPC: ORDER TRANSITIONS
CREATE OR REPLACE FUNCTION transition_order(
    p_order_id UUID,
    p_to_status order_status_type,
    p_actor VARCHAR,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_from_status order_status_type;
    v_allowed BOOLEAN := FALSE;
BEGIN
    SELECT status INTO v_from_status FROM orders WHERE id = p_order_id FOR UPDATE;
    IF v_from_status IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    -- Transition rules matrix
    IF v_from_status = 'DRAFT' AND p_to_status IN ('AWAITING_DETAILS', 'CANCELLED') THEN v_allowed := TRUE;
    ELSIF v_from_status = 'AWAITING_DETAILS' AND p_to_status IN ('AWAITING_PAYMENT', 'CONFIRMED_COD', 'CANCELLED') THEN v_allowed := TRUE;
    ELSIF v_from_status = 'AWAITING_PAYMENT' AND p_to_status IN ('PAYMENT_REVIEW', 'CONFIRMED_PAID', 'CANCELLED') THEN v_allowed := TRUE;
    ELSIF v_from_status = 'PAYMENT_REVIEW' AND p_to_status IN ('CONFIRMED_PAID', 'AWAITING_PAYMENT', 'CANCELLED') THEN v_allowed := TRUE;
    ELSIF v_from_status = 'CONFIRMED_COD' AND p_to_status IN ('PROCESSING', 'CANCELLED') THEN v_allowed := TRUE;
    ELSIF v_from_status = 'CONFIRMED_PAID' AND p_to_status IN ('PROCESSING', 'REFUND_PENDING', 'CANCELLED') THEN v_allowed := TRUE;
    ELSIF v_from_status = 'PROCESSING' AND p_to_status IN ('READY_FOR_DISPATCH', 'CANCELLED') THEN v_allowed := TRUE;
    ELSIF v_from_status = 'READY_FOR_DISPATCH' AND p_to_status IN ('SHIPPED', 'CANCELLED') THEN v_allowed := TRUE;
    ELSIF v_from_status = 'SHIPPED' AND p_to_status IN ('DELIVERED', 'CANCELLED') THEN v_allowed := TRUE;
    ELSIF v_from_status = 'DELIVERED' AND p_to_status = 'REFUND_PENDING' THEN v_allowed := TRUE;
    ELSIF v_from_status = 'REFUND_PENDING' AND p_to_status = 'REFUNDED' THEN v_allowed := TRUE;
    END IF;

    IF NOT v_allowed THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', 'ILLEGAL_TRANSITION', 
            'from_status', v_from_status, 
            'to_status', p_to_status
        );
    END IF;

    UPDATE orders SET status = p_to_status WHERE id = p_order_id;

    -- Audit log
    INSERT INTO audit_logs (actor_id, action, entity_name, entity_id, old_values, new_values, correlation_id)
    VALUES (
        p_actor, 
        'ORDER_STATUS_CHANGED', 
        'orders', 
        p_order_id, 
        jsonb_build_object('status', v_from_status), 
        jsonb_build_object('status', p_to_status, 'reason', p_reason),
        p_order_id::text
    );

    RETURN jsonb_build_object('success', true, 'from_status', v_from_status, 'to_status', p_to_status);
END;
$$ LANGUAGE plpgsql;

-- 17. CRON HELPER: RELEASE EXPIRED RESERVATIONS
CREATE OR REPLACE FUNCTION release_expired_reservations()
RETURNS INT AS $$
DECLARE
    r RECORD;
    v_count INT := 0;
BEGIN
    FOR r IN 
        SELECT id, variant_id, quantity 
        FROM inventory_reservations 
        WHERE is_released = FALSE AND expires_at < NOW()
        FOR UPDATE
    LOOP
        UPDATE product_variants 
        SET reserved_quantity = GREATEST(0, reserved_quantity - r.quantity)
        WHERE id = r.variant_id;

        UPDATE inventory_reservations 
        SET is_released = TRUE 
        WHERE id = r.id;

        v_count := v_count + 1;
    END LOOP;

    RETURN v_count;
END;
$$ LANGUAGE plpgsql;
