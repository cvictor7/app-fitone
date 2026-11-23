-- App Fit One · DEMONSTRAÇÃO para mostrar ao dono: 14 alunos fictícios (sobrenome "Demo")
-- com treinos dos últimos 30 dias, publicações, "Boa!", comentários e desafios.
-- Enche o feed, o ranking, os desafios e o painel da academia.
-- Os e-mails terminam em @demo.fitone.invalid (ninguém consegue entrar com eles).
-- Pode rodar de novo: apaga a demonstração anterior e recria.
-- PARA TIRAR TUDO antes de lançar de verdade: rode só o bloco "LIMPAR" lá no fim.

do $$
declare
  v_gym uuid;
  v_nomes text[] := array['Ana Demo', 'Bruno Demo', 'Camila Demo', 'Diego Demo', 'Eduarda Demo', 'Felipe Demo',
    'Gabriela Demo', 'Heitor Demo', 'Isabela Demo', 'João Demo', 'Larissa Demo', 'Mateus Demo', 'Natália Demo', 'Rafael Demo'];
  v_legendas text[] := array['Bora que amanhã tem mais', 'Treino antes do trabalho', 'Pago ✓', NULL, NULL, 'Hoje foi pesado'];
  v_legendas_musc text[] := array['Costas destruídas 🔥', 'Primeira vez fechando todas as séries', 'Recorde no supino!',
    'Perna em dia 🦵', NULL, 'Bora que amanhã tem mais'];
  v_comentarios text[] := array['Monstro!', 'Boa demais', 'Bora junto amanhã?', 'Que evolução 👏', 'Tá voando'];
  v_mods text[] := array['musculacao', 'musculacao', 'musculacao', 'musculacao', 'hybrid', 'cross', 'corrida', 'bike'];
  v_rotulos_musc text[] := array['PUSH', 'PULL', 'LEGS', 'UPPER', 'LOWER'];
  v_ids uuid[] := '{}';
  v_user uuid;
  v_sessao uuid;
  v_pub uuid;
  v_mod text;
  v_dia int;
  v_quando timestamptz;
  v_dur int;
  v_vol numeric;
  i int;
  k int;
  v_freq int;
  v_d1 uuid;
  v_d2 uuid;
