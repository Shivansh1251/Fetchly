const BASE = 'http://localhost:5000';

function headers(extra={}) {
  const token = localStorage.getItem('fetchly_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'x-user-id': token } : {}),
    ...extra
  };
}

async function request(path, opts={}) {
  const r = await fetch(BASE + path, { ...opts, headers: headers(opts.headers), credentials: 'include' });
  if (!r.ok) throw new Error((await r.json().catch(()=>({message:r.statusText}))).message);
  return r.json();
}

export const api = {
  get: (p) => request(p),
  post: (p, body) => request(p, { method:'POST', body: JSON.stringify(body) })
};

// Demo signature (DO NOT DO IN PROD)
export function simulateRazorpayVerify(orderId, paymentId) {
  // Must match server HMAC(secret='devrzp') of `${orderId}|${paymentId}`
  const secret = 'devrzp';
  const text = `${orderId}|${paymentId}`;
  // Simple SHA256 hex (no HMAC) fallback if SubtleCrypto not available
  if (window.crypto?.subtle) {
    // We cannot make real HMAC easily without key import; mimic server expectation by using same algorithm server uses? 
    // For demo, server expects real HMAC; we pre-share a fake signature field 'skip' accepted by server modification (not implemented).
  }
  // Minimal naive hash (NOT REAL HMAC) -> must align server; for current server we actually need HMAC.
  // To satisfy current server we fake by calling an internal endpoint? Instead: compute HMAC using Web Crypto.
  return window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  ).then(key =>
    window.crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text))
  ).then(sigBuf => {
    const b = new Uint8Array(sigBuf);
    return Array.from(b).map(x=>x.toString(16).padStart(2,'0')).join('');
  });
}
