# Category Management Deep Investigation

This document traces the Category Management feature from database to backend services, API gateway, and frontend. It also lists the exact files and functions that own each part of the flow.

## Scope

This investigation focuses on the admin category management screen:

```text
/admin/categories
```

The feature includes:

- Loading platform categories
- Building a category tree in the frontend
- Creating and editing categories
- Loading attributes for a selected category
- Creating, editing, and deleting attributes
- Creating, editing, and deleting attribute options
- Showing dashboard stats related to total categories and max attributes

Important distinction: category data is stored in `product_db`, not `admin_mod_db`. The `admin-moderation-service` exposes the admin API to the frontend, but it forwards category operations to `product-service`.

## High-Level Architecture

```text
PostgreSQL product_db
  tables: categories, attribute_definitions, attribute_options, product_attribute_values
        |
        v
product-service
  internal admin endpoints under /api/products/internal/admin/...
        |
        v
admin-moderation-service
  public admin endpoints under /api/admin/...
        |
        v
api-gateway
  public gateway route /api/admin
        |
        v
React frontend
  /admin/categories -> CategoryManagement.tsx
```

There are two category API surfaces:

| Surface | Base Path | Used By | Purpose |
| --- | --- | --- | --- |
| Admin category management | `/api/admin/categories` | Admin UI | Manage global platform categories and attributes |
| Public/product category consumption | `/api/products/categories` | Seller product forms, product browsing | Select categories and read inherited attributes |

## Database Layer

Main schema file:

```text
libs/prisma-clients/product-client/schema.prisma
```

The category management feature uses these models:

| Model | Lines | Table | Function |
| --- | --- | --- | --- |
| `Product` | `schema.prisma:45` | `products` | Products reference one platform category through `category_id` |
| `Category` | `schema.prisma:73` | `categories` | Stores global categories and seller shop categories |
| `AttributeDefinition` | `schema.prisma:127` | `attribute_definitions` | Defines category attributes such as Brand, Material, Size |
| `AttributeOption` | `schema.prisma:142` | `attribute_options` | Stores selectable values for attributes |
| `ProductAttributeValue` | `schema.prisma:154` | `product_attribute_values` | Stores product-specific attribute selections/values |

### Category Model

Code location:

```text
libs/prisma-clients/product-client/schema.prisma:73
```

Important fields:

| Field | Purpose |
| --- | --- |
| `id` | Primary key |
| `parent_id` | Parent category for tree hierarchy |
| `shop_id` | Null for global platform categories, set for seller shop categories |
| `name` | Display name |
| `slug` | Unique URL/category identifier |
| `icon_url` | Optional category icon |
| `level` | Category depth, such as 1, 2, 3 |
| `sort_order` | Ordering inside the same level |
| `is_active` | Whether category is available |
| `children` | Self-relation for child categories |
| `attribute_defs` | Attribute definitions attached to the category |

Current admin category management only loads global platform categories:

```ts
where: { shop_id: null }
```

That condition is in:

```text
apps/product-service/src/app/product.service.ts:488
```

### Attribute Models

Code locations:

```text
libs/prisma-clients/product-client/schema.prisma:127
libs/prisma-clients/product-client/schema.prisma:142
libs/prisma-clients/product-client/schema.prisma:154
```

`AttributeDefinition` belongs to a `Category`. `AttributeOption` belongs to an `AttributeDefinition`. `ProductAttributeValue` connects a product to an attribute and optionally to an option.

Example:

```text
Category: Áo thun
AttributeDefinition: Thương hiệu
AttributeOption: Không thương hiệu, ADAM STORE, ADDICTED
ProductAttributeValue: product #10 selected ADAM STORE
```

### Seed Data

Seed file:

```text
db/seeds/product_db.sql
```

Seed examples:

| Lines | Function |
| --- | --- |
| `product_db.sql:47` | Inserts root categories |
| `product_db.sql:65` | Inserts level 2 child categories |
| `product_db.sql:86` | Inserts level 3 child categories |
| `product_db.sql:132` | Inserts attribute definitions |
| `product_db.sql:141` | Starts inserting attribute options |

This is why the app can show default category trees and attribute options after database initialization.

## Backend Layer 1: Product Service

