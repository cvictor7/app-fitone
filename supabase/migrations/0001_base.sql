-- App Fit One · Etapa 3 · banco da Fase 1
-- Rodar inteiro no SQL Editor do Supabase (uma vez só).
-- Regra geral: RLS ligado em todas as tabelas; cada pessoa só vê o que deve.

-- =====================================================================
-- Tipos
-- =====================================================================
create type public.modalidade as enum ('musculacao', 'hybrid', 'cross', 'corrida', 'bike', 'hyrox', 'livre');
create type public.papel as enum ('aluno', 'personal', 'admin');
create type public.origem_sessao as enum ('app', 'health_connect', 'apple_saude', 'strava', 'garmin');
create type public.status_sessao as enum ('em_andamento', 'concluida', 'descartada');
create type public.tipo_medida as enum ('carga_reps', 'reps', 'tempo', 'distancia');

-- =====================================================================
-- Academia e pessoas
-- =====================================================================
create table public.gyms (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  slug text not null unique,
  codigo_convite text not null unique,
  criado_em timestamptz not null default now()
);

-- 1 linha por usuário. Sem peso, altura, medidas ou data de nascimento. Nunca.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  foto_url text,
  criado_em timestamptz not null default now()
);

create table public.gym_members (
  gym_id uuid not null references public.gyms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  papel public.papel not null default 'aluno',
  ativo boolean not null default true,
  desde date not null default current_date,
  primary key (gym_id, user_id)
);

create table public.personal_alunos (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  personal_id uuid not null references public.profiles (id) on delete cascade,
  aluno_id uuid not null references public.profiles (id) on delete cascade,
  ativo boolean not null default true,
  desde date not null default current_date,
  ate date,
  unique (personal_id, aluno_id),
  check (personal_id <> aluno_id)
);
create index on public.personal_alunos (aluno_id);

create table public.personal_convites (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  personal_id uuid not null references public.profiles (id) on delete cascade,
  codigo text not null unique,
  expira_em timestamptz not null default now() + interval '7 days',
  usado_por uuid references public.profiles (id) on delete set null,
  usado_em timestamptz
);

-- LGPD: histórico de consentimentos. Nunca apaga linha, só revoga.
create table public.consentimentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  tipo text not null check (tipo in ('termos', 'privacidade', 'compartilhar_com_personal', 'dados_saude', 'comunidade')),
  versao text not null,
  aceito_em timestamptz not null default now(),
  revogado_em timestamptz
);
create index on public.consentimentos (user_id, tipo);

