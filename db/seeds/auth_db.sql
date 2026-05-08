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
    'Nguyễn Văn A',
    '0901000001',
    'https://example.com/avatars/buyer-a.jpg',
    'user',
    'active'
  ),
  (
    'seller1@gmail.com',
    '$2b$10$i33ETKJpBF9NzN8s.JvBf.4Rnwg7h3U3ED71pXqMxio6AeVvyeLs6',
    'Trần Thị B',
    '0901000002',
    'https://example.com/avatars/seller-b.jpg',
    'user',
    'active'
  ),
  (
    'admin@gmail.com',
    '$2b$10$i33ETKJpBF9NzN8s.JvBf.4Rnwg7h3U3ED71pXqMxio6AeVvyeLs6',
    'Quản Trị Viên',
    '0901000003',
    'https://example.com/avatars/admin-main.jpg',
    'admin',
    'active'
  ),
  (
    'seller2@gmail.com',
    '$2b$10$i33ETKJpBF9NzN8s.JvBf.4Rnwg7h3U3ED71pXqMxio6AeVvyeLs6',
    'Lê Văn C',
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
       '12 Nguyễn Trãi',
       'Hà Nội',
       'Thanh Xuân',
       'Khương Mai',
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
      AND a.address_line = '12 Nguyễn Trãi'
  );

INSERT INTO addresses (user_id, address_line, city, district, ward, phone_contact, type, is_default)
SELECT u.id,
       '245 Cách Mạng Tháng 8',
       'Thành phố Hồ Chí Minh',
       'Quận 3',
       'Phường 10',
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
      AND a.address_line = '245 Cách Mạng Tháng 8'
  );

INSERT INTO addresses (user_id, address_line, city, district, ward, phone_contact, type, is_default)
SELECT u.id,
       '31 Võ Nguyên Giáp',
       'Đà Nẵng',
       'Sơn Trà',
       'Phước Mỹ',
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
      AND a.address_line = '31 Võ Nguyên Giáp'
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
SELECT u.id, 651000.00
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

INSERT INTO wallet_transactions (
  wallet_id,
  user_id,
  transaction_type,
  amount,
  balance_before,
  balance_after,
  status,
  reference_id,
  reference_type,
  payment_method,
  description,
  completed_at
)
SELECT w.id,
       u.id,
       'topup',
       1250000.00,
       0.00,
       1250000.00,
       'completed',
       'TOPUP-SELLER1-001',
       'topup',
       'internal',
       'Nạp số dư mẫu cho người bán.',
       NOW()
FROM wallets w
JOIN users u ON u.id = w.user_id
WHERE u.email = 'seller1@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM wallet_transactions wt
    WHERE wt.wallet_id = w.id
      AND wt.reference_id = 'TOPUP-SELLER1-001'
  );

INSERT INTO wallet_transactions (
  wallet_id,
  user_id,
  transaction_type,
  amount,
  balance_before,
  balance_after,
  status,
  reference_id,
  reference_type,
  payment_method,
  description,
  completed_at
)
SELECT w.id,
       u.id,
       'topup',
       850000.00,
       0.00,
       850000.00,
       'completed',
       'TOPUP-BUYER-001',
       'topup',
       'momo',
       'Nạp tiền ban đầu.',
       NOW()
FROM wallets w
JOIN users u ON u.id = w.user_id
WHERE u.email = 'buyer@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM wallet_transactions wt
    WHERE wt.wallet_id = w.id
      AND wt.reference_id = 'TOPUP-BUYER-001'
  );

INSERT INTO wallet_transactions (
  wallet_id,
  user_id,
  transaction_type,
  amount,
  balance_before,
  balance_after,
  status,
  reference_id,
  reference_type,
  payment_method,
  description,
  completed_at
)
SELECT w.id,
       u.id,
       'topup',
       650000.00,
       0.00,
       650000.00,
       'completed',
       'TOPUP-SELLER2-001',
       'topup',
       'internal',
       'Nạp số dư mẫu cho người bán.',
       NOW()
