import React from 'react';
import { useAuth } from '../hooks/useAuth.js';

export default function Login() {
  const { loginWithGoogle } = useAuth();
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="card w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-semibold">Welcome to <span className="text-brand-primary">Fetchly</span></h1>
          <p className="text-sm text-gray-500">Fast groceries & essentials delivered rapidly.</p>
        </div>
        <button onClick={loginWithGoogle} className="btn btn-primary w-full gap-2">
          <svg width="20" height="20" viewBox="0 0 533.5 544.3" aria-hidden="true"><path fill="#4285f4" d="M533.5 278.4c0-17.4-1.6-34.1-4.6-50.2H272v95h147.3c-6.4 34.4-25.7 63.5-54.7 83v68h88.4c51.7-47.6 80.5-118 80.5-195.8z"/><path fill="#34a853" d="M272 544.3c73.7 0 135.6-24.5 180.8-66.1l-88.4-68c-24.6 16.5-56.1 26-92.4 26-71 0-131.1-47.9-152.6-112.2H27.8v70.6C72.5 486 166.3 544.3 272 544.3z"/><path fill="#fbbc04" d="M119.4 324c-4.7-14.1-7.4-29.2-7.4-44.7 0-15.5 2.7-30.6 7.4-44.7V164H27.8C10 199.6 0 239.3 0 279.3s10 79.7 27.8 115.3z"/><path fill="#ea4335" d="M272 107.7c40 0 75.8 13.8 104 40.9l77.9-77.9C407.5 24.5 345.7 0 272 0 166.3 0 72.5 58.3 27.8 164l91.6 70.6C140.9 155.6 201 107.7 272 107.7z"/></svg>
          Continue with Google
        </button>
        <div className="text-xs text-center text-gray-400">
          By continuing you agree to our Terms & Privacy Policy.
        </div>
      </div>
    </div>
  );
}
