-- App Fit One · concluir treino em UMA viagem ao banco (antes eram 4–5, ~1 s cada no 4G).
-- Recebe o treino inteiro (séries e anotações) e faz tudo numa transação só.
-- Pode chamar de novo com o mesmo id (internet caiu): não duplica.

create or replace function public.concluir_treino(p jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := (p->>'id')::uuid;
  v_dono uuid;
begin
  if auth.uid() is null then raise exception 'Faça login'; end if;
  select aluno_id into v_dono from public.sessoes where id = v_id;
  if v_dono is not null and v_dono <> auth.uid() then raise exception 'Treino de outra pessoa'; end if;
  if (p->>'gym_id') is not null and not public.e_membro((p->>'gym_id')::uuid) then raise exception 'Entre na academia primeiro'; end if;

  insert into public.sessoes (id, aluno_id, gym_id, modalidade, treino_id, origem, iniciada_em, status, observacao)
  values (v_id, auth.uid(), (p->>'gym_id')::uuid, 'musculacao', (p->>'treino_id')::uuid, 'app',
          coalesce((p->>'iniciada_em')::timestamptz, now()), 'em_andamento', p->>'observacao')
  on conflict (id) do update set observacao = excluded.observacao, status = 'em_andamento';

  delete from public.series where sessao_id = v_id;
  insert into public.series (sessao_id, exercicio_id, treino_exercicio_id, numero, carga_kg, reps, feita_em)
  select v_id, (s->>'exercicio_id')::uuid, (s->>'treino_exercicio_id')::uuid, (s->>'numero')::int,
         (s->>'carga_kg')::numeric, (s->>'reps')::int, coalesce((s->>'feita_em')::timestamptz, now())
  from jsonb_array_elements(coalesce(p->'series', '[]'::jsonb)) s;

  -- concluir dispara os gatilhos de volume, duração e recordes
  update public.sessoes set status = 'concluida', concluida_em = now() where id = v_id;

  insert into public.notas_exercicio (sessao_id, exercicio_id, aluno_id, texto)
  select v_id, (n->>'exercicio_id')::uuid, auth.uid(), left(btrim(n->>'texto'), 300)
  from jsonb_array_elements(coalesce(p->'notas', '[]'::jsonb)) n
  where btrim(coalesce(n->>'texto', '')) <> ''
  on conflict (sessao_id, exercicio_id) do update set texto = excluded.texto;

  return v_id;
end;
$$;

revoke execute on function public.concluir_treino(jsonb) from public, anon;
grant execute on function public.concluir_treino(jsonb) to authenticated;

notify pgrst, 'reload schema';
