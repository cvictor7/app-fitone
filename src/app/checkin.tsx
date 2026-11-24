import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { fazerCheckin, tokenDoQr, traduzirErroCheckin, type ResultadoCheckin } from '@/lib/checkin';

// Check-in: aponte a câmera para o QR da recepção.
export default function Checkin() {
  const [permissao, pedir] = useCameraPermissions();
  const [estado, setEstado] = useState<'lendo' | 'enviando' | 'ok' | 'erro'>('lendo');
  const [resultado, setResultado] = useState<ResultadoCheckin | null>(null);
  const [erro, setErro] = useState('');
  const ocupado = useRef(false);

  async function aoLer({ data }: { data: string }) {
    if (ocupado.current) return;
    const token = tokenDoQr(data);
    if (!token) return; // outro QR qualquer: ignora e continua lendo
    ocupado.current = true;
    setEstado('enviando');
    try {
      const r = await fazerCheckin(token);
      setResultado(r);
      setEstado('ok');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setErro(traduzirErroCheckin(String(e?.message ?? '')));
      setEstado('erro');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }

  function tentarDeNovo() {
    ocupado.current = false;
    setErro('');
    setEstado('lendo');
  }

  if (!permissao) return <SafeAreaView style={estilos.tela} />;

  if (!permissao.granted) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Check-in" />
        <View style={{ padding: Espaco.lg, gap: Espaco.md }}>
          <Texto variante="subtitulo">Libere a câmera</Texto>
          <Texto variante="corpo" cor={Cores.textoSecundario}>
            A câmera é usada só para ler o QR de check-in da recepção.
          </Texto>
          <Botao titulo="Liberar câmera" onPress={pedir} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo="Check-in" />
      {estado === 'ok' && resultado ? (
        <View style={estilos.centro}>
          <Texto style={{ fontSize: 80, lineHeight: 92 }}>✅</Texto>
          <Texto variante="titulo" style={{ textAlign: 'center' }}>
            {resultado.novo ? 'Check-in feito!' : 'Você já fez check-in'}
          </Texto>
          <Texto variante="corpo" cor={Cores.textoSecundario} style={{ textAlign: 'center' }}>
            {resultado.criadoEm.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {resultado.noMes}º check-in do mês
          </Texto>
          <Botao titulo="Bora treinar" onPress={() => router.replace('/')} style={{ alignSelf: 'stretch', marginTop: Espaco.lg }} />
        </View>
      ) : estado === 'erro' ? (
        <View style={estilos.centro}>
          <Texto style={{ fontSize: 64, lineHeight: 76 }}>📍</Texto>
          <Texto variante="corpo" style={{ textAlign: 'center' }}>
            {erro}
          </Texto>
          <Botao titulo="Tentar de novo" onPress={tentarDeNovo} style={{ alignSelf: 'stretch', marginTop: Espaco.lg }} />
        </View>
      ) : (
        <View style={{ flex: 1, padding: Espaco.lg, gap: Espaco.md }}>
          <View style={estilos.camera}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={estado === 'lendo' ? aoLer : undefined}
            />
            <View style={estilos.mira} pointerEvents="none" />
            {estado === 'enviando' ? (
              <View style={estilos.carregando}>
                <ActivityIndicator color={Cores.verde} size="large" />
              </View>
            ) : null}
          </View>
          <Texto variante="corpo" style={{ textAlign: 'center' }}>
            Aponte para o QR da recepção da Fit One.
          </Texto>
          <Texto variante="legenda" style={{ textAlign: 'center' }}>
            O app confere se você está na academia pela localização, só nesta hora.
          </Texto>
        </View>
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Espaco.xl, gap: Espaco.sm },
  camera: { flex: 1, borderRadius: Raio.lg, overflow: 'hidden', backgroundColor: Cores.superficie, alignItems: 'center', justifyContent: 'center' },
  mira: { width: 220, height: 220, borderRadius: 24, borderWidth: 3, borderColor: Cores.verde },
  carregando: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
});
