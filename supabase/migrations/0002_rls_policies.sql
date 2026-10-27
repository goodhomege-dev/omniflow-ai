-- ==============================================================================
-- OMNIFLOW AI — ROW LEVEL SECURITY (RLS) POLICIES
-- Migration: 0002_rls_policies.sql (Idempotent & Safe to Re-run)
-- Exactly matches 0001_init.sql schema tables
-- ==============================================================================

-- 1. PRODUCTS & CATALOG
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on products" ON products;
DROP POLICY IF EXISTS "Allow all on products" ON products;
CREATE POLICY "Allow all on products" ON products FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on variants" ON product_variants;
DROP POLICY IF EXISTS "Allow all on variants" ON product_variants;
CREATE POLICY "Allow all on variants" ON product_variants FOR ALL USING (true) WITH CHECK (true);

-- 2. BUSINESS CONFIG
ALTER TABLE business_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read on business_config" ON business_config;
DROP POLICY IF EXISTS "Allow write on business_config" ON business_config;
DROP POLICY IF EXISTS "Allow all on business_config" ON business_config;
CREATE POLICY "Allow all on business_config" ON business_config FOR ALL USING (true) WITH CHECK (true);

-- 3. CONVERSATIONS & MESSAGES
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on conversations" ON conversations;
CREATE POLICY "Allow all on conversations" ON conversations FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on messages" ON messages;
CREATE POLICY "Allow all on messages" ON messages FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE channel_identities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on channel_identities" ON channel_identities;
CREATE POLICY "Allow all on channel_identities" ON channel_identities FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on customers" ON customers;
CREATE POLICY "Allow all on customers" ON customers FOR ALL USING (true) WITH CHECK (true);

-- 4. ORDERS & ITEMS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on orders" ON orders;
CREATE POLICY "Allow all on orders" ON orders FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on order_items" ON order_items;
CREATE POLICY "Allow all on order_items" ON order_items FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE inventory_reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on inventory_reservations" ON inventory_reservations;
CREATE POLICY "Allow all on inventory_reservations" ON inventory_reservations FOR ALL USING (true) WITH CHECK (true);

-- 5. PAYMENTS, REFUNDS & SHIPMENTS
ALTER TABLE payment_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on payment_events" ON payment_events;
CREATE POLICY "Allow all on payment_events" ON payment_events FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on refunds" ON refunds;
CREATE POLICY "Allow all on refunds" ON refunds FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on shipments" ON shipments;
CREATE POLICY "Allow all on shipments" ON shipments FOR ALL USING (true) WITH CHECK (true);

-- 6. HANDOFF, AUDIT & OUTBOX
ALTER TABLE handoff_tickets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on handoff_tickets" ON handoff_tickets;
CREATE POLICY "Allow all on handoff_tickets" ON handoff_tickets FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on audit_logs" ON audit_logs;
CREATE POLICY "Allow all on audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE outbox_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all on outbox_messages" ON outbox_messages;
CREATE POLICY "Allow all on outbox_messages" ON outbox_messages FOR ALL USING (true) WITH CHECK (true);
