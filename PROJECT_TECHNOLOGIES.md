# Project Technologies and Installation Guide

This document summarizes the technologies currently used in the C2C Platform repository and what must be installed to run or develop the project.

## Project Type

The project is an Nx monorepo for a C2C marketplace platform.

- Monorepo tool: Nx `22.6.3`
- Main language: TypeScript
- Runtime: Node.js
- Package manager: npm with `package-lock.json`
- Frontend app: React/Vite app in `apps/web`
- Backend architecture: NestJS API gateway plus NestJS microservices
- Database: PostgreSQL with Prisma schemas and generated Prisma clients
- Container tooling: Docker Compose and Dockerfiles

## What Needs To Be Installed

Install these on the development machine:

| Tool | Required | Used For | Notes |
| --- | --- | --- | --- |
| Node.js | Yes | Running frontend, backend services, Nx, Prisma, scripts | README requires Node.js v20 or newer. Dockerfiles use Node `22-alpine`. |
| npm | Yes | Installing JavaScript/TypeScript dependencies | Comes with Node.js. Use `npm install`. |
| Docker Desktop | Yes for database stack | Running PostgreSQL and pgAdmin locally | Must be running before `docker compose up`. |
| Git | Yes | Cloning and version control | Standard development requirement. |
| PowerShell | Recommended on Windows | Running `npm run local:up` and scripts/run-local-stack.ps1 | The local stack helper is PowerShell based. |
| Database client | Optional | Inspecting PostgreSQL manually | pgAdmin is already provided through Docker. DBeaver or psql can also be used. |
| ngrok | Optional | External access to local web app | `ngrok.exe` exists in the repo and Vite allows `.ngrok-free.app` hosts. |

Install project dependencies with:

```powershell
npm install
```

The `prepare` script runs Prisma client generation automatically after install:

```powershell
npm run prisma:generate
```

## Quick Setup Commands

Start PostgreSQL and pgAdmin:

```powershell
docker compose up -d postgres pgadmin
```

Run the full local Node development stack on Windows:

```powershell
npm run local:up
```

Run the setup helper:

```powershell
npm run setup
```

Synchronize all Prisma schemas to PostgreSQL:

```powershell
npm run db:sync
```

Generate all Prisma clients:

```powershell
npm run prisma:generate
```

Run individual apps manually:

```powershell
npx nx serve auth-service
npx nx serve product-service
npx nx serve admin-moderation-service
npx nx serve order-service
npx nx serve chat-service
npx nx serve api-gateway
npx nx serve web
```

## Frontend Technologies

Frontend app path: `apps/web`

| Technology | Version / Package | Used For |
| --- | --- | --- |
| React | `react`, `react-dom` `^19.0.0` | Frontend UI framework |
| Vite | `vite` `^8.0.0` | Frontend dev server and build tool |
| TypeScript | `typescript` `~5.9.2` | Static typing |
| React Router | `react-router-dom` `6.30.3` | Client-side routing |
| Tailwind CSS | `tailwindcss` `3.4.3` | Utility CSS styling |
| PostCSS | `postcss` `8.4.38` | CSS processing |
| Autoprefixer | `autoprefixer` `10.4.13` | CSS vendor prefixing |
| React Icons | `react-icons` `^5.6.0` | UI icons |
| Recharts | `recharts` `^3.8.1` | Admin analytics charts |
| Browser Fetch API | Native browser API | Most frontend API calls |
| Nx Vite plugin | `@nx/vite`, `@nx/react` | Nx integration for React/Vite |

Frontend dev server:

- Default port: `4200`
- Local URL: `http://localhost:4200`
- API base setting: `VITE_API_BASE_URL`
- Dev proxy target setting: `VITE_DEV_API_PROXY_TARGET`, defaulting to `http://localhost:3000`

Main frontend routes include:

- Marketplace: `/`, `/products`, `/product/:id`, `/shop/:id`, `/vouchers`
- Auth: `/login`, `/register`
- Buyer: `/cart`, `/checkout`, `/orders`, `/messages`
- Seller: `/seller/center`, `/seller/products`, `/seller/vouchers`, `/seller/orders`, `/seller/chat`
- Admin: `/admin`, `/admin/products`, `/admin/shops`, `/admin/users`, `/admin/categories`, analytics pages

## Backend Technologies

Backend apps are TypeScript NestJS services.