-- =====================================================================
-- Exercícios e planos
-- =====================================================================
create table public.exercicios (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid references public.gyms (id) on delete cascade, -- null = catálogo geral
  nome text not null,
  grupo text not null,
  equipamento text,
  tipo_medida public.tipo_medida not null default 'carga_reps',
  midia_url text,
  criado_por uuid references public.profiles (id) on delete set null
);
create unique index exercicios_nome_unico on public.exercicios (coalesce(gym_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(nome));

-- Plano do aluno. aluno_id null = modelo reutilizável do personal.
create table public.planos (
  id uuid primary key default gen_random_uuid(),
  gym_id uuid not null references public.gyms (id) on delete cascade,
  personal_id uuid not null references public.profiles (id) on delete cascade,
  aluno_id uuid references public.profiles (id) on delete cascade,
  nome text not null,
  inicio date,
  fim date,
  ativo boolean not null default true,
  observacao text,
  criado_em timestamptz not null default now()
);
-- Só 1 plano ativo por aluno
create unique index planos_um_ativo_por_aluno on public.planos (aluno_id) where ativo and aluno_id is not null;
create index on public.planos (personal_id);

create table public.treinos (
  id uuid primary key default gen_random_uuid(),
  plano_id uuid not null references public.planos (id) on delete cascade,
  letra text not null,
  nome text not null,
  ordem smallint not null,
  modalidade public.modalidade not null default 'musculacao',
  -- Dias em que o personal quer este treino (0 = domingo ... 6 = sábado). Vazio = segue a ordem.
  dias_semana smallint[] not null default '{}',
  unique (plano_id, letra)
);

create table public.treino_exercicios (
  id uuid primary key default gen_random_uuid(),
  treino_id uuid not null references public.treinos (id) on delete cascade,
  exercicio_id uuid not null references public.exercicios (id),
  ordem smallint not null,
  series smallint not null check (series between 1 and 20),
  reps_min smallint not null check (reps_min > 0),
  reps_max smallint not null,
  carga_sugerida_kg numeric(6, 2),
  descanso_s smallint not null default 90,
  observacao text,
  check (reps_max >= reps_min)
);
create index on public.treino_exercicios (treino_id, ordem);

-- =====================================================================
-- Treinos feitos
-- =====================================================================
create table public.sessoes (
  id uuid primary key default gen_random_uuid(), -- o app gera o id no celular (funciona offline)
  aluno_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  gym_id uuid references public.gyms (id) on delete set null,
  modalidade public.modalidade not null,
  treino_id uuid references public.treinos (id) on delete set null,
  origem public.origem_sessao not null default 'app',
  id_externo text,
  iniciada_em timestamptz not null default now(),
  concluida_em timestamptz,
  duracao_s integer,
  volume_kg numeric(10, 2) not null default 0,
  sensacao smallint check (sensacao between 1 and 5),
  observacao text,
  status public.status_sessao not null default 'em_andamento',
  unique (origem, id_externo)
);
create index on public.sessoes (aluno_id, iniciada_em desc);

create table public.series (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null references public.sessoes (id) on delete cascade,
  exercicio_id uuid not null references public.exercicios (id),
  treino_exercicio_id uuid references public.treino_exercicios (id) on delete set null,
  numero smallint not null,
  carga_kg numeric(6, 2),
  reps smallint,
  tempo_s integer,
  feita_em timestamptz not null default now()
);
create index on public.series (sessao_id);
create index on public.series (exercicio_id, feita_em desc);

-- Preenchida só pelo banco (trigger), nunca pelo app.
create table public.recordes (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.profiles (id) on delete cascade,
  exercicio_id uuid not null references public.exercicios (id),
  tipo text not null check (tipo in ('carga_max', '1rm_estimado', 'reps_max')),
  valor numeric(8, 2) not null,
  serie_id uuid references public.series (id) on delete set null,
  alcancado_em timestamptz not null default now()
);
create index on public.recordes (aluno_id, exercicio_id, tipo, valor desc);

-- =====================================================================
-- Funções de apoio para as regras de acesso
-- (security definer = rodam com permissão do banco, para não entrar em loop de RLS)
-- =====================================================================
create function public.e_membro(p_gym uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.gym_members m
    where m.gym_id = p_gym and m.user_id = auth.uid() and m.ativo
  );
$$;

create function public.e_personal_na(p_gym uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.gym_members m
    where m.gym_id = p_gym and m.user_id = auth.uid() and m.ativo and m.papel in ('personal', 'admin')
  );
$$;

-- Vínculo ativo: personal (quem chama) → aluno
create function public.personal_vinculado(p_aluno uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.personal_alunos pa
    where pa.personal_id = auth.uid() and pa.aluno_id = p_aluno and pa.ativo
  );
$$;

-- Vínculo ativo E o aluno deixou o personal ver os treinos (consentimento)
create function public.personal_ve_treinos(p_aluno uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select public.personal_vinculado(p_aluno) and exists (
    select 1 from public.consentimentos c
    where c.user_id = p_aluno and c.tipo = 'compartilhar_com_personal' and c.revogado_em is null
  );
$$;

-- Quem chama é aluno de p_personal
create function public.meu_personal(p_personal uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.personal_alunos pa
    where pa.aluno_id = auth.uid() and pa.personal_id = p_personal and pa.ativo
  );
$$;

create function public.pode_ver_plano(p_plano uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.planos p
    where p.id = p_plano and (p.aluno_id = auth.uid() or p.personal_id = auth.uid())
  );
$$;

create function public.pode_editar_plano(p_plano uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.planos p where p.id = p_plano and p.personal_id = auth.uid());
$$;

create function public.dono_da_sessao(p_sessao uuid)
returns uuid language sql stable security definer set search_path = '' as $$
  select s.aluno_id from public.sessoes s where s.id = p_sessao;
$$;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.gyms enable row level security;
alter table public.profiles enable row level security;
alter table public.gym_members enable row level security;
alter table public.personal_alunos enable row level security;
alter table public.personal_convites enable row level security;
alter table public.consentimentos enable row level security;
alter table public.exercicios enable row level security;
alter table public.planos enable row level security;
alter table public.treinos enable row level security;
alter table public.treino_exercicios enable row level security;
alter table public.sessoes enable row level security;
alter table public.series enable row level security;
alter table public.recordes enable row level security;

-- Academia: só quem é membro vê. Entrar = função entrar_na_academia(código).
create policy "membro ve a academia" on public.gyms for select to authenticated
  using (public.e_membro(id));

-- Perfil: o próprio, o personal vê os alunos vinculados, o aluno vê o próprio personal.
create policy "ver perfil" on public.profiles for select to authenticated
  using (id = auth.uid() or public.personal_vinculado(id) or public.meu_personal(id));
create policy "editar o proprio perfil" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy "ver minhas participacoes" on public.gym_members for select to authenticated
  using (user_id = auth.uid());

create policy "ver vinculos" on public.personal_alunos for select to authenticated
  using (personal_id = auth.uid() or aluno_id = auth.uid());
-- Qualquer um dos dois pode encerrar o vínculo (ativo = false)
create policy "encerrar vinculo" on public.personal_alunos for update to authenticated
  using (personal_id = auth.uid() or aluno_id = auth.uid())
  with check (personal_id = auth.uid() or aluno_id = auth.uid());

create policy "personal ve os proprios convites" on public.personal_convites for select to authenticated
  using (personal_id = auth.uid());
create policy "personal apaga os proprios convites" on public.personal_convites for delete to authenticated
  using (personal_id = auth.uid());

create policy "ver meus consentimentos" on public.consentimentos for select to authenticated
  using (user_id = auth.uid());
create policy "dar consentimento" on public.consentimentos for insert to authenticated
  with check (user_id = auth.uid());
create policy "revogar consentimento" on public.consentimentos for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "ver exercicios" on public.exercicios for select to authenticated
  using (gym_id is null or public.e_membro(gym_id));
create policy "personal cria exercicio da academia" on public.exercicios for insert to authenticated
  with check (gym_id is not null and public.e_personal_na(gym_id) and criado_por = auth.uid());

create policy "ver planos" on public.planos for select to authenticated
  using (aluno_id = auth.uid() or personal_id = auth.uid());
create policy "personal cria plano" on public.planos for insert to authenticated
  with check (personal_id = auth.uid() and public.e_personal_na(gym_id)
              and (aluno_id is null or public.personal_vinculado(aluno_id)));
create policy "personal edita plano" on public.planos for update to authenticated
  using (personal_id = auth.uid())
  with check (personal_id = auth.uid() and (aluno_id is null or public.personal_vinculado(aluno_id)));
create policy "personal apaga plano" on public.planos for delete to authenticated
  using (personal_id = auth.uid());

create policy "ver treinos" on public.treinos for select to authenticated
  using (public.pode_ver_plano(plano_id));
create policy "personal mexe nos treinos" on public.treinos for all to authenticated
  using (public.pode_editar_plano(plano_id)) with check (public.pode_editar_plano(plano_id));

create policy "ver exercicios do treino" on public.treino_exercicios for select to authenticated
  using (exists (select 1 from public.treinos t where t.id = treino_id and public.pode_ver_plano(t.plano_id)));
create policy "personal mexe nos exercicios do treino" on public.treino_exercicios for all to authenticated
  using (exists (select 1 from public.treinos t where t.id = treino_id and public.pode_editar_plano(t.plano_id)))
  with check (exists (select 1 from public.treinos t where t.id = treino_id and public.pode_editar_plano(t.plano_id)));

create policy "aluno mexe nas proprias sessoes" on public.sessoes for all to authenticated
  using (aluno_id = auth.uid()) with check (aluno_id = auth.uid());
create policy "personal ve sessoes com permissao" on public.sessoes for select to authenticated
  using (public.personal_ve_treinos(aluno_id));

create policy "aluno mexe nas proprias series" on public.series for all to authenticated
  using (public.dono_da_sessao(sessao_id) = auth.uid())
  with check (public.dono_da_sessao(sessao_id) = auth.uid());
create policy "personal ve series com permissao" on public.series for select to authenticated
  using (public.personal_ve_treinos(public.dono_da_sessao(sessao_id)));

create policy "ver recordes" on public.recordes for select to authenticated
  using (aluno_id = auth.uid() or public.personal_ve_treinos(aluno_id));

-- =====================================================================
-- Gatilhos
-- =====================================================================

-- Cria o perfil quando a pessoa se cadastra
create function public.criar_perfil()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', ''));
  return new;
end;
$$;
create trigger ao_cadastrar after insert on auth.users
  for each row execute function public.criar_perfil();

-- Ao concluir: calcula volume e duração
create function public.fechar_sessao()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'concluida' and old.status is distinct from 'concluida' then
    new.concluida_em := coalesce(new.concluida_em, now());
    new.duracao_s := coalesce(new.duracao_s, extract(epoch from new.concluida_em - new.iniciada_em)::int);
    new.volume_kg := coalesce((
      select sum(coalesce(s.carga_kg, 0) * coalesce(s.reps, 0)) from public.series s where s.sessao_id = new.id
    ), 0);
  end if;
  return new;
end;
$$;
create trigger antes_de_concluir before update on public.sessoes
  for each row execute function public.fechar_sessao();

-- Ao concluir: grava recordes novos (carga máxima e 1RM estimado por Epley, só séries de até 12 reps)
create function public.registrar_recordes()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  if new.status <> 'concluida' or old.status = 'concluida' then
    return new;
  end if;

  for r in
    select distinct on (s.exercicio_id) s.exercicio_id, s.id as serie_id, s.carga_kg as valor
    from public.series s
    where s.sessao_id = new.id and s.carga_kg > 0 and s.reps > 0
    order by s.exercicio_id, s.carga_kg desc, s.reps desc
  loop
    if r.valor > coalesce((
      select max(x.valor) from public.recordes x
      where x.aluno_id = new.aluno_id and x.exercicio_id = r.exercicio_id and x.tipo = 'carga_max'
    ), 0) then
      insert into public.recordes (aluno_id, exercicio_id, tipo, valor, serie_id, alcancado_em)
      values (new.aluno_id, r.exercicio_id, 'carga_max', r.valor, r.serie_id, new.concluida_em);
    end if;
  end loop;

  for r in
    select distinct on (s.exercicio_id) s.exercicio_id, s.id as serie_id,
           round(s.carga_kg * (1 + s.reps / 30.0), 1) as valor
    from public.series s
    where s.sessao_id = new.id and s.carga_kg > 0 and s.reps between 1 and 12
    order by s.exercicio_id, s.carga_kg * (1 + s.reps / 30.0) desc
  loop
    if r.valor > coalesce((
      select max(x.valor) from public.recordes x
      where x.aluno_id = new.aluno_id and x.exercicio_id = r.exercicio_id and x.tipo = '1rm_estimado'
    ), 0) then
      insert into public.recordes (aluno_id, exercicio_id, tipo, valor, serie_id, alcancado_em)
      values (new.aluno_id, r.exercicio_id, '1rm_estimado', r.valor, r.serie_id, new.concluida_em);
    end if;
  end loop;

  return new;
end;
$$;
create trigger depois_de_concluir after update on public.sessoes
  for each row execute function public.registrar_recordes();

-- =====================================================================
-- Funções chamadas pelo app (RPC)
-- =====================================================================

-- Aluno digita o código da academia
create function public.entrar_na_academia(p_codigo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_gym uuid;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro'; end if;
  select id into v_gym from public.gyms where codigo_convite = upper(trim(p_codigo));
  if v_gym is null then raise exception 'Código da academia não encontrado'; end if;
  insert into public.gym_members (gym_id, user_id, papel) values (v_gym, auth.uid(), 'aluno')
  on conflict (gym_id, user_id) do update set ativo = true;
  return v_gym;
end;
$$;

-- Personal gera um código de 6 caracteres para o aluno (sem 0/O e 1/I para não confundir)
create function public.gerar_convite_personal(p_gym uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare
  v_codigo text;
  v_letras constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if not public.e_personal_na(p_gym) then raise exception 'Só personal pode convidar aluno'; end if;
  loop
    select string_agg(substr(v_letras, 1 + floor(random() * length(v_letras))::int, 1), '')
      into v_codigo from generate_series(1, 6);
    exit when not exists (select 1 from public.personal_convites where codigo = v_codigo);
  end loop;
  insert into public.personal_convites (gym_id, personal_id, codigo) values (p_gym, auth.uid(), v_codigo);
  return v_codigo;
end;
$$;

-- Aluno digita o código do personal
create function public.usar_convite_personal(p_codigo text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  c public.personal_convites%rowtype;
begin
  if auth.uid() is null then raise exception 'Faça login primeiro'; end if;
  select * into c from public.personal_convites
  where codigo = upper(trim(p_codigo)) and usado_por is null and expira_em > now()
  for update;
  if c.id is null then raise exception 'Código inválido ou vencido'; end if;
  if c.personal_id = auth.uid() then raise exception 'Esse código é seu'; end if;

  insert into public.gym_members (gym_id, user_id, papel) values (c.gym_id, auth.uid(), 'aluno')
  on conflict (gym_id, user_id) do update set ativo = true;
  insert into public.personal_alunos (gym_id, personal_id, aluno_id) values (c.gym_id, c.personal_id, auth.uid())
  on conflict (personal_id, aluno_id) do update set ativo = true, ate = null;
  update public.personal_convites set usado_por = auth.uid(), usado_em = now() where id = c.id;
  return c.personal_id;
end;
$$;

-- Funções internas não ficam expostas para quem não está logado
revoke execute on all functions in schema public from public, anon;
grant execute on function public.entrar_na_academia(text) to authenticated;
grant execute on function public.gerar_convite_personal(uuid) to authenticated;
grant execute on function public.usar_convite_personal(text) to authenticated;
grant execute on function public.e_membro(uuid), public.e_personal_na(uuid), public.personal_vinculado(uuid),
  public.personal_ve_treinos(uuid), public.meu_personal(uuid), public.pode_ver_plano(uuid),
  public.pode_editar_plano(uuid), public.dono_da_sessao(uuid) to authenticated;
