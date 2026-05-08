# Fault Review

Scope: source inspection of the current repository on 2026-04-28. This is not a full runtime audit, and I did not run the test suite or build pipeline for this report. The items below are the highest-confidence faults I found from reading the implementation.

## Critical

### 1. API gateway trusts spoofable identity headers

- Evidence:
  - `apps/api-gateway/src/main.ts:21-35` only sets `x-user-id` and `x-role` when a Bearer token is valid, but it never clears client-supplied `x-user-id`, `x-role`, or `x-internal-token`.
  - Downstream services trust those headers directly, for example:
    - `apps/order-service/src/app/order.controller.ts:17-43,72-84`
    - `apps/order-service/src/app/cart.controller.ts:8-44`
    - `apps/chat-service/src/app/app.controller.ts:8-37`
    - `apps/product-service/src/app/product.controller.ts:9-30,48-80`
  - The frontend is already using this unsafe path instead of Bearer auth:
    - `apps/web/src/components/home/VoucherSection.tsx:19-23,45-49`
    - `apps/web/src/pages/VoucherHub.tsx:28-33,53-64`
- Impact:
  - A caller can impersonate arbitrary users by sending forged `x-user-id`.
  - A caller may also reach internal-only routes by supplying `x-internal-token` if the default token is known.
- Recommended fix:
  - In the gateway, strip incoming `x-user-id`, `x-role`, and `x-internal-token` from external traffic before proxying.
  - Only inject trusted identity headers after successful JWT verification.
  - Stop sending `x-user-id` from the browser entirely.
- Suggested implementation:
  - Add a gateway middleware that deletes those headers before any route proxy logic runs.
  - Standardize all frontend authenticated calls on `Authorization: Bearer <token>`.
  - In downstream services, reject requests that lack a trusted gateway marker or move auth enforcement into each service instead of trusting raw headers.

### 2. Admin HTTP API is effectively public

- Evidence:
  - `apps/admin-moderation-service/src/app/admin.controller.ts:8-178` exposes admin dashboard, user status updates, shop approvals, product approvals, category management, banner management, and voucher deletion without any auth or role guard.
  - `apps/api-gateway/src/main.ts:46-47` proxies `/api/admin` directly, with no admin-role enforcement in the gateway.
- Impact:
  - Any caller who can reach the gateway can invoke admin operations.
  - This is a full privilege-escalation path, not just a missing UI check.
- Recommended fix:
  - Require JWT authentication and explicit admin-role authorization on every admin route.
  - Do not rely on frontend route protection for backend security.
- Suggested implementation:
  - Add a shared admin guard or middleware in `admin-moderation-service` and apply it to the whole controller.
  - Verify role from a validated token claim, not from a client-controlled request field.
  - Add one integration test that proves a non-admin request to `/api/admin/*` is rejected.

### 3. Order detail and order status endpoints have broken authorization

- Evidence:
  - `apps/order-service/src/app/order.controller.ts:67-69` returns order details with no auth check at all.
  - `apps/order-service/src/app/order.controller.ts:72-84` checks only that some `x-user-id` exists, but does not verify that the actor owns the order or belongs to the seller shop.
  - `apps/order-service/src/app/order.service.ts:307-320` loads any order by id and returns it.
  - `apps/order-service/src/app/order.service.ts:323-410` updates any order by id with no buyer/seller ownership check.
- Impact:
  - Unauthorized users can read other users' order data.
  - Any authenticated or spoofed user can mutate the status of someone else's order.
- Recommended fix:
  - Pass the authenticated actor id into service methods.
  - Enforce buyer ownership for buyer views and seller shop ownership for seller-side status changes.
- Suggested implementation:
  - Split read/update authorization rules by action: buyer-read, seller-read, buyer-cancel, seller-confirm/ship.
  - Load the order together with seller shop ownership data before allowing state changes.
  - Return `403` for authenticated-but-forbidden access and `404` only when the order truly does not exist.

### 4. Inventory handling is incorrect and non-transactional

- Evidence:
  - `apps/order-service/src/app/order.service.ts:160-169` decrements stock immediately after order creation.
  - `apps/order-service/src/app/order.service.ts:351-359` decrements stock again when the order moves to `confirmed`.
  - `apps/order-service/src/app/order.service.ts:360-367` only restocks when a `confirmed` or `shipped` order becomes `cancelled`.
  - The first stock decrement is outside the Prisma order transaction at `apps/order-service/src/app/order.service.ts:154-169`.
- Impact:
  - Confirmed orders lose stock twice.
  - Pending orders cancelled before confirmation do not restock even though stock was already decremented at creation.
  - Order persistence can succeed while stock mutation fails, leaving databases inconsistent.
- Recommended fix:
  - Pick exactly one stock-reservation moment in the lifecycle.
  - Apply stock mutation atomically with order state, or introduce an explicit reservation/release model.
  - Add tests for create, confirm, cancel-before-confirm, and cancel-after-confirm flows.
