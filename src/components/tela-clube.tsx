import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { CardPublicacao } from '@/components/card-publicacao';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import {
  apagarClube,
  criarClube,
  entrarNoClube,
  feedDoClube,
  listarClubes,
  membrosDoClube,
  sairDoClube,
  traduzirErroClube,
  type Clube,
  type MembroClube,
} from '@/lib/clubes';
import { curtir, removerPublicacao, type Publicacao } from '@/lib/comunidade';
import { useSessao } from '@/lib/sessao';

// Um clube: feed dos membros, ranking da semana, convidar com código, entrar/sair.
// Com id "novo", vira o formulário de criar clube. Serve ao aluno e ao personal/admin.

type Lado = 'aluno' | 'personal';

export function TelaClube({ id, lado }: { id: string; lado: Lado }) {
  if (id === 'novo') return <CriarClube lado={lado} />;
  return <VerClube id={id} lado={lado} />;
}

function CriarClube({ lado }: { lado: Lado }) {
  const { gymId } = useSessao();
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fechado, setFechado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function criar() {
    if (!gymId) return;
    if (nome.trim().length < 3) return setErro('Dê um nome ao clube (mínimo 3 letras).');
    setErro(null);
    setSalvando(true);
    try {
      const novo = await criarClube(gymId, nome, descricao, fechado);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace((lado === 'personal' ? `/personal/clube/${novo}` : `/clube/${novo}`) as any);
    } catch (e: any) {
      setErro(traduzirErroClube(String(e?.message ?? '')));
      setSalvando(false);
    }
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo="Novo clube" />
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">NOME</Texto>
          <Campo value={nome} onChangeText={setNome} placeholder="Ex.: Turma das 6h" maxLength={30} />
        </View>
        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">SOBRE (OPCIONAL)</Texto>
          <Campo
            value={descricao}
            onChangeText={setDescricao}
            placeholder="Ex.: quem treina cedo antes do trabalho"
            maxLength={200}
            multiline
            style={{ minHeight: 70, paddingTop: 14, fontSize: 16 }}
          />
        </View>
        <View style={estilos.linhaSwitch}>
          <View style={{ flex: 1, gap: 2 }}>
            <Texto variante="corpo" style={{ fontFamily: 'Archivo_600SemiBold' }}>
              Clube fechado
            </Texto>
            <Texto variante="legenda">
              {fechado
                ? 'Só entra quem tiver o código. Não aparece na lista para os outros.'
                : 'Aberto: qualquer um da Fit One vê e entra.'}
            </Texto>
          </View>
          <Switch value={fechado} onValueChange={setFechado} trackColor={{ true: Cores.verde, false: Cores.borda }} thumbColor={Cores.branco} />
        </View>
        {erro ? (
          <Texto variante="corpo" cor={Cores.perigo}>
            {erro}
          </Texto>
        ) : null}
        <Botao titulo={salvando ? 'Criando...' : 'Criar clube'} disabled={salvando} onPress={criar} />
      </ScrollView>
    </SafeAreaView>
  );
}