| Technology | Version / Package | Used For |
| --- | --- | --- |
| NestJS | `@nestjs/common`, `@nestjs/core`, `@nestjs/platform-express` `^11.1.17` | Backend framework |
| Node.js | v20+ locally, Node 22 in Dockerfiles | Backend runtime |
| Express platform | Via `@nestjs/platform-express` | HTTP server layer |
| RxJS | `rxjs` `^7.8.2` | NestJS reactive utilities |
| Reflect metadata | `reflect-metadata` `^0.2.2` | NestJS decorators |
| Prisma Client | `@prisma/client` `5.22.0` | Database access |
| Prisma CLI | `prisma` `5.22.0` | Schema sync, migrations, client generation |
| bcryptjs | `bcryptjs` `^3.0.3` | Password hashing and comparison |
| JWT | `@nestjs/jwt`, `jsonwebtoken` | Login tokens and gateway token decoding |
| Nodemailer | `nodemailer` `^8.0.5` | OTP email sending when SMTP is configured |
| Multer | Via Nest platform express and `multer` import | Product image upload handling |
| class-validator | `class-validator` `^0.15.1` | DTO validation |
| class-transformer | `class-transformer` `^0.5.1` | DTO transformation |

## Backend Services

| Service | Path | Default Port | Database / Client | Purpose |
| --- | --- | --- | --- | --- |
| API Gateway | `apps/api-gateway` | `3000` | None directly | Public API entry point and reverse proxy to services |
| Auth Service | `apps/auth-service` | `3002` | `auth_db`, `@prisma/client/auth` | Login, registration, OTP, user admin data |
| Product Service | `apps/product-service` | `3001` | `product_db`, `@prisma/client/product` | Products, shops, categories, seller context, uploads |
| Order Service | `apps/order-service` | `3004` | `order_db`, plus reads auth/product clients | Orders, cart, vouchers |
| Admin Moderation Service | `apps/admin-moderation-service` | `3005` | `admin_mod_db`, `@prisma/client/admin-mod` | Admin dashboard, moderation, banners |
| Chat Service | `apps/chat-service` | `3006` | `chat_db`, `@prisma/client/chat` | Conversations and messages |

All services use CORS and expose HTTP APIs through NestJS controllers.

## API Layer

The API gateway is in `apps/api-gateway`.

Gateway technology:

- NestJS application
- Custom reverse proxy implemented with Node `http`, `https`, `stream`, and `url`
- `jsonwebtoken` for decoding bearer tokens and forwarding `x-user-id` and `x-role` headers

Gateway routes:

| Public Route | Upstream Service |
| --- | --- |
| `/api/auth` | Auth Service |
| `/api/products` | Product Service |
| `/api/admin` | Admin Moderation Service |
| `/api/orders` | Order Service |
| `/api/vouchers` | Order Service |
| `/api/cart` | Order Service |
| `/api/chat` | Chat Service |
| `/uploads` | Product Service static uploaded files |

Gateway environment variables:

| Variable | Default |
| --- | --- |
| `PORT` | `3000` |
| `AUTH_SERVICE_URL` | `http://localhost:3002/api/auth` |
| `PRODUCT_SERVICE_URL` | `http://localhost:3001/api/products` |
| `ADMIN_SERVICE_URL` | `http://localhost:3005/api/admin` |
| `ORDER_SERVICE_URL` | `http://localhost:3004/api/orders` |
| `CHAT_SERVICE_URL` | `http://localhost:3006/api/chat` |
| `PRODUCT_PUBLIC_URL` | `http://localhost:3001/uploads` |

## Database Technologies

| Technology | Used For |
| --- | --- |
| PostgreSQL `15-alpine` | Main relational database engine |
| Prisma ORM `5.22.0` | Schema definition, database access, generated clients |
| Prisma migrations | Database schema versioning |
| SQL seed files | Initial demo data |
| pgAdmin | Browser-based PostgreSQL administration |

Docker database services:

| Service | Image | Host Port | Purpose |
| --- | --- | --- | --- |
| `postgres` | `postgres:15-alpine` | `5433` mapped to container `5432` | Local database server |
| `pgadmin` | `dpage/pgadmin4:latest` | `5050` mapped to container `80` | Database administration UI |

PostgreSQL credentials from `docker-compose.yml`:

- Host from machine: `localhost`
- Port from machine: `5433`
- Username: `postgres`
- Password: `123456`

Databases:

| Database | Prisma Schema |
| --- | --- |
| `auth_db` | `libs/prisma-clients/auth-client/schema.prisma` |
| `product_db` | `libs/prisma-clients/product-client/schema.prisma` |
| `order_db` | `libs/prisma-clients/order-client/schema.prisma` |
| `chat_db` | `libs/prisma-clients/chat-client/schema.prisma` |
| `admin_mod_db` | `libs/prisma-clients/admin-mod-client/schema.prisma` |

Generated Prisma client outputs:

| Client | Output Path |
| --- | --- |
| Auth | `node_modules/@prisma/client/auth` |
| Product | `node_modules/@prisma/client/product` |
| Order | `node_modules/@prisma/client/order` |
| Chat | `node_modules/@prisma/client/chat` |
| Admin moderation | `node_modules/@prisma/client/admin-mod` |

