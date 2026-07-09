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
ALTER TABLE sweet_tooth.reviews ADD COLUMN IF NOT EXISTS order_id INTEGER;
ALTER TABLE sweet_tooth.reviews ADD COLUMN IF NOT EXISTS rating_product INTEGER;
ALTER TABLE sweet_tooth.reviews ADD COLUMN IF NOT EXISTS rating_packaging INTEGER;
ALTER TABLE sweet_tooth.reviews ADD COLUMN IF NOT EXISTS review_text TEXT;
ALTER TABLE sweet_tooth.reviews ADD COLUMN IF NOT EXISTS product_name TEXT;
