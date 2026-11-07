-- Adds phone to customers, usado pela cobrança pelo WhatsApp (issue #12).
-- Aditiva/segura: coluna nullable, NULL significa cliente sem número cadastrado.
-- Chama-se phone, e não whatsapp, porque o cliente pode ter telefone sem ter WhatsApp.
-- Guarda só os dígitos com DDD, sem o 55, que é prefixado ao montar o link.
-- As policies de RLS de customers são por linha, então já cobrem a coluna nova.

ALTER TABLE customers ADD COLUMN phone TEXT
  CHECK (phone ~ '^[1-9][0-9]{9,10}$');
