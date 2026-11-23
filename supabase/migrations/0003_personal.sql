-- App Fit One · lado do personal
-- 1) vídeo e "como fazer" de cada exercício, por academia (vale também para os exercícios do catálogo geral)
-- 2) armazenamento dos vídeos
-- 3) copiar um modelo de plano para um aluno

-- =====================================================================
-- Vídeo e instruções por academia
-- =====================================================================
create table if not exists public.exercicio_midias (
  gym_id uuid not null references public.gyms (id) on delete cascade,
  exercicio_id uuid not null references public.exercicios (id) on delete cascade,
  video_url text,
  video_caminho text, -- caminho no armazenamento (para apagar o arquivo antigo)
  instrucoes text,
  atualizado_por uuid references public.profiles (id) on delete set null,
  atualizado_em timestamptz not null default now(),
  primary key (gym_id, exercicio_id)
);

alter table public.exercicio_midias enable row level security;
grant select, insert, update, delete on public.exercicio_midias to authenticated;

drop policy if exists "membro ve midias" on public.exercicio_midias;
create policy "membro ve midias" on public.exercicio_midias for select to authenticated
  using (public.e_membro(gym_id));
drop policy if exists "personal mexe nas midias" on public.exercicio_midias;
create policy "personal mexe nas midias" on public.exercicio_midias for all to authenticated
  using (public.e_personal_na(gym_id)) with check (public.e_personal_na(gym_id));

-- Personal pode editar os exercícios próprios da academia (os do catálogo geral não)
drop policy if exists "personal edita exercicio da academia" on public.exercicios;
create policy "personal edita exercicio da academia" on public.exercicios for update to authenticated
  using (gym_id is not null and public.e_personal_na(gym_id))
  with check (gym_id is not null and public.e_personal_na(gym_id));

-- =====================================================================
-- Armazenamento dos vídeos: pasta = id da academia
-- Leitura pública pelo link (o link é longo e aleatório); envio só por personal da academia.
-- =====================================================================
-- Se o Supabase não deixar criar as regras daqui (erro "must be owner"), o resto do arquivo roda
-- normalmente e as regras do armazenamento são feitas pelo painel (Storage → Policies).
do $$
begin
  insert into storage.buckets (id, name, public)
  values ('videos-exercicios', 'videos-exercicios', true)
  on conflict (id) do nothing;

  execute 'drop policy if exists "personal envia video" on storage.objects';
  execute $p$create policy "personal envia video" on storage.objects for insert to authenticated
    with check (bucket_id = 'videos-exercicios' and public.e_personal_na(((storage.foldername(name))[1])::uuid))$p$;
  execute 'drop policy if exists "personal troca video" on storage.objects';
  execute $p$create policy "personal troca video" on storage.objects for update to authenticated
    using (bucket_id = 'videos-exercicios' and public.e_personal_na(((storage.foldername(name))[1])::uuid))$p$;
  execute 'drop policy if exists "personal apaga video" on storage.objects';
  execute $p$create policy "personal apaga video" on storage.objects for delete to authenticated
    using (bucket_id = 'videos-exercicios' and public.e_personal_na(((storage.foldername(name))[1])::uuid))$p$;
exception when others then
  raise notice 'Armazenamento de vídeos não configurado por aqui (%). Fazer pelo painel.', sqlerrm;
end $$;

-- =====================================================================
-- Copiar plano (modelo → aluno, ou plano de um aluno → outro)
-- Desativa o plano ativo anterior do aluno.
-- =====================================================================
create or replace function public.copiar_plano(p_plano uuid, p_aluno uuid, p_nome text default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  o public.planos%rowtype;
  v_novo uuid;
  t record;
  v_treino uuid;
begin
  select * into o from public.planos where id = p_plano and personal_id = auth.uid();
  if o.id is null then raise exception 'Plano não encontrado'; end if;
  if not public.personal_vinculado(p_aluno) then raise exception 'Esse aluno não está com você'; end if;

  update public.planos set ativo = false where aluno_id = p_aluno and ativo;

  insert into public.planos (gym_id, personal_id, aluno_id, nome, inicio, fim, observacao)
  values (o.gym_id, o.personal_id, p_aluno, coalesce(nullif(trim(p_nome), ''), o.nome), current_date, null, o.observacao)
  returning id into v_novo;

  for t in select * from public.treinos where plano_id = o.id order by ordem loop
    insert into public.treinos (plano_id, letra, nome, ordem, modalidade, dias_semana)
    values (v_novo, t.letra, t.nome, t.ordem, t.modalidade, t.dias_semana)
    returning id into v_treino;

    insert into public.treino_exercicios (treino_id, exercicio_id, ordem, series, reps_min, reps_max, carga_sugerida_kg, descanso_s, observacao)
    select v_treino, exercicio_id, ordem, series, reps_min, reps_max, carga_sugerida_kg, descanso_s, observacao
    from public.treino_exercicios where treino_id = t.id;
  end loop;

  return v_novo;
end;
$$;

revoke execute on function public.copiar_plano(uuid, uuid, text) from public, anon;
grant execute on function public.copiar_plano(uuid, uuid, text) to authenticated;

-- Ativar um plano já existente do aluno (desativa o anterior)
create or replace function public.ativar_plano(p_plano uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  o public.planos%rowtype;
begin
  select * into o from public.planos where id = p_plano and personal_id = auth.uid() and aluno_id is not null;
  if o.id is null then raise exception 'Plano não encontrado'; end if;
  update public.planos set ativo = false where aluno_id = o.aluno_id and ativo and id <> o.id;
  update public.planos set ativo = true where id = o.id;
end;
$$;

revoke execute on function public.ativar_plano(uuid) from public, anon;
grant execute on function public.ativar_plano(uuid) to authenticated;

-- =====================================================================
-- Lista de alunos do personal (tela "Alunos")
-- Último treino e frequência só aparecem se o aluno autorizou o personal a ver os treinos.
-- =====================================================================
create or replace function public.resumo_alunos()
returns table (
  aluno_id uuid,
  nome text,
  desde date,
  consentiu boolean,
  ultimo_treino timestamptz,
  treinos_7d integer,
  plano_id uuid,
  plano_fim date
) language sql stable security definer set search_path = '' as $$
  select
    pa.aluno_id,
    pr.nome,
    pa.desde,
    c.ok as consentiu,
    case when c.ok then s.ultimo end as ultimo_treino,
    case when c.ok then coalesce(s.semana, 0) else 0 end::int as treinos_7d,
    pl.id as plano_id,
    pl.fim as plano_fim
  from public.personal_alunos pa
  join public.profiles pr on pr.id = pa.aluno_id
  cross join lateral (
    select exists (
      select 1 from public.consentimentos x
      where x.user_id = pa.aluno_id and x.tipo = 'compartilhar_com_personal' and x.revogado_em is null
    ) as ok
  ) c
  left join lateral (
    select max(se.concluida_em) as ultimo,
           count(*) filter (where se.concluida_em > now() - interval '7 days') as semana
    from public.sessoes se
    where se.aluno_id = pa.aluno_id and se.status = 'concluida'
  ) s on true
  left join public.planos pl on pl.aluno_id = pa.aluno_id and pl.ativo and pl.personal_id = auth.uid()
  where pa.personal_id = auth.uid() and pa.ativo
  order by pr.nome;
$$;

revoke execute on function public.resumo_alunos() from public, anon;
grant execute on function public.resumo_alunos() to authenticated;

notify pgrst, 'reload schema';
