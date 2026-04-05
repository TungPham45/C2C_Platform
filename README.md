# C2C Platform

This repo is an Nx monorepo for a C2C demo platform.

Current apps:

- `web`
- `api-gateway`
- `auth-service`
- `product-service`
- `admin-moderation-service`

## What You Need Installed

Install these on your machine before running the demo:

- Node.js 22.x
- npm
- Docker Desktop

Optional but useful:

- pgAdmin 4
- Prisma extension for VS Code

## Database Setup

This project uses PostgreSQL in Docker with 5 databases:

- `auth_db`
- `product_db`
- `order_db`
- `chat_db`
- `admin_mod_db`

Start PostgreSQL:

```powershell
docker compose up -d postgres
```

The database container is defined in [docker-compose.yml](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/docker-compose.yml).

Default local database connection:

```text
postgresql://postgres:123456@localhost:5432/<database_name>
```

## Install Project Dependencies

From repo root:

```powershell
npm install
```

## Service Ports

Default local ports:

- `web`: `4200`
- `api-gateway`: `3000`
- `product-service`: `3001`
- `auth-service`: `3002`
- `admin-moderation-service`: `3005`

## Run The Website Demo

For the seller product-management demo, you only need:

- `product-service`
- `auth-service`
- `api-gateway`
- `web`

Start them in separate terminals from repo root.

Terminal 1:

```powershell
npx nx serve product-service
```

Terminal 2:

```powershell
npx nx serve auth-service
```

Terminal 3:

```powershell
npx nx serve api-gateway
```

Terminal 4:

```powershell
npx nx serve web
```

Then open:

```text
http://localhost:4200
```

## Optional Admin Demo

If you also want the admin flow, run one more terminal:

```powershell
$env:INTERNAL_SERVICE_TOKEN='internal-dev-token'
npx nx serve admin-moderation-service
```

If you run admin cross-service calls, use the same `INTERNAL_SERVICE_TOKEN` value in:

- `auth-service`
- `product-service`
- `admin-moderation-service`

Example:

```powershell
$env:INTERNAL_SERVICE_TOKEN='internal-dev-token'
npx nx serve product-service
```

```powershell
$env:INTERNAL_SERVICE_TOKEN='internal-dev-token'
npx nx serve auth-service
```

```powershell
$env:INTERNAL_SERVICE_TOKEN='internal-dev-token'
npx nx serve admin-moderation-service
```

## Demo Flow That Should Work

Current expected demo path:

1. Open the website
2. Login through `auth-service`
3. Seller context is resolved from `product-service`
4. Enter seller dashboard
5. Open product management
6. Create, edit, list, and delete products

This flow depends on:

- PostgreSQL running
- the seller user existing in `auth_db`
- the seller having an active shop in `product_db`

## Useful Nx Commands

Build a service:

```powershell
npx nx build product-service
```

Show registered Nx projects:

```powershell
npx nx show projects
```

Show one project:

```powershell
npx nx show project product-service
```

## Troubleshooting

### Port already in use

If `nx serve` fails with `EADDRINUSE`, another process is already using that port.

Example:

- `3001` is used by `product-service`
- `3002` is used by `auth-service`

Stop the old process, then rerun the service.

### Prisma client import issue during `nx serve`

This repo uses generated Prisma clients under:

- `@prisma/client/auth`
- `@prisma/client/product`
- `@prisma/client/order`
- `@prisma/client/chat`
- `@prisma/client/admin-mod`

For runtime Nest services in this repo, use explicit imports like:

```ts
import { PrismaClient } from '@prisma/client/product/index.js';
```

That avoids the module-resolution failure seen with plain directory imports during `nx serve`.

### Login returns `401 Unauthorized`

That means auth rejected the credentials.

The login route checks:

- user exists by email
- password matches the bcrypt hash in `auth_db`

It is not caused by the gateway if the response is `401 Invalid credentials`.

## Repo Notes

- Prisma schemas live under [libs/prisma-clients](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/libs/prisma-clients)
- Backend service workflow is documented in [service-module-workflow.md](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/service-module-workflow.md)
- Current project status and follow-up notes are in [microservices-fix-ideas.txt](/C:/Users/admin/Desktop/C2C_Platform/c2c-platform/microservices-fix-ideas.txt)
