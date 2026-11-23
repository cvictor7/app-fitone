import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Fontes, Raio } from '@/constants/theme';
import {
  atualizarExercicioDaAcademia,
  criarExercicio,
  enviarVideo,
  listarExercicios,
  removerVideo,
  salvarInstrucoes,
} from '@/lib/personal';
import { useSessao } from '@/lib/sessao';

// Personal · exercício: vídeo (gravar ou escolher), "como fazer" e dados.
// Exercícios do catálogo geral: nome e grupo fixos; vídeo e "como fazer" são da Fit One.

function Previa({ url }: { url: string }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });
  return <VideoView player={player} style={estilos.videoPrevia} contentFit="cover" nativeControls={false} />;
}

export default function EditarExercicio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { gymId, sessao } = useSessao();
  const novo = id === 'novo';
  const [carregando, setCarregando] = useState(!novo);
  const [daAcademia, setDaAcademia] = useState(true);
  const [nome, setNome] = useState('');
  const [grupo, setGrupo] = useState('');
  const [equipamento, setEquipamento] = useState('');
  const [instrucoes, setInstrucoes] = useState('');
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (novo || !gymId) return;
    listarExercicios(gymId).then((lista) => {
      const e = lista.find((x) => x.id === id);
      if (e) {
        setDaAcademia(e.daAcademia);
        setNome(e.nome);
        setGrupo(e.grupo);
        setEquipamento(e.equipamento ?? '');
        setInstrucoes(e.instrucoes ?? '');
        setVideoUrl(e.videoUrl);
      }
      setCarregando(false);
    });
  }, [id, novo, gymId]);

  async function escolherVideo(origem: 'camera' | 'galeria') {
    if (!gymId || !sessao) return;
    if (novo) {
      Alert.alert('Salve primeiro', 'Salve o exercício e depois adicione o vídeo.');
      return;
    }
    const permissao =
      origem === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      Alert.alert('Sem permissão', origem === 'camera' ? 'Libere a câmera nos Ajustes do celular.' : 'Libere as fotos nos Ajustes do celular.');
      return;
    }
    const opcoes: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['videos'],
      videoMaxDuration: 30,
      quality: 0.6,
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      allowsEditing: true,
    };
    const r = origem === 'camera' ? await ImagePicker.launchCameraAsync(opcoes) : await ImagePicker.launchImageLibraryAsync(opcoes);
    if (r.canceled || !r.assets[0]) return;

    setEnviando(true);
    try {
      const url = await enviarVideo(gymId, id, sessao.user.id, r.assets[0].uri, r.assets[0].mimeType ?? 'video/mp4');
      setVideoUrl(url);
    } catch (e: any) {
      Alert.alert('Não deu para enviar o vídeo', e.message);
    } finally {
      setEnviando(false);
    }
  }

  function tirarVideo() {
    if (!gymId) return;
    Alert.alert('Tirar o vídeo?', 'Os alunos deixam de ver o vídeo desse exercício.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Tirar',
        style: 'destructive',
        onPress: async () => {
          try {
            await removerVideo(gymId, id);
            setVideoUrl(null);
          } catch (e: any) {
            Alert.alert('Não deu certo', e.message);
          }
        },
      },
    ]);
  }

  async function salvar() {
    if (!gymId || !sessao) return;
    if (!nome.trim() || !grupo.trim()) {
      Alert.alert('Faltou informação', 'Preencha o nome e o grupo muscular.');
      return;
    }
    setSalvando(true);
    try {
      let exercicioId = id;
      if (novo) exercicioId = await criarExercicio(gymId, sessao.user.id, nome, grupo, equipamento);
      else if (daAcademia) await atualizarExercicioDaAcademia(id, nome, grupo, equipamento);
      await salvarInstrucoes(gymId, exercicioId, sessao.user.id, instrucoes);
      if (novo) {
        router.replace(`/personal/exercicio/${exercicioId}`);
        Alert.alert('Exercício criado', 'Agora você pode gravar o vídeo.');
      } else {
        Alert.alert('Salvo');
      }
    } catch (e: any) {
      Alert.alert('Não deu para salvar', e.message);
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Exercício" />
        <ActivityIndicator color={Cores.verde} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const podeEditarDados = novo || daAcademia;

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo
        titulo={novo ? 'Novo exercício' : 'Exercício'}
        direita={
          <Pressable onPress={salvar} disabled={salvando} hitSlop={10}>
            <Texto variante="corpo" cor={Cores.verde} style={{ fontFamily: Fontes.textoSemi }}>
              {salvando ? '...' : 'Salvar'}
            </Texto>
          </Pressable>
        }
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          {/* Vídeo */}
          <View style={estilos.caixaVideo}>
            {enviando ? (
              <View style={{ alignItems: 'center', gap: Espaco.sm }}>
                <ActivityIndicator color={Cores.verde} />
                <Texto variante="legenda">Enviando vídeo...</Texto>
              </View>
            ) : videoUrl ? (
              <Previa url={videoUrl} />
            ) : (
              <View style={{ alignItems: 'center', gap: 6, padding: Espaco.lg }}>
                <Texto variante="titulo" cor={Cores.textoApagado}>
                  ＋
                </Texto>
                <Texto variante="corpo" style={{ fontFamily: Fontes.textoSemi }}>
                  Sem vídeo ainda
                </Texto>
                <Texto variante="legenda" style={{ textAlign: 'center' }}>
                  Vertical, 10 a 30 s, sem som. Aparece no modo treino do aluno.
                </Texto>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: Espaco.sm }}>
            <Botao titulo="Gravar" tipo="secundario" style={{ flex: 1, minHeight: 50 }} disabled={enviando} onPress={() => escolherVideo('camera')} />
            <Botao titulo="Da galeria" tipo="secundario" style={{ flex: 1, minHeight: 50 }} disabled={enviando} onPress={() => escolherVideo('galeria')} />
          </View>
          {videoUrl ? (
            <Pressable onPress={tirarVideo} style={{ alignSelf: 'center' }} hitSlop={8}>
              <Texto variante="legenda" cor={Cores.perigo}>
                Tirar o vídeo
              </Texto>
            </Pressable>
          ) : null}

          {/* Dados */}
          <View style={{ gap: 4 }}>
            <Texto variante="rotulo">NOME</Texto>
            <Campo value={nome} onChangeText={setNome} editable={podeEditarDados} style={[{ fontSize: 16 }, !podeEditarDados && estilos.travado]} />
          </View>
          <View style={{ flexDirection: 'row', gap: Espaco.sm }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Texto variante="rotulo">GRUPO</Texto>
              <Campo value={grupo} onChangeText={setGrupo} placeholder="Costas" editable={podeEditarDados} style={[{ fontSize: 16 }, !podeEditarDados && estilos.travado]} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Texto variante="rotulo">EQUIPAMENTO</Texto>
              <Campo value={equipamento} onChangeText={setEquipamento} placeholder="Polia" editable={podeEditarDados} style={[{ fontSize: 16 }, !podeEditarDados && estilos.travado]} />
            </View>
          </View>
          <View style={{ gap: 4 }}>
            <Texto variante="rotulo">COMO FAZER (APARECE PARA O ALUNO)</Texto>
            <Campo
              value={instrucoes}
              onChangeText={setInstrucoes}
              placeholder="Ex.: coluna reta, puxa até o umbigo e segura 1 segundo."
              multiline
              style={{ minHeight: 110, fontSize: 15, paddingVertical: 12, textAlignVertical: 'top' }}
            />
          </View>
          {!podeEditarDados ? (
            <Texto variante="legenda">Exercício do catálogo geral: nome e grupo são fixos. Vídeo e "como fazer" são da Fit One.</Texto>
          ) : null}
          <Botao titulo={salvando ? 'Salvando...' : 'Salvar'} onPress={salvar} disabled={salvando} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { paddingHorizontal: Espaco.lg - 4, paddingBottom: Espaco.xl, gap: Espaco.md },
  caixaVideo: {
    height: 300,
    borderRadius: Raio.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Cores.borda,
    backgroundColor: Cores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  videoPrevia: { width: '100%', height: '100%' },
  travado: { opacity: 0.6 },
});
