import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { IconeVoltar } from '@/components/icones';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { PERSONAL, buscarTreino, textoCarga, textoReps } from '@/dados/exemplo';

// Prévia do treino antes de começar: o que o personal prescreveu, na ordem.
// O "Começar" abre o modo treino (Etapa 8).

export default function PreviaTreino() {
  const { letra } = useLocalSearchParams<{ letra: string }>();
  const treino = buscarTreino(letra ?? '');

  if (!treino) {
    return (
      <SafeAreaView style={estilos.tela}>
        <Texto variante="corpo" style={{ padding: Espaco.lg }}>
          Treino não encontrado.
        </Texto>
      </SafeAreaView>
    );
  }

  const totalSeries = treino.exercicios.reduce((t, e) => t + e.series, 0);

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <View style={estilos.barraTopo}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Voltar"
          onPress={() => router.back()}
          hitSlop={12}
          style={estilos.voltar}>
          <IconeVoltar cor={Cores.texto} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={estilos.conteudo} showsVerticalScrollIndicator={false}>
        <View style={estilos.cabecalho}>
          <Texto variante="display" cor={Cores.verde} style={estilos.letra}>
            {treino.letra}
          </Texto>
          <View style={{ flex: 1, gap: 4 }}>
            <Texto variante="subtitulo">{treino.nome}</Texto>
            <Texto variante="legenda">
              {treino.exercicios.length} exercícios · {totalSeries} séries · cerca de {treino.minutos} min
            </Texto>
            <Texto variante="legenda">Prescrito por {PERSONAL.nome}</Texto>
          </View>
        </View>

        <View style={estilos.lista}>
          {treino.exercicios.map((e, i) => (
            <View key={e.id} style={[estilos.exercicio, i > 0 && estilos.separador]}>
              <Texto variante="numero" cor={Cores.textoApagado} style={estilos.ordem}>
                {i + 1}
              </Texto>
              <View style={{ flex: 1, gap: 2 }}>
                <Texto variante="corpo" style={{ fontSize: 17 }}>
                  {e.nome}
                </Texto>
                <Texto variante="legenda">
                  {e.series} × {textoReps(e)} · {textoCarga(e.cargaSugeridaKg)} · descanso {e.descansoS} s
                </Texto>
                {e.observacao && (
                  <Texto variante="legenda" cor={Cores.verde}>
                    {e.observacao}
                  </Texto>
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={estilos.rodape}>
        <Botao
          titulo={`Começar treino ${treino.letra}`}
          onPress={() => Alert.alert('Modo treino', 'O modo treino chega na Etapa 8.')}
        />
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: Cores.fundo,
  },
  barraTopo: {
    paddingHorizontal: Espaco.md,
    paddingVertical: Espaco.sm,
  },
  voltar: {
    width: 44,
    height: 44,
    justifyContent: 'center',
  },
  conteudo: {
    paddingHorizontal: Espaco.lg - 4,
    paddingBottom: Espaco.lg,
    gap: Espaco.lg,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.md,
  },
  letra: {
    fontSize: 104,
    lineHeight: 100,
  },
  lista: {
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    paddingHorizontal: Espaco.md,
  },
  exercicio: {
    flexDirection: 'row',
    gap: Espaco.md,
    paddingVertical: Espaco.md,
    alignItems: 'flex-start',
  },
  separador: {
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
  },
  ordem: {
    fontSize: 26,
    lineHeight: 28,
    width: 24,
    textAlign: 'center',
  },
  rodape: {
    paddingHorizontal: Espaco.lg - 4,
    paddingTop: Espaco.sm,
    paddingBottom: Espaco.sm,
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
    backgroundColor: Cores.fundo,
  },
});
