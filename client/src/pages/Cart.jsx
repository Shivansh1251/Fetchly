import React, { useState, useEffect } from 'react';
import { api } from '../api.js';

export default function Cart() {
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('fetchly_cart') || '[]'));
  const [code, setCode] = useState('NEW10');
  const [pricing, setPricing] = useState(null);
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  useEffect(() => { localStorage.setItem('fetchly_cart', JSON.stringify(cart)); }, [cart]);

  async function applyCoupon() {
    try {
      const res = await api.post('/api/coupons/apply', { code, subtotal });
      setPricing(res);
    } catch (e) {
      setPricing({ error: e.message });
    }
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        Cart
        <span className="text-xs bg-brand-primary/10 text-brand-primary px-2 py-0.5 rounded">Review</span>
      </h2>
      <div className="space-y-2">
        {cart.length === 0 && (
          <div className="card text-sm text-gray-500">
            Cart is empty. <button onClick={()=>window.history.back()} className="text-brand-primary underline ml-1">Browse products</button>
          </div>
        )}
        {cart.map(i => (
          <div key={i.productId} className="flex justify-between bg-white p-3 rounded border">
            <span>{i.name} <span className="text-xs text-gray-500">x{i.qty}</span></span>
            <span className="font-medium">₹{i.price * i.qty}</span>
          </div>
        ))}
      </div>
      <div className="card space-y-4">
        <div className="flex items-center gap-3">
            <input className="flex-1 border rounded px-3 py-2 text-sm"
              value={code} onChange={e => setCode(e.target.value)} placeholder="Coupon code" />
            <button onClick={applyCoupon} className="btn btn-outline">Apply</button>
        </div>
        <div className="text-sm space-y-1">
          <div className="flex justify-between"><span>Subtotal</span><span>₹{subtotal}</span></div>
          {pricing && !pricing.error && (
            <>
              <div className="rounded bg-green-50 border border-green-200 px-3 py-2 text-green-700 flex justify-between text-xs">
                <span>Coupon {pricing.code} applied ({pricing.percentOff}%)</span>
                <span>-₹{pricing.discount}</span>
              </div>
              <div className="flex justify-between font-medium border-t pt-2"><span>Total</span><span>₹{pricing.total}</span></div>
            </>
          )}
          {pricing?.error && <div className="text-red-500 text-sm">{pricing.error}</div>}
        </div>
      </div>
    </div>
  );
}
