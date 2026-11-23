-- App Fit One · Comunidade (Fase 3, parte 1): feed da academia, "Boa!" (curtida) e ranking da semana.
-- Privacidade (LGPD): nada é publicado sozinho. O aluno escolhe publicar cada treino.
-- O feed só mostra o nome abreviado ("Carlos V."), só para membros da mesma academia,
-- e nunca mostra peso corporal ou medidas. O ranking conta só treinos publicados.

create table if not exists public.publicacoes (
  id uuid primary key default gen_random_uuid(),
  sessao_id uuid not null unique references public.sessoes (id) on delete cascade,
  autor_id uuid not null references public.profiles (id) on delete cascade,
  gym_id uuid not null references public.gyms (id) on delete cascade,
  criado_em timestamptz not null default now(),
  legenda text check (char_length(legenda) <= 280),
  -- retrato do treino na hora de publicar (os outros não leem a tabela de sessões)
  modalidade public.modalidade not null,
  rotulo text not null check (char_length(rotulo) between 1 and 12),
  concluida_em timestamptz not null,
  duracao_s integer,
  volume_kg numeric(10, 2) not null default 0,
  series integer not null default 0,
  recordes integer not null default 0,
  resumo text check (char_length(resumo) <= 300)
);
create index if not exists publicacoes_feed on public.publicacoes (gym_id, criado_em desc);

