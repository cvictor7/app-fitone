import type { Modalidade } from '@/constants/theme';
import { apagarFoto, linksDasFotos } from '@/lib/fotos';
import { supabase } from '@/lib/supabase';

// Comunidade da academia: feed de treinos publicados, "Boa!" e ranking da semana.
// Nada é publicado sozinho: o aluno escolhe publicar cada treino (LGPD).

export type Publicacao = {
  id: string;
  autorId: string;
  autor: string; // nome abreviado, ex.: "Carlos V."
  eu: boolean;
  criadoEm: Date;
  legenda: string | null;
  modalidade: Modalidade;
  rotulo: string;
  concluidaEm: Date;
  duracaoS: number | null;
  volumeKg: number;
  series: number;
  recordes: number;
  resumo: string | null;
  curtidas: number;
  euCurti: boolean;
  comentarios: number;
  fotoPath: string | null;
  fotoUrl: string | null; // link temporário (bucket privado)
};

export type LinhaRanking = { autorId: string; autor: string; eu: boolean; treinos: number; minutos: number };

export function converter(r: any): Publicacao {
  return {
    id: r.id,
    autorId: r.autor_id,
    autor: r.autor,
    eu: !!r.eu,
    criadoEm: new Date(r.criado_em),
    legenda: r.legenda,
    modalidade: r.modalidade,
    rotulo: r.rotulo,
    concluidaEm: new Date(r.concluida_em),
    duracaoS: r.duracao_s,
    volumeKg: Number(r.volume_kg ?? 0),
    series: Number(r.series ?? 0),
    recordes: Number(r.recordes ?? 0),
    resumo: r.resumo,
    curtidas: Number(r.curtidas ?? 0),
    euCurti: !!r.eu_curti,
    comentarios: Number(r.comentarios ?? 0),
    fotoPath: r.foto_path ?? null,
    fotoUrl: null,
  };
}

/** Coloca o link temporário de cada foto (uma chamada para a lista toda). */
export async function comFotos(lista: Publicacao[]): Promise<Publicacao[]> {
  if (!lista.some((p) => p.fotoPath)) return lista;
  const links = await linksDasFotos(lista.map((p) => p.fotoPath)).catch(() => ({}) as Record<string, string>);
  return lista.map((p) => (p.fotoPath ? { ...p, fotoUrl: links[p.fotoPath] ?? null } : p));
}

export const POR_PAGINA = 20;

export async function carregarFeed(gymId: string, antes?: Date): Promise<Publicacao[]> {
  const { data, error } = await supabase.rpc('feed_comunidade', {
    p_gym: gymId,
    p_antes: antes ? antes.toISOString() : null,
    p_limite: POR_PAGINA,
  });
  if (error) throw error;
  return comFotos(((data ?? []) as any[]).map(converter));
}

export async function carregarRanking(gymId: string): Promise<LinhaRanking[]> {
  const { data, error } = await supabase.rpc('ranking_semana', { p_gym: gymId });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    autorId: r.autor_id,
    autor: r.autor,
    eu: !!r.eu,
    treinos: Number(r.treinos),
    minutos: Number(r.minutos),
  }));
}

export async function publicarTreino(sessaoId: string, rotulo: string, legenda: string, ocultarTempo = false) {
  const base = { p_sessao: sessaoId, p_rotulo: rotulo, p_legenda: legenda.trim() || null };
  const { error } = await supabase.rpc('publicar_treino', { ...base, p_ocultar_tempo: ocultarTempo });
  if (!error) return;
  // banco ainda sem o SQL 0026: publica do jeito antigo (com tempo)
  if (error.code === 'PGRST202') {
    const r = await supabase.rpc('publicar_treino', base);
    if (r.error) throw r.error;
    return;
  }
  throw error;
}

export async function removerPublicacao(id: string, fotoPath?: string | null) {
  const { error } = await supabase.from('publicacoes').delete().eq('id', id);
  if (error) throw error;
  await apagarFoto(fotoPath).catch(() => {}); // a foto sai junto
}

/** Já publiquei este treino? Devolve o id da publicação, a legenda e a foto (se tiver). */
export async function publicacaoDaSessao(
  sessaoId: string,
): Promise<{ id: string; legenda: string | null; gymId: string; fotoPath: string | null } | null> {
  const { data } = await supabase.from('publicacoes').select('id, legenda, gym_id, foto_path').eq('sessao_id', sessaoId).maybeSingle();
  return data ? { id: data.id, legenda: data.legenda, gymId: data.gym_id, fotoPath: data.foto_path ?? null } : null;
}

export async function curtir(publicacaoId: string, sim: boolean) {
  if (sim) {
    const { error } = await supabase.from('curtidas').insert({ publicacao_id: publicacaoId });
    if (error && error.code !== '23505') throw error; // 23505 = já tinha curtido
  } else {
    const { data } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('curtidas')
      .delete()
      .eq('publicacao_id', publicacaoId)
      .eq('user_id', data.user?.id ?? '');
    if (error) throw error;
  }
}

export type Comentario = { id: string; autor: string; eu: boolean; texto: string; criadoEm: Date; possoApagar: boolean };

export async function carregarPublicacao(id: string): Promise<Publicacao | null> {
  const { data, error } = await supabase.rpc('publicacao_comunidade', { p_id: id });
  if (error) throw error;
  const r = ((data ?? []) as any[])[0];
  return r ? (await comFotos([converter(r)]))[0] : null;
}

export async function listarComentarios(publicacaoId: string): Promise<Comentario[]> {
  const { data, error } = await supabase.rpc('comentarios_da_publicacao', { p_publicacao: publicacaoId });
  if (error) throw error;
  return ((data ?? []) as any[]).map((c) => ({
    id: c.id,
    autor: c.autor,
    eu: !!c.eu,
    texto: c.texto,
    criadoEm: new Date(c.criado_em),
    possoApagar: !!c.posso_apagar,
  }));
}

export async function comentar(publicacaoId: string, texto: string) {
  const { error } = await supabase.from('comentarios').insert({ publicacao_id: publicacaoId, texto: texto.trim() });
  if (error) throw error;
}

export async function apagarComentario(id: string) {
  const { error } = await supabase.from('comentarios').delete().eq('id', id);
  if (error) throw error;
}

/** "agora", "há 5 min", "há 3 h", "ontem", "12/11" */
export function tempoAtras(d: Date) {
  const min = Math.floor((Date.now() - d.getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  if (h < 48) return 'ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
