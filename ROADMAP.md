# Fetchly MERN Roadmap

## Core User Flows
1. Browse Products (Order Page) ✅
2. Cart Page (client-side placeholder) ☐
3. Coupon Apply Backend ✅
4. Payment (Razorpay stub + signature simulation) ✅
5. Order Placed Page (frontend pending) ☐
6. Delayed Delivery Partner Assignment (in-memory timers) ✅

## Data Models (Mongo Later)
User: { _id, email, passwordHash, createdAt }
Product: { _id, name, price, stock, active }
Coupon: { _id, code, percentOff, active, expiresAt, maxUses }
Order: {
  _id, userId, items:[{ productId, nameSnapshot, price, qty }],
  subtotal, discount, total,
  payment: { provider:'razorpay', orderId, paymentId, signature, status },
  status: 'pending-assignment' | 'assigned' | 'in-transit' | 'delivered',
  assignedPartnerId, assignedAt, createdAt
}
DeliveryPartner: {
  _id, name, active,
  lastAssignedAt, cooldownUntil
}

## Coupon Flow
- Client computes subtotal.
- Server validates coupon + returns discount & total.
- On payment create-order store provisional discount to prevent tampering.
- On verify recompute server-side for integrity.

## Razorpay Integration (Real)
1. Server create order using Razorpay SDK (amount in paise).
2. Client opens Razorpay Checkout with returned order id.
3. On success client sends verification payload.
4. Server verifies signature: hmac_sha256(order_id|payment_id, RAZORPAY_KEY_SECRET).
5. Persist final order.

## Delivery Partner Assignment Logic
Implemented (in-memory):
- 3 minute delayed assignment
- 15 minute cooldown
- Retry every 60s if no partner free
- Ensures different partner if prior still cooling down

Next:
- Persist partners & jobs in Mongo / queue.
- Real Razorpay integration.

## Frontend Pages
/products              -> list products
/cart                  -> cart items + apply coupon
/checkout              -> review + pay (Razorpay widget)
/order/:id/placed      -> waiting screen with live status
/orders                -> order history
/auth (login/register) -> basic auth (JWT)

/delivery (internal/admin) -> monitor partners and assignments (later)

## State Management
- Auth: JWT stored in httpOnly cookie or memory + refresh token.
- Cart: LocalStorage (guest) -> merge into server cart after login.
- Orders: React Query / SWR polling until assignment done.

## Security Checklist
- Validate all inputs (items structure, coupon code).
- Recalculate pricing server-side.
- Hash passwords (bcrypt).
- Store Razorpay secret only on server.
- Limit coupon usage (per user & total).

## Incremental Milestones
- [x] M1: Products + Coupon apply (in-memory)
- [x] M2: Payment order create (stub)
- [x] M3: Basic verify & order persistence (in-memory)
- [x] M4: Delayed partner assignment (setTimeout)
- [ ] M5: Job queue + cooldown persistence
- [ ] M6: Real auth (JWT + hashing)
- [ ] M7: Realtime updates (WebSocket/SSE)
- [ ] M8: Hardening

## Example Partner Selection Pseudocode
function attemptAssign(order) {
  const now = Date.now();
  const partner = partners.find(p => p.cooldownUntil <= now);
  if(!partner) return retryIn(60000);
  order.assignedPartnerId = partner._id;
  order.assignedAt = now;
  order.status = 'assigned';
  partner.lastAssignedAt = now;
  partner.cooldownUntil = now + 15*60*1000;
}

## Testing Strategy
- Unit: pricing (subtotal, discount, total).
- Integration: payment verify flow (mock Razorpay).
- E2E: place order -> after 3m partner assigned (use jest fake timers).
- Load: multiple orders ensure cooldown respected.

## Future Enhancements
- Partner routing optimization.
- Real-time location tracking.
- Coupon usage analytics & A/B tests.
- Inventory & stock reservations.

