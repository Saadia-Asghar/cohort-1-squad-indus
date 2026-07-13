CREATE SCHEMA IF NOT EXISTS sweet_tooth;

CREATE TABLE IF NOT EXISTS sweet_tooth.bakers (
  id SERIAL PRIMARY KEY,
  business_name TEXT NOT NULL,
  owner_name TEXT NOT NULL DEFAULT '',
  tagline TEXT,
  bio TEXT,
  city TEXT NOT NULL,
  area TEXT,
  whatsapp_number TEXT NOT NULL UNIQUE,
  email TEXT UNIQUE,
  password_hash TEXT,
  require_advance BOOLEAN NOT NULL DEFAULT false,
  cancellation_reason TEXT,
  cancelled_by TEXT,
  cancelled_at TIMESTAMPTZ,
  advance_threshold_pkr INTEGER NOT NULL DEFAULT 2000,
  advance_percentage INTEGER NOT NULL DEFAULT 50,
  payment_details TEXT NOT NULL DEFAULT '',
  delivery_areas TEXT[] NOT NULL DEFAULT '{}',
  cod_policy TEXT,
  return_policy TEXT,
  max_orders_per_day INTEGER NOT NULL DEFAULT 10,
  agent_active BOOLEAN NOT NULL DEFAULT true,
  agent_config JSONB DEFAULT '{}',
  whatsapp_agent_enabled BOOLEAN NOT NULL DEFAULT false,
  instagram_agent_enabled BOOLEAN NOT NULL DEFAULT false,
  meta_webhook_token TEXT,
  instagram_page_id TEXT,
  marketplace_visible BOOLEAN NOT NULL DEFAULT true,
  subscription_plan TEXT NOT NULL DEFAULT 'free',
  rating_avg REAL NOT NULL DEFAULT 0,
  total_orders INTEGER NOT NULL DEFAULT 0,
  slug TEXT NOT NULL UNIQUE,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sweet_tooth.products (
  id SERIAL PRIMARY KEY,
  baker_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  base_price_pkr INTEGER NOT NULL,
  sizes JSONB NOT NULL DEFAULT '[]',
  variants TEXT[] NOT NULL DEFAULT '{}',
  is_eggless_available BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  lead_time_days INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL,
  occasion_tags TEXT[] NOT NULL DEFAULT '{}',
  dietary_tags TEXT[] NOT NULL DEFAULT '{}',
  photo_url TEXT,
  total_orders INTEGER NOT NULL DEFAULT 0,
  is_best_seller BOOLEAN NOT NULL DEFAULT false,
  is_top_rated BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sweet_tooth.orders (
  id SERIAL PRIMARY KEY,
  baker_id INTEGER NOT NULL,
  buyer_id INTEGER,
  buyer_name TEXT NOT NULL,
  buyer_whatsapp TEXT NOT NULL,
  buyer_address TEXT NOT NULL,
  buyer_area TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  total_pkr INTEGER NOT NULL,
  delivery_date DATE,
  status TEXT NOT NULL DEFAULT 'new',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  payment_amount_received INTEGER,
  source TEXT NOT NULL DEFAULT 'marketplace',
  occasion TEXT,
  special_instructions TEXT,
  flavour TEXT,
  text_on_cake TEXT,
  payment_screenshot_url TEXT,
  advance_paid BOOLEAN NOT NULL DEFAULT false,
  require_advance BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sweet_tooth.cart_items (
  id SERIAL PRIMARY KEY,
  buyer_id INTEGER NOT NULL,
  baker_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  size_label TEXT NOT NULL,
  variant TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_pkr INTEGER NOT NULL,
  photo_url TEXT,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sweet_tooth.customers (
  id SERIAL PRIMARY KEY,
  baker_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  whatsapp_number TEXT NOT NULL,
  city TEXT,
  preferred_area TEXT,
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent_pkr INTEGER NOT NULL DEFAULT 0,
  is_regular BOOLEAN NOT NULL DEFAULT false,
  is_at_risk BOOLEAN NOT NULL DEFAULT false,
  last_order_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sweet_tooth.chat_messages (
  id SERIAL PRIMARY KEY,
  baker_id INTEGER NOT NULL,
  buyer_id INTEGER,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sweet_tooth.conversation_memory (
  id SERIAL PRIMARY KEY,
  baker_id INTEGER NOT NULL,
  buyer_id INTEGER NOT NULL,
  buyer_name TEXT,
  preferences JSONB DEFAULT '{}',
  message_count INTEGER NOT NULL DEFAULT 0,
  summary TEXT,
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (baker_id, buyer_id)
);

CREATE TABLE IF NOT EXISTS sweet_tooth.notifications (
  id SERIAL PRIMARY KEY,
  baker_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_id INTEGER,
  related_type TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sweet_tooth.reviews (
  id SERIAL PRIMARY KEY,
  baker_id INTEGER NOT NULL,
  buyer_id INTEGER,
  order_id INTEGER,
  buyer_name TEXT NOT NULL,
  rating INTEGER NOT NULL,
  rating_product INTEGER,
  rating_packaging INTEGER,
  review_text TEXT,
  product_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sweet_tooth.knowledge_chunks (
  id SERIAL PRIMARY KEY,
  baker_id INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id INTEGER,
  chunk_index INTEGER NOT NULL DEFAULT 0,
  content TEXT NOT NULL,
  embedding JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sweet_tooth.baker_goals (
  id SERIAL PRIMARY KEY,
  baker_id INTEGER NOT NULL,
  label TEXT NOT NULL,
  metric TEXT NOT NULL DEFAULT 'orders',
  target_value INTEGER NOT NULL,
  period TEXT NOT NULL DEFAULT 'monthly',
  achieved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sweet_tooth.baker_notes (
  id SERIAL PRIMARY KEY,
  baker_id INTEGER NOT NULL,
  content TEXT NOT NULL,
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sweet_tooth.baker_reminders (
  id SERIAL PRIMARY KEY,
  baker_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS knowledge_chunks_baker_idx ON sweet_tooth.knowledge_chunks (baker_id);
CREATE INDEX IF NOT EXISTS baker_goals_baker_idx ON sweet_tooth.baker_goals (baker_id);
CREATE INDEX IF NOT EXISTS baker_notes_baker_idx ON sweet_tooth.baker_notes (baker_id);
CREATE INDEX IF NOT EXISTS baker_reminders_baker_idx ON sweet_tooth.baker_reminders (baker_id);

ALTER TABLE sweet_tooth.customers ADD COLUMN IF NOT EXISTS is_at_risk BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sweet_tooth.bakers ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE sweet_tooth.bakers ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE sweet_tooth.bakers ADD COLUMN IF NOT EXISTS require_advance BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sweet_tooth.bakers ADD COLUMN IF NOT EXISTS advance_threshold_pkr INTEGER NOT NULL DEFAULT 2000;
ALTER TABLE sweet_tooth.bakers ADD COLUMN IF NOT EXISTS advance_percentage INTEGER NOT NULL DEFAULT 50;
ALTER TABLE sweet_tooth.bakers ADD COLUMN IF NOT EXISTS payment_details TEXT NOT NULL DEFAULT '';
ALTER TABLE sweet_tooth.orders ADD COLUMN IF NOT EXISTS flavour TEXT;
ALTER TABLE sweet_tooth.orders ADD COLUMN IF NOT EXISTS text_on_cake TEXT;
ALTER TABLE sweet_tooth.orders ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT;
ALTER TABLE sweet_tooth.orders ADD COLUMN IF NOT EXISTS advance_paid BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sweet_tooth.orders ADD COLUMN IF NOT EXISTS require_advance BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE sweet_tooth.orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE sweet_tooth.orders ADD COLUMN IF NOT EXISTS cancelled_by TEXT;
ALTER TABLE sweet_tooth.orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE sweet_tooth.reviews ADD COLUMN IF NOT EXISTS order_id INTEGER;
ALTER TABLE sweet_tooth.reviews ADD COLUMN IF NOT EXISTS rating_product INTEGER;
ALTER TABLE sweet_tooth.reviews ADD COLUMN IF NOT EXISTS rating_packaging INTEGER;
ALTER TABLE sweet_tooth.reviews ADD COLUMN IF NOT EXISTS review_text TEXT;
ALTER TABLE sweet_tooth.reviews ADD COLUMN IF NOT EXISTS product_name TEXT;

-- A new linked Neon database starts empty. These idempotent demo records keep
-- the marketplace usable immediately while real bakers add their own catalogues.
INSERT INTO sweet_tooth.bakers (
  business_name, owner_name, tagline, city, area, whatsapp_number, email,
  password_hash, delivery_areas, marketplace_visible, subscription_plan,
  rating_avg, total_orders, slug, photo_url
) VALUES
  ('Sana''s Sweet Studio', 'Sana Malik', 'Ghar ka meetha, dil se banaya', 'Lahore', 'Gulberg', '+923001234567', 'sana@studio.com', 'demo-only', ARRAY['Gulberg','Model Town','DHA'], true, 'pro', 4.9, 247, 'sana-sweet-studio', 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&auto=format&fit=crop'),
  ('Fatima''s Cakery', 'Fatima Zahra', 'Every bite tells a story', 'Karachi', 'Clifton', '+923219876543', 'fatima@cakery.com', 'demo-only', ARRAY['Clifton','Defence'], true, 'pro', 4.8, 189, 'fatima-cakery', 'https://images.unsplash.com/photo-1464349095431-e9a21285b5f3?w=800&auto=format&fit=crop'),
  ('Amna Bakes', 'Amna Sheikh', 'Simple ingredients, extraordinary taste', 'Islamabad', 'F-7', '+923115554321', 'amna@bakes.com', 'demo-only', ARRAY['F-7','F-8','G-9'], true, 'free', 4.7, 94, 'amna-bakes', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO sweet_tooth.products (
  baker_id, name, description, base_price_pkr, sizes, variants,
  is_eggless_available, is_available, lead_time_days, category,
  occasion_tags, dietary_tags, photo_url, total_orders, is_best_seller,
  is_top_rated, display_order
)
SELECT b.id, p.name, p.description, p.base_price_pkr, p.sizes::jsonb,
  p.variants::text[], p.is_eggless_available, true, p.lead_time_days,
  p.category, p.occasion_tags::text[], p.dietary_tags::text[], p.photo_url,
  p.total_orders, p.is_best_seller, p.is_top_rated, p.display_order
FROM (VALUES
  ('sana-sweet-studio', 'Classic Black Forest Cake', 'Moist chocolate sponge, fresh cream, and cherries.', 2800, '[{"label":"Half Kg","pricePkr":2800},{"label":"1 Kg","pricePkr":5200}]', '{}', true, 1, 'Cakes', '{Birthday,Anniversary}', '{}', 'https://images.unsplash.com/photo-1571115764595-644a1f56a55c?w=600&auto=format&fit=crop', 89, true, true, 1),
  ('sana-sweet-studio', 'Red Velvet Cupcakes', 'Velvety cupcakes with cream-cheese frosting.', 1200, '[{"label":"Box of 6","pricePkr":1200},{"label":"Box of 12","pricePkr":2200}]', '{}', false, 1, 'Cupcakes', '{Birthday,Party}', '{}', 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=600&auto=format&fit=crop', 134, true, false, 2),
  ('fatima-cakery', 'Fondant Wedding Cake', 'Elegant custom wedding cakes with sugar flowers.', 15000, '[{"label":"2 Tier","pricePkr":15000}]', '{}', true, 7, 'Wedding Cakes', '{Wedding,Nikah}', '{}', 'https://images.unsplash.com/photo-1549298651-0e5b3a0e9ca3?w=600&auto=format&fit=crop', 34, true, true, 1),
  ('amna-bakes', 'Chocolate Chip Cookies', 'Crispy edges and chewy centres.', 700, '[{"label":"Box of 12","pricePkr":700}]', '{}', false, 1, 'Cookies', '{Casual,Gift}', '{}', 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=600&auto=format&fit=crop', 156, true, true, 1)
) AS p(slug, name, description, base_price_pkr, sizes, variants, is_eggless_available, lead_time_days, category, occasion_tags, dietary_tags, photo_url, total_orders, is_best_seller, is_top_rated, display_order)
JOIN sweet_tooth.bakers b ON b.slug = p.slug
WHERE NOT EXISTS (
  SELECT 1 FROM sweet_tooth.products existing
  WHERE existing.baker_id = b.id AND existing.name = p.name
);
