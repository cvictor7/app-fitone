-- App Fit One · Comunidade (parte 2): desafios da academia.
-- O personal (ou admin) cria; o aluno escolhe entrar. Entrar é o consentimento para que os
-- outros participantes vejam o progresso dele, com nome abreviado. Ele pode sair quando quiser.
-- O progresso vem dos treinos concluídos no período, contados pelo banco.

create table if not exists public.desafios (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  criado_por uuid references public.profiles (id) on delete set null,
  titulo text not null check (char_length(btrim(titulo)) between 3 and 40),
  descricao text check (char_length(descricao) <= 300),
  medida text not null check (medida in ('treinos', 'minutos')),
  meta integer not null check (meta between 1 and 100000),
  modalidade public.modalidade, -- null = qualquer modalidade
  inicio date not null,
  fim date not null,
  criado_em timestamptz not null default now(),
  check (fim >= inicio and fim - inicio <= 366)
);
create index if not exists desafios_gym on public.desafios (gym_id, fim desc);

create table if not exists public.desafio_participantes (
  desafio_id uuid not null references public.desafios (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  entrou_em timestamptz not null default now(),
  primary key (desafio_id, user_id)
);

alter table public.desafios enable row level security;
alter table public.desafio_participantes enable row level security;

drop policy if exists "membros veem desafios" on public.desafios;
create policy "membros veem desafios" on public.desafios for select to authenticated
  using (public.e_membro(gym_id));
drop policy if exists "personal cria desafio" on public.desafios;
create policy "personal cria desafio" on public.desafios for insert to authenticated
  with check (public.e_personal_na(gym_id) and criado_por = auth.uid());
drop policy if exists "personal edita desafio" on public.desafios;
create policy "personal edita desafio" on public.desafios for update to authenticated
  using (public.e_personal_na(gym_id)) with check (public.e_personal_na(gym_id));
drop policy if exists "personal apaga desafio" on public.desafios;
create policy "personal apaga desafio" on public.desafios for delete to authenticated
  using (public.e_personal_na(gym_id));

-- A lista de participantes com nomes sai só pela função ranking_desafio
drop policy if exists "vejo minha participacao" on public.desafio_participantes;
create policy "vejo minha participacao" on public.desafio_participantes for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "entrar no desafio" on public.desafio_participantes;
create policy "entrar no desafio" on public.desafio_participantes for insert to authenticated
  with check (user_id = auth.uid() and exists (
    select 1 from public.desafios d
    where d.id = desafio_id and public.e_membro(d.gym_id)
      and d.fim >= (now() at time zone 'America/Manaus')::date));
drop policy if exists "sair do desafio" on public.desafio_participantes;
create policy "sair do desafio" on public.desafio_participantes for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.desafios to authenticated;
grant select, insert, delete on public.desafio_participantes to authenticated;

-- Progresso de uma pessoa num desafio (uso interno das funções abaixo)
create or replace function public.progresso_desafio(p_desafio uuid, p_user uuid)
returns integer language sql stable security definer set search_path = '' as $$
  select coalesce(case when d.medida = 'treinos' then count(s.id) else sum(s.duracao_s) / 60 end, 0)::integer
  from public.desafios d
  left join public.sessoes s
    on s.aluno_id = p_user and s.status = 'concluida'
   and (d.modalidade is null or s.modalidade = d.modalidade)
   and (s.concluida_em at time zone 'America/Manaus')::date between d.inicio and d.fim
  where d.id = p_desafio
  group by d.medida;
$$;
revoke execute on function public.progresso_desafio(uuid, uuid) from public, anon, authenticated;

-- Desafios da academia, com quantos entraram e o meu progresso
create or replace function public.desafios_academia(p_gym uuid)
returns table (
  id uuid, titulo text, descricao text, medida text, meta integer, modalidade public.modalidade,
  inicio date, fim date, participantes bigint, entrei boolean, meu_progresso integer
) language sql stable security definer set search_path = '' as $$
  select d.id, d.titulo, d.descricao, d.medida, d.meta, d.modalidade, d.inicio, d.fim,
         (select count(*) from public.desafio_participantes x where x.desafio_id = d.id),
         exists (select 1 from public.desafio_participantes x where x.desafio_id = d.id and x.user_id = auth.uid()),
         public.progresso_desafio(d.id, auth.uid())
  from public.desafios d
  where d.gym_id = p_gym and public.e_membro(p_gym)
  order by (d.fim < (now() at time zone 'America/Manaus')::date), d.fim, d.criado_em desc;
$$;

-- Ranking de um desafio (só participantes, nome abreviado)
create or replace function public.ranking_desafio(p_desafio uuid)
returns table (user_id uuid, autor text, eu boolean, progresso integer)
language sql stable security definer set search_path = '' as $$
  select x.user_id, public.nome_curto(pr.nome), x.user_id = auth.uid(), public.progresso_desafio(d.id, x.user_id)
  from public.desafios d
  join public.desafio_participantes x on x.desafio_id = d.id
  join public.profiles pr on pr.id = x.user_id
  where d.id = p_desafio and public.e_membro(d.gym_id)
  order by 4 desc, x.entrou_em
  limit 100;
$$;

revoke execute on function public.desafios_academia(uuid), public.ranking_desafio(uuid) from public, anon;
grant execute on function public.desafios_academia(uuid), public.ranking_desafio(uuid) to authenticated;

notify pgrst, 'reload schema';
