import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { supabase } from '@/lib/supabase';
import { salvarTreino, type TreinoAtivo } from '@/lib/treino-ativo';

// Fila de envio: treino terminado sem internet fica guardado no celular e sobe sozinho
// quando a conexão voltar (ao abrir o app, ao voltar para ele e a cada minuto).
// Cada item tem o id criado no celular: reenviar nunca duplica no banco.

type ItemTreino = { id: string; tipo: 'treino'; criadoEm: string; treino: TreinoAtivo };
type ItemSessao = {
  id: string;
  tipo: 'sessao';
  criadoEm: string;
  sessao: Record<string, unknown>; // linha da tabela sessoes (com id)
  percurso?: Record<string, unknown> | null; // GPS
};
export type ItemFila = ItemTreino | ItemSessao;

const CHAVE = 'fitone:fila-envio';
const ouvintes = new Set<(n: number) => void>();
let enviando = false;

async function ler(): Promise<ItemFila[]> {
  try {
    const t = await AsyncStorage.getItem(CHAVE);
    return t ? (JSON.parse(t) as ItemFila[]) : [];
  } catch {
    return [];
  }
}

async function gravar(itens: ItemFila[]) {
  await AsyncStorage.setItem(CHAVE, JSON.stringify(itens));
  ouvintes.forEach((f) => f(itens.length));
}

/** Erro de conexão (vale a pena guardar e tentar depois) ou erro de verdade do banco? */
export function erroDeConexao(msg: string | null | undefined) {
  const m = (msg ?? '').toLowerCase();
  return (
    m === '' ||
    m.includes('network') ||
    m.includes('fetch') ||
    m.includes('timeout') ||
    m.includes('timed out') ||
    m.includes('offline') ||
    m.includes('internet') ||
    m.includes('connection')
  );
}

export async function guardarTreinoNaFila(t: TreinoAtivo) {
  const itens = (await ler()).filter((i) => i.id !== t.sessaoId);
  itens.push({ id: t.sessaoId, tipo: 'treino', criadoEm: new Date().toISOString(), treino: t });
  await gravar(itens);
}

export async function guardarSessaoNaFila(sessao: Record<string, unknown>, percurso?: Record<string, unknown> | null) {
  const id = String(sessao.id);
  const itens = (await ler()).filter((i) => i.id !== id);
  itens.push({ id, tipo: 'sessao', criadoEm: new Date().toISOString(), sessao, percurso: percurso ?? null });
  await gravar(itens);
}

async function enviarItem(item: ItemFila): Promise<boolean> {
  if (item.tipo === 'treino') {
    const r = await salvarTreino(item.treino);
    return r.ok;
  }
  const { error } = await supabase.from('sessoes').insert(item.sessao);
  if (error && error.code !== '23505') return false; // 23505 = já tinha subido antes
  if (item.percurso) {
    const p = await supabase.from('percursos').upsert(item.percurso);
    if (p.error) return false;
  }
  return true;
}

/** Tenta mandar tudo o que está guardado. Devolve quantos ainda faltam. */
export async function enviarFila(): Promise<number> {
  if (enviando) return (await ler()).length;
  enviando = true;
  try {
    const itens = await ler();
    if (itens.length === 0) return 0;
    const { data } = await supabase.auth.getSession();
    if (!data.session) return itens.length; // sem login: espera
    const restam: ItemFila[] = [];
    for (const item of itens) {
      let ok = false;
      try {
        ok = await enviarItem(item);
      } catch {
        ok = false;
      }
      if (!ok) restam.push(item);
    }
    await gravar(restam);
    return restam.length;
  } finally {
    enviando = false;
  }
}

/** Quantos treinos estão esperando internet (atualiza sozinho). */
export function usePendentes() {
  const [n, setN] = useState(0);
  useEffect(() => {
    ler().then((i) => setN(i.length));
    ouvintes.add(setN);
    return () => {
      ouvintes.delete(setN);
    };
  }, []);
  return n;
}

/** Fica ligado no app inteiro: manda a fila ao abrir, ao voltar para o app e a cada minuto. */
export function useSincronizarFila(ativo: boolean) {
  useEffect(() => {
    if (!ativo) return;
    enviarFila();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') enviarFila();
    });
    const id = setInterval(async () => {
      if ((await ler()).length > 0) enviarFila();
    }, 60000);
    return () => {
      sub.remove();
      clearInterval(id);
    };
  }, [ativo]);
}
