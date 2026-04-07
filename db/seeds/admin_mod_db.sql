-- Rich moderation seed data for local development.

INSERT INTO report_reasons (code, name, description, category, is_active)
VALUES
  ('SP01', 'Hang gia / nhai', 'San pham khong dung mo ta hoac co dau hieu hang gia.', 'product', true),
  ('SP02', 'Hinh anh sai su that', 'Hinh anh va mo ta khong khop voi san pham that.', 'product', true),
  ('SP03', 'Noi dung spam', 'Noi dung dang ban gay nhieu hoac lap lai bat thuong.', 'product', true),
  ('SHOP01', 'Shop lua dao', 'Shop khong giao hang hoac giao hang kem chat luong.', 'shop', true),
  ('SHOP02', 'Shop gia mao thuong hieu', 'Gian hang co dau hieu mao danh thuong hieu khac.', 'shop', true),
  ('ORDER01', 'Don hang bi huy khong ly do', 'Nguoi ban huy don ma khong thong bao.', 'order', true),
  ('ORDER02', 'Cham giao hang', 'Don hang bi tre hon thoi gian du kien qua lau.', 'order', true)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  is_active = EXCLUDED.is_active;

INSERT INTO reports (
  reporter_id,
  target_type,
  product_id,
  shop_id,
  shop_order_id,
  report_reason_id,
  custom_reason,
  title,
  description,
  evidence_urls,
  severity,
  status,
  admin_id,
  admin_note,
  resolution,
  resolved_at
)
SELECT 1,
       'product',
       1,
       1,
       NULL,
       rr.id,
       NULL,
       'Ao thun giao khac mo ta',
       'Nguoi mua phan anh chat lieu giao thuc te khong giong mo ta tren trang san pham.',
       '["https://example.com/evidence/product-1.jpg"]'::jsonb,
       'medium',
       'pending',
       NULL,
       NULL,
       NULL,
       NULL
FROM report_reasons rr
WHERE rr.code = 'SP02'
  AND NOT EXISTS (
    SELECT 1
    FROM reports r
    WHERE r.title = 'Ao thun giao khac mo ta'
  );

INSERT INTO reports (
  reporter_id,
  target_type,
  product_id,
  shop_id,
  shop_order_id,
  report_reason_id,
  custom_reason,
  title,
  description,
  evidence_urls,
  severity,
  status,
  admin_id,
  admin_note,
  resolution,
  resolved_at
)
SELECT 1,
       'shop',
       NULL,
       3,
       NULL,
       rr.id,
       NULL,
       'Shop moi can xac minh them',
       'Tai khoan ban hang moi dang cho duyet, can bo sung giay to va dia chi lay hang.',
       '["https://example.com/evidence/shop-3.png"]'::jsonb,
       'low',
       'under_review',
       3,
       'Da lien he nguoi ban de bo sung ho so.',
       NULL,
       NULL
FROM report_reasons rr
WHERE rr.code = 'SHOP02'
  AND NOT EXISTS (
    SELECT 1
    FROM reports r
    WHERE r.title = 'Shop moi can xac minh them'
  );

INSERT INTO reports (
  reporter_id,
  target_type,
  product_id,
  shop_id,
  shop_order_id,
  report_reason_id,
  custom_reason,
  title,
  description,
  evidence_urls,
  severity,
  status,
  admin_id,
  admin_note,
  resolution,
  resolved_at
)
SELECT 1,
       'order',
       NULL,
       2,
       9002,
       rr.id,
       NULL,
       'Don sneaker giao cham',
       'Don hang sneaker bi tre 3 ngay so voi cam ket ban dau cua shop.',
       '["https://example.com/evidence/order-9002.png"]'::jsonb,
       'medium',
       'resolved',
       3,
       'Admin da xac minh va yeu cau shop boi thuong phi van chuyen.',
       'refund_issued',
       NOW() - INTERVAL '1 day'
FROM report_reasons rr
WHERE rr.code = 'ORDER02'
  AND NOT EXISTS (
    SELECT 1
    FROM reports r
    WHERE r.title = 'Don sneaker giao cham'
  );