create table if not exists public.curtidas (
  publicacao_id uuid not null references public.publicacoes (id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  criado_em timestamptz not null default now(),
  primary key (publicacao_id, user_id)
);

alter table public.publicacoes enable row level security;
alter table public.curtidas enable row level security;

drop policy if exists "membros veem publicacoes" on public.publicacoes;
create policy "membros veem publicacoes" on public.publicacoes for select to authenticated
  using (public.e_membro(gym_id));
drop policy if exists "autor apaga a sua" on public.publicacoes;
create policy "autor apaga a sua" on public.publicacoes for delete to authenticated
  using (autor_id = auth.uid());
-- inserir só pela função publicar_treino (ela calcula os números no banco)

drop policy if exists "membros veem curtidas" on public.curtidas;
create policy "membros veem curtidas" on public.curtidas for select to authenticated
  using (exists (select 1 from public.publicacoes p where p.id = publicacao_id and public.e_membro(p.gym_id)));
drop policy if exists "curtir" on public.curtidas;
create policy "curtir" on public.curtidas for insert to authenticated
  with check (user_id = auth.uid()
    and exists (select 1 from public.publicacoes p where p.id = publicacao_id and public.e_membro(p.gym_id)));
drop policy if exists "descurtir" on public.curtidas;
create policy "descurtir" on public.curtidas for delete to authenticated
  using (user_id = auth.uid());

grant select, delete on public.publicacoes to authenticated;
grant select, insert, delete on public.curtidas to authenticated;

-- "Carlos Victor Lima" -> "Carlos V."
create or replace function public.nome_curto(p_nome text)
returns text language sql immutable set search_path = '' as $$
  select case
    when coalesce(btrim(p_nome), '') = '' then 'Aluno'
    when array_length(regexp_split_to_array(btrim(p_nome), '\s+'), 1) = 1 then btrim(p_nome)
    else split_part(btrim(p_nome), ' ', 1) || ' ' ||
      upper(left((regexp_split_to_array(btrim(p_nome), '\s+'))[2], 1)) || '.'
  end;
$$;

-- Publica um treino concluído do próprio aluno. Os números vêm do banco, não do celular.
create or replace function public.publicar_treino(p_sessao uuid, p_rotulo text, p_legenda text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  s public.sessoes;
  v_gym uuid;
  v_series integer;
  v_recordes integer;
  v_id uuid;
begin
  select * into s from public.sessoes where id = p_sessao;
  if s.id is null or s.aluno_id <> auth.uid() then raise exception 'Treino não encontrado'; end if;
  if s.status <> 'concluida' then raise exception 'Termine o treino antes de publicar'; end if;

  v_gym := coalesce(s.gym_id, (select m.gym_id from public.gym_members m
                               where m.user_id = auth.uid() and m.ativo order by m.desde limit 1));
  if v_gym is null or not public.e_membro(v_gym) then raise exception 'Entre na academia primeiro'; end if;

  select count(*) into v_series from public.series where sessao_id = s.id;
  select count(*) into v_recordes from public.recordes r
    join public.series se on se.id = r.serie_id where se.sessao_id = s.id and r.tipo = 'carga_max';

  insert into public.publicacoes (sessao_id, autor_id, gym_id, legenda, modalidade, rotulo, concluida_em,
                                  duracao_s, volume_kg, series, recordes, resumo)
  values (s.id, auth.uid(), v_gym, nullif(btrim(left(p_legenda, 280)), ''), s.modalidade,
          left(coalesce(nullif(btrim(upper(p_rotulo)), ''), 'TREINO'), 12),
          coalesce(s.concluida_em, now()), s.duracao_s, s.volume_kg, v_series, v_recordes,
          case when s.modalidade <> 'musculacao' then left(s.observacao, 300) end)
  on conflict (sessao_id) do update set legenda = excluded.legenda
  returning id into v_id;
  return v_id;
end;
$$;

-- Feed da academia (paginado por data), com nome abreviado e "Boa!"
create or replace function public.feed_comunidade(p_gym uuid, p_antes timestamptz default null, p_limite integer default 20)
returns table (
  id uuid, autor_id uuid, autor text, eu boolean, criado_em timestamptz, legenda text,
  modalidade public.modalidade, rotulo text, concluida_em timestamptz, duracao_s integer,
  volume_kg numeric, series integer, recordes integer, resumo text, curtidas bigint, eu_curti boolean
) language sql stable security definer set search_path = '' as $$
  select p.id, p.autor_id, public.nome_curto(pr.nome), p.autor_id = auth.uid(), p.criado_em, p.legenda,
         p.modalidade, p.rotulo, p.concluida_em, p.duracao_s, p.volume_kg, p.series, p.recordes, p.resumo,
         (select count(*) from public.curtidas c where c.publicacao_id = p.id),
         exists (select 1 from public.curtidas c where c.publicacao_id = p.id and c.user_id = auth.uid())
  from public.publicacoes p
  join public.profiles pr on pr.id = p.autor_id
  where p.gym_id = p_gym and public.e_membro(p_gym)
    and (p_antes is null or p.criado_em < p_antes)
  order by p.criado_em desc
  limit least(greatest(p_limite, 1), 50);
$$;

-- Ranking da semana (segunda a domingo, horário de Manaus): quem mais treinou e publicou.
create or replace function public.ranking_semana(p_gym uuid)
returns table (autor_id uuid, autor text, eu boolean, treinos bigint, minutos bigint)
language sql stable security definer set search_path = '' as $$
  select p.autor_id, public.nome_curto(pr.nome), p.autor_id = auth.uid(),
         count(*), coalesce(sum(p.duracao_s), 0) / 60
  from public.publicacoes p
  join public.profiles pr on pr.id = p.autor_id
  where p.gym_id = p_gym and public.e_membro(p_gym)
    and p.concluida_em >= (date_trunc('week', now() at time zone 'America/Manaus') at time zone 'America/Manaus')
  group by p.autor_id, pr.nome
  order by count(*) desc, sum(p.duracao_s) desc nulls last
  limit 50;
$$;

revoke execute on function public.publicar_treino(uuid, text, text), public.feed_comunidade(uuid, timestamptz, integer),
  public.ranking_semana(uuid) from public, anon;
grant execute on function public.publicar_treino(uuid, text, text), public.feed_comunidade(uuid, timestamptz, integer),
  public.ranking_semana(uuid), public.nome_curto(text) to authenticated;

notify pgrst, 'reload schema';
