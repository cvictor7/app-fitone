-- App Fit One · Fase 4: chat entre personal e aluno.
-- Só existe conversa entre um personal e um aluno vinculados (personal_alunos ativo).
-- Só os dois leem as mensagens. Se o vínculo acabar, o histórico continua visível para os dois,
-- mas ninguém envia mais.

create table if not exists public.mensagens (
  id uuid primary key default gen_random_uuid(),
  personal_id uuid not null references public.profiles (id) on delete cascade,
  aluno_id uuid not null references public.profiles (id) on delete cascade,
  autor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  texto text not null check (char_length(btrim(texto)) between 1 and 1000),
  criado_em timestamptz not null default now(),
  lida_em timestamptz,
  check (autor_id in (personal_id, aluno_id))
);
create index if not exists mensagens_par on public.mensagens (personal_id, aluno_id, criado_em);

alter table public.mensagens enable row level security;

drop policy if exists "os dois leem" on public.mensagens;
create policy "os dois leem" on public.mensagens for select to authenticated
  using (auth.uid() in (personal_id, aluno_id));
drop policy if exists "enviar com vinculo" on public.mensagens;
create policy "enviar com vinculo" on public.mensagens for insert to authenticated
  with check (autor_id = auth.uid() and lida_em is null
    and exists (select 1 from public.personal_alunos pa
                where pa.personal_id = mensagens.personal_id and pa.aluno_id = mensagens.aluno_id and pa.ativo));

grant select, insert on public.mensagens to authenticated;

-- Marca como lidas as mensagens que o outro me mandou
create or replace function public.marcar_lidas(p_outro uuid)
returns void language sql security definer set search_path = '' as $$
  update public.mensagens set lida_em = now()
  where lida_em is null and autor_id = p_outro
    and ((personal_id = auth.uid() and aluno_id = p_outro) or (aluno_id = auth.uid() and personal_id = p_outro));
$$;

-- Minhas conversas: todo vínculo ativo (mesmo sem mensagem) e vínculos antigos que têm histórico
create or replace function public.minhas_conversas()
returns table (outro_id uuid, outro_nome text, sou_personal boolean, ativo boolean,
               ultima text, ultima_em timestamptz, ultima_minha boolean, nao_lidas bigint)
language sql stable security definer set search_path = '' as $$
  with pares as (
    select pa.personal_id, pa.aluno_id, pa.ativo, pa.personal_id = auth.uid() as sou_personal
    from public.personal_alunos pa
    where auth.uid() in (pa.personal_id, pa.aluno_id)
  )
  select case when p.sou_personal then p.aluno_id else p.personal_id end,
         pr.nome, p.sou_personal, p.ativo,
         u.texto, u.criado_em, u.autor_id = auth.uid(),
         (select count(*) from public.mensagens m
          where m.personal_id = p.personal_id and m.aluno_id = p.aluno_id
            and m.autor_id <> auth.uid() and m.lida_em is null)
  from pares p
  join public.profiles pr on pr.id = case when p.sou_personal then p.aluno_id else p.personal_id end
  left join lateral (
    select m.texto, m.criado_em, m.autor_id from public.mensagens m
    where m.personal_id = p.personal_id and m.aluno_id = p.aluno_id
    order by m.criado_em desc limit 1
  ) u on true
  where p.ativo or u.criado_em is not null
  order by u.criado_em desc nulls last, pr.nome;
$$;

revoke execute on function public.marcar_lidas(uuid), public.minhas_conversas() from public, anon;
grant execute on function public.marcar_lidas(uuid), public.minhas_conversas() to authenticated;

-- Mensagem nova chega na hora (Supabase Realtime). Fora do Supabase, ignora.
do $$
begin
  alter publication supabase_realtime add table public.mensagens;
exception when others then
  raise notice 'realtime não configurado aqui: %', sqlerrm;
end $$;

notify pgrst, 'reload schema';
