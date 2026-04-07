-- Rich product seed data for local development.
-- Expected auth users on a fresh bootstrap:
--   buyer@gmail.com     -> user id 1
--   seller1@gmail.com   -> user id 2
--   admin@gmail.com     -> user id 3
--   seller2@gmail.com   -> user id 4

INSERT INTO shops (owner_id, name, slug, description, logo_url, status, rating)
VALUES
  (
    2,
    'Cua Hang Thoi Trang B',
    'thoi-trang-b',
    'Chuyen ao thun, hoodie va do mac hang ngay.',
    'https://via.placeholder.com/256x256.png?text=Thoi+Trang+B',
    'active',
    4.80
  ),
  (
    4,
    'Shop Giay Sneaker Pro',
    'giay-sneaker-pro',
    'Chuyen giay sneaker va phu kien the thao chinh hang.',
    'https://via.placeholder.com/256x256.png?text=Sneaker+Pro',
    'active',
    4.70
  ),
  (
    NULL,
    'Phu Kien Moi',
    'phu-kien-moi',
    'Shop moi tao dang cho duyet ho so va san pham.',
    'https://via.placeholder.com/256x256.png?text=Phu+Kien+Moi',
    'pending',
    0.00
  )
ON CONFLICT (slug) DO UPDATE
SET
  owner_id = EXCLUDED.owner_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  logo_url = EXCLUDED.logo_url,
  status = EXCLUDED.status,
  rating = EXCLUDED.rating,
  updated_at = NOW();

INSERT INTO categories (name, slug, level, sort_order, is_active)
VALUES
  ('Thoi Trang Nam', 'thoi-trang-nam', 1, 1, true),
  ('Sac Dep', 'sac-dep', 1, 2, true),
  ('Suc Khoe', 'suc-khoe', 1, 3, true),
  ('Phu Kien Thoi Trang', 'phu-kien-thoi-trang', 1, 4, true),
  ('Thiet Bi Dien Gia Dung', 'thiet-bi-dien-gia-dung', 1, 5, true),
  ('Giay Dep Nam', 'giay-dep-nam', 1, 6, true),
  ('Dien Thoai Phu Kien', 'dien-thoai-phu-kien', 1, 7, true),
  ('Tui Vi Nu', 'tui-vi-nu', 1, 8, true)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  level = EXCLUDED.level,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO categories (parent_id, name, slug, level, sort_order, is_active)
SELECT parent.id, child.name, child.slug, child.level, child.sort_order, child.is_active
FROM (
  VALUES
    ('thoi-trang-nam', 'Quan jean', 'quan-jean', 2, 1, true),
    ('thoi-trang-nam', 'Hoodie & Ao ni', 'hoodie-ao-ni', 2, 2, true),
    ('thoi-trang-nam', 'Ao khoac', 'ao-khoac', 2, 3, true),
    ('thoi-trang-nam', 'Ao', 'ao-nam', 2, 4, true),
    ('thoi-trang-nam', 'Do lot', 'do-lot-nam', 2, 5, true),
    ('giay-dep-nam', 'Giay the thao', 'giay-the-thao-nam', 2, 1, true)
) AS child(parent_slug, name, slug, level, sort_order, is_active)
JOIN categories parent ON parent.slug = child.parent_slug
ON CONFLICT (slug) DO UPDATE
SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  level = EXCLUDED.level,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

INSERT INTO categories (parent_id, name, slug, level, sort_order, is_active)
SELECT parent.id, child.name, child.slug, child.level, child.sort_order, child.is_active
FROM (
  VALUES
    ('hoodie-ao-ni', 'Ao hoodie', 'ao-hoodie', 3, 1, true),
    ('hoodie-ao-ni', 'Ao ni', 'ao-ni', 3, 2, true),
    ('ao-khoac', 'Ao khoac mua dong', 'ao-khoac-mua-dong', 3, 1, true),
    ('ao-nam', 'Ao so mi', 'ao-so-mi', 3, 1, true),
    ('ao-nam', 'Ao thun', 'ao-thun', 3, 2, true),
    ('do-lot-nam', 'Quan lot', 'quan-lot', 3, 1, true),
    ('do-lot-nam', 'Ao lot', 'ao-lot', 3, 2, true),
    ('giay-the-thao-nam', 'Sneaker', 'sneaker-nam', 3, 1, true)
) AS child(parent_slug, name, slug, level, sort_order, is_active)
JOIN categories parent ON parent.slug = child.parent_slug
ON CONFLICT (slug) DO UPDATE
SET
  parent_id = EXCLUDED.parent_id,
  name = EXCLUDED.name,
  level = EXCLUDED.level,
  sort_order = EXCLUDED.sort_order,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

