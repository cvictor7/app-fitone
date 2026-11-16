import { Link, router } from 'expo-router';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { ChipModalidade } from '@/components/chip-modalidade';
import { Logo } from '@/components/logo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, ListaModalidades, Modalidades, Raio } from '@/constants/theme';
import { META_SEMANAL, textoQuando, useDadosAluno } from '@/lib/dados';
import { useSessao } from '@/lib/sessao';

// Tela "Hoje": o treino que o plano manda hoje, a semana, a sequência e o último recorde.
// O app não sugere troca: para fazer outro, o aluno abre "Ver todos os meus treinos".

function dataDeHoje() {
  const t = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' });
  const limpo = t.replace('.', '').replace('-feira', '');
  return limpo.charAt(0).toUpperCase() + limpo.slice(1);
}

export default function Hoje() {
  const { perfil } = useSessao();
  const dados = useDadosAluno();
  const primeiroNome = perfil?.nome?.split(' ')[0] ?? '';
  const treino = dados.treinoDeHoje;
  const recorde = dados.recordes[0];
  const diasComTreino = dados.semana.filter((d) => d.feitos.length > 0).length;

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={dados.recarregar} tintColor={Cores.verde} />}>
        <View style={estilos.topo}>
          <Logo largura={118} comCidade={false} />
          <Texto variante="legenda">{dataDeHoje()}</Texto>
        </View>

        <Texto variante="titulo">Bora, {primeiroNome}</Texto>

        {dados.carregando ? (
          <View style={[estilos.treinoDia, { alignItems: 'center', paddingVertical: Espaco.xxl }]}>
            <ActivityIndicator color={Cores.verde} />
          </View>
        ) : dados.erro ? (
          <View style={estilos.treinoDia}>
            <Texto variante="corpo">Não deu para carregar seus treinos.</Texto>
            <Texto variante="legenda">{dados.erro}</Texto>
            <Botao titulo="Tentar de novo" tipo="secundario" onPress={dados.recarregar} />
          </View>
        ) : treino ? (
          // A letra gigante é o elemento marcante, como o "1" dentro do ONE do logo
          <View style={estilos.treinoDia}>
            <View style={estilos.treinoTopo}>
              <View style={{ flex: 1, gap: Espaco.xs }}>
                <Texto variante="rotulo" cor={Cores.verde}>
                  TREINO DE HOJE
                </Texto>
                <Texto variante="subtitulo">{treino.nome}</Texto>
                <Texto variante="legenda">
                  {treino.exercicios.length} exercícios · último: {textoQuando(treino.ultimaVez)}
                </Texto>
              </View>
              <Texto variante="display" cor={Cores.verde} style={estilos.letra}>
                {treino.letra}
              </Texto>
            </View>
            <Botao titulo="Começar treino" onPress={() => router.push(`/treino/${treino.id}`)} />
            <Link href="/treinar" style={estilos.linkTreinos}>
              <Texto variante="corpo" cor={Cores.textoSecundario}>
                Ver todos os meus treinos →
              </Texto>
            </Link>
          </View>
        ) : (
          <View style={estilos.treinoDia}>
            <Texto variante="rotulo" cor={Cores.verde}>
              SEM PLANO AINDA
            </Texto>
            <Texto variante="subtitulo">Seu personal ainda não montou seu treino</Texto>
            <Texto variante="legenda">Enquanto isso, dá para treinar por conta própria aqui embaixo.</Texto>
          </View>
        )}

        <View style={estilos.linhaNumeros}>
          <View style={estilos.numeroBloco}>
            <Texto variante="numero" cor={dados.sequencia > 0 ? Cores.verde : Cores.texto}>
              {dados.sequencia}
            </Texto>
            <Texto variante="legenda">
              {dados.sequencia === 1 ? 'semana' : 'semanas'} seguidas com {META_SEMANAL}+ treinos
            </Texto>
          </View>
          <View style={estilos.divisor} />
          <View style={estilos.numeroBloco}>
            {recorde ? (
              <>
                <Texto variante="numero">
                  {recorde.valorKg.toLocaleString('pt-BR')}
                  <Texto variante="subtitulo" style={{ textTransform: 'none' }}>
                    {' '}
                    kg
                  </Texto>
                </Texto>
                <Texto variante="legenda">
                  recorde no {recorde.exercicio.toLowerCase()}, {textoQuando(recorde.quando)}
                </Texto>
              </>
            ) : (
              <>
                <Texto variante="numero" cor={Cores.textoApagado}>
                  —
                </Texto>
                <Texto variante="legenda">seu primeiro recorde aparece aqui</Texto>
              </>
            )}
          </View>
        </View>

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">
            ESTA SEMANA · {dados.treinosNaSemana} {dados.treinosNaSemana === 1 ? 'TREINO' : 'TREINOS'}
            {diasComTreino > 0 && diasComTreino !== dados.treinosNaSemana ? ` EM ${diasComTreino} DIAS` : ''}
          </Texto>
          <View style={estilos.semana}>
            {dados.semana.map((d, i) => (
              <View key={i} style={estilos.diaColuna}>
                <View
                  style={[
                    estilos.dia,
                    d.feitos.length > 0 && { borderColor: Modalidades[d.feitos[0]].cor },
                    d.hoje && { borderColor: Cores.branco },
                  ]}>
                  {/* dois treinos no dia = bolinha dividida com as cores das modalidades */}
                  {d.feitos.slice(0, 3).map((m, j) => (
                    <View key={j} style={{ flex: 1, backgroundColor: Modalidades[m].cor }} />
                  ))}
                </View>
                <Texto variante="legenda" cor={d.hoje ? Cores.branco : Cores.textoApagado}>
                  {d.rotulo}
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
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { paddingHorizontal: Espaco.lg - 4, paddingBottom: Espaco.xl, gap: Espaco.lg },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Espaco.sm },
  treinoDia: {
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderLeftWidth: 4,
    borderLeftColor: Cores.verde,
    padding: Espaco.md + 4,
    gap: Espaco.md,
    overflow: 'hidden',
  },
  treinoTopo: { flexDirection: 'row', alignItems: 'flex-start' },
  letra: { fontSize: 120, lineHeight: 110, marginTop: -8, marginRight: -4 },
  linkTreinos: { alignSelf: 'center', paddingVertical: Espaco.xs },
  linhaNumeros: { flexDirection: 'row', alignItems: 'stretch' },
  numeroBloco: { flex: 1, gap: 2 },
  divisor: { width: 1, backgroundColor: Cores.borda, marginHorizontal: Espaco.md },
  semana: { flexDirection: 'row', justifyContent: 'space-between' },
  diaColuna: { alignItems: 'center', gap: 6 },
  dia: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: Cores.borda,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
});
