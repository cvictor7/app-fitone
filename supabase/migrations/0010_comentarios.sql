-- App Fit One · Comunidade (parte 3): comentários nos treinos publicados.
-- Só membros da academia comentam e leem. Quem comentou apaga o seu comentário.
-- O dono do treino e o personal/admin também podem apagar (moderação).

create table if not exists public.comentarios (
  id uuid primary key default gen_random_uuid(),
  publicacao_id uuid not null references public.publicacoes (id) on delete cascade,
  autor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  texto text not null check (char_length(btrim(texto)) between 1 and 280),
  criado_em timestamptz not null default now()
);
create index if not exists comentarios_pub on public.comentarios (publicacao_id, criado_em);

alter table public.comentarios enable row level security;

drop policy if exists "membros veem comentarios" on public.comentarios;
create policy "membros veem comentarios" on public.comentarios for select to authenticated
  using (exists (select 1 from public.publicacoes p where p.id = publicacao_id and public.e_membro(p.gym_id)));
drop policy if exists "comentar" on public.comentarios;
create policy "comentar" on public.comentarios for insert to authenticated
  with check (autor_id = auth.uid()
    and exists (select 1 from public.publicacoes p where p.id = publicacao_id and public.e_membro(p.gym_id)));
drop policy if exists "apagar comentario" on public.comentarios;
create policy "apagar comentario" on public.comentarios for delete to authenticated
  using (autor_id = auth.uid()
    or exists (select 1 from public.publicacoes p where p.id = publicacao_id
               and (p.autor_id = auth.uid() or public.e_personal_na(p.gym_id))));

grant select, insert, delete on public.comentarios to authenticated;

-- Comentários de uma publicação, com nome abreviado e se eu posso apagar
create or replace function public.comentarios_da_publicacao(p_publicacao uuid)
returns table (id uuid, autor text, eu boolean, texto text, criado_em timestamptz, posso_apagar boolean)
language sql stable security definer set search_path = '' as $$
  select c.id, public.nome_curto(pr.nome), c.autor_id = auth.uid(), c.texto, c.criado_em,
         c.autor_id = auth.uid() or p.autor_id = auth.uid() or public.e_personal_na(p.gym_id)
  from public.comentarios c
  join public.publicacoes p on p.id = c.publicacao_id
  join public.profiles pr on pr.id = c.autor_id
  where c.publicacao_id = p_publicacao and public.e_membro(p.gym_id)
  order by c.criado_em
  limit 200;
$$;

-- O feed passa a trazer o número de comentários (muda o retorno, então recria)
drop function if exists public.feed_comunidade(uuid, timestamptz, integer);
create function public.feed_comunidade(p_gym uuid, p_antes timestamptz default null, p_limite integer default 20)
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
  from public.publicacoes p
  join public.profiles pr on pr.id = p.autor_id
  where p.gym_id = p_gym and public.e_membro(p_gym)
    and (p_antes is null or p.criado_em < p_antes)
  order by p.criado_em desc
  limit least(greatest(p_limite, 1), 50);
$$;

-- Uma publicação só (tela de comentários)
create or replace function public.publicacao_comunidade(p_id uuid)
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
  from public.publicacoes p
  join public.profiles pr on pr.id = p.autor_id
  where p.id = p_id and public.e_membro(p.gym_id);
$$;

revoke execute on function public.comentarios_da_publicacao(uuid), public.feed_comunidade(uuid, timestamptz, integer),
  public.publicacao_comunidade(uuid) from public, anon;
grant execute on function public.comentarios_da_publicacao(uuid), public.feed_comunidade(uuid, timestamptz, integer),
  public.publicacao_comunidade(uuid) to authenticated;

notify pgrst, 'reload schema';
