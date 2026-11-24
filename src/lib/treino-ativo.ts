import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Crypto from 'expo-crypto';

import type { Treino } from '@/lib/dados';
import { supabase } from '@/lib/supabase';

// Treino em andamento. Fica salvo no celular a cada toque:
// se o app fechar ou a internet cair na academia, nada se perde.

export type SerieAtiva = {
  numero: number;
  kg: string; // texto para o campo; vira número ao salvar
  reps: string;
  feita: boolean;
  feitaEm?: string;
};

export type ExercicioAtivo = {
  treinoExercicioId: string;
  exercicioId: string;
  nome: string;
  grupo: string;
  repsMin: number;
  repsMax: number;
  descansoS: number;
  observacao: string | null;
  midiaUrl: string | null;
  instrucoes?: string | null;
  anterior: { kg: number | null; reps: number | null }[]; // séries do último treino com esse exercício
  series: SerieAtiva[];
  nota?: string; // anotação do aluno hoje ("senti o ombro")
  notaAnterior?: { texto: string; em: string } | null; // a última anotação nesse exercício
};

export type TreinoAtivo = {
  sessaoId: string; // gerado no celular; evita treino duplicado se reenviar
  treinoId: string;
  letra: string;
  rotulo?: string; // palavra grande (PUSH, PULL...)
  nome: string;
  observacaoTreino?: string | null; // orientação do personal para o dia
  cardio?: string | null; // cardio no fim
  cardioFeito?: boolean;
  gymId: string | null;
  iniciadoEm: string;
  atual: number; // índice do exercício na tela
  exercicios: ExercicioAtivo[];
};

const CHAVE = 'fitone:treino-ativo';

export async function lerTreinoAtivo(): Promise<TreinoAtivo | null> {
  try {
    const t = await AsyncStorage.getItem(CHAVE);
    return t ? (JSON.parse(t) as TreinoAtivo) : null;
  } catch {
    return null;
  }
}

export async function guardarTreinoAtivo(t: TreinoAtivo) {
  try {
    await AsyncStorage.setItem(CHAVE, JSON.stringify(t));
  } catch {
    // sem espaço no celular: segue a vida, o treino continua na memória
  }
}

export async function apagarTreinoAtivo() {
  await AsyncStorage.removeItem(CHAVE);
}

function kgTexto(n: number | null | undefined) {
  if (n === null || n === undefined) return '';
  return String(Number(n)).replace('.', ',');
}

export function textoParaNumero(t: string): number | null {
  const n = Number(t.replace(',', '.').trim());
  return t.trim() === '' || Number.isNaN(n) ? null : n;
}

// Busca as séries do último treino de cada exercício (para mostrar "anterior" e já preencher)
async function buscarAnteriores(exercicioIds: string[]) {
  const mapa = new Map<string, { kg: number | null; reps: number | null }[]>();
  if (exercicioIds.length === 0) return mapa;

  const { data } = await supabase
    .from('series')
    .select('exercicio_id, numero, carga_kg, reps, feita_em, sessao_id, sessao:sessoes!inner(status)')
    .in('exercicio_id', exercicioIds)
    .eq('sessao.status', 'concluida')
    .order('feita_em', { ascending: false })
    .limit(400);

  const sessaoDoExercicio = new Map<string, string>();
  for (const s of (data ?? []) as any[]) {
    // fica só com a sessão mais recente de cada exercício
    if (!sessaoDoExercicio.has(s.exercicio_id)) sessaoDoExercicio.set(s.exercicio_id, s.sessao_id);
    if (sessaoDoExercicio.get(s.exercicio_id) !== s.sessao_id) continue;
    const lista = mapa.get(s.exercicio_id) ?? [];
    lista.push({ numero: s.numero, kg: s.carga_kg === null ? null : Number(s.carga_kg), reps: s.reps } as any);
    mapa.set(s.exercicio_id, lista);
  }
  for (const [k, lista] of mapa) {
    mapa.set(
      k,
      (lista as any[]).sort((a, b) => a.numero - b.numero).map((x) => ({ kg: x.kg, reps: x.reps })),
    );
  }
  return mapa;
}

// Última anotação do aluno em cada exercício (para mostrar "Da última vez você anotou...")
async function buscarNotasAnteriores(exercicioIds: string[]) {
  const mapa = new Map<string, { texto: string; em: string }>();
  if (exercicioIds.length === 0) return mapa;
  const { data } = await supabase
    .from('notas_exercicio')
    .select('exercicio_id, texto, criado_em')
    .in('exercicio_id', exercicioIds)
    .order('criado_em', { ascending: false })
    .limit(100);
  for (const n of (data ?? []) as any[]) {
    if (!mapa.has(n.exercicio_id)) mapa.set(n.exercicio_id, { texto: n.texto, em: n.criado_em });
  }
  return mapa;
}

