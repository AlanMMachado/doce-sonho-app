-- Adds pix_key to profiles: chave Pix do usuário, usada na variável {chave_pix} da
-- mensagem de cobrança pelo WhatsApp (issue #12).
-- Aditiva/segura: coluna nullable. NULL significa sem chave cadastrada, e nesse caso
-- {chave_pix} sai vazia na mensagem.
-- Guarda o texto como o usuário informou, pois a chave pode ser CPF/CNPJ, telefone,
-- e-mail ou chave aleatória. O limite cobre o maior formato, o e-mail.
-- A policy own_data de profiles é por linha, então já cobre a coluna nova.

ALTER TABLE profiles ADD COLUMN pix_key TEXT
  CHECK (char_length(pix_key) <= 77);
