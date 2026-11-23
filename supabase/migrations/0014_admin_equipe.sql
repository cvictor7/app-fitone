-- App Fit One · admin controla quem tem acesso à academia.
-- Remover não apaga a conta da pessoa (a conta é dela; só ela exclui — LGPD): tira da academia
-- e bloqueia a volta pelo código. Personal removido passa os alunos e planos para outro personal.
-- O admin também pode trocar o código da academia (quem já está dentro continua).

alter table public.gym_members add column if not exists bloqueado boolean not null default false;

-- Quem foi removido não volta pelo código
create or replace function public.entrar_na_academia(p_codigo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_gym uuid;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro'; end if;
  select id into v_gym from public.gyms where codigo_convite = upper(trim(p_codigo));
  if v_gym is null then raise exception 'Código da academia não encontrado'; end if;
  if exists (select 1 from public.gym_members m where m.gym_id = v_gym and m.user_id = auth.uid() and m.bloqueado) then
    raise exception 'Seu acesso a esta academia foi encerrado. Fale com a recepção.';
  end if;
  insert into public.gym_members (gym_id, user_id, papel) values (v_gym, auth.uid(), 'aluno')
  on conflict (gym_id, user_id) do update set ativo = true;
  return v_gym;
end;
$$;

-- Lista para o admin: ativos e removidos, com quantos alunos cada personal tem
drop function if exists public.membros_academia(uuid);
create function public.membros_academia(p_gym uuid)
returns table (user_id uuid, nome text, papel public.papel, desde date, eu boolean, ativo boolean, alunos bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_admin(p_gym) then raise exception 'Só o admin'; end if;
  return query
  select m.user_id, pr.nome, m.papel, m.desde, m.user_id = auth.uid(), m.ativo and not m.bloqueado,
         (select count(*) from public.personal_alunos pa where pa.personal_id = m.user_id and pa.gym_id = p_gym and pa.ativo)
  from public.gym_members m join public.profiles pr on pr.id = m.user_id
  where m.gym_id = p_gym and (m.ativo or m.bloqueado)
  order by (m.ativo and not m.bloqueado) desc,
           case m.papel when 'admin' then 0 when 'personal' then 1 else 2 end, pr.nome;
end;
$$;

-- Remove da academia. Se for personal e p_para vier preenchido, os alunos e planos vão para p_para.
create or replace function public.remover_membro(p_gym uuid, p_user uuid, p_para uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_admin(p_gym) then raise exception 'Só o admin'; end if;
  if p_user = auth.uid() then raise exception 'Você não pode remover a si mesmo'; end if;
  if exists (select 1 from public.gym_members where gym_id = p_gym and user_id = p_user and papel = 'admin') then
    raise exception 'Não dá para remover outro admin';
  end if;
  if p_para is not null and not exists (
    select 1 from public.gym_members where gym_id = p_gym and user_id = p_para and ativo and not bloqueado
      and papel in ('personal', 'admin') and user_id <> p_user) then
    raise exception 'Quem vai receber os alunos precisa ser personal ativo';
  end if;

  if p_para is not null then
    insert into public.personal_alunos (gym_id, personal_id, aluno_id)
    select p_gym, p_para, pa.aluno_id from public.personal_alunos pa
    where pa.personal_id = p_user and pa.gym_id = p_gym and pa.ativo and pa.aluno_id <> p_para
    on conflict (personal_id, aluno_id) do update set ativo = true, ate = null;
    update public.planos set personal_id = p_para
    where personal_id = p_user and aluno_id in (
      select pa.aluno_id from public.personal_alunos pa where pa.personal_id = p_user and pa.gym_id = p_gym);
  end if;

  -- encerra os vínculos dele (como personal e como aluno de alguém)
  update public.personal_alunos set ativo = false, ate = current_date
  where gym_id = p_gym and (personal_id = p_user or aluno_id = p_user) and ativo;

  update public.gym_members set ativo = false, bloqueado = true, papel = 'aluno'
  where gym_id = p_gym and user_id = p_user;
  if not found then raise exception 'Membro não encontrado'; end if;
end;
$$;

-- Desfaz a remoção (volta como aluno)
create or replace function public.readmitir_membro(p_gym uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_admin(p_gym) then raise exception 'Só o admin'; end if;
  update public.gym_members set ativo = true, bloqueado = false, papel = 'aluno'
  where gym_id = p_gym and user_id = p_user and bloqueado;
  if not found then raise exception 'Essa pessoa não estava removida'; end if;
end;
$$;

-- Troca o código de entrada da academia (4 a 12 letras/números)
create or replace function public.trocar_codigo_academia(p_gym uuid, p_codigo text)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v text := upper(regexp_replace(coalesce(p_codigo, ''), '\s', '', 'g'));
begin
  if not public.e_admin(p_gym) then raise exception 'Só o admin'; end if;
  if v !~ '^[A-Z0-9]{4,12}$' then raise exception 'Use de 4 a 12 letras ou números, sem espaço'; end if;
  if exists (select 1 from public.gyms where codigo_convite = v and id <> p_gym) then
    raise exception 'Esse código já existe, escolha outro';
  end if;
  update public.gyms set codigo_convite = v where id = p_gym;
  return v;
end;
$$;

revoke execute on function public.membros_academia(uuid), public.remover_membro(uuid, uuid, uuid),
  public.readmitir_membro(uuid, uuid), public.trocar_codigo_academia(uuid, text) from public, anon;
grant execute on function public.membros_academia(uuid), public.remover_membro(uuid, uuid, uuid),
  public.readmitir_membro(uuid, uuid), public.trocar_codigo_academia(uuid, text) to authenticated;

notify pgrst, 'reload schema';
