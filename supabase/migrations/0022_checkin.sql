-- App Fit One · check-in na academia com QR code (para o dono ter a frequência real).
-- O QR (impresso na recepção) carrega um token secreto da academia, diferente do código de entrada.
-- Contra "check-in do sofá" com foto do QR: se o admin marcou o local da academia, o celular
-- precisa estar a até 300 m. Um check-in a cada 3 horas por pessoa.
-- O painel mostra só números (por hora, por dia); a pessoa vê os próprios check-ins.

alter table public.gyms add column if not exists checkin_token text not null default upper(substr(md5(gen_random_uuid()::text), 1, 12));
alter table public.gyms add column if not exists latitude double precision;
alter table public.gyms add column if not exists longitude double precision;

create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  criado_em timestamptz not null default now(),
  distancia_m integer -- distância até a academia na hora (null = sem local configurado)
);
create index if not exists checkins_gym on public.checkins (gym_id, criado_em desc);
create index if not exists checkins_user on public.checkins (user_id, criado_em desc);

alter table public.checkins enable row level security;
drop policy if exists "vejo os meus" on public.checkins;
create policy "vejo os meus" on public.checkins for select to authenticated using (user_id = auth.uid());
grant select on public.checkins to authenticated;

-- distância em metros (haversine)
create or replace function public.distancia_m(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns double precision language sql immutable set search_path = '' as $$
  select 2 * 6371000 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) + cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)));
$$;

-- Faz o check-in. Devolve: ok, já tinha (nas últimas 3 h), hora e quantos no mês.
create or replace function public.fazer_checkin(p_token text, p_lat double precision default null, p_lng double precision default null)
returns table (novo boolean, criado_em timestamptz, no_mes bigint)
language plpgsql security definer set search_path = '' as $$
declare
  g public.gyms;
  v_dist double precision;
  v_ultimo timestamptz;
begin
  select * into g from public.gyms where checkin_token = upper(btrim(p_token));
  if g.id is null then raise exception 'QR inválido'; end if;
  if not public.e_membro(g.id) then raise exception 'Entre na academia primeiro'; end if;

  if g.latitude is not null then
    if p_lat is null then raise exception 'Precisa da localização para o check-in'; end if;
    v_dist := public.distancia_m(g.latitude, g.longitude, p_lat, p_lng);
    if v_dist > 300 then raise exception 'Você precisa estar na academia (está a % m)', round(v_dist); end if;
  end if;

  select max(c.criado_em) into v_ultimo from public.checkins c
  where c.gym_id = g.id and c.user_id = auth.uid() and c.criado_em > now() - interval '3 hours';

  if v_ultimo is null then
    insert into public.checkins (gym_id, user_id, distancia_m) values (g.id, auth.uid(), round(v_dist))
    returning checkins.criado_em into v_ultimo;
    novo := true;
  else
    novo := false;
  end if;
  criado_em := v_ultimo;
  select count(*) into no_mes from public.checkins c
  where c.gym_id = g.id and c.user_id = auth.uid()
    and c.criado_em >= date_trunc('month', now() at time zone 'America/Manaus') at time zone 'America/Manaus';
  return next;
end;
$$;

-- Admin: QR atual, local configurado
create or replace function public.config_checkin(p_gym uuid)
returns table (token text, latitude double precision, longitude double precision)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.e_admin(p_gym) then raise exception 'Só o admin'; end if;
  return query select g.checkin_token, g.latitude, g.longitude from public.gyms g where g.id = p_gym;
end;
$$;

-- Admin: novo QR (o impresso antigo para de funcionar)
create or replace function public.novo_qr_checkin(p_gym uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v text := upper(substr(md5(gen_random_uuid()::text), 1, 12));
begin
  if not public.e_admin(p_gym) then raise exception 'Só o admin'; end if;
  update public.gyms set checkin_token = v where id = p_gym;
  return v;
end;
$$;

-- Admin: marca o local da academia (feito no celular dele, estando lá). null tira a trava.
create or replace function public.definir_local_academia(p_gym uuid, p_lat double precision, p_lng double precision)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_admin(p_gym) then raise exception 'Só o admin'; end if;
  update public.gyms set latitude = p_lat, longitude = p_lng where id = p_gym;
end;
$$;

-- Admin: números de frequência (só totais)
create or replace function public.painel_checkins(p_gym uuid)
returns table (hoje bigint, semana bigint, mes bigint, pessoas_30d bigint, por_hora jsonb, por_dia jsonb)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_hoje date := (now() at time zone 'America/Manaus')::date;
begin
  if not public.e_admin(p_gym) then raise exception 'Só o admin'; end if;
  return query
  with c as (
    select (x.criado_em at time zone 'America/Manaus') as local, x.user_id from public.checkins x
    where x.gym_id = p_gym and x.criado_em >= now() - interval '31 days'
  )
  select
    (select count(*) from c where local::date = v_hoje),
    (select count(*) from c where local::date > v_hoje - 7),
    (select count(*) from c where local::date > v_hoje - 30),
    (select count(distinct user_id) from c where local::date > v_hoje - 30),
    coalesce((select jsonb_object_agg(h, n) from (
      select extract(hour from local)::int h, count(*) n from c where local::date > v_hoje - 30 group by 1) q), '{}'::jsonb),
    coalesce((select jsonb_object_agg(d, n) from (
      select extract(dow from local)::int d, count(*) n from c where local::date > v_hoje - 30 group by 1) q), '{}'::jsonb);
end;
$$;

revoke execute on function public.fazer_checkin(text, double precision, double precision), public.config_checkin(uuid),
  public.novo_qr_checkin(uuid), public.definir_local_academia(uuid, double precision, double precision),
  public.painel_checkins(uuid) from public, anon;
grant execute on function public.fazer_checkin(text, double precision, double precision), public.config_checkin(uuid),
  public.novo_qr_checkin(uuid), public.definir_local_academia(uuid, double precision, double precision),
  public.painel_checkins(uuid) to authenticated;

-- o token do QR não pode vazar pela leitura normal da tabela gyms (membros leem gyms):
-- tira a leitura da tabela inteira e devolve só as colunas que o app usa
revoke select on public.gyms from authenticated, anon;
grant select (id, nome, slug, codigo_convite, criado_em, latitude, longitude) on public.gyms to authenticated;

notify pgrst, 'reload schema';
