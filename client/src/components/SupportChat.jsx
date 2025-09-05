import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../hooks/useAuth.js';

// Static support chatbot focused on post-order concerns
export default function SupportChat() {
  const { user } = useAuth();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [messages, setMessages] = useState(() => []);
  const [input, setInput] = useState('');
  const [typing, setTyping] = useState(false);
  const timerRef = useRef(null);
  const listRef = useRef(null);

  // Find order id from URL if present: /order/:id/placed
  const urlOrderId = useMemo(() => {
    const m = loc.pathname.match(/\/order\/([^/]+)\/placed/);
    return m ? m[1] : null;
  }, [loc.pathname]);

  const currentOrder = useMemo(() => {
    if (!orders?.length) return null;
    if (urlOrderId) {
      return orders.find(o => o.id === urlOrderId) || orders[0];
    }
    return orders[0]; // most recent first (server sorts desc in Orders.jsx)
  }, [orders, urlOrderId]);

  useEffect(() => {
    if (!user) return; // only when logged in
    if (!open) return; // lazy-load when opening chat
    let mounted = true;
    setLoadingOrders(true);
    api.get('/api/orders/me').then((d) => {
      if (!mounted) return;
      const arr = Array.isArray(d?.orders) ? d.orders : [];
      setOrders(arr);
      // Seed an initial bot message when first opening
      setMessages((prev) => {
        if (prev.length) return prev;
        const intro = arr.length
          ? `Hi! How can I help with your order #${(urlOrderId && arr.find(o=>o.id===urlOrderId)?.id) || arr[0].id}?`
          : 'Hi! How can I help you today? (No recent orders found)';
        return [
          { from: 'bot', text: 'Support Center • Post‑Order Help', ts: Date.now() },
          { from: 'bot', text: intro, ts: Date.now() }
        ];
      });
    }).finally(() => setLoadingOrders(false));
    return () => { mounted = false; };
  }, [open, user, urlOrderId]);

  // Scroll to bottom when messages update
  useEffect(() => {
    if (!listRef.current) return;
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, typing]);

  function onSend() {
    const text = input.trim();
    if (!text) return;
    const now = Date.now();
    setMessages((m) => [...m, { from: 'user', text, ts: now }]);
    setInput('');
    // Simulate agent typing and reply after 10 seconds
    setTyping(true);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setTyping(false);
      const orderLine = currentOrder
        ? ` I can see order #${currentOrder.id}${currentOrder.items?.length ? ` with ${currentOrder.items.length} item(s)` : ''}.`
        : '';
      setMessages((m) => [
        ...m,
        { from: 'bot', text: 'hi i am suraj your assistant,' + orderLine, ts: Date.now() }
      ]);
    }, 10000);
  }

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!user) return null;

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          className="fixed bottom-5 right-5 z-40 rounded-full shadow-lg bg-brand-primary text-white px-4 py-3 text-sm hover:bg-brand-dark"
          onClick={() => setOpen(true)}
          aria-label="Open Help and Support"
        >
          Help & Support
        </button>
      )}
      {/* Panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-40 w-80 max-w-[92vw] bg-white border border-gray-200 rounded-lg shadow-xl flex flex-col">
          <div className="px-3 py-2 bg-gradient-to-r from-brand-primary via-emerald-500 to-brand-dark text-white rounded-t-lg flex items-center justify-between">
            <div className="text-sm font-semibold">Support Chat</div>
            <button className="text-white/90 hover:text-white" onClick={() => setOpen(false)} aria-label="Close">
              ✕
            </button>
          </div>
          <div className="px-3 py-2 text-xs border-b">
            {loadingOrders ? (
              <span className="text-gray-500">Loading your orders…</span>
            ) : currentOrder ? (
              <div className="text-gray-700">
                Concern: After order completion • Tracking help
                <div className="mt-1 text-gray-500">Context: Order <span className="font-semibold">#{currentOrder.id}</span>{currentOrder.total ? ` • ₹${currentOrder.total}` : ''}</div>
              </div>
            ) : (
              <span className="text-gray-500">No recent orders.</span>
            )}
          </div>

          <div ref={listRef} className="p-3 space-y-2 overflow-y-auto max-h-72">
            {messages.map((m, idx) => (
              <div key={idx} className={m.from === 'user' ? 'text-right' : 'text-left'}>
                <span className={
                  'inline-block px-3 py-2 rounded text-sm ' +
                  (m.from === 'user' ? 'bg-brand-primary text-white' : 'bg-gray-100 text-gray-800')
                }>
                  {m.text}
                </span>
              </div>
            ))}
            {typing && (
              <div className="text-left">
                <span className="inline-block px-3 py-2 rounded text-sm bg-gray-100 text-gray-500">Suraj is typing…</span>
              </div>
            )}
          </div>

          <div className="p-2 border-t flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Describe your issue…"
              className="flex-1 border rounded px-2 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-brand-primary"
              onKeyDown={(e) => { if (e.key === 'Enter') onSend(); }}
            />
            <button className="btn btn-primary text-sm" onClick={onSend}>Send</button>
          </div>
        </div>
      )}
    </>
  );
}
