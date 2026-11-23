-- App Fit One · TESTE do lado do personal (e do painel do dono) com uma 2ª conta.
-- A 2ª conta vira ADMIN (vê tudo do personal + aba Academia) e fica vinculada à sua conta de aluno.
-- NÃO mexe no seu plano nem nos seus treinos. Pode rodar de novo.
-- Cuidado no lado do personal: "Criar plano" para o seu aluno troca o plano ativo dele.

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
  if v_personal is null then raise exception 'Conta personal não encontrada (%): crie a conta no app primeiro', v_email_personal; end if;
  if v_aluno is null then raise exception 'Conta de aluno não encontrada (%)', v_email_aluno; end if;
  if v_personal = v_aluno then raise exception 'Use duas contas diferentes'; end if;

  insert into public.gym_members (gym_id, user_id, papel) values (v_gym, v_personal, 'admin')
  on conflict (gym_id, user_id) do update set papel = 'admin', ativo = true;

  insert into public.personal_alunos (gym_id, personal_id, aluno_id) values (v_gym, v_personal, v_aluno)
  on conflict (personal_id, aluno_id) do update set ativo = true, ate = null;
end $$;

select u.email, m.papel from public.gym_members m join auth.users u on u.id = m.user_id
where u.email not like '%.invalid' order by m.papel;
