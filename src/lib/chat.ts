import { supabase } from '@/lib/supabase';

// Chat personal ↔ aluno. Só existe entre os dois vinculados; mensagem nova chega na hora pelo
// Supabase Realtime (um "canal" que avisa o app quando entra uma linha nova na tabela).

export type Conversa = {
  outroId: string;
  outroNome: string;
  souPersonal: boolean;
  ativo: boolean; // vínculo ainda ativo (se não, só dá para ler o histórico)
  ultima: string | null;
  ultimaEm: Date | null;
  ultimaMinha: boolean;
  naoLidas: number;
};

export type Mensagem = { id: string; minha: boolean; texto: string; criadoEm: Date; lida: boolean };

export async function listarConversas(): Promise<Conversa[]> {
  const { data, error } = await supabase.rpc('minhas_conversas');
  if (error) throw error;
  return ((data ?? []) as any[]).map((c) => ({
    outroId: c.outro_id,
    outroNome: c.outro_nome,
    souPersonal: !!c.sou_personal,
    ativo: !!c.ativo,
    ultima: c.ultima,
    ultimaEm: c.ultima_em ? new Date(c.ultima_em) : null,
    ultimaMinha: !!c.ultima_minha,
    naoLidas: Number(c.nao_lidas ?? 0),
  }));
}

async function meuId() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? '';
}

function converter(m: any, eu: string): Mensagem {
  return { id: m.id, minha: m.autor_id === eu, texto: m.texto, criadoEm: new Date(m.criado_em), lida: !!m.lida_em };
}

/** Últimas mensagens com o outro (mais antigas primeiro). */
export async function listarMensagens(outroId: string, souPersonal: boolean): Promise<Mensagem[]> {
  const eu = await meuId();
  const { data, error } = await supabase
    .from('mensagens')
    .select('id, autor_id, texto, criado_em, lida_em')
    .eq(souPersonal ? 'personal_id' : 'aluno_id', eu)
    .eq(souPersonal ? 'aluno_id' : 'personal_id', outroId)
    .order('criado_em', { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as any[]).reverse().map((m) => converter(m, eu));
}

export async function enviarMensagem(outroId: string, souPersonal: boolean, texto: string): Promise<Mensagem> {
  const eu = await meuId();
  const { data, error } = await supabase
    .from('mensagens')
    .insert({
      personal_id: souPersonal ? eu : outroId,
      aluno_id: souPersonal ? outroId : eu,
      texto: texto.trim(),
    })
    .select('id, autor_id, texto, criado_em, lida_em')
    .single();
  if (error) throw error;
  return converter(data, eu);
}

export async function marcarLidas(outroId: string) {
  await supabase.rpc('marcar_lidas', { p_outro: outroId });
}

/** Avisa quando chega mensagem nova do outro. Devolve a função que desliga o aviso. */
export function ouvirMensagens(outroId: string, souPersonal: boolean, aoChegar: (m: Mensagem) => void) {
  let canal: ReturnType<typeof supabase.channel> | null = null;
  let desligado = false;
  meuId().then((eu) => {
    if (desligado || !eu) return;
    canal = supabase
      .channel(`chat-${eu}-${outroId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `${souPersonal ? 'personal_id' : 'aluno_id'}=eq.${eu}`,
        },
        (payload) => {
          const m: any = payload.new;
          if (m.autor_id === outroId) aoChegar(converter(m, eu));
        },
      )
      .subscribe();
  });
  return () => {
    desligado = true;
    if (canal) supabase.removeChannel(canal);
  };
}

export function horaMensagem(d: Date) {
  const hoje = new Date();
  const mesmoDia = d.toDateString() === hoje.toDateString();
  const hora = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return mesmoDia ? hora : `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hora}`;
}