Product service owns the real category data.

Main files:

```text
apps/product-service/src/app/product.controller.ts
apps/product-service/src/app/product.service.ts
apps/product-service/src/app/prisma.service.ts
```

### Product Service Admin Endpoints

Admin endpoints are internal endpoints. They require the `x-internal-token` header before calling service logic.

Controller code:

```text
apps/product-service/src/app/product.controller.ts:204
```

Endpoint map:

| Method | Product Service Route | Controller Lines | ProductService Method | Service Lines |
| --- | --- | --- | --- | --- |
| GET | `/api/products/internal/admin/categories` | `204-208` | `getAdminCategories()` | `488-492` |
| GET | `/api/products/internal/admin/categories/:id` | `210-217` | `getAdminCategoryById(id)` | `495-506` |
| POST | `/api/products/internal/admin/categories` | `219-226` | `createCategory(data)` | `509-521` |
| PUT | `/api/products/internal/admin/categories/:id` | `228-236` | `updateCategory(id, data)` | `524-536` |
| DELETE | `/api/products/internal/admin/categories/:id` | `238-245` | `deleteCategory(id)` | `539-551` |
| GET | `/api/products/internal/admin/categories/:id/attributes` | `249-256` | `getAdminCategoryAttributes(categoryId)` | `667-674` |
| POST | `/api/products/internal/admin/categories/:categoryId/attributes` | `258-266` | `createAttributeDefinition(categoryId, data)` | `677-686` |
| PUT | `/api/products/internal/admin/attributes/:id` | `268-276` | `updateAttributeDefinition(id, data)` | `689-698` |
| DELETE | `/api/products/internal/admin/attributes/:id` | `278-285` | `deleteAttributeDefinition(id)` | `701-702` |
| POST | `/api/products/internal/admin/attributes/:attributeId/options` | `287-295` | `createAttributeOption(attributeId, data)` | `705-712` |
| PUT | `/api/products/internal/admin/attribute-options/:id` | `297-305` | `updateAttributeOption(id, data)` | `715-722` |
| DELETE | `/api/products/internal/admin/attribute-options/:id` | `307-313` | `deleteAttributeOption(id)` | `725-726` |

### Product Service Internal Access Check

The product controller calls `requireInternalAccess()` before admin category operations.

Code location:

```text
apps/product-service/src/app/product.controller.ts:24
```

Behavior:

- Expected header: `x-internal-token`
- Default token: `internal-dev-token`
- If the header does not match, the product service throws `ForbiddenException`

This means the frontend cannot call product-service internal admin category endpoints directly unless it has the internal service token. Instead, the frontend calls `admin-moderation-service` through `/api/admin`.

### Load Admin Categories

Flow:

```text
Admin UI
  GET /api/admin/categories
    -> admin-moderation-service
      -> GET http://localhost:3001/api/products/internal/admin/categories
        -> product-service
          -> product_db.categories
```

Product service function:

```text
apps/product-service/src/app/product.service.ts:488
```

Important behavior:

- Only returns categories where `shop_id` is null.
- Sorts by `level`, then `sort_order`, then `name`.
- Returns a flat list. The frontend builds the tree.

### Create Category

Frontend sends:

```json
{
  "name": "Example Category",
  "slug": "example-category",
  "parent_id": null,
  "sort_order": 0,
  "icon_url": null,
  "is_active": true,
  "level": 1
}
```

Product service function:

```text
apps/product-service/src/app/product.service.ts:509
```

Important behavior:

- Generates a slug from `name` when `slug` is missing.
- Converts `parent_id`, `level`, and `sort_order` to numbers.
- Defaults `is_active` to true.
- Creates a row in `categories`.

### Update Category

Product service function:

```text
apps/product-service/src/app/product.service.ts:524
```

Important behavior:

- Updates name, slug, parent, icon URL, level, sort order, and active flag.
- In the current frontend, edit mode keeps the parent unchanged.

### Delete Category

Product service function:

```text
apps/product-service/src/app/product.service.ts:539
```

Important behavior:

- Blocks deletion if the category has child categories.
- Blocks deletion if the category has assigned products.
- Deletes the category only after those checks pass.

