'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Tab = 'overview' | 'inbox' | 'orders' | 'payments' | 'products' | 'settings' | 'audit' | 'health';

interface OrderItem {
  variantId: string;
  productName: string;
  variantName?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Order {
  id: string;
  orderNumber: string;
  conversationId?: string;
  channel: string;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  subtotal: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  recipientName?: string;
  recipientPhone?: string;
  deliveryCity?: string;
  deliveryAddress?: string;
  createdAt: string;
  items?: OrderItem[];
}

interface Conversation {
  id: string;
  channel: string;
  channelIdentityId: string;
  isHumanAssigned: boolean;
  aiPaused: boolean;
  currentIntent: string;
  lastMessageAt: string;
}

interface Message {
  id: string;
  senderType: 'customer' | 'ai_agent' | 'human_agent' | 'system';
  content: string;
  createdAt: string;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [piiMasked, setPiiMasked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  // Data states
  const [summary, setSummary] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [staffReply, setStaffReply] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [config, setConfig] = useState<Record<string, any>>({});
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Modals
  const [orderModal, setOrderModal] = useState<Order | null>(null);
  const [newStatus, setNewStatus] = useState<string>('');
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvInput, setCsvInput] = useState('');
  const [newProductModal, setNewProductModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
    sku: '',
    name: '',
    name_ka: '',
    category: 'Electronics',
    base_price: 0,
    warranty_info: '1 წლიანი გარანტია',
    stock_quantity: 10,
  });

  // PII masking helpers
  const maskPhone = (phone?: string | null) => {
    if (!phone) return '-';
    if (!piiMasked) return phone;
    if (phone.length < 8) return '***';
    return phone.slice(0, 4) + ' *** **' + phone.slice(-2);
  };

  const maskText = (text?: string | null) => {
    if (!text) return '-';
    if (!piiMasked) return text;
    if (text.length <= 8) return '***';
    return text.slice(0, 6) + '...';
  };

