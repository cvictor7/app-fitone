-- App Fit One · dados de TESTE: liga a sua conta de aluno ao "Personal Demo" e deixa uma
-- mensagem dele para você ver o chat funcionando (aparece em Hoje e em Treinar).
-- Não mexe no seu plano. Pode rodar de novo sem duplicar.

do $$
declare
  v_email text := 'EMAIL_DA_SUA_CONTA_DE_ALUNO';
  v_personal uuid := '00000000-0000-4000-a000-000000000001';
  v_aluno uuid;
  v_gym uuid;
begin
  select id into v_aluno from auth.users where lower(email) = lower(v_email);
  if v_aluno is null then raise exception 'Conta não encontrada: %', v_email; end if;
  select id into v_gym from public.gyms where slug = 'fitone';

  if not exists (select 1 from auth.users where id = v_personal) then
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, created_at, updated_at)
    values (v_personal, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'personal.demo@fitone.invalid', '{"nome":"Personal Demo"}', now(), now());
  end if;
  update public.profiles set nome = 'Personal Demo' where id = v_personal and nome = '';
  insert into public.gym_members (gym_id, user_id, papel) values (v_gym, v_personal, 'personal')
  on conflict (gym_id, user_id) do nothing;

  insert into public.personal_alunos (gym_id, personal_id, aluno_id) values (v_gym, v_personal, v_aluno)
  on conflict (personal_id, aluno_id) do update set ativo = true, ate = null;

  if not exists (select 1 from public.mensagens where personal_id = v_personal and aluno_id = v_aluno) then
    insert into public.mensagens (personal_id, aluno_id, autor_id, texto)
    values (v_personal, v_aluno, v_personal, 'Fala! Amanhã é PULL + Hybrid. Capricha na puxada e me conta como foi 💪');
  end if;
end $$;

-- Para desfazer:
-- delete from public.mensagens where personal_id = '00000000-0000-4000-a000-000000000001';
-- update public.personal_alunos set ativo = false where personal_id = '00000000-0000-4000-a000-000000000001';
