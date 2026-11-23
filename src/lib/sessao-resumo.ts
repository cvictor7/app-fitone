import { rotuloTreino } from '@/lib/rotulo';
import { supabase } from '@/lib/supabase';
import type { Modalidade } from '@/constants/theme';

// Resumo de um treino concluído (tela de concluído e card de compartilhar).

export type ResumoSessao = {
  id: string;
  modalidade: Modalidade;
  letra: string | null;
  rotulo: string; // palavra grande do treino (PUSH, HYBRID...)
  nome: string;
  duracaoS: number;
  volumeKg: number;
  series: number;
  sensacao: number | null;
  observacao: string | null;
  concluidaEm: Date;
  recordes: { exercicio: string; valorKg: number }[];
  melhorSerie: { exercicio: string; kg: number; reps: number } | null; // maior carga do treino
};

export async function buscarResumo(id: string): Promise<ResumoSessao | null> {
  const [rs, rr, rc] = await Promise.all([
    supabase
      .from('sessoes')
      .select('id, modalidade, duracao_s, volume_kg, sensacao, observacao, concluida_em, treino:treinos(letra, nome, rotulo, modalidade)')
      .eq('id', id)
      .maybeSingle(),
    supabase
      .from('recordes')
      .select('valor, exercicio:exercicios(nome), serie:series!inner(sessao_id)')
      .eq('serie.sessao_id', id)
      .eq('tipo', 'carga_max'),
    supabase.from('series').select('carga_kg, reps, exercicio:exercicios(nome)').eq('sessao_id', id),
  ]);
  let melhorSerie: ResumoSessao['melhorSerie'] = null;
  for (const x of (rc.data ?? []) as any[]) {
    const kg = Number(x.carga_kg ?? 0);
    const reps = Number(x.reps ?? 0);
    if (kg > 0 && (!melhorSerie || kg > melhorSerie.kg || (kg === melhorSerie.kg && reps > melhorSerie.reps))) {
      melhorSerie = { exercicio: x.exercicio?.nome ?? '', kg, reps };
    }
  }
  const s = rs.data as any;
  if (!s) return null;
  return {
    id: s.id,
    modalidade: s.modalidade,
    letra: s.treino?.letra ?? null,
    rotulo: rotuloTreino({ ...(s.treino ?? {}), modalidade: s.treino?.modalidade ?? s.modalidade }),
    nome: s.treino?.nome ?? '',
    duracaoS: s.duracao_s ?? 0,
    volumeKg: Number(s.volume_kg ?? 0),
    series: (rc.data ?? []).length,
    sensacao: s.sensacao,
    observacao: s.observacao ?? null,
    concluidaEm: new Date(s.concluida_em),
    recordes: ((rr.data ?? []) as any[]).map((r) => ({ exercicio: r.exercicio?.nome ?? '', valorKg: Number(r.valor) })),
    melhorSerie,
  };
}

export function textoDuracao(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(Math.floor(s % 60)).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

export function textoVolume(kg: number) {
  return Math.round(kg).toLocaleString('pt-BR');
}