(End)

---

# Architecture Blueprint (Blinkit / Zepto Style Clone)

## 1. Customer App (Mobile + Web)
Recommended Technology:
- Mobile: React Native (Expo for rapid iteration; eject later for native modules)
- Web: React + Vite (already present) with design system shared via a mono-repo package (e.g., pnpm workspaces / Nx)
- State: React Query (server cache) + Zustand/Recoil for ephemeral UI + feature flags
- Navigation: React Navigation (mobile), React Router (web)
Justification: Shared component model, large ecosystem, fast iteration, type safety with TypeScript.

Core Features:
- Auth: Phone OTP (SMS via Twilio / Firebase), social login (Google/Apple)
- Location: Auto-detect, address management, geocoding + reverse geocoding
- Product Browsing: Category, search with typeahead, personalized ranking
- Cart: Real-time price, coupon application, substitution recommendations
- Checkout: Multiple payment options (UPI, Card, Wallet, COD)
- Order Tracking: Live map (WebSocket), ETA updates, status timeline
- Notifications: Push (FCM/APNS), in-app event stream
- Offers & Gamification: Streaks, badges, referral
- Accessibility & Performance: Image CDN (CloudFront / Cloudflare), skeleton loading, offline fallback

Key Libraries / Integrations:
- react-native-maps / Mapbox GL
- Payment: Razorpay / Stripe / PhonePe / Cashfree
- Analytics: Segment + Mixpanel
- Feature Flags: LaunchDarkly / GrowthBook
- Crash & Performance: Sentry

## 2. Delivery Rider App
Tech: React Native + Hermes engine; background location tasks
Core Features:
- Secure login + device binding
- Shift management: clock-in/out
- Order queue & acceptance (SLA response window)
- Route optimization + multi-stop batching
- Live location streaming (low-power adaptive sampling)
- Earnings dashboard (daily, weekly)
- Incident reporting (damaged goods, delays)
- Offline queue (store events when no connectivity)
- Push notifications + VoIP (emergency contact)
Integrations:
- Turn-by-turn: Mapbox Navigation SDK
- Background geolocation (adjust interval based on movement speed)

## 3. Backend Platform
Recommended Technology Stack:
- API Gateway / Edge: NGINX / Kong / Cloudflare
- Core Services: Node.js (NestJS for structure) + TypeScript
- High Throughput / CPU Bound: Go microservices (e.g., routing optimization)
- Protocols: REST + gRPC internal + GraphQL BFF (optional)
- Async Messaging: Apache Kafka (events: order.created, rider.location.updated)
- Task / Job Processing: BullMQ (Redis) or Temporal.io for workflows
- Authentication: JWT + short-lived access + refresh rotation; service-to-service mTLS
Justification: NestJS provides modular DI, testability; Kafka for event sourcing & scalability.

Core Domain Services (separate deployable units):
- user-service
- auth-service (OTP, session risk scoring)
- product-service (catalog + pricing + inventory sync)
- inventory-service (real-time stock, reservations)
- order-service (order lifecycle, state machine)
- payment-service (Razorpay / Stripe reconciliation, webhooks)
- fulfillment-service (assignment engine, batching)
- logistics-service (routing, SLA prediction)
- notification-service (email/SMS/push/WebSocket fan-out)
- analytics-service (event aggregation, KPI)
- coupon-promo-service (eligibility, rule engine)
- settlement-service (rider payouts, merchant settlement)
- audit-service (immutable append-only trail)

Cross-Cutting:
- API Schema: OpenAPI + protobuf (gRPC)
- Observability: OpenTelemetry (traces, metrics), Prometheus, Grafana
- Logging: Structured JSON (pino), central shipping via Fluent Bit -> OpenSearch
- Circuit Breaking: Envoy / Resilience policies

