import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { RankingDesafio } from '@/components/ranking-desafio';
import { Texto } from '@/components/texto';
import { Cores, Espaco, ListaModalidades, Raio, infoModalidade, type Modalidade } from '@/constants/theme';
import {
  apagarDesafio,
  carregarDesafio,
  dataBR,
  fimDoMes,
  hojeISO,
  rankingDesafio,
  salvarDesafio,
  somarDias,
  validarDesafio,
  type DadosDesafio,
  type LinhaDesafio,
} from '@/lib/desafios';
import { useSessao } from '@/lib/sessao';

// Personal · criar ou editar um desafio. Editando, mostra também a classificação.

const SUGESTOES = { treinos: [8, 12, 20], minutos: [300, 600, 1000] } as const;

function primeiroDoProximoMes() {
  const h = new Date();
  return hojeISO(new Date(h.getFullYear(), h.getMonth() + 1, 1));
}

function Opcao({ texto, ativo, onPress, cor = Cores.verde }: { texto: string; ativo: boolean; onPress: () => void; cor?: string }) {
  return (
    <Pressable onPress={onPress} style={[estilos.opcao, ativo && { backgroundColor: cor, borderColor: cor }]}>
      <Texto variante="corpo" cor={ativo ? Cores.preto : Cores.texto} style={{ fontFamily: 'Archivo_600SemiBold' }}>
        {texto}
      </Texto>
    </Pressable>
  );
}

