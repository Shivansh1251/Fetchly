import React from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Products from './pages/Products.jsx';
import Cart from './pages/Cart.jsx';
import Checkout from './pages/Checkout.jsx';
import OrderPlaced from './pages/OrderPlaced.jsx';
import Orders from './pages/Orders.jsx';
import Login from './pages/Login.jsx';
import AuthCallback from './pages/AuthCallback.jsx';
import { useAuth } from './hooks/useAuth.js';
import './index.css'; // NEW tailwind
import SupportChat from './components/SupportChat.jsx';

function Nav() {
  const { user, logout } = useAuth();
  return (
    <nav className="bg-gradient-to-r from-brand-primary via-emerald-500 to-brand-dark text-white shadow">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-6">
        <Link to="/" className="font-semibold tracking-wide text-white">Fetchly</Link>
        {user && (
          <>
            <Link to="/" className="text-xs sm:text-sm hover:opacity-90">Products</Link>
            <Link to="/cart" className="text-xs sm:text-sm hover:opacity-90">Cart</Link>
            <Link to="/checkout" className="text-xs sm:text-sm hover:opacity-90">Checkout</Link>
            <Link to="/orders" className="text-xs sm:text-sm hover:opacity-90">Orders</Link>
          </>
        )}
        <div className="ml-auto flex items-center gap-3 text-xs sm:text-sm">
          {user
            ? <>
                <span className="hidden sm:inline">{user.name || user.email}</span>
                <button onClick={logout} className="btn btn-outline h-8 px-3 text-xs bg-white/10 border-white/40 text-white hover:bg-white/20">Logout</button>
              </>
            : <Link to="/login" className="btn btn-primary h-8 px-4 text-xs bg-white text-brand-primary hover:bg-brand-accent hover:text-gray-800 font-semibold">Login</Link>}
        </div>
      </div>
    </nav>
  );
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <div className="p-8">Loading...</div>;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Nav />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <Routes>
          <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/" element={<RequireAuth><Products /></RequireAuth>} />
          <Route path="/cart" element={<RequireAuth><Cart /></RequireAuth>} />
          <Route path="/checkout" element={<RequireAuth><Checkout /></RequireAuth>} />
          <Route path="/order/:id/placed" element={<RequireAuth><OrderPlaced /></RequireAuth>} />
          <Route path="/orders" element={<RequireAuth><Orders /></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
  <SupportChat />
      <footer className="mt-12 text-center text-xs text-white py-6 bg-gradient-to-r from-brand-dark via-brand-primary to-emerald-600">
        © {new Date().getFullYear()} Fetchly Demo • Rapid Delivery Experience
      </footer>
    </div>
  );
}
