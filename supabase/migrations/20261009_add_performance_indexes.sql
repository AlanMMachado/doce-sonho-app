-- Índices para consultas por usuário, períodos de vendas e relacionamentos frequentes.
-- A migration deve ser revisada antes de ser aplicada no SQL Editor do Supabase.

CREATE INDEX IF NOT EXISTS product_configs_user_id_idx
  ON product_configs (user_id);

CREATE INDEX IF NOT EXISTS shipments_user_id_idx
  ON shipments (user_id);

CREATE INDEX IF NOT EXISTS products_user_id_shipment_id_idx
  ON products (user_id, shipment_id);

CREATE INDEX IF NOT EXISTS products_shipment_id_idx
  ON products (shipment_id);

CREATE INDEX IF NOT EXISTS products_product_config_id_idx
  ON products (product_config_id);

CREATE INDEX IF NOT EXISTS sales_user_id_date_idx
  ON sales (user_id, date);

CREATE INDEX IF NOT EXISTS sales_customer_id_idx
  ON sales (customer_id);

CREATE INDEX IF NOT EXISTS sale_items_user_id_sale_id_idx
  ON sale_items (user_id, sale_id);

CREATE INDEX IF NOT EXISTS sale_items_sale_id_idx
  ON sale_items (sale_id);

CREATE INDEX IF NOT EXISTS sale_items_product_id_idx
  ON sale_items (product_id);
