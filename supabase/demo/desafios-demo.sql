-- App Fit One · dados de TESTE: dois desafios na Fit One para testar a aba Desafios.
-- Pode rodar de novo sem duplicar. Para tirar: ver o fim do arquivo.

insert into public.desafios (gym_id, titulo, descricao, medida, meta, modalidade, inicio, fim)
select g.id, 'Dezembro sem falta', 'Teste: 12 treinos até o fim do ano. Qualquer modalidade vale.', 'treinos', 12, null,
       (now() at time zone 'America/Manaus')::date,
       make_date(extract(year from now() at time zone 'America/Manaus')::int, 12, 31)
from public.gyms g
where g.codigo_convite = 'FITONE'
  and not exists (select 1 from public.desafios d where d.gym_id = g.id and d.titulo = 'Dezembro sem falta');

insert into public.desafios (gym_id, titulo, descricao, medida, meta, modalidade, inicio, fim)
select g.id, '300 min de Hybrid', 'Teste: some 300 minutos de Hybrid em 30 dias.', 'minutos', 300, 'hybrid',
       (now() at time zone 'America/Manaus')::date,
       (now() at time zone 'America/Manaus')::date + 29
from public.gyms g
where g.codigo_convite = 'FITONE'
  and not exists (select 1 from public.desafios d where d.gym_id = g.id and d.titulo = '300 min de Hybrid');

-- Para tirar os desafios de teste:
-- delete from public.desafios where titulo in ('Dezembro sem falta', '300 min de Hybrid');
