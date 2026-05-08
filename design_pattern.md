# Design Pattern Analysis

## Short answer

This project uses a mix of:

- **framework-driven design patterns** from NestJS and React
- **application-level structural patterns** used intentionally in the code
- **pattern-like implementations** that are not full textbook GoF implementations, but clearly follow the same idea

The most clearly used patterns are:

1. **Dependency Injection**
2. **Decorator pattern**
3. **Service Layer**
4. **Proxy pattern**
5. **Facade / Aggregator pattern**
6. **Adapter pattern**
7. **Singleton-like provider pattern**
8. **Guard pattern**
9. **Composition-based layout pattern**
10. **Module pattern**

There are also a few places that are **strategy-like** or **builder-like**, but they are implemented as helper methods rather than separate classes.

---

## 1. Dependency Injection

### What it is

Dependency Injection means objects do not construct all of their own dependencies directly. Instead, dependencies are provided from the outside.

### Where it appears

Across almost all NestJS services and controllers:

- `apps/auth-service/src/app/app.module.ts`
- `apps/product-service/src/app/app.module.ts`
- `apps/order-service/src/app/app.module.ts`
- `apps/admin-moderation-service/src/app/app.module.ts`
- `apps/chat-service/src/app/app.module.ts`

Examples:

- `AuthController` receives `AuthService`
- `AuthService` receives `PrismaService`, `JwtService`, `EmailService`, `NotificationsService`
- `OrderService` receives `PrismaService`, `ProductPrismaService`, `AuthPrismaService`, `VoucherService`, `NotificationClientService`
- `AdminService` receives `PrismaService`

### How it works here

NestJS builds the object graph from each module's `providers` and `controllers`.

Example flow:

1. `AppModule` registers providers.
2. Nest creates one provider instance.
3. When a controller or service asks for a dependency in its constructor, Nest injects the matching instance.

Example:

- `auth.controller.ts` does not create `new AuthService()`
- `auth.service.ts` does not create `new PrismaService()` manually
- Nest provides them

### Why it matters in this repo

This pattern gives the codebase:

- loose coupling between controller and service
- easy service composition
- easier testing or swapping later
- consistent lifecycle management

This is one of the strongest design patterns in the repo.

---

## 2. Decorator Pattern

### What it is

A decorator attaches behavior or metadata to a class or method without changing the call sites everywhere else.

### Where it appears

NestJS relies heavily on decorators:

- `@Module`
- `@Controller`
- `@Injectable`
- `@Get`
- `@Post`
- `@Put`
- `@Delete`
- `@Body`
- `@Param`
- `@Headers`
- `@Req`
- `@UseInterceptors`

Examples:

- `apps/product-service/src/app/product.controller.ts`
- `apps/order-service/src/app/order.controller.ts`
- `apps/auth-service/src/app/auth.controller.ts`
- `apps/admin-moderation-service/src/app/admin.controller.ts`
- `apps/chat-service/src/app/app.controller.ts`

### How it works here

The decorators declare behavior declaratively:

- `@Controller('products')` maps a class to the `/products` route segment
- `@Get('seller')` binds a method to `GET /products/seller`
- `@Injectable()` marks a class as managed by Nest's DI container
- `@UseInterceptors(FileInterceptor('file'))` layers upload behavior around a route

So route wiring, request binding, and framework metadata are attached by decorators rather than by manual router code.

### Why it matters in this repo

This pattern keeps routing and dependency metadata close to the classes that use them. The result is less boilerplate and clearer separation between transport metadata and business logic.

---

## 3. Service Layer Pattern

### What it is

A service layer places business logic in service classes instead of controllers or persistence objects.

### Where it appears

This is the dominant application-level pattern across the backend:

- `AuthController` -> `AuthService`
- `ProductController` -> `ProductService`
- `OrderController` -> `OrderService`
- `VoucherController` -> `VoucherService`
- `CartController` -> `CartService`
- `AdminController` -> `AdminService`
- `ReportController` -> `ReportService`
- `AppController` -> `AppService` in chat

### How it works here

Controllers mostly do:

- parse headers, params, and body
- basic access checks
- call a service method

Services do:

- validation and business rules
- orchestration across dependencies
- database reads/writes through Prisma
- side effects like notifications or remote calls

Example:

- `product.controller.ts` gets `x-user-id`
- `product.service.ts` decides whether the seller owns the shop, how product data is transformed, and how related entities are written

### Why it matters in this repo

This keeps:

- transport logic in controllers
- business logic in services
- persistence in Prisma client wrappers

It is one of the clearest and most consistently applied patterns in the codebase.

---

## 4. Proxy Pattern

### What it is

A proxy stands in front of another service and forwards requests while adding extra behavior.

### Where it appears

The clearest example is the API gateway:

- `apps/api-gateway/src/app/reverse-proxy.ts`
- `apps/api-gateway/src/main.ts`

### How it works here

`createReverseProxy(target)` returns an Express request handler that:

1. builds the upstream URL
2. copies request headers safely
3. forwards the body
4. pipes the upstream response back to the client
5. converts upstream/network failures into `502 Bad Gateway`

Then `main.ts` mounts multiple proxy instances:

- `/api/auth`
- `/api/products`
- `/api/orders`
- `/api/cart`
- `/api/vouchers`
- `/api/admin`
- `/api/chat`
- `/uploads`

The gateway also adds identity context before forwarding:

- verifies JWT
- injects `x-user-id`
- injects `x-role`

### Why it matters in this repo

This is a true Proxy pattern, not just a naming coincidence. The gateway represents downstream services at the edge and adds cross-cutting behavior before forwarding.

---

## 5. Facade / Aggregator Pattern

### What it is

A facade exposes a simpler, task-oriented interface over multiple subsystems.

### Where it appears

The strongest example is:

- `apps/admin-moderation-service/src/app/admin.service.ts`

Other smaller examples:

- `apps/order-service/src/app/notification-client.service.ts`
- frontend hooks such as `apps/web/src/hooks/useProducts.ts`
- frontend hooks such as `apps/web/src/hooks/useOrders.ts`

### How it works here

#### `AdminService` as facade

`AdminService` hides the complexity of calling multiple internal services.

For example, `getStats()`:

- calls auth internal stats
- calls product internal stats
- calls order internal stats
- calls voucher internal stats
- reads banner stats locally
- returns one combined admin-facing payload

The admin controller only sees:

- `this.adminService.getStats()`

It does not need to know how many upstream calls are involved.

#### `NotificationClientService` as small facade

`NotificationClientService` wraps the details of sending a notification to auth-service. Callers just pass a domain message and do not handle endpoint construction every time.

#### frontend hooks as facades

`useProducts()` wraps:

- endpoint paths
- bearer token handling
- fetch lifecycle state
- response normalization

Pages only call:

- `fetchShopProducts()`
- `createProduct()`
- `deleteProduct()`

instead of repeating fetch logic.

### Why it matters in this repo

This pattern reduces repetition and hides subsystem complexity, especially in admin flows and frontend page components.

---

## 6. Adapter Pattern

### What it is

An adapter translates one interface or data shape into another one that the caller expects.

### Where it appears

#### API and asset URL normalization

- `apps/web/src/config/api.ts`

#### Notification endpoint wrapping

- `apps/order-service/src/app/notification-client.service.ts`
- `apps/product-service/src/app/product.service.ts` through `sendNotification`
- `apps/chat-service/src/app/app.service.ts` through `sendNotification`

#### Prisma wrappers per database

- `apps/order-service/src/app/auth-prisma.service.ts`
- `apps/order-service/src/app/product-prisma.service.ts`

### How it works here

#### Frontend asset URL adapter

`resolveAssetUrl()` and `normalizeProductAssetUrls()` adapt backend asset URLs into browser-safe URLs that work through the gateway.

Example:

- if the backend returns a localhost asset URL
- frontend rewrites it to the gateway-facing path
- pages can render consistent URLs without caring where the file physically lives

#### Notification client adapter

`NotificationClientService` adapts a local method call:

- `sendNotification({ ... })`

into:

- HTTP request to auth-service internal notification endpoint

That means callers do not need to know the exact URL structure.

#### Cross-DB Prisma adapters

`AuthPrismaService` and `ProductPrismaService` adapt service code to another database client with a specific datasource config. They are thin adapters over specialized Prisma client instances.

### Why it matters in this repo

This project has multiple services and multiple public/internal URL shapes. Adapters reduce direct coupling to raw endpoint or asset details.

