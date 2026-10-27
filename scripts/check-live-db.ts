import { createClient } from '@supabase/supabase-js';

const url = 'https://qjezshdrvakocdgsorkf.supabase.co';
const key = 'sb_publishable_TLbrCzhicuSLBa6Tg-gk2g__efFseN2';

const tables = [
  'products', 'product_variants', 'business_config', 'customers',
  'channel_identities', 'conversations', 'messages', 'orders',
  'order_items', 'inventory_reservations',
  'payment_events', 'refunds', 'shipments', 'handoff_tickets',
  'audit_logs', 'outbox_messages'
];

async function main() {
  console.log('=== SUPABASE LIVE HEALTH & DATA AUDIT ===');
  const client = createClient(url, key);
  
  for (const t of tables) {
    const { count, data, error } = await client.from(t).select('*', { count: 'exact', head: false }).limit(2);
    if (error) {
      console.log(`❌ ${t.padEnd(24)}: Error [${error.code}]: ${error.message}`);
    } else {
      console.log(`✅ ${t.padEnd(24)}: OK | Rows: ${count ?? 0} | Sample: ${data?.length ? JSON.stringify(data[0].id || data[0].key || 'exists') : 'empty'}`);
    }
  }

  // Check business_config sample
  const { data: configs } = await client.from('business_config').select('key, value').limit(5);
  if (configs && configs.length > 0) {
    console.log('\n--- Business Config Sample ---');
    console.log(configs);
  }

  // Check products sample
  const { data: prods } = await client.from('products').select('name, price, currency, is_active').limit(5);
  if (prods && prods.length > 0) {
    console.log('\n--- Products Sample ---');
    console.log(prods);
  }
}

main().catch(err => {
  console.error('Audit failed:', err);
});