Current frontend observation: the backend supports category delete, but the current admin category page does not appear to expose a delete category action. The frontend has delete logic for attributes, not categories.

### Load Admin Category Attributes

Product service function:

```text
apps/product-service/src/app/product.service.ts:667
```

Important behavior:

- Loads attributes directly attached to the selected category.
- Includes attribute options.
- Sorts options by `sort_order`.
- Sorts attributes by `sort_order`.

This admin endpoint returns only direct attributes for the selected category.

### Create and Edit Attributes

Create function:

```text
apps/product-service/src/app/product.service.ts:677
```

Update function:

```text
apps/product-service/src/app/product.service.ts:689
```

Fields handled:

| Field | Purpose |
| --- | --- |
| `category_id` | Category that owns the attribute |
| `name` | Attribute label |
| `input_type` | UI input type, such as `radio`, `select`, `text` |
| `is_required` | Whether product form should require this attribute |
| `sort_order` | Display order |

### Create and Edit Attribute Options

Create function:

```text
apps/product-service/src/app/product.service.ts:705
```

Update function:

```text
apps/product-service/src/app/product.service.ts:715
```

Options are values under an attribute. For example, an attribute called `Thương hiệu` can have options such as `Không thương hiệu` and `ADAM STORE`.

## Backend Layer 2: Admin Moderation Service

The frontend does not talk directly to product-service internal admin routes. It talks to `admin-moderation-service` through `/api/admin`.

Main files:

```text
apps/admin-moderation-service/src/app/admin.controller.ts
apps/admin-moderation-service/src/app/admin.service.ts
```

### Admin Controller

Controller code:

```text
apps/admin-moderation-service/src/app/admin.controller.ts:68
```

Endpoint map:

| Frontend Route | Controller Lines | AdminService Method |
| --- | --- | --- |
| `GET /api/admin/categories` | `70-72` | `getCategories()` |
| `GET /api/admin/categories/:id` | `75-77` | `getCategoryById(id)` |
| `POST /api/admin/categories` | `80-82` | `createCategory(data)` |
| `PUT /api/admin/categories/:id` | `85-87` | `updateCategory(id, data)` |
| `DELETE /api/admin/categories/:id` | `90-92` | `deleteCategory(id)` |
| `GET /api/admin/categories/:id/attributes` | `97-99` | `getCategoryAttributes(id)` |
| `POST /api/admin/categories/:id/attributes` | `102-104` | `createAttribute(id, data)` |
| `PUT /api/admin/attributes/:id` | `107-109` | `updateAttribute(id, data)` |
| `DELETE /api/admin/attributes/:id` | `112-114` | `deleteAttribute(id)` |
| `POST /api/admin/attributes/:id/options` | `117-119` | `createAttributeOption(id, data)` |
| `PUT /api/admin/attribute-options/:id` | `122-124` | `updateAttributeOption(id, data)` |
| `DELETE /api/admin/attribute-options/:id` | `127-129` | `deleteAttributeOption(id)` |

### Admin Service as Facade

Admin service category methods are in:

```text
apps/admin-moderation-service/src/app/admin.service.ts:204
```

The product service base URL is configured here:

```text
apps/admin-moderation-service/src/app/admin.service.ts:11
```

Default value:

```text
http://localhost:3001/api/products
```

The internal token is configured here:

```text
apps/admin-moderation-service/src/app/admin.service.ts:21
```

Default value:

```text
internal-dev-token
```

The `requestJson()` helper attaches `x-internal-token` to upstream calls:

```text
apps/admin-moderation-service/src/app/admin.service.ts:30
```

Example:

```ts
return this.requestJson<Array<any>>(`${this.productBaseUrl}/internal/admin/categories`);
```

That means:

```text
GET /api/admin/categories
  -> admin service
  -> GET /api/products/internal/admin/categories with x-internal-token
```

## API Gateway Layer

Gateway file:

```text
apps/api-gateway/src/main.ts
```

Admin upstream URL:

```text
apps/api-gateway/src/main.ts:12
```

Default:

```text
http://localhost:3005/api/admin
```

Gateway route:

```text
apps/api-gateway/src/main.ts:44
```

The gateway mounts:

```ts
app.use('/api/admin', createReverseProxy(adminServiceUrl));
```

