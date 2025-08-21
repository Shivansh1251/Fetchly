# Fetchly (MERN Demo)

Full-stack demo implementing:
- Product browsing
- Cart + coupon apply (NEW10)
- Order creation + (mocked) Razorpay flow
- Delayed delivery partner assignment (3 min) with 15 min partner cooldown
- Order status polling

## 1. Prerequisites
- Node 18+
- npm (or pnpm/yarn)
- (Optional) MongoDB if you plan to replace in-memory storage

## 2. Environment Variables (server/.env)
Create `d:\Fetchly\server\.env`:
```
MongoDB_URI=mongodb://127.0.0.1:27017/fetchly
Session_Secret=changeme_session
Google_Client_ID=your-google-id
Google_Client_Secret=your-google-secret
RAZORPAY_KEY_ID=rzp_test_demo
RAZORPAY_WEBHOOK_SECRET=devrzp
```
(You can omit Google / Razorpay for basic local demo.)

## 3. Install Dependencies
Backend:
```
cd server
npm install
```
Client:
```
cd ../client
npm install
```

## 4. Run Dev Servers
In one terminal (backend):
```
cd server
node server.js
```
Server runs at http://localhost:5000

In another (client):
```
cd client
npm run dev
```
Client at http://localhost:5173

## 5. API Overview
- POST /api/users/register
- POST /api/users/login
- GET  /api/products
- POST /api/coupons/apply  { code, subtotal }
- POST /api/payment/create-order { items, couponCode? }
- POST /api/payment/verify { razorpayOrderId, razorpayPaymentId, razorpaySignature }
- GET  /api/orders/me
- GET  /api/orders/:id

Auth header used: `x-user-id` (token returned from register/login). (Temporary placeholder – replace with JWT.)

## 5.a Razorpay (Real Integration Active)
The app now uses real Razorpay order creation & signature verification.
Flow:
1. Client calls POST /api/payment/create-order with items (+ optional couponCode).
2. Server creates a Razorpay order (amount in paise) using RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET.
3. Client opens Razorpay Checkout with returned order id.
4. On success, Checkout returns (razorpay_order_id, razorpay_payment_id, razorpay_signature).
5. Client POSTs these to /api/payment/verify.
6. Server recomputes HMAC sha256(order_id|payment_id, RAZORPAY_KEY_SECRET); on match persists Order and schedules partner assignment (≈10s).

Environment (server/.env):
RAZORPAY_KEY_ID=rzp_test_FDXSZ76LEo92zE
RAZORPAY_KEY_SECRET=*** (already set)
RAZORPAY_WEBHOOK_SECRET=devrzp   # (optional, webhook endpoint currently not enabled)

Security Notes:
- Never commit live production secrets; rotate test keys periodically.
- Only the server performs signature verification; client does not compute any HMAC.
- For webhooks (payment.authorized / captured) enable a POST /api/payment/webhook with x-razorpay-signature verification.

## 6. Demo Flow (UI)
1. Open client in browser.
2. Login with Google.
3. Add products to cart.
4. Apply coupon NEW10 (10%).
5. Checkout: Razorpay modal opens; complete test payment.
6. Redirect to order page `/order/:id/placed`.
7. Status -> pending-assignment then assigned (~10s).
8. View order history at /orders.

## 7. Delivery Partner Assignment
- Scheduled with `setTimeout` 3 minutes after verification.
- Partners rotated with a 15 minute cooldown.
- If none free, retry every 60s.
- Enhancements: move to job queue (Bull / Agenda) + persistent partner documents.

## 8. Mocked / To Replace for Production
| Area | Current | Production TODO |
|------|---------|-----------------|
| Auth | Plain user id token | JWT + bcrypt password hashing |
| Razorpay | Simulated HMAC/signature in client | Real Razorpay Checkout + server-side verification only |
| Data | In-memory arrays | MongoDB collections + schemas |
| Jobs | setTimeout | Durable queue / scheduler |
| Security | Minimal validation | Rate limiting, input sanitization, logging |

## 9. Testing Ideas
- Unit: coupon calculation.
- Integration: payment verify & order creation.
- Timer: use Jest fake timers for 3m assignment.
- Load: simulate multiple orders to confirm partner cooldown logic.

## 10. Cleanup / Next Steps
- Implement real hashing (`bcrypt`).
- Abstract price & discount recalculation on verify.
- Add admin endpoints for partners & orders.
- Add WebSocket/SSE for live assignment instead of polling.

## 11. Common Issues
| Symptom | Fix |
|---------|-----|
| 404 on API | Ensure server running on 5000 & correct base URL in client |
| Signature mismatch | Client HMAC must match `RAZORPAY_WEBHOOK_SECRET` (dev uses devrzp) |
| Order never assigns | Wait full 3 min; ensure server not restarted (timers reset) |

### 11.a  HTTP 404 at http://localhost:5173/
Cause list:
1. Client dev server not started (you only started backend).  
2. Missing client folder or dependencies not installed.  
3. Vite picked a different port (5173 busy) – check terminal output (it shows the actual port).  
4. Opening 5173 after building but NOT serving dist via backend (need static serve block in server.js or run `npm run dev`).  
5. index.html missing (ensure client/public/index.html exists).

Fix steps:
```
cd client
npm install            # if not done
npm run dev            # starts Vite, watch console for "Local:  http://localhost:5173/"
```
If port differs (e.g. 5174) use that URL.

For production build + backend serve:
```
cd client
npm run build
# uncomment static serve block in server/server.js
NODE_ENV=production node server.js
```

Verify:
- Visit the exact URL printed by Vite.
- Open DevTools Network tab; if requests to /api fail with CORS, ensure cors middleware is enabled (added in server.js).

## 12. Architecture Alignment (Blinkit / Zepto Style)
This repository now includes an Architecture Blueprint (see ROADMAP.md) covering:
- Customer & Rider apps (React / React Native strategy)
- Backend microservices layout (NestJS + Node + Kafka)
- Polyglot persistence (PostgreSQL, MongoDB, Redis, ClickHouse)
- Real-time stack (WebSockets + Kafka + Redis)
- Delivery assignment engine approach
- Admin / Ops panel requirements
- Deployment (Kubernetes, GitOps, Observability, Security)

Adoption Path (from current demo):
1. Add TypeScript + service boundaries.
2. Persist orders/products fully in Mongo, then introduce PostgreSQL for orders.
3. Introduce Redis + BullMQ for delayed partner assignments (replace setTimeout).
4. Add WebSocket gateway for live tracking channels.
5. Implement Kafka for event distribution.
6. Spin out promo / pricing logic as dedicated service.
7. Add analytics pipeline (event -> ClickHouse).
8. Harden security (JWT rotation, rate limits, audit logs).
9. Add rider mobile app + location streaming.
10. Migrate to Kubernetes + CI/CD GitOps.

Quick Checklist:
- [ ] Replace in-memory arrays with repositories
- [ ] Abstract pricing & coupon engine
- [ ] Event schema definitions (Avro / protobuf)
- [ ] Introduce assignment scoring metrics
- [ ] Implement observability baseline (metrics + tracing)
- [ ] Security baseline (headers, input validation, secrets mgmt)
- [ ] WebSocket notification service
- [ ] Background job queue for retries / SLAs

(Refer to ROADMAP.md for full details.)

(End)
