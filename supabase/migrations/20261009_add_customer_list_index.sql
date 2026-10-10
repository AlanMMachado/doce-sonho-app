-- Índice para paginação e filtros da lista de clientes.
-- A migration deve ser revisada antes de ser aplicada no SQL Editor do Supabase.

CREATE INDEX IF NOT EXISTS customers_user_status_name_idx
  ON customers (user_id, status, name, id);