WITH definition_rows(category_slug, name, input_type, is_required, sort_order) AS (
  VALUES
    ('ao-thun', 'Thuong hieu', 'dropdown', true, 1),
    ('ao-thun', 'Xuat xu', 'dropdown', true, 2),
    ('ao-thun', 'Chat lieu', 'dropdown', true, 3),
    ('ao-thun', 'Phong cach', 'dropdown', false, 4),
    ('ao-hoodie', 'Thuong hieu', 'dropdown', true, 1),
    ('ao-hoodie', 'Xuat xu', 'dropdown', true, 2),
    ('ao-hoodie', 'Chat lieu', 'dropdown', true, 3),
    ('ao-so-mi', 'Thuong hieu', 'dropdown', true, 1),
    ('ao-so-mi', 'Xuat xu', 'dropdown', true, 2),
    ('ao-so-mi', 'Chat lieu', 'dropdown', true, 3),
    ('ao-so-mi', 'Co ao', 'dropdown', false, 4),
    ('ao-so-mi', 'Tay ao', 'dropdown', false, 5),
    ('quan-lot', 'Thuong hieu', 'dropdown', true, 1),
    ('quan-lot', 'Xuat xu', 'dropdown', true, 2),
    ('quan-lot', 'Chat lieu', 'dropdown', true, 3),
    ('quan-lot', 'Kieu quan lot', 'dropdown', true, 4),
    ('sneaker-nam', 'Thuong hieu', 'dropdown', true, 1),
    ('sneaker-nam', 'Xuat xu', 'dropdown', true, 2),
    ('sneaker-nam', 'Chat lieu be mat', 'dropdown', true, 3),
    ('sneaker-nam', 'Phong cach', 'dropdown', false, 4)
)
INSERT INTO attribute_definitions (category_id, name, input_type, is_required, sort_order)
SELECT c.id, d.name, d.input_type, d.is_required, d.sort_order
FROM definition_rows d
JOIN categories c ON c.slug = d.category_slug
LEFT JOIN attribute_definitions existing
  ON existing.category_id = c.id
 AND existing.name = d.name
WHERE existing.id IS NULL;

