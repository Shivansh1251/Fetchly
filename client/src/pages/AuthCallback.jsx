import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

export default function AuthCallback() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { setToken, refresh } = useAuth();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      setToken(token);
      refresh().finally(() => nav('/'));
    } else {
      nav('/login');
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="animate-pulse text-brand-primary font-medium">Signing you in...</div>
    </div>
  );
}
