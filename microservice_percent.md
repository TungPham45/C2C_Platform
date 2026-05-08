# Microservice Fit Assessment

## Estimated fit: 68%

This repo is much closer to a microservice architecture than a monolith, but it is not a strict microservice system yet.

The strongest signals in favor are:

- Clear domain split into separate apps under `apps/`:
  `auth-service`, `product-service`, `order-service`, `admin-moderation-service`, `chat-service`, `api-gateway`, and `web`.
- API gateway at the edge:
  `apps/api-gateway/src/main.ts:13-63`
- Database-per-service design with separate Prisma schemas:
  `libs/prisma-clients/*/schema.prisma`
- Each backend service is a separately runnable NestJS app with its own entrypoint and module graph.

The score stops at 68% because the implementation still has several non-microservice shortcuts that break strict service autonomy.

## How I scored it

This is a practical engineering score, not a formal standard.

| Area | Score | Notes |
|---|---:|---|
| Domain decomposition | 18/20 | Strong bounded-context split by business capability |
| Gateway and service separation | 14/15 | Thin gateway, distinct backend apps |
| Data ownership and isolation | 7/20 | Major boundary leak: `order-service` reads/writes other services' databases directly |
| Service communication model | 10/15 | HTTP-based integration exists, but side effects are tightly synchronous and not resilient |
| Security and trust boundaries | 6/10 | Hardcoded secrets, static internal token, downstream trust of forwarded headers |
| Deployability and operations | 7/10 | Separate apps exist, but local/runtime orchestration is still workspace-driven rather than service-native |
| Observability and resilience | 6/10 | I did not find health endpoints, tracing, metrics, queueing, or circuit-breaker patterns |

Total: `68/100`

## Evidence for the current score

### What already fits microservices well

1. Business capabilities are split into separate services.
   `apps/auth-service`, `apps/product-service`, `apps/order-service`, `apps/admin-moderation-service`, `apps/chat-service`

2. The system uses a gateway instead of exposing every service directly to the browser.
   `apps/api-gateway/src/main.ts:37-63`

3. Data is modeled per service instead of one shared schema.
   `libs/prisma-clients/auth-client/schema.prisma`
   `libs/prisma-clients/product-client/schema.prisma`
   `libs/prisma-clients/order-client/schema.prisma`
   `libs/prisma-clients/chat-client/schema.prisma`
   `libs/prisma-clients/admin-mod-client/schema.prisma`

4. A generic backend container build already exists, which is a good base for independent packaging.
   `docker/backend.Dockerfile`

### What keeps it from being a strict microservice system

1. `order-service` directly opens `auth_db` and `product_db`.
   `apps/order-service/src/app/app.module.ts:7-16`
   `apps/order-service/src/app/auth-prisma.service.ts:1-22`
   `apps/order-service/src/app/product-prisma.service.ts:1-22`

2. `order-service` uses those foreign database clients in core business flows.
   `apps/order-service/src/app/order.service.ts:10-16`
   `apps/order-service/src/app/order.service.ts:160-223`
   `apps/order-service/src/app/cart.service.ts:7-37`
   `apps/order-service/src/app/voucher.service.ts:22-63`
   This is the single biggest reason the score is not higher.

3. Authentication trust is centralized in the gateway, and downstream services rely on forwarded headers.
   `apps/api-gateway/src/main.ts:21-35`
   `apps/order-service/src/app/order.controller.ts:17-42`
   `apps/order-service/src/app/voucher.controller.ts:17-25`
   This is workable in a controlled network, but it is weaker than proper service-to-service identity validation.

4. Secrets and internal trust tokens are hardcoded or defaulted in code.
   `apps/api-gateway/src/main.ts:27`
   `apps/auth-service/src/app/app.module.ts:12-16`
   `apps/auth-service/src/app/auth.controller.ts:8-15`
   `apps/order-service/src/app/order.controller.ts:8-15`
   `apps/order-service/src/app/voucher.controller.ts:8-15`
   `apps/chat-service/src/app/app.service.ts:7-9`
   `apps/admin-moderation-service/src/app/admin.service.ts:9-22`

5. One internal endpoint appears to be open without internal-token verification.
   `apps/auth-service/src/app/notifications.controller.ts:24-28`
   Other services call it directly for side effects.

6. Several service interactions are synchronous and inline, including non-critical side effects such as notifications.
   `apps/product-service/src/app/product.service.ts:8-19`
   `apps/order-service/src/app/notification-client.service.ts:13-32`
   `apps/chat-service/src/app/app.service.ts:13-25`
   `apps/admin-moderation-service/src/app/admin.service.ts:28-61`

7. Local runtime is still workspace-oriented, not service-orchestrated.
   `docker-compose.yml:1-44` only starts `postgres` and `pgadmin`.
   `scripts/run-local-stack.ps1:6-28` starts the apps by opening multiple local terminals with `nx serve`.

8. The frontend still has a few hardcoded gateway host assumptions.
   `apps/web/src/pages/MyPurchases.tsx:43`
   `apps/web/src/pages/MyPurchases.tsx:98`
   `apps/web/src/pages/BuyerOrderDetail.tsx:54`
   `apps/web/src/pages/ProductsPage.tsx:61`
   `apps/web/src/pages/ShopPage.tsx:340`
   This is not the main architecture problem, but it reduces environment independence.

9. I did not find repo evidence of:
   health/readiness endpoints,
   distributed tracing,
   metrics instrumentation,
   message broker integration,
   circuit breakers,
   or contract-testing infrastructure.
   That does not make the design invalid, but it means the operational maturity is still below a strong microservice baseline.

## What must be done to reach 100%

If “100% microservice” means strict service ownership, independent deployability, and production-grade operational boundaries, these are the required changes.

