import * as Sharing from 'expo-sharing';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState, type ComponentRef } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';

import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { Logo } from '@/components/logo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Modalidades, Raio } from '@/constants/theme';
import { buscarResumo, textoDuracao, textoVolume, type ResumoSessao } from '@/lib/sessao-resumo';

// Compartilhar o treino: vira imagem e abre o menu do celular
// (Stories, WhatsApp, salvar na galeria...). Duas versões:
// "Card" com fundo e "Adesivo" com fundo transparente, para colar em cima de uma foto no story.
// Nunca mostra peso corporal ou medidas.

export default function Compartilhar() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [resumo, setResumo] = useState<ResumoSessao | null>(null);
  const [tipo, setTipo] = useState<'card' | 'adesivo'>('card');
  const [gerando, setGerando] = useState(false);
  const alvo = useRef<ComponentRef<typeof View>>(null);

  useEffect(() => {
    buscarResumo(id).then(setResumo);
  }, [id]);

  async function compartilhar() {
    if (!alvo.current) return;
    setGerando(true);
    try {
      const uri = await captureRef(alvo as any, { format: 'png', quality: 1, result: 'tmpfile' });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Compartilhar treino', UTI: 'public.png' });
    } catch (e: any) {
      Alert.alert('Não deu para gerar a imagem', String(e?.message ?? e));
    } finally {
      setGerando(false);
    }
  }

  if (!resumo) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Compartilhar" />
        <ActivityIndicator color={Cores.verde} style={{ marginTop: 120 }} />
      </SafeAreaView>
    );
  }

  const info = Modalidades[resumo.modalidade] ?? Modalidades.livre;
  const adesivo = tipo === 'adesivo';
  const ehDivisao = !!resumo.letra; // treino A/B/C da musculação

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo="Compartilhar" />

      <View style={estilos.seletor}>
        {(['card', 'adesivo'] as const).map((t) => (
          <Pressable key={t} onPress={() => setTipo(t)} style={[estilos.opcao, tipo === t && { backgroundColor: info.cor }]}>
            <Texto variante="corpo" cor={tipo === t ? Cores.preto : Cores.textoSecundario} style={{ fontFamily: 'Archivo_600SemiBold' }}>
              {t === 'card' ? 'Card' : 'Adesivo'}
            </Texto>
          </Pressable>
        ))}
      </View>

      {/* Xadrez cinza atrás do adesivo só para mostrar que o fundo é transparente (não sai na imagem) */}
      <View style={[estilos.palco, adesivo && estilos.palcoXadrez]}>
        <View
          ref={alvo}
          collapsable={false}
          style={[estilos.card, adesivo ? estilos.cardAdesivo : estilos.cardCheio]}>
          <Logo largura={adesivo ? 86 : 96} comCidade={false} />
          {ehDivisao ? (
            <>
              <Texto variante="display" cor={info.cor} style={{ fontSize: 150, lineHeight: 140 }}>
                {resumo.letra}
              </Texto>
              <Texto variante="subtitulo" style={{ fontSize: 28, lineHeight: 30, textAlign: 'center' }}>
                {resumo.nome}
              </Texto>
            </>
          ) : (
            // Outras modalidades: nome grande na cor da modalidade e o tempo como número principal
            <>
              <Texto variante="display" cor={info.cor} style={{ fontSize: 72, lineHeight: 76, marginTop: Espaco.md }}>
                {info.nome.toUpperCase()}
              </Texto>
              <Texto variante="display" style={{ fontSize: 96, lineHeight: 98 }}>
                {textoDuracao(resumo.duracaoS)}
              </Texto>
              <Texto variante="legenda">de treino</Texto>
            </>
          )}
          <View style={estilos.numeros}>
            {ehDivisao ? (
              <View style={estilos.numero}>
                <Texto variante="numero" style={{ fontSize: 30, lineHeight: 32 }}>
                  {textoDuracao(resumo.duracaoS)}
                </Texto>
                <Texto variante="legenda">tempo</Texto>
              </View>
            ) : null}
            {resumo.volumeKg > 0 ? (
              <View style={estilos.numero}>
                <Texto variante="numero" style={{ fontSize: 30, lineHeight: 32 }}>
                  {textoVolume(resumo.volumeKg)}
                </Texto>
                <Texto variante="legenda">kg levantados</Texto>
              </View>
            ) : null}
            {resumo.recordes.length > 0 ? (
              <View style={estilos.numero}>
                <Texto variante="numero" cor={Modalidades.hyrox.cor} style={{ fontSize: 30, lineHeight: 32 }}>
                  {resumo.recordes.length}
                </Texto>
                <Texto variante="legenda">{resumo.recordes.length === 1 ? 'recorde' : 'recordes'}</Texto>
              </View>
            ) : null}
          </View>
          {ehDivisao ? (
            <View style={[estilos.selo, { backgroundColor: info.cor }]}>
              <Texto variante="subtitulo" cor={Cores.preto} style={{ fontSize: 15, letterSpacing: 1 }}>
                {info.nome}
              </Texto>
            </View>
          ) : resumo.sensacao ? (
            <View style={[estilos.selo, { backgroundColor: info.cor }]}>
              <Texto variante="subtitulo" cor={Cores.preto} style={{ fontSize: 15, letterSpacing: 1 }}>
                {['Muito leve', 'Leve', 'Na medida', 'Pesado', 'No limite'][resumo.sensacao - 1]}
              </Texto>
            </View>
          ) : null}
          {!adesivo ? (
            <Texto variante="legenda" style={{ marginTop: Espaco.sm }}>
              Fit One Manaus · Vila da Prata
            </Texto>
          ) : null}
        </View>
      </View>

      <View style={estilos.rodape}>
        <Botao titulo={gerando ? 'Gerando...' : 'Compartilhar'} cor={info.cor} disabled={gerando} onPress={compartilhar} />
        <Texto variante="legenda" style={{ textAlign: 'center' }}>
          Abre o menu do celular: Stories, WhatsApp, salvar imagem...
        </Texto>
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  seletor: {
    flexDirection: 'row',
    backgroundColor: Cores.superficie,
    borderRadius: 12,
    padding: 4,
    gap: 4,
    marginHorizontal: Espaco.lg,
  },
  opcao: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 9 },
  palco: { flex: 1, alignItems: 'center', justifyContent: 'center', margin: Espaco.lg, borderRadius: Raio.lg },
  palcoXadrez: { backgroundColor: '#2b2d2b', borderWidth: 1, borderColor: Cores.borda, borderStyle: 'dashed' },
  card: { alignItems: 'center', gap: 6, paddingHorizontal: Espaco.lg, paddingVertical: Espaco.xl },
  cardCheio: {
    width: '100%',
    flex: 1,
    justifyContent: 'center',
    backgroundColor: Cores.fundo,
    borderRadius: Raio.lg,
    borderWidth: 1.5,
    borderColor: Cores.borda,
  },
  cardAdesivo: { backgroundColor: 'transparent' },
  numeros: { flexDirection: 'row', gap: Espaco.lg, marginVertical: Espaco.sm },
  numero: { alignItems: 'center' },
  selo: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 99 },
  rodape: { paddingHorizontal: Espaco.lg, gap: Espaco.sm, paddingBottom: Espaco.xs },
});
