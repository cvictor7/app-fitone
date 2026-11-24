import { supabase } from '@/lib/supabase';

// @menções: no banco o texto guarda @[Nome A.](uuid); na tela aparece só "@Nome A." em verde.
// Enquanto a pessoa digita, o campo mostra "@Nome A." e guarda à parte quem é quem;
// na hora de enviar, montarTexto() troca pelo formato do banco.

export type Pessoa = { userId: string; nome: string };
export type Parte = { tipo: 'texto'; valor: string } | { tipo: 'mencao'; nome: string; userId: string };

const TOKEN = /@\[([^\]]{1,40})\]\(([0-9a-f-]{36})\)/g;

export function partesTexto(texto: string | null | undefined): Parte[] {
  const s = texto ?? '';
  const partes: Parte[] = [];
  let ultimo = 0;
  for (const m of s.matchAll(TOKEN)) {
    const i = m.index ?? 0;
    if (i > ultimo) partes.push({ tipo: 'texto', valor: s.slice(ultimo, i) });
    partes.push({ tipo: 'mencao', nome: m[1], userId: m[2] });
    ultimo = i + m[0].length;
  }
  if (ultimo < s.length) partes.push({ tipo: 'texto', valor: s.slice(ultimo) });
  return partes;
}

/** Texto visível ("Boa @Ana S.!") + quem foi escolhido -> formato do banco. */
export function montarTexto(visivel: string, escolhidas: Pessoa[]) {
  let s = visivel;
  // nomes maiores primeiro, para "Ana S." não ser trocado dentro de "Ana Sofia B."
  for (const p of [...escolhidas].sort((a, b) => b.nome.length - a.nome.length)) {
    s = s.split(`@${p.nome}`).join(`@[${p.nome}](${p.userId})`);
  }
  return s;
}

/** Palavra que está sendo digitada depois de um "@" no fim do texto (ou null). */
export function buscaAtual(texto: string): string | null {
  const m = texto.match(/(?:^|\s)@([^\s@]{0,20})$/);
  return m ? m[1] : null;
}

export async function buscarPessoas(gymId: string, busca: string): Promise<Pessoa[]> {
  const { data, error } = await supabase.rpc('pessoas_para_mencionar', { p_gym: gymId, p_busca: busca });
  if (error) return [];
  return ((data ?? []) as any[]).map((p) => ({ userId: p.user_id, nome: p.nome }));
}
