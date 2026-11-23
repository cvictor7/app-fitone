import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { BarraProgresso } from '@/components/card-desafio';
import { RankingDesafio } from '@/components/ranking-desafio';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio, infoModalidade } from '@/constants/theme';
import {
  entrarNoDesafio,
  listarDesafios,
  rankingDesafio,
  situacao,
  textoMeta,
  textoPeriodo,
  type Desafio,
  type LinhaDesafio,
} from '@/lib/desafios';
import { useSessao } from '@/lib/sessao';

// Aluno · um desafio: o que é, meu progresso, entrar/sair e a classificação.

export default function TelaDesafio() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { gymId } = useSessao();
  const [d, setD] = useState<Desafio | null | undefined>(undefined);
  const [ranking, setRanking] = useState<LinhaDesafio[]>([]);
  const [mexendo, setMexendo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (!gymId) return;
    try {
      const [lista, r] = await Promise.all([listarDesafios(gymId), rankingDesafio(id)]);
      setD(lista.find((x) => x.id === id) ?? null);
      setRanking(r);
    } catch {
      setErro('Não deu para carregar. Puxe para baixo para tentar de novo.');
      setD((atual) => atual ?? null);
    }
  }, [gymId, id]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function alternar() {
    if (!d) return;
    setErro(null);
    setMexendo(true);
    try {
      await entrarNoDesafio(d.id, !d.entrei);
      if (!d.entrei) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await carregar();
    } catch {
      setErro(d.entrei ? 'Não deu para sair agora.' : 'Não deu para entrar. O desafio pode ter acabado.');
    } finally {
      setMexendo(false);
    }
  }

  if (d === undefined) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Desafio" />
        <ActivityIndicator color={Cores.verde} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  if (d === null) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Desafio" />
        <Texto variante="corpo" cor={Cores.textoSecundario} style={{ padding: Espaco.lg }}>
          {erro ?? 'Esse desafio não existe mais.'}
        </Texto>
      </SafeAreaView>
    );
  }

  const s = situacao(d);
  const completou = d.entrei && d.meuProgresso >= d.meta;
  const falta = Math.max(0, d.meta - d.meuProgresso);

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo="Desafio" />
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        refreshControl={<RefreshControl refreshing={false} onRefresh={carregar} tintColor={Cores.verde} />}>
        <View style={{ gap: 4 }}>
          <Texto variante="rotulo" cor={s === 'valendo' ? Cores.verde : Cores.textoSecundario}>
            {s === 'valendo' ? 'VALENDO' : s === 'em-breve' ? 'EM BREVE' : 'ENCERRADO'}
            {d.modalidade ? ` · ${infoModalidade(d.modalidade).nome.toUpperCase()}` : ' · QUALQUER TREINO'}
          </Texto>
          <Texto variante="titulo">{d.titulo}</Texto>
          <Texto variante="legenda">{textoPeriodo(d)}</Texto>
        </View>

        {d.descricao ? <Texto variante="corpo">{d.descricao}</Texto> : null}

        <View style={estilos.meta}>
          <Texto variante="rotulo">META</Texto>
          <Texto variante="display" cor={Cores.verde} style={{ fontSize: 56, lineHeight: 58 }}>
            {textoMeta(d.medida, d.meta).toUpperCase()}
          </Texto>
          <Texto variante="legenda">
            {d.medida === 'treinos' ? 'Conta cada treino concluído no app' : 'Soma o tempo dos treinos concluídos no app'}
            {d.modalidade ? ` de ${infoModalidade(d.modalidade).nome}` : ''}, dentro do período.
          </Texto>
        </View>

        {d.entrei ? (
          <View style={[estilos.meta, completou && { borderColor: Cores.verde }]}>
            <Texto variante="rotulo" cor={completou ? Cores.verde : Cores.textoSecundario}>
              {completou ? 'DESAFIO CONCLUÍDO ✓' : 'SEU PROGRESSO'}
            </Texto>
            <Texto variante="numero" style={{ fontSize: 40, lineHeight: 42 }}>
              {d.meuProgresso}
              <Texto variante="corpo" cor={Cores.textoSecundario}>
                {' '}
                / {textoMeta(d.medida, d.meta)}
              </Texto>
            </Texto>
            <BarraProgresso valor={d.meuProgresso} meta={d.meta} />
            {!completou && s !== 'acabou' ? (
              <Texto variante="legenda">Faltam {textoMeta(d.medida, falta)}.</Texto>
            ) : null}
          </View>
        ) : null}

        {erro ? (
          <Texto variante="corpo" cor={Cores.perigo}>
            {erro}
          </Texto>
        ) : null}

        {s !== 'acabou' || d.entrei ? (
          <View style={{ gap: Espaco.xs }}>
            <Botao
              titulo={mexendo ? '...' : d.entrei ? 'Sair do desafio' : 'Entrar no desafio'}
              tipo={d.entrei ? 'secundario' : 'principal'}
              disabled={mexendo}
              onPress={alternar}
            />
            {!d.entrei ? (
              <Texto variante="legenda" style={{ textAlign: 'center' }}>
                Quem está no desafio vê seu progresso, com seu nome abreviado.
              </Texto>
            ) : null}
          </View>
        ) : null}

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">CLASSIFICAÇÃO · {d.participantes} {d.participantes === 1 ? 'PESSOA' : 'PESSOAS'}</Texto>
          <RankingDesafio linhas={ranking} meta={d.meta} medida={d.medida} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, gap: Espaco.lg, paddingBottom: Espaco.xxl },
  meta: {
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    padding: Espaco.md,
    gap: 6,
  },
});
