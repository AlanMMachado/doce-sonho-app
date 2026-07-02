```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Helper: auto-update updated_at ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE product_configs (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type            TEXT          NOT NULL,
  custom_type     TEXT,
  base_price      DECIMAL(10,2) NOT NULL,
  promo_price     DECIMAL(10,2),
  promo_quantity  INTEGER,
  active          BOOLEAN       DEFAULT true,
  created_at      TIMESTAMPTZ   DEFAULT now(),
  updated_at      TIMESTAMPTZ   DEFAULT now()
);

CREATE TABLE shipments (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  date       TEXT        NOT NULL,
  notes      TEXT,
  active     BOOLEAN     DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE products (
  id                UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           UUID          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  shipment_id       UUID          REFERENCES shipments(id) ON DELETE CASCADE NOT NULL,
  product_config_id UUID          REFERENCES product_configs(id) ON DELETE SET NULL,
  type              TEXT          NOT NULL,
  flavor            TEXT          NOT NULL,
  initial_quantity  INTEGER       NOT NULL DEFAULT 0,
  sold_quantity     INTEGER       NOT NULL DEFAULT 0, -- maintained by trigger
  production_cost   DECIMAL(10,2) NOT NULL DEFAULT 0,
  base_price        DECIMAL(10,2) NOT NULL DEFAULT 0,
  promo_price       DECIMAL(10,2),
  promo_quantity    INTEGER,
  created_at        TIMESTAMPTZ   DEFAULT now(),
  updated_at        TIMESTAMPTZ   DEFAULT now()
);

CREATE TABLE customers (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name            TEXT          NOT NULL,
  total_purchased DECIMAL(10,2) NOT NULL DEFAULT 0,  -- maintained by trigger
  total_owed      DECIMAL(10,2) NOT NULL DEFAULT 0,  -- maintained by trigger
  purchase_count  INTEGER       NOT NULL DEFAULT 0,  -- maintained by trigger
  last_purchase   TEXT,                               -- maintained by trigger
  status          TEXT          NOT NULL DEFAULT 'em_dia'
                    CHECK (status IN ('devedor', 'em_dia')),  -- maintained by trigger
  registered_at   TEXT          NOT NULL,
  created_at      TIMESTAMPTZ   DEFAULT now(),
  updated_at      TIMESTAMPTZ   DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE TABLE sales (
  id              UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  customer_id     UUID          REFERENCES customers(id) ON DELETE RESTRICT NOT NULL,
  customer_name   TEXT          NOT NULL, -- snapshot of name at sale time
  date            TEXT          NOT NULL,
  status          TEXT          NOT NULL DEFAULT 'OK'
                    CHECK (status IN ('OK', 'PENDENTE')),
  payment_method  TEXT,
  total_price     DECIMAL(10,2) NOT NULL,
  created_at      TIMESTAMPTZ   DEFAULT now(),
  updated_at      TIMESTAMPTZ   DEFAULT now()
);

CREATE TABLE sale_items (
  id            UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  sale_id       UUID          REFERENCES sales(id) ON DELETE CASCADE NOT NULL,
  product_id    UUID          REFERENCES products(id) ON DELETE SET NULL,
  product_type  TEXT,          -- historical snapshot
  product_flavor TEXT,         -- historical snapshot
  quantity      INTEGER       NOT NULL,
  base_price    DECIMAL(10,2) NOT NULL,
  promo_price   DECIMAL(10,2),
  subtotal      DECIMAL(10,2) NOT NULL,
  created_at    TIMESTAMPTZ   DEFAULT now(),
  updated_at    TIMESTAMPTZ   DEFAULT now()
);

CREATE TABLE profiles (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name   TEXT          NOT NULL,
  email       TEXT          NOT NULL,
  birth_date  TEXT          NOT NULL,
  daily_goal  DECIMAL(10,2) NOT NULL DEFAULT 200.00,
  created_at  TIMESTAMPTZ   DEFAULT now(),
  updated_at  TIMESTAMPTZ   DEFAULT now()
);

-- ── updated_at triggers (all tables) ─────────────────────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'product_configs','shipments','products',
    'customers','sales','sale_items'
  ]
  LOOP
    EXECUTE format(
      'CREATE TRIGGER trg_%I_updated_at
       BEFORE UPDATE ON %I
       FOR EACH ROW EXECUTE FUNCTION set_updated_at()',
      t, t
    );
  END LOOP;
END $$;

CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Trigger: keep products.sold_quantity in sync ──────────────────────────────
-- Automatically increments/decrements sold_quantity whenever sale_items change.
-- The app never needs to update this field manually.

CREATE OR REPLACE FUNCTION update_sold_quantity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE products
    SET sold_quantity = sold_quantity + NEW.quantity
    WHERE id = NEW.product_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE products
    SET sold_quantity = GREATEST(0, sold_quantity - OLD.quantity)
    WHERE id = OLD.product_id;

  ELSIF TG_OP = 'UPDATE' AND NEW.product_id = OLD.product_id THEN
    UPDATE products
    SET sold_quantity = GREATEST(0, sold_quantity - OLD.quantity + NEW.quantity)
    WHERE id = NEW.product_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sale_items_quantity
AFTER INSERT OR UPDATE OR DELETE ON sale_items
FOR EACH ROW EXECUTE FUNCTION update_sold_quantity();

-- ── Trigger: keep customer aggregates in sync ─────────────────────────────────
-- Recalculates total_purchased, total_owed, purchase_count, last_purchase and
-- status on customers whenever a sale is inserted, updated or deleted.

CREATE OR REPLACE FUNCTION update_customer_totals()
RETURNS TRIGGER AS $$
DECLARE v_customer_id UUID;
BEGIN
  v_customer_id := COALESCE(NEW.customer_id, OLD.customer_id);

  UPDATE customers SET
    total_purchased = COALESCE(
      (SELECT SUM(total_price) FROM sales WHERE customer_id = v_customer_id), 0
    ),
    total_owed = COALESCE(
      (SELECT SUM(total_price) FROM sales WHERE customer_id = v_customer_id AND status = 'PENDENTE'), 0
    ),
    purchase_count = (
      SELECT COUNT(*) FROM sales WHERE customer_id = v_customer_id
    ),
    last_purchase = (
      SELECT MAX(date) FROM sales WHERE customer_id = v_customer_id
    ),
    status = CASE
      WHEN COALESCE(
        (SELECT SUM(total_price) FROM sales WHERE customer_id = v_customer_id AND status = 'PENDENTE'), 0
      ) > 0 THEN 'devedor'
      ELSE 'em_dia'
    END
  WHERE id = v_customer_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sales_customer_totals
AFTER INSERT OR UPDATE OR DELETE ON sales
FOR EACH ROW EXECUTE FUNCTION update_customer_totals();

-- ── Row Level Security ────────────────────────────────────────────────────────
-- Each user reads and writes only their own data.

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'product_configs','shipments','products',
    'customers','sales','sale_items'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY own_data ON %I FOR ALL USING (auth.uid() = user_id)',
      t
    );
  END LOOP;
END $$;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_data ON profiles FOR ALL USING (auth.uid() = user_id);
```

---

## Table reference

| Table | Responsibility |
|---|---|
| `product_configs` | Pricing templates per type/flavor |
| `shipments` | Production batches |
| `products` | Items in each shipment (quantities, prices) |
| `customers` | Customer registry with computed totals |
| `sales` | Sale records linked to a customer |
| `sale_items` | Line items per sale (product, quantity, subtotal) |
| `profiles` | User personal info and daily goal |
| `update_sold_quantity` | Keeps `products.sold_quantity` automatic |
| `update_customer_totals` | Keeps `customers` aggregates automatic |
| RLS `own_data` | Isolates each user's data via JWT |