## 4. Database & Storage Layer
Polyglot Persistence:
- PostgreSQL (OLTP canonical source for orders, users, payments)
- MongoDB (flexible product attributes, dynamic schema)
- Redis (caching, ephemeral order states, rate limiting)
- Elastic / OpenSearch (search, autocomplete)
- ClickHouse / BigQuery (analytical; fast aggregations)
- S3 / Object Store (images, invoices, proofs-of-delivery)
- Neo4j (optional for complex route graph optimization)
Justification: Each workload matched to data access patterns.

Sample Schemas (high-level):

orders (PostgreSQL)
  id (uuid PK)
  user_id (fk)
  status (enum)
  subtotal numeric
  discount numeric
  total numeric
  payment_status enum
  address_snapshot jsonb
  created_at timestamptz
  updated_at timestamptz
  version int (optimistic locking)

order_items
  order_id fk
  product_id fk
  qty int
  unit_price numeric
  attributes_snapshot jsonb

inventory_events (event sourcing)
  id, product_id, delta, reason, correlation_id, created_at

coupon_rules (Mongo)
  { _id, code, type:'PERCENT'|'FLAT', percent, amount, constraints:{minOrder,totalUsagePerUser,validChannels}, active, validFrom, validTo }

Indexes:
- orders(status, created_at DESC)
- rider_locations(rider_id, updated_at)
- geospatial index for store coverage zones

Caching Strategy:
- Product list & category tree (Redis with version tags)
- Hot coupons & feature flags
- Rider assignment candidate sets

## 5. Real-Time & Live Tracking
Technologies:
- WebSocket layer: Socket.IO gateway (horizontal scale) over Redis adapter OR native ws + NATS JetStream
- Pub/Sub: Kafka topics -> consumer -> WebSocket broadcaster
- Location Streaming: Riders send location every 5–10s (adaptive)
- Temporal Refinement: Server interpolates paths for smoother UI
- Push: FCM/APNS reserved for state transitions (not high-frequency updates)
- Optional: MQTT (for constrained devices) / WebRTC data channels (low-latency peer relay)
Justification: WebSocket sufficient; Kafka ensures durability & replay.

Features:
- Order status channel (namespace /room: order:{id})
- ETA recalculation events
- Dynamic surge pricing feed
- Rider proximity heatmap (aggregated, privacy-sanitized)
- Live ops dashboard feeds

Scaling:
- Sticky sessions via cookie-based hashing OR shared session store
- Backpressure handling: drop stale location frames > N threshold
- Throttle + shape outbound updates per client subscription priority

## 6. Delivery Partner Assignment Engine
Algorithm (multi-stage):
1. Candidate Filtering: available status, within store zone radius
2. Scoring Factors: distance, current load, acceptance rate, reliability score, predicted route congestion
3. Batching: cluster near orders (k-means / geo-hash bucket)
4. Reservation: optimistic lock with TTL; fallback on timeout
5. SLA Prediction: ML model (XGBoost) factoring weather/time

Data Sources:
- Rider telemetry stream
- Historical performance store
- Traffic / map service API (Google / Mapbox)

Tools:
- Redis sorted sets (geo + score composite)
- Lua scripts for atomic candidate pop

## 7. Admin & Manager Panel
Tech:
- React (internal portal) + Component Library (e.g., Ant Design)
- Auth: SSO (OIDC) + RBAC (Casbin / Oso)
Features:
- Catalog management (bulk CSV upload, image pipeline)
- Inventory forecasting & adjustments
- Order live board (filter by hub, SLA breach alerts)
- Rider shift & performance dashboard
- Promotions builder (rule editor)
- Fraud monitoring (anomaly detection flags)
- Coupon analytics & A/B experiments
- Settlement & reconciliation (export to finance)
- Incident / support ticket tooling

## 8. Security & Compliance
Practices:
- Rate limiting (Redis token bucket)
- WAF (Cloudflare)
- JWT rotation + short TTL + refresh revocation list
- Field-level encryption (PII) using KMS
- Secrets: Vault / AWS Secrets Manager
- Audit log immutability (append-only WORM bucket)
- Data minimization in logs
- GDPR: user data export + delete workflow

