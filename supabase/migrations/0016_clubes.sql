-- App Fit One · Comunidade (parte 4): clubes — grupos dentro da comunidade da academia
-- (ex.: "Turma das 6h", "Hybrid de quinta", "Corrida de domingo").
-- Qualquer membro cria. Clube aberto: qualquer um da Fit One entra. Clube fechado: só com o código.
-- O feed do clube mostra só os treinos publicados pelos membros (a mesma escolha de publicar
-- do feed geral; nada novo é exposto). Nome abreviado, sempre.

create table if not exists public.clubes (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  criado_por uuid references public.profiles (id) on delete set null,
  nome text not null check (char_length(btrim(nome)) between 3 and 30),
  descricao text check (char_length(descricao) <= 200),
  fechado boolean not null default false,
  codigo text not null unique default upper(substr(md5(gen_random_uuid()::text), 1, 6)),
  criado_em timestamptz not null default now()
);
create index if not exists clubes_gym on public.clubes (gym_id);

create table if not exists public.clube_membros (
  clube_id uuid not null references public.clubes (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  dono boolean not null default false,
  entrou_em timestamptz not null default now(),
  primary key (clube_id, user_id)
);
create index if not exists clube_membros_user on public.clube_membros (user_id);

alter table public.clubes enable row level security;
alter table public.clube_membros enable row level security;

create or replace function public.e_membro_clube(p_clube uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.clube_membros where clube_id = p_clube and user_id = auth.uid());
$$;
create or replace function public.e_dono_clube(p_clube uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.clube_membros where clube_id = p_clube and user_id = auth.uid() and dono);
$$;
grant execute on function public.e_membro_clube(uuid), public.e_dono_clube(uuid) to authenticated;

-- Tudo passa pelas funções abaixo; direto na tabela só o dono/admin edita e apaga
drop policy if exists "ver clubes" on public.clubes;
create policy "ver clubes" on public.clubes for select to authenticated
  using (public.e_membro(gym_id) and (not fechado or public.e_membro_clube(id) or public.e_admin(gym_id)));
drop policy if exists "dono edita clube" on public.clubes;
create policy "dono edita clube" on public.clubes for update to authenticated
  using (public.e_dono_clube(id) or public.e_admin(gym_id)) with check (public.e_membro(gym_id));
drop policy if exists "dono apaga clube" on public.clubes;
create policy "dono apaga clube" on public.clubes for delete to authenticated
  using (public.e_dono_clube(id) or public.e_admin(gym_id));
drop policy if exists "ver minha participacao" on public.clube_membros;
create policy "ver minha participacao" on public.clube_membros for select to authenticated
  using (user_id = auth.uid());
drop policy if exists "sair do clube" on public.clube_membros;
create policy "sair do clube" on public.clube_membros for delete to authenticated
  using (user_id = auth.uid());

grant select, update, delete on public.clubes to authenticated;
grant select, delete on public.clube_membros to authenticated;

-- Criar (quem cria vira dono e já entra)
create or replace function public.criar_clube(p_gym uuid, p_nome text, p_descricao text, p_fechado boolean)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid;
begin
  if not public.e_membro(p_gym) then raise exception 'Entre na academia primeiro'; end if;
  if (select count(*) from public.clube_membros m join public.clubes c on c.id = m.clube_id
      where m.user_id = auth.uid() and m.dono) >= 5 then
    raise exception 'Você já é dono de 5 clubes';
  end if;
  insert into public.clubes (gym_id, criado_por, nome, descricao, fechado)
  values (p_gym, auth.uid(), btrim(p_nome), nullif(btrim(coalesce(p_descricao, '')), ''), coalesce(p_fechado, false))
  returning id into v_id;
  insert into public.clube_membros (clube_id, user_id, dono) values (v_id, auth.uid(), true);
  return v_id;
end;
$$;

-- Entrar: aberto pelo id; fechado só com o código
create or replace function public.entrar_clube(p_clube uuid default null, p_codigo text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  c public.clubes;
begin
  if p_codigo is not null then
    select * into c from public.clubes where codigo = upper(btrim(p_codigo));
  else
    select * into c from public.clubes where id = p_clube;
  end if;
  if c.id is null or not public.e_membro(c.gym_id) then raise exception 'Clube não encontrado'; end if;
  if c.fechado and p_codigo is null and not public.e_admin(c.gym_id) then
    raise exception 'Clube fechado: peça o código para quem está nele';
  end if;
  insert into public.clube_membros (clube_id, user_id) values (c.id, auth.uid()) on conflict do nothing;
  return c.id;
end;
$$;

-- Lista: os meus primeiro, depois os abertos da academia
create or replace function public.clubes_da_academia(p_gym uuid)
returns table (id uuid, nome text, descricao text, fechado boolean, membros bigint, sou_membro boolean, sou_dono boolean,
               codigo text, treinos_semana bigint)
language sql stable security definer set search_path = '' as $$
  select c.id, c.nome, c.descricao, c.fechado,
         (select count(*) from public.clube_membros m where m.clube_id = c.id),
         exists (select 1 from public.clube_membros m where m.clube_id = c.id and m.user_id = auth.uid()),
         exists (select 1 from public.clube_membros m where m.clube_id = c.id and m.user_id = auth.uid() and m.dono),
         case when exists (select 1 from public.clube_membros m where m.clube_id = c.id and m.user_id = auth.uid())
              then c.codigo end,
         (select count(*) from public.publicacoes p join public.clube_membros m on m.user_id = p.autor_id and m.clube_id = c.id
          where p.gym_id = c.gym_id
            and p.concluida_em >= (date_trunc('week', now() at time zone 'America/Manaus') at time zone 'America/Manaus'))
  from public.clubes c
  where c.gym_id = p_gym and public.e_membro(p_gym)
    and (not c.fechado or exists (select 1 from public.clube_membros m where m.clube_id = c.id and m.user_id = auth.uid()))
  order by 6 desc, 5 desc, c.nome;
$$;

-- Feed do clube: treinos publicados pelos membros (mesmo formato do feed geral)
create or replace function public.feed_clube(p_clube uuid, p_antes timestamptz default null, p_limite integer default 20)
returns table (
  id uuid, autor_id uuid, autor text, eu boolean, criado_em timestamptz, legenda text,
  modalidade public.modalidade, rotulo text, concluida_em timestamptz, duracao_s integer,
  volume_kg numeric, series integer, recordes integer, resumo text, curtidas bigint, eu_curti boolean,
  comentarios bigint
) language sql stable security definer set search_path = '' as $$
  select p.id, p.autor_id, public.nome_curto(pr.nome), p.autor_id = auth.uid(), p.criado_em, p.legenda,
         p.modalidade, p.rotulo, p.concluida_em, p.duracao_s, p.volume_kg, p.series, p.recordes, p.resumo,
         (select count(*) from public.curtidas c where c.publicacao_id = p.id),
         exists (select 1 from public.curtidas c where c.publicacao_id = p.id and c.user_id = auth.uid()),
         (select count(*) from public.comentarios c where c.publicacao_id = p.id)
  from public.clubes cl
  join public.clube_membros m on m.clube_id = cl.id
  join public.publicacoes p on p.autor_id = m.user_id and p.gym_id = cl.gym_id
  join public.profiles pr on pr.id = p.autor_id
  where cl.id = p_clube and public.e_membro(cl.gym_id)
    and (not cl.fechado or public.e_membro_clube(cl.id) or public.e_admin(cl.gym_id))
    and (p_antes is null or p.criado_em < p_antes)
  order by p.criado_em desc
  limit least(greatest(p_limite, 1), 50);
$$;

-- Membros e ranking da semana do clube
create or replace function public.ranking_clube(p_clube uuid)
returns table (user_id uuid, autor text, eu boolean, dono boolean, treinos bigint, minutos bigint)
language sql stable security definer set search_path = '' as $$
  select m.user_id, public.nome_curto(pr.nome), m.user_id = auth.uid(), m.dono,
         count(p.id), coalesce(sum(p.duracao_s), 0) / 60
  from public.clubes cl
  join public.clube_membros m on m.clube_id = cl.id
  join public.profiles pr on pr.id = m.user_id
  left join public.publicacoes p on p.autor_id = m.user_id and p.gym_id = cl.gym_id
    and p.concluida_em >= (date_trunc('week', now() at time zone 'America/Manaus') at time zone 'America/Manaus')
  where cl.id = p_clube and public.e_membro(cl.gym_id)
    and (not cl.fechado or public.e_membro_clube(cl.id) or public.e_admin(cl.gym_id))
  group by m.user_id, pr.nome, m.dono, m.entrou_em
  order by count(p.id) desc, sum(p.duracao_s) desc nulls last, m.entrou_em
  limit 200;
$$;

revoke execute on function public.criar_clube(uuid, text, text, boolean), public.entrar_clube(uuid, text),
  public.clubes_da_academia(uuid), public.feed_clube(uuid, timestamptz, integer), public.ranking_clube(uuid) from public, anon;
grant execute on function public.criar_clube(uuid, text, text, boolean), public.entrar_clube(uuid, text),
  public.clubes_da_academia(uuid), public.feed_clube(uuid, timestamptz, integer), public.ranking_clube(uuid) to authenticated;

notify pgrst, 'reload schema';
