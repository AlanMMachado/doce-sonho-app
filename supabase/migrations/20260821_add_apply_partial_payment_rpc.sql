-- Primeira RPC/função customizada do projeto. Roda toda a alocação como uma única
-- transação (Postgres já envolve uma chamada de função top-level numa transação
-- implícita — sem precisar de BEGIN/COMMIT explícito).
--
-- Segurança: deliberadamente SEM SECURITY DEFINER — roda como SECURITY INVOKER
-- (padrão do Postgres), ou seja, executa como o role autenticado que chamou, então
-- a policy de RLS existente em sales continua valendo em cada SELECT/UPDATE aqui
-- dentro. O filtro explícito por p_user_id é defesa em profundidade, no mesmo
-- espírito do resto do projeto (que já filtra por user_id mesmo com RLS ativo).
--
-- Algoritmo:
--   1. Rejeita valores não-positivos.
--   2. Calcula o total realmente devido do cliente como SUM(total_price - amount_paid)
--      sobre as vendas PENDENTE (consistente com o trigger corrigido acima).
--   3. Rejeita se o valor pedido ultrapassa esse total (reforço no servidor da regra
--      da issue — a UI também valida antes de chamar, mas a RPC é o guardião
--      autoritativo já que só ali a transação é atômica).
--   4. Percorre as vendas PENDENTE da mais antiga pra mais nova (ORDER BY date ASC,
--      created_at ASC como desempate), travando cada linha (FOR UPDATE) ao ler.
--      Para cada venda, o valor devido é (total_price - amount_paid):
--        - Se o valor restante >= devido da venda: paga ela inteira
--          (amount_paid = total_price, status = 'PAGO'), tira o valor devido do
--          restante, continua.
--        - Senão (restante é menor que o devido mas > 0): aplica todo o restante
--          no amount_paid dessa venda, mantém status = 'PENDENTE' (agora parcial),
--          e para — por construção não sobra nada pras próximas vendas.
--   5. Retorna um resumo em JSON pro client mostrar o resultado.

CREATE OR REPLACE FUNCTION apply_partial_payment(
  p_user_id UUID,
  p_customer_id UUID,
  p_amount DECIMAL(10,2)
) RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  v_remaining         DECIMAL(10,2) := p_amount;
  v_sale              RECORD;
  v_sale_owed         DECIMAL(10,2);
  v_fully_paid_count  INT := 0;
  v_total_owed        DECIMAL(10,2);
  v_partial_sale_id   UUID := NULL;
  v_partial_paid      DECIMAL(10,2) := NULL;
  v_partial_total     DECIMAL(10,2) := NULL;
  v_partial_remaining DECIMAL(10,2) := NULL;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'O valor do pagamento deve ser maior que zero';
  END IF;

  SELECT COALESCE(SUM(total_price - amount_paid), 0)
  INTO v_total_owed
  FROM sales
  WHERE user_id = p_user_id AND customer_id = p_customer_id AND status = 'PENDENTE';

  IF p_amount > v_total_owed THEN
    RAISE EXCEPTION 'O valor informado (%) excede o total em aberto (%)', p_amount, v_total_owed;
  END IF;

  FOR v_sale IN
    SELECT id, total_price, amount_paid
    FROM sales
    WHERE user_id = p_user_id AND customer_id = p_customer_id AND status = 'PENDENTE'
    ORDER BY date ASC, created_at ASC
    FOR UPDATE
  LOOP
    EXIT WHEN v_remaining <= 0;

    v_sale_owed := v_sale.total_price - v_sale.amount_paid;

    IF v_remaining >= v_sale_owed THEN
      UPDATE sales SET amount_paid = total_price, status = 'PAGO' WHERE id = v_sale.id;
      v_remaining := v_remaining - v_sale_owed;
      v_fully_paid_count := v_fully_paid_count + 1;
    ELSE
      UPDATE sales SET amount_paid = amount_paid + v_remaining WHERE id = v_sale.id;
      v_partial_sale_id := v_sale.id;
      v_partial_paid := v_sale.amount_paid + v_remaining;
      v_partial_total := v_sale.total_price;
      v_partial_remaining := v_sale_owed - v_remaining;
      v_remaining := 0;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'sales_fully_paid', v_fully_paid_count,
    'partial_sale_id', v_partial_sale_id,
    'partial_amount_paid', v_partial_paid,
    'partial_total_price', v_partial_total,
    'partial_remaining', v_partial_remaining,
    'amount_applied', p_amount
  );
END;
$$;