function VerClube({ id, lado }: { id: string; lado: Lado }) {
  const { gymId, papel } = useSessao();
  const [clube, setClube] = useState<Clube | null | undefined>(undefined);
  const [feed, setFeed] = useState<Publicacao[]>([]);
  const [membros, setMembros] = useState<MembroClube[]>([]);
  const [aba, setAba] = useState<'feed' | 'ranking'>('feed');
  const [erro, setErro] = useState<string | null>(null);
  const [mexendo, setMexendo] = useState(false);
  const admin = papel === 'admin';

  const carregar = useCallback(async () => {
    if (!gymId) return;
    try {
      const [lista, f, m] = await Promise.all([listarClubes(gymId), feedDoClube(id), membrosDoClube(id)]);
      setClube(lista.find((c) => c.id === id) ?? null);
      setFeed(f);
      setMembros(m);
    } catch {
      setClube((atual) => atual ?? null);
    }
  }, [gymId, id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function entrar() {
    setErro(null);
    setMexendo(true);
    try {
      await entrarNoClube(id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await carregar();
    } catch (e: any) {
      setErro(traduzirErroClube(String(e?.message ?? '')));
    } finally {
      setMexendo(false);
    }
  }

  function sairOuApagar() {
    if (!clube) return;
    const apagar = clube.souDono || admin;
    Alert.alert(
      apagar ? `Apagar o clube "${clube.nome}"?` : `Sair do clube "${clube.nome}"?`,
      apagar ? 'O clube some para todos. Os treinos de cada um continuam no feed geral.' : 'Você pode entrar de novo depois.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: apagar ? 'Apagar' : 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              if (apagar) await apagarClube(id);
              else await sairDoClube(id);
              router.back();
            } catch {
              setErro('Não deu certo agora.');
            }
          },
        },
      ],
    );
  }

  function convidar() {
    if (!clube?.codigo) return;
    Share.share({
      message: `Entra no clube "${clube.nome}" no app da Fit One! Em Comunidade → Clubes, digite o código ${clube.codigo}`,
    });
  }

  async function aoCurtir(p: Publicacao) {
    const sim = !p.euCurti;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const trocar = (l: Publicacao[], s: boolean) => l.map((x) => (x.id === p.id ? { ...x, euCurti: s, curtidas: x.curtidas + (s ? 1 : -1) } : x));
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
    } catch {
      setErro('Não deu para tirar agora.');
    }
  }

  if (clube === undefined) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Clube" />
        <ActivityIndicator color={Cores.verde} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }
  if (clube === null) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Clube" />
        <Texto variante="corpo" cor={Cores.textoSecundario} style={{ padding: Espaco.lg }}>
          Esse clube não existe mais ou é fechado.
        </Texto>
      </SafeAreaView>
    );
  }

  const rotaPublicacao = (pid: string) => (lado === 'personal' ? `/personal/publicacao/${pid}` : `/publicacao/${pid}`) as any;

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo="Clube" />
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        refreshControl={<RefreshControl refreshing={false} onRefresh={carregar} tintColor={Cores.verde} />}>
        <View style={estilos.cabecalho}>
          <View style={estilos.inicial}>
            <Texto variante="display" cor={Cores.preto} style={{ fontSize: 40, lineHeight: 42 }}>
              {clube.nome.trim()[0]?.toUpperCase()}
            </Texto>
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <Texto variante="titulo" numberOfLines={2} style={{ fontSize: 30, lineHeight: 32 }}>
              {clube.nome}
            </Texto>
            <Texto variante="legenda">
              {clube.fechado ? '🔒 Fechado' : 'Aberto'} · {clube.membros} {clube.membros === 1 ? 'membro' : 'membros'}
            </Texto>
          </View>
        </View>
        {clube.descricao ? <Texto variante="corpo">{clube.descricao}</Texto> : null}

        {clube.souMembro && clube.codigo ? (
          <Pressable onPress={convidar} style={estilos.codigo}>
            <View style={{ flex: 1 }}>
              <Texto variante="rotulo">CÓDIGO PARA CONVIDAR</Texto>
              <Texto variante="display" cor={Cores.verde} style={{ fontSize: 34, lineHeight: 36, letterSpacing: 2 }}>
                {clube.codigo}
              </Texto>
            </View>
            <Texto variante="corpo" style={{ fontFamily: 'Archivo_700Bold' }}>
              Convidar ›
            </Texto>
          </Pressable>
        ) : null}

        {!clube.souMembro ? <Botao titulo={mexendo ? '...' : 'Entrar no clube'} disabled={mexendo} onPress={entrar} /> : null}
        {erro ? (
          <Texto variante="corpo" cor={Cores.perigo}>
            {erro}
          </Texto>
        ) : null}

        <View style={estilos.seletor}>
          {(['feed', 'ranking'] as const).map((a) => (
            <Pressable key={a} onPress={() => setAba(a)} style={[estilos.opcao, aba === a && { backgroundColor: Cores.verde }]}>
              <Texto variante="corpo" cor={aba === a ? Cores.preto : Cores.textoSecundario} style={{ fontFamily: 'Archivo_600SemiBold' }}>
                {a === 'feed' ? 'Treinos' : 'Ranking da semana'}
              </Texto>
            </Pressable>
          ))}
        </View>

        {aba === 'feed' ? (
          feed.length === 0 ? (
            <Texto variante="corpo" cor={Cores.textoSecundario}>
              Quando alguém do clube publicar um treino, ele aparece aqui.
            </Texto>
          ) : (
            feed.map((p) => (
              <CardPublicacao
                key={p.id}
                p={p}
                aoCurtir={aoCurtir}
                aoRemover={aoRemover}
                podeRemover={p.eu || admin}
                aoComentar={(x) => router.push(rotaPublicacao(x.id))}
              />
            ))
          )
        ) : (
          membros.map((m, i) => (
            <View key={m.userId} style={[estilos.membro, m.eu && { borderColor: Cores.verde }]}>
              <Texto variante="numero" cor={i < 3 && m.treinos > 0 ? Cores.verde : Cores.textoApagado} style={{ width: 30, fontSize: 24, lineHeight: 26 }}>
                {i + 1}
              </Texto>
              <Avatar nome={m.autor} tamanho={34} />
              <Texto variante="corpo" style={{ flex: 1, fontFamily: 'Archivo_600SemiBold' }} numberOfLines={1}>
                {m.eu ? `${m.autor} (você)` : m.autor}
                {m.dono ? '  ★' : ''}
              </Texto>
              <View style={{ alignItems: 'flex-end' }}>
                <Texto variante="numero" style={{ fontSize: 22, lineHeight: 24 }}>
                  {m.treinos}
                </Texto>
                <Texto variante="legenda">{m.minutos > 0 ? `${m.minutos} min` : m.treinos === 1 ? 'treino' : 'treinos'}</Texto>
              </View>
            </View>
          ))
        )}

        {clube.souMembro || admin ? (
          <Pressable onPress={sairOuApagar} style={{ alignSelf: 'center', marginTop: Espaco.lg }} hitSlop={10}>
            <Texto variante="corpo" cor={Cores.perigo}>
              {clube.souDono || admin ? 'Apagar clube' : 'Sair do clube'}
            </Texto>
          </Pressable>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, gap: Espaco.md, paddingBottom: Espaco.xxl },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md },
  inicial: { width: 72, height: 72, borderRadius: Raio.lg, backgroundColor: Cores.verde, alignItems: 'center', justifyContent: 'center' },
  codigo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderWidth: 1.5,
    borderColor: Cores.verde,
    padding: Espaco.md,
  },
  seletor: { flexDirection: 'row', backgroundColor: Cores.superficie, borderRadius: Raio.pilula, padding: 4 },
  opcao: { flex: 1, minHeight: 44, borderRadius: Raio.pilula, alignItems: 'center', justifyContent: 'center' },
  membro: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.sm,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: Espaco.md,
  },
  linhaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.md,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    padding: Espaco.md,
  },
});
