import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, SectionList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraTopo } from '@/components/barra-topo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, ListaModalidades, Modalidades, Raio, infoModalidade, type Modalidade } from '@/constants/theme';
import { listarHistorico, type ItemHistorico } from '@/lib/historico';
import { useSessao } from '@/lib/sessao';
import { textoDuracao } from '@/lib/sessao-resumo';

// Histórico completo: todos os treinos feitos, de qualquer modalidade.
// Toca num treino para ver os detalhes e compartilhar de novo.

export default function Historico() {
  const { sessao } = useSessao();
  const [itens, setItens] = useState<ItemHistorico[] | null>(null);
  const [filtro, setFiltro] = useState<Modalidade | 'todos'>('todos');

  useFocusEffect(
    useCallback(() => {
      if (sessao) listarHistorico(sessao.user.id).then(setItens).catch(() => setItens([]));
    }, [sessao]),
  );

  const secoes = useMemo(() => {
    const lista = (itens ?? []).filter((i) => filtro === 'todos' || i.modalidade === filtro);
    const grupos = new Map<string, ItemHistorico[]>();
    for (const i of lista) {
      const chave = i.data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      grupos.set(chave, [...(grupos.get(chave) ?? []), i]);
    }
    return [...grupos.entries()].map(([titulo, data]) => ({ titulo: titulo.charAt(0).toUpperCase() + titulo.slice(1), data }));
  }, [itens, filtro]);

  const presentes = new Set((itens ?? []).map((i) => i.modalidade));
  const filtros: (Modalidade | 'todos')[] = ['todos', ...ListaModalidades.filter((m) => presentes.has(m))];

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo="Histórico" />
      <View style={estilos.filtros}>
        {filtros.map((f) => {
          const ativo = filtro === f;
          const cor = f === 'todos' ? Cores.verde : Modalidades[f].cor;
          return (
            <Pressable key={f} onPress={() => setFiltro(f)} style={[estilos.chip, ativo && { backgroundColor: cor, borderColor: cor }]}>
              <Texto variante="corpo" cor={ativo ? Cores.preto : Cores.texto} style={{ fontSize: 14 }}>
                {f === 'todos' ? `Todos ${itens?.length ?? ''}` : Modalidades[f].nome}
              </Texto>
            </Pressable>
          );
        })}
      </View>

      {itens === null ? (
        <ActivityIndicator color={Cores.verde} style={{ marginTop: Espaco.xl }} />
      ) : (
        <SectionList
          sections={secoes}
          keyExtractor={(i) => i.id}
          contentContainerStyle={estilos.lista}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Texto variante="rotulo" style={{ marginTop: Espaco.md, marginBottom: Espaco.xs }}>
              {section.titulo.toUpperCase()} · {section.data.length} {section.data.length === 1 ? 'TREINO' : 'TREINOS'}
            </Texto>
          )}
          renderItem={({ item }) => {
            const info = infoModalidade(item.modalidade);
            return (
              <Pressable
                onPress={() => router.push(`/sessao/concluido/${item.id}?ver=1`)}
                style={({ pressed }) => [estilos.linha, { borderLeftColor: info.cor }, pressed && { opacity: 0.7 }]}>
                <View style={estilos.data}>
                  <Texto variante="numero" style={{ fontSize: 26, lineHeight: 28 }}>
                    {item.data.getDate()}
                  </Texto>
                  <Texto variante="legenda" style={{ fontSize: 11 }}>
                    {item.data.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                  </Texto>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Texto variante="subtitulo" cor={info.cor} style={{ fontSize: 18 }}>
                    {item.rotulo}
                  </Texto>
                  <Texto variante="legenda" numberOfLines={1}>
                    {item.nome.toUpperCase() !== item.rotulo ? `${item.nome} · ` : ''}
                    {textoDuracao(item.duracaoS)}
                    {item.volumeKg > 0 ? ` · ${(Math.round(item.volumeKg / 100) / 10).toLocaleString('pt-BR')} t` : ''}
                  </Texto>
                </View>
                <Texto variante="legenda" cor={Cores.textoApagado}>
                  ›
                </Texto>
              </Pressable>
            );
          }}
          ListEmptyComponent={
            <Texto variante="legenda" style={{ marginTop: Espaco.lg }}>
              Nenhum treino ainda.
            </Texto>
          }
        />
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  filtros: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm, paddingHorizontal: Espaco.lg - 4 },
  chip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: Raio.pilula,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    backgroundColor: Cores.superficie,
    justifyContent: 'center',
  },
  lista: { paddingHorizontal: Espaco.lg - 4, paddingBottom: Espaco.xl, gap: Espaco.sm },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.md,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.md,
    borderLeftWidth: 4,
    padding: Espaco.md,
    marginBottom: Espaco.sm,
  },
  data: { width: 40, alignItems: 'center' },
});
