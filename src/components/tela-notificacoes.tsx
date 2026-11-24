import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BarraTopo } from '@/components/barra-topo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { tempoAtras } from '@/lib/comunidade';
import { listarNotificacoes, marcarTodasLidas, textoNotificacao, type Notificacao } from '@/lib/notificacoes';

// O sino da Comunidade: quem mandou Boa!, comentou ou mencionou você. Abriu, marcou como lido.

export function TelaNotificacoes({ lado }: { lado: 'aluno' | 'personal' }) {
  const [lista, setLista] = useState<Notificacao[] | null>(null);

  const carregar = useCallback(async () => {
    try {
      setLista(await listarNotificacoes());
      marcarTodasLidas();
    } catch {
      setLista([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  const abrir = (n: Notificacao) => {
    const base = lado === 'personal' ? '/personal' : '';
    if (n.clubeId) router.push(`${base}/clube/${n.clubeId}` as any);
    else if (n.publicacaoId) router.push(`${base}/publicacao/${n.publicacaoId}` as any);
  };

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo="Notificações" />
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        refreshControl={<RefreshControl refreshing={false} onRefresh={carregar} tintColor={Cores.verde} />}>
        {lista === null ? (
          <ActivityIndicator color={Cores.verde} style={{ marginTop: Espaco.xl }} />
        ) : lista.length === 0 ? (
          <View style={{ alignItems: 'center', gap: Espaco.sm, paddingVertical: Espaco.xxl }}>
            <Texto variante="subtitulo">Nada por aqui ainda</Texto>
            <Texto variante="corpo" cor={Cores.textoSecundario} style={{ textAlign: 'center' }}>
              Quando alguém mandar Boa!, comentar no seu treino ou te marcar com @, aparece aqui.
            </Texto>
          </View>
        ) : (
          lista.map((n) => (
            <Pressable key={n.id} onPress={() => abrir(n)} style={({ pressed }) => [estilos.item, !n.lida && estilos.nova, pressed && { opacity: 0.7 }]}>
              <View>
                <Avatar nome={n.ator} tamanho={40} />
                <Texto style={estilos.emoji}>{n.tipo === 'curtida' ? '🔥' : n.tipo === 'comentario' ? '💬' : '@'}</Texto>
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Texto variante="corpo">
                  <Texto variante="corpo" style={{ fontFamily: 'Archivo_700Bold' }}>
                    {n.ator}
                  </Texto>{' '}
                  {textoNotificacao(n)}
                </Texto>
                {n.trecho ? (
                  <Texto variante="legenda" numberOfLines={2}>
                    "{n.trecho}"
                  </Texto>
                ) : null}
                <Texto variante="legenda" cor={Cores.textoApagado}>
                  {tempoAtras(n.criadoEm)}
                </Texto>
              </View>
              {!n.lida ? <View style={estilos.ponto} /> : null}
            </Pressable>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, gap: Espaco.sm, paddingBottom: Espaco.xxl },
  item: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md, backgroundColor: Cores.superficie, borderRadius: Raio.lg, padding: Espaco.md },
  nova: { borderWidth: 1.5, borderColor: Cores.verde },
  emoji: { position: 'absolute', right: -6, bottom: -6, fontSize: 16 },
  ponto: { width: 10, height: 10, borderRadius: 5, backgroundColor: Cores.verde },
});
