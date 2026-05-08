# Architecture Pattern

## Short answer

This project uses a **hybrid microservices architecture inside an Nx monorepo**.

The main pattern is:

1. **React SPA frontend**
2. **API Gateway at the edge**
3. **Multiple NestJS backend services split by business domain**
4. **Database-per-service with separate Prisma clients**
5. **Simple layered design inside each service: Controller -> Service -> Prisma**

So the best description is:

> **API Gateway + domain-oriented microservices + database-per-service + layered service internals, managed from an Nx monorepo**

It is **not** event-driven and it is **not** a clean hexagonal/onion architecture. Communication is mostly **synchronous HTTP** and, in a few places, **direct cross-database access** from one service into another service's database.

---

## 1. Repository-level architecture

This repository is organized as an **Nx monorepo**.

### Main folders

- `apps/web`: React + Vite frontend
- `apps/api-gateway`: gateway / reverse proxy
- `apps/auth-service`: authentication, users, OTP, notifications
- `apps/product-service`: shops, products, categories, reviews, uploads
- `apps/order-service`: cart, checkout, orders, vouchers
- `apps/admin-moderation-service`: admin dashboard, banners, reports, moderation orchestration
- `apps/chat-service`: buyer/seller conversations and messages
- `libs/prisma-clients`: one Prisma schema/client per service database

### What Nx is doing here

Nx is mainly used as a **workspace/build orchestration layer**, not as an architectural layer in business logic.

It provides:

- multiple apps in one repo
- shared tooling and TypeScript config
- Prisma client generation from one workspace target
- consistent build/serve workflows

That means the **logical architecture** comes from the apps and their boundaries, while **Nx is the operational container** around them.

---

## 2. Core architectural pattern

### 2.1 Edge pattern: API Gateway

`apps/api-gateway` is the single HTTP entrypoint for the frontend.

Its job is thin:

- accept browser requests
- enable CORS
- decode JWT once
- inject `x-user-id` and `x-role` headers
- proxy requests to the correct backend service
- proxy uploaded product assets through `/uploads`

This is visible in:

- `apps/api-gateway/src/main.ts`
- `apps/api-gateway/src/app/reverse-proxy.ts`

### Why this matters

The frontend does **not** usually talk directly to all services by host/port. It talks to the gateway using paths like:

- `/api/auth`
- `/api/products`
- `/api/orders`
- `/api/cart`
- `/api/vouchers`
- `/api/admin`
- `/api/chat`

This gives the system a **single edge contract** while keeping backend services separate.

### 2.2 Service pattern: domain microservices

Each backend app is organized around a domain:

- `auth-service`: identity and user-related state
- `product-service`: catalog and seller/shop domain
- `order-service`: purchase flow and commerce transactions
- `admin-moderation-service`: admin aggregation and moderation workflows
- `chat-service`: messaging

This is a real **business-capability split**, not just a technical split by CRUD type.

### 2.3 Data pattern: database per service

Each domain has its own Prisma schema and its own PostgreSQL database:

- `auth_db`
- `product_db`
- `order_db`
- `chat_db`
- `admin_mod_db`

Prisma schemas under `libs/prisma-clients` confirm this separation.

Examples:

- `auth-client/schema.prisma`: `User`, `VerificationCode`, `Notification`, etc.
- `product-client/schema.prisma`: `Shop`, `Product`, `Category`, `Review`, etc.
- `order-client/schema.prisma`: `Voucher`, `CartItem`, `CheckoutSession`, `ShopOrder`, etc.
- `chat-client/schema.prisma`: `conversations`, `messages`
- `admin-mod-client/schema.prisma`: `ReportReason`, `Report`, `Banner`

This is the strongest signal that the repo is built around a **database-per-service microservice model**.

### 2.4 Internal service pattern: layered NestJS modules

Inside each service, the code is mostly structured as:

- `Controller`: HTTP contract and request parsing
- `Service`: business logic
- `PrismaService`: data access

Example:

- `product.controller.ts` -> routes
- `product.service.ts` -> business rules
- `prisma.service.ts` -> Prisma client wrapper

So each microservice is internally a **small layered application**.

### 2.5 Runtime topology

At runtime the services are separated by port:

- gateway: `3000`
- product-service: `3001`
- auth-service: `3002`
- order-service: `3004`
- admin-moderation-service: `3005`
- chat-service: `3006`
- web: `4200`
- PostgreSQL: `5433`

The gateway knows upstream targets through environment variables such as:

- `AUTH_SERVICE_URL`
- `PRODUCT_SERVICE_URL`
- `ORDER_SERVICE_URL`
- `ADMIN_SERVICE_URL`
- `CHAT_SERVICE_URL`

So deployment is **multi-process / multi-service**, even though the code lives in one repository.

---

## 3. How the system works end to end

### 3.1 Browser to backend flow

Typical request path:

1. The browser loads the React SPA from `apps/web`.
2. A page or hook calls an API path such as `/api/products/seller` or `/api/orders`.
3. The API gateway receives the request.
4. If a Bearer token exists, the gateway verifies it and adds:
   - `x-user-id`
   - `x-role`
5. The gateway forwards the request to the target service.
6. The target service controller reads headers/body/params.
7. The service layer runs business logic.
8. Prisma reads/writes that service's database.
9. The response goes back through the gateway to the frontend.

Frontend integration points:

- `apps/web/src/config/api.ts`
- `apps/web/src/hooks/useProducts.ts`
- `apps/web/src/hooks/useOrders.ts`
- route protection components under `apps/web/src/components/auth`

### 3.2 Authentication flow

The auth flow is:

1. Frontend posts to `/api/auth/login`
2. Gateway proxies to `auth-service`
3. `auth-service` validates email/password in `auth_db`
4. `auth-service` signs a JWT with user id and role
5. Frontend stores token in `localStorage`
6. Later requests send `Authorization: Bearer <token>`
7. Gateway extracts claims and translates them into trusted headers for downstream services

This means downstream services usually **do not validate JWT themselves**. They trust the gateway-added headers like `x-user-id`.

One exception is notifications retrieval in `auth-service`, where the controller verifies JWT directly.

### 3.3 Seller/product flow

Seller-facing product management works like this:

1. Frontend checks seller context through `/api/products/seller/context`
2. Gateway injects user identity headers
3. `product-service` resolves the seller's shop from `product_db`
4. Seller pages call endpoints like:
   - `/api/products/seller`
   - `/api/products/seller/categories`
   - `/api/products/upload`
5. `product-service` persists products, variants, images, categories, reviews, and follow relationships
6. Static product images are served from `product-service` and re-exposed through the gateway `/uploads` path

This makes `product-service` the **owner of seller context**.

### 3.4 Order flow

The order flow is more complex:

1. Frontend submits cart/checkout requests to `order-service` through the gateway
2. `order-service` validates checkout input
3. It reads product/shop information using `ProductPrismaService`
4. It reads buyer state from `auth_db` using `AuthPrismaService` when voucher rules require it
5. It writes transactional order data into `order_db`
6. It updates voucher claims/usages
7. It attempts stock updates and notification side effects

`order-service` is therefore the **transaction coordinator** for checkout.

### 3.5 Admin flow

Admin pages call `/api/admin/...`, which goes to `admin-moderation-service`.

That service does two different jobs:

- owns admin-specific data directly in `admin_mod_db` such as `Banner`, `Report`, `ReportReason`
- orchestrates other services by calling their internal endpoints

This is important:

`admin-moderation-service` is not just another CRUD service. It behaves like an **aggregation/orchestration service** for admin use cases.

Examples:

- dashboard metrics combine auth, product, order, voucher, and banner data
- report moderation can trigger product rejection, shop suspension, or user suspension in other services

### 3.6 Chat flow

The chat service owns conversations/messages in `chat_db`, but enriches them with data from other domains:

- user names from `auth-service`
- shop names from `product-service`

So chat owns message state, but depends on other services for display context.

---

## 4. Service-by-service responsibilities

### 4.1 `web`

Pattern:

- client-side rendered SPA
- route-based page composition
- API calls made from hooks/components
- auth/session state kept mostly in `localStorage`

Important characteristics:

- no separate frontend BFF layer inside the app
- routes are protected in the client using `BuyerProtectedRoute`, `SellerProtectedRoute`, and `AdminProtectedRoute`
- the frontend assumes the gateway is the stable backend entrypoint

### 4.2 `api-gateway`

Pattern:

- thin reverse proxy / edge adapter

Responsibilities:

- route forwarding
- CORS
- JWT decoding
- adding identity headers
- exposing one public API surface for the SPA

What it does **not** do:

- almost no business orchestration
- no domain logic
- no persistence

So this is a **gateway/proxy**, not a rich API composition layer.

### 4.3 `auth-service`

Owns:

- users
- passwords
- OTP verification
- account status
- notifications
- some buyer metadata like `first_order_at`

Pattern inside service:

- classic NestJS controller/service split
- Prisma access only to `auth_db`

Special note:

Other services send notifications by calling `auth-service` internal notification endpoints. That makes `auth-service` the de facto **notification persistence service**.

### 4.4 `product-service`

Owns:

- shops
- follows
- products
- categories
- attributes/options
- product images
- reviews

It also defines seller context, which is why seller route guards call it.

Special note:

This service performs some synchronous cross-service calls, for example:

- fetching seller analytics data from `order-service`
- validating order state before accepting a review
- sending notifications via `auth-service`

So it is mostly autonomous, but not isolated.

### 4.5 `order-service`

Owns:

- cart items
- vouchers and voucher claims
- checkout sessions
- shop orders
- order items
- platform voucher settlements

This service is the main **commerce transaction boundary**.

Special note:

It uses:

- `PrismaService` for `order_db`
- `ProductPrismaService` for `product_db`
- `AuthPrismaService` for `auth_db`

That means it crosses service boundaries at the data layer, not only the HTTP layer.

### 4.6 `admin-moderation-service`

Owns directly:

- banners
- reports
- report reasons

Also acts as:

- admin-facing orchestrator
- admin read-model aggregator

It calls internal endpoints from auth, product, and order services to assemble admin screens and moderation actions.

Architecturally, this is the closest thing in the repo to an **application orchestrator service**.

### 4.7 `chat-service`

Owns:

- conversations
- messages

Depends on:

- `auth-service` for participant names
- `product-service` for shop names
- `auth-service` again for notifications

This is a small service with a clear bounded domain, but it is still coupled to upstream read APIs.

---

## 5. Communication patterns

### 5.1 Frontend to backend

- synchronous HTTP via gateway
- mostly `fetch`
- token stored in browser local storage

### 5.2 Service to service

Two patterns are used.

### Pattern A: internal HTTP calls

Examples:

- `product-service` -> `order-service`
- `product-service` -> `auth-service`
- `admin-moderation-service` -> auth/product/order internal endpoints
- `chat-service` -> auth/product internal endpoints

Security is handled with an internal token header:

- `x-internal-token`

### Pattern B: direct cross-database Prisma access

Examples:

- `order-service` reads/writes `product_db` through `ProductPrismaService`
- `order-service` reads/writes `auth_db` through `AuthPrismaService`
- `voucher.service.ts` queries both auth and product databases directly
- `cart.service.ts` reads product data directly from `product_db`

This is important because it means the system is **not strictly enforcing service isolation**.

---

## 6. Data ownership and boundaries

The intended ownership is clear:

- user identity and notifications belong to auth
- catalog and seller state belong to product
- transactional commerce state belongs to order
- moderation/admin state belongs to admin-mod
- chat state belongs to chat

However, the implementation uses **pragmatic boundary leakage**:

- `order-service` directly touches auth/product databases
- read models are enriched by calling sibling services
- notifications are centralized in auth instead of a dedicated messaging service

So the architecture is best described as:

> **Logical microservice boundaries with partially shared implementation boundaries**

That is a common intermediate architecture in monorepos: domains are separated, but operational simplicity is prioritized over strict isolation.

---

## 7. Why this is not a pure microservice architecture

A strict microservice system would usually avoid:

- direct database access into another service's database
- JWT secret duplication across services
- shared internal assumptions about sibling service schemas

This project does all three in some places.

So the current implementation is closer to:

> **A pragmatic distributed modular system**

than to:

> **A fully decoupled independently deployable microservices platform**

The boundaries are real, but some coupling remains.

---

## 8. Architectural strengths

### Good fit for this project

- clear separation by business domain
- easy for frontend to consume through one gateway
- separate databases reduce accidental table-level overlap
- Nx monorepo keeps local development manageable
- NestJS + Prisma makes each service consistent
- admin/report/chat can evolve without merging into one backend app

### Practical benefits

- easier onboarding than many separate repos
- simpler local development
- clear ownership per major domain
- room to scale services independently later

---

## 9. Architectural tradeoffs and weaknesses

### 1. Boundary leakage

`order-service` directly opening auth/product databases weakens service autonomy.

Impact:

- schema changes in auth/product can break order logic
- independent deployment becomes harder
- hidden coupling grows over time

### 2. Synchronous runtime coupling

Several flows depend on immediate HTTP responses from sibling services.

Impact:

- one service outage can degrade others
- latency chains become longer
- retries/fallback behavior becomes important

### 3. Gateway trust model

Most services trust `x-user-id` and `x-role` from the gateway instead of validating JWT locally.

Impact:

- simple and fast
- but security depends heavily on correct network/gateway placement

### 4. No async integration backbone

Notifications and side effects are executed inline via HTTP calls instead of message queues/events.

Impact:

- simpler implementation
- weaker resilience for non-critical side effects

---

## 10. Mental model for the project

The easiest way to understand this codebase is:

- **Nx monorepo** is the container
- **React web app** is the client
- **API gateway** is the front door
- **Nest services** are domain applications
- **Prisma schemas/databases** define data ownership
- **Admin service** aggregates and orchestrates
- **Order service** coordinates checkout
- **Auth service** acts as identity plus notification store

If you need one sentence:

> The project is a domain-split microservice-style commerce platform in an Nx monorepo, fronted by a thin API gateway and backed by separate PostgreSQL databases per service, with layered NestJS internals and a few pragmatic cross-service shortcuts.

---

## 11. Final classification

### Primary architecture pattern

**API Gateway + Microservices + Database per Service**

### Internal code pattern inside each service

**Layered architecture (Controller -> Service -> Prisma)**

### Repository/development pattern

**Nx monorepo**

### More precise real-world description

**A pragmatic hybrid microservice architecture, not a strict pure microservice system**