- Suggested implementation:
  - If stock should be reserved at checkout, decrement once during order creation and never again on confirmation.
  - If stock should be reserved at confirmation, remove the create-time decrement completely.
  - Keep order creation, order item creation, and stock mutation inside one transaction or compensate failed steps explicitly.

### 5. Internal notifications endpoint is unauthenticated

- Evidence:
  - `apps/auth-service/src/app/notifications.controller.ts:24-27` accepts `POST /notifications/internal` with no JWT or internal-token validation.
  - `apps/chat-service/src/app/app.service.ts:13-21` calls that route without any internal auth header, which suggests the endpoint is intentionally left open to make internal calls work.
- Impact:
  - Any caller that can reach the route can create arbitrary notifications for arbitrary users.
- Recommended fix:
  - Require a validated internal service token or mTLS for the internal route.
  - Update all internal callers to send the same authenticated internal credential.
- Suggested implementation:
  - Create one shared `INTERNAL_SERVICE_TOKEN` env var and verify it in a guard for all internal routes.
  - Require the caller to send that token in a dedicated internal header and reject requests without it.
  - Keep the route off any public frontend path if possible.

## High

### 6. Seller settings page calls a profile endpoint that does not exist

- Evidence:
  - `apps/web/src/pages/seller/Settings.tsx:129-142` sends `PUT ${AUTH_API_URL}/profile`.
  - `apps/auth-service/src/app/auth.controller.ts:17-99` has login, register, OTP, password reset, and internal admin routes, but no `/profile` route.
- Impact:
  - Saving seller account profile data will fail even when the shop update succeeds.
- Recommended fix:
  - Either implement `PUT /auth/profile` in auth-service or remove this call and point the UI at the correct existing endpoint.
- Suggested implementation:
  - Decide whether profile ownership belongs to `auth-service` or another user-domain service and keep that contract consistent.
  - If the route is intended to exist, define its DTO and response shape before adjusting the frontend.
  - Add one frontend error state so partial success from shop update does not look like full success.

### 7. "Suspend shop" UI reports success, but the backend ignores the requested status

- Evidence:
  - `apps/web/src/pages/seller/Settings.tsx:160-171` sends `{ status: 'suspended' }` to `PUT /products/seller/shop`.
  - `apps/product-service/src/app/product.service.ts:157-182` only accepts and persists `name`, `description`, and `logo_url`.
- Impact:
  - The UI tells the seller the shop was suspended, but the shop status is unchanged.
- Recommended fix:
  - Either support shop status transitions in `updateShop` with authorization/business rules, or remove the suspend action from the UI until the backend exists.
- Suggested implementation:
  - If seller self-suspension is allowed, add an explicit `status` field to the update DTO and validate allowed transitions.
  - If only admins may suspend shops, remove this seller UI action and route suspension through admin moderation instead.
  - Make the success toast depend on the persisted response payload, not just request completion.

### 8. Buyer review flow is broken by a missing `product_id` and a hardcoded localhost URL

- Evidence:
  - `apps/web/src/pages/BuyerOrderDetail.tsx:53-56` fetches reviews from `http://localhost:3000/api/products/reviews/me` instead of using configured API base URLs.
  - `apps/web/src/pages/BuyerOrderDetail.tsx:61-63,101-123` expects every order item to contain `product_id`.
  - `libs/prisma-clients/order-client/schema.prisma:90-101` defines `OrderItem` without a `product_id` field.
  - `apps/order-service/src/app/order.service.ts:247-255` enriches items with `product_thumbnail_url`, but still does not add `product_id`.
- Impact:
  - Review lookup and submit/edit flows will fail or incorrectly claim the product no longer exists.
  - The page will also break outside a localhost deployment.
- Recommended fix:
  - Include `product_id` in order item data returned to the frontend, or refactor review APIs to work from `product_variant_id`.
  - Replace the hardcoded review URL with the shared API config.
- Suggested implementation:
  - Pick one canonical review target identifier and use it consistently across order, product, and review flows.
  - Add `product_id` to the stored order snapshot if historical review linkage must survive later catalog changes.
  - Replace all inline localhost URLs with env-based API helpers and add one test/build check to catch hardcoded local URLs.

### 9. Login page contains a client-side backdoor/mock login path

- Evidence:
  - `apps/web/src/pages/auth/Login.tsx:20-30` logs the user in locally when the email is `test@test.com`, writes `mock_token`, and fabricates a session user object.
- Impact:
  - Anyone who knows that email can bypass the normal login flow on the client.
  - Combined with the gateway/header trust issue, this materially increases abuse risk.
- Recommended fix:
  - Remove the mock-login block from production code.
  - If you need a dev shortcut, gate it behind an explicit development-only environment flag.
