import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  type LayoutChangeEvent,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { Logo } from '@/components/logo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio, infoModalidade } from '@/constants/theme';
import { buscarResumo, textoDuracao, textoVolume, type ResumoSessao } from '@/lib/sessao-resumo';
import { semTempos } from '@/lib/timer';

// Compartilhar o treino: vira imagem e abre o menu do celular (Stories, WhatsApp, salvar...).
// - Card: fundo preto da Fit One, imagem 9:16.
// - Com foto: sua foto no fundo e o selo do treino por cima. Arraste o selo com um dedo e
//   aumente/diminua com dois (pinça) ou nos botões. Imagem 9:16.
// - Adesivo: só o selo, com fundo transparente, para colar no Instagram e ajustar lá.
// O selo nunca corta: se não couber, ele encolhe sozinho. Nunca mostra peso corporal.

type Tipo = 'card' | 'foto' | 'adesivo';
const SENSACOES = ['Muito leve', 'Leve', 'Na medida', 'Pesado', 'No limite'];
const MIN = 0.35;
const MAX = 1.6;

export default function Compartilhar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [resumo, setResumo] = useState<ResumoSessao | null>(null);
  const [tipo, setTipo] = useState<Tipo>('card');
  const [foto, setFoto] = useState<string | null>(null);
  const [fundoSelo, setFundoSelo] = useState(false);
  const [mostrarTempo, setMostrarTempo] = useState(true); // tirar o cronômetro: mostra só o treino feito
  const [mostrarTreino, setMostrarTreino] = useState(true); // tirar estações/números: fica só FIT ONE + o nome do treino
  const [palco, setPalco] = useState({ w: 0, h: 0 });
  const [selo, setSelo] = useState({ w: 0, h: 0 }); // tamanho natural do selo
  const [gerando, setGerando] = useState(false);
  const alvo = useRef<ComponentRef<typeof View>>(null); // imagem 9:16 inteira
  const alvoSelo = useRef<ComponentRef<typeof View>>(null); // só o selo (adesivo)

  // posição (a partir do centro) e tamanho escolhidos pela pessoa
  const pos = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const escala = useRef(new Animated.Value(1)).current;
  const atual = useRef({ x: 0, y: 0, s: 1 });
  const gesto = useRef({ x: 0, y: 0, s: 1, dist: 0 });

  useEffect(() => {
    buscarResumo(id).then(setResumo);
  }, [id]);

  function aplicar(x: number, y: number, s: number) {
    const sc = Math.max(MIN, Math.min(MAX, s));
    atual.current = { x, y, s: sc };
    pos.setValue({ x, y });
    escala.setValue(sc);
  }

  const distancia = (t: readonly { pageX: number; pageY: number }[]) =>
    Math.hypot(t[0].pageX - t[1].pageX, t[0].pageY - t[1].pageY);

  const arrastar = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        gesto.current = { ...atual.current, dist: 0 };
      },
      onPanResponderMove: (ev, g) => {
        const toques = ev.nativeEvent.touches;
        if (toques.length >= 2) {
          // dois dedos: pinça muda o tamanho
          const d = distancia(toques);
          if (!gesto.current.dist) gesto.current = { ...atual.current, dist: d };
          else aplicar(atual.current.x, atual.current.y, (gesto.current.s * d) / gesto.current.dist);
        } else if (!gesto.current.dist) {
          aplicar(gesto.current.x + g.dx, gesto.current.y + g.dy, atual.current.s);
        }
      },
      onPanResponderRelease: () => {
        gesto.current.dist = 0;
      },
      onPanResponderTerminationRequest: () => false,
    }),
  ).current;

  // posição inicial de cada jeito: card no meio; com foto, embaixo e um pouco menor
  function posicaoInicial(t: Tipo, alturaCard: number, base: number) {
    if (t === 'foto' && selo.h > 0) {
      const s = 0.85;
      const y = alturaCard / 2 - (selo.h * base * s) / 2 - alturaCard * 0.05;
      aplicar(0, y, s);
    } else aplicar(0, 0, 1);
  }

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
    if (tipo === 'foto' && !foto) return escolherFoto();
    setGerando(true);
    try {
      const uri =
        tipo === 'adesivo'
          ? await captureRef(alvoSelo as any, {
              format: 'png',
              quality: 1,
              result: 'tmpfile',
              width: 1080,
              height: Math.round((1080 * selo.h) / Math.max(1, selo.w)),
            })
          : await captureRef(alvo as any, { format: 'png', quality: 1, result: 'tmpfile', width: 1080, height: 1920 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar treino', UTI: 'public.png' });
    } catch (e: any) {
      Alert.alert('Não deu para gerar a imagem', String(e?.message ?? e));
    } finally {
      setGerando(false);
    }
  }

  const aoMedirPalco = (ev: LayoutChangeEvent) => setPalco({ w: ev.nativeEvent.layout.width, h: ev.nativeEvent.layout.height });

  // Card 9:16 do maior tamanho que cabe; "e" = escala (1 = card de 360 px de largura)
  const largura = Math.max(0, Math.min(palco.w, (palco.h * 9) / 16));
  const altura = (largura * 16) / 9;
  const e = largura / 360;
  // encolhe o selo para sempre caber inteiro no card
  const base = selo.h > 0 ? Math.min(1, (altura * 0.9) / selo.h, (largura * 0.94) / selo.w) : 1;

  // reposiciona quando muda o jeito ou quando o selo é medido
  const chave = `${tipo}-${Math.round(selo.h)}-${Math.round(altura)}`;
  const ultimaChave = useRef('');
  useEffect(() => {
    if (!selo.h || !altura || ultimaChave.current === chave) return;
    ultimaChave.current = chave;
    posicaoInicial(tipo, altura, base);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chave]);

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
  const curto = resumo.rotulo.length <= 2;

  const numeros: [string, string, string?][] = [];
  if (mostrarTempo) numeros.push([textoDuracao(resumo.duracaoS), musculacao ? 'tempo' : 'de treino']);
  if (musculacao && resumo.volumeKg > 0) numeros.push([textoVolume(resumo.volumeKg), 'kg']);
  if (resumo.recordes.length > 0) numeros.push([String(resumo.recordes.length), resumo.recordes.length === 1 ? 'recorde' : 'recordes', Cores.verde]);
  if (!musculacao && resumo.sensacao) numeros.push([SENSACOES[resumo.sensacao - 1], 'como foi']);

  const comFoto = tipo === 'foto' && !!foto;
  // sem fundo em cima da foto: sombra nas letras para ler até em foto clara
  const sombra = comFoto && !fundoSelo ? { textShadowColor: 'rgba(0,0,0,0.85)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 * e } : null;
  const cinzaSelo = comFoto && !fundoSelo ? Cores.branco : Cores.cinza; // cinza some na foto: vira branco
  const mexe = tipo !== 'adesivo'; // no adesivo quem ajusta é o Instagram

  // ---------- o selo do treino (mesmo desenho nos três jeitos) ----------
  const conteudoSelo = (
    <View
      ref={alvoSelo}
      collapsable={false}
      onLayout={(ev) => {
        const { width, height } = ev.nativeEvent.layout;
        if (Math.abs(width - selo.w) > 1 || Math.abs(height - selo.h) > 1) setSelo({ w: width, h: height });
      }}
      style={[
        { width: 312 * e, alignItems: 'center', gap: 6 * e, paddingVertical: 20 * e, paddingHorizontal: 16 * e, borderRadius: 22 * e },
        comFoto && fundoSelo && { backgroundColor: 'rgba(10,10,10,0.62)' },
      ]}>
      <Logo largura={96 * e} comCidade={false} />
      <Texto
        variante="display"
        cor={Cores.verde}
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[{ fontSize: (curto ? 150 : 84) * e, lineHeight: (curto ? 144 : 88) * e, marginTop: 6 * e, maxWidth: 280 * e }, sombra]}>
        {resumo.rotulo}
      </Texto>
      {resumo.nome && resumo.nome.toUpperCase() !== resumo.rotulo ? (
        <Texto variante="subtitulo" numberOfLines={2} style={[{ fontSize: 22 * e, lineHeight: 26 * e, textAlign: 'center' }, sombra]}>
          {resumo.nome}
        </Texto>
      ) : null}

      {mostrarTreino && numeros.length > 0 ? (
      <View style={{ flexDirection: 'row', gap: 22 * e, marginTop: 8 * e }}>
        {numeros.map(([n, r, cor]) => (
          <View key={r} style={{ alignItems: 'center' }}>
            <Texto variante="numero" cor={cor ?? Cores.branco} numberOfLines={1} style={[{ fontSize: 30 * e, lineHeight: 32 * e }, sombra]}>
              {n}
            </Texto>
            <Texto variante="legenda" cor={cinzaSelo} style={[{ fontSize: 12 * e, lineHeight: 16 * e }, sombra]}>
              {r}
            </Texto>
          </View>
        ))}
      </View>
      ) : null}

      {mostrarTreino && musculacao && resumo.melhorSerie ? (
        <Texto variante="legenda" cor={cinzaSelo} numberOfLines={1} style={[{ fontSize: 13 * e, lineHeight: 18 * e, marginTop: 2 * e }, sombra]}>
          Melhor série: {resumo.melhorSerie.exercicio.toLowerCase()} · {resumo.melhorSerie.kg.toLocaleString('pt-BR')} kg ×{' '}
          {resumo.melhorSerie.reps}
        </Texto>
      ) : null}
      {mostrarTreino && !musculacao && resumo.observacao ? (
        <Texto variante="corpo" cor={cinzaSelo} numberOfLines={5} style={[{ fontSize: 14 * e, lineHeight: 20 * e, textAlign: 'center' }, sombra]}>
          {mostrarTempo ? resumo.observacao : semTempos(resumo.observacao)}
        </Texto>
      ) : null}

      <View style={{ borderColor: Cores.verde, borderWidth: 1.5 * e, borderRadius: 99, paddingHorizontal: 12 * e, paddingVertical: 4 * e, marginTop: 6 * e }}>
        <Texto variante="subtitulo" cor={Cores.branco} style={[{ fontSize: 14 * e, lineHeight: 18 * e, letterSpacing: 1 }, sombra]}>
          {info.nome}
        </Texto>
      </View>
      {tipo !== 'adesivo' ? (
        <Texto variante="legenda" cor={cinzaSelo} style={[{ fontSize: 12 * e, lineHeight: 16 * e, marginTop: 2 * e }, sombra]}>
          Fit One Manaus · Vila da Prata
        </Texto>
      ) : null}
    </View>
  );

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

      <View style={estilos.opcoes}>
        {(
          [
            ['Mostrar o tempo', mostrarTempo, () => setMostrarTempo((m) => !m)],
            ['Mostrar o treino', mostrarTreino, () => setMostrarTreino((m) => !m)],
          ] as const
        ).map(([texto, ligado, trocar]) => (
          <Pressable key={texto} onPress={trocar} style={estilos.opcaoTempo} hitSlop={6}>
            <View style={[estilos.caixinha, ligado && { backgroundColor: Cores.verde, borderColor: Cores.verde }]}>
              {ligado ? (
                <Texto variante="legenda" cor={Cores.preto} style={{ fontFamily: 'Archivo_700Bold' }}>
                  ✓
                </Texto>
              ) : null}
            </View>
            <Texto variante="corpo">{texto}</Texto>
          </Pressable>
        ))}
      </View>

      <View style={estilos.palco} onLayout={aoMedirPalco}>
        {largura > 0 ? (
          <View
            style={[
              { width: largura, height: altura, borderRadius: 18 * e, overflow: 'hidden' },
              tipo === 'adesivo' && estilos.xadrez,
              tipo === 'card' && { borderWidth: 1, borderColor: Cores.borda }, // só na tela, não sai na imagem
            ]}>
            <View ref={alvo} collapsable={false} style={{ width: largura, height: altura, backgroundColor: tipo === 'card' ? Cores.fundo : 'transparent' }}>
              {comFoto ? <Image source={{ uri: foto! }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}

              <Animated.View
                {...(mexe ? arrastar.panHandlers : {})}
                style={{
                  position: 'absolute',
                  left: (largura - selo.w) / 2,
                  top: (altura - selo.h) / 2,
                  opacity: selo.h ? 1 : 0, // só aparece depois de medido
                  transform: mexe
                    ? [{ translateX: pos.x }, { translateY: pos.y }, { scale: Animated.multiply(escala, base) }]
                    : [{ scale: base }],
                }}>
                {conteudoSelo}
              </Animated.View>
            </View>
          </View>
        ) : null}
      </View>

      <View style={estilos.rodape}>
        {mexe ? (
          <View style={estilos.ajustes}>
            <Pressable
              hitSlop={8}
              style={estilos.ajuste}
              onPress={() => {
                Haptics.selectionAsync();
                aplicar(atual.current.x, atual.current.y, atual.current.s - 0.1);
              }}>
              <Texto variante="subtitulo">−</Texto>
            </Pressable>
            <Texto variante="legenda" style={{ flex: 1, textAlign: 'center' }}>
              Arraste o selo · dois dedos para aumentar
            </Texto>
            <Pressable
              hitSlop={8}
              style={estilos.ajuste}
              onPress={() => {
                Haptics.selectionAsync();
                aplicar(atual.current.x, atual.current.y, atual.current.s + 0.1);
              }}>
              <Texto variante="subtitulo">+</Texto>
            </Pressable>
            {tipo === 'foto' ? (
              <Pressable
                hitSlop={8}
                style={[estilos.ajuste, { width: 'auto', paddingHorizontal: 12 }, fundoSelo && { backgroundColor: Cores.verde, borderColor: Cores.verde }]}
                onPress={() => setFundoSelo((f) => !f)}>
                <Texto variante="legenda" cor={fundoSelo ? Cores.preto : Cores.texto}>
                  Fundo
                </Texto>
              </Pressable>
            ) : null}
            <Pressable hitSlop={8} style={[estilos.ajuste, { width: 'auto', paddingHorizontal: 12 }]} onPress={() => posicaoInicial(tipo, altura, base)}>
              <Texto variante="legenda" cor={Cores.texto}>
                Voltar
              </Texto>
            </Pressable>
          </View>
        ) : (
          <Texto variante="legenda" style={{ textAlign: 'center' }}>
            Sai só o selo, sem fundo: cole por cima da sua foto no Instagram e ajuste lá.
          </Texto>
        )}
        <Botao titulo={gerando ? 'Gerando...' : 'Compartilhar'} disabled={gerando} onPress={compartilhar} />
        {tipo === 'foto' ? (
          <Pressable onPress={escolherFoto} style={{ alignSelf: 'center' }} hitSlop={8}>
            <Texto variante="corpo" cor={Cores.textoSecundario}>
              Trocar foto
            </Texto>
          </Pressable>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  seletor: { flexDirection: 'row', backgroundColor: Cores.superficie, borderRadius: 12, padding: 4, gap: 4, marginHorizontal: Espaco.lg },
  opcao: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', columnGap: Espaco.lg, marginHorizontal: Espaco.lg, marginTop: Espaco.sm },
  opcaoTempo: { flexDirection: 'row', alignItems: 'center', gap: Espaco.sm, minHeight: 36 },
  caixinha: { width: 24, height: 24, borderRadius: 6, borderWidth: 1.5, borderColor: Cores.borda, alignItems: 'center', justifyContent: 'center' },
  palco: { flex: 1, alignItems: 'center', justifyContent: 'center', margin: Espaco.md },
  xadrez: { backgroundColor: '#2b2d2b', borderWidth: 1, borderColor: Cores.borda, borderStyle: 'dashed', borderRadius: Raio.lg },
  rodape: { paddingHorizontal: Espaco.lg, gap: Espaco.sm, paddingBottom: Espaco.xs },
  ajustes: { flexDirection: 'row', alignItems: 'center', gap: Espaco.sm },
  ajuste: {
    width: 44,
    height: 40,
    borderRadius: Raio.md,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
