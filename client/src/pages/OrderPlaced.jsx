import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';

export default function OrderPlaced() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [tries, setTries] = useState(0);
  const [eta, setEta] = useState(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer;
    async function fetchOrder() {
      try {
        const res = await api.get(`/api/orders/${id}`);
        if (cancelled) return;
        setOrder(res.order);
        if (res.order.status === 'assigned') {
          // NEW: Show popup when assigned
          alert('Order placed! Delivery partner assigned.');
        }
        if (res.order.status !== 'assigned') {
            if (res.order.assignmentScheduledFor) {
              setEta(new Date(res.order.assignmentScheduledFor).getTime());
            }
            pollTimer = setTimeout(fetchOrder, 5000);
            setTries(t => t + 1);
        }
      } catch {
        if (!cancelled) pollTimer = setTimeout(fetchOrder, 7000);
      }
    }
    fetchOrder();
    return () => { cancelled = true; clearTimeout(pollTimer); };
  }, [id]);

  // Countdown
  const [remaining, setRemaining] = useState('');
  useEffect(() => {
    if (!eta || order?.status === 'assigned') return;
    const i = setInterval(() => {
      const diff = eta - Date.now();
      if (diff <= 0) {
        setRemaining('Any moment now...');
      } else {
        const s = Math.ceil(diff / 1000);
        setRemaining(`${s}s`);
      }
    }, 1000);
    return () => clearInterval(i);
  }, [eta, order?.status]);

  if (!order) return <div className="text-center py-12">Loading order...</div>;

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Order #{order.id}</h2>
        <span className="badge">{order.status}</span>
      </div>
      {order.status === 'assigned'
        ? <div className="card text-sm space-y-1">
            <div><strong>Partner:</strong> {order.assignedPartnerName || 'Assigned'} ({order.assignedPartnerId})</div>
            <div><strong>Assigned At:</strong> {order.assignedAt}</div>
          </div>
        : <div className="card text-sm text-gray-600 space-y-1">
            <div>Waiting for partner assignment.</div>
            {remaining && <div className="text-xs">Estimated: {remaining}</div>}
            <div className="text-[10px] text-gray-400">Polls: {tries}</div>
          </div>}
      <div className="card space-y-2">
        <h3 className="font-medium">Items</h3>
        {order.items.map(i =>
          <div key={i.productId} className="flex justify-between text-sm">
            <span>{i.product?.name} x{i.qty}</span>
            <span>₹{i.price * i.qty}</span>
          </div>
        )}
        <div className="text-sm border-t pt-2 space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{order.subtotal}</span></div>
          <div className="flex justify-between text-green-600"><span>Discount</span><span>-₹{order.discount}</span></div>
          <div className="flex justify-between font-medium"><span>Total</span><span>₹{order.total}</span></div>
        </div>
      </div>
    </div>
  );
}
