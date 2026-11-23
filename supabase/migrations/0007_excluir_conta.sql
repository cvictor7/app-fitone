-- App Fit One · excluir a própria conta (exigência da Google Play e direito da LGPD)
-- Apaga o usuário do login; o resto vai junto em cascata: perfil, treinos, séries, recordes,
-- consentimentos, vínculos com personal e planos. Exercícios e vídeos criados por um personal
-- continuam na academia (ficam sem autor).
create or replace function public.excluir_minha_conta()
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'Faça login primeiro'; end if;
  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.excluir_minha_conta() from public, anon;
grant execute on function public.excluir_minha_conta() to authenticated;
