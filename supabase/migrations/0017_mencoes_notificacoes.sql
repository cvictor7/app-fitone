-- App Fit One · Comunidade (parte 5): @menções e notificações dentro do app (🔔).
-- Menção fica guardada no texto como @[Nome A.](uuid) — o app mostra só "@Nome A." em verde.
-- O banco cria as notificações sozinho (triggers): Boa!, comentário no seu treino e menção.
-- Sugestões de @ só mostram quem já participa da comunidade (publicou ou comentou) e a equipe,
-- com nome abreviado.

create table if not exists public.notificacoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,  -- quem recebe
  gym_id uuid not null references public.gyms (id) on delete cascade,
  tipo text not null check (tipo in ('curtida', 'comentario', 'mencao')),
  ator_id uuid not null references public.profiles (id) on delete cascade,  -- quem fez
  publicacao_id uuid references public.publicacoes (id) on delete cascade,
  comentario_id uuid references public.comentarios (id) on delete cascade,
  criado_em timestamptz not null default now(),
  lida boolean not null default false
);
create index if not exists notificacoes_user on public.notificacoes (user_id, criado_em desc);
create unique index if not exists notificacoes_curtida_unica on public.notificacoes (user_id, ator_id, publicacao_id)
  where tipo = 'curtida';

alter table public.notificacoes enable row level security;
drop policy if exists "vejo as minhas" on public.notificacoes;
create policy "vejo as minhas" on public.notificacoes for select to authenticated using (user_id = auth.uid());
drop policy if exists "apago as minhas" on public.notificacoes;
create policy "apago as minhas" on public.notificacoes for delete to authenticated using (user_id = auth.uid());
grant select, delete on public.notificacoes to authenticated;


-- As menções ocupam espaço no banco (@[Nome](id)); a tela continua limitando a 280 letras visíveis
alter table public.comentarios drop constraint if exists comentarios_texto_check;
alter table public.comentarios add constraint comentarios_texto_check check (char_length(btrim(texto)) between 1 and 700);
alter table public.publicacoes drop constraint if exists publicacoes_legenda_check;
alter table public.publicacoes add constraint publicacoes_legenda_check check (char_length(legenda) <= 700);

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
  values (s.id, auth.uid(), v_gym, nullif(btrim(left(p_legenda, 700)), ''), s.modalidade,
          left(coalesce(nullif(btrim(upper(p_rotulo)), ''), 'TREINO'), 12),
          coalesce(s.concluida_em, now()), s.duracao_s, s.volume_kg, v_series, v_recordes,
          case when s.modalidade <> 'musculacao' then left(s.observacao, 300) end)
  on conflict (sessao_id) do update set legenda = excluded.legenda
  returning id into v_id;
  return v_id;
end;
$$;

-- ids mencionados num texto (só membros ativos da academia)
create or replace function public.mencionados(p_texto text, p_gym uuid)
returns setof uuid language sql stable security definer set search_path = '' as $$
  select distinct (m[1])::uuid
  from regexp_matches(coalesce(p_texto, ''), '@\[[^\]]{1,40}\]\(([0-9a-f-]{36})\)', 'g') as m
  where exists (select 1 from public.gym_members g where g.gym_id = p_gym and g.user_id = (m[1])::uuid and g.ativo);
$$;
revoke execute on function public.mencionados(text, uuid) from public, anon, authenticated;

