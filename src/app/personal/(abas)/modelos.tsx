import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { listarAlunos, listarModelos, usarModeloEmAluno } from '@/lib/personal';

// Personal · Modelos: planos prontos para montar o treino de um aluno em 1 minuto.

type Modelo = Awaited<ReturnType<typeof listarModelos>>[number];

export default function Modelos() {
  const [modelos, setModelos] = useState<Modelo[] | null>(null);

  const carregar = useCallback(async () => {
    try {
      setModelos(await listarModelos());
    } catch {
      setModelos([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  async function usar(m: Modelo) {
    const alunos = await listarAlunos();
    if (alunos.length === 0) {
      Alert.alert('Nenhum aluno ainda', 'Convide um aluno na aba Alunos.');
      return;
    }
    // Lista curta no próprio alerta; com muitos alunos, o caminho é pela ficha do aluno
    Alert.alert(`Usar "${m.nome}" em qual aluno?`, 'O plano ativo dele fica guardado no histórico.', [
      ...alunos.slice(0, 7).map((a) => ({
        text: a.nome,
        onPress: async () => {
          try {
            const novo = await usarModeloEmAluno(m.id, a.id);
            router.push(`/personal/plano/${novo}`);
          } catch (e: any) {
            Alert.alert('Não deu certo', e.message);
          }
        },
      })),
      { text: 'Cancelar', style: 'cancel' as const },
    ]);
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        refreshControl={<RefreshControl refreshing={false} onRefresh={carregar} tintColor={Cores.verde} />}>
        <View style={estilos.topo}>
          <Texto variante="titulo">Modelos</Texto>
          <Pressable onPress={() => router.push('/personal/plano/modelo')} style={estilos.pilula}>
            <Texto variante="subtitulo" cor={Cores.preto} style={{ fontSize: 16 }}>
              + Novo
            </Texto>
          </Pressable>
        </View>
        <Texto variante="legenda">Planos prontos para montar o treino de um aluno em 1 minuto.</Texto>

        {modelos === null ? (
          <ActivityIndicator color={Cores.verde} style={{ paddingVertical: Espaco.xl }} />
        ) : modelos.length === 0 ? (
          <View style={estilos.cartao}>
            <Texto variante="corpo">Nenhum modelo ainda.</Texto>
            <Texto variante="legenda">Crie um "Hipertrofia ABC" uma vez e use em vários alunos, ajustando só a carga.</Texto>
          </View>
        ) : (
          modelos.map((m) => (
            <View key={m.id} style={estilos.cartao}>
              <Texto variante="subtitulo">{m.nome}</Texto>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {m.letras.map((l) => (
                  <View key={l} style={estilos.letra}>
                    <Texto variante="legenda">{l}</Texto>
                  </View>
                ))}
              </View>
              <Texto variante="legenda">{m.exercicios} exercícios</Texto>
              <View style={{ flexDirection: 'row', gap: Espaco.sm }}>
                <Botao titulo="Usar em aluno" style={{ flex: 1, minHeight: 50 }} onPress={() => usar(m)} />
                <Botao titulo="Editar" tipo="secundario" style={{ flex: 1, minHeight: 50 }} onPress={() => router.push(`/personal/plano/${m.id}`)} />
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { paddingHorizontal: Espaco.lg - 4, paddingBottom: Espaco.xl, gap: Espaco.md },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Espaco.sm },
  pilula: { backgroundColor: Cores.verde, borderRadius: Raio.pilula, paddingHorizontal: 14, paddingVertical: 8 },
  cartao: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, padding: Espaco.md, gap: Espaco.sm },
  letra: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1.5, borderColor: Cores.borda },
});
