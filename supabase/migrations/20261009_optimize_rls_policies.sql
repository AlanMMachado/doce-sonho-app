-- Evita reavaliar auth.uid() para cada linha protegida pela policy.
-- A migration deve ser revisada antes de ser aplicada no SQL Editor do Supabase.

ALTER POLICY own_data ON product_configs
  USING ((select auth.uid()) = user_id);

ALTER POLICY own_data ON shipments
  USING ((select auth.uid()) = user_id);

ALTER POLICY own_data ON products
  USING ((select auth.uid()) = user_id);

ALTER POLICY own_data ON customers
  USING ((select auth.uid()) = user_id);

ALTER POLICY own_data ON sales
  USING ((select auth.uid()) = user_id);

ALTER POLICY own_data ON sale_items
  USING ((select auth.uid()) = user_id);

ALTER POLICY own_data ON profiles
  USING ((select auth.uid()) = user_id);
