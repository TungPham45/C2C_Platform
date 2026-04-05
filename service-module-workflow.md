# Service Module Workflow

This file is the team workflow for adding a new backend module or service in this repo.

Use it when adding domains such as:

- `order-service`
- `chat-service`
- `account-service`
- any future service-owned module

## 1. Ground Rules

Follow these rules before writing code:

1. One service owns one domain boundary.
2. One service owns one database or one clearly owned schema.
3. Do not model another service's tables as Prisma relations.
4. Cross-service references must be scalar IDs only, for example `user_id`, `shop_id`, `product_id`.
5. Cross-service reads must happen by HTTP or events, not direct DB access.
6. Every service must have:
   - an `apps/<service-name>` app
   - a `libs/prisma-clients/<client-name>` Prisma schema
   - an Nx `project.json`
   - its own port
   - its own migration history

## 2. Naming Standard

Use this naming pattern:

- App folder: `apps/<domain>-service`
- Prisma client folder: `libs/prisma-clients/<domain>-client`
- Prisma output: `node_modules/@prisma/client/<domain>`
- Nx project name: `<domain>-service`
- Database name: `<domain>_db`

Examples:

- `apps/order-service`
- `libs/prisma-clients/order-client`
- `@prisma/client/order`
- `order_db`

- `apps/chat-service`
- `libs/prisma-clients/chat-client`
- `@prisma/client/chat`
- `chat_db`

## 3. Reserved Port Map

Keep ports stable across the team:

- `3000`: `api-gateway`
- `3001`: `product-service`
- `3002`: `auth-service`
- `3003`: `order-service`
- `3004`: `chat-service`
- `3005`: `admin-moderation-service`
- `4200`: `web`

If you add another new service later, assign the next unused port and write it into this file.

## 4. Required Files For Any New Service

Create this minimum structure:

```text
apps/<service-name>/
  project.json
  tsconfig.json
  src/
    main.ts
    app/
      app.module.ts
      <domain>.controller.ts
      <domain>.service.ts
      prisma.service.ts

libs/prisma-clients/<client-name>/
  schema.prisma
  migrations/
```

Use the current services as reference:

- [auth-service](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/apps/auth-service)
- [product-service](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/apps/product-service)

## 5. Step-By-Step Workflow

### Step 1: Define ownership first

Before coding, write down:

- what tables belong to this service
- which IDs it stores from other services
- which APIs it must expose publicly
- which APIs it must expose internally
- whether it is synchronous-only for now or event-driven later

If ownership is unclear, stop and settle that first.

### Step 2: Create the Prisma client

Create `libs/prisma-clients/<domain>-client/schema.prisma`.

Use this pattern:

```prisma
datasource db {
  provider = "postgresql"
  url      = "postgresql://postgres:123456@localhost:5432/<domain>_db"
}

generator client {
  provider = "prisma-client-js"
  output   = "../../../node_modules/@prisma/client/<domain>"
}
```

Rules:

- only keep service-owned models here
- use scalar foreign IDs for external references
- do not add Prisma relation models for another service's tables

### Step 3: Generate migration and client

Run the Prisma flow for that domain:

```powershell
npx prisma format --schema libs/prisma-clients/<domain>-client/schema.prisma
npx prisma validate --schema libs/prisma-clients/<domain>-client/schema.prisma
npx prisma migrate diff --from-empty --to-schema-datamodel libs/prisma-clients/<domain>-client/schema.prisma --script > libs/prisma-clients/<domain>-client/migrations/<timestamp>_init/migration.sql
npx prisma generate --schema libs/prisma-clients/<domain>-client/schema.prisma
```

If the database already exists and is the source of truth, use `db pull` first instead of forcing a target schema.

### Step 4: Create the Nx app

Create `apps/<service-name>/project.json` using the same Nx executor pattern already working in this repo:

```json
{
  "name": "<service-name>",
  "$schema": "../../node_modules/nx/schemas/project-schema.json",
  "root": "apps/<service-name>",
  "sourceRoot": "apps/<service-name>/src",
  "projectType": "application",
  "tags": [],
  "targets": {
    "build": {
      "executor": "@nx/js:tsc",
      "outputs": ["{options.outputPath}"],
      "options": {
        "main": "apps/<service-name>/src/main.ts",
        "outputPath": "dist/apps/<service-name>",
        "tsConfig": "apps/<service-name>/tsconfig.json",
        "assets": []
      }
    },
    "serve": {
      "executor": "@nx/js:node",
      "options": {
        "buildTarget": "<service-name>:build"
      }
    }
  }
}
```

Use these working references:

- [auth-service/project.json](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/apps/auth-service/project.json)
- [product-service/project.json](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/apps/product-service/project.json)

### Step 5: Add bootstrap and app module

Create `src/main.ts` with:

- Nest bootstrap
- `app.enableCors()`
- `app.setGlobalPrefix('api')`
- `process.env.PORT || <reserved-port>`