### Priority 1: Remove cross-database access completely

1. Delete `AuthPrismaService` and `ProductPrismaService` from `order-service`.
   Replace them with service-owned APIs or event-driven integration.

2. Stop `order-service` from updating `product_db` stock directly.
   Current example:
   `apps/order-service/src/app/order.service.ts:160-169`
   Product inventory changes must go through `product-service`.

3. Stop `order-service` from updating `auth_db.first_order_at` directly.
   Current example:
   `apps/order-service/src/app/order.service.ts:180-195`
   Auth-owned user state must be mutated only by `auth-service`.

4. Stop `cart.service` from reading product details through Prisma into `product_db`.
   Current example:
   `apps/order-service/src/app/cart.service.ts:18-35`
   Use a product read API or a replicated read model owned by order.

5. Stop `voucher.service` from reading `auth_db` and `product_db` directly.
   Current example:
   `apps/order-service/src/app/voucher.service.ts:42-63`

Without this step, the architecture cannot be called a strict microservice architecture.

### Priority 2: Move from direct coupling to explicit service contracts

6. Introduce explicit internal APIs for the cross-service data that is currently fetched ad hoc.
   Examples:
   product availability,
   stock reservation,
   user voucher context,
   seller/shop summary,
   review eligibility.

7. Version the internal and external APIs.
   Add OpenAPI or equivalent contracts for each service.
   I did not find Swagger/OpenAPI setup in the repo.

8. Add consumer-driven contract tests for service-to-service dependencies.
   This is important once DB shortcuts are removed.

### Priority 3: Make side effects asynchronous where they should be

9. Introduce a message broker or event bus.
   Candidates: RabbitMQ, Kafka, NATS, SQS, or another queue/event platform.

10. Convert notification flows from inline HTTP calls to events.
   Current inline call sites:
   `apps/product-service/src/app/product.service.ts:8-19`
   `apps/order-service/src/app/notification-client.service.ts:13-32`
   `apps/chat-service/src/app/app.service.ts:13-25`

11. Use domain events for cross-service state transitions.
   Examples:
   `OrderPlaced`
   `StockReserved`
   `StockReservationFailed`
   `VoucherClaimed`
   `UserFirstOrderRecorded`
   `NotificationRequested`
   `ReviewEligibilityConfirmed`

12. Add outbox/inbox patterns for reliable delivery.
   Without this, failures during cross-service side effects will remain lossy.

### Priority 4: Harden service-to-service security

13. Remove hardcoded JWT secrets and internal tokens from source code.
   Move all secrets to environment variables or a secret manager.

14. Protect every internal endpoint consistently.
   `apps/auth-service/src/app/notifications.controller.ts:24-28`
   should not be open if it is intended for internal use only.

15. Replace the shared static `x-internal-token` model with stronger service identity.
   Options:
   mTLS
   signed service JWTs
   workload identity
   private network policy plus signed requests

16. Stop treating forwarded `x-user-id` and `x-role` as the only trust boundary.
   At minimum, ensure only the gateway can reach private service ports.
   Prefer signed identity propagation or per-service JWT validation.

### Priority 5: Make deployment truly service-native

17. Add all backend services and the gateway to container orchestration.
   Today `docker-compose.yml` only defines the database and pgAdmin.

18. Add per-service runtime manifests.
   Docker Compose services, Kubernetes manifests, Helm charts, or another orchestrator setup.

19. Make every service independently deployable with its own environment config, health probes, scaling policy, and release artifact.

20. Add CI/CD pipelines that build, test, publish, and deploy each service independently.
   Nx monorepo is fine; shared repo is not the problem.
   The missing part is independent release flow.

### Priority 6: Add operational maturity

21. Add `/health` and `/ready` endpoints to every service.
   I did not find health endpoints in the repo.

22. Add structured logging with request IDs and correlation IDs across the gateway and services.

23. Add distributed tracing across gateway -> service -> service hops.

24. Add metrics for request rate, latency, error rate, DB latency, queue lag, and dependency failures.

25. Add timeout, retry, and circuit-breaker policies for every remote call.
   Current `fetch()` usage is mostly direct and optimistic.

26. Add bulkhead and fallback behavior for non-critical dependencies.
   Notifications and enrichment calls should not degrade core purchase flows.

### Priority 7: Clean up environment and edge coupling

27. Remove hardcoded localhost assumptions from the frontend.
   Use `apps/web/src/config/api.ts` consistently everywhere.

28. Remove hardcoded localhost defaults from service-to-service URLs where possible.
   Keep local defaults only in dev-only config layers, not deep inside business services.

29. Standardize environment naming.
   The repo currently mixes patterns like `AUTH_SERVICE_URL` and `AUTH_SERVICE_BASE_URL`.

### Priority 8: Improve data and workflow design for distributed correctness

30. Define clear ownership for every cross-domain workflow.
   For example:
   who owns stock reservation,
   who owns order finalization,
   who owns voucher claim settlement,
   who owns review eligibility.

31. Introduce saga/process-manager patterns for checkout instead of mixing local transaction plus remote mutations.

32. Add idempotency keys for externally triggered write operations.
   Especially important for order creation and notification/event handling.

33. Decide whether notification persistence belongs inside `auth-service` long term.
   It works today, but a dedicated notification service may be cleaner if that domain grows.

## Bottom line

This project already has the shape of a microservice platform:

- separate business services
- separate databases
- a gateway
- independently runnable apps

But it is still a hybrid implementation because service boundaries are not strictly enforced, especially in `order-service`.

If you remove direct cross-database access, harden service identity, add service-native deployment and observability, and move side effects to events, this can become a strong microservice architecture.
