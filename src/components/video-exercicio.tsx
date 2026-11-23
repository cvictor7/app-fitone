import { useVideoPlayer, VideoView } from 'expo-video';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Texto } from '@/components/texto';
import { Cores, Espaco } from '@/constants/theme';

// Vídeo do exercício em tela cheia, em loop e sem som, com o "como fazer" embaixo.
type Props = {
  visivel: boolean;
  aoFechar: () => void;
  nome: string;
  url: string | null;
  instrucoes?: string | null;
};

function Player({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView player={player} style={estilos.video} contentFit="contain" nativeControls={false} />;
}

export function VideoExercicio({ visivel, aoFechar, nome, url, instrucoes }: Props) {
  return (
    <Modal visible={visivel} animationType="slide" onRequestClose={aoFechar} presentationStyle="fullScreen">
      <SafeAreaView style={estilos.tela}>
        <View style={estilos.topo}>
          <Texto variante="subtitulo" style={{ flex: 1, fontSize: 20 }} numberOfLines={1}>
            {nome}
          </Texto>
          <Pressable onPress={aoFechar} hitSlop={12}>
            <Texto variante="corpo" cor={Cores.verde}>
              Fechar
            </Texto>
          </Pressable>
        </View>
        {url && visivel ? <Player url={url} /> : <View style={estilos.video} />}
        {instrucoes ? (
          <ScrollView style={{ maxHeight: 180 }} contentContainerStyle={{ padding: Espaco.lg, gap: Espaco.xs }}>
            <Texto variante="rotulo" cor={Cores.verde}>
              COMO FAZER
            </Texto>
            <Texto variante="corpo">{instrucoes}</Texto>
          </ScrollView>
        ) : null}
      </SafeAreaView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.preto },
  topo: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md, paddingHorizontal: Espaco.lg, paddingVertical: Espaco.md },
  video: { flex: 1, backgroundColor: Cores.preto },
});
