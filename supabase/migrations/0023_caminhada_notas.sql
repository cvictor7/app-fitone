-- App Fit One · (1) Caminhada como modalidade (GPS) e (2) anotação do aluno em cada exercício.
-- A anotação ("senti o ombro", "dá para subir a carga") aparece na próxima vez desse exercício
-- e o personal vê na ficha (só se o aluno autorizou compartilhar os treinos).

alter type public.modalidade add value if not exists 'caminhada';

create table if not exists public.notas_exercicio (
  sessao_id uuid not null references public.sessoes (id) on delete cascade,
  exercicio_id uuid not null references public.exercicios (id) on delete cascade,
  aluno_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  texto text not null check (char_length(btrim(texto)) between 1 and 300),
  criado_em timestamptz not null default now(),
  primary key (sessao_id, exercicio_id)
);
create index if not exists notas_exercicio_aluno on public.notas_exercicio (aluno_id, exercicio_id, criado_em desc);

alter table public.notas_exercicio enable row level security;
drop policy if exists "aluno cuida das suas" on public.notas_exercicio;
create policy "aluno cuida das suas" on public.notas_exercicio for all to authenticated
  using (aluno_id = auth.uid())
  with check (aluno_id = auth.uid() and public.dono_da_sessao(sessao_id) = auth.uid());
drop policy if exists "personal le com permissao" on public.notas_exercicio;
create policy "personal le com permissao" on public.notas_exercicio for select to authenticated
  using (public.personal_ve_treinos(aluno_id));
grant select, insert, update, delete on public.notas_exercicio to authenticated;

notify pgrst, 'reload schema';