## 9. Deployment & Infrastructure
Recommended Stack:
- Cloud: AWS (similar patterns viable in GCP/Azure)
- Container Orchestration: Kubernetes (EKS) + Helm charts
- Service Mesh: Istio / Linkerd (mTLS, traffic shaping)
- CI/CD: GitHub Actions -> ArgoCD (GitOps)
- Infra as Code: Terraform
- Caching Layer: AWS ElastiCache (Redis cluster mode)
- Messaging: MSK (Kafka) / Confluent Cloud
- Object Storage: S3 + CloudFront CDN
- Image Processing: Lambda@Edge / ImgProxy
- Secrets: AWS Secrets Manager
- Metrics: Prometheus + Thanos; Logs: OpenSearch; Tracing: Jaeger / Tempo
- Horizontal Autoscaling: HPA (CPU, custom metrics: queue depth)
- Blue/Green & Canary: Argo Rollouts
- Disaster Recovery: Multi-AZ + cross-region async replica (critical databases)

## 10. Observability & Reliability
- SLOs: e.g., 99% order placement < 2s; 95% assignment < 60s
- Alerting: PagerDuty + anomaly detection (Prometheus + Alertmanager)
- Chaos Testing: Gremlin / Litmus (pod kill, network delay)
- Synthetic Monitoring: k6 + uptime checks
- Cost Monitoring: Kubecost + AWS CUR pipeline

## 11. Data & Analytics
Pipeline:
- Event capture (Kafka) -> Kafka Connect -> ClickHouse / BigQuery
- Batch ML: Feature store (Feast), training pipelines (Airflow)
- Real-time aggregates: Materialized views (ClickHouse) for dashboards
Use Cases:
- Dynamic pricing
- Demand forecasting
- Churn prediction
- Fraud detection (velocity rules + model)

## 12. Development Workflow
- Monorepo (Nx / Turborepo), packages: shared-types, ui-kit, auth-sdk
- API contract first (OpenAPI + protobuf)
- Pre-commit: lint (eslint), type-check, unit tests (Jest)
- Integration tests: Testcontainers (spin up Postgres/Redis/Kafka)
- Ephemeral Preview Envs: PR triggers namespace deployment
- Migrations: Flyway / Prisma migrate (for PostgreSQL)

## 13. Migration Path from Current MERN
Current State: In-memory + basic Mongo models
Incremental Steps:
1. Introduce TypeScript + linting
2. Extract pricing & coupon logic into services
3. Replace in-memory orders with Mongo persistence
4. Add Redis cache (session, rate limiting)
5. Introduce job queue (BullMQ) for delayed assignment (replace setTimeout)
6. Add WebSocket gateway for live order tracking
7. Split services (order, catalog, user) behind API gateway
8. Introduce Kafka for event-driven updates
9. Add Postgres for transactional order store (dual-write, then cutover)
10. Implement observability + security hardening

## 14. Key Third-Party Integrations
- Maps & Geocoding: Google Maps / Mapbox
- Payments: Razorpay / Stripe / Cashfree
- SMS/OTP: Twilio / AWS SNS
- Email: SendGrid / SES
- Push: Firebase Cloud Messaging / APNS
- Error Monitoring: Sentry
- Image Optimization: Cloudinary / ImgProxy
- Fraud Signals: Sift / Feedzai (optional at scale)

## 15. High-Level Event List (Kafka Topics)
- user.registered
- product.catalog.updated
- inventory.stock.changed
- coupon.applied
- order.created
- order.payment_authorized
- order.assignment.requested
- rider.assignment.accepted
- rider.location.stream
- order.delivered
- payment.settled
- payout.rider.processed
- notification.dispatch

(End Architecture Blueprint Section)

