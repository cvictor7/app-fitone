-- App Fit One · corrida e bike com GPS do celular.
-- O percurso (pontos do mapa) é dado sensível: mostra onde a pessoa mora/trabalha.
-- Por isso fica numa tabela só dele, que só o próprio aluno lê. Ninguém mais vê o mapa
-- (nem o personal, nem a comunidade). Para os outros vão só os números (km, ritmo, tempo).

create table if not exists public.percursos (
  sessao_id uuid primary key references public.sessoes (id) on delete cascade,
  aluno_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  distancia_m integer not null check (distancia_m >= 0 and distancia_m <= 500000),
  duracao_s integer not null check (duracao_s >= 0),
  ganho_m integer, -- subida acumulada (opcional)
  parciais jsonb not null default '[]'::jsonb, -- [{ "km": 1, "s": 312 }, ...]
  pontos jsonb not null default '[]'::jsonb,   -- [[lat, lng], ...] simplificado (máx. ~2000)
  criado_em timestamptz not null default now()
);

alter table public.percursos enable row level security;
drop policy if exists "so o dono" on public.percursos;
create policy "so o dono" on public.percursos for all to authenticated
  using (aluno_id = auth.uid())
  with check (aluno_id = auth.uid() and public.dono_da_sessao(sessao_id) = auth.uid());
grant select, insert, update, delete on public.percursos to authenticated;

notify pgrst, 'reload schema';