FROM wallets w
JOIN users u ON u.id = w.user_id
WHERE u.email = 'seller2@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM wallet_transactions wt
    WHERE wt.wallet_id = w.id
      AND wt.reference_id = 'TOPUP-SELLER2-001'
  );

INSERT INTO wallet_transactions (
  wallet_id,
  user_id,
  transaction_type,
  amount,
  balance_before,
  balance_after,
  status,
  reference_id,
  reference_type,
  payment_method,
  description,
  completed_at
)
SELECT w.id,
       u.id,
       'payment',
       199000.00,
       850000.00,
       651000.00,
       'completed',
       'ORD-DEMO-9001',
       'order',
       'wallet',
       'Tạm giữ tiền cho thanh toán mẫu.',
       NOW()
FROM wallets w
JOIN users u ON u.id = w.user_id
WHERE u.email = 'buyer@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM wallet_transactions wt
    WHERE wt.wallet_id = w.id
      AND wt.reference_id = 'ORD-DEMO-9001'
  );

INSERT INTO wallet_transactions (
  wallet_id,
  user_id,
  transaction_type,
  amount,
  balance_before,
  balance_after,
  status,
  reference_id,
  reference_type,
  payment_method,
  description,
  completed_at
)
SELECT w.id,
       u.id,
       'topup',
       300000.00,
       0.00,
       300000.00,
       'completed',
       'TOPUP-ADMIN-001',
       'topup',
       'internal',
       'Nạp số dư mẫu cho tài khoản admin.',
       NOW()
FROM wallets w
JOIN users u ON u.id = w.user_id
WHERE u.email = 'admin@gmail.com'
  AND NOT EXISTS (
    SELECT 1
    FROM wallet_transactions wt
    WHERE wt.wallet_id = w.id
      AND wt.reference_id = 'TOPUP-ADMIN-001'
  );

INSERT INTO carts (user_id)
SELECT u.id
FROM users u
WHERE u.email = 'buyer@gmail.com'
ON CONFLICT (user_id) DO UPDATE
SET updated_at = NOW();

-- Demo notifications for buyer/seller/admin flows.
INSERT INTO notifications (user_id, title, message, type, link, is_read, created_at)
SELECT u.id,
       n.title,
       n.message,
       n.type,
       n.link,
       n.is_read,
       n.created_at
FROM users u
JOIN (
  VALUES
    ('buyer@gmail.com', 'Đơn hàng #9001 đã giao thành công', 'Bạn có thể để lại đánh giá cho sản phẩm đã mua.', 'ORDER', '/orders/9001', false, NOW() - INTERVAL '1 day'),
    ('buyer@gmail.com', 'Voucher mới cho bạn', 'Mã PLATFORM10 đang hoạt động, áp dụng cho đơn từ 200.000đ.', 'SYSTEM', '/checkout', true, NOW() - INTERVAL '2 days'),
    ('seller1@gmail.com', 'Bạn có đánh giá mới', 'Khách hàng vừa để lại đánh giá cho Premium Hoodie.', 'SYSTEM', '/seller/reviews', false, NOW() - INTERVAL '6 hours'),
    ('seller2@gmail.com', 'Đơn #9003 đang được giao', 'Đơn hàng sneaker đã được đơn vị vận chuyển tiếp nhận.', 'ORDER', '/seller/orders/9003', false, NOW() - INTERVAL '5 hours'),
    ('admin@gmail.com', 'Có báo cáo mới cần xử lý', 'Người dùng vừa gửi báo cáo sản phẩm cần kiểm duyệt.', 'SYSTEM', '/admin/reports', false, NOW() - INTERVAL '3 hours')
) AS n(email, title, message, type, link, is_read, created_at)
  ON u.email = n.email
WHERE NOT EXISTS (
  SELECT 1
  FROM notifications existing
  WHERE existing.user_id = u.id
    AND existing.title = n.title
    AND existing.message = n.message
);
