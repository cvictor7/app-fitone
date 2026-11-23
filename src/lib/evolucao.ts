import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';

// Histórico por exercício: em cada treino, a maior carga e o 1RM estimado (Epley, até 12 reps).

export type PontoEvolucao = { data: Date; cargaMax: number; rm: number | null; volume: number };
export type HistoricoExercicio = { exercicioId: string; nome: string; grupo: string; pontos: PontoEvolucao[] };

export function useEvolucao() {
  const { sessao } = useSessao();
  const [carregando, setCarregando] = useState(true);
  const [historicos, setHistoricos] = useState<HistoricoExercicio[]>([]);
  const [treinosNoMes, setTreinosNoMes] = useState(0);
  const [volumeNoMes, setVolumeNoMes] = useState(0);

  const carregar = useCallback(async () => {
    if (!sessao) return;
    const desde = new Date();
    desde.setMonth(desde.getMonth() - 6);

    const [rs, rm] = await Promise.all([
      supabase
        .from('series')
        .select('exercicio_id, carga_kg, reps, sessao_id, exercicio:exercicios(nome, grupo), sessao:sessoes!inner(concluida_em, status, aluno_id)')
        .eq('sessao.status', 'concluida')
        .eq('sessao.aluno_id', sessao.user.id)
        .gte('sessao.concluida_em', desde.toISOString())
        .limit(5000),
      supabase
        .from('sessoes')
        .select('volume_kg')
        .eq('aluno_id', sessao.user.id)
        .eq('status', 'concluida')
        .gte('concluida_em', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()),
    ]);

    const porExercicio = new Map<string, { nome: string; grupo: string; porSessao: Map<string, PontoEvolucao> }>();
    for (const s of (rs.data ?? []) as any[]) {
      const kg = s.carga_kg === null ? 0 : Number(s.carga_kg);
      const reps = s.reps ?? 0;
      let ex = porExercicio.get(s.exercicio_id);
      if (!ex) {
        ex = { nome: s.exercicio?.nome ?? '', grupo: s.exercicio?.grupo ?? '', porSessao: new Map() };
        porExercicio.set(s.exercicio_id, ex);
      }
      const p = ex.porSessao.get(s.sessao_id) ?? { data: new Date(s.sessao.concluida_em), cargaMax: 0, rm: null, volume: 0 };
      p.cargaMax = Math.max(p.cargaMax, kg);
      p.volume += kg * reps;
      if (kg > 0 && reps >= 1 && reps <= 12) {
        const rm = Math.round(kg * (1 + reps / 30) * 10) / 10;
        p.rm = Math.max(p.rm ?? 0, rm);
      }
      ex.porSessao.set(s.sessao_id, p);
    }

    const lista: HistoricoExercicio[] = [...porExercicio.entries()]
      .map(([exercicioId, e]) => ({
        exercicioId,
        nome: e.nome,
        grupo: e.grupo,
        pontos: [...e.porSessao.values()].sort((a, b) => a.data.getTime() - b.data.getTime()),
      }))
      .filter((h) => h.pontos.some((p) => p.cargaMax > 0))
      // mais treinados primeiro
      .sort((a, b) => b.pontos.length - a.pontos.length || a.nome.localeCompare(b.nome));

    setHistoricos(lista);
    setTreinosNoMes(rm.data?.length ?? 0);
    setVolumeNoMes((rm.data ?? []).reduce((t: number, x: any) => t + Number(x.volume_kg ?? 0), 0));
    setCarregando(false);
  }, [sessao]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  return { carregando, historicos, treinosNoMes, volumeNoMes, recarregar: carregar };
}
