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
export type Membro = {
  userId: string;
  nome: string;
  papel: 'aluno' | 'personal' | 'admin';
  desde: string;
  eu: boolean;
  ativo: boolean; // false = removido da academia
  alunos: number; // alunos vinculados (se for personal)
};

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
  return ((data ?? []) as any[]).map((m) => ({
    userId: m.user_id,
    nome: m.nome,
    papel: m.papel,
    desde: m.desde,
    eu: !!m.eu,
    ativo: !!m.ativo,
    alunos: Number(m.alunos ?? 0),
  }));
}

export async function definirPapel(gymId: string, userId: string, papel: 'aluno' | 'personal' | 'admin') {
  const { error } = await supabase.rpc('definir_papel', { p_gym: gymId, p_user: userId, p_papel: papel });
  if (error) throw error;
}

/** Tira da academia (não apaga a conta). Personal: os alunos e planos vão para "para", se vier. */
export async function removerMembro(gymId: string, userId: string, para: string | null) {
  const { error } = await supabase.rpc('remover_membro', { p_gym: gymId, p_user: userId, p_para: para });
  if (error) throw error;
}

export async function readmitirMembro(gymId: string, userId: string) {
  const { error } = await supabase.rpc('readmitir_membro', { p_gym: gymId, p_user: userId });
  if (error) throw error;
}

export async function codigoDaAcademia(gymId: string): Promise<string> {
  const { data } = await supabase.from('gyms').select('codigo_convite').eq('id', gymId).maybeSingle();
  return data?.codigo_convite ?? '';
}

export async function trocarCodigo(gymId: string, codigo: string): Promise<string> {
  const { data, error } = await supabase.rpc('trocar_codigo_academia', { p_gym: gymId, p_codigo: codigo });
  if (error) throw error;
  return data as string;
}

/** Admin troca a senha de alguém da academia por uma provisória (SQL 0027). Devolve a senha nova. */
export async function redefinirSenha(gymId: string, userId: string): Promise<string> {
  // fácil de ditar na recepção: "fit" + 5 números
  const senha = `fit${Math.floor(10000 + Math.random() * 90000)}`;
  const { error } = await supabase.rpc('admin_redefinir_senha', { p_gym: gymId, p_user: userId, p_senha: senha });
  if (error) {
    if (error.code === 'PGRST202') throw new Error('Rode o SQL 0027 no Supabase para liberar isso.');
    throw new Error(error.message);
  }
  return senha;
}

export type Sumido = { userId: string; nome: string; ultima: Date; dias: number; personal: string | null };

/** Alunos que já apareceram e não voltam há X dias (treino pelo app ou check-in). SQL 0027. */
export async function listarSumidos(gymId: string, dias = 14): Promise<Sumido[]> {
  const { data, error } = await supabase.rpc('alunos_sumidos', { p_gym: gymId, p_dias: dias });
  if (error) {
    if (error.code === 'PGRST202') return []; // SQL 0027 ainda não rodado
    throw new Error(error.message);
  }
  return ((data ?? []) as any[]).map((r) => ({
    userId: r.user_id,
    nome: r.nome || 'Sem nome',
    ultima: new Date(r.ultima),
    dias: r.dias,
    personal: r.personal ?? null,
  }));
}
