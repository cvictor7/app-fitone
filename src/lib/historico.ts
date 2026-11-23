import { infoModalidade, type Modalidade } from '@/constants/theme';
import { rotuloTreino } from '@/lib/rotulo';
import { supabase } from '@/lib/supabase';

// Histórico de treinos: todos (qualquer modalidade) e o de um treino do plano, com comparação.

export type ItemHistorico = {
  id: string;
  modalidade: Modalidade;
  rotulo: string;
  nome: string;
  data: Date;
  duracaoS: number;
  volumeKg: number;
  sensacao: number | null;
  observacao: string | null;
};

function montar(s: any): ItemHistorico {
  const modalidade = (s.modalidade ?? 'livre') as Modalidade;
  return {
    id: s.id,
    modalidade,
    rotulo: rotuloTreino({ ...(s.treino ?? {}), modalidade: s.treino?.modalidade ?? modalidade }),
    nome: s.treino?.nome ?? infoModalidade(modalidade).nome,
    data: new Date(s.concluida_em),
    duracaoS: s.duracao_s ?? 0,
    volumeKg: Number(s.volume_kg ?? 0),
    sensacao: s.sensacao,
    observacao: s.observacao,
  };
}

export async function listarHistorico(alunoId: string, limite = 200): Promise<ItemHistorico[]> {
  const { data, error } = await supabase
    .from('sessoes')
    .select('id, modalidade, duracao_s, volume_kg, sensacao, observacao, concluida_em, treino:treinos(letra, nome, rotulo, modalidade)')
    .eq('aluno_id', alunoId)
    .eq('status', 'concluida')
    .order('concluida_em', { ascending: false })
    .limit(limite);
  if (error) throw new Error(error.message);
  return (data ?? []).map(montar);
}

export type ComparacaoExercicio = { exercicioId: string; nome: string; primeiroKg: number; anteriorKg: number | null; atualKg: number };

export type HistoricoTreino = {
  sessoes: ItemHistorico[]; // mais recente primeiro
  exercicios: ComparacaoExercicio[]; // carga máxima: primeira vez, vez anterior e última vez
};

export async function historicoDoTreino(alunoId: string, treinoId: string): Promise<HistoricoTreino> {
  const { data, error } = await supabase
    .from('sessoes')
    .select('id, modalidade, duracao_s, volume_kg, sensacao, observacao, concluida_em, treino:treinos(letra, nome, rotulo, modalidade)')
    .eq('aluno_id', alunoId)
    .eq('treino_id', treinoId)
    .eq('status', 'concluida')
    .order('concluida_em', { ascending: true })
    .limit(100);
  if (error) throw new Error(error.message);
  const sessoes = (data ?? []).map(montar);
  if (sessoes.length === 0) return { sessoes: [], exercicios: [] };

  const { data: series } = await supabase
    .from('series')
    .select('sessao_id, exercicio_id, carga_kg, exercicio:exercicios(nome)')
    .in(
      'sessao_id',
      sessoes.map((s) => s.id),
    );

  // maior carga de cada exercício em cada sessão
  const porExercicio = new Map<string, { nome: string; porSessao: Map<string, number> }>();
  for (const x of (series ?? []) as any[]) {
    const kg = Number(x.carga_kg ?? 0);
    if (kg <= 0) continue;
    const e = porExercicio.get(x.exercicio_id) ?? { nome: x.exercicio?.nome ?? '', porSessao: new Map() };
    e.porSessao.set(x.sessao_id, Math.max(e.porSessao.get(x.sessao_id) ?? 0, kg));
    porExercicio.set(x.exercicio_id, e);
  }

  const ordem = sessoes.map((s) => s.id); // da mais antiga para a mais nova
  const exercicios: ComparacaoExercicio[] = [];
  for (const [exercicioId, e] of porExercicio) {
    const valores = ordem.filter((id) => e.porSessao.has(id)).map((id) => e.porSessao.get(id)!);
    if (valores.length === 0) continue;
    exercicios.push({
      exercicioId,
      nome: e.nome,
      primeiroKg: valores[0],
      anteriorKg: valores.length > 1 ? valores[valores.length - 2] : null,
      atualKg: valores[valores.length - 1],
    });
  }

  return { sessoes: sessoes.reverse(), exercicios };
}

export function variacao(atual: number, base: number | null) {
  if (base === null || base === 0) return null;
  return Math.round(((atual - base) / base) * 100);
}
