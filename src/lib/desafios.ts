import type { Modalidade } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// Desafios da academia: o personal cria, o aluno entra, o banco conta o progresso
// pelos treinos concluídos no período.

export type Medida = 'treinos' | 'minutos';

export type Desafio = {
  id: string;
  titulo: string;
  descricao: string | null;
  medida: Medida;
  meta: number;
  modalidade: Modalidade | null;
  inicio: string; // 'AAAA-MM-DD'
  fim: string;
  participantes: number;
  entrei: boolean;
  meuProgresso: number;
};

export type LinhaDesafio = { userId: string; autor: string; eu: boolean; progresso: number };

export type DadosDesafio = {
  titulo: string;
  descricao: string;
  medida: Medida;
  meta: number;
  modalidade: Modalidade | null;
  inicio: string;
  fim: string;
};

export async function listarDesafios(gymId: string): Promise<Desafio[]> {
  const { data, error } = await supabase.rpc('desafios_academia', { p_gym: gymId });
  if (error) throw error;
  return ((data ?? []) as any[]).map((d) => ({
    id: d.id,
    titulo: d.titulo,
    descricao: d.descricao,
    medida: d.medida,
    meta: d.meta,
    modalidade: d.modalidade,
    inicio: d.inicio,
    fim: d.fim,
    participantes: Number(d.participantes),
    entrei: !!d.entrei,
    meuProgresso: Number(d.meu_progresso ?? 0),
  }));
}

export async function rankingDesafio(id: string): Promise<LinhaDesafio[]> {
  const { data, error } = await supabase.rpc('ranking_desafio', { p_desafio: id });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({ userId: r.user_id, autor: r.autor, eu: !!r.eu, progresso: Number(r.progresso) }));
}

export async function entrarNoDesafio(id: string, sim: boolean) {
  if (sim) {
    const { error } = await supabase.from('desafio_participantes').insert({ desafio_id: id });
    if (error && error.code !== '23505') throw error;
  } else {
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('desafio_participantes')
      .delete()
      .eq('desafio_id', id)
      .eq('user_id', data.user?.id ?? '');
    if (error) throw error;
  }
}

export async function carregarDesafio(id: string): Promise<DadosDesafio | null> {
  const { data } = await supabase
    .from('desafios')
    .select('titulo, descricao, medida, meta, modalidade, inicio, fim')
    .eq('id', id)
    .maybeSingle();
  if (!data) return null;
  return { ...data, descricao: data.descricao ?? '' } as DadosDesafio;
}

export function validarDesafio(d: DadosDesafio): string | null {
  if (d.titulo.trim().length < 3) return 'Dê um nome ao desafio (mínimo 3 letras).';
  if (!Number.isFinite(d.meta) || d.meta < 1) return 'Coloque uma meta maior que zero.';
  if (d.fim < d.inicio) return 'O fim precisa ser depois do início.';
  return null;
}

export async function salvarDesafio(id: string | null, gymId: string, d: DadosDesafio): Promise<string> {
  const linha = {
    titulo: d.titulo.trim(),
    descricao: d.descricao.trim() || null,
    medida: d.medida,
    meta: Math.round(d.meta),
    modalidade: d.modalidade,
    inicio: d.inicio,
    fim: d.fim,
  };
  if (id) {
    const { error } = await supabase.from('desafios').update(linha).eq('id', id);
    if (error) throw error;
    return id;
  }
  const { data: u } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('desafios')
    .insert({ ...linha, gym_id: gymId, criado_por: u.user?.id })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function apagarDesafio(id: string) {
  const { error } = await supabase.from('desafios').delete().eq('id', id);
  if (error) throw error;
}

// ---------- datas (no fuso do celular; Manaus para quem usa aqui) ----------

export function hojeISO(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function somarDias(iso: string, dias: number) {
  const [a, m, d] = iso.split('-').map(Number);
  return hojeISO(new Date(a, m - 1, d + dias));
}

export function fimDoMes(iso: string) {
  const [a, m] = iso.split('-').map(Number);
  return hojeISO(new Date(a, m, 0));
}

export function dataBR(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function situacao(d: { inicio: string; fim: string }): 'em-breve' | 'valendo' | 'acabou' {
  const h = hojeISO();
  if (h < d.inicio) return 'em-breve';
  if (h > d.fim) return 'acabou';
  return 'valendo';
}

export function diasRestantes(fim: string) {
  const [a, m, d] = fim.split('-').map(Number);
  const hoje = new Date();
  const zero = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  return Math.round((new Date(a, m - 1, d).getTime() - zero.getTime()) / 86400000);
}

export function textoMeta(medida: Medida, n: number) {
  return medida === 'treinos' ? `${n} ${n === 1 ? 'treino' : 'treinos'}` : `${n} min`;
}

export function textoPeriodo(d: { inicio: string; fim: string }) {
  const s = situacao(d);
  if (s === 'em-breve') return `Começa ${dataBR(d.inicio)} · até ${dataBR(d.fim)}`;
  if (s === 'acabou') return `Acabou ${dataBR(d.fim)}`;
  const r = diasRestantes(d.fim);
  return r === 0 ? 'Último dia!' : `${r} ${r === 1 ? 'dia' : 'dias'} restantes · até ${dataBR(d.fim)}`;
}
