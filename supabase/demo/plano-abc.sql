-- App Fit One · Treino ABC (A seg/qui, B ter/sex, C qua/sáb). Substitui o plano ativo (o antigo fica no histórico).
-- Carga sugerida = a última carga usada. Séries e repetições: ajuste depois no editor do app.

insert into public.exercicios (nome, grupo, equipamento) values
  ('Supino reto na máquina', 'Peito', 'Máquina'),
  ('Supino inclinado na máquina', 'Peito', 'Máquina'),
  ('Voador', 'Peito', 'Máquina'),
  ('Puxada alta', 'Costas', 'Polia'),
  ('Abdominal na máquina', 'Abdômen', 'Máquina')
on conflict do nothing;

do $$
declare
  v_email text := 'EMAIL_DA_SUA_CONTA_DE_ALUNO';
  v_aluno uuid;
  v_autor uuid;
  v_gym uuid;
  v_plano uuid;
  v_treino uuid;
  t record;
  e record;
  v_ordem int;
  v_falta text := '';
begin
  select id into v_aluno from auth.users where lower(email) = lower(v_email);
  if v_aluno is null then raise exception 'Conta não encontrada: %', v_email; end if;
  select id into v_gym from public.gyms where slug = 'fitone';

  select personal_id into v_autor from public.personal_alunos where aluno_id = v_aluno and ativo limit 1;
  v_autor := coalesce(v_autor, v_aluno);

  update public.planos set ativo = false where aluno_id = v_aluno and ativo;
  insert into public.planos (gym_id, personal_id, aluno_id, nome, inicio, observacao, ativo)
  values (v_gym, v_autor, v_aluno, 'Treino ABC', current_date,
          'A na segunda e quinta, B na terça e sexta, C na quarta e sábado.', true)
  returning id into v_plano;

  for t in select * from (values
    ('A', 'TREINO A', 'Peitoral, deltoides e tríceps', 1, '{1,4}'::smallint[],
       'Controle o ritmo da execução e ajuste os pesos com foco na execução perfeita.'),
    ('B', 'TREINO B', 'Dorsais, bíceps e abdome', 2, '{2,5}'::smallint[],
       'Foque na contração das costas e evite puxar a carga utilizando o tronco.'),
    ('C', 'TREINO C', 'Membros inferiores e panturrilhas', 3, '{3,6}'::smallint[],
       'Exercícios com suporte estável para proteger articulações e manter segurança articular.')
  ) as x(letra, rotulo, nome, ordem, dias, obs) loop
    insert into public.treinos (plano_id, letra, rotulo, nome, ordem, modalidade, dias_semana, observacao)
    values (v_plano, t.letra, t.rotulo, t.nome, t.ordem, 'musculacao', t.dias, t.obs)
    returning id into v_treino;

    v_ordem := 0;
    -- letra, exercício do app, séries, reps mín, reps máx, carga (kg), descanso (s), observação
    for e in select * from (values
      ('A', 'Supino reto na máquina',       3, 10, 12, 25::numeric, 90, null),
      ('A', 'Supino inclinado na máquina',  3, 10, 12, 40, 90, null),
      ('A', 'Voador',                       3, 10, 12, 40, 60, 'Pec deck'),
      ('A', 'Desenvolvimento na máquina',   3, 10, 12, 7, 90, null),
      ('A', 'Elevação lateral',             3, 10, 12, null, 60, 'Com halteres'),
      ('A', 'Tríceps na polia com barra',   3, 12, 15, 17, 60, null),
      ('A', 'Prancha',                      3, 30, 45, null, 45, 'Segure 30 a 45 segundos'),
      ('B', 'Puxada alta',                  3, 10, 12, 40, 90, 'Pela frente, pegada aberta'),
      ('B', 'Remada baixa',                 3, 10, 12, 10, 90, 'Com triângulo'),
      ('B', 'Remada na máquina',            3, 10, 12, 35, 90, null),
      ('B', 'Voador invertido',             3, 10, 12, 30, 60, 'Crucifixo inverso na máquina'),
      ('B', 'Rosca na polia',               3, 10, 12, 15, 60, 'Rosca direta na polia'),
      ('B', 'Rosca martelo',                3, 6, 10, 12, 60, 'Com halteres'),
      ('B', 'Abdominal na máquina',         3, 12, 15, null, 45, 'Abdominal supra na máquina'),
      ('C', 'Leg press 45°',                3, 7, 10, null, 90, 'Pés na largura dos ombros; não trave os joelhos na extensão'),
      ('C', 'Cadeira extensora',            3, 12, 15, 9, 60, null),
      ('C', 'Cadeira flexora',              3, 12, 15, 9, 60, null),
      ('C', 'Cadeira abdutora',             3, 10, 12, 10, 60, null),
      ('C', 'Cadeira adutora',              3, 12, 15, 8, 60, null),
      ('C', 'Panturrilha sentado',          3, 12, 15, 45, 60, null),
      ('C', 'Abdominal supra',              3, 15, 20, null, 45, 'Abdominal reto no solo')
    ) as y(letra, nome, series, rmin, rmax, carga, descanso, obs) where y.letra = t.letra loop
      v_ordem := v_ordem + 1;
      insert into public.treino_exercicios
        (treino_id, exercicio_id, ordem, series, reps_min, reps_max, carga_sugerida_kg, descanso_s, observacao)
      select v_treino, ex.id, v_ordem, e.series, e.rmin, e.rmax, e.carga, e.descanso, e.obs
      from public.exercicios ex where ex.gym_id is null and lower(ex.nome) = lower(e.nome);
      if not found then v_falta := v_falta || e.nome || '; '; end if;
    end loop;
  end loop;

  if v_falta <> '' then raise exception 'Exercícios não encontrados no catálogo: %', v_falta; end if;
end $$;

-- Conferir: tem que dar A = 7, B = 7, C = 7
select t.letra, t.nome, t.dias_semana, count(te.*) as exercicios
from public.planos p join public.treinos t on t.plano_id = p.id
left join public.treino_exercicios te on te.treino_id = t.id
where p.ativo and p.nome = 'Treino ABC'
group by t.letra, t.nome, t.ordem, t.dias_semana order by t.ordem;
