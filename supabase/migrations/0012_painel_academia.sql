-- App Fit One · Fase 4: painel da academia (dono/admin).
-- Números só agregados (nenhum treino individual aparece aqui; LGPD).
-- Avisos para todos os membros. Admin define quem é personal.

create or replace function public.e_admin(p_gym uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.gym_members m
    where m.gym_id = p_gym and m.user_id = auth.uid() and m.ativo and m.papel = 'admin'
  );
$$;
grant execute on function public.e_admin(uuid) to authenticated;

-- ---------- avisos ----------
create table if not exists public.avisos (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  autor_id uuid references public.profiles (id) on delete set null,
  titulo text not null check (char_length(btrim(titulo)) between 3 and 60),
  texto text check (char_length(texto) <= 500),
  criado_em timestamptz not null default now(),
  expira_em date -- null = até apagar
);
create index if not exists avisos_gym on public.avisos (gym_id, criado_em desc);

alter table public.avisos enable row level security;

drop policy if exists "membros leem avisos" on public.avisos;
create policy "membros leem avisos" on public.avisos for select to authenticated
  using (public.e_membro(gym_id));
drop policy if exists "admin cria aviso" on public.avisos;
create policy "admin cria aviso" on public.avisos for insert to authenticated
  with check (public.e_admin(gym_id) and autor_id = auth.uid());
drop policy if exists "admin edita aviso" on public.avisos;
create policy "admin edita aviso" on public.avisos for update to authenticated
  using (public.e_admin(gym_id)) with check (public.e_admin(gym_id));
drop policy if exists "admin apaga aviso" on public.avisos;
create policy "admin apaga aviso" on public.avisos for delete to authenticated
  using (public.e_admin(gym_id));

grant select, insert, update, delete on public.avisos to authenticated;

-- ---------- números do painel ----------
create or replace function public.painel_academia(p_gym uuid)
returns table (
  membros bigint, personais bigint, novos_30d bigint,
  ativos_7d bigint, ativos_30d bigint, treinos_7d bigint, treinos_30d bigint,
  sumidos_14d bigint, por_modalidade jsonb, por_dia jsonb
) language plpgsql stable security definer set search_path = '' as $$
declare
  v_hoje date := (now() at time zone 'America/Manaus')::date;
begin
  if not public.e_admin(p_gym) then raise exception 'Só o admin da academia vê o painel'; end if;
  return query
  with alunos as (
    select m.user_id, m.desde from public.gym_members m
    where m.gym_id = p_gym and m.ativo and m.papel = 'aluno'
  ),
  s as (
    select se.aluno_id, se.modalidade, (se.concluida_em at time zone 'America/Manaus')::date as dia
    from public.sessoes se
    join alunos a on a.user_id = se.aluno_id
    where se.status = 'concluida' and se.concluida_em >= now() - interval '31 days'
  )
  select
    (select count(*) from alunos),
    (select count(*) from public.gym_members m where m.gym_id = p_gym and m.ativo and m.papel in ('personal', 'admin')),
    (select count(*) from alunos where desde > v_hoje - 30),
    (select count(distinct aluno_id) from s where dia > v_hoje - 7),
    (select count(distinct aluno_id) from s where dia > v_hoje - 30),
    (select count(*) from s where dia > v_hoje - 7),
    (select count(*) from s where dia > v_hoje - 30),
    -- já treinaram alguma vez, mas nada nos últimos 14 dias
    (select count(*) from alunos a
      where exists (select 1 from public.sessoes x where x.aluno_id = a.user_id and x.status = 'concluida')
        and not exists (select 1 from public.sessoes x where x.aluno_id = a.user_id and x.status = 'concluida'
                        and x.concluida_em >= now() - interval '14 days')),
    coalesce((select jsonb_object_agg(modalidade, n) from (
      select modalidade::text, count(*) n from s where dia > v_hoje - 30 group by modalidade) q), '{}'::jsonb),
    -- treinos por dia da semana (0 = domingo) nos últimos 30 dias
    coalesce((select jsonb_object_agg(d, n) from (
      select extract(dow from dia)::int d, count(*) n from s where dia > v_hoje - 30 group by 1) q), '{}'::jsonb);
end;
$$;

-- ---------- equipe ----------
-- Lista de membros para o admin promover alguém a personal (nome completo: é a equipe da casa)
create or replace function public.membros_academia(p_gym uuid)
returns table (user_id uuid, nome text, papel public.papel, desde date, eu boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_admin(p_gym) then raise exception 'Só o admin'; end if;
  return query
  select m.user_id, pr.nome, m.papel, m.desde, m.user_id = auth.uid()
  from public.gym_members m join public.profiles pr on pr.id = m.user_id
  where m.gym_id = p_gym and m.ativo
  order by case m.papel when 'admin' then 0 when 'personal' then 1 else 2 end, pr.nome;
end;
$$;

-- Admin troca alguém entre aluno e personal (não mexe em outro admin nem em si mesmo)
create or replace function public.definir_papel(p_gym uuid, p_user uuid, p_papel public.papel)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_admin(p_gym) then raise exception 'Só o admin'; end if;
  if p_papel not in ('aluno', 'personal') then raise exception 'Papel inválido'; end if;
  if p_user = auth.uid() then raise exception 'Você não pode mudar o seu próprio papel'; end if;
  update public.gym_members set papel = p_papel
  where gym_id = p_gym and user_id = p_user and ativo and papel <> 'admin';
  if not found then raise exception 'Membro não encontrado'; end if;
end;
$$;

revoke execute on function public.painel_academia(uuid), public.membros_academia(uuid),
  public.definir_papel(uuid, uuid, public.papel) from public, anon;
grant execute on function public.painel_academia(uuid), public.membros_academia(uuid),
  public.definir_papel(uuid, uuid, public.papel) to authenticated;

notify pgrst, 'reload schema';
