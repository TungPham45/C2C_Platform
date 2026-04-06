-- Demo product data for local development.
-- owner_id=1 is expected to match seller@example.com in auth_db.

INSERT INTO shops (owner_id, name, slug, description, status, rating)
VALUES (
  1,
  'Demo Seller Shop',
  'demo-seller-shop',
  'Seeded shop for local microservice demo.',
  'active',
  4.80
)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO categories (name, slug, level, sort_order, is_active)
VALUES
  ('Fashion', 'fashion', 1, 1, true),
  ('Electronics', 'electronics', 1, 2, true),
  ('Home and Living', 'home-and-living', 1, 3, true)
ON CONFLICT (slug) DO NOTHING;

INSERT INTO products (shop_id, category_id, name, slug, description, base_price, thumbnail_url, status)
SELECT s.id,
       c.id,
       'Classic T-Shirt',
       'classic-t-shirt',
       'Seeded demo product.',
       19.99,
       'https://via.placeholder.com/600x600.png?text=Classic+T-Shirt',
       'active'
FROM shops s
JOIN categories c ON c.slug = 'fashion'
WHERE s.slug = 'demo-seller-shop'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO product_variants (product_id, sku, stock_quantity, price_override, attributes)
SELECT p.id,
       'TSHIRT-CLASSIC-STD',
       120,
       19.99,
       '{"size": "M", "color": "Black"}'::jsonb
FROM products p
WHERE p.slug = 'classic-t-shirt'
ON CONFLICT (sku) DO NOTHING;

INSERT INTO product_images (product_id, image_url, is_primary, sort_order)
SELECT p.id,
       'https://via.placeholder.com/600x600.png?text=Classic+T-Shirt',
       true,
       0
FROM products p
WHERE p.slug = 'classic-t-shirt'
AND NOT EXISTS (
  SELECT 1
  FROM product_images i
  WHERE i.product_id = p.id
    AND i.is_primary = true
);
