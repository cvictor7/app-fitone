import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, ListaModalidades, Raio, infoModalidade } from '@/constants/theme';
import {
  apagarAviso,
  carregarPainel,
  criarAviso,
  definirPapel,
  listarAvisos,
  listarMembros,
  type Aviso,
  type Membro,
  type Painel,
} from '@/lib/academia';
import { dataBR, hojeISO, somarDias } from '@/lib/desafios';
import { useSessao } from '@/lib/sessao';

// Admin · Academia: números da casa (só totais, sem treino individual), avisos e equipe.

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function Numero({ n, r, cor = Cores.texto }: { n: number; r: string; cor?: string }) {
  return (
    <View style={estilos.numero}>
      <Texto variante="numero" cor={cor} style={{ fontSize: 34, lineHeight: 36 }}>
        {n}
      </Texto>
      <Texto variante="legenda">{r}</Texto>
    </View>
  );
}

function Barras({ itens }: { itens: { rotulo: string; valor: number; cor: string }[] }) {
  const max = Math.max(1, ...itens.map((i) => i.valor));
  return (
    <View style={{ gap: 8 }}>
      {itens.map((i) => (
        <View key={i.rotulo} style={{ flexDirection: 'row', alignItems: 'center', gap: Espaco.sm }}>
          <Texto variante="legenda" style={{ width: 86 }} numberOfLines={1}>
            {i.rotulo}
          </Texto>
          <View style={{ flex: 1, height: 14, borderRadius: 7, backgroundColor: Cores.superficieAlta, overflow: 'hidden' }}>
            <View style={{ width: `${(i.valor / max) * 100}%`, height: 14, borderRadius: 7, backgroundColor: i.cor }} />
          </View>
          <Texto variante="corpo" style={{ width: 34, textAlign: 'right' }}>
            {i.valor}
          </Texto>
        </View>
      ))}
    </View>
  );
}

