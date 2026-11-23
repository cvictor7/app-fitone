-- App Fit One · dados de TESTE: um aviso da academia (aparece em Hoje para todos os alunos por 7 dias).
insert into public.avisos (gym_id, titulo, texto, expira_em)
select g.id, 'Bem-vindo ao app da Fit One!', 'Teste de aviso: aqui a academia avisa horário de feriado, eventos e novidades. Toque no ✕ para fechar.',
       (now() at time zone 'America/Manaus')::date + 6
from public.gyms g
where g.slug = 'fitone'
  and not exists (select 1 from public.avisos a where a.gym_id = g.id and a.titulo = 'Bem-vindo ao app da Fit One!');
-- Para tirar: delete from public.avisos where titulo = 'Bem-vindo ao app da Fit One!';