Seed files:

- `db/seeds/auth_db.sql`
- `db/seeds/product_db.sql`
- `db/seeds/chat_db.sql`
- `db/seeds/admin_mod_db.sql`

## Docker and Deployment-Related Files

| File | Purpose |
| --- | --- |
| `docker-compose.yml` | Defines PostgreSQL and pgAdmin services |
| `docker/backend.Dockerfile` | Generic backend build image for Nx service apps |
| `docker/web.Dockerfile` | Frontend build/preview image |
| `init-multiple-db.sh` | Creates multiple PostgreSQL databases and loads setup files |
| `docker/pgadmin/servers.json` | Preconfigured pgAdmin server |
| `docker/pgadmin/pgpass` | pgAdmin password file |

Important note: the current `docker-compose.yml` defines `postgres` and `pgadmin`. It does not currently define containers for `auth-service`, `product-service`, `admin-moderation-service`, `order-service`, `chat-service`, `api-gateway`, or `web`, even though Dockerfiles exist for backend and web builds.

## Development Tooling

| Tool / Package | Version | Used For |
| --- | --- | --- |
| Nx | `22.6.3` | Monorepo orchestration, project graph, builds, serves |
| TypeScript | `~5.9.2` | Type checking and compilation |
| SWC | `@swc/core`, `@swc-node/register` | Fast TypeScript/JavaScript tooling |
| Vite | `^8.0.0` | Frontend build and dev server |
| Webpack CLI | `^5.1.4` | Webpack-based Nx tooling support |
| Vitest | `~4.0.0` | Test runner available in dependencies |
| jsdom | `~22.1.0` | Browser-like test environment |
| Prettier | `~3.6.2` | Code formatting |
| jiti | `2.4.2` | Runtime loading for config/tool files |

Nx project list:

- `web`
- `api-gateway`
- `auth-service`
- `product-service`
- `order-service`
- `chat-service`
- `admin-moderation-service`
- `chat-service-e2e`
- `prisma-clients`

## Testing Notes

Installed test-related packages include:

- `vitest`
- `@vitest/ui`
- `jsdom`
- `@nestjs/testing`

There is also a `chat-service-e2e` project configured for Jest:

- `apps/chat-service-e2e/project.json`
- `apps/chat-service-e2e/jest.config.cts`

However, the current root `package.json` does not list the usual Jest packages used by that config, such as `@nx/jest`, `jest`, and `ts-jest`, and the referenced root `jest.preset.js` file is not present. If the Jest e2e project is intended to be used, those packages/config files need to be restored or installed.

## Environment Variables Used By Code

| Variable | Used By | Purpose |
| --- | --- | --- |
| `VITE_API_BASE_URL` | Frontend | API base URL, default `/api` |
| `VITE_DEV_API_PROXY_TARGET` | Vite dev server | Proxy target, default `http://localhost:3000` |
| `PORT` | Backend services | Override service port |
| `AUTH_SERVICE_URL` | API Gateway | Auth service upstream URL |
| `PRODUCT_SERVICE_URL` | API Gateway | Product service upstream URL |
| `ADMIN_SERVICE_URL` | API Gateway | Admin service upstream URL |
| `ORDER_SERVICE_URL` | API Gateway | Order service upstream URL |
| `CHAT_SERVICE_URL` | API Gateway | Chat service upstream URL |
| `PRODUCT_PUBLIC_URL` | API Gateway | Product upload/static file upstream URL |
| `SMTP_USER` | Auth Service | Gmail sender account for OTP email |
| `SMTP_PASS` | Auth Service | Gmail/app password for OTP email |

## Main npm Scripts

| Script | Command | Purpose |
| --- | --- | --- |
| `setup` | `node scripts/setup.mjs` | Install deps, start PostgreSQL, sync DB schemas |
| `local:up` | `powershell.exe -ExecutionPolicy Bypass -File scripts/run-local-stack.ps1` | Start PostgreSQL, sync DB, open service terminals |
| `db:sync` | `node scripts/sync-db-schema.mjs` | Push Prisma schemas to databases and regenerate clients |
| `prisma:generate` | `nx run prisma-clients:generate` | Generate all Prisma clients |
| `prepare` | `npm run prisma:generate` | Runs after npm install |

## Summary By Area

