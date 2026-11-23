import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Campo } from '@/components/campo';
import { IconeSeta } from '@/components/icones';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { listarExercicios, type ExercicioBiblioteca } from '@/lib/personal';
import { useSessao } from '@/lib/sessao';

// Personal · biblioteca de exercícios. ▶ = já tem vídeo; ＋ = falta gravar.

export default function Exercicios() {
  const { gymId } = useSessao();
  const [todos, setTodos] = useState<ExercicioBiblioteca[] | null>(null);
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState<string>('Todos');

  useFocusEffect(
    useCallback(() => {
      if (gymId) listarExercicios(gymId).then(setTodos).catch(() => setTodos([]));
    }, [gymId]),
  );

  const lista = todos ?? [];
  const grupos = useMemo(() => [...new Set(lista.map((e) => e.grupo))].sort(), [lista]);
  const semVideo = lista.filter((e) => !e.videoUrl).length;
  const filtros = ['Todos', 'Sem vídeo', ...grupos];

  const visiveis = lista.filter((e) => {
    if (filtro === 'Sem vídeo' && e.videoUrl) return false;
    if (filtro !== 'Todos' && filtro !== 'Sem vídeo' && e.grupo !== filtro) return false;
    return e.nome.toLowerCase().includes(busca.trim().toLowerCase());
  });

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <View style={estilos.cabecalho}>
        <View style={estilos.topo}>
          <Texto variante="titulo">Exercícios</Texto>
          <Pressable onPress={() => router.push('/personal/exercicio/novo')} style={estilos.pilula}>
            <Texto variante="subtitulo" cor={Cores.preto} style={{ fontSize: 16 }}>
              + Novo
            </Texto>
          </Pressable>
        </View>
        <Campo value={busca} onChangeText={setBusca} placeholder="Buscar exercício" style={{ minHeight: 48, fontSize: 16 }} />
        <FlatList
          horizontal
          data={filtros}
          keyExtractor={(f) => f}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: Espaco.sm }}
          style={{ flexGrow: 0 }}
          renderItem={({ item }) => {
            const ativo = filtro === item;
            return (
              <Pressable onPress={() => setFiltro(item)} style={[estilos.chip, ativo && estilos.chipAtivo]}>
                <Texto variante="corpo" cor={ativo ? Cores.preto : Cores.texto} style={{ fontSize: 14 }}>
                  {item}
                  {item === 'Todos' ? ` ${lista.length}` : item === 'Sem vídeo' ? ` ${semVideo}` : ''}
                </Texto>
              </Pressable>
            );
          }}
        />
      </View>

      {todos === null ? (
        <ActivityIndicator color={Cores.verde} style={{ marginTop: Espaco.xl }} />
      ) : (
        <FlatList
          data={visiveis}
          keyExtractor={(e) => e.id}
          contentContainerStyle={estilos.lista}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item, index }) => (
            <Pressable
              onPress={() => router.push(`/personal/exercicio/${item.id}`)}
              style={({ pressed }) => [estilos.linha, index > 0 && estilos.separador, pressed && { opacity: 0.7 }]}>
              <View style={[estilos.video, !item.videoUrl && estilos.semVideo]}>
                <Texto variante="legenda" cor={item.videoUrl ? Cores.preto : Cores.textoApagado}>
                  {item.videoUrl ? '▶' : '＋'}
                </Texto>
              </View>
              <View style={{ flex: 1 }}>
                <Texto variante="corpo">{item.nome}</Texto>
                <Texto variante="legenda">
                  {item.grupo}
                  {item.equipamento ? ` · ${item.equipamento}` : ''}
                  {item.daAcademia ? ' · da Fit One' : ''}
                </Texto>
              </View>
              <IconeSeta cor={Cores.textoApagado} />
            </Pressable>
          )}
          ListFooterComponent={<Texto variante="legenda" style={{ paddingVertical: Espaco.md }}>▶ = já tem vídeo · ＋ = falta gravar</Texto>}
        />
      )}
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  cabecalho: { paddingHorizontal: Espaco.lg - 4, gap: Espaco.md, paddingBottom: Espaco.sm },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Espaco.sm },
  pilula: { backgroundColor: Cores.verde, borderRadius: Raio.pilula, paddingHorizontal: 14, paddingVertical: 8 },
  chip: {
    height: 38,
    paddingHorizontal: 14,
    borderRadius: Raio.pilula,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    backgroundColor: Cores.superficie,
    justifyContent: 'center',
  },
  chipAtivo: { backgroundColor: Cores.verde, borderColor: Cores.verde },
  lista: { marginHorizontal: Espaco.lg - 4, paddingHorizontal: Espaco.md, backgroundColor: Cores.superficie, borderRadius: Raio.lg },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md, minHeight: 62, paddingVertical: Espaco.sm },
  separador: { borderTopWidth: 1, borderTopColor: Cores.borda },
  video: { width: 32, height: 32, borderRadius: 8, backgroundColor: Cores.verde, alignItems: 'center', justifyContent: 'center' },
  semVideo: { backgroundColor: Cores.superficieAlta, borderWidth: 1, borderStyle: 'dashed', borderColor: Cores.borda },
});