Meaning:

```text
Browser request:
  /api/admin/categories

Gateway upstream:
  http://localhost:3005/api/admin/categories
```

The gateway also decodes JWT bearer tokens and attaches `x-user-id` and `x-role` headers:

```text
apps/api-gateway/src/main.ts:18
```

For this specific category management path, the more important protection between services is the internal token from admin service to product service.

## Frontend Layer

Main admin category page:

```text
apps/web/src/pages/admin/CategoryManagement.tsx
```

Route registration:

```text
apps/web/src/app/app.tsx:90
```

Route:

```tsx
<Route path="/admin/categories" element={<CategoryManagement />} />
```

Admin API base:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:4
```

Value:

```ts
const ADMIN_API_BASE_URL = '/api/admin';
```

### Frontend State

State is initialized in:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:89
```

Important state:

| State | Purpose |
| --- | --- |
| `categories` | Tree-ready category data |
| `selectedCategory` | Current category selected in the admin UI |
| `attributes` | Attributes for the selected category |
| `stats` | Dashboard stats, including category count |
| `expandedIds` | Expanded category tree nodes |
| `categoryForm` | Create/edit category form state |
| `attributeForm` | Create/edit attribute form state |
| `attributeOptions` | Editable option rows in the attribute dialog |
| `editingCategory` | Non-null when editing category |
| `editingAttribute` | Non-null when editing attribute |
| `parentSelectionPath` | Parent selection path for creating categories |

### Load Categories

Frontend function:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:143
```

It calls:

```ts
fetch(`${ADMIN_API_BASE_URL}/categories`)
fetch(`${ADMIN_API_BASE_URL}/dashboard`)
```

The category response is flat, so the frontend builds a tree.

Tree builder:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:166
```

Tree behavior:

- Creates a `Map` by category ID.
- Adds each category as a child under its `parent_id`.
- Categories without a parent become root nodes.

### Select Category and Load Attributes

Selection function:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:207
```

Attribute loader:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:186
```

It calls:

```ts
fetch(`${ADMIN_API_BASE_URL}/categories/${catId}/attributes`)
```

Full flow:

```text
User clicks category node
  -> handleSelectCategory(cat)
  -> loadAttributes(cat.id)
  -> GET /api/admin/categories/:id/attributes
  -> admin-moderation-service
  -> product-service internal admin endpoint
  -> product_db.attribute_definitions + attribute_options
```

### Render Category Tree

Render function:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:589
```

The root categories are rendered here:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:686
```

The function recursively renders children:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:622
```

### Open Create/Edit Category Dialog

Open create dialog:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:267
```

Open edit dialog:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:276
```

Category dialog form:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:848
```

### Submit Category Create/Edit

Submit function:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:352
```

Fetch call:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:376
```

Behavior:

- Validates category name locally.
- Determines create vs edit from `editingCategory`.
- Uses `POST /api/admin/categories` for create.
- Uses `PUT /api/admin/categories/:id` for edit.
- Sends JSON body with name, slug, parent ID, sort order, icon URL, active flag, and level.
- Refreshes categories after save with `fetchData()`.
- Sets saved category as selected.
- Reloads attributes for the saved category.

Create flow:

```text
CategoryManagement.handleCategorySubmit()
  -> POST /api/admin/categories
  -> API Gateway /api/admin
  -> AdminController.createCategory()
  -> AdminService.createCategory()
  -> POST product-service /internal/admin/categories
  -> ProductController.createCategory()
  -> ProductService.createCategory()
  -> Prisma category.create()
  -> product_db.categories
```

Update flow:

```text
CategoryManagement.handleCategorySubmit()
  -> PUT /api/admin/categories/:id
  -> API Gateway /api/admin
  -> AdminController.updateCategory()
  -> AdminService.updateCategory()
  -> PUT product-service /internal/admin/categories/:id
  -> ProductController.updateCategory()
  -> ProductService.updateCategory()
  -> Prisma category.update()
  -> product_db.categories
```

### Submit Attribute Create/Edit

Submit function:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:427
```

Main attribute fetch call:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:469
```

Option delete call:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:502
```

Option create/update call:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:516
```

Behavior:

- Requires a selected category.
- Validates attribute name.
- Normalizes `input_type`.
- Requires at least one option for option-based input types.
- Creates or updates the attribute definition first.
- Deletes removed options.
- Creates or updates current options.
- Reloads selected category attributes.
- Refreshes category stats.

Create attribute flow:

```text
CategoryManagement.handleAttributeSubmit()
  -> POST /api/admin/categories/:categoryId/attributes
  -> API Gateway /api/admin
  -> AdminController.createAttribute()
  -> AdminService.createAttribute()
  -> POST product-service /internal/admin/categories/:categoryId/attributes
  -> ProductController.createAttributeDefinition()
  -> ProductService.createAttributeDefinition()
  -> Prisma attributeDefinition.create()
  -> product_db.attribute_definitions
```

Create option flow:

```text
CategoryManagement.handleAttributeSubmit()
  -> POST /api/admin/attributes/:attributeId/options
  -> AdminController.createAttributeOption()
  -> AdminService.createAttributeOption()
  -> POST product-service /internal/admin/attributes/:attributeId/options
  -> ProductService.createAttributeOption()
  -> Prisma attributeOption.create()
  -> product_db.attribute_options
```

### Delete Attribute

Frontend function:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:564
```

Fetch call:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:572
```

Flow:

```text
CategoryManagement.handleDeleteAttribute()
  -> DELETE /api/admin/attributes/:id
  -> AdminController.deleteAttribute()
  -> AdminService.deleteAttribute()
  -> DELETE product-service /internal/admin/attributes/:id
  -> ProductService.deleteAttributeDefinition()
  -> Prisma attributeDefinition.delete()
  -> product_db.attribute_definitions
```

Because `AttributeOption` has `onDelete: Cascade` from `AttributeDefinition`, deleting an attribute should also delete its options at the database relation level.

## Public/Product Category Consumption

The admin screen manages categories, but product creation/editing consumes them through product-service public endpoints.

### Frontend API Base

Code location:

```text
apps/web/src/config/api.ts:6
```

Value:

```ts
export const PRODUCT_API_URL = `${API_BASE_URL}/products`;
```

### Category Selector

File:

```text
apps/web/src/components/products/CategorySelector.tsx
```

Fetch location:

```text
apps/web/src/components/products/CategorySelector.tsx:39
```

It calls:

```text
GET /api/products/categories/all
```

Backend:

```text
apps/product-service/src/app/product.controller.ts:348
apps/product-service/src/app/product.service.ts:1114
```

Important behavior:

- Returns active global categories only.
- Uses `where: { is_active: true, shop_id: null }`.
- Sorts by level, sort order, and name.

### Dynamic Product Attributes

File:

```text
apps/web/src/components/products/DynamicAttributes.tsx
```

Fetch location:

```text
apps/web/src/components/products/DynamicAttributes.tsx:36
```

It calls:

```text
GET /api/products/categories/:categoryId/attributes
```

Backend:

```text
apps/product-service/src/app/product.controller.ts:353
apps/product-service/src/app/product.service.ts:1121
```

Important behavior:

- Uses `getCategoryLineageIds(categoryId)` first.
- Loads attributes for the selected category and its parent categories.
- Sorts parent attributes before child attributes.

This is the implementation behind the UI tip that child categories inherit parent attributes.

### Product Attribute Values

When seller product forms submit selected attributes, `product-service` stores them in `product_attribute_values`.

Create product:

```text
apps/product-service/src/app/product.service.ts:227
```

Update product:

```text
apps/product-service/src/app/product.service.ts:353
```

Storage behavior:

- If the submitted value is numeric, it is stored as `attribute_option_id`.
- If the value is non-numeric, it is stored as `custom_value`.

## Function Ownership Map

