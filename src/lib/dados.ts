import AsyncStorage from '@react-native-async-storage/async-storage';

import type { TimerPrescrito } from '@/lib/timer';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { Modalidade } from '@/constants/theme';
import { useSessao } from '@/lib/sessao';
import { rotuloTreino } from '@/lib/rotulo';
import { supabase } from '@/lib/supabase';

// Dados do aluno vindos do Supabase: plano ativo, treino de hoje, semana, recordes.

export type ExercicioPrescrito = {
  id: string;
  exercicioId: string;
  nome: string;
  grupo: string;
  ordem: number;
  series: number;
  repsMin: number;
  repsMax: number;
  cargaSugeridaKg: number | null;
  descansoS: number;
  observacao: string | null;
  midiaUrl: string | null;
  instrucoes: string | null;
};

export type Treino = {
  id: string;
  letra: string;
  nome: string;
  modalidade: Modalidade;
  rotulo: string; // palavra grande (PUSH, PULL...)
  observacao: string | null; // orientação do personal para o dia
  cardio: string | null; // cardio no fim do treino
  descricao: string | null; // treinos que não são musculação
  duracaoMin: number | null;
  distanciaKm: number | null;
  timer: TimerPrescrito | null; // estações montadas pelo personal (Hybrid/Cross)
  ordem: number;
  diasSemana: number[];
  exercicios: ExercicioPrescrito[];
  ultimaVez: Date | null;
};

export type Plano = {
  id: string;
  nome: string;
  observacao: string | null;
  personalNome: string;
  inicio: Date | null;
  fim: Date | null;
  proprio: boolean; // o aluno montou o próprio treino
  treinos: Treino[];
};

export type DiaSemana = { rotulo: string; data: Date; feitos: Modalidade[]; hoje: boolean };

export type Recorde = { exercicio: string; valorKg: number; quando: Date };

export const META_SEMANAL = 3;

const ROTULOS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export function inicioDaSemana(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const diaSemana = (x.getDay() + 6) % 7; // segunda = 0
  x.setDate(x.getDate() - diaSemana);
  return x;
}

function mesmoDia(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function textoQuando(d: Date | null) {
  if (!d) return 'ainda não feito';
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const dia = new Date(d);
  dia.setHours(0, 0, 0, 0);
  const dias = Math.round((hoje.getTime() - dia.getTime()) / 86400000);
  if (dias <= 0) return 'hoje';
  if (dias === 1) return 'ontem';
  if (dias < 7) return ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][d.getDay()];
  return `há ${dias} dias`;
}

// Resumo de uma linha do treino: "8 exercícios" na musculação, "Cross · 45 min" nas outras
export function resumoTreino(t: Treino, nomeModalidade: string) {
  if (t.modalidade === 'musculacao') return `${t.exercicios.length} exercícios`;
  const partes = [nomeModalidade];
  if (t.distanciaKm) partes.push(`${String(t.distanciaKm).replace('.', ',')} km`);
  if (t.duracaoMin) partes.push(`${t.duracaoMin} min`);
  return partes.join(' · ');
}

// Para onde vai o "Começar": musculação abre o modo treino; o resto abre o registro com o treino preenchido
export function rotaComecar(t: Treino) {
  if (t.modalidade === 'musculacao') return `/sessao/${t.id}`;
  if (t.modalidade === 'cross' || t.modalidade === 'hybrid') return `/timer/${t.modalidade}?treino=${t.id}`;
  if (t.modalidade === 'corrida' || t.modalidade === 'caminhada' || t.modalidade === 'bike') return `/gps/${t.modalidade}?treino=${t.id}`;
  return `/registro/${t.modalidade}?treino=${t.id}`;
}

// Por conta própria: Cross e Hybrid abrem o timer; Corrida e Bike, o GPS; o resto, o registro rápido
export function rotaPorContaPropria(m: string) {
  if (m === 'cross' || m === 'hybrid') return `/timer/${m}`;
  if (m === 'corrida' || m === 'caminhada' || m === 'bike') return `/gps/${m}`;
  return `/registro/${m}`;
}

export function textoReps(e: { repsMin: number; repsMax: number }) {
  return e.repsMin === e.repsMax ? `${e.repsMin}` : `${e.repsMin} a ${e.repsMax}`;
}

export function textoKg(kg: number | null | undefined) {
  if (kg === null || kg === undefined) return '—';
  return `${Number(kg).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`;
}

// Treino de hoje: o que o personal marcou para hoje; se não marcou dia, o próximo da ordem
// depois do último feito. O app não sugere troca: o aluno escolhe outro na aba Treinar se quiser.
export function escolherTreinoDeHoje(treinos: Treino[], hoje = new Date()): Treino | null {
  if (treinos.length === 0) return null;
  // Já treinou um treino do plano hoje (mesmo trocando o do dia)? A Hoje mostra esse, como feito
  const feitoHoje = treinos
    .filter((t) => t.ultimaVez && mesmoDia(t.ultimaVez, hoje))
    .sort((a, b) => b.ultimaVez!.getTime() - a.ultimaVez!.getTime())[0];
  if (feitoHoje) return feitoHoje;
  const marcado = treinos.find((t) => t.diasSemana.includes(hoje.getDay()));
  if (marcado) return marcado;
  const feitos = treinos.filter((t) => t.ultimaVez).sort((a, b) => b.ultimaVez!.getTime() - a.ultimaVez!.getTime());
  if (feitos.length === 0) return treinos[0];
  const ultimo = feitos[0];
  const idx = treinos.findIndex((t) => t.id === ultimo.id);
  return treinos[(idx + 1) % treinos.length];
}

