import { supabase } from '@/lib/supabase';
import { POR_PAGINA, type Publicacao } from '@/lib/comunidade';

// Clubes: grupos dentro da comunidade da academia ("Turma das 6h", "Hybrid de quinta"...).
// Aberto: qualquer um da Fit One entra. Fechado: só com o código de 6 letras.

export type Clube = {
  id: string;
  nome: string;
  descricao: string | null;
  fechado: boolean;
  membros: number;
  souMembro: boolean;
  souDono: boolean;
  codigo: string | null; // só quem está no clube vê
  treinosSemana: number;
};

export type MembroClube = { userId: string; autor: string; eu: boolean; dono: boolean; treinos: number; minutos: number };

export async function listarClubes(gymId: string): Promise<Clube[]> {
  const { data, error } = await supabase.rpc('clubes_da_academia', { p_gym: gymId });
  if (error) throw error;
  return ((data ?? []) as any[]).map((c) => ({
    id: c.id,
    nome: c.nome,
    descricao: c.descricao,
    fechado: !!c.fechado,
    membros: Number(c.membros),
    souMembro: !!c.sou_membro,
    souDono: !!c.sou_dono,
    codigo: c.codigo,
    treinosSemana: Number(c.treinos_semana ?? 0),
  }));
}

export async function criarClube(gymId: string, nome: string, descricao: string, fechado: boolean): Promise<string> {
  const { data, error } = await supabase.rpc('criar_clube', {
    p_gym: gymId,
    p_nome: nome.trim(),
    p_descricao: descricao.trim(),
    p_fechado: fechado,
  });
  if (error) throw error;
  return data as string;
}

export async function entrarNoClube(clubeId: string) {
  const { error } = await supabase.rpc('entrar_clube', { p_clube: clubeId, p_codigo: null });
  if (error) throw error;
}

export async function entrarComCodigo(codigo: string): Promise<string> {
  const { data, error } = await supabase.rpc('entrar_clube', { p_clube: null, p_codigo: codigo.trim() });
  if (error) throw error;
  return data as string;
}

export async function sairDoClube(clubeId: string) {
  const { data } = await supabase.auth.getSession();
  const { error } = await supabase
    .from('clube_membros')
    .delete()
    .eq('clube_id', clubeId)
    .eq('user_id', data.session?.user.id ?? '');
  if (error) throw error;
}

export async function apagarClube(clubeId: string) {
  const { error } = await supabase.from('clubes').delete().eq('id', clubeId);
  if (error) throw error;
}

export async function membrosDoClube(clubeId: string): Promise<MembroClube[]> {
  const { data, error } = await supabase.rpc('ranking_clube', { p_clube: clubeId });
  if (error) throw error;
  return ((data ?? []) as any[]).map((m) => ({
    userId: m.user_id,
    autor: m.autor,
    eu: !!m.eu,
    dono: !!m.dono,
    treinos: Number(m.treinos),
    minutos: Number(m.minutos),
  }));
}

export async function feedDoClube(clubeId: string, antes?: Date): Promise<Publicacao[]> {
  const { data, error } = await supabase.rpc('feed_clube', {
    p_clube: clubeId,
    p_antes: antes ? antes.toISOString() : null,
    p_limite: POR_PAGINA,
  });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
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
  }));
}

export function traduzirErroClube(msg: string) {
  if (msg.includes('fechado')) return 'Esse clube é fechado. Peça o código para alguém que está nele.';
  if (msg.includes('não encontrado')) return 'Código não encontrado. Confira as 6 letras.';
  if (msg.includes('5 clubes')) return 'Você já é dono de 5 clubes.';
  return 'Não deu certo agora. Tente de novo.';
}
