import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '@/lib/supabase';

// Foto na publicação. Bucket PRIVADO: só quem é da Fit One vê, por link temporário (1 h).
// A foto é reduzida no celular (1080 px, JPEG) antes de subir: fica leve no 4G e no plano grátis.

const BUCKET = 'fotos-publicacoes';

/** Abre a galeria (recorte 4:5, igual ao Instagram). Devolve o arquivo já reduzido, ou null. */
export async function escolherFoto(): Promise<string | null> {
  const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permissao.granted) throw new Error('Libere o acesso às fotos nos Ajustes do celular.');
  const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 5], quality: 1 });
  if (r.canceled || !r.assets[0]) return null;
  return reduzir(r.assets[0].uri);
}

/** Tira foto na hora com a câmera. */
export async function tirarFoto(): Promise<string | null> {
  const permissao = await ImagePicker.requestCameraPermissionsAsync();
  if (!permissao.granted) throw new Error('Libere a câmera nos Ajustes do celular.');
  const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 5], quality: 1 });
  if (r.canceled || !r.assets[0]) return null;
  return reduzir(r.assets[0].uri);
}

async function reduzir(uri: string) {
  const imagem = await ImageManipulator.manipulate(uri).resize({ width: 1080 }).renderAsync();
  const salva = await imagem.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
  return salva.uri;
}

export const caminhoFoto = (gymId: string, autorId: string, publicacaoId: string) => `${gymId}/${autorId}/${publicacaoId}.jpg`;

/** Sobe a foto e liga na publicação. */
export async function enviarFotoPublicacao(gymId: string, autorId: string, publicacaoId: string, uri: string) {
  const caminho = caminhoFoto(gymId, autorId, publicacaoId);
  const bytes = await new File(uri).arrayBuffer();
  if (bytes.byteLength > 3 * 1024 * 1024) throw new Error('Foto grande demais.');
  const up = await supabase.storage.from(BUCKET).upload(caminho, bytes, { contentType: 'image/jpeg', upsert: true });
  if (up.error) throw new Error(up.error.message);
  const { error } = await supabase.rpc('definir_foto_publicacao', { p_publicacao: publicacaoId, p_path: caminho });
  if (error) throw new Error(error.message);
  cache.delete(caminho);
}

export async function apagarFoto(caminho: string | null | undefined) {
  if (!caminho) return;
  await supabase.storage.from(BUCKET).remove([caminho]);
  cache.delete(caminho);
}

/** Apaga todas as fotos da pessoa (usado ao excluir a conta). */
export async function apagarMinhasFotos(gymId: string, autorId: string) {
  const pasta = `${gymId}/${autorId}`;
  const { data } = await supabase.storage.from(BUCKET).list(pasta, { limit: 1000 });
  const nomes = (data ?? []).map((f) => `${pasta}/${f.name}`);
  if (nomes.length) await supabase.storage.from(BUCKET).remove(nomes);
}

// links temporários guardados por ~50 min (o mesmo link = a foto não baixa de novo)
const cache = new Map<string, { url: string; ate: number }>();

/** Troca caminhos por links temporários (uma chamada só para a página inteira do feed). */
export async function linksDasFotos(caminhos: (string | null | undefined)[]): Promise<Record<string, string>> {
  const agora = Date.now();
  const saida: Record<string, string> = {};
  const faltam: string[] = [];
  for (const c of new Set(caminhos.filter(Boolean) as string[])) {
    const em = cache.get(c);
    if (em && em.ate > agora) saida[c] = em.url;
    else faltam.push(c);
  }
  if (faltam.length) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(faltam, 3600);
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) {
        saida[item.path] = item.signedUrl;
        cache.set(item.path, { url: item.signedUrl, ate: agora + 50 * 60 * 1000 });
      }
    }
  }
  return saida;
}