| Function / Concern | Owner | File and Line |
| --- | --- | --- |
| Admin category page route | Frontend router | `apps/web/src/app/app.tsx:90` |
| Admin API base URL | Frontend page | `apps/web/src/pages/admin/CategoryManagement.tsx:4` |
| Load category data | Frontend page | `apps/web/src/pages/admin/CategoryManagement.tsx:143` |
| Build category tree | Frontend page | `apps/web/src/pages/admin/CategoryManagement.tsx:166` |
| Load selected category attributes | Frontend page | `apps/web/src/pages/admin/CategoryManagement.tsx:186` |
| Select category | Frontend page | `apps/web/src/pages/admin/CategoryManagement.tsx:207` |
| Open create category modal | Frontend page | `apps/web/src/pages/admin/CategoryManagement.tsx:267` |
| Open edit category modal | Frontend page | `apps/web/src/pages/admin/CategoryManagement.tsx:276` |
| Submit create/edit category | Frontend page | `apps/web/src/pages/admin/CategoryManagement.tsx:352` |
| Submit create/edit attribute | Frontend page | `apps/web/src/pages/admin/CategoryManagement.tsx:427` |
| Delete attribute | Frontend page | `apps/web/src/pages/admin/CategoryManagement.tsx:564` |
| Render category tree node | Frontend page | `apps/web/src/pages/admin/CategoryManagement.tsx:589` |
| Gateway admin proxy | API gateway | `apps/api-gateway/src/main.ts:44` |
| Admin controller category routes | Admin moderation service | `apps/admin-moderation-service/src/app/admin.controller.ts:68` |
| Admin service category facade | Admin moderation service | `apps/admin-moderation-service/src/app/admin.service.ts:204` |
| Product internal category controller | Product service | `apps/product-service/src/app/product.controller.ts:204` |
| Product internal attribute controller | Product service | `apps/product-service/src/app/product.controller.ts:247` |
| Product category business logic | Product service | `apps/product-service/src/app/product.service.ts:488` |
| Product attribute business logic | Product service | `apps/product-service/src/app/product.service.ts:667` |
| Category Prisma model | Database schema | `libs/prisma-clients/product-client/schema.prisma:73` |
| Attribute definition Prisma model | Database schema | `libs/prisma-clients/product-client/schema.prisma:127` |
| Attribute option Prisma model | Database schema | `libs/prisma-clients/product-client/schema.prisma:142` |
| Product attribute value Prisma model | Database schema | `libs/prisma-clients/product-client/schema.prisma:154` |

## Endpoint Flow Cheat Sheet

### Admin Categories

| Frontend Call | Gateway | Admin Service | Product Service | Database |
| --- | --- | --- | --- | --- |
| `GET /api/admin/categories` | `/api/admin` proxy | `GET /api/admin/categories` | `GET /api/products/internal/admin/categories` | `category.findMany()` |
| `POST /api/admin/categories` | `/api/admin` proxy | `POST /api/admin/categories` | `POST /api/products/internal/admin/categories` | `category.create()` |
| `PUT /api/admin/categories/:id` | `/api/admin` proxy | `PUT /api/admin/categories/:id` | `PUT /api/products/internal/admin/categories/:id` | `category.update()` |
| `DELETE /api/admin/categories/:id` | `/api/admin` proxy | `DELETE /api/admin/categories/:id` | `DELETE /api/products/internal/admin/categories/:id` | `category.delete()` |

### Admin Attributes

| Frontend Call | Gateway | Admin Service | Product Service | Database |
| --- | --- | --- | --- | --- |
| `GET /api/admin/categories/:id/attributes` | `/api/admin` proxy | `GET /api/admin/categories/:id/attributes` | `GET /api/products/internal/admin/categories/:id/attributes` | `attributeDefinition.findMany()` |
| `POST /api/admin/categories/:id/attributes` | `/api/admin` proxy | `POST /api/admin/categories/:id/attributes` | `POST /api/products/internal/admin/categories/:id/attributes` | `attributeDefinition.create()` |
| `PUT /api/admin/attributes/:id` | `/api/admin` proxy | `PUT /api/admin/attributes/:id` | `PUT /api/products/internal/admin/attributes/:id` | `attributeDefinition.update()` |
| `DELETE /api/admin/attributes/:id` | `/api/admin` proxy | `DELETE /api/admin/attributes/:id` | `DELETE /api/products/internal/admin/attributes/:id` | `attributeDefinition.delete()` |
| `POST /api/admin/attributes/:id/options` | `/api/admin` proxy | `POST /api/admin/attributes/:id/options` | `POST /api/products/internal/admin/attributes/:id/options` | `attributeOption.create()` |
| `PUT /api/admin/attribute-options/:id` | `/api/admin` proxy | `PUT /api/admin/attribute-options/:id` | `PUT /api/products/internal/admin/attribute-options/:id` | `attributeOption.update()` |
| `DELETE /api/admin/attribute-options/:id` | `/api/admin` proxy | `DELETE /api/admin/attribute-options/:id` | `DELETE /api/products/internal/admin/attribute-options/:id` | `attributeOption.delete()` |

