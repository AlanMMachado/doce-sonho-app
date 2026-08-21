-- Corrige update_customer_totals() para que total_owed (e o status devedor/em_dia
-- derivado dele) reflitam o saldo RESTANTE de uma venda PENDENTE, não o total_price
-- cheio. Sem isso, uma venda parcialmente paga continuaria contando como totalmente
-- devida. CREATE OR REPLACE torna isso seguro para rodar de novo (idempotente).

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
      (SELECT SUM(total_price - amount_paid) FROM sales
       WHERE customer_id = v_customer_id AND status = 'PENDENTE'), 0
    ),
    purchase_count = (
      SELECT COUNT(*) FROM sales WHERE customer_id = v_customer_id
    ),
    last_purchase = (
      SELECT MAX(date) FROM sales WHERE customer_id = v_customer_id
    ),
    status = CASE
      WHEN COALESCE(
        (SELECT SUM(total_price - amount_paid) FROM sales
         WHERE customer_id = v_customer_id AND status = 'PENDENTE'), 0
      ) > 0 THEN 'devedor'
      ELSE 'em_dia'
    END
  WHERE id = v_customer_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- O trigger trg_sales_customer_totals não muda — CREATE OR REPLACE FUNCTION
-- já basta, o trigger só aponta pro nome da função.
