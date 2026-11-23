-- App Fit One · dados de TESTE
-- Cria um "Personal Demo" e monta um plano A/B/C para todo aluno da Fit One que ainda não tem plano.
-- Pode rodar de novo sem duplicar. Para tirar tudo depois: ver o fim do arquivo.

do $$
declare
  v_gym uuid;
  v_personal uuid := '00000000-0000-4000-a000-000000000001';
  v_aluno record;
  v_plano uuid;
  v_treino uuid;
  v_ordem int;
  t record;
  e record;
begin
  select id into v_gym from public.gyms where slug = 'fitone';

  -- Personal de teste (não faz login; só existe para ser dono do plano)
  if not exists (select 1 from auth.users where id = v_personal) then
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values (v_personal, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'personal.demo@fitone.invalid', '{"nome":"Personal Demo"}', now(), now());
  end if;
  insert into public.gym_members (gym_id, user_id, papel) values (v_gym, v_personal, 'personal')
  on conflict (gym_id, user_id) do update set papel = 'personal', ativo = true;

  for v_aluno in
    select m.user_id from public.gym_members m
    where m.gym_id = v_gym and m.papel = 'aluno' and m.ativo
      and not exists (select 1 from public.planos p where p.aluno_id = m.user_id and p.ativo)
  loop
    insert into public.personal_alunos (gym_id, personal_id, aluno_id) values (v_gym, v_personal, v_aluno.user_id)
    on conflict (personal_id, aluno_id) do update set ativo = true;

    insert into public.planos (gym_id, personal_id, aluno_id, nome, inicio, observacao)
    values (v_gym, v_personal, v_aluno.user_id, 'Hipertrofia · novembro', current_date,
            'Plano de teste. Suba a carga quando fizer o máximo de reps em todas as séries.')
    returning id into v_plano;

    for t in select * from (values
      ('A', 'Peito, ombro e tríceps', 1, '{1,4}'::smallint[]),
      ('B', 'Costas e bíceps', 2, '{2,5}'::smallint[]),
      ('C', 'Pernas completo', 3, '{3,6}'::smallint[])
    ) as x(letra, nome, ordem, dias) loop
      insert into public.treinos (plano_id, letra, nome, ordem, dias_semana)
      values (v_plano, t.letra, t.nome, t.ordem, t.dias) returning id into v_treino;

      v_ordem := 0;
      for e in select * from (values
        ('A', 'Supino reto com barra', 4, 8, 10, 80.0, 120, null),
        ('A', 'Supino inclinado com halteres', 3, 10, 12, 28.0, 90, null),
        ('A', 'Voador', 3, 12, 15, 50.0, 60, 'Segura 1 s lá embaixo'),
        ('A', 'Desenvolvimento com halteres', 4, 8, 10, 22.0, 90, null),
        ('A', 'Elevação lateral', 4, 12, 15, 10.0, 60, 'Drop na última série'),
        ('A', 'Elevação frontal na polia', 3, 12, 12, 15.0, 60, null),
        ('A', 'Tríceps na polia com corda', 4, 10, 12, 30.0, 60, null),
        ('A', 'Tríceps francês', 3, 10, 12, 16.0, 60, null),
        ('B', 'Puxada alta', 4, 8, 10, 65.0, 90, null),
        ('B', 'Remada curvada com barra', 4, 8, 10, 60.0, 120, null),
        ('B', 'Remada baixa', 3, 10, 12, 55.0, 90, null),
        ('B', 'Pulldown na polia', 3, 12, 15, 30.0, 60, null),
        ('B', 'Rosca direta com barra W', 4, 8, 10, 30.0, 90, null),
        ('B', 'Rosca martelo', 3, 10, 12, 14.0, 60, null),
        ('B', 'Rosca Scott', 3, 10, 12, 25.0, 60, null),
        ('C', 'Agachamento livre', 4, 6, 8, 100.0, 150, 'Desce até a coxa passar da paralela'),
        ('C', 'Leg press 45°', 4, 10, 12, 220.0, 120, null),
        ('C', 'Cadeira extensora', 3, 12, 15, 60.0, 60, null),
        ('C', 'Stiff com barra', 4, 8, 10, 70.0, 120, null),
        ('C', 'Mesa flexora', 3, 10, 12, 45.0, 60, null),
        ('C', 'Cadeira abdutora', 3, 15, 15, 70.0, 60, null),
        ('C', 'Panturrilha em pé', 4, 12, 15, 80.0, 45, null)
      ) as y(letra, nome, series, rmin, rmax, carga, descanso, obs) where y.letra = t.letra loop
        v_ordem := v_ordem + 1;
        insert into public.treino_exercicios (treino_id, exercicio_id, ordem, series, reps_min, reps_max, carga_sugerida_kg, descanso_s, observacao)
        select v_treino, ex.id, v_ordem, e.series, e.rmin, e.rmax, e.carga, e.descanso, e.obs
        from public.exercicios ex where ex.gym_id is null and ex.nome = e.nome;
      end loop;
    end loop;
  end loop;
end $$;

-- Conferir:
select pr.nome as aluno, p.nome as plano, t.letra, t.nome, count(te.*) as exercicios
from public.planos p
join public.profiles pr on pr.id = p.aluno_id
join public.treinos t on t.plano_id = p.id
join public.treino_exercicios te on te.treino_id = t.id
group by 1, 2, 3, 4 order by 1, 3;

-- Para apagar os dados de teste depois (NÃO rode agora):
-- delete from auth.users where id = '00000000-0000-4000-a000-000000000001';