- Suggested implementation:
  - Delete the branch entirely unless the team is actively using it.
  - If retained for local development, require both `NODE_ENV=development` and a dedicated feature flag before enabling it.
  - Keep any mock session shape in a separate dev-only helper so it cannot silently ship again.

### 10. Secrets and default internal credentials are hardcoded

- Evidence:
  - `apps/api-gateway/src/main.ts:27` hardcodes the JWT verification secret.
  - `apps/auth-service/src/app/app.module.ts:12-16` hardcodes the JWT signing secret.
  - `apps/order-service/src/app/order.controller.ts:8-15`, `apps/product-service/src/app/product.controller.ts:23-30`, `apps/auth-service/src/app/auth.controller.ts:8-15`, and `apps/chat-service/src/app/app.service.ts:7-9` all default internal service auth to `internal-dev-token`.
- Impact:
  - Secrets can leak through source control and are easy to keep unchanged by accident across environments.
  - The risk is amplified because internal routes are already exposed through trusted headers in some paths.
- Recommended fix:
  - Move all secrets and internal credentials to environment configuration.
  - Fail fast when required secrets are missing in non-development environments.
- Suggested implementation:
  - Remove fallback defaults like `internal-dev-token` in runtime code.
  - Centralize configuration loading and validation at startup so every service enforces the same rule set.
  - Rotate any secrets that may already have been committed and treat them as exposed.

## Medium

### 11. Product image upload endpoint is unauthenticated

- Evidence:
  - `apps/product-service/src/app/product.controller.ts:34-44` exposes `POST /products/upload` and only checks that a file exists.
- Impact:
  - Any caller can upload content into product storage.
  - This increases abuse risk, storage waste, and moderation burden.
- Recommended fix:
  - Require authenticated seller access at minimum, and add size/type validation plus storage quotas.
- Suggested implementation:
  - Enforce auth before upload and verify the uploader is allowed to create product media.
  - Restrict MIME types and file sizes server-side, not only in the browser.
  - Store uploads under scoped paths or IDs so one tenant cannot overwrite another tenant's media.

### 12. Chat conversation creation trusts client-supplied `seller_id` for a `shop_id`

- Evidence:
  - `apps/chat-service/src/app/app.controller.ts:22-25` accepts `{ shop_id, seller_id }` from the request body.
  - `apps/chat-service/src/app/app.service.ts:96-113` writes those values directly into the conversation if one does not already exist.
- Impact:
  - A caller can create inconsistent conversations by pairing a shop with the wrong seller id.
  - This is a data-integrity bug and can become an authorization issue later.
- Recommended fix:
  - Resolve the seller from the shop on the server side and reject mismatched pairs.
- Suggested implementation:
  - Accept only `shop_id` from the client for conversation creation.
  - Query the product/shop domain to derive the authoritative seller id before insert.
  - Add a uniqueness rule for buyer-shop conversations if one conversation per pair is the intended model.

### 13. Cart controller converts user/business errors into HTTP 500s

- Evidence:
  - `apps/order-service/src/app/cart.controller.ts:20-25` catches every error from `addToCart` and rethrows `InternalServerErrorException`.
- Impact:
  - Validation, auth, and not-found errors are misreported as server failures.
  - This makes the API harder to debug and the UI harder to implement correctly.
- Recommended fix:
  - Let Nest exceptions propagate unchanged, or remap only truly unexpected errors.
- Suggested implementation:
  - Catch only infrastructure failures that need translation, not domain validation errors.
  - Preserve `BadRequest`, `Unauthorized`, `Forbidden`, and `NotFound` responses so the frontend can react correctly.
  - Log unexpected exceptions with enough context to debug cart failures without exposing internals to clients.

### 14. Checkout stock validation is race-prone under concurrency

- Evidence:
  - `apps/order-service/src/app/order.service.ts:557-610` validates stock before order creation using a read of current quantities.
  - `apps/order-service/src/app/order.service.ts:160-169` performs actual stock decrement later and outside the transaction that created the order records.
- Impact:
  - Two concurrent checkouts can both pass validation and oversell the same variant.
- Recommended fix:
  - Lock or atomically update stock at reservation time.
  - Keep validation and mutation in one transactional boundary, or use optimistic concurrency/version checks.
- Suggested implementation:
  - Prefer a single SQL update that decrements stock only when `stock >= requestedQty`.
  - Detect zero affected rows as an out-of-stock race and fail checkout cleanly.
  - Add concurrency tests that submit two simultaneous checkouts for the same low-stock variant.

## Summary

The biggest structural problem is trust: external clients can currently influence identity and internal-service assumptions far too easily. The second major class of problems is lifecycle consistency, especially in order and stock handling. After those are fixed, the next pass should focus on incomplete UI-to-backend contracts such as profile updates, shop suspension, and order review data.
