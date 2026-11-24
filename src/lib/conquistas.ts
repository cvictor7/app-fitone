import AsyncStorage from '@react-native-async-storage/async-storage';

import { supabase } from '@/lib/supabase';

// Conquistas (medalhas): o banco calcula na hora a partir dos treinos.
// Para comemorar só as novas, o celular guarda quais a pessoa já viu.

export type Conquista = {
  codigo: string;
  grupo: string;
  emoji: string;
  titulo: string;
  descricao: string;
  meta: number;
  valor: number;
  conquistadaEm: Date | null;
};

const CHAVE = 'fitone:conquistas-vistas';

export async function listarConquistas(): Promise<Conquista[]> {
  const { data, error } = await supabase.rpc('minhas_conquistas');
  if (error) throw error;
  return ((data ?? []) as any[]).map((c) => ({
    codigo: c.codigo,
    grupo: c.grupo,
    emoji: c.emoji,
    titulo: c.titulo,
    descricao: c.descricao,
    meta: Number(c.meta),
    valor: Number(c.valor),
    conquistadaEm: c.conquistada_em ? new Date(c.conquistada_em) : null,
  }));
}

/**
 * Conquistas ganhas que a pessoa ainda não viu. Na primeira vez no aparelho só guarda
 * (para não despejar 10 comemorações de uma vez em quem já treinava).
 */
export async function conquistasNovas(): Promise<Conquista[]> {
  const todas = await listarConquistas();
  const ganhas = todas.filter((c) => c.conquistadaEm);
  const salvo = await AsyncStorage.getItem(CHAVE);
  if (salvo === null) {
    await AsyncStorage.setItem(CHAVE, JSON.stringify(ganhas.map((c) => c.codigo)));
    return [];
  }
  const vistas = new Set<string>(JSON.parse(salvo));
  return ganhas.filter((c) => !vistas.has(c.codigo));
}

export async function marcarVistas(codigos: string[]) {
  const salvo = JSON.parse((await AsyncStorage.getItem(CHAVE)) ?? '[]') as string[];
  await AsyncStorage.setItem(CHAVE, JSON.stringify([...new Set([...salvo, ...codigos])]));
}

export function textoProgresso(c: Conquista) {
  const km = c.codigo.startsWith('corrida') || c.codigo.startsWith('bike');
  const kg = c.codigo.startsWith('volume');
  const f = (n: number) =>
    km ? `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} km`
    : kg ? `${(n / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} t`
    : n.toLocaleString('pt-BR');
  return `${f(c.valor)} de ${f(c.meta)}`;
}
