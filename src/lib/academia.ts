import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Modalidade } from '@/constants/theme';
import { hojeISO } from '@/lib/desafios';
import { supabase } from '@/lib/supabase';

// Painel do dono/admin da academia: números agregados, avisos e equipe.

export type Painel = {
  membros: number;
  personais: number;
  novos30d: number;
  ativos7d: number;
  ativos30d: number;
  treinos7d: number;
  treinos30d: number;
  sumidos14d: number;
  porModalidade: Partial<Record<Modalidade, number>>;
  porDia: number[]; // 0 = domingo ... 6 = sábado
};

export type Aviso = { id: string; titulo: string; texto: string | null; criadoEm: Date; expiraEm: string | null };
export type Membro = { userId: string; nome: string; papel: 'aluno' | 'personal' | 'admin'; desde: string; eu: boolean };

export async function carregarPainel(gymId: string): Promise<Painel> {
  const { data, error } = await supabase.rpc('painel_academia', { p_gym: gymId });
  if (error) throw error;
  const r: any = (data as any[])[0];
  const dias = [0, 0, 0, 0, 0, 0, 0];
  for (const [d, n] of Object.entries(r.por_dia ?? {})) dias[Number(d)] = Number(n);
  return {
    membros: Number(r.membros),
    personais: Number(r.personais),
    novos30d: Number(r.novos_30d),
    ativos7d: Number(r.ativos_7d),
    ativos30d: Number(r.ativos_30d),
    treinos7d: Number(r.treinos_7d),
    treinos30d: Number(r.treinos_30d),
    sumidos14d: Number(r.sumidos_14d),
    porModalidade: r.por_modalidade ?? {},
    porDia: dias,
  };
}

// ---------- avisos ----------

export async function listarAvisos(gymId: string, soValendo = false): Promise<Aviso[]> {
  let q = supabase.from('avisos').select('id, titulo, texto, criado_em, expira_em').eq('gym_id', gymId);
  if (soValendo) q = q.or(`expira_em.is.null,expira_em.gte.${hojeISO()}`);
  const { data, error } = await q.order('criado_em', { ascending: false }).limit(30);
  if (error) throw error;
  return ((data ?? []) as any[]).map((a) => ({
    id: a.id,
    titulo: a.titulo,
    texto: a.texto,
    criadoEm: new Date(a.criado_em),
    expiraEm: a.expira_em,
  }));
}

export async function criarAviso(gymId: string, titulo: string, texto: string, expiraEm: string | null) {
  const { data: u } = await supabase.auth.getUser();
  const { error } = await supabase.from('avisos').insert({
    gym_id: gymId,
    autor_id: u.user?.id,
    titulo: titulo.trim(),
    texto: texto.trim() || null,
    expira_em: expiraEm,
  });
  if (error) throw error;
}

export async function apagarAviso(id: string) {
  const { error } = await supabase.from('avisos').delete().eq('id', id);
  if (error) throw error;
}

// O aluno fecha um aviso: fica guardado só no celular dele
const CHAVE_FECHADOS = 'fitone:avisos-fechados';

export async function avisosFechados(): Promise<string[]> {
  try {
    return JSON.parse((await AsyncStorage.getItem(CHAVE_FECHADOS)) ?? '[]');
  } catch {
    return [];
  }
}

export async function fecharAviso(id: string) {
  const atuais = await avisosFechados();
  await AsyncStorage.setItem(CHAVE_FECHADOS, JSON.stringify([id, ...atuais].slice(0, 100)));
}

// ---------- equipe ----------

export async function listarMembros(gymId: string): Promise<Membro[]> {
  const { data, error } = await supabase.rpc('membros_academia', { p_gym: gymId });
  if (error) throw error;
  return ((data ?? []) as any[]).map((m) => ({ userId: m.user_id, nome: m.nome, papel: m.papel, desde: m.desde, eu: !!m.eu }));
}

export async function definirPapel(gymId: string, userId: string, papel: 'aluno' | 'personal') {
  const { error } = await supabase.rpc('definir_papel', { p_gym: gymId, p_user: userId, p_papel: papel });
  if (error) throw error;
}
