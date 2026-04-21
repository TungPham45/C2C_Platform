# Database Create Table Reference

Current DDL snapshot based on the Prisma schemas in this repository, with constraint naming aligned to the committed Prisma migration style where available.

Generated from:

- `libs/prisma-clients/auth-client/schema.prisma`
- `libs/prisma-clients/chat-client/schema.prisma`
- `libs/prisma-clients/order-client/schema.prisma`
- `libs/prisma-clients/product-client/schema.prisma`
- `libs/prisma-clients/admin-mod-client/schema.prisma`

## Auth Schema (`auth_db`)

```sql
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255),
    "phone" VARCHAR(20),
    "avatar_url" TEXT,
    "role" VARCHAR(50) DEFAULT 'user',
    "status" VARCHAR(50) DEFAULT 'active',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "verification_codes" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "purpose" VARCHAR(50) NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_codes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "addresses" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "address_line" TEXT NOT NULL,
    "city" VARCHAR(100),
    "district" VARCHAR(100),
    "ward" VARCHAR(100),
    "phone_contact" VARCHAR(20),
    "type" VARCHAR(50),
    "is_default" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "carts" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallets" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "balance" DECIMAL(12,2) DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "wallet_transactions" (
    "id" SERIAL NOT NULL,
    "wallet_id" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "transaction_type" VARCHAR(50),
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_transactions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE INDEX "idx_users_email" ON "users"("email");
CREATE INDEX "idx_verif_user_id" ON "verification_codes"("user_id");
CREATE UNIQUE INDEX "carts_user_id_key" ON "carts"("user_id");
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

ALTER TABLE "verification_codes"
ADD CONSTRAINT "verification_codes_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "addresses"
ADD CONSTRAINT "addresses_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "carts"
ADD CONSTRAINT "carts_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "wallets"
ADD CONSTRAINT "wallets_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "wallet_transactions"
ADD CONSTRAINT "wallet_transactions_wallet_id_fkey"
FOREIGN KEY ("wallet_id") REFERENCES "wallets"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
```

## Chat Schema (`chat_db`)

```sql
CREATE TABLE "conversations" (
    "id" SERIAL NOT NULL,
    "buyer_id" INTEGER NOT NULL,
    "seller_id" INTEGER NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "status" VARCHAR(50) DEFAULT 'active',
    "last_message_preview" TEXT,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "unread_count_buyer" INTEGER DEFAULT 0,
    "unread_count_seller" INTEGER DEFAULT 0,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "messages" (
    "id" SERIAL NOT NULL,
    "conversation_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "sender_role" VARCHAR(20) NOT NULL,
    "message_type" VARCHAR(30) DEFAULT 'text',
    "content" TEXT NOT NULL,
    "is_edited" BOOLEAN DEFAULT false,
    "updated_at" TIMESTAMP(6),
    "edit_history" JSONB DEFAULT '[]'::jsonb,
    "sent_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "is_read" BOOLEAN DEFAULT false,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_buyer_shop" ON "conversations"("buyer_id", "shop_id");
CREATE INDEX "idx_conversations_buyer_shop" ON "conversations"("buyer_id", "shop_id");
CREATE INDEX "idx_conversations_seller_id" ON "conversations"("seller_id");
CREATE INDEX "idx_conversations_updated_at" ON "conversations"("updated_at");
CREATE INDEX "idx_messages_conversation_id" ON "messages"("conversation_id");
CREATE INDEX "idx_messages_sender_id" ON "messages"("sender_id");
CREATE INDEX "idx_messages_sent_at" ON "messages"("sent_at");

ALTER TABLE "messages"
ADD CONSTRAINT "fk_messages_conversation"
FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
```

## Order Schema (`order_db`)