| Area | Main Technologies |
| --- | --- |
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS, React Router, Recharts, React Icons |
| Backend | NestJS 11, Node.js, TypeScript, Express platform, Prisma Client |
| API Gateway | NestJS, custom Node HTTP reverse proxy, JWT decoding |
| Database | PostgreSQL 15, Prisma schemas/migrations, SQL seeds |
| Authentication | bcryptjs, Nest JWT, jsonwebtoken |
| Email / OTP | Nodemailer with SMTP env vars, local OTP simulation log fallback |
| File Uploads | Multer, local `public/uploads/products` storage |
| Tooling | Nx, npm, SWC, Prettier, Vitest, Docker Compose |
| Admin Tools | pgAdmin Docker container |

## Detailed Technology Examples In This Project

This section explains what each important technology does and gives a concrete example of how it appears in this repository.

### Nx Monorepo

Nx is the tool that organizes the whole repository into multiple apps and libraries.

In this project, Nx lets the frontend, API gateway, backend services, and Prisma client generation live in one repository while still being runnable as separate projects.

Project example:

| Nx Project | Location | Function |
| --- | --- | --- |
| `web` | `apps/web` | React frontend marketplace app |
| `api-gateway` | `apps/api-gateway` | Public API entry point |
| `auth-service` | `apps/auth-service` | User authentication service |
| `product-service` | `apps/product-service` | Product, shop, category, and upload service |
| `order-service` | `apps/order-service` | Cart, checkout, orders, and vouchers |
| `chat-service` | `apps/chat-service` | Buyer/seller conversations and messages |
| `admin-moderation-service` | `apps/admin-moderation-service` | Admin dashboard and moderation APIs |
| `prisma-clients` | `libs/prisma-clients` | Generates separate Prisma clients for each database |

Example command:

```powershell
npx nx serve product-service
```

That command builds and starts only the product service, instead of starting the whole platform.

### TypeScript

TypeScript is JavaScript with static typing. It helps catch mistakes before runtime and makes backend/frontend code easier to navigate.

In this project, TypeScript is used everywhere:

- React components use `.tsx`
- Backend services use `.ts`
- Nx build configs use `tsconfig.json`
- Prisma service wrappers use typed Prisma clients

Project example:

```ts
async getMessages(@Req() req: any, @Param('id') id: string) {
  const userId = this.getUserId(req);
  return this.appService.getMessages(+id, userId);
}
```

This comes from the chat service controller. TypeScript marks `id` as a string from the URL, then the code converts it to a number with `+id`.

### Node.js

Node.js runs the backend services, scripts, Nx commands, Prisma commands, and Vite tooling.

Project examples:

- `node scripts/setup.mjs` installs dependencies, starts PostgreSQL, and syncs schemas.
- `node scripts/sync-db-schema.mjs` waits for PostgreSQL and runs Prisma commands.
- NestJS services run on Node.js when started with `npx nx serve <service>`.
- Docker backend images use `node:22-alpine`.

### npm

npm installs and manages the JavaScript and TypeScript dependencies listed in `package.json`.

Project examples:

```powershell
npm install
npm run setup
npm run db:sync
npm run prisma:generate
npm run local:up
```

The `prepare` script runs `npm run prisma:generate`, so Prisma clients are regenerated after dependency installation.

### React

React is the frontend UI library.

In this project, React builds the marketplace, buyer pages, seller center, admin pages, cart, checkout, chat UI, and product management pages.

Project example:

```tsx
root.render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
```

This appears in `apps/web/src/main.tsx`. It mounts the React app into the browser.

Examples of React pages in the project:

| Page | File | Function |
| --- | --- | --- |
| Marketplace home | `apps/web/src/pages/MarketplaceHomePage.tsx` | Main buyer homepage |
| Product detail | `apps/web/src/pages/ProductDetail.tsx` | Product view page |
| Cart | `apps/web/src/pages/CartPage.tsx` | Buyer cart |
| Checkout | `apps/web/src/pages/CheckoutPage.tsx` | Checkout flow |
| Seller center | `apps/web/src/pages/seller/SellerCenter.tsx` | Seller dashboard |
| Admin dashboard | `apps/web/src/pages/admin/AdminDashboard.tsx` | Admin dashboard |
| Messages | `apps/web/src/pages/MessagesPage.tsx` | Buyer chat page |

### React DOM

React DOM connects React components to the actual browser DOM.

Project example:

```tsx
ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
```

This tells React where to render the app inside `apps/web/index.html`.

### React Router

React Router handles frontend page navigation without requiring full page reloads.

Project example:

```tsx
<Route path="/seller/products" element={<ProductManagementPage />} />
<Route path="/admin/users" element={<AccountManagement />} />
<Route path="/product/:id" element={<ProductDetailPage />} />
```

This means:

- `/seller/products` opens the seller product manager.
- `/admin/users` opens admin account management.
- `/product/:id` opens a product detail page using a dynamic product ID.

Protected route example:

