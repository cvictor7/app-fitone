-- App Fit One · transforma uma conta em ADMIN da Fit One (dono/gerente): vê a aba Academia
-- (números, avisos, equipe) além de tudo do personal. Só rode no SQL Editor do Supabase.
-- Atenção: a conta deixa de ver o lado do aluno. Use uma conta separada da sua de treino.

do $$
declare
  v_email text := 'EMAIL_DA_CONTA_ADMIN';
  v_user uuid;
  v_gym uuid;
begin
  select id into v_user from auth.users where lower(email) = lower(v_email);
  if v_user is null then raise exception 'Conta não encontrada: crie a conta no app primeiro (%)', v_email; end if;
  select id into v_gym from public.gyms where slug = 'fitone';
  insert into public.gym_members (gym_id, user_id, papel) values (v_gym, v_user, 'admin')
  on conflict (gym_id, user_id) do update set papel = 'admin', ativo = true;
end $$;

select u.email, m.papel from public.gym_members m join auth.users u on u.id = m.user_id order by m.papel;
