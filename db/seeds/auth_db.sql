-- Demo auth data for local development.
-- email: seller@example.com
-- password: 123456

INSERT INTO users (email, password, full_name, role, status)
VALUES (
  'seller@example.com',
  '$2b$10$i33ETKJpBF9NzN8s.JvBf.4Rnwg7h3U3ED71pXqMxio6AeVvyeLs6',
  'Demo Seller',
  'user',
  'active'
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO users (email, password, full_name, role, status)
VALUES (
  'admin@example.com',
  '$2b$10$i33ETKJpBF9NzN8s.JvBf.4Rnwg7h3U3ED71pXqMxio6AeVvyeLs6',
  'Demo Admin',
  'admin',
  'active'
)
ON CONFLICT (email) DO NOTHING;