```tsx
<Route element={<BuyerProtectedRoute />}>
  <Route path="/cart" element={<CartPage />} />
  <Route path="/checkout" element={<CheckoutPage />} />
</Route>
```

The buyer-only routes are wrapped so unauthenticated users can be redirected or blocked.

### Vite

Vite is the frontend dev server and build tool.

In this project, Vite:

- Starts the frontend at `http://localhost:4200`
- Builds frontend output into `dist/apps/web`
- Proxies frontend API calls to the API gateway during local development
- Allows ngrok hosts through `allowedHosts`

Project example from `apps/web/vite.config.mts`:

```ts
server: {
  port: 4200,
  host: true,
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
}
```

This lets frontend code call `/api/products`, while Vite forwards it to the gateway on port `3000`.

### Tailwind CSS

Tailwind CSS is a utility-first CSS framework. It lets components use small class names for layout, spacing, colors, typography, and responsive behavior.

Project example from the admin analytics page:

```tsx
<div className="max-w-6xl mx-auto space-y-8">
```

That class combination means:

- Limit content width to `max-w-6xl`
- Center it horizontally with `mx-auto`
- Add vertical spacing between child sections with `space-y-8`

Tailwind configuration is in:

```text
apps/web/tailwind.config.js
```

### PostCSS

PostCSS processes CSS before it reaches the browser.

In this project, PostCSS is used together with Tailwind and Autoprefixer. The web app has:

```text
apps/web/postcss.config.js
```

Its function is to make Tailwind CSS generation and browser-compatible CSS output work during Vite builds.

### Autoprefixer

Autoprefixer adds browser vendor prefixes where needed.

Project example:

If CSS requires browser-specific prefixes, Autoprefixer can transform it during build so the frontend works across browsers more consistently. It is part of the Tailwind/PostCSS pipeline.

### React Icons

React Icons provides icon components for the frontend.

Project example:

```tsx
import { FaFacebookF, FaInstagram, FaTwitter, FaYoutube } from "react-icons/fa6";
```

This appears in the marketplace layout and provides social media icons without manually storing SVG files.

### Recharts

Recharts is used for chart visualizations in admin analytics pages.

Project example:

```tsx
<ResponsiveContainer width="100%" height="100%">
  <AreaChart data={data}>
    <XAxis dataKey="date" />
    <YAxis />
    <Tooltip />
    <Area dataKey="newUsers" />
  </AreaChart>
</ResponsiveContainer>
```

In `apps/web/src/pages/admin/UserAnalytics.tsx`, this turns API data from `/api/admin/analytics/user-growth` into a user growth chart.

### Browser Fetch API

The frontend mostly uses the native browser `fetch()` API to call backend APIs.

Project example:

```ts
const res = await fetch('/api/admin/analytics/user-growth?timeframe=week');
const json = await res.json();
```

This asks the API gateway for admin analytics data. The gateway then routes the request to the admin moderation service.

### Axios

Axios is installed and used in the `chat-service-e2e` test project.

Project example:

```ts
const res = await axios.get(`/api`);
```

That appears in the chat service e2e test files. The main frontend currently uses `fetch()` more than Axios.

### NestJS

NestJS is the backend framework used by the API gateway and all backend services.

NestJS organizes backend code into:

- Modules
- Controllers
- Services
- Dependency injection
- Decorators like `@Controller`, `@Get`, `@Post`, `@Injectable`

Project example:

```ts
@Controller('products')
export class ProductController {
  constructor(@Inject(ProductService) private readonly productService: ProductService) {}

  @Get()
  getAllActiveProducts() {
    return this.productService.getActiveProducts();
  }
}
```

This means the product service exposes a `GET /api/products` endpoint.

### NestJS Controllers

Controllers define API routes.

Project examples:

| Controller | File | Example Route |
| --- | --- | --- |
| Auth controller | `apps/auth-service/src/app/auth.controller.ts` | `POST /api/auth/login` |
| Product controller | `apps/product-service/src/app/product.controller.ts` | `GET /api/products` |
| Order controller | `apps/order-service/src/app/order.controller.ts` | `POST /api/orders` |
| Cart controller | `apps/order-service/src/app/cart.controller.ts` | `GET /api/cart` |
| Voucher controller | `apps/order-service/src/app/voucher.controller.ts` | `GET /api/vouchers/available` |
| Chat controller | `apps/chat-service/src/app/app.controller.ts` | `GET /api/chat/conversations` |
| Admin controller | `apps/admin-moderation-service/src/app/admin.controller.ts` | `GET /api/admin/dashboard` |

### NestJS Services

Services contain business logic. Controllers receive HTTP requests, then call services.

Project example:

```ts
async register(data: any) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await this.prisma.user.create({ data: { ...rest, password: hashedPassword } });
  return result;
}
```

