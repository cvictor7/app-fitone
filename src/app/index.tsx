import { Link } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { ChipModalidade } from '@/components/chip-modalidade';
import { Logo } from '@/components/logo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, ListaModalidades, Modalidades, Raio, type Modalidade } from '@/constants/theme';

// ETAPA 1 · prévia da identidade no formato da tela "Hoje".
// Todos os dados são de exemplo; os reais chegam na Etapa 6.

// Treinos do plano do aluno (o personal escolhe o nome; a letra é só a ordem da divisão)
const TREINOS = [
  { letra: 'A', nome: 'Peito, ombro e tríceps', exercicios: 8, minutos: 60 },
  { letra: 'B', nome: 'Costas e bíceps', exercicios: 7, minutos: 55 },
  { letra: 'C', nome: 'Pernas completo', exercicios: 7, minutos: 65 },
];

// Um dia pode ter mais de um treino (ex.: musculação de manhã e Hyrox à tarde)
const SEMANA: { dia: string; feitos: Modalidade[]; hoje?: boolean }[] = [
  { dia: 'S', feitos: ['musculacao'] },
  { dia: 'T', feitos: ['musculacao', 'hyrox'] },
  { dia: 'Q', feitos: ['hybrid'] },
  { dia: 'Q', feitos: [], hoje: true },
  { dia: 'S', feitos: [] },
  { dia: 'S', feitos: [] },
  { dia: 'D', feitos: [] },
];

export default function Hoje() {
  // Treino de hoje = o que está no plano para hoje. O app não sugere troca:
  // se quiser fazer outro, o aluno abre "Meus treinos" (aba Treinar, Etapa 2) e começa qualquer um.
  const treino = TREINOS[0];

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
                TREINO DE HOJE
              </Texto>
              <Texto variante="subtitulo">{treino.nome}</Texto>
              <Texto variante="legenda">
                {treino.exercicios} exercícios · cerca de {treino.minutos} min
              </Texto>
            </View>
            <Texto variante="display" cor={Cores.verde} style={estilos.letra}>
              {treino.letra}
            </Texto>
          </View>
          <Botao titulo="Começar treino" />
          <Link href="/" style={estilos.linkTreinos}>
            <Texto variante="corpo" cor={Cores.textoSecundario}>
              Ver todos os meus treinos →
            </Texto>
          </Link>
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
          <Texto variante="rotulo">ESTA SEMANA · 4 TREINOS EM 3 DIAS</Texto>
          <View style={estilos.semana}>
            {SEMANA.map((d, i) => {
              return (
                <View key={i} style={estilos.diaColuna}>
                  <View
                    style={[
                      estilos.dia,
                      d.feitos.length > 0 && { borderColor: Modalidades[d.feitos[0]].cor },
                      d.hoje && { borderColor: Cores.branco },
                    ]}>
                    {/* dois treinos no dia = bolinha dividida com as duas cores */}
                    {d.feitos.map((m, j) => (
                      <View key={j} style={{ flex: 1, backgroundColor: Modalidades[m].cor }} />
                    ))}
                  </View>
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
    flexDirection: 'row',
    overflow: 'hidden',
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Espaco.sm,
  },
  linkTreinos: {
    alignSelf: 'center',
    paddingVertical: Espaco.xs,
  },
  aviso: {
    textAlign: 'center',
    color: Cores.textoApagado,
  },
});
