import React, { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Link } from 'react-router-dom';

export default function Orders() {
  const [orders, setOrders] = useState([]);
  useEffect(() => { api.get('/api/orders/me').then(d => setOrders(d.orders)); }, []);
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">My Orders</h2>
      <div className="space-y-3">
        {orders.map(o => (
          <Link key={o.id} to={`/order/${o.id}/placed`} className="block card hover:shadow-md transition">
            <div className="flex justify-between text-sm">
              <span className="font-medium">#{o.id}</span>
              <span className="badge">{o.status}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">Total ₹{o.total}</div>
          </Link>
        ))}
      </div>
      {!orders.length && <p className="text-gray-500 text-sm">No orders yet.</p>}
    </div>
  );
}
