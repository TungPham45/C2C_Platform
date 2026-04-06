-- Demo moderation reasons for local development.

INSERT INTO report_reasons (code, name, description, category, is_active)
VALUES
  ('SPAM_PRODUCT', 'Spam Product', 'Product appears to be spam or misleading.', 'product', true),
  ('FAKE_SHOP', 'Fake Shop', 'Shop impersonation or fraudulent storefront.', 'shop', true),
  ('ORDER_ABUSE', 'Order Abuse', 'Abusive order behavior.', 'order', true)
ON CONFLICT (code) DO NOTHING;
