-- App Fit One · treino de estações (Hybrid/Cross) prescrito pelo personal.
-- O treino do plano guarda a montagem do timer: modo (por tempo ou na janela), estações
-- (ex.: Corrida 200 m, Wall ball 30 reps, Empurrar trenó 20 m), voltas e tempo por estação.
-- Formato: {"modo":"prova"|"janela","estacoes":[{"nome":"Wall ball","alvo":"30 reps"}],"voltas":1,"janelaS":60}

alter table public.treinos add column if not exists timer jsonb;

-- Copiar plano (modelo -> aluno) passa a levar a montagem das estações
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
    insert into public.treinos (plano_id, letra, nome, ordem, modalidade, dias_semana, descricao, duracao_min, distancia_km, rotulo, observacao, cardio, timer)
    values (v_novo, t.letra, t.nome, t.ordem, t.modalidade, t.dias_semana, t.descricao, t.duracao_min, t.distancia_km, t.rotulo, t.observacao, t.cardio, t.timer)
    returning id into v_treino;

    insert into public.treino_exercicios (treino_id, exercicio_id, ordem, series, reps_min, reps_max, carga_sugerida_kg, descanso_s, observacao)
    select v_treino, exercicio_id, ordem, series, reps_min, reps_max, carga_sugerida_kg, descanso_s, observacao
    from public.treino_exercicios where treino_id = t.id;
  end loop;

  return v_novo;
end;
$$;

notify pgrst, 'reload schema';