-- Boa! -> avisa o dono do treino (uma vez por pessoa)
create or replace function public.notificar_curtida()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  p public.publicacoes;
begin
  select * into p from public.publicacoes where id = new.publicacao_id;
  if p.autor_id <> new.user_id then
    insert into public.notificacoes (user_id, gym_id, tipo, ator_id, publicacao_id)
    values (p.autor_id, p.gym_id, 'curtida', new.user_id, p.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
drop trigger if exists ao_curtir on public.curtidas;
create trigger ao_curtir after insert on public.curtidas for each row execute function public.notificar_curtida();

-- Comentário -> avisa quem foi mencionado e o dono do treino (se não foi mencionado)
create or replace function public.notificar_comentario()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  p public.publicacoes;
  v uuid;
  v_dono_mencionado boolean := false;
begin
  select * into p from public.publicacoes where id = new.publicacao_id;
  for v in select * from public.mencionados(new.texto, p.gym_id) loop
    if v <> new.autor_id then
      insert into public.notificacoes (user_id, gym_id, tipo, ator_id, publicacao_id, comentario_id)
      values (v, p.gym_id, 'mencao', new.autor_id, p.id, new.id);
      if v = p.autor_id then v_dono_mencionado := true; end if;
    end if;
  end loop;
  if p.autor_id <> new.autor_id and not v_dono_mencionado then
    insert into public.notificacoes (user_id, gym_id, tipo, ator_id, publicacao_id, comentario_id)
    values (p.autor_id, p.gym_id, 'comentario', new.autor_id, p.id, new.id);
  end if;
  return new;
end;
$$;
drop trigger if exists ao_comentar on public.comentarios;
create trigger ao_comentar after insert on public.comentarios for each row execute function public.notificar_comentario();

-- Menção na legenda do treino publicado (na hora de publicar ou ao trocar a legenda)
create or replace function public.notificar_legenda()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v uuid;
begin
  if tg_op = 'UPDATE' and new.legenda is not distinct from old.legenda then return new; end if;
  for v in select * from public.mencionados(new.legenda, new.gym_id) loop
    if v <> new.autor_id and not exists (
      select 1 from public.notificacoes n where n.user_id = v and n.publicacao_id = new.id and n.tipo = 'mencao' and n.comentario_id is null) then
      insert into public.notificacoes (user_id, gym_id, tipo, ator_id, publicacao_id)
      values (v, new.gym_id, 'mencao', new.autor_id, new.id);
    end if;
  end loop;
  return new;
end;
$$;
drop trigger if exists ao_publicar_legenda on public.publicacoes;
create trigger ao_publicar_legenda after insert or update of legenda on public.publicacoes
  for each row execute function public.notificar_legenda();

-- Minhas notificações (com nome abreviado de quem fez e um pedaço do texto)
create or replace function public.minhas_notificacoes()
returns table (id uuid, tipo text, ator text, publicacao_id uuid, rotulo text, trecho text, criado_em timestamptz, lida boolean)
language sql stable security definer set search_path = '' as $$
  select n.id, n.tipo, public.nome_curto(pr.nome), n.publicacao_id, p.rotulo,
         left(regexp_replace(coalesce(c.texto, case when n.tipo = 'mencao' then p.legenda end, ''),
                             '@\[([^\]]{1,40})\]\([0-9a-f-]{36}\)', '@\1', 'g'), 120),
         n.criado_em, n.lida
  from public.notificacoes n
  join public.profiles pr on pr.id = n.ator_id
  left join public.publicacoes p on p.id = n.publicacao_id
  left join public.comentarios c on c.id = n.comentario_id
  where n.user_id = auth.uid() and public.e_membro(n.gym_id)
  order by n.criado_em desc
  limit 60;
$$;

create or replace function public.notificacoes_nao_lidas()
returns integer language sql stable security definer set search_path = '' as $$
  select count(*)::integer from public.notificacoes where user_id = auth.uid() and not lida;
$$;

create or replace function public.marcar_notificacoes_lidas()
returns void language sql security definer set search_path = '' as $$
  update public.notificacoes set lida = true where user_id = auth.uid() and not lida;
$$;

-- Quem dá para mencionar: quem já participa da comunidade (publicou/comentou) + equipe
create or replace function public.pessoas_para_mencionar(p_gym uuid, p_busca text)
returns table (user_id uuid, nome text)
language sql stable security definer set search_path = '' as $$
  select m.user_id, public.nome_curto(pr.nome)
  from public.gym_members m
  join public.profiles pr on pr.id = m.user_id
  where m.gym_id = p_gym and m.ativo and public.e_membro(p_gym) and m.user_id <> auth.uid()
    and (m.papel in ('personal', 'admin')
         or exists (select 1 from public.publicacoes p where p.autor_id = m.user_id and p.gym_id = p_gym)
         or exists (select 1 from public.comentarios c join public.publicacoes p on p.id = c.publicacao_id
                    where c.autor_id = m.user_id and p.gym_id = p_gym))
    and pr.nome ilike '%' || coalesce(btrim(p_busca), '') || '%'
  order by pr.nome
  limit 8;
$$;

revoke execute on function public.minhas_notificacoes(), public.notificacoes_nao_lidas(), public.marcar_notificacoes_lidas(),
  public.pessoas_para_mencionar(uuid, text) from public, anon;
grant execute on function public.minhas_notificacoes(), public.notificacoes_nao_lidas(), public.marcar_notificacoes_lidas(),
  public.pessoas_para_mencionar(uuid, text) to authenticated;

notify pgrst, 'reload schema';
