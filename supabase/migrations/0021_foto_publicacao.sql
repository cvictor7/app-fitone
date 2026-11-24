-- App Fit One · foto na publicação (a do "cansado depois do treino").
-- Bucket PRIVADO "fotos-publicacoes": caminho {gym_id}/{autor_id}/{publicacao_id}.jpg.
-- Só membros da academia leem (o app pede um link temporário, que vale 1 hora).
-- Só o autor envia/apaga a sua; o admin da academia pode apagar (moderação).

alter table public.publicacoes add column if not exists foto_path text;

-- Autor define/tira a foto da própria publicação (o caminho tem que ser da pasta dele)
create or replace function public.definir_foto_publicacao(p_publicacao uuid, p_path text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  p public.publicacoes;
begin
  select * into p from public.publicacoes where id = p_publicacao;
  if p.id is null or p.autor_id <> auth.uid() then raise exception 'Publicação não encontrada'; end if;
  if p_path is not null and p_path <> format('%s/%s/%s.jpg', p.gym_id, p.autor_id, p.id) then
    raise exception 'Caminho inválido';
  end if;
  update public.publicacoes set foto_path = p_path where id = p.id;
end;
$$;
revoke execute on function public.definir_foto_publicacao(uuid, text) from public, anon;
grant execute on function public.definir_foto_publicacao(uuid, text) to authenticated;

-- Os feeds passam a trazer a foto (muda o retorno, então recria os três)
drop function if exists public.feed_comunidade(uuid, timestamptz, integer);
create function public.feed_comunidade(p_gym uuid, p_antes timestamptz default null, p_limite integer default 20)
returns table (
  id uuid, autor_id uuid, autor text, eu boolean, criado_em timestamptz, legenda text,
  modalidade public.modalidade, rotulo text, concluida_em timestamptz, duracao_s integer,
  volume_kg numeric, series integer, recordes integer, resumo text, curtidas bigint, eu_curti boolean,
  comentarios bigint, foto_path text
) language sql stable security definer set search_path = '' as $$
  select p.id, p.autor_id, public.nome_curto(pr.nome), p.autor_id = auth.uid(), p.criado_em, p.legenda,
         p.modalidade, p.rotulo, p.concluida_em, p.duracao_s, p.volume_kg, p.series, p.recordes, p.resumo,
         (select count(*) from public.curtidas c where c.publicacao_id = p.id),
         exists (select 1 from public.curtidas c where c.publicacao_id = p.id and c.user_id = auth.uid()),
         (select count(*) from public.comentarios c where c.publicacao_id = p.id),
         p.foto_path
  from public.publicacoes p
  join public.profiles pr on pr.id = p.autor_id
  where p.gym_id = p_gym and public.e_membro(p_gym)
    and (p_antes is null or p.criado_em < p_antes)
  order by p.criado_em desc
  limit least(greatest(p_limite, 1), 50);
$$;

drop function if exists public.publicacao_comunidade(uuid);
create function public.publicacao_comunidade(p_id uuid)
returns table (
  id uuid, autor_id uuid, autor text, eu boolean, criado_em timestamptz, legenda text,
  modalidade public.modalidade, rotulo text, concluida_em timestamptz, duracao_s integer,
  volume_kg numeric, series integer, recordes integer, resumo text, curtidas bigint, eu_curti boolean,
  comentarios bigint, foto_path text
) language sql stable security definer set search_path = '' as $$
  select p.id, p.autor_id, public.nome_curto(pr.nome), p.autor_id = auth.uid(), p.criado_em, p.legenda,
         p.modalidade, p.rotulo, p.concluida_em, p.duracao_s, p.volume_kg, p.series, p.recordes, p.resumo,
         (select count(*) from public.curtidas c where c.publicacao_id = p.id),
         exists (select 1 from public.curtidas c where c.publicacao_id = p.id and c.user_id = auth.uid()),
         (select count(*) from public.comentarios c where c.publicacao_id = p.id),
         p.foto_path
  from public.publicacoes p
  join public.profiles pr on pr.id = p.autor_id
  where p.id = p_id and public.e_membro(p.gym_id);
$$;

drop function if exists public.feed_clube(uuid, timestamptz, integer);
create function public.feed_clube(p_clube uuid, p_antes timestamptz default null, p_limite integer default 20)
returns table (
  id uuid, autor_id uuid, autor text, eu boolean, criado_em timestamptz, legenda text,
  modalidade public.modalidade, rotulo text, concluida_em timestamptz, duracao_s integer,
  volume_kg numeric, series integer, recordes integer, resumo text, curtidas bigint, eu_curti boolean,
  comentarios bigint, foto_path text
) language sql stable security definer set search_path = '' as $$
  select p.id, p.autor_id, public.nome_curto(pr.nome), p.autor_id = auth.uid(), p.criado_em, p.legenda,
         p.modalidade, p.rotulo, p.concluida_em, p.duracao_s, p.volume_kg, p.series, p.recordes, p.resumo,
         (select count(*) from public.curtidas c where c.publicacao_id = p.id),
         exists (select 1 from public.curtidas c where c.publicacao_id = p.id and c.user_id = auth.uid()),
         (select count(*) from public.comentarios c where c.publicacao_id = p.id),
         p.foto_path
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

revoke execute on function public.feed_comunidade(uuid, timestamptz, integer), public.publicacao_comunidade(uuid),
  public.feed_clube(uuid, timestamptz, integer) from public, anon;
grant execute on function public.feed_comunidade(uuid, timestamptz, integer), public.publicacao_comunidade(uuid),
  public.feed_clube(uuid, timestamptz, integer) to authenticated;

-- Bucket e regras do armazenamento (se der erro aqui, o resto acima já foi aplicado)
do $$
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('fotos-publicacoes', 'fotos-publicacoes', false, 3145728, array['image/jpeg'])
  on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/jpeg'];

  execute 'drop policy if exists "membros veem fotos" on storage.objects';
  execute $p$create policy "membros veem fotos" on storage.objects for select to authenticated
    using (bucket_id = 'fotos-publicacoes' and public.e_membro(((storage.foldername(name))[1])::uuid))$p$;
  execute 'drop policy if exists "autor envia foto" on storage.objects';
  execute $p$create policy "autor envia foto" on storage.objects for insert to authenticated
    with check (bucket_id = 'fotos-publicacoes' and (storage.foldername(name))[2] = auth.uid()::text
                and public.e_membro(((storage.foldername(name))[1])::uuid))$p$;
  execute 'drop policy if exists "autor troca foto" on storage.objects';
  execute $p$create policy "autor troca foto" on storage.objects for update to authenticated
    using (bucket_id = 'fotos-publicacoes' and (storage.foldername(name))[2] = auth.uid()::text)$p$;
  execute 'drop policy if exists "autor ou admin apaga foto" on storage.objects';
  execute $p$create policy "autor ou admin apaga foto" on storage.objects for delete to authenticated
    using (bucket_id = 'fotos-publicacoes' and ((storage.foldername(name))[2] = auth.uid()::text
           or public.e_admin(((storage.foldername(name))[1])::uuid)))$p$;
exception when others then
  raise notice 'Fotos: armazenamento não configurado por aqui (%). Me avise.', sqlerrm;
end $$;

notify pgrst, 'reload schema';
