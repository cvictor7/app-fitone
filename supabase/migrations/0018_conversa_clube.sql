-- App Fit One · conversa dentro do clube (jeito WhatsApp):
-- mensagens só para quem está no clube; admins do clube (o dono + quem ele escolher) fixam e apagam
-- mensagens; opção "só admins enviam" para clube de avisos; @menção avisa no sino; contador de não lidas.
-- O admin da academia pode moderar (apagar/fixar) e entrar em qualquer clube.

alter table public.clube_membros add column if not exists admin boolean not null default false;
alter table public.clube_membros add column if not exists lido_ate timestamptz not null default now();
alter table public.clubes add column if not exists so_admins_enviam boolean not null default false;

create or replace function public.e_admin_clube(p_clube uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.clube_membros m where m.clube_id = p_clube and m.user_id = auth.uid() and (m.dono or m.admin))
      or exists (select 1 from public.clubes c where c.id = p_clube and public.e_admin(c.gym_id));
$$;
grant execute on function public.e_admin_clube(uuid) to authenticated;

create table if not exists public.clube_mensagens (
  id uuid primary key default gen_random_uuid(),
  clube_id uuid not null references public.clubes (id) on delete cascade,
  autor_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  texto text not null check (char_length(btrim(texto)) between 1 and 1500),
  criado_em timestamptz not null default now(),
  fixada boolean not null default false
);
create index if not exists clube_mensagens_clube on public.clube_mensagens (clube_id, criado_em desc);

alter table public.clube_mensagens enable row level security;
drop policy if exists "membros leem" on public.clube_mensagens;
create policy "membros leem" on public.clube_mensagens for select to authenticated
  using (public.e_membro_clube(clube_id));
drop policy if exists "membros enviam" on public.clube_mensagens;
create policy "membros enviam" on public.clube_mensagens for insert to authenticated
  with check (autor_id = auth.uid() and fixada = false and public.e_membro_clube(clube_id)
    and exists (select 1 from public.clubes c where c.id = clube_id and public.e_membro(c.gym_id)
                and (not c.so_admins_enviam or public.e_admin_clube(c.id))));
drop policy if exists "autor ou admin apaga" on public.clube_mensagens;
create policy "autor ou admin apaga" on public.clube_mensagens for delete to authenticated
  using (autor_id = auth.uid() or public.e_admin_clube(clube_id));
grant select, insert, delete on public.clube_mensagens to authenticated;

-- notificação de menção feita dentro de um clube
alter table public.notificacoes add column if not exists clube_id uuid references public.clubes (id) on delete cascade;
alter table public.notificacoes add column if not exists mensagem_id uuid references public.clube_mensagens (id) on delete cascade;

create or replace function public.notificar_mensagem_clube()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_gym uuid;
  v uuid;
begin
  select gym_id into v_gym from public.clubes where id = new.clube_id;
  for v in select * from public.mencionados(new.texto, v_gym) loop
    if v <> new.autor_id and exists (select 1 from public.clube_membros m where m.clube_id = new.clube_id and m.user_id = v) then
      insert into public.notificacoes (user_id, gym_id, tipo, ator_id, clube_id, mensagem_id)
      values (v, v_gym, 'mencao', new.autor_id, new.clube_id, new.id);
    end if;
  end loop;
  -- quem enviou já leu até aqui
  update public.clube_membros set lido_ate = new.criado_em where clube_id = new.clube_id and user_id = new.autor_id;
  return new;
end;
$$;
drop trigger if exists ao_mandar_no_clube on public.clube_mensagens;
create trigger ao_mandar_no_clube after insert on public.clube_mensagens
  for each row execute function public.notificar_mensagem_clube();

