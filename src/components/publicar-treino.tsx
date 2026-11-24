import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { CampoMencao } from '@/components/campo-mencao';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { publicacaoDaSessao, publicarTreino, removerPublicacao } from '@/lib/comunidade';
import { apagarFoto, enviarFotoPublicacao, escolherFoto, linksDasFotos, tirarFoto } from '@/lib/fotos';
import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';

// Caixa "Publicar na comunidade" da tela de treino concluído.
// Só publica se o aluno tocar no botão. Foto opcional (galeria ou câmera). Dá para tirar depois.

const semCodigo = (t: string) => t.replace(/@\[([^\]]{1,40})\]\([0-9a-f-]{36}\)/g, '@$1');

export function PublicarTreino({ sessaoId, rotulo }: { sessaoId: string; rotulo: string }) {
  const { sessao } = useSessao();
  const [estado, setEstado] = useState<'carregando' | 'livre' | 'enviando' | 'publicado'>('carregando');
  const [pub, setPub] = useState<{ id: string; gymId: string; fotoPath: string | null } | null>(null);
  const [legenda, setLegenda] = useState('');
  const [legendaEnvio, setLegendaEnvio] = useState('');
  const [foto, setFoto] = useState<string | null>(null); // arquivo local escolhido (ainda não enviado)
  const [fotoNoAr, setFotoNoAr] = useState<string | null>(null); // link da foto já publicada
  const [mexendoFoto, setMexendoFoto] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    const p = await publicacaoDaSessao(sessaoId);
    if (p) {
      setPub(p);
      const visivel = semCodigo(p.legenda ?? '');
      setLegenda(visivel);
      setLegendaEnvio(visivel);
      if (p.fotoPath) {
        const links = await linksDasFotos([p.fotoPath]).catch(() => ({}) as Record<string, string>);
        setFotoNoAr(links[p.fotoPath] ?? null);
      } else setFotoNoAr(null);
      setEstado('publicado');
    } else {
      setPub(null);
      setFotoNoAr(null);
      setEstado('livre');
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessaoId]);

  async function pegarFoto(origem: 'galeria' | 'camera') {
    setErro(null);
    try {
      const uri = origem === 'galeria' ? await escolherFoto() : await tirarFoto();
      if (uri) setFoto(uri);
      return uri;
    } catch (e: any) {
      setErro(String(e?.message ?? 'Não deu para abrir as fotos.'));
      return null;
    }
  }

  async function publicar() {
    setErro(null);
    setEstado('enviando');
    try {
      await publicarTreino(sessaoId, rotulo, legendaEnvio);
      const p = await publicacaoDaSessao(sessaoId);
      if (p && foto && sessao?.user.id) {
        try {
          await enviarFotoPublicacao(p.gymId, sessao.user.id, p.id, foto);
        } catch {
          setErro('O treino foi publicado, mas a foto não subiu. Tente adicionar de novo.');
        }
      }
      setFoto(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await carregar();
    } catch (e: any) {
      setErro(e?.message?.includes('Entre na academia') ? 'Entre na academia primeiro.' : 'Não deu para publicar. Tente de novo.');
      setEstado('livre');
    }
  }

  // já publicado: adicionar/trocar ou tirar a foto
  async function trocarFotoPublicada(origem: 'galeria' | 'camera') {
    if (!pub || !sessao?.user.id) return;
    const uri = await pegarFoto(origem);
    if (!uri) return;
    setMexendoFoto(true);
    try {
      await enviarFotoPublicacao(pub.gymId, sessao.user.id, pub.id, uri);
      setFoto(null);
      await carregar();
    } catch {
      setErro('A foto não subiu. Confira a internet e tente de novo.');
    } finally {
      setMexendoFoto(false);
    }
  }

  async function tirarFotoPublicada() {
    if (!pub?.fotoPath) return;
    setMexendoFoto(true);
    try {
      await apagarFoto(pub.fotoPath);
      await supabase.rpc('definir_foto_publicacao', { p_publicacao: pub.id, p_path: null });
      await carregar();
    } catch {
      setErro('Não deu para tirar a foto agora.');
    } finally {
      setMexendoFoto(false);
    }
  }

  async function tirar() {
    if (!pub) return;
    try {
      await removerPublicacao(pub.id, pub.fotoPath);
      await carregar();
    } catch {
      setErro('Não deu para tirar agora.');
    }
  }

  if (estado === 'carregando') {
    return (
      <View style={estilos.caixa}>
        <ActivityIndicator color={Cores.verde} />
      </View>
    );
  }

  const botoesFoto = (aoEscolher: (o: 'galeria' | 'camera') => void) => (
    <View style={{ flexDirection: 'row', gap: Espaco.sm }}>
      <Pressable onPress={() => aoEscolher('camera')} style={estilos.botaoFoto}>
        <Texto variante="corpo" style={{ fontFamily: 'Archivo_600SemiBold' }}>
          📷 Tirar foto
        </Texto>
      </Pressable>
      <Pressable onPress={() => aoEscolher('galeria')} style={estilos.botaoFoto}>
        <Texto variante="corpo" style={{ fontFamily: 'Archivo_600SemiBold' }}>
          🖼️ Da galeria
        </Texto>
      </Pressable>
    </View>
  );

  if (estado === 'publicado') {
    return (
      <View style={[estilos.caixa, { borderColor: Cores.verde }]}>
        <Texto variante="rotulo" cor={Cores.verde}>
          NA COMUNIDADE ✓
        </Texto>
        {fotoNoAr ? <Image source={{ uri: fotoNoAr }} style={estilos.foto} resizeMode="cover" /> : null}
        <Texto variante="corpo" cor={Cores.textoSecundario}>
          A galera da Fit One já pode ver e mandar um "Boa!".
        </Texto>
        {mexendoFoto ? (
          <ActivityIndicator color={Cores.verde} />
        ) : fotoNoAr ? (
          <Pressable onPress={tirarFotoPublicada} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
            <Texto variante="corpo" cor={Cores.textoSecundario} style={{ textDecorationLine: 'underline' }}>
              Tirar a foto
            </Texto>
          </Pressable>
        ) : (
          botoesFoto(trocarFotoPublicada)
        )}
        {erro ? (
          <Texto variante="legenda" cor={Cores.perigo}>
            {erro}
          </Texto>
        ) : null}
        <Pressable onPress={tirar} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
          <Texto variante="corpo" cor={Cores.textoSecundario} style={{ textDecorationLine: 'underline' }}>
            Tirar da comunidade
          </Texto>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={estilos.caixa}>
      <Texto variante="rotulo">PUBLICAR NA COMUNIDADE</Texto>
      <Texto variante="legenda">Só a galera da Fit One vê, com seu nome abreviado. Nada de peso corporal.</Texto>

      {foto ? (
        <View>
          <Image source={{ uri: foto }} style={estilos.foto} resizeMode="cover" />
          <Pressable onPress={() => setFoto(null)} style={estilos.tirarFoto} hitSlop={8} accessibilityLabel="Tirar foto">
            <Texto variante="corpo" cor={Cores.branco}>
              ✕
            </Texto>
          </Pressable>
        </View>
      ) : (
        botoesFoto((o) => void pegarFoto(o))
      )}

      <CampoMencao
        valor={legenda}
        aoMudar={(v, e) => {
          setLegenda(v);
          setLegendaEnvio(e);
        }}
        placeholder="Escreva algo · @ para marcar quem treinou junto"
        maxLength={280}
        multiline
        style={{ minHeight: 56, paddingTop: 14, fontSize: 16 }}
      />
      {erro ? (
        <Texto variante="legenda" cor={Cores.perigo}>
          {erro}
        </Texto>
      ) : null}
      <Botao titulo={estado === 'enviando' ? 'Publicando...' : 'Publicar'} disabled={estado === 'enviando'} onPress={publicar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: {
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    padding: Espaco.md,
    gap: Espaco.sm,
  },
  foto: { width: '100%', aspectRatio: 4 / 5, borderRadius: Raio.md, backgroundColor: Cores.superficieAlta },
  tirarFoto: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoFoto: {
    flex: 1,
    minHeight: 48,
    borderRadius: Raio.md,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
