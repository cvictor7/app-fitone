import { Link, router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { ChipModalidade } from '@/components/chip-modalidade';
import { Logo } from '@/components/logo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, ListaModalidades, Modalidades, Raio } from '@/constants/theme';
import { RECORDES, SEMANA, TREINO_DE_HOJE, buscarTreino } from '@/dados/exemplo';

// Tela "Hoje". Dados de exemplo até o Supabase entrar (Etapa 6 troca pelos reais).
// Mostra o treino que o plano manda hoje. O app não sugere troca:
// para fazer outro, o aluno abre "Ver todos os meus treinos" (aba Treinar).

export default function Hoje() {
  const treino = buscarTreino(TREINO_DE_HOJE)!;
  const recorde = RECORDES[0];
  const treinosNaSemana = SEMANA.reduce((total, d) => total + d.feitos.length, 0);
  const diasComTreino = SEMANA.filter((d) => d.feitos.length > 0).length;

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView contentContainerStyle={estilos.conteudo} showsVerticalScrollIndicator={false}>
        <View style={estilos.topo}>
          <Logo largura={118} comCidade={false} />
          <Texto variante="legenda">Quinta, 19 nov</Texto>
        </View>

        <Texto variante="titulo">Bora, Victor</Texto>

        {/* Treino de hoje: a letra gigante é o elemento marcante, como o "1" dentro do ONE do logo */}
        <View style={estilos.treinoDia}>
          <View style={estilos.treinoTopo}>
            <View style={{ flex: 1, gap: Espaco.xs }}>
              <Texto variante="rotulo" cor={Cores.verde}>
                TREINO DE HOJE
              </Texto>
              <Texto variante="subtitulo">{treino.nome}</Texto>
              <Texto variante="legenda">
                {treino.exercicios.length} exercícios · cerca de {treino.minutos} min
              </Texto>
            </View>
            <Texto variante="display" cor={Cores.verde} style={estilos.letra}>
              {treino.letra}
            </Texto>
          </View>
          <Botao titulo="Começar treino" onPress={() => router.push(`/treino/${treino.letra}`)} />
          <Link href="/treinar" style={estilos.linkTreinos}>
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
            <Texto variante="numero">{recorde.valor.replace(' kg', '')}<Texto variante="subtitulo" style={{ textTransform: 'none' }}> kg</Texto></Texto>
            <Texto variante="legenda">
              recorde no {recorde.exercicio.toLowerCase()}, {recorde.quando}
            </Texto>
          </View>
        </View>

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">
            ESTA SEMANA · {treinosNaSemana} TREINOS EM {diasComTreino} DIAS
          </Texto>
          <View style={estilos.semana}>
            {SEMANA.map((d, i) => (
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
            ))}
          </View>
        </View>

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">POR CONTA PRÓPRIA</Texto>
          <View style={estilos.chips}>
            {ListaModalidades.filter((m) => m !== 'musculacao').map((m) => (
              <ChipModalidade key={m} modalidade={m} onPress={() => router.push(`/registro/${m}`)} />
            ))}
          </View>
        </View>
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
    paddingBottom: Espaco.xl,
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
  linkTreinos: {
    alignSelf: 'center',
    paddingVertical: Espaco.xs,
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
});
