-- App Fit One · a modalidade "Hyrox" saiu do app (é marca registrada; o treino vira "Hybrid").
-- Treinos já registrados como Hyrox passam a ser Hybrid. O valor continua existindo no banco
-- (o Postgres não apaga valor de enum sem recriar o tipo), mas o app não usa mais.
update public.sessoes set modalidade = 'hybrid' where modalidade = 'hyrox';
update public.treinos set modalidade = 'hybrid' where modalidade = 'hyrox';
