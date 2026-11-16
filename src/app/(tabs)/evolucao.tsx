import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { textoKg, textoQuando, useDadosAluno } from '@/lib/dados';

// Aba "Evolução". Gráficos por exercício entram na Etapa 11.

export default function Evolucao() {
  const { recordes, carregando } = useDadosAluno();
  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Texto variante="titulo" style={{ paddingTop: Espaco.sm }}>
          Evolução
        </Texto>

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">ÚLTIMOS RECORDES</Texto>
          {!carregando && recordes.length === 0 ? (
            <View style={[estilos.lista, { padding: Espaco.md }]}>
              <Texto variante="corpo">Nenhum recorde ainda.</Texto>
              <Texto variante="legenda">Termine um treino de musculação e eles aparecem aqui.</Texto>
            </View>
          ) : null}
          <View style={estilos.lista}>
            {recordes.map((r, i) => (
              <View key={r.exercicio + r.quando.toISOString()} style={[estilos.linha, i > 0 && estilos.separador]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Texto variante="corpo">{r.exercicio}</Texto>
                  <Texto variante="legenda">{textoQuando(r.quando)}</Texto>
                </View>
                <Texto variante="numero" cor={Cores.verde} style={{ fontSize: 30, lineHeight: 32 }}>
                  {textoKg(r.valorKg)}
                </Texto>
              </View>
            ))}
          </View>
        </View>

        <Texto variante="legenda" style={{ textAlign: 'center', color: Cores.textoApagado }}>
          Gráfico de carga por exercício chega na Etapa 11
        </Texto>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { paddingHorizontal: Espaco.lg - 4, paddingBottom: Espaco.xl, gap: Espaco.lg },
  lista: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, paddingHorizontal: Espaco.md },
  linha: { flexDirection: 'row', alignItems: 'center', paddingVertical: Espaco.md, gap: Espaco.md },
  separador: { borderTopWidth: 1, borderTopColor: Cores.borda },
});
