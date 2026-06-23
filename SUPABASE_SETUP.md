```sql
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Função auxiliar: atualiza updated_at automaticamente ──────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ── Tabelas ───────────────────────────────────────────────────────────────

CREATE TABLE produto_configs (
  id                  UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  tipo                TEXT         NOT NULL,
  tipo_customizado    TEXT,
  preco_base          DECIMAL(10,2) NOT NULL,
  preco_promocao      DECIMAL(10,2),
  quantidade_promocao INTEGER,
  ativo               BOOLEAN      DEFAULT true,
  created_at          TIMESTAMPTZ  DEFAULT now(),
  updated_at          TIMESTAMPTZ  DEFAULT now()
);

CREATE TABLE remessas (
  id         UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    UUID         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  data       TEXT         NOT NULL,
  observacao TEXT,
  ativa      BOOLEAN      DEFAULT true,
  created_at TIMESTAMPTZ  DEFAULT now(),
  updated_at TIMESTAMPTZ  DEFAULT now()
);

CREATE TABLE produtos (
  id                  UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id             UUID         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  remessa_id          UUID         REFERENCES remessas(id) ON DELETE CASCADE NOT NULL,
  produto_config_id   UUID         REFERENCES produto_configs(id) ON DELETE SET NULL,
  tipo                TEXT         NOT NULL,
  sabor               TEXT         NOT NULL,
  quantidade_inicial  INTEGER      NOT NULL DEFAULT 0,
  quantidade_vendida  INTEGER      NOT NULL DEFAULT 0, -- atualizado por trigger
  custo_producao      DECIMAL(10,2) NOT NULL DEFAULT 0,
  preco_base          DECIMAL(10,2) NOT NULL DEFAULT 0,
  preco_promocao      DECIMAL(10,2),
  quantidade_promocao INTEGER,
  created_at          TIMESTAMPTZ  DEFAULT now(),
  updated_at          TIMESTAMPTZ  DEFAULT now()
);

CREATE TABLE clientes (
  id             UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        UUID         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  nome           TEXT         NOT NULL,
  total_comprado DECIMAL(10,2) NOT NULL DEFAULT 0,  -- atualizado por trigger
  total_devido   DECIMAL(10,2) NOT NULL DEFAULT 0,  -- atualizado por trigger
  numero_compras INTEGER      NOT NULL DEFAULT 0,   -- atualizado por trigger
  ultima_compra  TEXT,                               -- atualizado por trigger
  status         TEXT         NOT NULL DEFAULT 'em_dia'
                   CHECK (status IN ('devedor', 'em_dia')),  -- atualizado por trigger
  data_cadastro  TEXT         NOT NULL,
  created_at     TIMESTAMPTZ  DEFAULT now(),
  updated_at     TIMESTAMPTZ  DEFAULT now(),
  UNIQUE (user_id, nome)
);

CREATE TABLE vendas (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  cliente_id       UUID         REFERENCES clientes(id) ON DELETE RESTRICT NOT NULL,
  cliente_nome     TEXT         NOT NULL, -- snapshot do nome no momento da venda
  data             TEXT         NOT NULL,
  status           TEXT         NOT NULL DEFAULT 'OK'
                     CHECK (status IN ('OK', 'PENDENTE')),
  metodo_pagamento TEXT,
  total_preco      DECIMAL(10,2) NOT NULL,
  created_at       TIMESTAMPTZ  DEFAULT now(),
  updated_at       TIMESTAMPTZ  DEFAULT now()
);

CREATE TABLE itens_venda (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  venda_id      UUID         REFERENCES vendas(id) ON DELETE CASCADE NOT NULL,
  produto_id    UUID         REFERENCES produtos(id) ON DELETE SET NULL,
  produto_tipo  TEXT,         -- snapshot histórico
  produto_sabor TEXT,         -- snapshot histórico
  quantidade    INTEGER      NOT NULL,
  preco_base    DECIMAL(10,2) NOT NULL,
  preco_promocao DECIMAL(10,2),
  subtotal      DECIMAL(10,2) NOT NULL,
  created_at    TIMESTAMPTZ  DEFAULT now(),
  updated_at    TIMESTAMPTZ  DEFAULT now()
);

CREATE TABLE perfil (
  id               UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID          REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  nome_completo    TEXT          NOT NULL,
  email            TEXT          NOT NULL,
  data_nascimento  TEXT          NOT NULL,
  meta_diaria      DECIMAL(10,2) NOT NULL DEFAULT 200.00,
  created_at       TIMESTAMPTZ   DEFAULT now(),
  updated_at       TIMESTAMPTZ   DEFAULT now()
);

-- ── Triggers de updated_at (todas as tabelas) ─────────────────────────────

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'produto_configs','remessas','produtos',
    'clientes','vendas','itens_venda'
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

CREATE TRIGGER trg_perfil_updated_at
BEFORE UPDATE ON perfil
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Trigger: quantidade_vendida em produtos ───────────────────────────────
-- Mantém produtos.quantidade_vendida sincronizado com os itens inseridos/
-- atualizados/removidos em itens_venda. O app nunca precisa atualizar
-- esse campo manualmente.

CREATE OR REPLACE FUNCTION trg_atualizar_quantidade_vendida()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE produtos
    SET quantidade_vendida = quantidade_vendida + NEW.quantidade
    WHERE id = NEW.produto_id;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE produtos
    SET quantidade_vendida = GREATEST(0, quantidade_vendida - OLD.quantidade)
    WHERE id = OLD.produto_id;

  ELSIF TG_OP = 'UPDATE' AND NEW.produto_id = OLD.produto_id THEN
    UPDATE produtos
    SET quantidade_vendida = GREATEST(0, quantidade_vendida - OLD.quantidade + NEW.quantidade)
    WHERE id = NEW.produto_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_itens_quantidade
AFTER INSERT OR UPDATE OR DELETE ON itens_venda
FOR EACH ROW EXECUTE FUNCTION trg_atualizar_quantidade_vendida();

-- ── Trigger: agregados de clientes ───────────────────────────────────────
-- Recalcula total_comprado, total_devido, numero_compras, ultima_compra e
-- status em clientes sempre que uma venda é inserida, atualizada ou removida.
-- Elimina a necessidade do syncService no app.

CREATE OR REPLACE FUNCTION trg_atualizar_totais_cliente()
RETURNS TRIGGER AS $$
DECLARE v_cliente_id UUID;
BEGIN
  v_cliente_id := COALESCE(NEW.cliente_id, OLD.cliente_id);

  UPDATE clientes SET
    total_comprado = COALESCE(
      (SELECT SUM(total_preco) FROM vendas WHERE cliente_id = v_cliente_id), 0
    ),
    total_devido = COALESCE(
      (SELECT SUM(total_preco) FROM vendas WHERE cliente_id = v_cliente_id AND status = 'PENDENTE'), 0
    ),
    numero_compras = (
      SELECT COUNT(*) FROM vendas WHERE cliente_id = v_cliente_id
    ),
    ultima_compra = (
      SELECT MAX(data) FROM vendas WHERE cliente_id = v_cliente_id
    ),
    status = CASE
      WHEN COALESCE(
        (SELECT SUM(total_preco) FROM vendas WHERE cliente_id = v_cliente_id AND status = 'PENDENTE'), 0
      ) > 0 THEN 'devedor'
      ELSE 'em_dia'
    END
  WHERE id = v_cliente_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vendas_cliente_totais
AFTER INSERT OR UPDATE OR DELETE ON vendas
FOR EACH ROW EXECUTE FUNCTION trg_atualizar_totais_cliente();

-- ── Row Level Security ────────────────────────────────────────────────────
-- Cada usuário só lê e escreve os próprios dados.

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'produto_configs','remessas','produtos',
    'clientes','vendas','itens_venda'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format(
      'CREATE POLICY own_data ON %I FOR ALL USING (auth.uid() = user_id)',
      t
    );
  END LOOP;
END $$;

ALTER TABLE perfil ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_data ON perfil FOR ALL USING (auth.uid() = user_id);
```

---

## O que cada parte faz

| Componente | Responsabilidade |
|---|---|
| `produto_configs` | Templates de preço por tipo/sabor |
| `remessas` | Lotes de produção |
| `produtos` | Itens de cada remessa (quantidades, preços) |
| `clientes` | Cadastro de clientes com totais calculados |
| `vendas` | Registro de vendas com FK para cliente |
| `itens_venda` | Linhas de cada venda (produto, quantidade, subtotal) |
| `perfil` | Dados pessoais e meta diária do usuário |
| `trg_itens_quantidade` | Mantém `produtos.quantidade_vendida` automático |
| `trg_vendas_cliente_totais` | Mantém agregados de `clientes` automáticos |
| RLS `own_data` | Isola dados de cada usuário via JWT |