// Todos os treinos de hoje: os que o personal marcou para hoje (pode ter mais de um, ex.: musculação + Hybrid)
// + os do plano que já foram feitos hoje. Sem dia marcado no plano: um por dia, na ordem.
// Os que faltam vêm primeiro.
export function treinosDoDia(treinos: Treino[], hoje = new Date()): Treino[] {
  if (treinos.length === 0) return [];
  const feitoHoje = (t: Treino) => !!t.ultimaVez && mesmoDia(t.ultimaVez, hoje);
  const marcados = treinos.filter((t) => t.diasSemana.includes(hoje.getDay()));
  const lista = marcados.length > 0 ? [...marcados] : [];
  for (const t of treinos) if (feitoHoje(t) && !lista.includes(t)) lista.push(t);
  if (lista.length === 0) {
    const proximo = escolherTreinoDeHoje(treinos, hoje);
    if (proximo) lista.push(proximo);
  }
  return lista.sort((a, b) => Number(feitoHoje(a)) - Number(feitoHoje(b)) || a.ordem - b.ordem);
}

// Semanas seguidas (contando a atual só se já bateu a meta) com pelo menos META_SEMANAL treinos
function sequenciaDeSemanas(datas: Date[]) {
  const porSemana = new Map<number, number>();
  for (const d of datas) {
    const k = inicioDaSemana(d).getTime();
    porSemana.set(k, (porSemana.get(k) ?? 0) + 1);
  }
  let semana = inicioDaSemana();
  let total = 0;
  if ((porSemana.get(semana.getTime()) ?? 0) >= META_SEMANAL) total++;
  // semanas anteriores
  for (;;) {
    semana = new Date(semana);
    semana.setDate(semana.getDate() - 7);
    if ((porSemana.get(semana.getTime()) ?? 0) >= META_SEMANAL) total++;
    else break;
  }
  return total;
}

type Estado = {
  carregando: boolean;
  erro: string | null;
  plano: Plano | null;
  treinoDeHoje: Treino | null;
  treinosDeHoje: Treino[];
  semana: DiaSemana[];
  treinosNaSemana: number;
  sequencia: number;
  recordes: Recorde[];
  feitosHoje: { id: string; treinoId: string | null; modalidade: Modalidade }[]; // mais recente primeiro
  semInternet: boolean; // mostrando a última cópia guardada no celular
};

const VAZIO: Estado = {
  carregando: true,
  erro: null,
  plano: null,
  treinoDeHoje: null,
  treinosDeHoje: [],
  semana: [],
  treinosNaSemana: 0,
  sequencia: 0,
  recordes: [],
  feitosHoje: [],
  semInternet: false,
};

