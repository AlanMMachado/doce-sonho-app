-- Adds amount_paid to sales, a fundação para pagamento parcial.
-- Aditiva/segura: NOT NULL + DEFAULT 0 é seguro de adicionar numa tabela populada.
-- "Parcial" é um conceito derivado, não armazenado: status continua
-- 'PAGO' | 'PENDENTE'; uma linha é parcial quando status = 'PENDENTE' AND amount_paid > 0.

ALTER TABLE sales ADD COLUMN amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Backfill: toda venda já PAGO é, por definição, paga integralmente.
-- Vendas PENDENTE existentes ficam corretamente em amount_paid = 0
-- (não existia pagamento parcial antes desta feature).
UPDATE sales SET amount_paid = total_price WHERE status = 'PAGO';

-- Guarda de integridade básica. Deliberadamente SEM constraint amount_paid <= total_price:
-- src/app/sales/edit.tsx pode reescrever total_price de uma venda existente, e uma
-- constraint mais rígida poderia rejeitar uma edição legítima numa venda que já
-- tem pagamento parcial. Esse cruzamento (editar venda depois de parcialmente paga)
-- fica fora do escopo desta issue; a única gravadora de amount_paid é a RPC abaixo,
-- que sempre mantém amount_paid <= total_price por construção.
ALTER TABLE sales ADD CONSTRAINT sales_amount_paid_non_negative CHECK (amount_paid >= 0);

-- ── Reconciliação do constraint de status ──────────────────────────
-- DRIFT CONHECIDO: SUPABASE_SETUP.md ainda mostra CHECK (status IN ('OK', 'PENDENTE')),
-- mas o commit 046d887 renomeou o valor para 'PAGO' no TypeScript sem nenhuma migration
-- registrando a alteração do constraint real no banco.
-- ANTES DE RODAR ESTE ARQUIVO, confira o constraint atual no SQL Editor:
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'sales'::regclass;
-- Se o nome não for 'sales_status_check', ajuste o bloco abaixo de acordo.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'sales' AND constraint_name = 'sales_status_check'
  ) THEN
    ALTER TABLE sales DROP CONSTRAINT sales_status_check;
  END IF;
  ALTER TABLE sales ADD CONSTRAINT sales_status_check CHECK (status IN ('PAGO', 'PENDENTE'));
END $$;
