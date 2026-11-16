// Dados de exemplo até o Supabase entrar (Etapa 3).
// O formato já segue o banco planejado: plano → treinos (A, B, C) → exercícios prescritos.

import type { Modalidade } from '@/constants/theme';

export type ExercicioPrescrito = {
  id: string;
  nome: string;
  grupo: string;
  series: number;
  repsMin: number;
  repsMax: number;
  cargaSugeridaKg?: number;
  descansoS: number;
  observacao?: string;
};

export type Treino = {
  letra: string;
  nome: string;
  minutos: number;
  ultimoHaDias?: number;
  exercicios: ExercicioPrescrito[];
};

export const PERSONAL = { nome: 'Rafael', iniciais: 'RF' };

export const TREINOS: Treino[] = [
  {
    letra: 'A',
    nome: 'Peito, ombro e tríceps',
    minutos: 60,
    ultimoHaDias: 7,
    exercicios: [
      { id: 'a1', nome: 'Supino reto com barra', grupo: 'Peito', series: 4, repsMin: 8, repsMax: 10, cargaSugeridaKg: 80, descansoS: 120 },
      { id: 'a2', nome: 'Supino inclinado com halteres', grupo: 'Peito', series: 3, repsMin: 10, repsMax: 12, cargaSugeridaKg: 28, descansoS: 90 },
      { id: 'a3', nome: 'Crucifixo na máquina', grupo: 'Peito', series: 3, repsMin: 12, repsMax: 15, cargaSugeridaKg: 50, descansoS: 60, observacao: 'Segura 1 s lá embaixo' },
      { id: 'a4', nome: 'Desenvolvimento com halteres', grupo: 'Ombro', series: 4, repsMin: 8, repsMax: 10, cargaSugeridaKg: 22, descansoS: 90 },
      { id: 'a5', nome: 'Elevação lateral', grupo: 'Ombro', series: 4, repsMin: 12, repsMax: 15, cargaSugeridaKg: 10, descansoS: 60, observacao: 'Drop na última série' },
      { id: 'a6', nome: 'Elevação frontal na polia', grupo: 'Ombro', series: 3, repsMin: 12, repsMax: 12, cargaSugeridaKg: 15, descansoS: 60 },
      { id: 'a7', nome: 'Tríceps na polia com corda', grupo: 'Tríceps', series: 4, repsMin: 10, repsMax: 12, cargaSugeridaKg: 30, descansoS: 60 },
      { id: 'a8', nome: 'Tríceps francês', grupo: 'Tríceps', series: 3, repsMin: 10, repsMax: 12, cargaSugeridaKg: 16, descansoS: 60 },
    ],
  },
  {
    letra: 'B',
    nome: 'Costas e bíceps',
    minutos: 55,
    ultimoHaDias: 5,
    exercicios: [
      { id: 'b1', nome: 'Puxada frontal', grupo: 'Costas', series: 4, repsMin: 8, repsMax: 10, cargaSugeridaKg: 65, descansoS: 90 },
      { id: 'b2', nome: 'Remada curvada com barra', grupo: 'Costas', series: 4, repsMin: 8, repsMax: 10, cargaSugeridaKg: 60, descansoS: 120 },
      { id: 'b3', nome: 'Remada baixa no triângulo', grupo: 'Costas', series: 3, repsMin: 10, repsMax: 12, cargaSugeridaKg: 55, descansoS: 90 },
      { id: 'b4', nome: 'Pulldown na polia', grupo: 'Costas', series: 3, repsMin: 12, repsMax: 15, cargaSugeridaKg: 30, descansoS: 60 },
      { id: 'b5', nome: 'Rosca direta com barra W', grupo: 'Bíceps', series: 4, repsMin: 8, repsMax: 10, cargaSugeridaKg: 30, descansoS: 90 },
      { id: 'b6', nome: 'Rosca martelo', grupo: 'Bíceps', series: 3, repsMin: 10, repsMax: 12, cargaSugeridaKg: 14, descansoS: 60 },
      { id: 'b7', nome: 'Rosca no banco Scott', grupo: 'Bíceps', series: 3, repsMin: 10, repsMax: 12, cargaSugeridaKg: 25, descansoS: 60 },
    ],
  },
  {
    letra: 'C',
    nome: 'Pernas completo',
    minutos: 65,
    ultimoHaDias: 3,
    exercicios: [
      { id: 'c1', nome: 'Agachamento livre', grupo: 'Quadríceps', series: 4, repsMin: 6, repsMax: 8, cargaSugeridaKg: 100, descansoS: 150 },
      { id: 'c2', nome: 'Leg press 45°', grupo: 'Quadríceps', series: 4, repsMin: 10, repsMax: 12, cargaSugeridaKg: 220, descansoS: 120 },
      { id: 'c3', nome: 'Cadeira extensora', grupo: 'Quadríceps', series: 3, repsMin: 12, repsMax: 15, cargaSugeridaKg: 60, descansoS: 60 },
      { id: 'c4', nome: 'Stiff com barra', grupo: 'Posterior', series: 4, repsMin: 8, repsMax: 10, cargaSugeridaKg: 70, descansoS: 120 },
      { id: 'c5', nome: 'Mesa flexora', grupo: 'Posterior', series: 3, repsMin: 10, repsMax: 12, cargaSugeridaKg: 45, descansoS: 60 },
      { id: 'c6', nome: 'Cadeira abdutora', grupo: 'Glúteo', series: 3, repsMin: 15, repsMax: 15, cargaSugeridaKg: 70, descansoS: 60 },
      { id: 'c7', nome: 'Panturrilha em pé', grupo: 'Panturrilha', series: 4, repsMin: 12, repsMax: 15, cargaSugeridaKg: 80, descansoS: 45 },
    ],
  },
];

export const TREINO_DE_HOJE = 'A';

// Um dia pode ter mais de um treino (ex.: musculação de manhã e Hyrox à tarde)
export const SEMANA: { dia: string; feitos: Modalidade[]; hoje?: boolean }[] = [
  { dia: 'S', feitos: ['musculacao'] },
  { dia: 'T', feitos: ['musculacao', 'hyrox'] },
  { dia: 'Q', feitos: ['hybrid'] },
  { dia: 'Q', feitos: [], hoje: true },
  { dia: 'S', feitos: [] },
  { dia: 'S', feitos: [] },
  { dia: 'D', feitos: [] },
];

export const RECORDES = [
  { exercicio: 'Supino reto com barra', valor: '82,5 kg', quando: 'terça' },
  { exercicio: 'Agachamento livre', valor: '105 kg', quando: 'há 9 dias' },
  { exercicio: 'Puxada frontal', valor: '70 kg', quando: 'há 12 dias' },
];

export function buscarTreino(letra: string) {
  return TREINOS.find((t) => t.letra === letra);
}

export function textoReps(e: ExercicioPrescrito) {
  return e.repsMin === e.repsMax ? `${e.repsMin}` : `${e.repsMin} a ${e.repsMax}`;
}

export function textoCarga(kg?: number) {
  if (kg === undefined) return '—';
  return `${kg.toLocaleString('pt-BR')} kg`;
}
