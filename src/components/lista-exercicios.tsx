import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import type { ExercicioAtivo } from '@/lib/treino-ativo';

// Lista do treino inteiro (igual ao Prime): nome, séries feitas e ✓. Toca e vai direto.
type Props = {
  visivel: boolean;
  exercicios: ExercicioAtivo[];
  atual: number;
  aoFechar: () => void;
  aoEscolher: (i: number) => void;
};

export function ListaExercicios({ visivel, exercicios, atual, aoFechar, aoEscolher }: Props) {
  return (
    <Modal visible={visivel} animationType="slide" presentationStyle="pageSheet" onRequestClose={aoFechar}>
      <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
        <View style={estilos.topo}>
          <Texto variante="subtitulo" style={{ fontSize: 22 }}>
            Exercícios do treino
          </Texto>
          <Pressable onPress={aoFechar} hitSlop={12}>
            <Texto variante="corpo" cor={Cores.verde}>
              Fechar
            </Texto>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={estilos.lista}>
          {exercicios.map((e, i) => {
            const feitas = e.series.filter((s) => s.feita).length;
            const completo = e.series.length > 0 && feitas === e.series.length;
            const ehAtual = i === atual;
            return (
              <Pressable
                key={e.treinoExercicioId}
                onPress={() => {
                  aoEscolher(i);
                  aoFechar();
                }}
                style={({ pressed }) => [estilos.linha, ehAtual && estilos.linhaAtual, pressed && { opacity: 0.7 }]}>
                <View style={[estilos.numero, completo && estilos.numeroFeito, ehAtual && estilos.numeroAtual]}>
                  <Texto variante="subtitulo" cor={ehAtual ? Cores.preto : completo ? Cores.verde : Cores.textoSecundario} style={{ fontSize: 18 }}>
                    {completo && !ehAtual ? '✓' : i + 1}
                  </Texto>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Texto variante="corpo" cor={completo && !ehAtual ? Cores.textoSecundario : Cores.texto}>
                    {e.nome}
                  </Texto>
                  <Texto variante="legenda">
                    {e.grupo} · {feitas} de {e.series.length} séries
                    {ehAtual ? ' · agora' : ''}
                  </Texto>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Espaco.lg },
  lista: { paddingHorizontal: Espaco.md, paddingBottom: Espaco.xl, gap: Espaco.sm },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.md,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.md,
    padding: Espaco.md,
    minHeight: 68,
  },
  linhaAtual: { borderWidth: 1.5, borderColor: Cores.verde },
  numero: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numeroFeito: { backgroundColor: '#1d2b10', borderColor: '#2c4a12' },
  numeroAtual: { backgroundColor: Cores.verde, borderColor: Cores.verde },
});
