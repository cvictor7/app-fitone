import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { resumoTreino, rotaComecar, textoKg, textoQuando, textoReps, useDadosAluno } from '@/lib/dados';
import { infoModalidade } from '@/constants/theme';

// Prévia do treino antes de começar: o que o personal prescreveu, na ordem.
// O "Começar" abre o modo treino (Etapa 8).

export default function PreviaTreino() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const dados = useDadosAluno();
  const treino = dados.plano?.treinos.find((t) => t.id === id);

  if (dados.carregando) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo />
        <ActivityIndicator color={Cores.verde} style={{ marginTop: Espaco.xxl }} />
      </SafeAreaView>
    );
  }

  if (!treino) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo />
        <Texto variante="corpo" style={{ padding: Espaco.lg }}>
          Treino não encontrado.
        </Texto>
      </SafeAreaView>
    );
  }

  const totalSeries = treino.exercicios.reduce((t, e) => t + e.series, 0);
  const info = infoModalidade(treino.modalidade);
  const ehMusculacao = treino.modalidade === 'musculacao';

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo />

      <ScrollView contentContainerStyle={estilos.conteudo} showsVerticalScrollIndicator={false}>
        <View style={estilos.cabecalho}>
          <Texto variante="display" cor={info.cor} style={estilos.letra}>
            {treino.letra}
          </Texto>
          <View style={{ flex: 1, gap: 4 }}>
            <Texto variante="subtitulo">{treino.nome}</Texto>
            <Texto variante="legenda">
              {ehMusculacao ? `${treino.exercicios.length} exercícios · ${totalSeries} séries` : resumoTreino(treino, info.nome)}
            </Texto>
            <Texto variante="legenda">
              Por {dados.plano?.personalNome} · último: {textoQuando(treino.ultimaVez)}
            </Texto>
          </View>
        </View>

        {dados.plano?.observacao ? (
          <View style={estilos.recado}>
            <Texto variante="rotulo" cor={Cores.verde}>
              RECADO DO PERSONAL
            </Texto>
            <Texto variante="corpo">{dados.plano.observacao}</Texto>
          </View>
        ) : null}

        {!ehMusculacao ? (
          <View style={[estilos.recado, { borderLeftColor: info.cor }]}>
            <Texto variante="rotulo" cor={info.cor}>
              O QUE FAZER
            </Texto>
            <Texto variante="corpo">{treino.descricao || 'Sem descrição.'}</Texto>
          </View>
        ) : null}

        {ehMusculacao ? (
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
                  {e.series} × {textoReps(e)} · {textoKg(e.cargaSugeridaKg)} · descanso {e.descansoS} s
                </Texto>
                {e.observacao ? (
                  <Texto variante="legenda" cor={Cores.verde}>
                    {e.observacao}
                  </Texto>
                ) : null}
              </View>
            </View>
          ))}
        </View>
        ) : null}
      </ScrollView>

      <View style={estilos.rodape}>
        <Botao
          titulo={`Começar treino ${treino.letra}`}
          cor={info.cor}
          onPress={() => router.push(rotaComecar(treino) as any)}
        />
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { paddingHorizontal: Espaco.lg - 4, paddingBottom: Espaco.lg, gap: Espaco.lg },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md },
  letra: { fontSize: 104, lineHeight: 100 },
  recado: {
    backgroundColor: Cores.superficie,
    borderRadius: Raio.md,
    borderLeftWidth: 3,
    borderLeftColor: Cores.verde,
    padding: Espaco.md,
    gap: Espaco.xs,
  },
  lista: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, paddingHorizontal: Espaco.md },
  exercicio: { flexDirection: 'row', gap: Espaco.md, paddingVertical: Espaco.md, alignItems: 'flex-start' },
  separador: { borderTopWidth: 1, borderTopColor: Cores.borda },
  ordem: { fontSize: 26, lineHeight: 28, width: 24, textAlign: 'center' },
  rodape: {
    paddingHorizontal: Espaco.lg - 4,
    paddingVertical: Espaco.sm,
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
    backgroundColor: Cores.fundo,
  },
});