## Data Shape Examples

### Category Object

The admin frontend expects:

```ts
interface Category {
  id: number;
  name: string;
  slug: string;
  parent_id: number | null;
  level: number;
  sort_order: number;
  is_active: boolean;
  icon_url: string | null;
  children?: Category[];
}
```

Defined in:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:6
```

### Attribute Object

The admin frontend expects:

```ts
interface Attribute {
  id: number;
  name: string;
  input_type: string;
  is_required: boolean;
  sort_order?: number;
  options?: { id: number; value_name: string; sort_order?: number }[];
}
```

Defined in:

```text
apps/web/src/pages/admin/CategoryManagement.tsx:18
```

## Observations and Gaps

1. Category ownership is split by service boundary.
   - `admin-moderation-service` exposes the public admin API.
   - `product-service` owns the actual category and attribute data.
   - This is reasonable, but debugging requires checking both services.

2. Admin category data comes from `product_db`, not `admin_mod_db`.
   - `admin_mod_db` is used for admin-owned data like banners.
   - Category records are product-domain data.

3. Admin category delete exists in backend but not in the current frontend page.
   - Backend route exists: `DELETE /api/admin/categories/:id`.
   - Product service safety checks exist.
   - The current `CategoryManagement.tsx` page only exposes delete for attributes.

4. Attribute inheritance is implemented for product forms, not for admin direct attribute display.
   - Admin selected category attributes use `getAdminCategoryAttributes()` and load only direct attributes.
   - Product forms use `getCategoryAttributes()` and load parent lineage attributes too.

5. Admin frontend routes are registered directly in `App.tsx`.
   - `/admin/categories` is not wrapped in a visible admin protected route in `apps/web/src/app/app.tsx`.
   - Gateway decodes JWT headers, but the visible admin category controller does not itself check admin role before proxying.

6. Product-service internal admin routes are protected by `x-internal-token`.
   - This protects direct service-to-service calls.
   - The admin service automatically adds the token when calling product-service.

7. Category tree is built on the frontend.
   - Product-service returns a flat list.
   - `CategoryManagement.tsx` builds parent/child relationships with `buildTree()`.

8. Category slug is unique at database level.
   - Creating two categories with the same slug can fail.
   - Product service auto-generates a slug from name if no slug is provided.

## Debugging Checklist

Use this path when category management breaks:

1. Frontend route exists:
   - `apps/web/src/app/app.tsx:90`

2. Frontend is calling the expected API:
   - `apps/web/src/pages/admin/CategoryManagement.tsx:143`
   - `apps/web/src/pages/admin/CategoryManagement.tsx:376`
   - `apps/web/src/pages/admin/CategoryManagement.tsx:469`

3. API gateway proxies `/api/admin`:
   - `apps/api-gateway/src/main.ts:44`

4. Admin moderation controller exposes the route:
   - `apps/admin-moderation-service/src/app/admin.controller.ts:68`

5. Admin service forwards to product-service:
   - `apps/admin-moderation-service/src/app/admin.service.ts:204`

6. Product controller has the matching internal route:
   - `apps/product-service/src/app/product.controller.ts:204`
   - `apps/product-service/src/app/product.controller.ts:247`

7. Product service performs the Prisma operation:
   - `apps/product-service/src/app/product.service.ts:488`
   - `apps/product-service/src/app/product.service.ts:667`

8. Prisma schema has the expected relation:
   - `libs/prisma-clients/product-client/schema.prisma:73`
   - `libs/prisma-clients/product-client/schema.prisma:127`
   - `libs/prisma-clients/product-client/schema.prisma:142`

9. Database has seed/migration data:
   - `db/seeds/product_db.sql:47`
   - `libs/prisma-clients/product-client/migrations/20260405_init_product_db/migration.sql:37`

