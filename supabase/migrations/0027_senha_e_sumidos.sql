-- App Fit One · (1) admin redefine a senha de quem esqueceu; (2) lista de alunos sumidos para o dono.
-- Funciona sem e-mail configurado. O app gera uma senha provisória e mostra para o admin passar
-- para a pessoa; ela troca depois em Perfil → Editar perfil.
-- Só vale para quem é da mesma academia e não é admin. Pode rodar de novo sem problema.

create or replace function public.admin_redefinir_senha(p_gym uuid, p_user uuid, p_senha text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_admin(p_gym) then raise exception 'Só o admin'; end if;
  if p_user = auth.uid() then raise exception 'Para trocar a sua senha, use Editar perfil'; end if;
  if length(coalesce(p_senha, '')) < 6 then raise exception 'A senha precisa ter pelo menos 6 caracteres'; end if;
  if not exists (
    select 1 from public.gym_members
    where gym_id = p_gym and user_id = p_user and ativo and not bloqueado and papel <> 'admin'
  ) then
    raise exception 'Essa pessoa não está ativa na academia (ou é admin)';
  end if;

  update auth.users
     set encrypted_password = extensions.crypt(p_senha, extensions.gen_salt('bf')),
         updated_at = now()
   where id = p_user;
end;
$$;

revoke all on function public.admin_redefinir_senha(uuid, uuid, text) from public, anon;
grant execute on function public.admin_redefinir_senha(uuid, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Alunos sumidos: lista para o dono/admin (o painel só mostrava o número).
-- "Última vez" = o mais recente entre treino registrado e check-in na recepção.
-- Entra quem já apareceu alguma vez e não aparece há p_dias ou mais. Mostra o personal, se tiver.
create or replace function public.alunos_sumidos(p_gym uuid, p_dias integer default 14)
returns table (user_id uuid, nome text, ultima timestamptz, dias integer, personal text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_admin(p_gym) then raise exception 'Só o admin'; end if;
  return query
  with alunos as (
    select m.user_id from public.gym_members m
    where m.gym_id = p_gym and m.ativo and not m.bloqueado and m.papel = 'aluno'
  ),
  ult as (
    select a.user_id,
           greatest(
             (select max(s.concluida_em) from public.sessoes s where s.aluno_id = a.user_id and s.status = 'concluida'),
             (select max(c.criado_em) from public.checkins c where c.user_id = a.user_id and c.gym_id = p_gym)
           ) as ultima
    from alunos a
  )
  select u.user_id, pr.nome, u.ultima,
         (((now() at time zone 'America/Manaus')::date) - ((u.ultima at time zone 'America/Manaus')::date))::integer,
         (select pp.nome from public.personal_alunos pa join public.profiles pp on pp.id = pa.personal_id
           where pa.aluno_id = u.user_id and pa.gym_id = p_gym and pa.ativo limit 1)
  from ult u join public.profiles pr on pr.id = u.user_id
  where u.ultima is not null and u.ultima < now() - make_interval(days => greatest(1, p_dias))
  order by u.ultima desc;
end;
$$;

revoke all on function public.alunos_sumidos(uuid, integer) from public, anon;
grant execute on function public.alunos_sumidos(uuid, integer) to authenticated;