---

## 7. Singleton-Like Provider Pattern

### What it is

A singleton provides one shared instance per application container or module context.

### Where it appears

In NestJS providers such as:

- `PrismaService`
- `AuthPrismaService`
- `ProductPrismaService`
- `NotificationClientService`
- `EmailService`

Examples:

- `apps/auth-service/src/app/prisma.service.ts`
- `apps/product-service/src/app/prisma.service.ts`
- `apps/order-service/src/app/prisma.service.ts`
- `apps/chat-service/src/app/prisma.service.ts`

### How it works here

Nest providers are singleton-scoped by default. That means:

- one `PrismaService` instance is created for the app container
- controllers/services reuse that instance
- the connection lifecycle is controlled centrally

For Prisma this is important because multiple uncontrolled instances would be wasteful and error-prone.

### Important nuance

This is not a hand-written classic singleton with `private static instance`.

It is a **container-managed singleton-like pattern** provided by Nest.

### Why it matters in this repo

It keeps:

- DB client reuse centralized
- infra services reusable
- connection setup in one place

---

## 8. Guard Pattern

### What it is

A guard prevents access to functionality unless a rule is satisfied.

### Where it appears

On the frontend:

- `apps/web/src/components/auth/BuyerProtectedRoute.tsx`
- `apps/web/src/components/auth/SellerProtectedRoute.tsx`
- `apps/web/src/components/auth/AdminProtectedRoute.tsx`

Also partially in backend controllers through helper methods like:

- `requireInternalAccess(...)`
- `getProviderUserId(...)`

### How it works here

#### Frontend route guard components

Each protected route component wraps child routes and decides whether to:

- allow rendering
- redirect to login
- redirect to another page
- show a blocked state

Example:

- `SellerProtectedRoute` verifies token
- calls seller context API
- checks whether shop exists and is not suspended
- renders child route only when allowed

#### Backend guard-like helpers

The backend does not use Nest `CanActivate` guards broadly. Instead, many controllers use repeated helper methods:

- check `x-internal-token`
- check `x-user-id`
- normalize header format

This is guard behavior, but implemented manually inside controllers.

### Why it matters in this repo

Access control is a repeated concern. The frontend wraps it as reusable components; the backend often uses repeated helper methods instead of centralized Nest guards.

---

## 9. Composition-Based Layout Pattern

### What it is

Composition-based layout means pages are assembled by wrapping content inside reusable layout components rather than inheriting from a base page class.

### Where it appears

- `apps/web/src/components/layout/MarketplaceLayout.tsx`
- `apps/web/src/components/layout/SellerLayout.tsx`
- `apps/web/src/components/layout/AdminLayout.tsx`

### How it works here

Pages supply content as `children`, while layout components supply:

- navigation
- header
- footer
- shared page chrome
- user/session-aware actions

Example:

- seller pages render inside `SellerLayout`
- admin pages render inside `AdminLayout`
- marketplace-facing pages render inside `MarketplaceLayout`

This creates a consistent frame without inheritance.

### Why it matters in this repo

It is the dominant UI composition pattern in the frontend. It keeps pages focused on page-specific content while layouts handle shared structure.

---

## 10. Module Pattern

### What it is

A module groups related responsibilities and exports a coherent unit.

### Where it appears

#### Backend

Nest modules:

- `AppModule` in each service

#### Frontend

Feature grouping by folder:

- `pages/seller`
- `pages/admin`
- `components/layout`
- `components/auth`
- `hooks`
- `utils`

### How it works here

#### Backend

Each Nest app module defines:

- controllers
- providers
- imported modules

This gives each microservice a clear assembly boundary.

#### Frontend

The folder structure groups UI by concern, which is a looser but still clear module pattern.

### Why it matters in this repo

This repo is large enough that grouping by coherent modules is necessary. The project consistently follows this in both frontend and backend.

---

## 11. Strategy-Like Logic

### What it is

The Strategy pattern usually means different algorithms are encapsulated behind interchangeable implementations.

### Is it used here?

**Partially, but not formally.**

### Where the idea appears

#### Voucher logic

- `apps/order-service/src/app/voucher.service.ts`

Examples:

- `calculateDiscount(...)`
- `isVoucherTargetEligible(...)`
- `normalizeTargetType(...)`