export default function EditorDesafio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const novo = id === 'novo';
  const { gymId } = useSessao();

  const [d, setD] = useState<DadosDesafio | null>(
    novo
      ? { titulo: '', descricao: '', medida: 'treinos', meta: 12, modalidade: null, inicio: hojeISO(), fim: somarDias(hojeISO(), 29) }
      : null,
  );
  const [metaTexto, setMetaTexto] = useState('12');
  const [ranking, setRanking] = useState<LinhaDesafio[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (novo) return;
    carregarDesafio(id).then((x) => {
      setD(x);
      if (x) setMetaTexto(String(x.meta));
    });
    rankingDesafio(id).then(setRanking).catch(() => setRanking([]));
  }, [id, novo]);

  if (!d) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Desafio" />
        <ActivityIndicator color={Cores.verde} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const mudar = (parte: Partial<DadosDesafio>) => setD((atual) => (atual ? { ...atual, ...parte } : atual));

  function trocarMeta(t: string) {
    const so = t.replace(/\D/g, '').slice(0, 5);
    setMetaTexto(so);
    mudar({ meta: Number(so) || 0 });
  }

  // Duração a partir do início escolhido
  const duracoes: [string, string][] = [
    ['7 dias', somarDias(d.inicio, 6)],
    ['14 dias', somarDias(d.inicio, 13)],
    ['30 dias', somarDias(d.inicio, 29)],
    ['Até o fim do mês', fimDoMes(d.inicio)],
  ];
  const inicios: [string, string][] = [
    ['Hoje', hojeISO()],
    ['Amanhã', somarDias(hojeISO(), 1)],
    ['Dia 1º', primeiroDoProximoMes()],
  ];

  function escolherInicio(iso: string) {
    // mantém a mesma duração ao trocar o início
    const [a1, m1, d1] = d!.inicio.split('-').map(Number);
    const [a2, m2, d2] = d!.fim.split('-').map(Number);
    const dias = Math.round((new Date(a2, m2 - 1, d2).getTime() - new Date(a1, m1 - 1, d1).getTime()) / 86400000);
    mudar({ inicio: iso, fim: somarDias(iso, Math.max(0, dias)) });
  }

  async function salvar() {
    const problema = validarDesafio(d!);
    if (problema) return setErro(problema);
    if (!gymId) return setErro('Sem academia.');
    setErro(null);
    setSalvando(true);
    try {
      await salvarDesafio(novo ? null : id, gymId, d!);
      router.back();
    } catch {
      setErro('Não deu para salvar. Tente de novo.');
      setSalvando(false);
    }
  }

  function apagar() {
    Alert.alert('Apagar o desafio?', 'Some para todos os alunos, junto com a classificação. Os treinos deles continuam.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apagarDesafio(id);
            router.back();
          } catch {
            setErro('Não deu para apagar agora.');
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo={novo ? 'Novo desafio' : 'Editar desafio'} />
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={estilos.bloco}>
          <Texto variante="rotulo">NOME</Texto>
          <Campo value={d.titulo} onChangeText={(t) => mudar({ titulo: t })} placeholder="Ex.: 12 treinos em dezembro" maxLength={40} />
        </View>

        <View style={estilos.bloco}>
          <Texto variante="rotulo">REGRAS / RECADO (OPCIONAL)</Texto>
          <Campo
            value={d.descricao}
            onChangeText={(t) => mudar({ descricao: t })}
            placeholder="Ex.: quem completar ganha uma camiseta"
            maxLength={300}
            multiline
            style={{ minHeight: 80, paddingTop: 14, fontSize: 16 }}
          />
        </View>

        <View style={estilos.bloco}>
          <Texto variante="rotulo">O QUE CONTA</Texto>
          <View style={[estilos.linha, { flexWrap: 'wrap' }]}>
            <Opcao texto="Treinos feitos" ativo={d.medida === 'treinos'} onPress={() => (mudar({ medida: 'treinos' }), trocarMeta('12'))} />
            <Opcao texto="Minutos treinados" ativo={d.medida === 'minutos'} onPress={() => (mudar({ medida: 'minutos' }), trocarMeta('600'))} />
          </View>
        </View>

        <View style={estilos.bloco}>
          <Texto variante="rotulo">META ({d.medida === 'treinos' ? 'TREINOS' : 'MINUTOS'})</Texto>
          <View style={estilos.linha}>
            <Campo value={metaTexto} onChangeText={trocarMeta} keyboardType="number-pad" style={{ width: 110, textAlign: 'center' }} />
            {SUGESTOES[d.medida].map((n) => (
              <Opcao key={n} texto={String(n)} ativo={d.meta === n} onPress={() => trocarMeta(String(n))} />
            ))}
          </View>
        </View>

        <View style={estilos.bloco}>
          <Texto variante="rotulo">MODALIDADE</Texto>
          <View style={[estilos.linha, { flexWrap: 'wrap' }]}>
            <Opcao texto="Qualquer" ativo={d.modalidade === null} onPress={() => mudar({ modalidade: null })} />
            {ListaModalidades.map((m: Modalidade) => (
              <Opcao
                key={m}
                texto={infoModalidade(m).nome}
                cor={infoModalidade(m).cor}
                ativo={d.modalidade === m}
                onPress={() => mudar({ modalidade: m })}
              />
            ))}
          </View>
        </View>

        <View style={estilos.bloco}>
          <Texto variante="rotulo">COMEÇA</Texto>
          <View style={[estilos.linha, { flexWrap: 'wrap' }]}>
            {inicios.map(([t, iso]) => (
              <Opcao key={t} texto={`${t} (${dataBR(iso)})`} ativo={d.inicio === iso} onPress={() => escolherInicio(iso)} />
            ))}
          </View>
          <Texto variante="rotulo" style={{ marginTop: Espaco.sm }}>
            DURA
          </Texto>
          <View style={[estilos.linha, { flexWrap: 'wrap' }]}>
            {duracoes.map(([t, iso]) => (
              <Opcao key={t} texto={t} ativo={d.fim === iso} onPress={() => mudar({ fim: iso })} />
            ))}
          </View>
          <Texto variante="subtitulo" cor={Cores.verde} style={{ marginTop: Espaco.xs }}>
            {dataBR(d.inicio)} até {dataBR(d.fim)}
          </Texto>
        </View>

        {erro ? (
          <Texto variante="corpo" cor={Cores.perigo}>
            {erro}
          </Texto>
        ) : null}

        <Botao titulo={salvando ? 'Salvando...' : novo ? 'Criar desafio' : 'Salvar'} disabled={salvando} onPress={salvar} />

        {!novo ? (
          <>
            <View style={{ gap: Espaco.sm, marginTop: Espaco.md }}>
              <Texto variante="rotulo">CLASSIFICAÇÃO · {ranking.length} {ranking.length === 1 ? 'PESSOA' : 'PESSOAS'}</Texto>
              <RankingDesafio linhas={ranking} meta={d.meta} medida={d.medida} />
            </View>
            <Botao titulo="Apagar desafio" tipo="secundario" cor={Cores.perigo} onPress={apagar} />
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, gap: Espaco.lg, paddingBottom: Espaco.xxl },
  bloco: { gap: Espaco.sm },
  linha: { flexDirection: 'row', gap: Espaco.sm, alignItems: 'center' },
  opcao: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: Raio.pilula,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    backgroundColor: Cores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
