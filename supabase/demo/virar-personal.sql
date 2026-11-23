-- App Fit One · TESTE: transforma uma conta em personal e passa seu aluno para ela.
-- Troque os dois e-mails abaixo antes de rodar (só no SQL Editor do Supabase, nunca no app).

do $$
declare
  v_email_personal text := 'EMAIL_DA_CONTA_PERSONAL';
  v_email_aluno    text := 'EMAIL_DA_SUA_CONTA_DE_ALUNO';
  v_personal uuid;
  v_aluno uuid;
  v_gym uuid;
begin
  select id into v_personal from auth.users where lower(email) = lower(v_email_personal);
  select id into v_aluno from auth.users where lower(email) = lower(v_email_aluno);
  select id into v_gym from public.gyms where slug = 'fitone';
  if v_personal is null then raise exception 'Conta personal não encontrada: crie a conta no app primeiro'; end if;
  if v_aluno is null then raise exception 'Conta de aluno não encontrada'; end if;

  insert into public.gym_members (gym_id, user_id, papel) values (v_gym, v_personal, 'personal')
  on conflict (gym_id, user_id) do update set papel = 'personal', ativo = true;

  -- tira o Personal Demo e liga o aluno ao personal novo
  update public.personal_alunos set ativo = false where aluno_id = v_aluno and personal_id <> v_personal;
  insert into public.personal_alunos (gym_id, personal_id, aluno_id) values (v_gym, v_personal, v_aluno)
  on conflict (personal_id, aluno_id) do update set ativo = true, ate = null;

  -- os planos do aluno passam a ser desse personal
  update public.planos set personal_id = v_personal where aluno_id = v_aluno;
end $$;

select u.email, m.papel from public.gym_members m join auth.users u on u.id = m.user_id order by m.papel;
