-- ==============================================================================
-- DATABASE SCHEMA: OMNICHANNEL AI SALES & CUSTOMER SUPPORT PLATFORM
-- Version: 3.0 | Compatible with PostgreSQL 14+ and Supabase
-- Tables: 15 Core Production Tables + Enums + Constraints + Indexes
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- 1. ENUMS DEFINITIONS
-- ==============================================================================

DO $$ BEGIN
    CREATE TYPE platform_channel_type AS ENUM ('messenger', 'whatsapp', 'telegram');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

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
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_type AS ENUM (
        'BANK_TRANSFER_TBC',
        'BANK_TRANSFER_BOG',
        'CARD_ONLINE',
        'CASH_ON_DELIVERY'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE handoff_status_type AS ENUM (
        'PENDING',
        'ASSIGNED',
        'RESOLVED',
        'REJECTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_role_type AS ENUM (
        'ADMIN',
        'MANAGER',
        'SUPPORT',
        'FINANCE',
        'WAREHOUSE',
        'ANALYST'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. PRODUCTS & INVENTORY
-- ==============================================================================

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
    name VARCHAR(255) NOT NULL, -- e.g. "Color: Midnight Blue, Size: 256GB"
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
    order_id UUID, -- Bound when order is drafted/created
    session_id VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_released BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 3. CUSTOMERS & CHANNELS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255),
    phone VARCHAR(50), -- Normalized phone, e.g., +995599123456
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

-- ==============================================================================
-- 4. CONVERSATIONS & MESSAGES
-- ==============================================================================

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel_identity_id UUID NOT NULL REFERENCES channel_identities(id) ON DELETE CASCADE,
    channel platform_channel_type NOT NULL,
    is_human_assigned BOOLEAN DEFAULT FALSE,
    assigned_to_user_id UUID,
    current_intent VARCHAR(100) DEFAULT 'general_question',
    is_closed BOOLEAN DEFAULT FALSE,
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    platform_message_id VARCHAR(255),
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('customer', 'ai_agent', 'human_agent', 'system')),
    content TEXT NOT NULL,
    attachments JSONB DEFAULT '[]'::jsonb, -- Array of {type, url, ocr_data}
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 5. ORDERS & ORDER ITEMS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(50) UNIQUE NOT NULL, -- e.g. "ORD-1048"
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE RESTRICT,
    channel platform_channel_type NOT NULL,
    
    -- Status
    status order_status_type NOT NULL DEFAULT 'DRAFT',
    payment_status payment_status_type NOT NULL DEFAULT 'UNVERIFIED',
    payment_method payment_method_type,
    
    -- Financials (authoritative server calculation)
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    delivery_fee DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (delivery_fee >= 0),
    discount_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0),
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    currency VARCHAR(3) DEFAULT 'GEL',
    
    -- Delivery Details
    recipient_name VARCHAR(255),
    recipient_phone VARCHAR(50),
    delivery_city VARCHAR(100),
    delivery_address TEXT,
    delivery_notes TEXT,
    
    -- Customer Confirmation
    confirmed_by_customer_at TIMESTAMPTZ,
    
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

-- ==============================================================================
-- 6. PAYMENTS & REFUNDS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS payment_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    provider VARCHAR(50) NOT NULL, -- 'TBC_IBAN', 'BOG_IBAN', 'TBC_PAY', 'BOG_IPAY', 'MANUAL_RECEIPT'
    provider_transaction_id VARCHAR(255),
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) DEFAULT 'GEL',
    status payment_status_type NOT NULL,
    raw_payload JSONB DEFAULT '{}'::jsonb,
    is_verified_by_provider BOOLEAN DEFAULT FALSE,
    verified_by_user_id UUID,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_provider_tx UNIQUE(provider, provider_transaction_id)
);

CREATE TABLE IF NOT EXISTS refunds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    payment_event_id UUID REFERENCES payment_events(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED')),
    authorized_by_user_id UUID,
    processed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 7. FULFILLMENT & SHIPMENTS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
    courier_service VARCHAR(100), -- 'Georgian Post', 'Delivery On Time', etc.
    tracking_number VARCHAR(100),
    status VARCHAR(50) DEFAULT 'MANIFESTED' CHECK (status IN ('MANIFESTED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'FAILED', 'RETURNED')),
    dispatched_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    courier_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. HUMAN HANDOFFS & TICKETS
-- ==============================================================================

CREATE TABLE IF NOT EXISTS handoff_tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status handoff_status_type NOT NULL DEFAULT 'PENDING',
    priority VARCHAR(20) DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT')),
    assigned_to_user_id UUID,
    resolved_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 9. AUDIT & IDEMPOTENCY
-- ==============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    actor_id VARCHAR(255) NOT NULL, -- user_id, 'AI_AGENT', 'WEBHOOK_META', etc.
    actor_role VARCHAR(50) DEFAULT 'SYSTEM',
    action VARCHAR(100) NOT NULL, -- 'ORDER_CREATED', 'PAYMENT_VERIFIED', 'STATUS_CHANGED', etc.
    entity_name VARCHAR(100) NOT NULL, -- 'orders', 'payment_events', etc.
    entity_id UUID,
    old_values JSONB,
    new_values JSONB,
    correlation_id VARCHAR(255),
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS idempotency_keys (
    key VARCHAR(255) PRIMARY KEY, -- e.g. "webhook:messenger:mid.12345" or "order_create:UUID"
    response_payload JSONB,
    status_code INTEGER DEFAULT 200,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- ==============================================================================
-- 10. INDEXES FOR PERFORMANCE & LOOKUPS
-- ==============================================================================

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
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires ON idempotency_keys(expires_at);

-- ==============================================================================
-- 11. TRIGGER: UPDATE TIMESTAMP AUTOMATION
-- ==============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
    CREATE TRIGGER trg_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    CREATE TRIGGER trg_variants_updated_at BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    CREATE TRIGGER trg_customers_updated_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    CREATE TRIGGER trg_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    CREATE TRIGGER trg_orders_updated_at BEFORE UPDATE ON orders FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    CREATE TRIGGER trg_shipments_updated_at BEFORE UPDATE ON shipments FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
    CREATE TRIGGER trg_handoff_tickets_updated_at BEFORE UPDATE ON handoff_tickets FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
