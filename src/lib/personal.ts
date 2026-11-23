import { File } from 'expo-file-system';

import type { Modalidade } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// Consultas e gravações do lado do personal.

// ---------------------------------------------------------------- alunos
export type AlunoResumo = {
  id: string;
  nome: string;
  desde: Date;
  consentiu: boolean;
  ultimoTreino: Date | null;
  treinos7d: number;
  planoId: string | null;
  planoFim: Date | null;
};

export async function listarAlunos(): Promise<AlunoResumo[]> {
  const { data, error } = await supabase.rpc('resumo_alunos');
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((a) => ({
    id: a.aluno_id,
    nome: a.nome || 'Sem nome',
    desde: new Date(a.desde),
    consentiu: a.consentiu,
    ultimoTreino: a.ultimo_treino ? new Date(a.ultimo_treino) : null,
    treinos7d: a.treinos_7d ?? 0,
    planoId: a.plano_id,
    planoFim: a.plano_fim ? new Date(a.plano_fim) : null,
  }));
}

export function diasDesde(d: Date | null) {
  if (!d) return null;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export const DIAS_SUMIU = 7;

export async function gerarConvite(gymId: string): Promise<string> {
  const { data, error } = await supabase.rpc('gerar_convite_personal', { p_gym: gymId });
  if (error) throw new Error(error.message);
  return data as string;
}

// ---------------------------------------------------------------- planos
export type ExercicioNoPlano = {
  chave: string; // id local para a lista (o id do banco pode não existir ainda)
  exercicioId: string;
  nome: string;
  grupo: string;
  temVideo: boolean;
  series: string;
  repsMin: string;
  repsMax: string;
  carga: string;
  descanso: string;
  observacao: string;
};

export type TreinoNoPlano = {
  chave: string;
  id: string | null;
  letra: string;
  nome: string;
  modalidade: Modalidade;
  rotulo: string; // nome curto que aparece grande (vazio = automático)
  observacao: string;
  cardio: string;
  diasSemana: number[];
  exercicios: ExercicioNoPlano[]; // só musculação
  descricao: string; // outras modalidades (ex.: o WOD do Cross)
  duracaoMin: string;
  distanciaKm: string; // corrida e bike
};

export const treinoVazio = (letra: string): TreinoNoPlano => ({
  chave: novaChave(),
  id: null,
  letra,
  nome: `Treino ${letra}`,
  modalidade: 'musculacao',
  rotulo: '',
  observacao: '',
  cardio: '',
  diasSemana: [],
  exercicios: [],
  descricao: '',
  duracaoMin: '',
  distanciaKm: '',
});

export type PlanoEditavel = {
  id: string | null;
  alunoId: string | null; // null = modelo
  nome: string;
  fim: string; // dd/mm/aaaa ou vazio
  observacao: string;
  ativo: boolean;
  treinos: TreinoNoPlano[];
};

let contador = 0;
export const novaChave = () => `k${Date.now()}${contador++}`;

const LETRAS = 'ABCDEFGH';

export function planoEmBranco(alunoId: string | null): PlanoEditavel {
  return {
    id: null,
    alunoId,
    nome: alunoId ? 'Plano de treino' : 'Novo modelo',
    fim: '',
    observacao: '',
    ativo: true,
    treinos: [treinoVazio('A')],
  };
}

export function proximaLetra(treinos: TreinoNoPlano[]) {
  return LETRAS[treinos.length] ?? String(treinos.length + 1);
}

function dataBr(iso: string | null) {
  if (!iso) return '';
  const [a, m, d] = iso.split('-');
  return `${d}/${m}/${a}`;
}

function dataIso(br: string) {
  const m = br.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!m) return null;
  const ano = m[3].length === 2 ? `20${m[3]}` : m[3];
  return `${ano}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
}

const num = (t: string) => {
  const n = Number(t.replace(',', '.'));
  return t.trim() === '' || Number.isNaN(n) ? null : n;
};

export async function carregarPlano(id: string, gymId: string): Promise<PlanoEditavel> {
  const [rp, rm] = await Promise.all([
    supabase
      .from('planos')
      .select(
        `id, aluno_id, nome, fim, observacao, ativo,
         treinos(id, letra, nome, ordem, dias_semana, modalidade, descricao, duracao_min, distancia_km, rotulo, observacao, cardio,
           treino_exercicios(ordem, series, reps_min, reps_max, carga_sugerida_kg, descanso_s, observacao,
             exercicio:exercicios(id, nome, grupo)))`,
      )
      .eq('id', id)
      .single(),
    supabase.from('exercicio_midias').select('exercicio_id, video_url').eq('gym_id', gymId),
  ]);
  if (rp.error) throw new Error(rp.error.message);
  const comVideo = new Set(((rm.data ?? []) as any[]).filter((m) => m.video_url).map((m) => m.exercicio_id));
  const p = rp.data as any;
  return {
    id: p.id,
    alunoId: p.aluno_id,
    nome: p.nome,
    fim: dataBr(p.fim),
    observacao: p.observacao ?? '',
    ativo: p.ativo,
    treinos: (p.treinos ?? [])
      .sort((a: any, b: any) => a.ordem - b.ordem)
      .map((t: any) => ({
        chave: novaChave(),
        id: t.id,
        letra: t.letra,
        nome: t.nome,
        modalidade: t.modalidade ?? 'musculacao',
        rotulo: t.rotulo ?? '',
        observacao: t.observacao ?? '',
        cardio: t.cardio ?? '',
        descricao: t.descricao ?? '',
        duracaoMin: t.duracao_min ? String(t.duracao_min) : '',
        distanciaKm: t.distancia_km ? String(Number(t.distancia_km)).replace('.', ',') : '',
        diasSemana: t.dias_semana ?? [],
        exercicios: (t.treino_exercicios ?? [])
          .sort((a: any, b: any) => a.ordem - b.ordem)
          .map((te: any) => ({
            chave: novaChave(),
            exercicioId: te.exercicio.id,
            nome: te.exercicio.nome,
            grupo: te.exercicio.grupo,
            temVideo: comVideo.has(te.exercicio.id),
            series: String(te.series),
            repsMin: String(te.reps_min),
            repsMax: String(te.reps_max),
            carga: te.carga_sugerida_kg === null ? '' : String(Number(te.carga_sugerida_kg)).replace('.', ','),
            descanso: String(te.descanso_s),
            observacao: te.observacao ?? '',
          })),
      })),
  };
}

export function validarPlano(p: PlanoEditavel): string | null {
  if (!p.nome.trim()) return 'Dê um nome para o plano.';
  if (p.fim.trim() && !dataIso(p.fim)) return 'Data de vencimento inválida. Use dd/mm/aaaa.';
  if (p.treinos.length === 0) return 'O plano precisa de pelo menos um treino.';
  for (const t of p.treinos) {
    if (!t.nome.trim()) return `Dê um nome para o treino ${t.letra}.`;
    if (t.modalidade !== 'musculacao' && !t.descricao.trim() && !num(t.duracaoMin))
      return `${t.nome}: escreva o que fazer ou a duração.`;
    if (t.modalidade !== 'musculacao') continue;
    for (const e of t.exercicios) {
      const s = num(e.series);
      const rmin = num(e.repsMin);
      const rmax = num(e.repsMax) ?? rmin;
      if (!s || s < 1 || s > 20) return `${e.nome} (${t.nome}): séries entre 1 e 20.`;
      if (!rmin || rmin < 1) return `${e.nome} (${t.nome}): informe as repetições.`;
      if (rmax !== null && rmax < rmin) return `${e.nome} (${t.nome}): reps máximas menores que as mínimas.`;
    }
  }
  return null;
}

// Grava o plano inteiro. Treinos mantêm o id (para não perder o histórico de "último feito").
export async function salvarPlano(p: PlanoEditavel, gymId: string, personalId: string): Promise<string> {
  const erroValidacao = validarPlano(p);
  if (erroValidacao) throw new Error(erroValidacao);

  const dadosPlano = {
    gym_id: gymId,
    personal_id: personalId,
    aluno_id: p.alunoId,
    nome: p.nome.trim(),
    fim: dataIso(p.fim),
    observacao: p.observacao.trim() || null,
  };

  let planoId = p.id;
  if (planoId) {
    const r = await supabase.from('planos').update(dadosPlano).eq('id', planoId);
    if (r.error) throw new Error(r.error.message);
  } else {
    // nasce inativo; se for de aluno, ativa no fim (desativando o anterior)
    const r = await supabase
      .from('planos')
      .insert({ ...dadosPlano, ativo: false, inicio: new Date().toISOString().slice(0, 10) })
      .select('id')
      .single();
    if (r.error) throw new Error(r.error.message);
    planoId = r.data.id as string;
  }

  // treinos removidos
  const { data: existentes } = await supabase.from('treinos').select('id').eq('plano_id', planoId);
  const manter = new Set(p.treinos.map((t) => t.id).filter(Boolean));
  const remover = ((existentes ?? []) as any[]).map((t) => t.id).filter((id) => !manter.has(id));
  if (remover.length) {
    const r = await supabase.from('treinos').delete().in('id', remover);
    if (r.error) throw new Error(r.error.message);
  }

  // letras temporárias para não bater na regra "letra única por plano" ao reordenar
  for (const t of p.treinos.filter((x) => x.id)) {
    await supabase.from('treinos').update({ letra: `_${t.id!.slice(0, 6)}` }).eq('id', t.id!);
  }

  for (const [i, t] of p.treinos.entries()) {
    const dados = {
      plano_id: planoId,
      letra: LETRAS[i] ?? String(i + 1),
      nome: t.nome.trim(),
      ordem: i + 1,
      dias_semana: t.diasSemana,
      modalidade: t.modalidade,
      rotulo: t.rotulo.trim().slice(0, 10) || null,
      observacao: t.observacao.trim() || null,
      cardio: t.modalidade === 'musculacao' ? t.cardio.trim() || null : null,
      descricao: t.modalidade === 'musculacao' ? null : t.descricao.trim() || null,
      duracao_min: t.modalidade === 'musculacao' ? null : num(t.duracaoMin),
      distancia_km: t.modalidade === 'corrida' || t.modalidade === 'bike' ? num(t.distanciaKm) : null,
    };
    let treinoId = t.id;
    if (treinoId) {
      const r = await supabase.from('treinos').update(dados).eq('id', treinoId);
      if (r.error) throw new Error(r.error.message);
    } else {
      const r = await supabase.from('treinos').insert(dados).select('id').single();
      if (r.error) throw new Error(r.error.message);
      treinoId = r.data.id as string;
    }

    const r1 = await supabase.from('treino_exercicios').delete().eq('treino_id', treinoId);
    if (r1.error) throw new Error(r1.error.message);
    if (t.modalidade === 'musculacao' && t.exercicios.length) {
      const r2 = await supabase.from('treino_exercicios').insert(
        t.exercicios.map((e, j) => {
          const rmin = num(e.repsMin)!;
          return {
            treino_id: treinoId,
            exercicio_id: e.exercicioId,
            ordem: j + 1,
            series: num(e.series),
            reps_min: rmin,
            reps_max: num(e.repsMax) ?? rmin,
            carga_sugerida_kg: num(e.carga),
            descanso_s: num(e.descanso) ?? 90,
            observacao: e.observacao.trim() || null,
          };
        }),
      );
      if (r2.error) throw new Error(r2.error.message);
    }
  }

  if (p.alunoId && (!p.id || p.ativo)) {
    const r = await supabase.rpc('ativar_plano', { p_plano: planoId });
    if (r.error) throw new Error(r.error.message);
  }
  return planoId!;
}

export async function listarModelos() {
  const { data, error } = await supabase
    .from('planos')
    .select('id, nome, criado_em, treinos(letra, treino_exercicios(count))')
    .is('aluno_id', null)
    .order('criado_em', { ascending: false });
  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((p) => ({
    id: p.id as string,
    nome: p.nome as string,
    letras: ((p.treinos ?? []) as any[]).map((t) => t.letra as string).sort(),
    exercicios: ((p.treinos ?? []) as any[]).reduce((s, t) => s + (t.treino_exercicios?.[0]?.count ?? 0), 0) as number,
  }));
}

export async function usarModeloEmAluno(modeloId: string, alunoId: string) {
  const { data, error } = await supabase.rpc('copiar_plano', { p_plano: modeloId, p_aluno: alunoId });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function apagarPlano(id: string) {
  const { error } = await supabase.from('planos').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

// ---------------------------------------------------------------- exercícios
export type ExercicioBiblioteca = {
  id: string;
  nome: string;
  grupo: string;
  equipamento: string | null;
  daAcademia: boolean;
  videoUrl: string | null;
  instrucoes: string | null;
};

export async function listarExercicios(gymId: string): Promise<ExercicioBiblioteca[]> {
  const [re, rm] = await Promise.all([
    supabase.from('exercicios').select('id, nome, grupo, equipamento, gym_id').order('nome'),
    supabase.from('exercicio_midias').select('exercicio_id, video_url, instrucoes').eq('gym_id', gymId),
  ]);
  if (re.error) throw new Error(re.error.message);
  const midias = new Map(((rm.data ?? []) as any[]).map((m) => [m.exercicio_id, m]));
  return ((re.data ?? []) as any[]).map((e) => ({
    id: e.id,
    nome: e.nome,
    grupo: e.grupo,
    equipamento: e.equipamento,
    daAcademia: !!e.gym_id,
    videoUrl: midias.get(e.id)?.video_url ?? null,
    instrucoes: midias.get(e.id)?.instrucoes ?? null,
  }));
}

export async function criarExercicio(gymId: string, personalId: string, nome: string, grupo: string, equipamento: string) {
  const { data, error } = await supabase
    .from('exercicios')
    .insert({ gym_id: gymId, nome: nome.trim(), grupo: grupo.trim(), equipamento: equipamento.trim() || null, criado_por: personalId })
    .select('id')
    .single();
  if (error) {
    if (error.code === '23505') throw new Error('Já existe um exercício com esse nome.');
    throw new Error(error.message);
  }
  return data.id as string;
}

export async function atualizarExercicioDaAcademia(id: string, nome: string, grupo: string, equipamento: string) {
  const { error } = await supabase
    .from('exercicios')
    .update({ nome: nome.trim(), grupo: grupo.trim(), equipamento: equipamento.trim() || null })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

export async function salvarInstrucoes(gymId: string, exercicioId: string, personalId: string, instrucoes: string) {
  const { error } = await supabase.from('exercicio_midias').upsert(
    { gym_id: gymId, exercicio_id: exercicioId, instrucoes: instrucoes.trim() || null, atualizado_por: personalId, atualizado_em: new Date().toISOString() },
    { onConflict: 'gym_id,exercicio_id' },
  );
  if (error) throw new Error(error.message);
}

// Envia o vídeo para o armazenamento e grava o link no exercício
export async function enviarVideo(gymId: string, exercicioId: string, personalId: string, uri: string, mime = 'video/mp4') {
  const extensao = mime.includes('quicktime') ? 'mov' : 'mp4';
  const caminho = `${gymId}/${exercicioId}-${Date.now()}.${extensao}`;
  const bytes = await new File(uri).arrayBuffer();
  if (bytes.byteLength > 45 * 1024 * 1024) throw new Error('Vídeo grande demais (máx. 45 MB). Grave mais curto.');

  const { data: anterior } = await supabase
    .from('exercicio_midias')
    .select('video_caminho')
    .eq('gym_id', gymId)
    .eq('exercicio_id', exercicioId)
    .maybeSingle();

  const up = await supabase.storage.from('videos-exercicios').upload(caminho, bytes, { contentType: mime, upsert: false });
  if (up.error) throw new Error(up.error.message);
  const url = supabase.storage.from('videos-exercicios').getPublicUrl(caminho).data.publicUrl;

  const { error } = await supabase.from('exercicio_midias').upsert(
    { gym_id: gymId, exercicio_id: exercicioId, video_url: url, video_caminho: caminho, atualizado_por: personalId, atualizado_em: new Date().toISOString() },
    { onConflict: 'gym_id,exercicio_id' },
  );
  if (error) throw new Error(error.message);

  if (anterior?.video_caminho) await supabase.storage.from('videos-exercicios').remove([anterior.video_caminho]);
  return url;
}

export async function removerVideo(gymId: string, exercicioId: string) {
  const { data } = await supabase
    .from('exercicio_midias')
    .select('video_caminho')
    .eq('gym_id', gymId)
    .eq('exercicio_id', exercicioId)
    .maybeSingle();
  if (data?.video_caminho) await supabase.storage.from('videos-exercicios').remove([data.video_caminho]);
  const { error } = await supabase
    .from('exercicio_midias')
    .update({ video_url: null, video_caminho: null })
    .eq('gym_id', gymId)
    .eq('exercicio_id', exercicioId);
  if (error) throw new Error(error.message);
}
