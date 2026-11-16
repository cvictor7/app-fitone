-- App Fit One · dados iniciais (rodar depois do 0001_base.sql)

insert into public.gyms (nome, slug, codigo_convite)
values ('Fit One Manaus', 'fitone', 'FITONE')
on conflict (slug) do nothing;

-- Catálogo geral de exercícios (gym_id null = vale para qualquer academia)
insert into public.exercicios (nome, grupo, equipamento) values
  -- Peito
  ('Supino reto com barra', 'Peito', 'Barra'),
  ('Supino reto com halteres', 'Peito', 'Halteres'),
  ('Supino inclinado com barra', 'Peito', 'Barra'),
  ('Supino inclinado com halteres', 'Peito', 'Halteres'),
  ('Supino declinado', 'Peito', 'Barra'),
  ('Supino na máquina', 'Peito', 'Máquina'),
  ('Crucifixo com halteres', 'Peito', 'Halteres'),
  ('Crucifixo na máquina', 'Peito', 'Máquina'),
  ('Crossover na polia', 'Peito', 'Polia'),
  ('Flexão de braço', 'Peito', 'Peso do corpo'),
  -- Costas
  ('Puxada frontal', 'Costas', 'Polia'),
  ('Puxada com triângulo', 'Costas', 'Polia'),
  ('Barra fixa', 'Costas', 'Peso do corpo'),
  ('Remada curvada com barra', 'Costas', 'Barra'),
  ('Remada unilateral com halter', 'Costas', 'Halteres'),
  ('Remada baixa no triângulo', 'Costas', 'Polia'),
  ('Remada na máquina', 'Costas', 'Máquina'),
  ('Pulldown na polia', 'Costas', 'Polia'),
  ('Levantamento terra', 'Costas', 'Barra'),
  -- Ombro
  ('Desenvolvimento com halteres', 'Ombro', 'Halteres'),
  ('Desenvolvimento com barra', 'Ombro', 'Barra'),
  ('Desenvolvimento na máquina', 'Ombro', 'Máquina'),
  ('Elevação lateral', 'Ombro', 'Halteres'),
  ('Elevação lateral na polia', 'Ombro', 'Polia'),
  ('Elevação frontal na polia', 'Ombro', 'Polia'),
  ('Crucifixo invertido', 'Ombro', 'Máquina'),
  ('Encolhimento com halteres', 'Trapézio', 'Halteres'),
  -- Bíceps
  ('Rosca direta com barra', 'Bíceps', 'Barra'),
  ('Rosca direta com barra W', 'Bíceps', 'Barra'),
  ('Rosca alternada com halteres', 'Bíceps', 'Halteres'),
  ('Rosca martelo', 'Bíceps', 'Halteres'),
  ('Rosca no banco Scott', 'Bíceps', 'Barra'),
  ('Rosca na polia', 'Bíceps', 'Polia'),
  -- Tríceps
  ('Tríceps na polia com corda', 'Tríceps', 'Polia'),
  ('Tríceps na polia com barra', 'Tríceps', 'Polia'),
  ('Tríceps francês', 'Tríceps', 'Halteres'),
  ('Tríceps testa', 'Tríceps', 'Barra'),
  ('Mergulho nas paralelas', 'Tríceps', 'Peso do corpo'),
  -- Pernas
  ('Agachamento livre', 'Quadríceps', 'Barra'),
  ('Agachamento no Smith', 'Quadríceps', 'Smith'),
  ('Agachamento búlgaro', 'Quadríceps', 'Halteres'),
  ('Agachamento hack', 'Quadríceps', 'Máquina'),
  ('Leg press 45°', 'Quadríceps', 'Máquina'),
  ('Cadeira extensora', 'Quadríceps', 'Máquina'),
  ('Afundo com halteres', 'Quadríceps', 'Halteres'),
  ('Stiff com barra', 'Posterior', 'Barra'),
  ('Mesa flexora', 'Posterior', 'Máquina'),
  ('Cadeira flexora', 'Posterior', 'Máquina'),
  ('Elevação pélvica', 'Glúteo', 'Barra'),
  ('Cadeira abdutora', 'Glúteo', 'Máquina'),
  ('Cadeira adutora', 'Adutores', 'Máquina'),
  ('Glúteo na polia', 'Glúteo', 'Polia'),
  ('Panturrilha em pé', 'Panturrilha', 'Máquina'),
  ('Panturrilha sentado', 'Panturrilha', 'Máquina')
on conflict do nothing;

insert into public.exercicios (nome, grupo, equipamento, tipo_medida) values
  ('Abdominal supra', 'Abdômen', 'Peso do corpo', 'reps'),
  ('Abdominal na polia', 'Abdômen', 'Polia', 'carga_reps'),
  ('Elevação de pernas', 'Abdômen', 'Peso do corpo', 'reps'),
  ('Prancha', 'Abdômen', 'Peso do corpo', 'tempo'),
  ('Esteira', 'Cardio', 'Esteira', 'tempo'),
  ('Bicicleta ergométrica', 'Cardio', 'Bike', 'tempo'),
  ('Escada', 'Cardio', 'Escada', 'tempo')
on conflict do nothing;