export default function PainelAcademia() {
  const { gymId } = useSessao();
  const [painel, setPainel] = useState<Painel | null>(null);
  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const [membros, setMembros] = useState<Membro[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [duracao, setDuracao] = useState<number | null>(7);
  const [publicando, setPublicando] = useState(false);
  const [busca, setBusca] = useState('');

  const carregar = useCallback(async () => {
    if (!gymId) return;
    try {
      setErro(null);
      const [p, a, m] = await Promise.all([carregarPainel(gymId), listarAvisos(gymId), listarMembros(gymId)]);
      setPainel(p);
      setAvisos(a);
      setMembros(m);
    } catch {
      setErro('Não deu para carregar o painel. Puxe para baixo para tentar de novo.');
    }
  }, [gymId]);

  useFocusEffect(
    useCallback(() => {
      carregar();
    }, [carregar]),
  );

  async function publicar() {
    if (!gymId) return;
    if (titulo.trim().length < 3) return setErro('Escreva o título do aviso.');
    setErro(null);
    setPublicando(true);
    try {
      await criarAviso(gymId, titulo, texto, duracao === null ? null : somarDias(hojeISO(), duracao - 1));
      setTitulo('');
      setTexto('');
      setAvisos(await listarAvisos(gymId));
    } catch {
      setErro('Não deu para publicar o aviso.');
    } finally {
      setPublicando(false);
    }
  }

  function apagar(a: Aviso) {
    Alert.alert('Apagar aviso?', a.titulo, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apagarAviso(a.id);
            setAvisos((l) => l.filter((x) => x.id !== a.id));
          } catch {
            setErro('Não deu para apagar.');
          }
        },
      },
    ]);
  }

  function mudarPapel(m: Membro) {
    if (m.eu || m.papel === 'admin' || !gymId) return;
    const novo = m.papel === 'aluno' ? 'personal' : 'aluno';
    Alert.alert(
      novo === 'personal' ? `Tornar ${m.nome} personal?` : `Tirar ${m.nome} da equipe?`,
      novo === 'personal'
        ? 'Ele passa a ver o lado do personal: alunos, planos, exercícios e desafios. Precisa fechar e abrir o app.'
        : 'Ele volta a ser aluno. Os alunos dele continuam vinculados até você ajustar.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              await definirPapel(gymId, m.userId, novo);
              setMembros(await listarMembros(gymId));
            } catch (e: any) {
              setErro(e?.message ?? 'Não deu para mudar.');
            }
          },
        },
      ],
    );
  }

  const visiveis = membros.filter((m) => m.nome.toLowerCase().includes(busca.trim().toLowerCase()));
  const equipe = visiveis.filter((m) => m.papel !== 'aluno');
  const alunos = visiveis.filter((m) => m.papel === 'aluno');

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={<RefreshControl refreshing={false} onRefresh={carregar} tintColor={Cores.verde} />}>
        <Texto variante="titulo" style={{ paddingTop: Espaco.sm }}>
          Academia
        </Texto>

        {erro ? (
          <Texto variante="corpo" cor={Cores.perigo}>
            {erro}
          </Texto>
        ) : null}

        {!painel ? (
          <ActivityIndicator color={Cores.verde} style={{ marginTop: Espaco.xl }} />
        ) : (
          <>
            <View style={estilos.grade}>
              <Numero n={painel.membros} r="alunos" />
              <Numero n={painel.novos30d} r="novos em 30 dias" cor={Cores.verde} />
              <Numero n={painel.ativos7d} r="treinaram em 7 dias" />
              <Numero n={painel.treinos7d} r="treinos em 7 dias" />
              <Numero n={painel.ativos30d} r="treinaram em 30 dias" />
              <Numero n={painel.sumidos14d} r="sumidos há 14+ dias" cor={painel.sumidos14d > 0 ? Cores.perigo : Cores.texto} />
            </View>
            <Texto variante="legenda">
              Conta só quem registra treino pelo app. {painel.personais} na equipe (personal/admin).
            </Texto>

            <View style={estilos.bloco}>
              <Texto variante="rotulo">TREINOS POR MODALIDADE · 30 DIAS</Texto>
              {painel.treinos30d === 0 ? (
                <Texto variante="corpo" cor={Cores.textoSecundario}>
                  Nenhum treino registrado ainda.
                </Texto>
              ) : (
                <Barras
                  itens={ListaModalidades.map((m) => ({
                    rotulo: infoModalidade(m).nome,
                    valor: painel.porModalidade[m] ?? 0,
                    cor: infoModalidade(m).cor,
                  })).filter((i) => i.valor > 0)}
                />
              )}
            </View>

            <View style={estilos.bloco}>
              <Texto variante="rotulo">DIAS MAIS CHEIOS · 30 DIAS</Texto>
              <Barras itens={[1, 2, 3, 4, 5, 6, 0].map((d) => ({ rotulo: DIAS[d], valor: painel.porDia[d], cor: Cores.verde }))} />
            </View>
          </>
        )}

        <View style={estilos.bloco}>
          <Texto variante="rotulo">NOVO AVISO PARA TODOS</Texto>
          <Campo value={titulo} onChangeText={setTitulo} placeholder="Ex.: Feriado: abrimos 8h às 12h" maxLength={60} />
          <Campo
            value={texto}
            onChangeText={setTexto}
            placeholder="Detalhes (opcional)"
            maxLength={500}
            multiline
            style={{ minHeight: 70, paddingTop: 14, fontSize: 16 }}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm }}>
            {([1, 3, 7, 30, null] as const).map((d) => (
              <Pressable
                key={String(d)}
                onPress={() => setDuracao(d)}
                style={[estilos.chip, duracao === d && { backgroundColor: Cores.verde, borderColor: Cores.verde }]}>
                <Texto variante="corpo" cor={duracao === d ? Cores.preto : Cores.texto} style={{ fontFamily: 'Archivo_600SemiBold' }}>
                  {d === null ? 'Até apagar' : d === 1 ? 'Só hoje' : `${d} dias`}
                </Texto>
              </Pressable>
            ))}
          </View>
          <Botao titulo={publicando ? 'Publicando...' : 'Publicar aviso'} disabled={publicando} onPress={publicar} />
        </View>

        {avisos.length > 0 ? (
          <View style={{ gap: Espaco.sm }}>
            <Texto variante="rotulo">AVISOS</Texto>
            {avisos.map((a) => {
              const vencido = !!a.expiraEm && a.expiraEm < hojeISO();
              return (
                <Pressable key={a.id} onLongPress={() => apagar(a)} style={[estilos.aviso, vencido && { opacity: 0.5 }]}>
                  <Texto variante="corpo" style={{ fontFamily: 'Archivo_600SemiBold' }}>
                    {a.titulo}
                  </Texto>
                  {a.texto ? <Texto variante="legenda">{a.texto}</Texto> : null}
                  <Texto variante="legenda" cor={Cores.textoApagado}>
                    {a.expiraEm ? (vencido ? `Saiu do ar ${dataBR(a.expiraEm)}` : `No ar até ${dataBR(a.expiraEm)}`) : 'No ar até apagar'} · segure
                    para apagar
                  </Texto>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">EQUIPE E ALUNOS</Texto>
          <Campo value={busca} onChangeText={setBusca} placeholder="Buscar pelo nome" />
          {[...equipe, ...alunos].slice(0, 60).map((m) => (
            <Pressable key={m.userId} onPress={() => mudarPapel(m)} style={estilos.membro}>
              <Avatar nome={m.nome} tamanho={36} />
              <Texto variante="corpo" style={{ flex: 1 }} numberOfLines={1}>
                {m.nome}
                {m.eu ? ' (você)' : ''}
              </Texto>
              <Texto
                variante="rotulo"
                cor={m.papel === 'admin' ? Cores.amarelo : m.papel === 'personal' ? Cores.verde : Cores.textoApagado}>
                {m.papel === 'admin' ? 'ADMIN' : m.papel === 'personal' ? 'PERSONAL' : 'ALUNO'}
              </Texto>
            </Pressable>
          ))}
          <Texto variante="legenda">Toque em alguém para tornar personal ou voltar a aluno.</Texto>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, gap: Espaco.lg, paddingBottom: Espaco.xxl },
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
  numero: { width: '48.5%', backgroundColor: Cores.superficie, borderRadius: Raio.lg, padding: Espaco.md, gap: 2 },
  bloco: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, padding: Espaco.md, gap: Espaco.sm },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: Raio.pilula,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aviso: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, borderLeftWidth: 4, borderLeftColor: Cores.verde, padding: Espaco.md, gap: 4 },
  membro: { flexDirection: 'row', alignItems: 'center', gap: Espaco.sm, paddingVertical: 6 },
});