WITH option_rows(category_slug, attribute_name, value_name, sort_order) AS (
  VALUES
    ('ao-thun', 'Thuong hieu', 'No brand', 1),
    ('ao-thun', 'Thuong hieu', 'ADAM STORE', 2),
    ('ao-thun', 'Thuong hieu', 'ADDICTED', 3),
    ('ao-thun', 'Xuat xu', 'Viet Nam', 1),
    ('ao-thun', 'Xuat xu', 'Trung Quoc', 2),
    ('ao-thun', 'Xuat xu', 'Han Quoc', 3),
    ('ao-thun', 'Chat lieu', 'Cotton', 1),
    ('ao-thun', 'Chat lieu', 'Polyester', 2),
    ('ao-thun', 'Chat lieu', 'Linen', 3),
    ('ao-thun', 'Phong cach', 'Basic', 1),
    ('ao-thun', 'Phong cach', 'Casual', 2),
    ('ao-thun', 'Phong cach', 'Streetwear', 3),
    ('ao-hoodie', 'Thuong hieu', 'No brand', 1),
    ('ao-hoodie', 'Thuong hieu', 'ADAM STORE', 2),
    ('ao-hoodie', 'Thuong hieu', 'Urban Pulse', 3),
    ('ao-hoodie', 'Xuat xu', 'Viet Nam', 1),
    ('ao-hoodie', 'Xuat xu', 'Trung Quoc', 2),
    ('ao-hoodie', 'Xuat xu', 'Thai Lan', 3),
    ('ao-hoodie', 'Chat lieu', 'Nylon', 1),
    ('ao-hoodie', 'Chat lieu', 'Ni', 2),
    ('ao-hoodie', 'Chat lieu', 'Cotton', 3),
    ('ao-so-mi', 'Thuong hieu', 'No brand', 1),
    ('ao-so-mi', 'Thuong hieu', 'ADDICTED', 2),
    ('ao-so-mi', 'Thuong hieu', 'Office Daily', 3),
    ('ao-so-mi', 'Xuat xu', 'Viet Nam', 1),
    ('ao-so-mi', 'Xuat xu', 'Trung Quoc', 2),
    ('ao-so-mi', 'Xuat xu', 'Indonesia', 3),
    ('ao-so-mi', 'Chat lieu', 'Cotton', 1),
    ('ao-so-mi', 'Chat lieu', 'Linen', 2),
    ('ao-so-mi', 'Chat lieu', 'Kate', 3),
    ('ao-so-mi', 'Co ao', 'Co be', 1),
    ('ao-so-mi', 'Co ao', 'Co tru', 2),
    ('ao-so-mi', 'Co ao', 'Co V', 3),
    ('ao-so-mi', 'Tay ao', 'Ngan tay', 1),
    ('ao-so-mi', 'Tay ao', 'Dai tay', 2),
    ('quan-lot', 'Thuong hieu', 'No brand', 1),
    ('quan-lot', 'Thuong hieu', 'Comfort Fit', 2),
    ('quan-lot', 'Thuong hieu', 'ADDICTED', 3),
    ('quan-lot', 'Xuat xu', 'Viet Nam', 1),
    ('quan-lot', 'Xuat xu', 'Trung Quoc', 2),
    ('quan-lot', 'Chat lieu', 'Cotton', 1),
    ('quan-lot', 'Chat lieu', 'Modal', 2),
    ('quan-lot', 'Kieu quan lot', 'Boxer', 1),
    ('quan-lot', 'Kieu quan lot', 'Brief', 2),
    ('sneaker-nam', 'Thuong hieu', 'RunnerX', 1),
    ('sneaker-nam', 'Thuong hieu', 'Street Run', 2),
    ('sneaker-nam', 'Thuong hieu', 'No brand', 3),
    ('sneaker-nam', 'Xuat xu', 'Viet Nam', 1),
    ('sneaker-nam', 'Xuat xu', 'Trung Quoc', 2),
    ('sneaker-nam', 'Xuat xu', 'Han Quoc', 3),
    ('sneaker-nam', 'Chat lieu be mat', 'Da tong hop', 1),
    ('sneaker-nam', 'Chat lieu be mat', 'Mesh', 2),
    ('sneaker-nam', 'Chat lieu be mat', 'Canvas', 3),
    ('sneaker-nam', 'Phong cach', 'The thao', 1),
    ('sneaker-nam', 'Phong cach', 'Streetwear', 2)
)
INSERT INTO attribute_options (attribute_id, value_name, sort_order)
SELECT ad.id, o.value_name, o.sort_order
FROM option_rows o
JOIN categories c ON c.slug = o.category_slug
JOIN attribute_definitions ad
  ON ad.category_id = c.id
 AND ad.name = o.attribute_name
LEFT JOIN attribute_options existing
  ON existing.attribute_id = ad.id
 AND existing.value_name = o.value_name
WHERE existing.id IS NULL;

WITH product_rows(shop_slug, category_slug, name, slug, description, base_price, thumbnail_url, rating, sold_count, status) AS (
  VALUES
    (
      'thoi-trang-b',
      'ao-thun',
      'Classic T-Shirt',
      'classic-t-shirt',
      'Ao thun cotton mac hang ngay, form regular va de phoi do.',
      199000.00,
      'https://via.placeholder.com/600x600.png?text=Classic+T-Shirt',
      4.70,
      18,
      'active'
    ),
    (
      'thoi-trang-b',
      'ao-hoodie',
      'Premium Hoodie',
      'premium-hoodie',
      'Hoodie ni day dan, phu hop di hoc va di choi.',
      359000.00,
      'https://via.placeholder.com/600x600.png?text=Premium+Hoodie',
      4.90,
      9,
      'active'
    ),
    (
      'thoi-trang-b',
      'ao-so-mi',
      'Linen Overshirt',
      'linen-overshirt',
      'Ao so mi chat lieu linen mong nhe, dang duyet noi dung mo ta.',
      289000.00,
      'https://via.placeholder.com/600x600.png?text=Linen+Overshirt',
      0.00,
      0,
      'draft'
    ),
    (
      'thoi-trang-b',
      'quan-lot',
      'Boxer Essentials 3-Pack',
      'boxer-essentials-3-pack',
      'Bo 3 quan lot cotton mem, thich hop mac hang ngay.',
      149000.00,
      'https://via.placeholder.com/600x600.png?text=Boxer+Pack',
      4.60,
      22,
      'active'
    ),
    (
      'giay-sneaker-pro',
      'sneaker-nam',
      'Sneaker Runner Pro',
      'sneaker-runner-pro',
      'Mau sneaker de em, upper mesh thoang khi cho nhu cau di bo va di hoc.',
      890000.00,
      'https://via.placeholder.com/600x600.png?text=Sneaker+Runner+Pro',
      4.85,
      14,
      'active'
    )
)
INSERT INTO products (
  shop_id,
  category_id,
  name,
  slug,
  description,
  base_price,
  thumbnail_url,
  rating,
  sold_count,
  status
)
SELECT s.id,
       c.id,
       p.name,
       p.slug,
       p.description,
       p.base_price,
       p.thumbnail_url,
       p.rating,
       p.sold_count,
       p.status
