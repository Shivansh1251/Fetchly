import React, { useState } from 'react';
import { api } from '../api.js';
import { useNavigate } from 'react-router-dom';

export default function Checkout() {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const nav = useNavigate();
  const cart = JSON.parse(localStorage.getItem('fetchly_cart') || '[]');
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = +(subtotal * 0.10).toFixed(2);
  const total = +(subtotal - discount).toFixed(2);
  const user = JSON.parse(localStorage.getItem('fetchly_user') || 'null');

  async function loadRazorpay() {
    if (window.Razorpay) return true;
    return new Promise(resolve => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = () => resolve(true);
      s.onerror = () => resolve(false);
      document.body.appendChild(s);
    });
  }

  async function pay() {
    setLoading(true); setMsg('');
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error("Failed to load payment SDK");
      const items = cart.map(c => ({ productId: c.productId, qty: c.qty }));
      const create = await api.post('/api/payment/create-order', { items, couponCode: 'NEW10' });

      const options = {
        key: create.key,
        amount: create.amount,
        currency: create.currency,
        name: 'Fetchly',
        description: 'Order Payment',
        order_id: create.razorpayOrderId,
        prefill: {
          name: user?.name || 'User',
            email: user?.email || 'user@example.com'
        },
        theme: { color: '#00b85c' },
        handler: async (resp) => {
          try {
            const verify = await api.post('/api/payment/verify', {
              razorpayOrderId: resp.razorpay_order_id,
              razorpayPaymentId: resp.razorpay_payment_id,
              razorpaySignature: resp.razorpay_signature
            });
            setMsg('🎉 Payment success! Finalizing order...');
            setTimeout(() => {
              localStorage.removeItem('fetchly_cart');
              nav(`/order/${verify.orderId}/placed`);
            }, 800);
          } catch (e) {
            setMsg(e.message);
          }
        },
        modal: {
          ondismiss: () => {
            setMsg('Payment cancelled.');
            setLoading(false);
          }
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (e) {
      setMsg(e.message);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <h2 className="text-xl font-semibold">Billing & Payment</h2>
      {msg && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded">{msg}</div>}
      <div className="card space-y-2">
        {cart.map(i => (
          <div key={i.productId} className="flex justify-between text-sm">
            <span>{i.name} x{i.qty}</span>
            <span>₹{i.price * i.qty}</span>
          </div>
        ))}
        <div className="flex justify-between text-sm"><span>Subtotal</span><span>₹{subtotal}</span></div>
        <div className="flex justify-between text-sm text-green-600"><span>Coupon NEW10 (10%)</span><span>-₹{discount}</span></div>
        <div className="flex justify-between font-medium border-t pt-2">
          <span>Total (Charged)</span><span>₹{total}</span>
        </div>
      </div>
      <button disabled={!cart.length || loading} onClick={pay} className="btn btn-primary w-full">
        {loading ? 'Processing...' : 'Pay Securely'}
      </button>
      {msg && <p className="text-red-500 text-sm">{msg}</p>}
    </div>
  );
}