#### Order analytics and allocations

- `apps/order-service/src/app/order.service.ts`

Examples:

- `allocatePlatformDiscount(...)`
- conditional handling by voucher type or target type

### How it works here

Instead of separate strategy classes like:

- `PercentageDiscountStrategy`
- `FixedDiscountStrategy`

the code uses conditional logic inside service methods.

So the repo has **strategy behavior**, but not a formal Strategy pattern implementation.

### Why this distinction matters

It is correct to say the code is **strategy-like**, but inaccurate to claim it fully implements the GoF Strategy pattern.

---

## 12. Builder-Like Logic

### What it is

The Builder pattern usually constructs a complex object step by step.

### Is it used here?

**Partially, but not as a formal class-based Builder.**

### Where the idea appears

#### Order draft construction

- `apps/order-service/src/app/order.service.ts`
- `buildOrderDraft(...)`

#### Category tree construction

- `apps/web/src/pages/admin/CategoryManagement.tsx`
- `buildTree(...)`

#### Product normalization and payload shaping

- `apps/web/src/config/api.ts`
- several service helper methods that assemble response objects

### How it works here

The code frequently builds a richer object from smaller parts in multiple steps:

- validate raw input
- load related data
- combine/normalize it
- return a final structured object

That is builder-like behavior, but implemented as plain helper functions.

---

## 13. Template / Reusable Workflow Pattern

### What it is

A template pattern means the same workflow shape is reused across many actions.

### Where it appears

Repeated internal controller helpers:

- `requireInternalAccess(...)`
- `getProviderUserId(...)`

Repeated remote call wrapper:

- `AdminService.requestJson(...)`

Repeated notification senders:

- `sendNotification(...)` helper methods across services

### How it works here

The repo repeats the same workflow:

1. validate request context
2. normalize IDs or headers
3. call a service
4. map failure into a controlled response

In `AdminService`, `requestJson(...)` becomes a mini-template for:

- adding the internal token
- performing fetch
- reading upstream error payloads
- throwing a consistent error

This is not inheritance-based Template Method, but it does follow a reusable workflow template.

---

## 14. Patterns that are notably not explicit

### Repository Pattern

Not explicitly used.

Why:

- service classes call Prisma directly
- there is no separate repository abstraction like `UserRepository` or `OrderRepository`

### Factory Pattern

Not strongly present in project code.

There are framework and library factories like:

- `Nodemailer.createTransport(...)`
- `createReverseProxy(...)`

But there is no large custom domain object factory system.

### Observer Pattern

Not explicit.

Notifications are sent by direct calls, not by an event bus or subscription model.

### Command Pattern

Not explicit.

Actions are mostly just service method calls, not command objects.

### State Pattern

Not explicit.

Order status and product status exist as values, but not as separate state objects implementing behavior.

---

## 15. Which patterns are strongest in this repo

If we rank only the patterns that are clearly and consistently present, the strongest ones are:

1. **Dependency Injection**
2. **Decorator pattern**
3. **Service Layer**
4. **Proxy pattern**
5. **Facade / Aggregator**
6. **Guard pattern**
7. **Composition-based layout**
8. **Module pattern**
9. **Adapter pattern**
10. **Singleton-like providers**

---

## 16. Practical reading of the codebase

The easiest way to read this repo is:

- backend request entry = **decorated controller**
- business logic = **service layer**
- infrastructure reuse = **DI + singleton providers**
- multi-service edge routing = **proxy**
- admin/hook simplification = **facade**
- cross-shape translation = **adapter**
- access control = **guard**
- frontend page structure = **composition via layouts**

That mental model matches the actual code much better than trying to force every file into strict GoF categories.

---

## 17. Final conclusion

This codebase is **not** a “pattern-heavy textbook OOP project.” It is a **pragmatic NestJS/React application** that uses a few patterns very consistently:

- **DI**
- **decorators**
- **service layer**
- **proxy**
- **facade**
- **guards**
- **layout composition**

The repo also contains several **pattern-like helper implementations** such as strategy-like and builder-like logic, but those are mostly implemented as service/helper functions instead of separate class hierarchies.

If you want a one-line summary:

> The project mainly uses framework-centric enterprise application patterns rather than classic object-oriented GoF class patterns.