begin
  select id into v_gym from public.gyms where codigo_convite = 'FITONE';
  if v_gym is null then raise exception 'Academia FITONE não encontrada'; end if;

  -- recomeça do zero (apaga a demonstração anterior, em cascata)
  delete from auth.users where email like '%@demo.fitone.invalid';
  delete from public.desafios where gym_id = v_gym and titulo like '% (demo)';

  perform setseed(0.42);

  for i in 1 .. array_length(v_nomes, 1) loop
    v_user := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values (v_user, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            format('aluno%s@demo.fitone.invalid', i), jsonb_build_object('nome', v_nomes[i]), now(), now());
    update public.profiles set nome = v_nomes[i] where id = v_user;
    insert into public.gym_members (gym_id, user_id, papel, desde)
    values (v_gym, v_user, 'aluno', current_date - (5 + floor(random() * 120))::int)
    on conflict (gym_id, user_id) do nothing;
    v_ids := v_ids || v_user;

    -- frequência variada: uns treinam quase todo dia, dois "sumiram"
    v_freq := case when i in (13, 14) then 0 when i <= 4 then 5 else 2 + (i % 3) end;

    for v_dia in 0 .. 29 loop
      continue when v_freq = 0 and v_dia < 18;           -- sumidos: só treinos antigos
      continue when random() > (case when v_freq = 0 then 0.35 else v_freq / 7.0 end);
      v_mod := v_mods[1 + floor(random() * array_length(v_mods, 1))::int];
      v_quando := date_trunc('day', now() at time zone 'America/Manaus') at time zone 'America/Manaus'
                  - make_interval(days => v_dia) + make_interval(hours => (6 + floor(random() * 14))::int);
      continue when v_quando > now();
      v_dur := case when v_mod = 'musculacao' then 2700 + floor(random() * 2100) else 1500 + floor(random() * 2400) end;
      v_vol := case when v_mod = 'musculacao' then 4000 + floor(random() * 9000) else 0 end;

      insert into public.sessoes (aluno_id, gym_id, modalidade, origem, iniciada_em, concluida_em, duracao_s, volume_kg,
                                  sensacao, observacao, status)
      values (v_user, v_gym, v_mod::public.modalidade, 'app', v_quando - make_interval(secs => v_dur), v_quando, v_dur, v_vol,
              1 + floor(random() * 5)::int,
              case v_mod when 'hybrid' then 'Prova híbrida: 8 partes' when 'cross' then 'AMRAP 20 min: 7 rodadas'
                         when 'corrida' then 'Esteira 5 km' when 'bike' then 'Bike 40 min' end,
              'concluida')
      returning id into v_sessao;

      -- metade dos treinos vai para a comunidade
      if random() < 0.5 then
        insert into public.publicacoes (sessao_id, autor_id, gym_id, criado_em, legenda, modalidade, rotulo, concluida_em,
                                        duracao_s, volume_kg, series, recordes, resumo)
        values (v_sessao, v_user, v_gym, v_quando + interval '5 minutes',
                case when v_mod = 'musculacao'
                     then v_legendas_musc[1 + floor(random() * array_length(v_legendas_musc, 1))::int]
                     else v_legendas[1 + floor(random() * array_length(v_legendas, 1))::int] end,
                v_mod::public.modalidade,
                case when v_mod = 'musculacao' then v_rotulos_musc[1 + floor(random() * 5)::int] else upper(v_mod) end,
                v_quando, v_dur, v_vol,
                case when v_mod = 'musculacao' then 15 + floor(random() * 10)::int else 0 end,
                case when v_mod = 'musculacao' and random() < 0.2 then 1 + floor(random() * 2)::int else 0 end,
                case v_mod when 'hybrid' then 'Prova híbrida: 8 partes' when 'cross' then 'AMRAP 20 min: 7 rodadas'
                           when 'corrida' then 'Esteira 5 km' when 'bike' then 'Bike 40 min' end)
        returning id into v_pub;
      end if;
    end loop;
  end loop;

  -- "Boa!" e comentários entre os alunos da demonstração
  for v_pub in select p.id from public.publicacoes p join auth.users u on u.id = p.autor_id
               where u.email like '%@demo.fitone.invalid' loop
    for k in 1 .. floor(random() * 7)::int loop
      insert into public.curtidas (publicacao_id, user_id, criado_em)
      values (v_pub, v_ids[1 + floor(random() * array_length(v_ids, 1))::int], now())
      on conflict do nothing;
    end loop;
    if random() < 0.3 then
      insert into public.comentarios (publicacao_id, autor_id, texto)
      values (v_pub, v_ids[1 + floor(random() * array_length(v_ids, 1))::int],
              v_comentarios[1 + floor(random() * array_length(v_comentarios, 1))::int]);
    end if;
  end loop;

  -- desafios com gente participando
  insert into public.desafios (gym_id, titulo, descricao, medida, meta, modalidade, inicio, fim)
  values (v_gym, '20 treinos em 30 dias (demo)', 'Quem completar ganha uma camiseta da Fit One.', 'treinos', 20, null,
          current_date - 25, current_date + 5)
  returning id into v_d1;
  insert into public.desafios (gym_id, titulo, descricao, medida, meta, modalidade, inicio, fim)
  values (v_gym, '600 min de Hybrid (demo)', 'Some 10 horas de Hybrid no mês.', 'minutos', 600, 'hybrid',
          current_date - 20, current_date + 10)
  returning id into v_d2;
  for i in 1 .. 10 loop
    insert into public.desafio_participantes (desafio_id, user_id) values (v_d1, v_ids[i]) on conflict do nothing;
    if i % 2 = 0 then
      insert into public.desafio_participantes (desafio_id, user_id) values (v_d2, v_ids[i]) on conflict do nothing;
    end if;
  end loop;
end $$;

select count(*) filter (where email like '%@demo.fitone.invalid') as alunos_demo from auth.users;

-- ===================== LIMPAR (rode só estas duas linhas para tirar a demonstração) =====================
-- delete from auth.users where email like '%@demo.fitone.invalid';
-- delete from public.desafios where titulo like '% (demo)';
