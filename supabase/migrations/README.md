# Migrations

Histórico das mudanças de schema aplicadas ao Supabase, na ordem em que rodaram.
O schema-base (estado antes desta pasta existir) está documentado em
[`SUPABASE_SETUP.md`](../../SUPABASE_SETUP.md), na raiz do projeto.

## Convenção

- Um arquivo `.sql` por mudança de schema, nomeado `YYYYMMDD_descricao_curta.sql`.
- Escreva o SQL aqui **antes** de rodar no dashboard do Supabase (SQL Editor), não depois —
  assim o arquivo é a fonte da verdade, e não uma transcrição feita de memória.
- Migrations que alteram ou removem uma coluna/tabela existente só devem ser criadas
  quando o código que depende do formato antigo já não estiver mais em `master`.
  Para o meio do caminho, prefira migrations aditivas (novas colunas nullable ou com
  `DEFAULT`, novas tabelas) — isso mantém o app em produção funcionando enquanto uma
  feature branch ainda está em desenvolvimento.
- Depois de aplicar no Supabase, atualize também os tipos TypeScript correspondentes
  em `src/types`, se existirem para a tabela alterada.

## Aplicar uma migration

1. Abra o arquivo `.sql` mais recente ainda não aplicado.
2. Cole o conteúdo no SQL Editor do Supabase (projeto certo!) e rode.
3. Confirme que rodou sem erro antes de seguir com o código que depende da mudança.
