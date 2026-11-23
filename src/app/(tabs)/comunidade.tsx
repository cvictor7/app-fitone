import * as Haptics from 'expo-haptics';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { CardPublicacao } from '@/components/card-publicacao';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import {
  POR_PAGINA,
  carregarFeed,
  carregarRanking,
  curtir,
  removerPublicacao,
  type LinhaRanking,
  type Publicacao,
} from '@/lib/comunidade';
import { useSessao } from '@/lib/sessao';

// Aba "Comunidade": treinos que a galera da Fit One publicou e o ranking da semana.

type Aba = 'feed' | 'ranking';

export default function Comunidade() {
  const { gymId } = useSessao();
  const [aba, setAba] = useState<Aba>('feed');
  const [feed, setFeed] = useState<Publicacao[]>([]);
  const [ranking, setRanking] = useState<LinhaRanking[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [temMais, setTemMais] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const buscandoMais = useRef(false);

  const recarregar = useCallback(async () => {
    if (!gymId) return;
    setErro(null);
    try {
      const [f, r] = await Promise.all([carregarFeed(gymId), carregarRanking(gymId)]);
      setFeed(f);
      setRanking(r);
      setTemMais(f.length === POR_PAGINA);
    } catch {
      setErro('Não deu para carregar a comunidade. Puxe para baixo para tentar de novo.');
    } finally {
      setCarregando(false);
      setAtualizando(false);
    }
  }, [gymId]);

  // Recarrega toda vez que a aba aparece (ex.: depois de publicar um treino)
  useFocusEffect(
    useCallback(() => {
      recarregar();
    }, [recarregar]),
  );

  async function maisAntigos() {
    if (!gymId || !temMais || buscandoMais.current || feed.length === 0) return;
    buscandoMais.current = true;
    try {
      const f = await carregarFeed(gymId, feed[feed.length - 1].criadoEm);
      setFeed((atual) => [...atual, ...f.filter((x) => !atual.some((a) => a.id === x.id))]);
      setTemMais(f.length === POR_PAGINA);
    } catch {
      // tenta de novo na próxima rolagem
    } finally {
      buscandoMais.current = false;
    }
  }

  async function aoCurtir(p: Publicacao) {
    Haptics.impactAsync(p.euCurti ? Haptics.ImpactFeedbackStyle.Light : Haptics.ImpactFeedbackStyle.Medium);
    const sim = !p.euCurti;
    // muda na tela na hora; se o banco recusar, volta
    const trocar = (lista: Publicacao[], s: boolean) =>
      lista.map((x) => (x.id === p.id ? { ...x, euCurti: s, curtidas: x.curtidas + (s ? 1 : -1) } : x));
    setFeed((l) => trocar(l, sim));
    try {
      await curtir(p.id, sim);
    } catch {
      setFeed((l) => trocar(l, !sim));
    }
  }

  async function aoRemover(p: Publicacao) {
    try {
      await removerPublicacao(p.id);
      setFeed((l) => l.filter((x) => x.id !== p.id));
      if (gymId) setRanking(await carregarRanking(gymId));
    } catch {
      setErro('Não deu para tirar agora. Tente de novo.');
    }
  }

  if (!gymId) {
    return (
      <SafeAreaView style={estilos.tela} edges={['top']}>
        <Texto variante="titulo" style={{ padding: Espaco.lg }}>
          Comunidade
        </Texto>
        <Texto variante="corpo" cor={Cores.textoSecundario} style={{ paddingHorizontal: Espaco.lg }}>
          Entre na academia com o código para ver a comunidade.
        </Texto>
      </SafeAreaView>
    );
  }

  const cabecalho = (
    <View style={{ gap: Espaco.md, marginBottom: Espaco.md }}>
      <Texto variante="titulo" style={{ paddingTop: Espaco.sm }}>
        Comunidade
      </Texto>
      <View style={estilos.seletor}>
        {(['feed', 'ranking'] as const).map((a) => (
          <Pressable
            key={a}
            onPress={() => {
              Haptics.selectionAsync();
              setAba(a);
            }}
            style={[estilos.opcao, aba === a && { backgroundColor: Cores.verde }]}>
            <Texto variante="corpo" cor={aba === a ? Cores.preto : Cores.textoSecundario} style={{ fontFamily: 'Archivo_600SemiBold' }}>
              {a === 'feed' ? 'Treinos' : 'Ranking da semana'}
            </Texto>
          </Pressable>
        ))}
      </View>
      {erro ? (
        <Texto variante="corpo" cor={Cores.perigo}>
          {erro}
        </Texto>
      ) : null}
      {aba === 'ranking' ? (
        <Texto variante="legenda">Conta os treinos publicados de segunda a domingo. Empate: quem treinou mais minutos.</Texto>
      ) : null}
    </View>
  );

  const refresh = (
    <RefreshControl
      refreshing={atualizando}
      onRefresh={() => {
        setAtualizando(true);
        recarregar();
      }}
      tintColor={Cores.verde}
    />
  );

  if (carregando) {
    return (
      <SafeAreaView style={estilos.tela} edges={['top']}>
        <View style={estilos.conteudo}>{cabecalho}</View>
        <ActivityIndicator color={Cores.verde} style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      {aba === 'feed' ? (
        <FlatList
          data={feed}
          keyExtractor={(p) => p.id}
          contentContainerStyle={estilos.conteudo}
          ListHeaderComponent={cabecalho}
          ItemSeparatorComponent={() => <View style={{ height: Espaco.md }} />}
          renderItem={({ item }) => <CardPublicacao p={item} aoCurtir={aoCurtir} aoRemover={aoRemover} />}
          refreshControl={refresh}
          onEndReached={maisAntigos}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={estilos.vazio}>
              <Texto variante="subtitulo">Ninguém publicou ainda</Texto>
              <Texto variante="corpo" cor={Cores.textoSecundario} style={{ textAlign: 'center' }}>
                Termine um treino e toque em "Publicar na comunidade" para aparecer aqui.
              </Texto>
            </View>
          }
          ListFooterComponent={
            feed.length > 0 ? (
              <Texto variante="legenda" style={{ textAlign: 'center', marginTop: Espaco.lg }}>
                {temMais ? ' ' : 'Segure o seu treino para tirar do feed.'}
              </Texto>
            ) : undefined
          }
        />
      ) : (
        <FlatList
          data={ranking}
          keyExtractor={(r) => r.autorId}
          contentContainerStyle={estilos.conteudo}
          ListHeaderComponent={cabecalho}
          refreshControl={refresh}
          ItemSeparatorComponent={() => <View style={{ height: Espaco.sm }} />}
          renderItem={({ item, index }) => <LinhaDoRanking r={item} posicao={index + 1} />}
          ListEmptyComponent={
            <View style={estilos.vazio}>
              <Texto variante="subtitulo">Semana zerada</Texto>
              <Texto variante="corpo" cor={Cores.textoSecundario} style={{ textAlign: 'center' }}>
                Publique seu treino e saia na frente.
              </Texto>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

function LinhaDoRanking({ r, posicao }: { r: LinhaRanking; posicao: number }) {
  const podio = posicao <= 3;
  return (
    <View style={[estilos.linha, r.eu && { borderColor: Cores.verde }]}>
      <Texto variante="numero" cor={podio ? Cores.verde : Cores.textoApagado} style={{ width: 36, fontSize: 28, lineHeight: 30 }}>
        {posicao}
      </Texto>
      <Avatar nome={r.autor} tamanho={36} />
      <Texto variante="corpo" style={{ flex: 1, fontFamily: 'Archivo_600SemiBold' }} numberOfLines={1}>
        {r.eu ? `${r.autor} (você)` : r.autor}
      </Texto>
      <View style={{ alignItems: 'flex-end' }}>
        <Texto variante="numero" style={{ fontSize: 24, lineHeight: 26 }}>
          {r.treinos}
        </Texto>
        <Texto variante="legenda">
          {r.treinos === 1 ? 'treino' : 'treinos'}
          {r.minutos > 0 ? ` · ${r.minutos} min` : ''}
        </Texto>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, paddingBottom: Espaco.xxl },
  seletor: { flexDirection: 'row', backgroundColor: Cores.superficie, borderRadius: Raio.pilula, padding: 4 },
  opcao: { flex: 1, minHeight: 44, borderRadius: Raio.pilula, alignItems: 'center', justifyContent: 'center' },
  vazio: { alignItems: 'center', gap: Espaco.sm, paddingVertical: Espaco.xxl, paddingHorizontal: Espaco.lg },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.md,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: Espaco.md,
  },
});