Reference:

- [product-service/main.ts](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/apps/product-service/src/main.ts)
- [auth-service/main.ts](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/apps/auth-service/src/main.ts)

### Step 6: Add Prisma service

Use a dedicated Prisma service for that client.

Important repo-specific rule:

Do not import the generated Prisma client like this:

```ts
import { PrismaClient } from '@prisma/client/order';
```

In this repo, runtime `nx serve` can fail on that import.

Use the explicit runtime path:

```ts
import { PrismaClient } from '@prisma/client/order/index.js';
```

Same rule for `chat`, `auth`, `product`, `admin-mod`, and any future domain.

Minimal pattern:

```ts
import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client/<domain>/index.js';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
  }
}
```

### Step 7: Add controller and service

Keep controller thin and service thick.

Controller:

- request parsing
- header reading
- route decorators
- internal token check if needed

Service:

- Prisma queries
- business logic
- ownership checks
- response shaping

Reference:

- [product.controller.ts](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/apps/product-service/src/app/product.controller.ts)
- [product.service.ts](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/apps/product-service/src/app/product.service.ts)

### Step 8: Decide public vs internal APIs

Public APIs:

- used by `web` through `api-gateway`
- usually require user JWT auth

Internal APIs:

- used by other backend services directly
- should use `x-internal-token`
- should validate against `INTERNAL_SERVICE_TOKEN`

Reference pattern:

- [auth.controller.ts](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/apps/auth-service/src/app/auth.controller.ts)
- [admin.service.ts](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/apps/admin-moderation-service/src/app/admin.service.ts)

### Step 9: Wire the API gateway

If the service needs public frontend access, add a proxy in:

- [api-gateway/main.ts](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/apps/api-gateway/src/main.ts)

Pattern:

```ts
app.use(
  '/api/orders',
  createProxyMiddleware({
    target: 'http://localhost:3003/api/orders',
    changeOrigin: true,
  }),
);
```

Examples:

- `/api/auth` -> `3002`
- `/api/products` -> `3001`
- `/api/admin` -> `3005`

### Step 10: Build and run verification

Run at minimum:

```powershell
npx nx build <service-name>
npx nx serve <service-name>
npx nx show project <service-name>
```

Then test:

- service starts on its port
- Prisma client connects
- gateway proxy works if public
- no port collision
- no missing module error

## 6. Standard Checklist For New Services

Use this checklist every time:

- database name created
- Prisma schema created
- migrations folder created
- Prisma client generated
- `apps/<service-name>` created
- `project.json` created
- `main.ts` created
- `app.module.ts` created
- controller created
- service created
- `prisma.service.ts` created
- port assigned
- gateway proxy added if needed
- internal token validation added if needed
- `npx nx build <service-name>` passes
- `npx nx serve <service-name>` passes

## 7. Concrete Pattern For `order-service`

Use this setup:

- app folder: `apps/order-service`
- prisma client: `libs/prisma-clients/order-client`
- import path: `@prisma/client/order/index.js`
- port: `3003`
- public gateway route: `/api/orders`

`order-service` should own data such as:

- `vouchers`
- `checkout_sessions`
- `shop_orders`
- `order_items`

It should not own:

- `users`
- `shops`
- `products`

It should only store external scalar IDs such as:

- `user_id`
- `shop_id`
- `product_id`
- `product_variant_id`

## 8. Concrete Pattern For `chat-service`

Use this setup:

- app folder: `apps/chat-service`
- prisma client: `libs/prisma-clients/chat-client`
- import path: `@prisma/client/chat/index.js`
- port: `3004`
- public gateway route: `/api/chat`

`chat-service` should own data such as:

- `conversations`
- `messages`

It should not own:

- `users`
- `shops`
- `orders`

It should only store external scalar IDs such as:

- `buyerId`
- `sellerId`
- `senderId`

## 9. Suggested Team Branch Workflow

For every new service or module:

1. Create a branch for one domain only.
2. Change Prisma schema first.
3. Generate client and migration.
4. Create Nx app files.
5. Add controller, service, and Prisma service.
6. Add gateway wiring only if the service is public.
7. Run `build` and `serve`.
8. Open a PR with:
   - ownership statement
   - port used
   - DB name used
   - public endpoints
   - internal endpoints
   - migration notes

## 10. Definition Of Done

A new module or service is done only when:

- it has clear domain ownership
- it has its own Prisma client and migration history
- it builds with Nx
- it runs with Nx
- it does not directly couple to another service's database
- it has the right gateway/internal communication path

## 11. What To Do Next In This Repo

The next missing backend apps to add using this workflow are:

1. `apps/order-service`
2. `apps/chat-service`

These should follow the same structure already used by:

- [auth-service](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/apps/auth-service)
- [product-service](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/apps/product-service)
- [admin-moderation-service](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/apps/admin-moderation-service)
