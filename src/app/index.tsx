import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { ChipModalidade } from '@/components/chip-modalidade';
import { Logo } from '@/components/logo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, ListaModalidades, Modalidades, Raio, type Modalidade } from '@/constants/theme';

// ETAPA 1 · prévia da identidade no formato da tela "Hoje".
// Todos os dados são de exemplo; os reais chegam na Etapa 6.

const SEMANA: { dia: string; feito?: Modalidade; hoje?: boolean }[] = [
  { dia: 'S', feito: 'musculacao' },
  { dia: 'T', feito: 'hybrid' },
  { dia: 'Q', feito: 'musculacao' },
  { dia: 'Q', hoje: true },
  { dia: 'S' },
  { dia: 'S' },
  { dia: 'D' },
];

export default function Hoje() {
  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView contentContainerStyle={estilos.conteudo} showsVerticalScrollIndicator={false}>
        <View style={estilos.topo}>
          <Logo largura={118} comCidade={false} />
          <Texto variante="legenda">Quinta, 19 nov</Texto>
        </View>

        <Texto variante="titulo">Bora, Victor</Texto>

        {/* Treino do dia: a letra gigante é o elemento marcante, como o "1" dentro do ONE do logo */}
        <View style={estilos.treinoDia}>
          <View style={estilos.treinoTopo}>
            <View style={{ flex: 1, gap: Espaco.xs }}>
              <Texto variante="rotulo" cor={Cores.verde}>
                TREINO DO DIA · PRESCRITO
              </Texto>
              <Texto variante="subtitulo">Costas e bíceps</Texto>
              <Texto variante="legenda">7 exercícios · cerca de 55 min</Texto>
            </View>
            <Texto variante="display" cor={Cores.verde} style={estilos.letra}>
              B
            </Texto>
          </View>
          <Botao titulo="Começar treino" />
        </View>

        <View style={estilos.linhaNumeros}>
          <View style={estilos.numeroBloco}>
            <Texto variante="numero" cor={Cores.verde}>
              4
            </Texto>
            <Texto variante="legenda">semanas seguidas batendo a meta</Texto>
          </View>
          <View style={estilos.divisor} />
          <View style={estilos.numeroBloco}>
            <Texto variante="numero">
              82,5<Texto variante="subtitulo" style={{ textTransform: 'none' }}> kg</Texto>
            </Texto>
            <Texto variante="legenda">recorde no supino reto, terça</Texto>
          </View>
        </View>

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">ESTA SEMANA · 3 DE 4</Texto>
          <View style={estilos.semana}>
            {SEMANA.map((d, i) => {
              const cor = d.feito ? Modalidades[d.feito].cor : undefined;
              return (
                <View key={i} style={estilos.diaColuna}>
                  <View
                    style={[
                      estilos.dia,
                      cor && { backgroundColor: cor, borderColor: cor },
                      d.hoje && { borderColor: Cores.branco },
                    ]}
                  />
                  <Texto variante="legenda" cor={d.hoje ? Cores.branco : Cores.textoApagado}>
                    {d.dia}
                  </Texto>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">POR CONTA PRÓPRIA</Texto>
          <View style={estilos.chips}>
            {ListaModalidades.filter((m) => m !== 'musculacao').map((m) => (
              <ChipModalidade key={m} modalidade={m} />
            ))}
          </View>
        </View>

        <Texto variante="legenda" style={estilos.aviso}>
          Prévia da identidade · dados de exemplo
        </Texto>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: {
    flex: 1,
    backgroundColor: Cores.fundo,
  },
  conteudo: {
    paddingHorizontal: Espaco.lg - 4,
    paddingBottom: Espaco.xxl,
    gap: Espaco.lg,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Espaco.sm,
  },
  treinoDia: {
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderLeftWidth: 4,
    borderLeftColor: Cores.verde,
    padding: Espaco.md + 4,
    gap: Espaco.md,
    overflow: 'hidden',
  },
  treinoTopo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  letra: {
    fontSize: 120,
    lineHeight: 110,
    marginTop: -8,
    marginRight: -4,
  },
  linhaNumeros: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  numeroBloco: {
    flex: 1,
    gap: 2,
  },
  divisor: {
    width: 1,
    backgroundColor: Cores.borda,
    marginHorizontal: Espaco.md,
  },
  semana: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  diaColuna: {
    alignItems: 'center',
    gap: 6,
  },
  dia: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Cores.borda,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Espaco.sm,
  },
  aviso: {
    textAlign: 'center',
    color: Cores.textoApagado,
  },
});
