import { useEffect, useState } from 'react';
import { api } from '../api.js';

export function useAuth() {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('fetchly_user');
    return raw ? JSON.parse(raw) : null;
  });
  const [loading, setLoading] = useState(false);

  async function loadUser() {
    const token = localStorage.getItem('fetchly_token');
    if (!token) return;
    try {
      setLoading(true);
      const res = await api.get('/api/auth/me');
      setUser(res.user);
      localStorage.setItem('fetchly_user', JSON.stringify(res.user));
    } catch {
      logout();
    } finally { setLoading(false); }
  }

  useEffect(() => { if (!user) loadUser(); }, []); // initial fetch

  function setToken(token) {
    if (token) {
      // NEW: clear any pre-login guest cart so user starts with empty cart
      localStorage.removeItem('fetchly_cart');
      localStorage.setItem('fetchly_token', token);
    }
  }

  function logout() {
    localStorage.removeItem('fetchly_user');
    localStorage.removeItem('fetchly_token');
    setUser(null);
  }

  const loginWithGoogle = () => {
    window.location.href = 'http://localhost:5000/auth/google';
  };

  return { user, loading, loginWithGoogle, logout, setToken, refresh: loadUser };
}
