-- App Fit One · treinos de qualquer modalidade no plano + aluno montando o próprio treino

-- Treino de Cross/Hybrid/Corrida/Bike/Livre: descrição, duração-alvo e distância (corrida/bike)
alter table public.treinos add column if not exists descricao text;
alter table public.treinos add column if not exists duracao_min smallint;
alter table public.treinos add column if not exists distancia_km numeric(5, 2);

-- Aluno sem personal monta o próprio plano: ele é o "autor" (personal_id = aluno_id = ele mesmo).
-- Editar/apagar já funciona pelas regras de "personal_id = quem está logado".
drop policy if exists "aluno cria o proprio plano" on public.planos;
create policy "aluno cria o proprio plano" on public.planos for insert to authenticated
  with check (personal_id = auth.uid() and aluno_id = auth.uid() and public.e_membro(gym_id));

drop policy if exists "aluno edita o proprio plano" on public.planos;
create policy "aluno edita o proprio plano" on public.planos for update to authenticated
  using (personal_id = auth.uid() and aluno_id = auth.uid())
  with check (personal_id = auth.uid() and aluno_id = auth.uid());

-- Ativar plano: vale para o personal e para o aluno no próprio plano
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

-- Copiar plano agora leva também descrição, duração e distância
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
    insert into public.treinos (plano_id, letra, nome, ordem, modalidade, dias_semana, descricao, duracao_min, distancia_km)
    values (v_novo, t.letra, t.nome, t.ordem, t.modalidade, t.dias_semana, t.descricao, t.duracao_min, t.distancia_km)
    returning id into v_treino;

    insert into public.treino_exercicios (treino_id, exercicio_id, ordem, series, reps_min, reps_max, carga_sugerida_kg, descanso_s, observacao)
    select v_treino, exercicio_id, ordem, series, reps_min, reps_max, carga_sugerida_kg, descanso_s, observacao
    from public.treino_exercicios where treino_id = t.id;
  end loop;

  return v_novo;
end;
$$;

notify pgrst, 'reload schema';
