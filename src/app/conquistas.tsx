import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraTopo } from '@/components/barra-topo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { listarConquistas, marcarVistas, textoProgresso, type Conquista } from '@/lib/conquistas';

// Todas as conquistas: as ganhas coloridas (com a data), as outras apagadas com quanto falta.
export default function Conquistas() {
  const [lista, setLista] = useState<Conquista[] | null>(null);

  useEffect(() => {
    listarConquistas()
      .then((l) => {
        setLista(l);
        marcarVistas(l.filter((c) => c.conquistadaEm).map((c) => c.codigo));
      })
      .catch(() => setLista([]));
  }, []);

  const grupos = lista ? [...new Set(lista.map((c) => c.grupo))] : [];
  const ganhas = lista?.filter((c) => c.conquistadaEm).length ?? 0;

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo="Conquistas" />
      <ScrollView contentContainerStyle={estilos.conteudo}>
        {lista === null ? (
          <ActivityIndicator color={Cores.verde} style={{ marginTop: Espaco.xl }} />
        ) : (
          <>
            <View style={{ alignItems: 'center', gap: 2 }}>
              <Texto variante="display" cor={Cores.verde} style={{ fontSize: 64, lineHeight: 66 }}>
                {ganhas}
                <Texto variante="titulo" cor={Cores.textoSecundario}>
                  {' '}
                  / {lista.length}
                </Texto>
              </Texto>
              <Texto variante="legenda">conquistas desbloqueadas</Texto>
            </View>
            {grupos.map((g) => (
              <View key={g} style={{ gap: Espaco.sm }}>
                <Texto variante="rotulo">{g.toUpperCase()}</Texto>
                <View style={estilos.grade}>
                  {lista
                    .filter((c) => c.grupo === g)
                    .map((c) => {
                      const ok = !!c.conquistadaEm;
                      return (
                        <View key={c.codigo} style={[estilos.medalha, ok && { borderColor: Cores.verde }]}>
                          <Texto style={{ fontSize: 40, lineHeight: 48, opacity: ok ? 1 : 0.25 }}>{c.emoji}</Texto>
                          <Texto variante="corpo" style={{ fontFamily: 'Archivo_600SemiBold', textAlign: 'center' }} numberOfLines={2}>
                            {c.titulo}
                          </Texto>
                          {ok ? (
                            <Texto variante="legenda" cor={Cores.verde}>
                              {c.conquistadaEm!.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: '2-digit' })}
                            </Texto>
                          ) : (
                            <>
                              <View style={estilos.trilho}>
                                <View style={[estilos.barra, { width: `${Math.min(100, (c.valor / c.meta) * 100)}%` }]} />
                              </View>
                              <Texto variante="legenda" style={{ textAlign: 'center' }}>
                                {textoProgresso(c)}
                              </Texto>
                            </>
                          )}
                        </View>
                      );
                    })}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, gap: Espaco.lg, paddingBottom: Espaco.xxl },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
  medalha: {
    width: '48.5%',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    padding: Espaco.md,
  },
  trilho: { alignSelf: 'stretch', height: 6, borderRadius: 3, backgroundColor: Cores.superficieAlta, overflow: 'hidden', marginTop: 4 },
  barra: { height: 6, borderRadius: 3, backgroundColor: Cores.textoSecundario },
});
