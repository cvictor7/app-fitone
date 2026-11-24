-- App Fit One · conquistas (medalhas) calculadas na hora a partir dos treinos.
-- Sem tabela nova: o banco olha os treinos, recordes, percursos e comunidade e diz
-- o que já foi conquistado (e quando), e quanto falta para as outras.
-- Sequência é por SEMANA (3+ treinos), não por dia: descanso faz parte do treino.

create or replace function public.minhas_conquistas()
returns table (codigo text, grupo text, emoji text, titulo text, descricao text, meta numeric, valor numeric, conquistada_em timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare
  eu uuid := auth.uid();
  v_seq int;
begin
  -- maior sequência de semanas com 3+ treinos (ilhas de semanas consecutivas)
  with semanas as (
    select date_trunc('week', s.concluida_em at time zone 'America/Manaus')::date as semana
    from public.sessoes s where s.aluno_id = eu and s.status = 'concluida'
    group by 1 having count(*) >= 3
  ), ilhas as (
    select semana, semana - (row_number() over (order by semana) * 7)::int as ilha from semanas
  )
  select coalesce(max(n), 0) into v_seq from (select count(*) n from ilhas group by ilha) q;

  return query
  with s as (
    select x.concluida_em, x.modalidade, x.volume_kg, x.duracao_s,
           row_number() over (order by x.concluida_em) as n
    from public.sessoes x where x.aluno_id = eu and x.status = 'concluida'
  ),
  r as (
    select x.alcancado_em, row_number() over (order by x.alcancado_em) as n
    from public.recordes x where x.aluno_id = eu and x.tipo = 'carga_max'
  ),
  cedo as (
    select s.concluida_em, row_number() over (order by s.concluida_em) as n
    from s where extract(hour from (s.concluida_em at time zone 'America/Manaus') - make_interval(secs => coalesce(s.duracao_s, 0))) < 7
  ),
  run as (
    select p.distancia_m, x.concluida_em, sum(p.distancia_m) over (order by x.concluida_em) as acumulado
    from public.percursos p join public.sessoes x on x.id = p.sessao_id
    where p.aluno_id = eu and x.modalidade = 'corrida'
  ),
  pedal as (
    select p.distancia_m, x.concluida_em, sum(p.distancia_m) over (order by x.concluida_em) as acumulado
    from public.percursos p join public.sessoes x on x.id = p.sessao_id
    where p.aluno_id = eu and x.modalidade = 'bike'
  ),
  vol as (
    select s.concluida_em, s.volume_kg, sum(s.volume_kg) over (order by s.concluida_em) as acumulado from s
  ),
  hyb as (select s.concluida_em, row_number() over (order by s.concluida_em) as n from s where s.modalidade = 'hybrid'),
  crs as (select s.concluida_em, row_number() over (order by s.concluida_em) as n from s where s.modalidade = 'cross'),
  boas as (
    select c.criado_em, row_number() over (order by c.criado_em) as n
    from public.curtidas c join public.publicacoes p on p.id = c.publicacao_id
    where p.autor_id = eu and c.user_id <> eu
  ),
  lista(codigo, grupo, emoji, titulo, descricao, meta, valor, conquistada_em) as (
    values
    ('treinos_1', 'Treinos', '🏁', 'Primeiro treino', 'Registrou o primeiro treino no app', 1::numeric,
      (select count(*) from s)::numeric, (select concluida_em from s where n = 1)),
    ('treinos_10', 'Treinos', '💪', '10 treinos', 'Dez treinos registrados', 10, (select count(*) from s), (select concluida_em from s where n = 10)),
    ('treinos_25', 'Treinos', '🔥', '25 treinos', 'Já virou rotina', 25, (select count(*) from s), (select concluida_em from s where n = 25)),
    ('treinos_50', 'Treinos', '⚡', '50 treinos', 'Meio caminho para os 100', 50, (select count(*) from s), (select concluida_em from s where n = 50)),
    ('treinos_100', 'Treinos', '🏆', '100 treinos', 'Cem treinos. Respeito.', 100, (select count(*) from s), (select concluida_em from s where n = 100)),
    ('treinos_250', 'Treinos', '👑', '250 treinos', 'Lenda da Fit One', 250, (select count(*) from s), (select concluida_em from s where n = 250)),

    ('semanas_4', 'Constância', '📅', '4 semanas seguidas', '4 semanas seguidas com 3+ treinos', 4, v_seq, null::timestamptz),
    ('semanas_12', 'Constância', '🗓️', '12 semanas seguidas', '3 meses sem falhar a meta', 12, v_seq, null),
    ('semanas_26', 'Constância', '💎', '26 semanas seguidas', 'Meio ano na meta toda semana', 26, v_seq, null),
    ('cedo_10', 'Constância', '🌅', 'Madrugador', '10 treinos começando antes das 7h', 10, (select count(*) from cedo), (select concluida_em from cedo where n = 10)),

    ('recorde_1', 'Força', '📈', 'Primeiro recorde', 'Bateu a sua maior carga num exercício', 1, (select count(*) from r), (select alcancado_em from r where n = 1)),
    ('recorde_10', 'Força', '🚀', '10 recordes', 'Dez cargas máximas batidas', 10, (select count(*) from r), (select alcancado_em from r where n = 10)),
    ('recorde_50', 'Força', '🦾', '50 recordes', 'Evolução de verdade', 50, (select count(*) from r), (select alcancado_em from r where n = 50)),
    ('volume_10t', 'Força', '🏋️', '10 toneladas num treino', 'Somou 10.000 kg de volume em um treino', 10000,
      coalesce((select max(volume_kg) from vol), 0), (select min(concluida_em) from vol where volume_kg >= 10000)),
    ('volume_100t', 'Força', '🏗️', '100 toneladas', 'Somou 100.000 kg levantados no app', 100000,
      coalesce((select max(acumulado) from vol), 0), (select min(concluida_em) from vol where acumulado >= 100000)),

    ('corrida_5k', 'Corrida e bike', '🏃', 'Primeiros 5 km', 'Correu 5 km de uma vez com GPS', 5000,
      coalesce((select max(distancia_m) from run), 0), (select min(concluida_em) from run where distancia_m >= 5000)),
    ('corrida_10k', 'Corrida e bike', '🎽', '10 km', 'Correu 10 km de uma vez', 10000,
      coalesce((select max(distancia_m) from run), 0), (select min(concluida_em) from run where distancia_m >= 10000)),
    ('corrida_21k', 'Corrida e bike', '🥇', 'Meia maratona', 'Correu 21,1 km de uma vez', 21097,
      coalesce((select max(distancia_m) from run), 0), (select min(concluida_em) from run where distancia_m >= 21097)),
    ('corrida_100k', 'Corrida e bike', '🛣️', '100 km corridos', 'Somou 100 km de corrida no app', 100000,
      coalesce((select max(acumulado) from run), 0), (select min(concluida_em) from run where acumulado >= 100000)),
    ('bike_20k', 'Corrida e bike', '🚴', '20 km de bike', 'Pedalou 20 km de uma vez', 20000,
      coalesce((select max(distancia_m) from pedal), 0), (select min(concluida_em) from pedal where distancia_m >= 20000)),

    ('hybrid_10', 'Modalidades', '🟣', '10 Hybrids', 'Dez treinos de Hybrid', 10, (select count(*) from hyb), (select concluida_em from hyb where n = 10)),
    ('cross_10', 'Modalidades', '🩷', '10 Cross', 'Dez treinos de Cross', 10, (select count(*) from crs), (select concluida_em from crs where n = 10)),

    ('boa_50', 'Comunidade', '🤝', '50 Boa!', 'Recebeu 50 "Boa!" da galera', 50, (select count(*) from boas), (select criado_em from boas where n = 50)),
    ('desafio_1', 'Comunidade', '🎯', 'Desafio cumprido', 'Completou um desafio da academia', 1,
      (select count(*) from public.desafio_participantes dp join public.desafios d on d.id = dp.desafio_id
       where dp.user_id = eu and public.progresso_desafio(d.id, eu) >= d.meta), null)
  )
  select l.codigo, l.grupo, l.emoji, l.titulo, l.descricao, l.meta, least(l.valor, l.meta),
         case when l.valor >= l.meta then coalesce(l.conquistada_em, now()) end
  from lista l;
end;
$$;

revoke execute on function public.minhas_conquistas() from public, anon;
grant execute on function public.minhas_conquistas() to authenticated;

notify pgrst, 'reload schema';
