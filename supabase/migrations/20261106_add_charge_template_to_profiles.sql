-- Adds charge_message_template to profiles: template da mensagem de cobrança
-- pelo WhatsApp, editável em Configurações (issue #12).
-- Aditiva/segura: coluna nullable. NULL significa usar o template padrão definido
-- no código, assim melhorias futuras no padrão chegam a quem nunca personalizou.
-- A policy own_data de profiles é por linha, então já cobre a coluna nova.

ALTER TABLE profiles ADD COLUMN charge_message_template TEXT;
