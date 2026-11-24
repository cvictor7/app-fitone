import { supabase } from '@/lib/supabase';

// Notificações dentro do app (o sino da Comunidade): Boa!, comentário e @menção.

export type Notificacao = {
  id: string;
  tipo: 'curtida' | 'comentario' | 'mencao';
  ator: string;
  publicacaoId: string | null;
  rotulo: string | null;
  trecho: string;
  criadoEm: Date;
  lida: boolean;
  clubeId: string | null;
  clube: string | null;
};

export async function listarNotificacoes(): Promise<Notificacao[]> {
  const { data, error } = await supabase.rpc('minhas_notificacoes');
  if (error) throw error;
  return ((data ?? []) as any[]).map((n) => ({
    id: n.id,
    tipo: n.tipo,
    ator: n.ator,
    publicacaoId: n.publicacao_id,
    rotulo: n.rotulo,
    trecho: n.trecho ?? '',
    criadoEm: new Date(n.criado_em),
    lida: !!n.lida,
    clubeId: n.clube_id ?? null,
    clube: n.clube ?? null,
  }));
}

export async function contarNaoLidas(): Promise<number> {
  const { data, error } = await supabase.rpc('notificacoes_nao_lidas');
  if (error) return 0;
  return Number(data ?? 0);
}

export async function marcarTodasLidas() {
  await supabase.rpc('marcar_notificacoes_lidas');
}

export function textoNotificacao(n: Notificacao) {
  const treino = n.rotulo ? ` (${n.rotulo})` : '';
  if (n.tipo === 'curtida') return `mandou Boa! no seu treino${treino}`;
  if (n.tipo === 'comentario') return `comentou no seu treino${treino}`;
  return n.clube ? `mencionou você no clube ${n.clube}` : 'mencionou você';
}
