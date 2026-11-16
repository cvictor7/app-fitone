import { router } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconeSeta } from '@/components/icones';
import { Texto } from '@/components/texto';
import { Cores, Espaco, ListaModalidades, Modalidades, Raio } from '@/constants/theme';
import { textoQuando, useDadosAluno } from '@/lib/dados';

// Aba "Treinar": os treinos do plano (qualquer um pode ser iniciado a qualquer hora)
// e "Por conta própria" com todas as modalidades, nenhuma escondida.

export default function Treinar() {
  const dados = useDadosAluno();

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={dados.recarregar} tintColor={Cores.verde} />}>
        <Texto variante="titulo" style={{ paddingTop: Espaco.sm }}>
          Treinar
        </Texto>

        <View style={{ gap: Espaco.sm }}>
          <View style={estilos.cabecalhoSecao}>
            <Texto variante="rotulo">MEUS TREINOS</Texto>
            {dados.plano && <Texto variante="legenda">por {dados.plano.personalNome}</Texto>}
          </View>

          {dados.carregando ? (
            <ActivityIndicator color={Cores.verde} style={{ paddingVertical: Espaco.xl }} />
          ) : !dados.plano ? (
            <View style={estilos.vazio}>
              <Texto variante="corpo">Seu personal ainda não montou seu treino.</Texto>
              <Texto variante="legenda">Quando ele montar, os treinos A, B, C aparecem aqui.</Texto>
            </View>
          ) : (
            dados.plano.treinos.map((t) => {
              const hoje = t.id === dados.treinoDeHoje?.id;
              return (
                <Pressable
                  key={t.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Treino ${t.letra}, ${t.nome}`}
                  onPress={() => router.push(`/treino/${t.id}`)}
                  style={({ pressed }) => [estilos.linhaTreino, hoje && estilos.linhaHoje, pressed && { opacity: 0.8 }]}>
                  <Texto variante="display" cor={hoje ? Cores.verde : Cores.texto} style={estilos.letra}>
                    {t.letra}
                  </Texto>
                  <View style={{ flex: 1, gap: 2 }}>
                    {hoje && (
                      <Texto variante="rotulo" cor={Cores.verde}>
                        HOJE
                      </Texto>
                    )}
                    <Texto variante="subtitulo" style={{ fontSize: 20 }}>
                      {t.nome}
                    </Texto>
                    <Texto variante="legenda">
                      {t.exercicios.length} exercícios · último: {textoQuando(t.ultimaVez)}
                    </Texto>
                  </View>
                  <IconeSeta cor={Cores.textoApagado} />
                </Pressable>
              );
            })
          )}
        </View>

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">POR CONTA PRÓPRIA</Texto>
          <View style={estilos.grade}>
            {ListaModalidades.filter((m) => m !== 'musculacao').map((m) => {
              const { nome, cor } = Modalidades[m];
              return (
                <Pressable
                  key={m}
                  accessibilityRole="button"
                  onPress={() => router.push(`/registro/${m}`)}
                  style={({ pressed }) => [estilos.bloco, pressed && { backgroundColor: Cores.superficieAlta }]}>
                  <View style={[estilos.faixaCor, { backgroundColor: cor }]} />
                  <Texto variante="subtitulo" style={{ fontSize: 22 }}>
                    {nome}
                  </Texto>
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { paddingHorizontal: Espaco.lg - 4, paddingBottom: Espaco.xl, gap: Espaco.lg },
  cabecalhoSecao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  vazio: { backgroundColor: Cores.superficie, borderRadius: Raio.md, padding: Espaco.md, gap: Espaco.xs },
  linhaTreino: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.md,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.md,
    padding: Espaco.md,
    minHeight: 88,
  },
  linhaHoje: { borderWidth: 1.5, borderColor: Cores.verde },
  letra: { fontSize: 56, lineHeight: 58, width: 44, textAlign: 'center' },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
  bloco: {
    width: '48.5%',
    minHeight: 76,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.md,
    padding: Espaco.md,
    justifyContent: 'flex-end',
    gap: Espaco.sm,
    overflow: 'hidden',
  },
  faixaCor: { width: 28, height: 5, borderRadius: 3 },
});
