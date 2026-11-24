import { supabase } from '@/lib/supabase';
import { POR_PAGINA, comFotos, converter, type Publicacao } from '@/lib/comunidade';

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
  souAdmin: boolean; // dono, admin do clube ou admin da academia
  soAdminsEnviam: boolean; // clube de avisos: só admin manda mensagem
  naoLidas: number;
  ultima: string | null; // "Bruno C.: texto da última mensagem"
  ultimaEm: Date | null;
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
    souAdmin: !!c.sou_admin,
    soAdminsEnviam: !!c.so_admins_enviam,
    naoLidas: Number(c.nao_lidas ?? 0),
    ultima: c.ultima,
    ultimaEm: c.ultima_em ? new Date(c.ultima_em) : null,
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
  return comFotos(((data ?? []) as any[]).map(converter));
}

export function traduzirErroClube(msg: string) {
  if (msg.includes('fechado')) return 'Esse clube é fechado. Peça o código para alguém que está nele.';
  if (msg.includes('não encontrado')) return 'Código não encontrado. Confira as 6 letras.';
  if (msg.includes('5 clubes')) return 'Você já é dono de 5 clubes.';
  return 'Não deu certo agora. Tente de novo.';
}

// ---------- conversa do clube ----------

export type MensagemClube = {
  id: string;
  autorId: string;
  autor: string;
  eu: boolean;
  autorAdmin: boolean;
  texto: string;
  criadoEm: Date;
  fixada: boolean;
};

export type PessoaClube = { userId: string; autor: string; eu: boolean; dono: boolean; admin: boolean };

function converterMsg(m: any): MensagemClube {
  return {
    id: m.id,
    autorId: m.autor_id,
    autor: m.autor,
    eu: !!m.eu,
    autorAdmin: !!m.autor_admin,
    texto: m.texto,
    criadoEm: new Date(m.criado_em),
    fixada: !!m.fixada,
  };
}

/** Últimas mensagens, das mais antigas para as mais novas. */
export async function mensagensDoClube(clubeId: string): Promise<MensagemClube[]> {
  const { data, error } = await supabase.rpc('mensagens_clube', { p_clube: clubeId, p_antes: null, p_limite: 100 });
  if (error) throw error;
  return ((data ?? []) as any[]).map(converterMsg).reverse();
}

export async function enviarNoClube(clubeId: string, texto: string) {
  const { error } = await supabase.from('clube_mensagens').insert({ clube_id: clubeId, texto: texto.trim() });
  if (error) throw error;
}

export async function apagarMensagemClube(id: string) {
  const { error } = await supabase.from('clube_mensagens').delete().eq('id', id);
  if (error) throw error;
}

export async function fixarMensagem(id: string, fixar: boolean) {
  const { error } = await supabase.rpc('fixar_mensagem', { p_mensagem: id, p_fixar: fixar });
  if (error) throw error;
}

export async function marcarClubeLido(clubeId: string) {
  await supabase.rpc('marcar_clube_lido', { p_clube: clubeId });
}

export async function pessoasDoClube(clubeId: string): Promise<PessoaClube[]> {
  const { data, error } = await supabase.rpc('membros_clube', { p_clube: clubeId });
  if (error) throw error;
  return ((data ?? []) as any[]).map((m) => ({ userId: m.user_id, autor: m.autor, eu: !!m.eu, dono: !!m.dono, admin: !!m.admin }));
}

export async function definirAdminClube(clubeId: string, userId: string, admin: boolean) {
  const { error } = await supabase.rpc('definir_admin_clube', { p_clube: clubeId, p_user: userId, p_admin: admin });
  if (error) throw error;
}

export async function removerDoClube(clubeId: string, userId: string) {
  const { error } = await supabase.rpc('remover_do_clube', { p_clube: clubeId, p_user: userId });
  if (error) throw error;
}

export async function clubeSoAdmins(clubeId: string, sim: boolean) {
  const { error } = await supabase.rpc('clube_so_admins', { p_clube: clubeId, p_sim: sim });
  if (error) throw error;
}

/** Avisa quando entra mensagem nova no clube (Realtime). Devolve a função que desliga. */
export function ouvirClube(clubeId: string, aoMudar: () => void) {
  const canal = supabase
    .channel(`clube-${clubeId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'clube_mensagens', filter: `clube_id=eq.${clubeId}` }, () => aoMudar())
    .subscribe();
  return () => {
    supabase.removeChannel(canal);
  };
}
