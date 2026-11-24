import * as Haptics from 'expo-haptics';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { CardDesafio } from '@/components/card-desafio';
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
import { listarDesafios, type Desafio } from '@/lib/desafios';
import { useSessao } from '@/lib/sessao';

// Comunidade: treinos que a galera da Fit One publicou, ranking da semana e desafios.
// A mesma tela serve ao aluno e ao personal/admin (lado "personal"): o personal vê, manda "Boa!",
// comenta e cria desafios; o admin também pode apagar qualquer publicação (moderação).

type Aba = 'feed' | 'ranking' | 'desafios';

type Lado = 'aluno' | 'personal';

export function TelaComunidade({ lado }: { lado: Lado }) {
  const { gymId, papel } = useSessao();
  const equipe = lado === 'personal';
  const admin = papel === 'admin';
  const rotaPublicacao = (id: string) => (equipe ? `/personal/publicacao/${id}` : `/publicacao/${id}`) as any;
  const rotaDesafio = (id: string) => (equipe ? `/personal/desafio/${id}` : `/desafio/${id}`) as any;
  const [aba, setAba] = useState<Aba>('feed');
  const [feed, setFeed] = useState<Publicacao[]>([]);
  const [ranking, setRanking] = useState<LinhaRanking[]>([]);
  const [desafios, setDesafios] = useState<Desafio[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [temMais, setTemMais] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const buscandoMais = useRef(false);

  const recarregar = useCallback(async () => {
    if (!gymId) return;
    setErro(null);
    try {
      const [f, r, d] = await Promise.all([carregarFeed(gymId), carregarRanking(gymId), listarDesafios(gymId)]);
      setFeed(f);
      setRanking(r);
      setDesafios(d);
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
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Espaco.sm }}>
        <Texto variante="titulo">Comunidade</Texto>
        {!equipe ? (
          <Pressable onPress={() => router.push('/publicar')} style={estilos.publicar} hitSlop={6}>
            <Texto variante="corpo" cor={Cores.preto} style={{ fontFamily: 'Archivo_700Bold' }}>
              + Publicar
            </Texto>
          </Pressable>
        ) : aba === 'desafios' ? (
          <Pressable onPress={() => router.push('/personal/desafio/novo' as any)} style={estilos.publicar} hitSlop={6}>
            <Texto variante="corpo" cor={Cores.preto} style={{ fontFamily: 'Archivo_700Bold' }}>
              + Desafio
            </Texto>
          </Pressable>
        ) : null}
      </View>
      <View style={estilos.seletor}>
        {(['feed', 'ranking', 'desafios'] as const).map((a) => (
          <Pressable
            key={a}
            onPress={() => {
              Haptics.selectionAsync();
              setAba(a);
            }}
            style={[estilos.opcao, aba === a && { backgroundColor: Cores.verde }]}>
            <Texto variante="corpo" cor={aba === a ? Cores.preto : Cores.textoSecundario} style={{ fontFamily: 'Archivo_600SemiBold' }}>
              {a === 'feed' ? 'Treinos' : a === 'ranking' ? 'Ranking' : 'Desafios'}
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
        <Texto variante="legenda">Ranking da semana: conta os treinos publicados de segunda a domingo. Empate: quem treinou mais minutos.</Texto>
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
          renderItem={({ item }) => (
            <CardPublicacao
              p={item}
              aoCurtir={aoCurtir}
              aoRemover={aoRemover}
              podeRemover={item.eu || admin}
              aoComentar={(x) => router.push(rotaPublicacao(x.id))}
            />
          )}
          refreshControl={refresh}
          onEndReached={maisAntigos}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={
            <View style={estilos.vazio}>
              <Texto variante="subtitulo">Ninguém publicou ainda</Texto>
              <Texto variante="corpo" cor={Cores.textoSecundario} style={{ textAlign: 'center' }}>
                {equipe
                  ? 'Quando os alunos publicarem os treinos, eles aparecem aqui.'
                  : 'Toque em "+ Publicar" lá em cima e escolha um treino seu, ou publique direto no fim do treino.'}
              </Texto>
            </View>
          }
          ListFooterComponent={
            feed.length > 0 ? (
              <Texto variante="legenda" style={{ textAlign: 'center', marginTop: Espaco.lg }}>
                {temMais ? ' ' : admin ? 'Segure uma publicação para apagar.' : equipe ? ' ' : 'Segure o seu treino para tirar do feed.'}
              </Texto>
            ) : undefined
          }
        />
      ) : aba === 'desafios' ? (
        <FlatList
          data={desafios}
          keyExtractor={(d) => d.id}
          contentContainerStyle={estilos.conteudo}
          ListHeaderComponent={cabecalho}
          refreshControl={refresh}
          ItemSeparatorComponent={() => <View style={{ height: Espaco.md }} />}
          renderItem={({ item }) => <CardDesafio d={item} mostrarMeu={!equipe} onPress={() => router.push(rotaDesafio(item.id))} />}
          ListEmptyComponent={
            <View style={estilos.vazio}>
              <Texto variante="subtitulo">Nenhum desafio ainda</Texto>
              <Texto variante="corpo" cor={Cores.textoSecundario} style={{ textAlign: 'center' }}>
                {equipe ? 'Toque em "+ Desafio" para criar o primeiro.' : 'Quando um personal da Fit One criar um desafio, ele aparece aqui.'}
              </Texto>
            </View>
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
  publicar: { backgroundColor: Cores.verde, borderRadius: Raio.pilula, paddingHorizontal: 16, minHeight: 40, justifyContent: 'center' },
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
