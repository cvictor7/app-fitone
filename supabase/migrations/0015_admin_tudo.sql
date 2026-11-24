-- App Fit One · admin pode tudo:
-- 1) apaga qualquer publicação da comunidade (moderação);
-- 2) promove alguém a admin (ex.: dono e sócio). Admin não rebaixa nem remove outro admin
--    pelo app (evita um tirar o outro); isso só pelo SQL Editor.

drop policy if exists "autor apaga a sua" on public.publicacoes;
drop policy if exists "autor ou admin apaga" on public.publicacoes;
create policy "autor ou admin apaga" on public.publicacoes for delete to authenticated
  using (autor_id = auth.uid() or public.e_admin(gym_id));

create or replace function public.definir_papel(p_gym uuid, p_user uuid, p_papel public.papel)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_admin(p_gym) then raise exception 'Só o admin'; end if;
  if p_user = auth.uid() then raise exception 'Você não pode mudar o seu próprio papel'; end if;
  update public.gym_members set papel = p_papel
  where gym_id = p_gym and user_id = p_user and ativo and not bloqueado and papel <> 'admin';
  if not found then raise exception 'Membro não encontrado (ou já é admin)'; end if;
end;
$$;

notify pgrst, 'reload schema';