```sql
CREATE TABLE "vouchers" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER,
    "code" VARCHAR(50) NOT NULL,
    "discount_type" VARCHAR(50),
    "discount_value" DECIMAL(12,2) NOT NULL,
    "min_spend" DECIMAL(12,2) DEFAULT 0,
    "max_discount" DECIMAL(12,2),
    "start_date" TIMESTAMP(6),
    "end_date" TIMESTAMP(6),
    "usage_limit" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "cart_items" (
    "id" SERIAL NOT NULL,
    "cart_id" INTEGER NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "product_variant_id" INTEGER NOT NULL,
    "quantity" INTEGER DEFAULT 1,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "checkout_sessions" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "total_payment" DECIMAL(12,2) NOT NULL,
    "payment_method" VARCHAR(50),
    "payment_status" VARCHAR(50) DEFAULT 'unpaid',
    "platform_voucher_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkout_sessions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "shop_orders" (
    "id" SERIAL NOT NULL,
    "checkout_session_id" INTEGER NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "shipping_fee" DECIMAL(12,2) NOT NULL,
    "shop_voucher_id" INTEGER,
    "shipping_address" TEXT NOT NULL,
    "status" VARCHAR(50) DEFAULT 'pending',
    "tracking_number" VARCHAR(100),
    "carrier_name" VARCHAR(100),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_items" (
    "id" SERIAL NOT NULL,
    "shop_order_id" INTEGER NOT NULL,
    "product_variant_id" INTEGER NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "variant_details" JSONB,
    "quantity" INTEGER NOT NULL,
    "price_at_purchase" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vouchers_code_key" ON "vouchers"("code");
CREATE INDEX "idx_cart_items_cart_id" ON "cart_items"("cart_id");
CREATE UNIQUE INDEX "shop_orders_tracking_number_key" ON "shop_orders"("tracking_number");
CREATE INDEX "idx_shop_orders_checkout_session_id" ON "shop_orders"("checkout_session_id");

ALTER TABLE "checkout_sessions"
ADD CONSTRAINT "checkout_sessions_platform_voucher_id_fkey"
FOREIGN KEY ("platform_voucher_id") REFERENCES "vouchers"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "shop_orders"
ADD CONSTRAINT "shop_orders_checkout_session_id_fkey"
FOREIGN KEY ("checkout_session_id") REFERENCES "checkout_sessions"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "shop_orders"
ADD CONSTRAINT "shop_orders_shop_voucher_id_fkey"
FOREIGN KEY ("shop_voucher_id") REFERENCES "vouchers"("id")
ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "order_items"
ADD CONSTRAINT "order_items_shop_order_id_fkey"
FOREIGN KEY ("shop_order_id") REFERENCES "shop_orders"("id")
ON DELETE CASCADE ON UPDATE NO ACTION;
```

## Product Schema (`product_db`)

