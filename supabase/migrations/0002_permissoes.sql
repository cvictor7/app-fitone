-- App Fit One · permissões de acesso pelo app
-- Projetos novos do Supabase não liberam tabelas novas para o app automaticamente.
-- Aqui liberamos para quem está logado (authenticated); quem decide O QUE cada um vê
-- continuam sendo as regras de RLS do 0001. Quem não está logado (anon) não ganha nada.

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;

-- Tabelas criadas no futuro já nascem liberadas para quem está logado (RLS continua valendo)
alter default privileges in schema public grant select, insert, update, delete on tables to authenticated;

-- Garante que nenhuma tabela ficou sem RLS
do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;