This is business logic in the auth service. It hashes a password and creates a user in the database.

### NestJS Dependency Injection

Dependency injection lets classes receive the services they need instead of manually creating them.

Project example:

```ts
constructor(
  @Inject(PrismaService) private prisma: PrismaService,
  @Inject(JwtService) private jwtService: JwtService,
  @Inject(EmailService) private emailService: EmailService
) {}
```

The auth service receives database access, JWT signing, and email sending through NestJS dependency injection.

### NestJS Modules

Modules group controllers and providers together.

Project example from auth service:

```ts
@Module({
  imports: [JwtModule.register({ secret: 'serene-c2c-super-secret-key-2026' })],
  controllers: [AuthController],
  providers: [AuthService, PrismaService, EmailService],
})
export class AppModule {}
```

This tells NestJS that the auth app contains the auth controller, auth service, Prisma service, email service, and JWT module.

### Express Platform

NestJS runs on top of Express through `@nestjs/platform-express`.

In this project, Express functionality is used for:

- HTTP request/response handling
- Static file serving for product uploads
- Multer file upload integration
- Middleware in the API gateway

Project example:

```ts
app.useStaticAssets(join(process.cwd(), 'public'));
```

The product service uses this to serve uploaded product images from the `public` directory.

### CORS

CORS allows the frontend running on one port to call backend APIs running on other ports.

Project example:

```ts
app.enableCors();
```

This appears in the backend apps, allowing `http://localhost:4200` to call services such as `http://localhost:3000`.

### API Gateway

The API gateway is the public backend entry point.

Frontend code calls paths like:

```text
/api/products
/api/auth/login
/api/cart
/api/chat/conversations
```

The gateway forwards those requests to the correct service.

Project example:

| Frontend/Public API | Forwarded To |
| --- | --- |
| `/api/auth` | `auth-service` |
| `/api/products` | `product-service` |
| `/api/orders` | `order-service` |
| `/api/cart` | `order-service` |
| `/api/vouchers` | `order-service` |
| `/api/chat` | `chat-service` |
| `/api/admin` | `admin-moderation-service` |

### Custom Reverse Proxy

The gateway uses a custom reverse proxy in:

```text
apps/api-gateway/src/app/reverse-proxy.ts
```

Its job is to:

- Build the upstream URL
- Copy safe request headers
- Forward request body data
- Stream upstream responses back to the browser
- Return `502 Bad gateway` when the upstream service fails

Project example:

```ts
app.use('/api/products', createReverseProxy(productServiceUrl));
```

When the browser calls `/api/products`, the gateway forwards it to the product service.

### JSON Web Tokens

JWT is used for login sessions and user identity.

Auth service example:

```ts
const payload = {
  sub: user.id,
  email: user.email,
  role: user.role,
};

access_token: await this.jwtService.signAsync(payload)
```

The auth service creates a token after login.

Gateway example:

```ts
const decoded = jwt.verify(token, 'serene-c2c-super-secret-key-2026') as any;
req.headers['x-user-id'] = decoded.sub;
req.headers['x-role'] = decoded.role;
```

The gateway reads the token and forwards the user ID and role to downstream services.

### bcryptjs

bcryptjs hashes and verifies passwords.

Project examples:

```ts
const hashedPassword = await bcrypt.hash(password, 10);
```

This stores a hashed password during registration.

```ts
await bcrypt.compare(pass, user.password)
```

This checks a login password against the stored hash.

### Nodemailer

Nodemailer sends email when SMTP credentials are configured.

Project example:

```ts
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  this.transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}
```

In this project, the auth service uses it for OTP emails. If SMTP is not configured, the OTP is written to `otp_simulation.log` as a development fallback.

### Multer

Multer handles file uploads.

Project example:

```ts
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
uploadImage(@UploadedFile() file: Express.Multer.File) {
  return { url: `/uploads/products/${file.filename}` };
}
```

This powers product image upload from seller/admin screens. Uploaded images are stored under:

```text
public/uploads/products
```

### class-validator and ValidationPipe

`class-validator` is commonly used with NestJS DTOs to validate request bodies. This repo has the dependency installed and the chat service enables NestJS validation:

```ts
app.useGlobalPipes(new ValidationPipe({ transform: true }));
```

That means incoming data can be transformed and validated when DTO validation decorators are added. At the moment, many controllers still use `any` bodies, so validation can be improved later by adding DTO classes with decorators.

### class-transformer

`class-transformer` works with NestJS validation to transform request data into typed DTO objects.

Project example:

The chat service enables:

```ts
new ValidationPipe({ transform: true })
```

The `transform: true` option relies on transformation behavior so incoming request values can become proper DTO instances when DTOs are defined.

### Prisma ORM

Prisma maps TypeScript code to PostgreSQL queries.