```sql
CREATE TABLE "shops" (
    "id" SERIAL NOT NULL,
    "owner_id" INTEGER,
    "name" VARCHAR(255),
    "slug" VARCHAR(255),
    "description" TEXT,
    "logo_url" TEXT,
    "rating" DECIMAL(3,2) DEFAULT 0,
    "status" VARCHAR(50) DEFAULT 'pending',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "shop_id" INTEGER NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255),
    "description" TEXT,
    "base_price" DECIMAL(12,2) NOT NULL,
    "thumbnail_url" TEXT,
    "rating" DECIMAL(3,2) DEFAULT 0,
    "sold_count" INTEGER DEFAULT 0,
    "status" VARCHAR(50) DEFAULT 'pending_approval',
    "moderation_note" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "categories" (
    "id" SERIAL NOT NULL,
    "parent_id" INTEGER,
    "shop_id" INTEGER,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(255),
    "icon_url" TEXT,
    "level" INTEGER DEFAULT 1,
    "sort_order" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_variants" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "sku" VARCHAR(100),
    "stock_quantity" INTEGER DEFAULT 0,
    "price_override" DECIMAL(12,2),
    "attributes" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_images" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "variant_id" INTEGER,
    "image_url" TEXT NOT NULL,
    "is_primary" BOOLEAN DEFAULT false,
    "sort_order" INTEGER DEFAULT 0,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attribute_definitions" (
    "id" SERIAL NOT NULL,
    "category_id" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "input_type" VARCHAR(50),
    "is_required" BOOLEAN DEFAULT false,
    "sort_order" INTEGER DEFAULT 0,

    CONSTRAINT "attribute_definitions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attribute_options" (
    "id" SERIAL NOT NULL,
    "attribute_id" INTEGER NOT NULL,
    "value_name" VARCHAR(255) NOT NULL,
    "sort_order" INTEGER DEFAULT 0,

    CONSTRAINT "attribute_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "product_attribute_values" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "attribute_id" INTEGER NOT NULL,
    "attribute_option_id" INTEGER,
    "custom_value" TEXT,

    CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reviews" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "shop_order_id" INTEGER NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "media_urls" JSONB,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shops_slug_key" ON "shops"("slug");
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");
CREATE UNIQUE INDEX "product_attribute_values_product_id_attribute_id_key" ON "product_attribute_values"("product_id", "attribute_id");

ALTER TABLE "products"
ADD CONSTRAINT "products_shop_id_fkey"
FOREIGN KEY ("shop_id") REFERENCES "shops"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "products"
ADD CONSTRAINT "products_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "categories"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "categories"
ADD CONSTRAINT "categories_parent_id_fkey"
FOREIGN KEY ("parent_id") REFERENCES "categories"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "categories"
ADD CONSTRAINT "categories_shop_id_fkey"
FOREIGN KEY ("shop_id") REFERENCES "shops"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_variants"
ADD CONSTRAINT "product_variants_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_images"
ADD CONSTRAINT "product_images_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_images"
ADD CONSTRAINT "product_images_variant_id_fkey"
FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attribute_definitions"
ADD CONSTRAINT "attribute_definitions_category_id_fkey"
FOREIGN KEY ("category_id") REFERENCES "categories"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "attribute_options"
ADD CONSTRAINT "attribute_options_attribute_id_fkey"
FOREIGN KEY ("attribute_id") REFERENCES "attribute_definitions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_attribute_values"
ADD CONSTRAINT "product_attribute_values_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_attribute_values"
ADD CONSTRAINT "product_attribute_values_attribute_id_fkey"
FOREIGN KEY ("attribute_id") REFERENCES "attribute_definitions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "product_attribute_values"
ADD CONSTRAINT "product_attribute_values_attribute_option_id_fkey"
FOREIGN KEY ("attribute_option_id") REFERENCES "attribute_options"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reviews"
ADD CONSTRAINT "reviews_product_id_fkey"
FOREIGN KEY ("product_id") REFERENCES "products"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
```

## Admin Moderation Schema (`admin_mod_db`)

```sql
CREATE TABLE "report_reasons" (
    "id" SERIAL NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "category" VARCHAR(50) NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_reasons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "reports" (
    "id" SERIAL NOT NULL,
    "reporter_id" INTEGER NOT NULL,
    "target_type" VARCHAR(50) NOT NULL,
    "product_id" INTEGER,
    "shop_id" INTEGER,
    "shop_order_id" INTEGER,
    "report_reason_id" INTEGER NOT NULL,
    "custom_reason" TEXT,
    "title" VARCHAR(255),
    "description" TEXT NOT NULL,
    "evidence_urls" JSONB,
    "severity" VARCHAR(50) DEFAULT 'medium',
    "status" VARCHAR(50) DEFAULT 'pending',
    "admin_id" INTEGER,
    "admin_note" TEXT,
    "resolution" VARCHAR(100),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(6),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "banners" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "image_url" TEXT NOT NULL,
    "target_url" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "banners_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "report_reasons_code_key" ON "report_reasons"("code");

ALTER TABLE "reports"
ADD CONSTRAINT "reports_report_reason_id_fkey"
FOREIGN KEY ("report_reason_id") REFERENCES "report_reasons"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
```

## Notes

- `banners` exists in `libs/prisma-clients/admin-mod-client/schema.prisma` but there is no matching committed migration SQL in the repo at the time of this snapshot.
- Some committed migrations and Prisma schema files differ in a few places. This document follows the current Prisma schema model shape so you have one current-state reference file.
