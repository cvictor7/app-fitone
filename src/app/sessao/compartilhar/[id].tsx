import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Alert, Image, type LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { Logo } from '@/components/logo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio, infoModalidade } from '@/constants/theme';
import { buscarResumo, textoDuracao, textoVolume, type ResumoSessao } from '@/lib/sessao-resumo';

// Compartilhar o treino: vira imagem e abre o menu do celular (Stories, WhatsApp, salvar...).
// Três jeitos: "Card" (fundo preto), "Com foto" (números por cima de uma foto sua) e
// "Adesivo" (fundo transparente, para colar por cima de uma foto no próprio Instagram).
// O card é sempre 9:16 e tudo é medido pelo tamanho dele, então nunca corta. Nunca mostra peso corporal.

type Tipo = 'card' | 'foto' | 'adesivo';
const SENSACOES = ['Muito leve', 'Leve', 'Na medida', 'Pesado', 'No limite'];

export default function Compartilhar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [resumo, setResumo] = useState<ResumoSessao | null>(null);
  const [tipo, setTipo] = useState<Tipo>('card');
  const [foto, setFoto] = useState<string | null>(null);
  const [palco, setPalco] = useState({ w: 0, h: 0 });
  const [gerando, setGerando] = useState(false);
  const alvo = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    buscarResumo(id).then(setResumo);
  }, [id]);

  async function escolherFoto() {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Sem permissão', 'Libere as fotos nos Ajustes do celular.');
      return;
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [9, 16] });
    if (!r.canceled && r.assets[0]) {
      setFoto(r.assets[0].uri);
      setTipo('foto');
    }
  }

  async function compartilhar() {
    if (!alvo.current) return;
    if (tipo === 'foto' && !foto) return escolherFoto();
    setGerando(true);
    try {
      const uri = await captureRef(alvo as any, { format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: 1920 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar treino', UTI: 'public.png' });
    } catch (e: any) {
      Alert.alert('Não deu para gerar a imagem', String(e?.message ?? e));
    } finally {
      setGerando(false);
    }
  }

  const aoMedir = (ev: LayoutChangeEvent) => setPalco({ w: ev.nativeEvent.layout.width, h: ev.nativeEvent.layout.height });

  if (!resumo) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Compartilhar" />
        <ActivityIndicator color={Cores.verde} style={{ marginTop: 120 }} />
      </SafeAreaView>
    );
  }

  const info = infoModalidade(resumo.modalidade);
  const musculacao = resumo.series > 0;

  // Card 9:16 do maior tamanho que cabe; "e" = escala (1 = card de 360 px de largura)
  const largura = Math.max(0, Math.min(palco.w, (palco.h * 9) / 16));
  const altura = (largura * 16) / 9;
  const e = largura / 360;

  const numeros: [string, string, string?][] = [];
  numeros.push([textoDuracao(resumo.duracaoS), musculacao ? 'tempo' : 'de treino']);
  if (musculacao && resumo.volumeKg > 0) numeros.push([textoVolume(resumo.volumeKg), 'kg']);
  if (resumo.recordes.length > 0) numeros.push([String(resumo.recordes.length), resumo.recordes.length === 1 ? 'recorde' : 'recordes', Cores.verde]);
  if (!musculacao && resumo.sensacao) numeros.push([SENSACOES[resumo.sensacao - 1], 'como foi']);

  const fundo = tipo === 'card' ? Cores.fundo : 'transparent';
  const comFoto = tipo === 'foto' && !!foto;
  const curto = resumo.rotulo.length <= 2;

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo="Compartilhar" />

      <View style={estilos.seletor}>
        {(['card', 'foto', 'adesivo'] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => (t === 'foto' && !foto ? escolherFoto() : setTipo(t))}
            style={[estilos.opcao, tipo === t && { backgroundColor: Cores.verde }]}>
            <Texto variante="corpo" cor={tipo === t ? Cores.preto : Cores.textoSecundario} style={{ fontFamily: 'Archivo_600SemiBold' }}>
              {t === 'card' ? 'Card' : t === 'foto' ? 'Com foto' : 'Adesivo'}
            </Texto>
          </Pressable>
        ))}
      </View>

      <View style={estilos.palco} onLayout={aoMedir}>
        {largura > 0 ? (
          // Xadrez atrás do adesivo só para mostrar que o fundo é transparente (não sai na imagem)
          <View style={[{ width: largura, height: altura, borderRadius: 18 * e, overflow: 'hidden' }, tipo === 'adesivo' && estilos.xadrez]}>
            <View ref={alvo} collapsable={false} style={{ width: largura, height: altura, backgroundColor: fundo }}>
              {comFoto ? (
                <>
                  <Image source={{ uri: foto! }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                  {/* escurece o pé da foto para os números ficarem legíveis */}
                  <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: altura * 0.58, backgroundColor: 'rgba(0,0,0,0.6)' }} />
                </>
              ) : null}

              <View style={[estilos.conteudo, { padding: 24 * e, justifyContent: comFoto ? 'flex-end' : 'center', gap: 6 * e }]}>
                <Logo largura={96 * e} comCidade={false} />
                <Texto
                  variante="display"
                  cor={Cores.verde}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ fontSize: (curto ? 150 : 84) * e, lineHeight: (curto ? 144 : 88) * e, marginTop: 8 * e, maxWidth: largura - 48 * e }}>
                  {resumo.rotulo}
                </Texto>
                {resumo.nome && resumo.nome.toUpperCase() !== resumo.rotulo ? (
                  <Texto variante="subtitulo" numberOfLines={2} style={{ fontSize: 22 * e, lineHeight: 26 * e, textAlign: 'center' }}>
                    {resumo.nome}
                  </Texto>
                ) : null}

                <View style={{ flexDirection: 'row', gap: 22 * e, marginTop: 10 * e }}>
                  {numeros.map(([n, r, cor]) => (
                    <View key={r} style={{ alignItems: 'center' }}>
                      <Texto variante="numero" cor={cor ?? Cores.branco} numberOfLines={1} style={{ fontSize: 30 * e, lineHeight: 32 * e }}>
                        {n}
                      </Texto>
                      <Texto variante="legenda" cor={Cores.cinza} style={{ fontSize: 12 * e, lineHeight: 16 * e }}>
                        {r}
                      </Texto>
                    </View>
                  ))}
                </View>

                {musculacao && resumo.melhorSerie ? (
                  <Texto variante="legenda" cor={Cores.cinza} numberOfLines={1} style={{ fontSize: 13 * e, lineHeight: 18 * e, marginTop: 4 * e }}>
                    Melhor série: {resumo.melhorSerie.exercicio.toLowerCase()} · {resumo.melhorSerie.kg.toLocaleString('pt-BR')} kg × {resumo.melhorSerie.reps}
                  </Texto>
                ) : null}
                {!musculacao && resumo.observacao ? (
                  <Texto variante="corpo" cor={Cores.cinza} numberOfLines={4} style={{ fontSize: 14 * e, lineHeight: 20 * e, textAlign: 'center', marginTop: 4 * e }}>
                    {resumo.observacao}
                  </Texto>
                ) : null}

                <View style={{ borderColor: Cores.verde, borderWidth: 1.5 * e, borderRadius: 99, paddingHorizontal: 12 * e, paddingVertical: 4 * e, marginTop: 8 * e }}>
                  <Texto variante="subtitulo" cor={Cores.branco} style={{ fontSize: 14 * e, lineHeight: 18 * e, letterSpacing: 1 }}>
                    {info.nome}
                  </Texto>
                </View>
                {tipo !== 'adesivo' ? (
                  <Texto variante="legenda" cor={Cores.cinza} style={{ fontSize: 12 * e, lineHeight: 16 * e, marginTop: 6 * e }}>
                    Fit One Manaus · Vila da Prata
                  </Texto>
                ) : null}
              </View>
            </View>
          </View>
        ) : null}
      </View>

      <View style={estilos.rodape}>
        <Botao titulo={gerando ? 'Gerando...' : 'Compartilhar'} disabled={gerando} onPress={compartilhar} />
        {tipo === 'foto' ? (
          <Pressable onPress={escolherFoto} style={{ alignSelf: 'center' }} hitSlop={8}>
            <Texto variante="corpo" cor={Cores.textoSecundario}>
              Trocar foto
            </Texto>
          </Pressable>
        ) : (
          <Texto variante="legenda" style={{ textAlign: 'center' }}>
            Abre o menu do celular: Stories, WhatsApp, salvar imagem...
          </Texto>
        )}
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  seletor: { flexDirection: 'row', backgroundColor: Cores.superficie, borderRadius: 12, padding: 4, gap: 4, marginHorizontal: Espaco.lg },
  opcao: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  palco: { flex: 1, alignItems: 'center', justifyContent: 'center', margin: Espaco.md },
  xadrez: { backgroundColor: '#2b2d2b', borderWidth: 1, borderColor: Cores.borda, borderStyle: 'dashed', borderRadius: Raio.lg },
  conteudo: { flex: 1, alignItems: 'center' },
  rodape: { paddingHorizontal: Espaco.lg, gap: Espaco.sm, paddingBottom: Espaco.xs },
});
