-- App Fit One · o plano de verdade do Victor (PPL + Upper/Lower + Hybrid)
-- Troque o e-mail abaixo e rode no SQL Editor. Séries/reps padrão (3 × 8 a 12, 90 s): ajuste depois no editor do app.

-- Exercícios que faltavam no catálogo
insert into public.exercicios (nome, grupo, equipamento) values
  ('Supino reto na máquina', 'Peito', 'Máquina'),
  ('Supino inclinado na máquina', 'Peito', 'Máquina'),
  ('Fly na máquina', 'Peito', 'Máquina'),
  ('Puxada alta', 'Costas', 'Polia'),
  ('Abdominal supra na máquina', 'Abdômen', 'Máquina')
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
begin
  select id into v_aluno from auth.users where lower(email) = lower(v_email);
  if v_aluno is null then raise exception 'Conta não encontrada: %', v_email; end if;
  select id into v_gym from public.gyms where slug = 'fitone';

  -- autor: o personal ligado ao aluno (se tiver); senão o próprio aluno
  select personal_id into v_autor from public.personal_alunos where aluno_id = v_aluno and ativo limit 1;
  v_autor := coalesce(v_autor, v_aluno);

  update public.planos set ativo = false where aluno_id = v_aluno and ativo;
  insert into public.planos (gym_id, personal_id, aluno_id, nome, inicio, observacao, ativo)
  values (v_gym, v_autor, v_aluno, 'PPL + Upper/Lower + Hybrid', current_date,
          'Divisão Push / Pull / Legs / Upper / Lower, com Hybrid na terça, quinta e sexta.', true)
  returning id into v_plano;

  for t in select * from (values
    ('A', 'PUSH',  'Peito, ombro e tríceps',      1, 'musculacao', '{1}'::smallint[]),
    ('B', 'PULL',  'Costas, bíceps e abdômen',    2, 'musculacao', '{2}'::smallint[]),
    ('C', 'LEGS',  'Pernas',                      3, 'musculacao', '{3}'::smallint[]),
    ('D', null,    'Hybrid',                      4, 'hybrid',     '{2,4,5}'::smallint[]),
    ('E', 'UPPER', 'Superior completo',           5, 'musculacao', '{5}'::smallint[]),
    ('F', 'LOWER', 'Inferior com foco em posterior', 6, 'musculacao', '{6}'::smallint[])
  ) as x(letra, rotulo, nome, ordem, modalidade, dias) loop
    insert into public.treinos (plano_id, letra, rotulo, nome, ordem, modalidade, dias_semana, descricao, duracao_min)
    values (v_plano, t.letra, t.rotulo, t.nome, t.ordem, t.modalidade::public.modalidade, t.dias,
            case when t.modalidade = 'hybrid' then 'Aula de Hybrid da Fit One.' end,
            case when t.modalidade = 'hybrid' then 50 end)
    returning id into v_treino;

    v_ordem := 0;
    for e in select * from (values
      ('A', 'Supino reto na máquina', 3, 8, 12, 90),
      ('A', 'Supino inclinado na máquina', 3, 8, 12, 90),
      ('A', 'Fly na máquina', 3, 10, 12, 60),
      ('A', 'Desenvolvimento na máquina', 3, 8, 12, 90),
      ('A', 'Elevação lateral', 3, 12, 15, 60),
      ('A', 'Tríceps na polia com barra', 3, 10, 12, 60),
      ('A', 'Mergulho nas paralelas', 3, 8, 12, 90),
      ('B', 'Puxada alta', 3, 8, 12, 90),
      ('B', 'Remada na máquina', 3, 8, 12, 90),
      ('B', 'Remada baixa no triângulo', 3, 8, 12, 90),
      ('B', 'Crucifixo invertido', 3, 12, 15, 60),
      ('B', 'Rosca alternada com halteres', 3, 8, 12, 60),
      ('B', 'Rosca martelo', 3, 10, 12, 60),
      ('B', 'Abdominal supra na máquina', 3, 15, 15, 45),
      ('C', 'Agachamento hack', 3, 8, 12, 120),
      ('C', 'Leg press 45°', 3, 10, 12, 120),
      ('C', 'Cadeira extensora', 3, 10, 12, 60),
      ('C', 'Cadeira flexora', 3, 10, 12, 60),
      ('C', 'Cadeira abdutora', 3, 12, 15, 60),
      ('E', 'Supino reto na máquina', 3, 8, 12, 90),
      ('E', 'Supino inclinado na máquina', 3, 8, 12, 90),
      ('E', 'Puxada alta', 3, 8, 12, 90),
      ('E', 'Remada baixa no triângulo', 3, 8, 12, 90),
      ('E', 'Desenvolvimento na máquina', 3, 8, 12, 90),
      ('E', 'Rosca alternada com halteres', 3, 8, 12, 60),
      ('E', 'Tríceps na polia com barra', 3, 10, 12, 60),
      ('F', 'Stiff com barra', 3, 8, 12, 120),
      ('F', 'Leg press 45°', 3, 10, 12, 120),
      ('F', 'Cadeira flexora', 3, 10, 12, 60),
      ('F', 'Cadeira extensora', 3, 10, 12, 60),
      ('F', 'Cadeira adutora', 3, 12, 15, 60)
    ) as y(letra, nome, series, rmin, rmax, descanso) where y.letra = t.letra loop
      v_ordem := v_ordem + 1;
      insert into public.treino_exercicios (treino_id, exercicio_id, ordem, series, reps_min, reps_max, descanso_s)
      select v_treino, ex.id, v_ordem, e.series, e.rmin, e.rmax, e.descanso
      from public.exercicios ex where ex.gym_id is null and ex.nome = e.nome;
    end loop;
  end loop;
end $$;

-- Conferir
select coalesce(t.rotulo, t.nome) as treino, t.dias_semana, count(te.*) as exercicios
from public.planos p join public.treinos t on t.plano_id = p.id
left join public.treino_exercicios te on te.treino_id = t.id
where p.ativo and p.nome = 'PPL + Upper/Lower + Hybrid'
group by t.rotulo, t.nome, t.ordem, t.dias_semana order by t.ordem;
