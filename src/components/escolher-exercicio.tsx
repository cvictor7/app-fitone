import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Campo } from '@/components/campo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { listarExercicios, type ExercicioBiblioteca } from '@/lib/personal';

// Biblioteca para escolher exercícios (vários de uma vez) ao montar o treino.
type Props = {
  visivel: boolean;
  gymId: string;
  aoFechar: () => void;
  aoEscolher: (lista: ExercicioBiblioteca[]) => void;
};

export function EscolherExercicio({ visivel, gymId, aoFechar, aoEscolher }: Props) {
  const [todos, setTodos] = useState<ExercicioBiblioteca[] | null>(null);
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState<string | null>(null);
  const [marcados, setMarcados] = useState<ExercicioBiblioteca[]>([]);

  useEffect(() => {
    if (!visivel) return;
    setMarcados([]);
    setBusca('');
    listarExercicios(gymId).then(setTodos).catch(() => setTodos([]));
  }, [visivel, gymId]);

  const grupos = useMemo(() => [...new Set((todos ?? []).map((e) => e.grupo))].sort(), [todos]);
  const lista = (todos ?? []).filter(
    (e) => (!grupo || e.grupo === grupo) && e.nome.toLowerCase().includes(busca.trim().toLowerCase()),
  );

  function alternar(e: ExercicioBiblioteca) {
    setMarcados((m) => (m.some((x) => x.id === e.id) ? m.filter((x) => x.id !== e.id) : [...m, e]));
  }

  return (
    <Modal visible={visivel} animationType="slide" presentationStyle="pageSheet" onRequestClose={aoFechar}>
      <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
        <View style={estilos.topo}>
          <Pressable onPress={aoFechar} hitSlop={12}>
            <Texto variante="corpo" cor={Cores.textoSecundario}>
              Cancelar
            </Texto>
          </Pressable>
          <Texto variante="subtitulo" style={{ fontSize: 20 }}>
            Exercícios
          </Texto>
          <Pressable
            onPress={() => {
              aoEscolher(marcados);
              aoFechar();
            }}
            disabled={marcados.length === 0}
            hitSlop={12}>
            <Texto variante="corpo" cor={marcados.length ? Cores.verde : Cores.textoApagado}>
              Adicionar{marcados.length ? ` (${marcados.length})` : ''}
            </Texto>
          </Pressable>
        </View>

        <View style={{ paddingHorizontal: Espaco.md, gap: Espaco.sm }}>
          <Campo value={busca} onChangeText={setBusca} placeholder="Buscar exercício" style={{ minHeight: 48, fontSize: 16 }} autoFocus />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: Espaco.sm }}>
            {[null, ...grupos].map((g) => {
              const ativo = grupo === g;
              return (
                <Pressable key={g ?? 'todos'} onPress={() => setGrupo(g)} style={[estilos.chip, ativo && estilos.chipAtivo]}>
                  <Texto variante="corpo" cor={ativo ? Cores.preto : Cores.texto} style={{ fontSize: 14 }}>
                    {g ?? 'Todos'}
                  </Texto>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {todos === null ? (
          <ActivityIndicator color={Cores.verde} style={{ marginTop: Espaco.xl }} />
        ) : (
          <FlatList
            data={lista}
            keyExtractor={(e) => e.id}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: Espaco.md }}
            renderItem={({ item, index }) => {
              const marcado = marcados.some((x) => x.id === item.id);
              return (
                <Pressable onPress={() => alternar(item)} style={[estilos.linha, index > 0 && estilos.separador]}>
                  <View style={[estilos.caixa, marcado && estilos.caixaMarcada]}>
                    {marcado ? (
                      <Texto variante="subtitulo" cor={Cores.preto} style={{ fontSize: 16 }}>
                        ✓
                      </Texto>
                    ) : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Texto variante="corpo">{item.nome}</Texto>
                    <Texto variante="legenda">
                      {item.grupo}
                      {item.equipamento ? ` · ${item.equipamento}` : ''}
                      {item.videoUrl ? ' · ▶ vídeo' : ''}
                    </Texto>
                  </View>
                </Pressable>
              );
            }}
            ListEmptyComponent={<Texto variante="legenda">Nenhum exercício encontrado. Crie um novo na aba Exercícios.</Texto>}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  topo: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Espaco.md },
  chip: {
    height: 36,
    paddingHorizontal: 12,
    borderRadius: Raio.pilula,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    backgroundColor: Cores.superficie,
    justifyContent: 'center',
  },
  chipAtivo: { backgroundColor: Cores.verde, borderColor: Cores.verde },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md, paddingVertical: 12 },
  separador: { borderTopWidth: 1, borderTopColor: Cores.borda },
  caixa: { width: 28, height: 28, borderRadius: 8, borderWidth: 2, borderColor: Cores.cinza, alignItems: 'center', justifyContent: 'center' },
  caixaMarcada: { backgroundColor: Cores.verde, borderColor: Cores.verde },
});
