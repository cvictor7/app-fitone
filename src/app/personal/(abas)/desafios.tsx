import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { CardDesafio } from '@/components/card-desafio';
import { Texto } from '@/components/texto';
import { Cores, Espaco } from '@/constants/theme';
import { listarDesafios, type Desafio } from '@/lib/desafios';
import { useSessao } from '@/lib/sessao';

// Personal · Desafios: cria desafios para a academia toda e acompanha quem está participando.

export default function DesafiosPersonal() {
  const { gymId } = useSessao();
  const [lista, setLista] = useState<Desafio[] | null>(null);

  const carregar = useCallback(async () => {
    if (!gymId) return;
    try {
      setLista(await listarDesafios(gymId));
    } catch {
      setLista([]);
    }
  }, [gymId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        refreshControl={<RefreshControl refreshing={false} onRefresh={carregar} tintColor={Cores.verde} />}>
        <Texto variante="titulo" style={{ paddingTop: Espaco.sm }}>
          Desafios
        </Texto>
        <Texto variante="corpo" cor={Cores.textoSecundario}>
          Valem para todos os alunos da Fit One. O app conta sozinho os treinos de quem entrar.
        </Texto>
        <Botao titulo="+ Novo desafio" onPress={() => router.push('/personal/desafio/novo')} />

        {lista === null ? (
          <ActivityIndicator color={Cores.verde} style={{ marginTop: Espaco.xl }} />
        ) : lista.length === 0 ? (
          <Texto variante="corpo" cor={Cores.textoSecundario} style={{ textAlign: 'center', marginTop: Espaco.lg }}>
            Nenhum desafio ainda. Que tal "12 treinos em dezembro"?
          </Texto>
        ) : (
          <View style={{ gap: Espaco.md }}>
            {lista.map((d) => (
              <CardDesafio key={d.id} d={d} mostrarMeu={false} onPress={() => router.push(`/personal/desafio/${d.id}`)} />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, gap: Espaco.md, paddingBottom: Espaco.xxl },
});