FROM product_rows p
JOIN shops s ON s.slug = p.shop_slug
JOIN categories c ON c.slug = p.category_slug
ON CONFLICT (slug) DO UPDATE
SET
  shop_id = EXCLUDED.shop_id,
  category_id = EXCLUDED.category_id,
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  base_price = EXCLUDED.base_price,
  thumbnail_url = EXCLUDED.thumbnail_url,
  rating = EXCLUDED.rating,
  sold_count = EXCLUDED.sold_count,
  status = EXCLUDED.status,
  updated_at = NOW();

WITH variant_rows(product_slug, sku, stock_quantity, price_override, attributes) AS (
  VALUES
    ('classic-t-shirt', 'TSHIRT-CLASSIC-BLACK-M', 80, 199000.00, '{"color":"Black","size":"M"}'::jsonb),
    ('classic-t-shirt', 'TSHIRT-CLASSIC-BLACK-L', 60, 199000.00, '{"color":"Black","size":"L"}'::jsonb),
    ('classic-t-shirt', 'TSHIRT-CLASSIC-WHITE-XL', 40, 209000.00, '{"color":"White","size":"XL"}'::jsonb),
    ('premium-hoodie', 'HOODIE-PREMIUM-BLACK-L', 25, 359000.00, '{"color":"Black","size":"L"}'::jsonb),
    ('premium-hoodie', 'HOODIE-PREMIUM-BLACK-XL', 20, 359000.00, '{"color":"Black","size":"XL"}'::jsonb),
    ('premium-hoodie', 'HOODIE-PREMIUM-CREAM-L', 18, 369000.00, '{"color":"Cream","size":"L"}'::jsonb),
    ('linen-overshirt', 'LINEN-OVERSHIRT-BEIGE-M', 12, 289000.00, '{"color":"Beige","size":"M"}'::jsonb),
    ('linen-overshirt', 'LINEN-OVERSHIRT-BEIGE-L', 8, 289000.00, '{"color":"Beige","size":"L"}'::jsonb),
    ('boxer-essentials-3-pack', 'BOXER-ESSENTIALS-MIXED-M', 50, 149000.00, '{"color":"Mixed","size":"M"}'::jsonb),
    ('boxer-essentials-3-pack', 'BOXER-ESSENTIALS-MIXED-L', 45, 149000.00, '{"color":"Mixed","size":"L"}'::jsonb),
    ('sneaker-runner-pro', 'SNEAKER-RUNNER-BLACK-40', 14, 890000.00, '{"color":"Black","size":"40"}'::jsonb),
    ('sneaker-runner-pro', 'SNEAKER-RUNNER-BLACK-41', 11, 890000.00, '{"color":"Black","size":"41"}'::jsonb),
    ('sneaker-runner-pro', 'SNEAKER-RUNNER-WHITE-42', 9, 920000.00, '{"color":"White","size":"42"}'::jsonb)
)
INSERT INTO product_variants (product_id, sku, stock_quantity, price_override, attributes)
SELECT p.id,
       v.sku,
       v.stock_quantity,
       v.price_override,
       v.attributes
FROM variant_rows v
JOIN products p ON p.slug = v.product_slug
ON CONFLICT (sku) DO UPDATE
SET
  product_id = EXCLUDED.product_id,
  stock_quantity = EXCLUDED.stock_quantity,
  price_override = EXCLUDED.price_override,
  attributes = EXCLUDED.attributes,
  updated_at = NOW();