Project examples:

```ts
const user = await this.prisma.user.findUnique({
  where: { email },
});
```

This looks up a user in `auth_db`.

```ts
return this.prisma.shopOrder.findMany({
  where: {
    checkout_session: {
      user_id: userId,
    },
  },
  include: {
    items: true,
  },
});
```

This gets a buyer's orders from `order_db`.

### Prisma Schemas

Each service has its own Prisma schema and database.

Project examples:

| Service Area | Schema File | Database |
| --- | --- | --- |
| Auth | `libs/prisma-clients/auth-client/schema.prisma` | `auth_db` |
| Product | `libs/prisma-clients/product-client/schema.prisma` | `product_db` |
| Order | `libs/prisma-clients/order-client/schema.prisma` | `order_db` |
| Chat | `libs/prisma-clients/chat-client/schema.prisma` | `chat_db` |
| Admin moderation | `libs/prisma-clients/admin-mod-client/schema.prisma` | `admin_mod_db` |

Each schema generates a separate Prisma client.

### Generated Prisma Clients

This project does not use only the default `@prisma/client`. It generates separate clients:

```text
@prisma/client/auth
@prisma/client/product
@prisma/client/order
@prisma/client/chat
@prisma/client/admin-mod
```

Project example:

```ts
import { PrismaClient } from '@prisma/client/product/index.js';
```

The product service uses that generated client to access `product_db`.

### Prisma Transactions

Prisma transactions keep multi-step database writes consistent.

Project example from order creation:

```ts
const orderResult = await this.prisma.$transaction(async (tx) => {
  const checkoutSession = await tx.checkoutSession.create({ data: { ... } });
  const created = await tx.shopOrder.create({ data: { ... } });
  return { checkoutSession, createdOrders };
});
```

This makes checkout safer because related checkout/order/voucher updates are grouped together.

### PostgreSQL

PostgreSQL is the relational database engine.

In this project, PostgreSQL stores:

- Users and OTP verification codes
- Products, shops, categories, variants, images
- Cart items, orders, vouchers, voucher claims
- Chat conversations and messages
- Admin banners and moderation data

The Docker PostgreSQL service is exposed on:

```text
localhost:5433
```

The internal container port is still `5432`, but the host machine uses `5433`.

### SQL Seed Files

Seed SQL files create demo data when the database is initialized.

Project examples:

```text
db/seeds/auth_db.sql
db/seeds/product_db.sql
db/seeds/chat_db.sql
db/seeds/admin_mod_db.sql
```

These files help create sample users, products, chat data, and admin data for development/demo.

### pgAdmin

pgAdmin is a browser UI for inspecting PostgreSQL.

Project example:

```text
http://localhost:5050
```

Use it to inspect databases like:

```text
auth_db
product_db
order_db
chat_db
admin_mod_db
```

The pgAdmin server connection is preconfigured through:

```text
docker/pgadmin/servers.json
```

### Docker Compose

Docker Compose starts local infrastructure services.

Project example:

```powershell
docker compose up -d postgres pgadmin
```

This starts:

- PostgreSQL on host port `5433`
- pgAdmin on host port `5050`

Current note: the existing `docker-compose.yml` only defines PostgreSQL and pgAdmin. The backend and frontend Dockerfiles exist, but the app services are not currently defined in `docker-compose.yml`.

### Backend Dockerfile

The backend Dockerfile builds one backend app using an `APP_NAME` argument.

Project example:

```dockerfile
ARG APP_NAME
RUN npm ci --ignore-scripts
RUN npm run prisma:generate
RUN npx nx build $APP_NAME
CMD sh -c "node dist/apps/$APP_NAME/main.js"
```

This can be used to build services like `auth-service`, `product-service`, or `api-gateway`.

### Web Dockerfile

The web Dockerfile builds and previews the frontend.

Project example:

```dockerfile
RUN npx vite build --config apps/web/vite.config.mts
CMD ["npx", "vite", "preview", "--config", "apps/web/vite.config.mts", "--host", "0.0.0.0", "--port", "4200"]
```

This builds the React app and serves it on port `4200`.

### PowerShell Scripts

PowerShell is used for the Windows local stack helper.

Project example:

```powershell
npm run local:up
```

That runs:

```text
scripts/run-local-stack.ps1
```

It starts PostgreSQL, syncs Prisma schemas, and opens PowerShell windows for the services.

### Node Setup Scripts

The repository includes Node.js scripts for setup and database sync.

Project examples:

| Script | File | Function |
| --- | --- | --- |
| `npm run setup` | `scripts/setup.mjs` | Installs dependencies, starts PostgreSQL, runs DB sync |
| `npm run db:sync` | `scripts/sync-db-schema.mjs` | Waits for PostgreSQL, pushes Prisma schemas, regenerates Prisma clients |