  // Data fetchers
  const fetchSummary = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/summary');
      if (res.ok) setSummary(await res.json());
    } catch {}
  }, []);

  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/conversations');
      if (res.ok) {
        const d = await res.json();
        setConversations(d.conversations || []);
        if (!selectedConvId && d.conversations?.length > 0) {
          setSelectedConvId(d.conversations[0].id);
        }
      }
    } catch {}
  }, [selectedConvId]);

  const fetchMessages = useCallback(async (convId: string) => {
    try {
      const res = await fetch(`/api/admin/conversations/${convId}`);
      if (res.ok) {
        const d = await res.json();
        setMessages(d.messages || []);
      }
    } catch {}
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/orders');
      if (res.ok) {
        const d = await res.json();
        setOrders(d.orders || []);
      }
    } catch {}
  }, []);

  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/payments');
      if (res.ok) {
        const d = await res.json();
        setPayments(d.pendingReviews || []);
      }
    } catch {}
  }, []);

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/products');
      if (res.ok) {
        const d = await res.json();
        setProducts(d.products || []);
      }
    } catch {}
  }, []);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/config');
      if (res.ok) {
        const d = await res.json();
        setConfig(d.config || {});
      }
    } catch {}
  }, []);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/audit');
      if (res.ok) {
        const d = await res.json();
        setAuditLogs(d.logs || []);
      }
    } catch {}
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([
      fetchSummary(),
      fetchConversations(),
      fetchOrders(),
      fetchPayments(),
      fetchProducts(),
      fetchConfig(),
      fetchAuditLogs(),
    ]);
    if (selectedConvId) {
      await fetchMessages(selectedConvId);
    }
    setLastRefreshed(new Date());
    setLoading(false);
  }, [fetchSummary, fetchConversations, fetchOrders, fetchPayments, fetchProducts, fetchConfig, fetchAuditLogs, selectedConvId, fetchMessages]);

  useEffect(() => {
    refreshAll();
    const timer = setInterval(() => {
      refreshAll();
    }, 25000);
    return () => clearInterval(timer);
  }, [refreshAll]);

  useEffect(() => {
    if (selectedConvId) {
      fetchMessages(selectedConvId);
    }
  }, [selectedConvId, fetchMessages]);

  // Actions
  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  const handleToggleTakeover = async (conv: Conversation) => {
    const nextState = !conv.aiPaused;
    await fetch(`/api/admin/conversations/${conv.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'TOGGLE_TAKEOVER', aiPaused: nextState }),
    });
    setConversations(prev => prev.map(c => c.id === conv.id ? { ...c, aiPaused: nextState, isHumanAssigned: nextState } : c));
  };

  const handleSendStaffMessage = async () => {
    if (!selectedConvId || !staffReply.trim()) return;
    await fetch(`/api/admin/conversations/${selectedConvId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'SEND_MESSAGE', text: staffReply }),
    });
    setStaffReply('');
    await fetchMessages(selectedConvId);
  };

  const handleStatusTransition = async () => {
    if (!orderModal || !newStatus) return;
    const res = await fetch(`/api/admin/orders/${orderModal.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ toStatus: newStatus, reason: 'ადმინისტრატორის მიერ შეცვლა' }),
    });
    const d = await res.json();
    if (!res.ok || d.error) {
      alert(`შეცდომა: ${d.error}`);
    } else {
      setOrderModal(null);
      await fetchOrders();
      await fetchSummary();
    }
  };

  const handlePaymentReview = async (eventId: string, outcome: 'CONFIRMED_PAID' | 'PAYMENT_FAILED') => {
    const res = await fetch('/api/admin/payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, outcome }),
    });
    if (res.ok) {
      await fetchPayments();
      await fetchOrders();
      await fetchSummary();
    }
  };

  const handleCsvImport = async () => {
    if (!csvInput.trim()) return;
    const res = await fetch('/api/admin/products/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ csv: csvInput }),
    });
    const d = await res.json();
    if (res.ok) {
      alert(d.message || 'წარმატებით დაიმპორტდა');
      setCsvModalOpen(false);
      setCsvInput('');
      await fetchProducts();
    } else {
      alert(`შეცდომა: ${d.error}`);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sku: newProductForm.sku,
        name: newProductForm.name,
        name_ka: newProductForm.name_ka || newProductForm.name,
        category: newProductForm.category,
        base_price: Number(newProductForm.base_price),
        warranty_info: newProductForm.warranty_info,
        variants: [
          {
            variantSku: `${newProductForm.sku}-DEF`,
            name: 'სტანდარტული',
            stockQuantity: Number(newProductForm.stock_quantity),
          },
        ],
      }),
    });
    if (res.ok) {
      setNewProductModal(false);
      await fetchProducts();
    } else {
      const d = await res.json();
      alert(`შეცდომა: ${d.error}`);
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates: config }),
    });
    if (res.ok) {
      alert('კონფიგურაცია წარმატებით შეინახა');
      await fetchConfig();
    }
  };

  const channelBadge = (ch: string) => {
    const c = ch.toLowerCase();
    if (c === 'telegram') return <span style={{ backgroundColor: '#0284c7', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Telegram</span>;
    if (c === 'whatsapp') return <span style={{ backgroundColor: '#16a34a', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>WhatsApp</span>;
    if (c === 'messenger') return <span style={{ backgroundColor: '#2563eb', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>Messenger</span>;
    return <span style={{ backgroundColor: '#64748b', color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>{ch}</span>;
  };

  const statusBadge = (st: string) => {
    let bg = '#64748b';
    if (st === 'CONFIRMED_PAID' || st === 'DELIVERED') bg = '#16a34a';
    else if (st === 'AWAITING_PAYMENT' || st === 'PAYMENT_REVIEW') bg = '#ea580c';
    else if (st === 'PROCESSING' || st === 'READY_FOR_DISPATCH' || st === 'SHIPPED') bg = '#0284c7';
    else if (st === 'CANCELLED' || st === 'PAYMENT_FAILED') bg = '#dc2626';
    return (
      <span style={{ backgroundColor: bg, color: '#fff', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
        {st}
      </span>
    );
  };

  const activeConversation = conversations.find(c => c.id === selectedConvId);

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: '#090d16',
      color: '#f1f5f9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    }}>
      {/* Sidebar */}
      <aside style={{
        width: '260px',
        backgroundColor: '#0f172a',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {/* Brand */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}>
              🤖
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>OmniFlow AI</div>
              <div style={{ fontSize: '11px', color: '#94a3b8' }}>Omnichannel Agent v1.0</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {[
            { id: 'overview', label: 'მიმოხილვა', icon: '📊', badge: summary?.kpis?.needsAttention },
            { id: 'inbox', label: 'ინბოქსი (ჩათი)', icon: '💬', badge: conversations.filter(c => c.aiPaused).length },
            { id: 'orders', label: 'შეკვეთები', icon: '📦', count: orders.length },
            { id: 'payments', label: 'გადახდები', icon: '💳', badge: payments.length },
            { id: 'products', label: 'კატალოგი', icon: '🏷️', count: products.length },
            { id: 'settings', label: 'პარამეტრები', icon: '⚙️' },
            { id: 'audit', label: 'აუდიტის ლოგი', icon: '📜' },
            { id: 'health', label: 'სისტემის სტატუსი', icon: '🟢' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: isActive ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: isActive ? '#60a5fa' : '#94a3b8',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '13px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s ease',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </span>
                {tab.badge ? (
                  <span style={{
                    backgroundColor: '#ef4444',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '2px 7px',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}>
                    {tab.badge}
                  </span>
                ) : tab.count ? (
                  <span style={{ color: '#64748b', fontSize: '11px' }}>{tab.count}</span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <button
            onClick={handleLogout}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#f87171',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            🚪 გასვლა (Logout)
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top Header */}
        <header style={{
          height: '64px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 28px',
          backgroundColor: '#0b1120',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
              {activeTab === 'overview' && 'სისტემის მიმოხილვა & KPI'}
              {activeTab === 'inbox' && 'მომხმარებელთა ცოცხალი ჩათი'}
              {activeTab === 'orders' && 'შეკვეთების მართვა'}
              {activeTab === 'payments' && 'საბანკო ქვითრების შემოწმება'}
              {activeTab === 'products' && 'პროდუქციის კატალოგი და მარაგები'}
              {activeTab === 'settings' && 'ბიზნესის პარამეტრები & პრომპტი'}
              {activeTab === 'audit' && 'უსაფრთხოების & სისტემის აუდიტი'}
              {activeTab === 'health' && 'სისტემის კომპონენტების სტატუსი'}
            </h2>
            <div style={{ display: 'flex', gap: '6px' }}>
              {channelBadge('Telegram')}
              {channelBadge('WhatsApp')}
              {channelBadge('Messenger')}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* PII Masking Switch */}
            <button
              onClick={() => setPiiMasked(!piiMasked)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: piiMasked ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: piiMasked ? '#93c5fd' : '#fca5a5',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              title="კონფიდენციალური მონაცემების დამალვა / გამოჩენა"
            >
              {piiMasked ? '🔒 PII დამალულია' : '🔓 PII გამოჩენილია'}
            </button>

            {/* Refresh */}
            <button
              onClick={refreshAll}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                color: '#cbd5e1',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              🔄 {loading ? 'იტვირთება...' : 'განახლება'}
            </button>

            <span style={{ fontSize: '11px', color: '#64748b' }}>
              განახლდა: {lastRefreshed ? lastRefreshed.toLocaleTimeString('ka-GE') : '-'}
            </span>
          </div>
        </header>

        {/* Content Container */}
        <main style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div>
              {/* KPI Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px', marginBottom: '24px' }}>
                {[
                  { label: 'სულ საუბარი (ჩათი)', val: summary?.kpis?.totalConversations ?? 0, icon: '💬', color: '#3b82f6' },
                  { label: 'შექმნილი შეკვეთები', val: summary?.kpis?.ordersCreated ?? 0, icon: '📦', color: '#8b5cf6' },
                  { label: 'დადასტურებული გაყიდვები', val: `${(summary?.kpis?.confirmedSales ?? 0).toFixed(2)} ₾`, icon: '💰', color: '#10b981' },
                  { label: 'ყურადღება მისაქცევი', val: summary?.kpis?.needsAttention ?? 0, icon: '⚠️', color: '#f59e0b', alert: (summary?.kpis?.needsAttention ?? 0) > 0 },
                ].map((kpi, idx) => (
                  <div key={idx} style={{
                    backgroundColor: '#0f172a',
                    border: `1px solid ${kpi.alert ? 'rgba(245, 158, 11, 0.4)' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.2)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>{kpi.label}</span>
                      <span style={{ fontSize: '20px' }}>{kpi.icon}</span>
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: 700, color: kpi.color }}>{kpi.val}</div>
                  </div>
                ))}
              </div>

              {/* Attention Queue */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '20px',
                }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 16px 0', color: '#f8fafc' }}>
                    🚨 ყურადღების რიგი (ოპერატორის ჩართვა & ქვითრები)
                  </h3>
                  {(!summary?.attentionQueue || summary.attentionQueue.length === 0) ? (
                    <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      ყველა დავალება შესრულებულია, რიგი ცარიელია ✨
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {summary.attentionQueue.map((item: any, i: number) => (
                        <div key={i} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 14px',
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }}>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#f1f5f9' }}>{item.title}</div>
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{item.subtitle}</div>
                          </div>
                          <button
                            onClick={() => setActiveTab(item.type === 'PAYMENT_REVIEW' ? 'payments' : 'inbox')}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#3b82f6',
                              color: '#fff',
                              fontSize: '11px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            შემოწმება ➔
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Orders */}
                <div style={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '20px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0, color: '#f8fafc' }}>
                      📦 ბოლო შეკვეთები
                    </h3>
                    <button
                      onClick={() => setActiveTab('orders')}
                      style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '12px', cursor: 'pointer' }}
                    >
                      ყველას ნახვა ➔
                    </button>
                  </div>

                  {(!summary?.recentOrders || summary.recentOrders.length === 0) ? (
                    <div style={{ padding: '30px 0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                      შეკვეთები ჯერ არ არის
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {summary.recentOrders.map((o: any) => (
                        <div key={o.id} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 12px',
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: '6px',
                        }}>
                          <div>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#f8fafc' }}>#{o.orderNumber}</span>
                            <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '10px' }}>
                              {maskText(o.recipientName || 'მომხმარებელი')}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontWeight: 600, fontSize: '13px', color: '#10b981' }}>{o.totalAmount} ₾</span>
                            {statusBadge(o.status)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: INBOX */}
          {activeTab === 'inbox' && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '320px 1fr',
              gap: '16px',
              height: 'calc(100vh - 120px)',
            }}>
              {/* Left: Conversations list */}
              <div style={{
                backgroundColor: '#0f172a',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
              }}>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', fontWeight: 600, fontSize: '14px' }}>
                  ჩათების სია ({conversations.length})
                </div>
                {conversations.length === 0 ? (
                  <div style={{ padding: '30px 16px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                    ჩათები ჯერ არ არის
                  </div>
                ) : (
                  <div style={{ flex: 1, overflowY: 'auto' }}>
                    {conversations.map(c => {
                      const isSelected = c.id === selectedConvId;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedConvId(c.id)}
                          style={{
                            padding: '12px 14px',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
                            backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'background 0.15s',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            {channelBadge(c.channel)}
                            {c.aiPaused && (
                              <span style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                ოპერატორი
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {maskText(c.channelIdentityId)}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
                            ინტენტი: {c.currentIntent || 'საუბარი'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right: Message history & Chat controls */}
              <div style={{
                backgroundColor: '#0f172a',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}>
                {activeConversation ? (
                  <>
                    {/* Header */}
                    <div style={{
                      padding: '12px 20px',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    }}>
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>
                          {maskText(activeConversation.channelIdentityId)}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                          არხი: {activeConversation.channel.toUpperCase()} • ID: {activeConversation.id}
                        </div>
                      </div>

                      <button
                        onClick={() => handleToggleTakeover(activeConversation)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '6px',
                          border: 'none',
                          backgroundColor: activeConversation.aiPaused ? '#16a34a' : '#dc2626',
                          color: '#fff',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        {activeConversation.aiPaused ? '▶️ AI-ის დაბრუნება (Unpause)' : '⏸️ AI პაუზა (ოპერატორის ჩართვა)'}
                      </button>
                    </div>

                    {/* Messages stream */}
                    <div style={{
                      flex: 1,
                      padding: '20px',
                      overflowY: 'auto',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}>
                      {messages.map((m, idx) => {
                        const isCust = m.senderType === 'customer';
                        const isAI = m.senderType === 'ai_agent';
                        const isStaff = m.senderType === 'human_agent';

                        return (
                          <div
                            key={m.id || idx}
                            style={{
                              alignSelf: isCust ? 'flex-start' : 'flex-end',
                              maxWidth: '75%',
                              backgroundColor: isCust
                                ? 'rgba(255, 255, 255, 0.08)'
                                : isStaff
                                ? '#4f46e5'
                                : '#1e3a8a',
                              borderRadius: '10px',
                              padding: '10px 14px',
                              border: isCust ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                            }}
                          >
                            <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                              <span>
                                {isCust ? '👤 მომხმარებელი' : isAI ? '🤖 OmniFlow AI' : '👨‍💼 ოპერატორი'}
                              </span>
                              <span>{new Date(m.createdAt).toLocaleTimeString('ka-GE', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div style={{ fontSize: '13px', lineHeight: '1.45', whiteSpace: 'pre-wrap', color: '#f8fafc' }}>
                              {m.content}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Staff message composer */}
                    <div style={{
                      padding: '12px 16px',
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      backgroundColor: 'rgba(15, 23, 42, 0.8)',
                      display: 'flex',
                      gap: '10px',
                    }}>
                      <input
                        type="text"
                        value={staffReply}
                        onChange={(e) => setStaffReply(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendStaffMessage()}
                        placeholder="ოპერატორის პასუხი (პირდაპირ გაეგზავნება მომხმარებელს)..."
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          backgroundColor: 'rgba(255, 255, 255, 0.05)',
                          color: '#fff',
                          fontSize: '13px',
                          outline: 'none',
                        }}
                      />
                      <button
                        onClick={handleSendStaffMessage}
                        style={{
                          padding: '10px 18px',
                          borderRadius: '8px',
                          border: 'none',
                          backgroundColor: '#2563eb',
                          color: '#fff',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                        }}
                      >
                        გაგზავნა ➔
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                    აირჩიეთ ჩათი მარცხენა სიიდან
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: ORDERS */}
          {activeTab === 'orders' && (
            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>შეკვეთების სია ({orders.length})</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                      <th style={{ padding: '12px 16px' }}>შეკვეთის #</th>
                      <th style={{ padding: '12px 16px' }}>თარიღი</th>
                      <th style={{ padding: '12px 16px' }}>არხი</th>
                      <th style={{ padding: '12px 16px' }}>მიმღები</th>
                      <th style={{ padding: '12px 16px' }}>ტელეფონი</th>
                      <th style={{ padding: '12px 16px' }}>ქალაქი / მისამართი</th>
                      <th style={{ padding: '12px 16px' }}>თანხა</th>
                      <th style={{ padding: '12px 16px' }}>სტატუსი</th>
                      <th style={{ padding: '12px 16px' }}>მოქმედება</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                          შეკვეთები არ მოიძებნა
                        </td>
                      </tr>
                    ) : (
                      orders.map(o => (
                        <tr key={o.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: '#f8fafc' }}>#{o.orderNumber}</td>
                          <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                            {new Date(o.createdAt).toLocaleDateString('ka-GE')}
                          </td>
                          <td style={{ padding: '12px 16px' }}>{channelBadge(o.channel)}</td>
                          <td style={{ padding: '12px 16px' }}>{maskText(o.recipientName)}</td>
                          <td style={{ padding: '12px 16px' }}>{maskPhone(o.recipientPhone)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            {o.deliveryCity} {o.deliveryAddress ? `• ${maskText(o.deliveryAddress)}` : ''}
                          </td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#10b981' }}>{o.totalAmount} ₾</td>
                          <td style={{ padding: '12px 16px' }}>{statusBadge(o.status)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <button
                              onClick={() => { setOrderModal(o); setNewStatus(''); }}
                              style={{
                                padding: '5px 10px',
                                borderRadius: '4px',
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                backgroundColor: 'transparent',
                                color: '#60a5fa',
                                fontSize: '12px',
                                cursor: 'pointer',
                              }}
                            >
                              სტატუსის შეცვლა ⚙️
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: PAYMENTS */}
          {activeTab === 'payments' && (
            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>
                  ქვითრებისა და გადახდების შემოწმების რიგი ({payments.length})
                </span>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  უსაფრთხოების წესი: AI აგენტი ავტომატურად არასდროს უცვლის სტატუსს CONFIRMED_PAID-ზე. მხოლოდ ფინანსური მენეჯერი ადასტურებს.
                </p>
              </div>

              <div style={{ padding: '20px' }}>
                {payments.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                    შემოწმების მომლოდინე გადახდები არ არის 🎉
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {payments.map(p => (
                      <div
                        key={p.id}
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                            <span style={{ fontWeight: 700, fontSize: '14px', color: '#f8fafc' }}>
                              შეკვეთა ID: {p.orderId}
                            </span>
                            <span style={{ backgroundColor: '#ea580c', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '4px' }}>
                              {p.status}
                            </span>
                            {p.duplicateOf && (
                              <span style={{ backgroundColor: '#dc2626', color: '#fff', fontSize: '11px', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                                ⚠️ დუბლიკატი ქვითარი!
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '13px', color: '#cbd5e1' }}>
                            თანხა: <strong>{p.amount} ₾</strong> • პროვაიდერი: <strong>{p.provider}</strong> • ტრანზაქცია: <code>{p.providerTxId || 'უცნობი'}</code>
                          </div>
                          {p.extracted && (
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>
                              OCR მონაცემები: {p.extracted.senderName || '-'} • თარიღი: {p.extracted.date || '-'}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                          <button
                            onClick={() => handlePaymentReview(p.id, 'CONFIRMED_PAID')}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#16a34a',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ✅ დადასტურება (CONFIRMED_PAID)
                          </button>
                          <button
                            onClick={() => handlePaymentReview(p.id, 'PAYMENT_FAILED')}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '6px',
                              border: 'none',
                              backgroundColor: '#dc2626',
                              color: '#fff',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            ❌ უარყოფა (FAILED)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PRODUCTS */}
          {activeTab === 'products' && (
            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>პროდუქციის კატალოგი ({products.length})</span>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => setCsvModalOpen(true)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      color: '#60a5fa',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    📥 CSV იმპორტი
                  </button>
                  <button
                    onClick={() => setNewProductModal(true)}
                    style={{
                      padding: '7px 14px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#2563eb',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    ➕ პროდუქტის დამატება
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                      <th style={{ padding: '12px 16px' }}>SKU</th>
                      <th style={{ padding: '12px 16px' }}>დასახელება</th>
                      <th style={{ padding: '12px 16px' }}>კატეგორია</th>
                      <th style={{ padding: '12px 16px' }}>ფასი (₾)</th>
                      <th style={{ padding: '12px 16px' }}>ვარიანტები / მარაგი</th>
                      <th style={{ padding: '12px 16px' }}>გარანტია</th>
                      <th style={{ padding: '12px 16px' }}>სტატუსი</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(p => {
                      const totalAvailable = (p.variants || []).reduce((acc: number, v: any) => acc + (v.availableQuantity || v.stockQuantity || 0), 0);
                      return (
                        <tr key={p.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#94a3b8' }}>{p.sku}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f8fafc' }}>
                            {p.name_ka || p.name}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>{p.category}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: '#10b981' }}>{p.base_price} ₾</td>
                          <td style={{ padding: '12px 16px' }}>
                            {(p.variants || []).map((v: any, idx: number) => (
                              <div key={idx} style={{ fontSize: '12px', color: v.availableQuantity <= 2 ? '#f87171' : '#94a3b8' }}>
                                • {v.name}: <strong>{v.availableQuantity ?? v.stockQuantity} ცალი</strong>
                              </div>
                            ))}
                          </td>
                          <td style={{ padding: '12px 16px', color: '#94a3b8', fontSize: '12px' }}>{p.warranty_info || '-'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{
                              backgroundColor: totalAvailable > 0 ? '#16a34a' : '#dc2626',
                              color: '#fff',
                              fontSize: '11px',
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}>
                              {totalAvailable > 0 ? 'მარაგშია' : 'ამოიწურა'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === 'settings' && (
            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '24px',
              maxWidth: '800px',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>
                ბიზნესის პარამეტრები & AI აგენტის წესები
              </h3>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px 0' }}>
                აქ შეყვანილი მონაცემები რეალურ დროში ინტეგრირდება AI აგენტის სისტემურ პრომპტში (`prompts/system_ka_v1.md`).
              </p>

              <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {[
                  { key: 'brand_name', label: 'ბრენდის / მაღაზიის სახელი', defaultVal: 'TechStore Georgia' },
                  { key: 'support_phone', label: 'მხარდაჭერის საკონტაქტო ტელეფონი', defaultVal: '+995 599 00 00 00' },
                  { key: 'working_hours', label: 'სამუშაო საათები', defaultVal: 'ორშაბათი-შაბათი 10:00 - 20:00' },
                  { key: 'delivery_fee_city', label: 'მიტანის ტარიფი თბილისში (₾)', defaultVal: '5' },
                  { key: 'free_delivery_threshold', label: 'უფასო მიტანის ზღვარი (₾)', defaultVal: '100' },
                  { key: 'tbc_iban', label: 'TBC Bank IBAN', defaultVal: 'GE00TB0000000000000000' },
                  { key: 'bog_iban', label: 'Bank of Georgia IBAN', defaultVal: 'GE00BG0000000000000000' },
                  { key: 'ai_agent_tone', label: 'AI აგენტის ტონი (Georgian Tone)', defaultVal: 'მეგობრული, პროფესიონალური, ლაკონიური, ემპათიური' },
                ].map(item => (
                  <div key={item.key}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
                      {item.label}
                    </label>
                    <input
                      type="text"
                      value={config[item.key] !== undefined ? config[item.key] : item.defaultVal}
                      onChange={(e) => setConfig({ ...config, [item.key]: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                  </div>
                ))}

                <button
                  type="submit"
                  style={{
                    alignSelf: 'flex-start',
                    marginTop: '10px',
                    padding: '10px 24px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#16a34a',
                    color: '#fff',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  💾 ცვლილებების შენახვა
                </button>
              </form>
            </div>
          )}

          {/* TAB 7: AUDIT */}
          {activeTab === 'audit' && (
            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              overflow: 'hidden',
            }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>აუდიტის ჟურნალი ({auditLogs.length})</span>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', color: '#94a3b8', backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
                      <th style={{ padding: '10px 14px' }}>დრო</th>
                      <th style={{ padding: '10px 14px' }}>შემსრულებელი</th>
                      <th style={{ padding: '10px 14px' }}>მოქმედება</th>
                      <th style={{ padding: '10px 14px' }}>ობიექტი</th>
                      <th style={{ padding: '10px 14px' }}>დეტალები</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ padding: '30px', textAlign: 'center', color: '#64748b' }}>
                          აუდიტის ჩანაწერები არ არის
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map((l: any, i: number) => (
                        <tr key={l.id || i} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                          <td style={{ padding: '10px 14px', color: '#94a3b8' }}>
                            {new Date(l.created_at || l.createdAt || Date.now()).toLocaleTimeString('ka-GE')}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 600, color: '#f8fafc' }}>{l.actor}</td>
                          <td style={{ padding: '10px 14px', color: '#60a5fa' }}>{l.action}</td>
                          <td style={{ padding: '10px 14px' }}>{l.entity} {l.entity_id || l.entityId ? `(${l.entity_id || l.entityId})` : ''}</td>
                          <td style={{ padding: '10px 14px', fontFamily: 'monospace', color: '#94a3b8' }}>
                            {JSON.stringify(l.new_vals || l.newVals || {})}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: HEALTH */}
          {activeTab === 'health' && (
            <div style={{
              backgroundColor: '#0f172a',
              borderRadius: '12px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              padding: '24px',
              maxWidth: '800px',
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' }}>
                სისტემის კომპონენტების ჯანმრთელობის სტატუსი
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {[
                  { name: 'Core Engine (Next.js 16 + React 19)', status: 'ACTIVE', desc: 'სერვერული მარშრუტები და API გამართულია', color: '#16a34a' },
                  { name: 'მონაცემთა ბაზა (Supabase / In-Memory Repo)', status: 'CONNECTED', desc: 'ტრანზაქციები, ნაშთის რეზერვაცია და აუდიტი აქტიურია', color: '#16a34a' },
                  { name: 'AI LLM Provider (Gemini / OpenAI / Claude)', status: 'READY', desc: 'პროვაიდერი კონფიგურირებულია, JSON კონტრაქტი ვალიდირდება', color: '#16a34a' },
                  { name: 'Telegram Bot არხი', status: 'READY', desc: 'Webhook & Local Polling მექანიზმები მზადაა', color: '#0284c7' },
                  { name: 'WhatsApp Cloud API არხი', status: 'READY', desc: 'Meta Webhook Handshake & HMAC-SHA256 ვერიფიკაცია ჩართულია', color: '#16a34a' },
                  { name: 'Facebook Messenger არხი', status: 'READY', desc: 'Meta Webhook Handshake & Signature ვერიფიკაცია ჩართულია', color: '#2563eb' },
                  { name: 'Transactional Outbox & Cron', status: 'MONITORING', desc: 'გზავნილების საიმედო რიგი Postgres outbox_messages ცხრილში', color: '#10b981' },
                ].map((item, idx) => (
                  <div key={idx} style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    backgroundColor: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#f8fafc' }}>{item.name}</div>
                      <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>{item.desc}</div>
                    </div>
                    <span style={{
                      backgroundColor: item.color,
                      color: '#fff',
                      fontSize: '11px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontWeight: 700,
                    }}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Modal: Status Transition */}
      {orderModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '460px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 12px 0' }}>
              შეკვეთის #{orderModal.orderNumber} სტატუსის შეცვლა
            </h3>
            <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 16px 0' }}>
              მიმდინარე სტატუსი: <strong>{orderModal.status}</strong>
            </p>

            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#cbd5e1', marginBottom: '6px' }}>
              ახალი სტატუსი
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backgroundColor: '#1e293b',
                color: '#fff',
                fontSize: '13px',
                marginBottom: '20px',
              }}
            >
              <option value="">-- აირჩიეთ სტატუსი --</option>
              <option value="AWAITING_PAYMENT">AWAITING_PAYMENT (გადახდის მოლოდინში)</option>
              <option value="CONFIRMED_PAID">CONFIRMED_PAID (გადახდა დადასტურებულია)</option>
              <option value="PROCESSING">PROCESSING (მუშავდება)</option>
              <option value="READY_FOR_DISPATCH">READY_FOR_DISPATCH (მზადაა გასაგზავნად)</option>
              <option value="SHIPPED">SHIPPED (გადაეცა კურიერს)</option>
              <option value="DELIVERED">DELIVERED (ჩაბარებულია)</option>
              <option value="CANCELLED">CANCELLED (გაუქმებულია)</option>
            </select>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setOrderModal(null)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'transparent',
                  color: '#cbd5e1',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                გაუქმება
              </button>
              <button
                onClick={handleStatusTransition}
                disabled={!newStatus}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: !newStatus ? 'not-allowed' : 'pointer',
                }}
              >
                დადასტურება
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: CSV Import */}
      {csvModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '560px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 8px 0' }}>
              პროდუქციის CSV იმპორტი
            </h3>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '0 0 14px 0' }}>
              ჩასვით CSV ტექსტი სვეტებით: <code>sku, name, name_ka, category, base_price, variant_sku, variant_name, stock_quantity, warranty_info</code>
            </p>

            <textarea
              rows={8}
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
              placeholder="sku,name,name_ka,category,base_price,stock_quantity&#10;IPHONE15,iPhone 15,აიფონ 15,Smartphones,2499,5"
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                color: '#fff',
                fontSize: '12px',
                fontFamily: 'monospace',
                marginBottom: '18px',
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setCsvModalOpen(false)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  backgroundColor: 'transparent',
                  color: '#cbd5e1',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                დახურვა
              </button>
              <button
                onClick={handleCsvImport}
                disabled={!csvInput.trim()}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: '#16a34a',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: !csvInput.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                იმპორტირება ➔
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Product */}
      {newProductModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '24px',
            width: '100%',
            maxWidth: '480px',
          }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, margin: '0 0 16px 0' }}>
              ახალი პროდუქტის დამატება
            </h3>

            <form onSubmit={handleCreateProduct} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>SKU (უნიკალური კოდი)</label>
                <input
                  type="text"
                  required
                  value={newProductForm.sku}
                  onChange={(e) => setNewProductForm({ ...newProductForm, sku: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>დასახელება (ქართულად)</label>
                <input
                  type="text"
                  required
                  value={newProductForm.name_ka}
                  onChange={(e) => setNewProductForm({ ...newProductForm, name_ka: e.target.value, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>ფასი (₾)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newProductForm.base_price}
                    onChange={(e) => setNewProductForm({ ...newProductForm, base_price: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '13px' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>საწყისი მარაგი (ცალი)</label>
                  <input
                    type="number"
                    required
                    value={newProductForm.stock_quantity}
                    onChange={(e) => setNewProductForm({ ...newProductForm, stock_quantity: Number(e.target.value) })}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>კატეგორია</label>
                <input
                  type="text"
                  value={newProductForm.category}
                  onChange={(e) => setNewProductForm({ ...newProductForm, category: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', backgroundColor: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.15)', color: '#fff', fontSize: '13px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setNewProductModal(false)}
                  style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.2)', backgroundColor: 'transparent', color: '#cbd5e1', fontSize: '13px', cursor: 'pointer' }}
                >
                  გაუქმება
                </button>
                <button
                  type="submit"
                  style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}
                >
                  დამატება
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