---

# Fetchly MERN Roadmap

## Core User Flows
1. Browse Products (Order Page) ✅
2. Cart Page (client-side placeholder) ☐
3. Coupon Apply Backend ✅
4. Payment (Razorpay stub + signature simulation) ✅
5. Order Placed Page (frontend pending) ☐
6. Delayed Delivery Partner Assignment (in-memory timers) ✅

## Data Models (Mongo Later)
User: { _id, email, passwordHash, createdAt }
Product: { _id, name, price, stock, active }
Coupon: { _id, code, percentOff, active, expiresAt, maxUses }
Order: {
  _id, userId, items:[{ productId, nameSnapshot, price, qty }],
  subtotal, discount, total,
  payment: { provider:'razorpay', orderId, paymentId, signature, status },
  status: 'pending-assignment' | 'assigned' | 'in-transit' | 'delivered',
  assignedPartnerId, assignedAt, createdAt
}
DeliveryPartner: {
  _id, name, active,
  lastAssignedAt, cooldownUntil
}

## Coupon Flow
- Client computes subtotal.
- Server validates coupon + returns discount & total.
- On payment create-order store provisional discount to prevent tampering.
- On verify recompute server-side for integrity.

## Razorpay Integration (Real)
1. Server create order using Razorpay SDK (amount in paise).
2. Client opens Razorpay Checkout with returned order id.
3. On success client sends verification payload.
4. Server verifies signature: hmac_sha256(order_id|payment_id, RAZORPAY_KEY_SECRET).
5. Persist final order.

## Delivery Partner Assignment Logic
Implemented (in-memory):
- 3 minute delayed assignment
- 15 minute cooldown
- Retry every 60s if no partner free
- Ensures different partner if prior still cooling down

Next:
- Persist partners & jobs in Mongo / queue.
- Real Razorpay integration.

## Frontend Pages
/products              -> list products
/cart                  -> cart items + apply coupon
/checkout              -> review + pay (Razorpay widget)
/order/:id/placed      -> waiting screen with live status
/orders                -> order history
/auth (login/register) -> basic auth (JWT)

/delivery (internal/admin) -> monitor partners and assignments (later)

## State Management
- Auth: JWT stored in httpOnly cookie or memory + refresh token.
- Cart: LocalStorage (guest) -> merge into server cart after login.
- Orders: React Query / SWR polling until assignment done.

## Security Checklist
- Validate all inputs (items structure, coupon code).
- Recalculate pricing server-side.
- Hash passwords (bcrypt).
- Store Razorpay secret only on server.
- Limit coupon usage (per user & total).

## Incremental Milestones
- [x] M1: Products + Coupon apply (in-memory)
- [x] M2: Payment order create (stub)
- [x] M3: Basic verify & order persistence (in-memory)
- [x] M4: Delayed partner assignment (setTimeout)
- [ ] M5: Job queue + cooldown persistence
- [ ] M6: Real auth (JWT + hashing)
- [ ] M7: Realtime updates (WebSocket/SSE)
- [ ] M8: Hardening

## Example Partner Selection Pseudocode
function attemptAssign(order) {
  const now = Date.now();
  const partner = partners.find(p => p.cooldownUntil <= now);
  if(!partner) return retryIn(60000);
  order.assignedPartnerId = partner._id;
  order.assignedAt = now;
  order.status = 'assigned';
  partner.lastAssignedAt = now;
  partner.cooldownUntil = now + 15*60*1000;
}

## Testing Strategy
- Unit: pricing (subtotal, discount, total).
- Integration: payment verify flow (mock Razorpay).
- E2E: place order -> after 3m partner assigned (use jest fake timers).
- Load: multiple orders ensure cooldown respected.

## Future Enhancements
- Partner routing optimization.
- Real-time location tracking.
- Coupon usage analytics & A/B tests.
- Inventory & stock reservations.

(End)