### SWC

SWC is a fast JavaScript/TypeScript compiler tool. Nx can use it internally for faster TypeScript workflows.

Project packages:

```text
@swc/core
@swc-node/register
@swc/helpers
```

In this project, SWC supports the Nx/TypeScript tooling stack.

### Webpack CLI

Webpack CLI is present for Nx/Webpack tooling support.

The chat service also has:

```text
apps/chat-service/webpack.config.js
```

Most frontend build work is handled by Vite, while Nx still has Webpack plugin support configured in `nx.json`.

### Vitest and jsdom

Vitest is installed as a test runner and jsdom provides a browser-like environment for frontend tests.

Project packages:

```text
vitest
@vitest/ui
jsdom
```

Current note: the package is installed, but the project does not currently have many visible Vitest test files.

### Jest e2e Configuration

There is a `chat-service-e2e` app configured for Jest-style e2e tests:

```text
apps/chat-service-e2e
```

Example config file:

```text
apps/chat-service-e2e/jest.config.cts
```

Current note: the root `package.json` does not currently include the usual Jest dependencies and the referenced `jest.preset.js` is missing. To use this e2e project, Jest-related dependencies/configuration need to be restored.

### Prettier

Prettier formats code consistently.

Project files:

```text
.prettierrc
.prettierignore
```

The current `.prettierrc` keeps formatting rules simple for the whole monorepo.

### ngrok

ngrok can expose the local frontend to the internet for demos or testing.

Project example:

- `ngrok.exe` exists in the repository root.
- Vite allows `.ngrok-free.app` in `allowedHosts`.

This supports opening the local web app through an ngrok URL while the app still runs on the development machine.

## Example End-To-End Flows

### Login Flow

1. Frontend page calls `/api/auth/login`.
2. Vite or browser sends the request to the API gateway.
3. Gateway proxies `/api/auth` to `auth-service`.
4. Auth service finds the user with Prisma in `auth_db`.
5. Auth service checks the password with bcryptjs.
6. Auth service signs a JWT with Nest JWT.
7. Frontend stores/uses the returned access token.

Technologies involved:

- React
- Fetch API
- Vite proxy
- API Gateway
- NestJS
- Prisma
- PostgreSQL
- bcryptjs
- JWT

### Product Listing Flow

1. Frontend calls `/api/products`.
2. Gateway proxies the request to `product-service`.
3. Product controller handles `GET /products`.
4. Product service queries `product_db` through the generated product Prisma client.
5. Frontend renders the returned products as marketplace cards.

Technologies involved:

- React
- Fetch API
- API Gateway
- NestJS controller/service
- Prisma generated product client
- PostgreSQL

### Product Image Upload Flow

1. Seller/admin selects an image in the frontend.
2. Frontend sends a multipart upload to `/api/products/upload`.
3. Gateway forwards the request to `product-service`.
4. Multer stores the file in `public/uploads/products`.
5. Product service returns the public URL.
6. Gateway also proxies `/uploads` so the browser can load uploaded files.

Technologies involved:

- React
- Fetch API
- API Gateway
- NestJS
- Multer
- Express static assets
- Local filesystem storage

### Checkout Flow

1. Buyer submits checkout data from the frontend.
2. Frontend calls `/api/orders`.
3. Gateway forwards the request to `order-service`.
4. Order service validates product variants through the product Prisma client.
5. Order service creates checkout/order records in `order_db`.
6. Order service updates voucher claims in a Prisma transaction.
7. Order service updates stock in `product_db`.
8. Order service updates `first_order_at` in `auth_db`.

Technologies involved:

- React
- Fetch API
- API Gateway
- NestJS
- Prisma transactions
- Multiple generated Prisma clients
- PostgreSQL

### Admin Analytics Flow

1. Admin page calls `/api/admin/analytics/user-growth`.
2. Gateway forwards to `admin-moderation-service`.
3. Admin service calls internal auth service analytics.
4. Auth service groups user registration dates from `auth_db`.
5. Frontend receives the data and renders a Recharts area chart.

Technologies involved:

- React
- Fetch API
- API Gateway
- Admin moderation service
- Auth service
- Prisma
- PostgreSQL
- Recharts

### Chat Flow

1. Buyer or seller opens chat UI.
2. Frontend calls `/api/chat/conversations`.
3. Gateway decodes JWT and forwards `x-user-id`.
4. Chat service reads the authenticated user ID from headers.
5. Chat service queries `chat_db` through the generated chat Prisma client.
6. Frontend displays conversations and messages.

Technologies involved:

- React
- Fetch API
- API Gateway
- JWT
- NestJS
- Prisma
- PostgreSQL