export function useDadosAluno() {
  const { sessao } = useSessao();
  const [estado, setEstado] = useState<Estado>(VAZIO);

  const carregar = useCallback(async () => {
    if (!sessao) return;
    const uid = sessao.user.id;
    const desde = new Date();
    desde.setDate(desde.getDate() - 7 * 26);

    const [rPlano, rSessoes, rRecordes] = await Promise.all([
      supabase
        .from('planos')
        .select(
          `id, nome, observacao, personal_id, inicio, fim, criado_em,
           personal:profiles!planos_personal_id_fkey(nome),
           treinos(id, letra, nome, ordem, dias_semana, modalidade, descricao, duracao_min, distancia_km, rotulo, observacao, cardio, timer,
             treino_exercicios(id, ordem, series, reps_min, reps_max, carga_sugerida_kg, descanso_s, observacao,
               exercicio:exercicios(id, nome, grupo, midia_url, midias:exercicio_midias(video_url, instrucoes))))`,
        )
        .eq('aluno_id', uid)
        .eq('ativo', true)
        .maybeSingle(),
      supabase
        .from('sessoes')
        .select('id, treino_id, modalidade, concluida_em')
        .eq('aluno_id', uid)
        .eq('status', 'concluida')
        .gte('concluida_em', desde.toISOString())
        .order('concluida_em', { ascending: false }),
      supabase
        .from('recordes')
        .select('valor, alcancado_em, exercicio:exercicios(nome)')
        .eq('aluno_id', uid)
        .eq('tipo', 'carga_max')
        .order('alcancado_em', { ascending: false })
        .limit(10),
    ]);

    // Cópia no celular: sem internet na academia, o plano continua abrindo e dá para treinar
    const chaveCache = `fitone:cache-aluno:${uid}`;
    let dPlano: any = rPlano.data;
    let dSessoes: any[] = rSessoes.data ?? [];
    let dRecordes: any[] = rRecordes.data ?? [];
    let semInternet = false;
    const erro = rPlano.error ?? rSessoes.error ?? rRecordes.error;
    if (erro) {
      let cache: any = null;
      try {
        const t = await AsyncStorage.getItem(chaveCache);
        cache = t ? JSON.parse(t) : null;
      } catch {
        cache = null;
      }
      if (!cache) {
        setEstado({ ...VAZIO, carregando: false, erro: erro.message });
        return;
      }
      dPlano = cache.plano;
      dSessoes = cache.sessoes ?? [];
      dRecordes = cache.recordes ?? [];
      semInternet = true;
    } else {
      AsyncStorage.setItem(chaveCache, JSON.stringify({ plano: dPlano, sessoes: dSessoes, recordes: dRecordes })).catch(() => {});
    }

    const sessoes = dSessoes.map((s: any) => ({
      id: s.id as string,
      treinoId: s.treino_id as string | null,
      modalidade: s.modalidade as Modalidade,
      data: new Date(s.concluida_em as string),
    }));

    let plano: Plano | null = null;
    const p = dPlano;
    if (p) {
      const treinos: Treino[] = (p.treinos ?? [])
        .map((t: any) => ({
          id: t.id,
          letra: t.letra,
          nome: t.nome,
          modalidade: (t.modalidade ?? 'musculacao') as Modalidade,
          rotulo: rotuloTreino(t),
          observacao: t.observacao ?? null,
          cardio: t.cardio ?? null,
          descricao: t.descricao ?? null,
          duracaoMin: t.duracao_min ?? null,
          distanciaKm: t.distancia_km === null || t.distancia_km === undefined ? null : Number(t.distancia_km),
          timer: t.timer?.estacoes?.length ? (t.timer as TimerPrescrito) : null,
          ordem: t.ordem,
          diasSemana: t.dias_semana ?? [],
          ultimaVez: sessoes.find((s) => s.treinoId === t.id)?.data ?? null,
          exercicios: (t.treino_exercicios ?? [])
            .map((te: any) => ({
              id: te.id,
              exercicioId: te.exercicio?.id,
              nome: te.exercicio?.nome ?? '',
              grupo: te.exercicio?.grupo ?? '',
              ordem: te.ordem,
              series: te.series,
              repsMin: te.reps_min,
              repsMax: te.reps_max,
              cargaSugeridaKg: te.carga_sugerida_kg === null ? null : Number(te.carga_sugerida_kg),
              descansoS: te.descanso_s,
              observacao: te.observacao,
              midiaUrl: te.exercicio?.midias?.[0]?.video_url ?? te.exercicio?.midia_url ?? null,
              instrucoes: te.exercicio?.midias?.[0]?.instrucoes ?? null,
            }))
            .sort((a: ExercicioPrescrito, b: ExercicioPrescrito) => a.ordem - b.ordem),
        }))
        .sort((a: Treino, b: Treino) => a.ordem - b.ordem);
      plano = {
        id: p.id,
        nome: p.nome,
        observacao: p.observacao,
        personalNome: p.personal_id === uid ? 'você' : p.personal?.nome ?? 'seu personal',
        proprio: p.personal_id === uid,
        inicio: p.inicio ? new Date(`${p.inicio}T12:00:00`) : p.criado_em ? new Date(p.criado_em) : null,
        fim: p.fim ? new Date(`${p.fim}T12:00:00`) : null,
        treinos,
      };
    }

    const hoje = new Date();
    const segunda = inicioDaSemana(hoje);
    const semana: DiaSemana[] = ROTULOS.map((rotulo, i) => {
      const data = new Date(segunda);
      data.setDate(segunda.getDate() + i);
      const feitos = sessoes
        .filter((s) => mesmoDia(s.data, data))
        .sort((a, b) => a.data.getTime() - b.data.getTime())
        .map((s) => s.modalidade);
      return { rotulo, data, feitos, hoje: mesmoDia(data, hoje) };
    });

    const recordes: Recorde[] = dRecordes.map((r: any) => ({
      exercicio: r.exercicio?.nome ?? '',
      valorKg: Number(r.valor),
      quando: new Date(r.alcancado_em),
    }));

    setEstado({
      carregando: false,
      erro: null,
      semInternet,
      plano,
      treinoDeHoje: plano ? (treinosDoDia(plano.treinos, hoje)[0] ?? null) : null,
      treinosDeHoje: plano ? treinosDoDia(plano.treinos, hoje) : [],
      semana,
      treinosNaSemana: semana.reduce((t, d) => t + d.feitos.length, 0),
      sequencia: sequenciaDeSemanas(sessoes.map((s) => s.data)),
      recordes,
      feitosHoje: sessoes
        .filter((s) => mesmoDia(s.data, hoje))
        .map((s) => ({ id: s.id, treinoId: s.treinoId, modalidade: s.modalidade })),
    });
  }, [sessao]);

  // Recarrega toda vez que a tela aparece (ex.: voltou de um treino)
  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  return { ...estado, recarregar: carregar };
}