export async function montarTreinoAtivo(treino: Treino, gymId: string | null): Promise<TreinoAtivo> {
  const ids = treino.exercicios.map((e) => e.exercicioId);
  const [anteriores, notas] = await Promise.all([buscarAnteriores(ids), buscarNotasAnteriores(ids).catch(() => new Map())]);

  return {
    sessaoId: Crypto.randomUUID(),
    treinoId: treino.id,
    letra: treino.letra,
    rotulo: treino.rotulo,
    nome: treino.nome,
    observacaoTreino: treino.observacao,
    cardio: treino.cardio,
    cardioFeito: false,
    gymId,
    iniciadoEm: new Date().toISOString(),
    atual: 0,
    exercicios: treino.exercicios.map((e) => {
      const ant = anteriores.get(e.exercicioId) ?? [];
      return {
        treinoExercicioId: e.id,
        exercicioId: e.exercicioId,
        nome: e.nome,
        grupo: e.grupo,
        repsMin: e.repsMin,
        repsMax: e.repsMax,
        descansoS: e.descansoS,
        observacao: e.observacao,
        midiaUrl: e.midiaUrl,
        instrucoes: e.instrucoes,
        anterior: ant,
        nota: '',
        notaAnterior: notas.get(e.exercicioId) ?? null,
        // Já vem preenchido: carga da última vez (ou a sugerida pelo personal) e reps máximas
        series: Array.from({ length: e.series }, (_, i) => ({
          numero: i + 1,
          kg: kgTexto(ant[i]?.kg ?? ant[ant.length - 1]?.kg ?? e.cargaSugeridaKg),
          reps: String(ant[i]?.reps ?? e.repsMax),
          feita: false,
        })),
      };
    }),
  };
}

export type ResultadoSalvar = { ok: true; sessaoId: string } | { ok: false; erro: string };

// Envia o treino para o banco. O banco calcula volume, duração e recordes sozinho.
export async function salvarTreino(t: TreinoAtivo): Promise<ResultadoSalvar> {
  const sessaoId = t.sessaoId;
  const feitas = t.exercicios.flatMap((e) =>
    e.series
      .filter((s) => s.feita)
      .map((s) => ({
        sessao_id: sessaoId,
        exercicio_id: e.exercicioId,
        treino_exercicio_id: e.treinoExercicioId,
        numero: s.numero,
        carga_kg: textoParaNumero(s.kg),
        reps: textoParaNumero(s.reps),
        feita_em: s.feitaEm ?? new Date().toISOString(),
      })),
  );

  const notasEnvio = t.exercicios
    .filter((e) => e.nota && e.nota.trim())
    .map((e) => ({ exercicio_id: e.exercicioId, texto: e.nota!.trim().slice(0, 300) }));
  const observacao = t.cardio && t.cardioFeito ? `Cardio: ${t.cardio}` : null;

  // Caminho rápido: tudo numa viagem só ao banco (SQL 0024)
  const rapido = await supabase.rpc('concluir_treino', {
    p: {
      id: sessaoId,
      gym_id: t.gymId,
      treino_id: t.treinoId,
      iniciada_em: t.iniciadoEm,
      observacao,
      series: feitas.map(({ sessao_id, ...resto }) => resto),
      notas: notasEnvio,
    },
  });
  if (!rapido.error) return { ok: true, sessaoId };
  // função ainda não existe no banco (SQL não rodado): segue pelo caminho antigo
  if (rapido.error.code !== 'PGRST202') return { ok: false, erro: rapido.error.message };

  // upsert: se a internet caiu no meio e a pessoa tentar de novo, não duplica
  const r1 = await supabase.from('sessoes').upsert(
    {
      id: sessaoId,
      gym_id: t.gymId,
      modalidade: 'musculacao',
      treino_id: t.treinoId,
      origem: 'app',
      iniciada_em: t.iniciadoEm,
      status: 'em_andamento',
      observacao,
    },
    { onConflict: 'id' },
  );
  if (r1.error) return { ok: false, erro: r1.error.message };

  await supabase.from('series').delete().eq('sessao_id', sessaoId);
  if (feitas.length > 0) {
    const r2 = await supabase.from('series').insert(feitas);
    if (r2.error) return { ok: false, erro: r2.error.message };
  }

  const r3 = await supabase
    .from('sessoes')
    .update({ status: 'concluida', concluida_em: new Date().toISOString() })
    .eq('id', sessaoId);
  if (r3.error) return { ok: false, erro: r3.error.message };

  // anotações de cada exercício (se falhar, o treino já está salvo: não trava)
  if (notasEnvio.length > 0)
    await supabase
      .from('notas_exercicio')
      .upsert(notasEnvio.map((n) => ({ ...n, sessao_id: sessaoId })), { onConflict: 'sessao_id,exercicio_id' });

  return { ok: true, sessaoId };
}
