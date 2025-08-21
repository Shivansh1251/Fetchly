import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useNavigate } from 'react-router-dom';

export default function Products() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('fetchly_cart') || '[]'));
  const nav = useNavigate();

  useEffect(() => { api.get('/api/products').then(d => setProducts(d.products)); }, []);
  useEffect(() => { localStorage.setItem('fetchly_cart', JSON.stringify(cart)); }, [cart]);

  function add(p) {
    setCart(prev => {
      const ex = prev.find(i => i.productId === p.id);
      if (ex) ex.qty += 1; else prev.push({ productId: p.id, name: p.name, price: p.price, qty: 1 });
      return [...prev];
    });
  }

  function buyNow(p) {
    const fresh = [{ productId: p.id, name: p.name, price: p.price, qty: 1 }];
    setCart(fresh);
    localStorage.setItem('fetchly_cart', JSON.stringify(fresh));
    nav('/checkout');
  }

  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Shop Essentials</h1>
          <p className="text-sm text-gray-500">Hand-picked items delivered fast.</p>
        </div>
        <div className="text-right">
          <div className="badge">Cart Items: {cart.length}</div>
          <div className="text-xs text-gray-500 mt-1">Total ₹{total}</div>
        </div>
      </header>
      <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {products.map(p => (
          <div key={p.id} className="card flex flex-col relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/5 to-brand-accent/10 opacity-0 group-hover:opacity-100 transition pointer-events-none" />
            <div className="flex-1 space-y-3 relative z-10">
              <div className="h-28 w-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-md flex items-center justify-center text-xs text-gray-500">
                IMG
              </div>
              <h3 className="font-medium">{p.name}</h3>
              <p className="text-brand-primary font-semibold text-lg">₹{p.price}</p>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Fast Delivery</p>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 relative z-10">
              <button type="button" onClick={() => add(p)} className="btn btn-outline text-xs py-2 border-brand-primary text-brand-primary hover:text-white">
                Add
              </button>
              <button type="button" onClick={() => buyNow(p)} className="btn btn-primary text-xs py-2">
                Order Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
