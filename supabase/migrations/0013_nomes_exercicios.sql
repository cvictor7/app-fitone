-- App Fit One · nomes de exercício do jeito que se fala na academia.
-- Junta duplicados (mesma máquina com dois nomes): os treinos, séries, recordes e vídeos
-- do nome antigo passam para o nome certo, e o antigo some. Pode rodar de novo.

create or replace function public.fundir_exercicio(p_de text, p_para text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_de uuid;
  v_para uuid;
begin
  select id into v_de from public.exercicios where gym_id is null and lower(nome) = lower(p_de);
  select id into v_para from public.exercicios where gym_id is null and lower(nome) = lower(p_para);
  if v_de is null then return; end if;              -- já foi feito
  if v_para is null then                             -- não tem o nome novo: só renomeia
    update public.exercicios set nome = p_para where id = v_de;
    return;
  end if;
  update public.treino_exercicios set exercicio_id = v_para where exercicio_id = v_de;
  update public.series set exercicio_id = v_para where exercicio_id = v_de;
  update public.recordes set exercicio_id = v_para where exercicio_id = v_de;
  -- vídeo/instrução: fica o do nome certo; se ele não tiver, herda o do antigo
  update public.exercicio_midias m set exercicio_id = v_para
  where m.exercicio_id = v_de
    and not exists (select 1 from public.exercicio_midias x where x.gym_id = m.gym_id and x.exercicio_id = v_para);
  delete from public.exercicio_midias where exercicio_id = v_de;
  delete from public.exercicios where id = v_de;
end;
$$;
revoke execute on function public.fundir_exercicio(text, text) from public, anon, authenticated;

-- Mesma máquina, dois nomes
select public.fundir_exercicio('Fly na máquina', 'Voador');
select public.fundir_exercicio('Crucifixo na máquina', 'Voador');
select public.fundir_exercicio('Supino na máquina', 'Supino reto na máquina');
select public.fundir_exercicio('Puxada frontal', 'Puxada alta');

-- Só o nome
select public.fundir_exercicio('Mergulho nas paralelas', 'Paralela');
select public.fundir_exercicio('Crucifixo invertido', 'Voador invertido');
select public.fundir_exercicio('Remada baixa no triângulo', 'Remada baixa');
select public.fundir_exercicio('Rosca no banco Scott', 'Rosca Scott');
select public.fundir_exercicio('Agachamento hack', 'Hack');
select public.fundir_exercicio('Abdominal supra na máquina', 'Abdominal na máquina');

notify pgrst, 'reload schema';
