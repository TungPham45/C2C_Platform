-- Rich chat seed data for local development.
-- buyer@gmail.com     -> user id 1
-- seller1@gmail.com   -> user id 2
-- seller2@gmail.com   -> user id 4
-- thoi-trang-b        -> shop id 1
-- giay-sneaker-pro    -> shop id 2

INSERT INTO conversations (
  buyer_id,
  seller_id,
  shop_id,
  status,
  last_message_preview,
  unread_count_buyer,
  unread_count_seller
)
VALUES
  (1, 2, 1, 'active', 'Cam on shop, ao dep va dung size.', 0, 1),
  (1, 4, 2, 'active', 'Shop ship COD duoc khong?', 1, 0)
ON CONFLICT (buyer_id, shop_id) DO UPDATE
SET
  seller_id = EXCLUDED.seller_id,
  status = EXCLUDED.status,
  last_message_preview = EXCLUDED.last_message_preview,
  unread_count_buyer = EXCLUDED.unread_count_buyer,
  unread_count_seller = EXCLUDED.unread_count_seller,
  updated_at = NOW();

INSERT INTO messages (
  conversation_id,
  sender_id,
  sender_role,
  message_type,
  content,
  is_edited,
  updated_at,
  edit_history,
  sent_at,
  is_read
)
SELECT c.id,
       m.sender_id,
       m.sender_role,
       'text',
       m.content,
       false,
       NULL,
       '[]'::jsonb,
       m.sent_at,
       m.is_read
FROM conversations c
JOIN (
  VALUES
    (1, 1, 1, 'buyer', 'Shop oi ao thun con size XL khong a?', NOW() - INTERVAL '30 minutes', true),
    (1, 1, 2, 'seller', 'Con ban nhe, mau den size XL con 12 chiec.', NOW() - INTERVAL '27 minutes', true),
    (1, 1, 1, 'buyer', 'Cam on shop, ao dep va dung size.', NOW() - INTERVAL '5 minutes', true),
    (1, 1, 2, 'seller', 'Cam on ban da ung ho shop a.', NOW() - INTERVAL '2 minutes', false)
) AS m(buyer_id, shop_id, sender_id, sender_role, content, sent_at, is_read)
  ON c.buyer_id = m.buyer_id
 AND c.shop_id = m.shop_id
LEFT JOIN messages existing
  ON existing.conversation_id = c.id
 AND existing.sender_role = m.sender_role
 AND existing.content = m.content
WHERE existing.id IS NULL;

INSERT INTO messages (
  conversation_id,
  sender_id,
  sender_role,
  message_type,
  content,
  is_edited,
  updated_at,
  edit_history,
  sent_at,
  is_read
)
SELECT c.id,
       m.sender_id,
       m.sender_role,
       'text',
       m.content,
       false,
       NULL,
       '[]'::jsonb,
       m.sent_at,
       m.is_read
FROM conversations c
JOIN (
  VALUES
    (1, 2, 1, 'buyer', 'Giay size 41 con hang khong shop?', NOW() - INTERVAL '45 minutes', true),
    (1, 2, 4, 'seller', 'Con a, shop con size 40 den 42.', NOW() - INTERVAL '40 minutes', true),
    (1, 2, 1, 'buyer', 'Shop ship COD duoc khong?', NOW() - INTERVAL '12 minutes', false),
    (1, 2, 4, 'seller', 'Duoc a, shop ho tro COD toan quoc.', NOW() - INTERVAL '10 minutes', false)
) AS m(buyer_id, shop_id, sender_id, sender_role, content, sent_at, is_read)
  ON c.buyer_id = m.buyer_id
 AND c.shop_id = m.shop_id
LEFT JOIN messages existing
  ON existing.conversation_id = c.id
 AND existing.sender_role = m.sender_role
 AND existing.content = m.content
WHERE existing.id IS NULL;