-- Mensagens do clube (mais novas primeiro; o app inverte)
create or replace function public.mensagens_clube(p_clube uuid, p_antes timestamptz default null, p_limite integer default 60)
returns table (id uuid, autor_id uuid, autor text, eu boolean, autor_admin boolean, texto text, criado_em timestamptz, fixada boolean)
language sql stable security definer set search_path = '' as $$
  select x.id, x.autor_id, public.nome_curto(pr.nome), x.autor_id = auth.uid(),
         coalesce((select m.dono or m.admin from public.clube_membros m where m.clube_id = x.clube_id and m.user_id = x.autor_id), false),
         x.texto, x.criado_em, x.fixada
  from public.clube_mensagens x
  join public.profiles pr on pr.id = x.autor_id
  where x.clube_id = p_clube and public.e_membro_clube(p_clube)
    and (p_antes is null or x.criado_em < p_antes)
  order by x.criado_em desc
  limit least(greatest(p_limite, 1), 200);
$$;

create or replace function public.marcar_clube_lido(p_clube uuid)
returns void language sql security definer set search_path = '' as $$
  update public.clube_membros set lido_ate = now() where clube_id = p_clube and user_id = auth.uid();
$$;

-- Fixar/desafixar (só admin do clube; até 3 fixadas)
create or replace function public.fixar_mensagem(p_mensagem uuid, p_fixar boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_clube uuid;
begin
  select clube_id into v_clube from public.clube_mensagens where id = p_mensagem;
  if v_clube is null or not public.e_admin_clube(v_clube) then raise exception 'Só admin do clube'; end if;
  if p_fixar and (select count(*) from public.clube_mensagens where clube_id = v_clube and fixada) >= 3 then
    raise exception 'Já tem 3 mensagens fixadas';
  end if;
  update public.clube_mensagens set fixada = p_fixar where id = p_mensagem;
end;
$$;

-- Dono (ou admin da academia) escolhe os admins do clube
create or replace function public.definir_admin_clube(p_clube uuid, p_user uuid, p_admin boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (public.e_dono_clube(p_clube)
          or exists (select 1 from public.clubes c where c.id = p_clube and public.e_admin(c.gym_id))) then
    raise exception 'Só o dono do clube';
  end if;
  update public.clube_membros set admin = p_admin where clube_id = p_clube and user_id = p_user and not dono;
end;
$$;

-- Admin do clube tira alguém do clube
create or replace function public.remover_do_clube(p_clube uuid, p_user uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_admin_clube(p_clube) then raise exception 'Só admin do clube'; end if;
  delete from public.clube_membros where clube_id = p_clube and user_id = p_user and not dono;
end;
$$;

-- Ajuste do clube: só admins enviam
create or replace function public.clube_so_admins(p_clube uuid, p_sim boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.e_admin_clube(p_clube) then raise exception 'Só admin do clube'; end if;
  update public.clubes set so_admins_enviam = p_sim where id = p_clube;
end;
$$;

-- Membros do clube (com admin)
create or replace function public.membros_clube(p_clube uuid)
returns table (user_id uuid, autor text, eu boolean, dono boolean, admin boolean)
language sql stable security definer set search_path = '' as $$
  select m.user_id, public.nome_curto(pr.nome), m.user_id = auth.uid(), m.dono, m.admin
  from public.clube_membros m
  join public.clubes c on c.id = m.clube_id
  join public.profiles pr on pr.id = m.user_id
  where m.clube_id = p_clube and public.e_membro(c.gym_id)
    and (not c.fechado or public.e_membro_clube(c.id) or public.e_admin(c.gym_id))
  order by m.dono desc, m.admin desc, pr.nome;
$$;

-- Lista de clubes passa a trazer: sou admin, só admins enviam, mensagens não lidas e a última mensagem
drop function if exists public.clubes_da_academia(uuid);
create function public.clubes_da_academia(p_gym uuid)
returns table (id uuid, nome text, descricao text, fechado boolean, membros bigint, sou_membro boolean, sou_dono boolean,
               codigo text, treinos_semana bigint, sou_admin boolean, so_admins_enviam boolean, nao_lidas bigint,
               ultima text, ultima_em timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, c.nome, c.descricao, c.fechado,
         (select count(*) from public.clube_membros m where m.clube_id = c.id),
         eu.user_id is not null,
         coalesce(eu.dono, false),
         case when eu.user_id is not null then c.codigo end,
         (select count(*) from public.publicacoes p join public.clube_membros m on m.user_id = p.autor_id and m.clube_id = c.id
          where p.gym_id = c.gym_id
            and p.concluida_em >= (date_trunc('week', now() at time zone 'America/Manaus') at time zone 'America/Manaus')),
         coalesce(eu.dono or eu.admin, false) or public.e_admin(c.gym_id),
         c.so_admins_enviam,
         case when eu.user_id is null then 0 else
           (select count(*) from public.clube_mensagens x
            where x.clube_id = c.id and x.criado_em > eu.lido_ate and x.autor_id <> auth.uid()) end,
         case when eu.user_id is not null then
           (select public.nome_curto(pr.nome) || ': ' ||
                   regexp_replace(x.texto, '@\[([^\]]{1,40})\]\([0-9a-f-]{36}\)', '@\1', 'g')
            from public.clube_mensagens x join public.profiles pr on pr.id = x.autor_id
            where x.clube_id = c.id order by x.criado_em desc limit 1) end,
         (select max(x.criado_em) from public.clube_mensagens x where x.clube_id = c.id and eu.user_id is not null)
  from public.clubes c
  left join public.clube_membros eu on eu.clube_id = c.id and eu.user_id = auth.uid()
  where c.gym_id = p_gym and public.e_membro(p_gym)
    and (not c.fechado or eu.user_id is not null)
  order by (eu.user_id is not null) desc, 14 desc nulls last, 5 desc, c.nome;
$$;

-- Notificações passam a trazer o clube (menção na conversa)
drop function if exists public.minhas_notificacoes();
create function public.minhas_notificacoes()
returns table (id uuid, tipo text, ator text, publicacao_id uuid, rotulo text, trecho text, criado_em timestamptz, lida boolean,
               clube_id uuid, clube text)
language sql stable security definer set search_path = '' as $$
  select n.id, n.tipo, public.nome_curto(pr.nome), n.publicacao_id, p.rotulo,
         left(regexp_replace(coalesce(c.texto, x.texto, case when n.tipo = 'mencao' then p.legenda end, ''),
                             '@\[([^\]]{1,40})\]\([0-9a-f-]{36}\)', '@\1', 'g'), 120),
         n.criado_em, n.lida, n.clube_id, cl.nome
  from public.notificacoes n
  join public.profiles pr on pr.id = n.ator_id
  left join public.publicacoes p on p.id = n.publicacao_id
  left join public.comentarios c on c.id = n.comentario_id
  left join public.clube_mensagens x on x.id = n.mensagem_id
  left join public.clubes cl on cl.id = n.clube_id
  where n.user_id = auth.uid() and public.e_membro(n.gym_id)
  order by n.criado_em desc
  limit 60;
$$;

revoke execute on function public.mensagens_clube(uuid, timestamptz, integer), public.marcar_clube_lido(uuid),
  public.fixar_mensagem(uuid, boolean), public.definir_admin_clube(uuid, uuid, boolean), public.remover_do_clube(uuid, uuid),
  public.clube_so_admins(uuid, boolean), public.membros_clube(uuid), public.clubes_da_academia(uuid),
  public.minhas_notificacoes() from public, anon;
grant execute on function public.mensagens_clube(uuid, timestamptz, integer), public.marcar_clube_lido(uuid),
  public.fixar_mensagem(uuid, boolean), public.definir_admin_clube(uuid, uuid, boolean), public.remover_do_clube(uuid, uuid),
  public.clube_so_admins(uuid, boolean), public.membros_clube(uuid), public.clubes_da_academia(uuid),
  public.minhas_notificacoes() to authenticated;

-- mensagem nova chega na hora (Supabase Realtime)
do $$
begin
  alter publication supabase_realtime add table public.clube_mensagens;
exception when others then
  raise notice 'realtime não configurado aqui: %', sqlerrm;
end $$;

notify pgrst, 'reload schema';