WITH image_rows(product_slug, image_url, is_primary, sort_order) AS (
  VALUES
    ('classic-t-shirt', 'https://via.placeholder.com/600x600.png?text=Classic+T-Shirt+Front', true, 0),
    ('classic-t-shirt', 'https://via.placeholder.com/600x600.png?text=Classic+T-Shirt+Back', false, 1),
    ('premium-hoodie', 'https://via.placeholder.com/600x600.png?text=Premium+Hoodie+Front', true, 0),
    ('premium-hoodie', 'https://via.placeholder.com/600x600.png?text=Premium+Hoodie+Detail', false, 1),
    ('linen-overshirt', 'https://via.placeholder.com/600x600.png?text=Linen+Overshirt', true, 0),
    ('boxer-essentials-3-pack', 'https://via.placeholder.com/600x600.png?text=Boxer+Pack', true, 0),
    ('sneaker-runner-pro', 'https://via.placeholder.com/600x600.png?text=Sneaker+Runner+Front', true, 0),
    ('sneaker-runner-pro', 'https://via.placeholder.com/600x600.png?text=Sneaker+Runner+Side', false, 1)
)
INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
SELECT p.id,
       i.image_url,
       i.is_primary,
       i.sort_order
FROM image_rows i
JOIN products p ON p.slug = i.product_slug
LEFT JOIN product_images existing
  ON existing.product_id = p.id
 AND existing.image_url = i.image_url
WHERE existing.id IS NULL;

WITH attribute_value_rows(product_slug, attribute_name, option_value, custom_value) AS (
  VALUES
    ('classic-t-shirt', 'Thuong hieu', 'ADAM STORE', NULL),
    ('classic-t-shirt', 'Xuat xu', 'Viet Nam', NULL),
    ('classic-t-shirt', 'Chat lieu', 'Cotton', NULL),
    ('classic-t-shirt', 'Phong cach', 'Basic', NULL),
    ('premium-hoodie', 'Thuong hieu', 'Urban Pulse', NULL),
    ('premium-hoodie', 'Xuat xu', 'Thai Lan', NULL),
    ('premium-hoodie', 'Chat lieu', 'Ni', NULL),
    ('linen-overshirt', 'Thuong hieu', 'Office Daily', NULL),
    ('linen-overshirt', 'Xuat xu', 'Viet Nam', NULL),
    ('linen-overshirt', 'Chat lieu', 'Linen', NULL),
    ('linen-overshirt', 'Co ao', 'Co be', NULL),
    ('linen-overshirt', 'Tay ao', 'Dai tay', NULL),
    ('boxer-essentials-3-pack', 'Thuong hieu', 'Comfort Fit', NULL),
    ('boxer-essentials-3-pack', 'Xuat xu', 'Viet Nam', NULL),
    ('boxer-essentials-3-pack', 'Chat lieu', 'Cotton', NULL),
    ('boxer-essentials-3-pack', 'Kieu quan lot', 'Boxer', NULL),
    ('sneaker-runner-pro', 'Thuong hieu', 'RunnerX', NULL),
    ('sneaker-runner-pro', 'Xuat xu', 'Han Quoc', NULL),
    ('sneaker-runner-pro', 'Chat lieu be mat', 'Mesh', NULL),
    ('sneaker-runner-pro', 'Phong cach', 'The thao', NULL)
)
INSERT INTO product_attribute_values (product_id, attribute_id, attribute_option_id, custom_value)
SELECT p.id,
       ad.id,
       ao.id,
       avr.custom_value
FROM attribute_value_rows avr
JOIN products p ON p.slug = avr.product_slug
JOIN attribute_definitions ad
  ON ad.category_id = p.category_id
 AND ad.name = avr.attribute_name
LEFT JOIN attribute_options ao
  ON ao.attribute_id = ad.id
 AND ao.value_name = avr.option_value
LEFT JOIN product_attribute_values existing
  ON existing.product_id = p.id
 AND existing.attribute_id = ad.id
WHERE existing.id IS NULL;

WITH review_rows(user_id, product_slug, shop_order_id, rating, comment, media_urls) AS (
  VALUES
    (1, 'classic-t-shirt', 9001, 5, 'Chat vai mem va form mac de chiu.', '[]'::jsonb),
    (1, 'premium-hoodie', 9002, 4, 'Mau dep, vai day, nhung ship cham hon du kien mot chut.', '["https://example.com/reviews/hoodie-1.jpg"]'::jsonb),
    (1, 'sneaker-runner-pro', 9003, 5, 'De em, di bo rat thoai mai.', '[]'::jsonb)
)
INSERT INTO reviews (user_id, product_id, shop_order_id, rating, comment, media_urls)
SELECT r.user_id,
       p.id,
       r.shop_order_id,
       r.rating,
       r.comment,
       r.media_urls
FROM review_rows r
JOIN products p ON p.slug = r.product_slug
LEFT JOIN reviews existing
  ON existing.user_id = r.user_id
 AND existing.product_id = p.id
 AND existing.comment = r.comment
WHERE existing.id IS NULL;
