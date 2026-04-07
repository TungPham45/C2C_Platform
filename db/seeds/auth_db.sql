-- Rich auth seed data for local development.
-- Accounts:
--   buyer@gmail.com    / 123456
--   seller1@gmail.com  / 123456
--   admin@gmail.com    / 123456
--   seller2@gmail.com  / 123456

INSERT INTO users (email, password, full_name, phone, avatar_url, role, status)
VALUES
  (
    'buyer@gmail.com',
    '$2b$10$i33ETKJpBF9NzN8s.JvBf.4Rnwg7h3U3ED71pXqMxio6AeVvyeLs6',
    'Nguyen Van A',
    '0901000001',
    'https://example.com/avatars/buyer-a.jpg',
    'user',
    'active'
  ),
  (
    'seller1@gmail.com',
    '$2b$10$i33ETKJpBF9NzN8s.JvBf.4Rnwg7h3U3ED71pXqMxio6AeVvyeLs6',
    'Tran Thi B',
    '0901000002',
    'https://example.com/avatars/seller-b.jpg',
    'user',
    'active'
  ),
  (
    'admin@gmail.com',
    '$2b$10$i33ETKJpBF9NzN8s.JvBf.4Rnwg7h3U3ED71pXqMxio6AeVvyeLs6',
    'Quan Tri Vien',
    '0901000003',
    'https://example.com/avatars/admin-main.jpg',
    'admin',
    'active'
  ),
  (
    'seller2@gmail.com',
    '$2b$10$i33ETKJpBF9NzN8s.JvBf.4Rnwg7h3U3ED71pXqMxio6AeVvyeLs6',
    'Le Van C',
    '0901000004',
    'https://example.com/avatars/seller-c.jpg',
    'user',
    'active'
  )
ON CONFLICT (email) DO UPDATE
SET
  password = EXCLUDED.password,
  full_name = EXCLUDED.full_name,
  phone = EXCLUDED.phone,
  avatar_url = EXCLUDED.avatar_url,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

INSERT INTO addresses (user_id, address_line, city, district, ward, phone_contact, type, is_default)
SELECT u.id,
       '12 Nguyen Trai',
       'Ha Noi',
       'Thanh Xuan',
       'Khuong Mai',
       '0901000001',
       'home',
       true
FROM users u
WHERE u.email = 'buyer@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM addresses a
    WHERE a.user_id = u.id
      AND a.type = 'home'
      AND a.address_line = '12 Nguyen Trai'
  );

INSERT INTO addresses (user_id, address_line, city, district, ward, phone_contact, type, is_default)
SELECT u.id,
       '245 Cach Mang Thang 8',
       'Ho Chi Minh City',
       'District 3',
       'Ward 10',
       '0901000002',
       'shop_pickup',
       true
FROM users u
WHERE u.email = 'seller1@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM addresses a
    WHERE a.user_id = u.id
      AND a.type = 'shop_pickup'
      AND a.address_line = '245 Cach Mang Thang 8'
  );

INSERT INTO addresses (user_id, address_line, city, district, ward, phone_contact, type, is_default)
SELECT u.id,
       '31 Vo Nguyen Giap',
       'Da Nang',
       'Son Tra',
       'Phuoc My',
       '0901000004',
       'office',
       true
FROM users u
WHERE u.email = 'seller2@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM addresses a
    WHERE a.user_id = u.id
      AND a.type = 'office'
      AND a.address_line = '31 Vo Nguyen Giap'
  );

INSERT INTO wallets (user_id, balance)
SELECT u.id, 1250000.00
FROM users u
WHERE u.email = 'seller1@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET
  balance = EXCLUDED.balance,
  updated_at = NOW();

INSERT INTO wallets (user_id, balance)
SELECT u.id, 300000.00
FROM users u
WHERE u.email = 'admin@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET
  balance = EXCLUDED.balance,
  updated_at = NOW();

INSERT INTO wallets (user_id, balance)
SELECT u.id, 850000.00
FROM users u
WHERE u.email = 'buyer@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET
  balance = EXCLUDED.balance,
  updated_at = NOW();

INSERT INTO wallets (user_id, balance)
SELECT u.id, 650000.00
FROM users u
WHERE u.email = 'seller2@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET
  balance = EXCLUDED.balance,
  updated_at = NOW();

INSERT INTO wallet_transactions (wallet_id, amount, type, reason, reference_id)
SELECT w.id, 1250000.00, 'credit', 'Seed seller balance', 1001
FROM wallets w
JOIN users u ON u.id = w.user_id
WHERE u.email = 'seller1@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM wallet_transactions wt
    WHERE wt.wallet_id = w.id
      AND wt.amount = 1250000.00
      AND wt.type = 'credit'
      AND wt.reason = 'Seed seller balance'
  );

INSERT INTO wallet_transactions (wallet_id, amount, type, reason, reference_id)
SELECT w.id, 850000.00, 'credit', 'Initial top-up', 1002
FROM wallets w
JOIN users u ON u.id = w.user_id
WHERE u.email = 'buyer@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM wallet_transactions wt
    WHERE wt.wallet_id = w.id
      AND wt.amount = 850000.00
      AND wt.type = 'credit'
      AND wt.reason = 'Initial top-up'
  );

INSERT INTO wallet_transactions (wallet_id, amount, type, reason, reference_id)
SELECT w.id, 650000.00, 'credit', 'Seed seller balance', 1003
FROM wallets w
JOIN users u ON u.id = w.user_id
WHERE u.email = 'seller2@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM wallet_transactions wt
    WHERE wt.wallet_id = w.id
      AND wt.amount = 650000.00
      AND wt.type = 'credit'
      AND wt.reason = 'Seed seller balance'
  );

INSERT INTO wallet_transactions (wallet_id, amount, type, reason, reference_id)
SELECT w.id, -199000.00, 'debit', 'Sample checkout hold', 2001
FROM wallets w
JOIN users u ON u.id = w.user_id
WHERE u.email = 'buyer@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM wallet_transactions wt
    WHERE wt.wallet_id = w.id
      AND wt.amount = -199000.00
      AND wt.type = 'debit'
      AND wt.reason = 'Sample checkout hold'
  );

INSERT INTO carts (user_id)
SELECT u.id
FROM users u
WHERE u.email = 'buyer@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET updated_at = NOW();
