-- App Fit One · publicar sem mostrar o tempo (ex.: o treino era para 45 min e levou 1 h:
-- a pessoa quer mostrar o treino feito, não o cronômetro). Tira a duração e os tempos do resumo.

-- "Wall ball 30 reps 01:20 · Corrida 200 m 00:52" -> "Wall ball 30 reps · Corrida 200 m"
create or replace function public.sem_tempos(p_texto text)
returns text language sql immutable set search_path = '' as $$
  select nullif(btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(coalesce(p_texto, ''),
    '[ ]*·?[ ]*\m[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?\M', '', 'g'),
    '\(limite [0-9]+ min\)', '', 'g'),
    '[ ]+–', '', 'g'),
    '[ ]{2,}', ' ', 'g')), '');
$$;

drop function if exists public.publicar_treino(uuid, text, text);
create or replace function public.publicar_treino(p_sessao uuid, p_rotulo text, p_legenda text default null, p_ocultar_tempo boolean default false)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  s public.sessoes;
  v_gym uuid;
  v_series integer;
  v_recordes integer;
  v_id uuid;
begin
  select * into s from public.sessoes where id = p_sessao;
  if s.id is null or s.aluno_id <> auth.uid() then raise exception 'Treino não encontrado'; end if;
  if s.status <> 'concluida' then raise exception 'Termine o treino antes de publicar'; end if;

  v_gym := coalesce(s.gym_id, (select m.gym_id from public.gym_members m
                               where m.user_id = auth.uid() and m.ativo order by m.desde limit 1));
  if v_gym is null or not public.e_membro(v_gym) then raise exception 'Entre na academia primeiro'; end if;

  select count(*) into v_series from public.series where sessao_id = s.id;
  select count(*) into v_recordes from public.recordes r
    join public.series se on se.id = r.serie_id where se.sessao_id = s.id and r.tipo = 'carga_max';

  insert into public.publicacoes (sessao_id, autor_id, gym_id, legenda, modalidade, rotulo, concluida_em,
                                  duracao_s, volume_kg, series, recordes, resumo)
  values (s.id, auth.uid(), v_gym, nullif(btrim(left(p_legenda, 700)), ''), s.modalidade,
          left(coalesce(nullif(btrim(upper(p_rotulo)), ''), 'TREINO'), 12),
          coalesce(s.concluida_em, now()),
          case when p_ocultar_tempo then null else s.duracao_s end,
          s.volume_kg, v_series, v_recordes,
          case when s.modalidade <> 'musculacao' then left(
            case when p_ocultar_tempo then public.sem_tempos(s.observacao) else s.observacao end, 300) end)
  on conflict (sessao_id) do update set legenda = excluded.legenda, duracao_s = excluded.duracao_s, resumo = excluded.resumo
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.publicar_treino(uuid, text, text, boolean) from public, anon;
grant execute on function public.publicar_treino(uuid, text, text, boolean) to authenticated;

notify pgrst, 'reload schema';
