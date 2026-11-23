import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { Texto } from '@/components/texto';
import { ListaExercicios } from '@/components/lista-exercicios';
import { VideoExercicio } from '@/components/video-exercicio';
import { Cores, Espaco, Fontes, Raio } from '@/constants/theme';
import { useDadosAluno } from '@/lib/dados';
import { agendarFimDescanso, cancelarAvisoDescanso, pedirPermissaoAviso } from '@/lib/descanso';
import { useSessao } from '@/lib/sessao';
import {
  apagarTreinoAtivo,
  guardarTreinoAtivo,
  lerTreinoAtivo,
  montarTreinoAtivo,
  salvarTreino,
  type ExercicioAtivo,
  type TreinoAtivo,
} from '@/lib/treino-ativo';

// MODO TREINO
// Faixa com todos os exercícios no topo (dá para fazer fora da ordem), séries já preenchidas
// com a carga da última vez, descanso automático com −15/+15 e botões grandes.

function mmss(totalS: number) {
  const s = Math.max(0, Math.round(totalS));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`;
}

function textoAnterior(a?: { kg: number | null; reps: number | null }) {
  if (!a) return '—';
  const kg = a.kg === null ? '—' : String(a.kg).replace('.', ',');
  return `${kg} × ${a.reps ?? '—'}`;
}

const exercicioCompleto = (e: ExercicioAtivo) => e.series.length > 0 && e.series.every((s) => s.feita);

export default function ModoTreino() {
  useKeepAwake(); // tela não apaga durante o treino
  const { treinoId } = useLocalSearchParams<{ treinoId: string }>();
  const { gymId } = useSessao();
  const dados = useDadosAluno();

  const [treino, setTreino] = useState<TreinoAtivo | null>(null);
  const [agora, setAgora] = useState(Date.now());
  const [descansoFim, setDescansoFim] = useState<number | null>(null);
  const [descansoTotal, setDescansoTotal] = useState(0);
  const [salvando, setSalvando] = useState(false);
  const [verVideo, setVerVideo] = useState(false);
  const [verLista, setVerLista] = useState(false);
  const iniciou = useRef(false);
  const faixa = useRef<ComponentRef<typeof ScrollView>>(null);

  // ---------- abrir: continua o que estava salvo no celular ou monta um novo
  useEffect(() => {
    if (iniciou.current || dados.carregando) return;
    const base = dados.plano?.treinos.find((t) => t.id === treinoId);
    iniciou.current = true;

    (async () => {
      const salvo = await lerTreinoAtivo();
      if (salvo && salvo.treinoId === treinoId) return setTreino(salvo);

      const comecarNovo = async () => {
        if (!base) return;
        const novo = await montarTreinoAtivo(base, gymId);
        await guardarTreinoAtivo(novo);
        setTreino(novo);
      };

      if (salvo) {
        Alert.alert(
          `Treino ${salvo.letra} em andamento`,
          `Você começou o treino ${salvo.letra} (${salvo.nome}) e não terminou.`,
          [
            { text: `Continuar o ${salvo.letra}`, onPress: () => setTreino(salvo) },
            {
              text: `Descartar e começar o ${base?.letra ?? ''}`,
              style: 'destructive',
              onPress: async () => {
                await apagarTreinoAtivo();
                await comecarNovo();
              },
            },
          ],
        );
        return;
      }
      await comecarNovo();
    })();
  }, [dados.carregando, dados.plano, treinoId, gymId]);

  // relógio da tela (tempo de treino e descanso)
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  // fim do descanso com o app aberto: vibra e some
  useEffect(() => {
    if (descansoFim !== null && agora >= descansoFim) {
      setDescansoFim(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      cancelarAvisoDescanso();
    }
  }, [agora, descansoFim]);

  // toda mudança vai para o armazenamento do celular
  const atualizar = useCallback((muda: (t: TreinoAtivo) => TreinoAtivo) => {
    setTreino((t) => {
      if (!t) return t;
      const novo = muda(JSON.parse(JSON.stringify(t)) as TreinoAtivo);
      guardarTreinoAtivo(novo);
      return novo;
    });
  }, []);

  if (!treino) {
    return (
      <SafeAreaView style={estilos.tela}>
        <ActivityIndicator color={Cores.verde} style={{ marginTop: 120 }} />
        {!dados.carregando && iniciou.current && !dados.plano?.treinos.some((t) => t.id === treinoId) ? (
          <Texto variante="corpo" style={{ textAlign: 'center', marginTop: Espaco.lg }}>
            Treino não encontrado.
          </Texto>
        ) : null}
      </SafeAreaView>
    );
  }

  const ex = treino.exercicios[treino.atual];
  const proximaSerie = ex.series.findIndex((s) => !s.feita);
  const totalSeries = treino.exercicios.reduce((t, e) => t + e.series.length, 0);
  const seriesFeitas = treino.exercicios.reduce((t, e) => t + e.series.filter((s) => s.feita).length, 0);
  const tudoFeito = seriesFeitas === totalSeries;
  const faltaCardio = !!treino.cardio && !treino.cardioFeito;
  const proximoExercicio = treino.exercicios.findIndex((e, i) => i !== treino.atual && !exercicioCompleto(e));
  const restanteDescanso = descansoFim === null ? 0 : (descansoFim - agora) / 1000;

  function irPara(i: number) {
    Haptics.selectionAsync();
    atualizar((t) => ({ ...t, atual: i }));
    faixa.current?.scrollTo({ x: Math.max(0, 90 + i * 54 - 120), animated: true });
  }

  function iniciarDescanso(segundos: number, textoProximo: string) {
    if (segundos <= 0) return;
    setDescansoTotal(segundos);
    setDescansoFim(Date.now() + segundos * 1000);
    pedirPermaoEAgendar(segundos, textoProximo);
  }

  async function pedirPermaoEAgendar(segundos: number, textoProximo: string) {
    await pedirPermissaoAviso();
    await agendarFimDescanso(segundos, textoProximo);
  }

  function ajustarDescanso(delta: number) {
    if (descansoFim === null) return;
    Haptics.selectionAsync();
    const fim = Math.max(Date.now() + 1000, descansoFim + delta * 1000);
    setDescansoFim(fim);
    setDescansoTotal((t) => Math.max(1, t + delta));
    agendarFimDescanso((fim - Date.now()) / 1000, `Hora da próxima série: ${ex.nome}`);
  }

  function pularDescanso() {
    setDescansoFim(null);
    cancelarAvisoDescanso();
  }

  function marcarSerie(i: number) {
    const serie = ex.series[i];
    const vaiMarcar = !serie.feita;
    Haptics.impactAsync(vaiMarcar ? Haptics.ImpactFeedbackStyle.Heavy : Haptics.ImpactFeedbackStyle.Light);

    atualizar((t) => {
      const e = t.exercicios[t.atual];
      e.series[i].feita = vaiMarcar;
      e.series[i].feitaEm = vaiMarcar ? new Date().toISOString() : undefined;
      // terminou o exercício: pula sozinho para o próximo que falta
      if (vaiMarcar && exercicioCompleto(e)) {
        const prox = t.exercicios.findIndex((x, j) => j > t.atual && !exercicioCompleto(x));
        const qualquer = t.exercicios.findIndex((x) => !exercicioCompleto(x));
        const destino = prox >= 0 ? prox : qualquer;
        if (destino >= 0) t.atual = destino;
      }
      return t;
    });

    if (vaiMarcar) {
      const acabouExercicio = ex.series.every((s, j) => (j === i ? true : s.feita));
      const proxNome = acabouExercicio
        ? treino!.exercicios.find((x, j) => j !== treino!.atual && !exercicioCompleto(x))?.nome
        : ex.nome;
      if (proxNome || !acabouExercicio) iniciarDescanso(ex.descansoS, `Próximo: ${proxNome ?? ex.nome}`);
      else pularDescanso();
    }
  }

  function mudarCampo(i: number, campo: 'kg' | 'reps', valor: string) {
    const limpo = valor.replace(/[^0-9,.]/g, '').replace('.', ',');
    atualizar((t) => {
      t.exercicios[t.atual].series[i][campo] = campo === 'reps' ? limpo.replace(/,/g, '') : limpo;
      return t;
    });
  }

  function somarKg(i: number, delta: number) {
    Haptics.selectionAsync();
    atualizar((t) => {
      const s = t.exercicios[t.atual].series[i];
      const atual = Number(s.kg.replace(',', '.')) || 0;
      const novo = Math.max(0, Math.round((atual + delta) * 100) / 100);
      s.kg = String(novo).replace('.', ',');
      // muda também as séries seguintes que ainda não foram feitas
      t.exercicios[t.atual].series.forEach((x, j) => {
        if (j > i && !x.feita) x.kg = s.kg;
      });
      return t;
    });
  }

  function adicionarSerie() {
    Haptics.selectionAsync();
    atualizar((t) => {
      const e = t.exercicios[t.atual];
      const ultima = e.series[e.series.length - 1];
      e.series.push({
        numero: e.series.length + 1,
        kg: ultima?.kg ?? '',
        reps: ultima?.reps ?? String(e.repsMax),
        feita: false,
      });
      return t;
    });
  }

  function removerUltimaSerie() {
    if (ex.series.length <= 1) return;
    const ultima = ex.series[ex.series.length - 1];
    if (ultima.feita) return;
    atualizar((t) => {
      t.exercicios[t.atual].series.pop();
      return t;
    });
  }

  function sair() {
    Alert.alert('Sair do treino?', 'Seu progresso fica salvo no celular.', [
      { text: 'Voltar ao treino', style: 'cancel' },
      {
        text: 'Continuar depois',
        onPress: () => {
          cancelarAvisoDescanso();
          router.back();
        },
      },
      {
        text: 'Descartar treino',
        style: 'destructive',
        onPress: async () => {
          cancelarAvisoDescanso();
          await apagarTreinoAtivo();
          router.back();
        },
      },
    ]);
  }

  async function concluir() {
    if (seriesFeitas === 0) {
      Alert.alert('Nenhuma série feita', 'Marque pelo menos uma série para concluir o treino.');
      return;
    }
    const faltam = totalSeries - seriesFeitas;
    const enviar = async () => {
      setSalvando(true);
      cancelarAvisoDescanso();
      const r = await salvarTreino(treino!);
      setSalvando(false);
      if (!r.ok) {
        Alert.alert(
          'Sem conexão',
          `O treino continua salvo no celular. Tente de novo quando tiver internet.\n(${r.erro})`,
        );
        return;
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await apagarTreinoAtivo();
      router.replace(`/sessao/concluido/${r.sessaoId}`);
    };
    if (faltam > 0) {
      Alert.alert('Concluir o treino?', `Ainda faltam ${faltam} ${faltam === 1 ? 'série' : 'séries'}.`, [
        { text: 'Continuar treinando', style: 'cancel' },
        { text: 'Concluir assim', onPress: enviar },
      ]);
    } else {
      enviar();
    }
  }

  const tempo = (agora - new Date(treino.iniciadoEm).getTime()) / 1000;

  // botão grande do rodapé muda conforme o momento
  let tituloBotao = '';
  let acaoBotao: () => void = () => {};
  if (tudoFeito && faltaCardio) {
    tituloBotao = 'Cardio feito ✓';
    acaoBotao = () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      atualizar((t) => ({ ...t, cardioFeito: true }));
    };
  } else if (tudoFeito) {
    tituloBotao = salvando ? 'Salvando...' : 'Concluir treino';
    acaoBotao = concluir;
  } else if (proximaSerie >= 0) {
    tituloBotao = `Concluir série ${proximaSerie + 1}`;
    acaoBotao = () => marcarSerie(proximaSerie);
  } else if (proximoExercicio >= 0) {
    tituloBotao = 'Próximo exercício';
    acaoBotao = () => irPara(proximoExercicio);
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      {/* Barra do alto: sair, tempo, concluir */}
      <View style={estilos.topo}>
        <Pressable onPress={sair} hitSlop={12} style={estilos.topoLado}>
          <Texto variante="corpo" cor={Cores.textoSecundario}>
            ✕ Sair
          </Texto>
        </Pressable>
        <Texto variante="subtitulo" style={{ fontSize: 20 }}>
          {treino.rotulo ?? `Treino ${treino.letra}`} · {mmss(tempo)}
        </Texto>
        <Pressable onPress={concluir} hitSlop={12} style={[estilos.topoLado, { alignItems: 'flex-end' }]} disabled={salvando}>
          <Texto variante="corpo" cor={Cores.verde} style={{ fontFamily: Fontes.textoSemi }}>
            Concluir
          </Texto>
        </Pressable>
      </View>

      {/* Faixa com todos os exercícios: toca e pula para qualquer um */}
      <View style={{ height: 62 }}>
      <ScrollView
        ref={faixa}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={estilos.faixa}>
        <Pressable accessibilityLabel="Ver lista de exercícios" onPress={() => setVerLista(true)} style={[estilos.chip, estilos.chipLista]}>
          <Texto variante="subtitulo" style={{ fontSize: 16 }}>
            ☰ Lista
          </Texto>
        </Pressable>
        {treino.exercicios.map((e, i) => {
          const completo = exercicioCompleto(e);
          const atual = i === treino.atual;
          return (
            <Pressable
              key={e.treinoExercicioId}
              accessibilityLabel={`Exercício ${i + 1}, ${e.nome}${completo ? ', feito' : ''}`}
              onPress={() => irPara(i)}
              style={[estilos.chip, completo && estilos.chipFeito, atual && estilos.chipAtual]}>
              <Texto
                variante="subtitulo"
                cor={atual ? Cores.preto : completo ? Cores.verde : Cores.textoSecundario}
                style={{ fontSize: 19 }}>
                {i + 1}
                {completo && !atual ? '✓' : ''}
              </Texto>
            </Pressable>
          );
        })}
      </ScrollView>
      </View>
      <View style={estilos.progresso}>
        <View style={[estilos.progressoCheio, { width: `${(seriesFeitas / Math.max(1, totalSeries)) * 100}%` }]} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          {tudoFeito && treino.cardio ? (
            <View style={estilos.cardio}>
              <Texto variante="rotulo" cor={Cores.amarelo}>
                {treino.cardioFeito ? 'CARDIO FEITO ✓' : 'FALTA O CARDIO'}
              </Texto>
              <Texto variante="subtitulo" style={{ fontSize: 20 }}>
                {treino.cardio}
              </Texto>
            </View>
          ) : null}

          {treino.observacaoTreino && treino.atual === 0 && seriesFeitas === 0 ? (
            <View style={estilos.cardio}>
              <Texto variante="rotulo" cor={Cores.verde}>
                ORIENTAÇÃO DO DIA
              </Texto>
              <Texto variante="corpo">{treino.observacaoTreino}</Texto>
            </View>
          ) : null}

          <View style={{ gap: 4 }}>
            <Texto variante="rotulo">
              EXERCÍCIO {treino.atual + 1} DE {treino.exercicios.length} · {ex.grupo.toUpperCase()}
            </Texto>
            <Texto variante="titulo" style={{ fontSize: 30, lineHeight: 32 }}>
              {ex.nome}
            </Texto>
            <Texto variante="legenda">
              Meta: {ex.repsMin === ex.repsMax ? ex.repsMin : `${ex.repsMin} a ${ex.repsMax}`} reps · descanso {ex.descansoS} s
            </Texto>
            {ex.observacao ? (
              <Texto variante="corpo" cor={Cores.verde}>
                {ex.observacao}
              </Texto>
            ) : null}
            {ex.midiaUrl || ex.instrucoes ? (
              <Pressable onPress={() => setVerVideo(true)} style={estilos.botaoVideo}>
                <Texto variante="corpo" style={{ fontFamily: Fontes.textoSemi }}>
                  {ex.midiaUrl ? '▶ Ver vídeo do exercício' : 'Como fazer'}
                </Texto>
              </Pressable>
            ) : null}
          </View>

          {/* Tabela de séries */}
          <View style={estilos.tabela}>
            <View style={estilos.linhaCab}>
              <Texto variante="rotulo" style={estilos.colSerie}>
                SÉRIE
              </Texto>
              <Texto variante="rotulo" style={estilos.colAnterior}>
                ANTERIOR
              </Texto>
              <Texto variante="rotulo" style={estilos.colKg}>
                KG
              </Texto>
              <Texto variante="rotulo" style={estilos.colReps}>
                REPS
              </Texto>
              <View style={estilos.colCheck} />
            </View>

            {ex.series.map((s, i) => {
              const proxima = i === proximaSerie;
              return (
                <View key={i} style={[estilos.linha, s.feita && estilos.linhaFeita]}>
                  <Texto variante="numero" style={[estilos.colSerie, { fontSize: 24, lineHeight: 26 }]}>
                    {s.numero}
                  </Texto>
                  <Texto variante="legenda" style={estilos.colAnterior}>
                    {textoAnterior(ex.anterior[i])}
                  </Texto>
                  <View style={estilos.colKg}>
                    <TextInput
                      value={s.kg}
                      onChangeText={(v) => mudarCampo(i, 'kg', v)}
                      keyboardType="decimal-pad"
                      selectTextOnFocus
                      placeholder="—"
                      placeholderTextColor={Cores.textoApagado}
                      style={[estilos.celula, proxima && estilos.celulaProxima, s.feita && estilos.celulaFeita]}
                    />
                  </View>
                  <View style={estilos.colReps}>
                    <TextInput
                      value={s.reps}
                      onChangeText={(v) => mudarCampo(i, 'reps', v)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      placeholder="—"
                      placeholderTextColor={Cores.textoApagado}
                      style={[estilos.celula, proxima && estilos.celulaProxima, s.feita && estilos.celulaFeita]}
                    />
                  </View>
                  <Pressable
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: s.feita }}
                    accessibilityLabel={`Série ${s.numero} feita`}
                    onPress={() => marcarSerie(i)}
                    hitSlop={6}
                    style={[estilos.check, s.feita && estilos.checkFeito]}>
                    <Texto variante="subtitulo" cor={s.feita ? Cores.preto : Cores.textoApagado} style={{ fontSize: 20 }}>
                      ✓
                    </Texto>
                  </Pressable>
                </View>
              );
            })}

            {/* Carga rápida da próxima série */}
            {proximaSerie >= 0 ? (
              <View style={estilos.linhaKg}>
                {[-5, -2.5, 2.5, 5].map((d) => (
                  <Pressable key={d} onPress={() => somarKg(proximaSerie, d)} style={estilos.botaoKg}>
                    <Texto variante="subtitulo" style={{ fontSize: 17 }}>
                      {d > 0 ? '+' : '−'}
                      {String(Math.abs(d)).replace('.', ',')}
                    </Texto>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>

          <View style={estilos.linhaSeries}>
            <Pressable onPress={adicionarSerie} hitSlop={8}>
              <Texto variante="corpo" cor={Cores.verde}>
                + Adicionar série
              </Texto>
            </Pressable>
            {ex.series.length > 1 && !ex.series[ex.series.length - 1].feita ? (
              <Pressable onPress={removerUltimaSerie} hitSlop={8}>
                <Texto variante="corpo" cor={Cores.textoSecundario}>
                  Tirar última
                </Texto>
              </Pressable>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Descanso automático */}
      {descansoFim !== null ? (
        <View style={estilos.descanso}>
          <View style={estilos.descansoLinha}>
            <View>
              <Texto variante="rotulo">DESCANSO</Texto>
              <Texto variante="display" style={{ fontSize: 56, lineHeight: 58 }}>
                {mmss(restanteDescanso)}
              </Texto>
            </View>
            <View style={{ flexDirection: 'row', gap: Espaco.sm }}>
              <Pressable onPress={() => ajustarDescanso(-15)} style={estilos.botaoDescanso}>
                <Texto variante="subtitulo">−15</Texto>
              </Pressable>
              <Pressable onPress={() => ajustarDescanso(15)} style={estilos.botaoDescanso}>
                <Texto variante="subtitulo">+15</Texto>
              </Pressable>
              <Pressable onPress={pularDescanso} style={[estilos.botaoDescanso, { width: 72 }]}>
                <Texto variante="subtitulo" cor={Cores.verde}>
                  Pular
                </Texto>
              </Pressable>
            </View>
          </View>
          <View style={estilos.progresso}>
            <View
              style={[
                estilos.progressoCheio,
                { width: `${Math.min(100, (1 - restanteDescanso / Math.max(1, descansoTotal)) * 100)}%` },
              ]}
            />
          </View>
        </View>
      ) : null}

      <ListaExercicios
        visivel={verLista}
        exercicios={treino.exercicios}
        atual={treino.atual}
        aoFechar={() => setVerLista(false)}
        aoEscolher={irPara}
      />

      <VideoExercicio
        visivel={verVideo}
        aoFechar={() => setVerVideo(false)}
        nome={ex.nome}
        url={ex.midiaUrl}
        instrucoes={ex.instrucoes}
      />

      <View style={estilos.rodape}>
        {tituloBotao ? <Botao titulo={tituloBotao} onPress={acaoBotao} disabled={salvando} /> : null}
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Espaco.md,
    minHeight: 48,
  },
  topoLado: { width: 80 },
  faixa: { paddingHorizontal: Espaco.md, gap: Espaco.sm, paddingVertical: Espaco.sm },
  chip: {
    width: 46,
    height: 46,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    backgroundColor: Cores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipLista: { width: 'auto', paddingHorizontal: 12 },
  chipFeito: { backgroundColor: '#1d2b10', borderColor: '#2c4a12' },
  chipAtual: { backgroundColor: Cores.verde, borderColor: Cores.verde },
  progresso: { height: 4, backgroundColor: Cores.superficieAlta, marginHorizontal: Espaco.md, borderRadius: 2, overflow: 'hidden' },
  progressoCheio: { height: '100%', backgroundColor: Cores.verde },
  conteudo: { padding: Espaco.md + 4, gap: Espaco.lg, paddingBottom: Espaco.xl },
  botaoVideo: {
    alignSelf: 'flex-start',
    marginTop: Espaco.xs,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Raio.pilula,
    backgroundColor: Cores.superficieAlta,
  },
  tabela: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, paddingHorizontal: Espaco.md, paddingBottom: Espaco.sm },
  linhaCab: { flexDirection: 'row', alignItems: 'center', paddingVertical: Espaco.sm, gap: 6 },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
  },
  linhaFeita: { opacity: 0.75 },
  colSerie: { width: 40 },
  colAnterior: { flex: 1 },
  colKg: { width: 68 },
  colReps: { width: 58 },
  colCheck: { width: 44 },
  celula: {
    height: 46,
    borderRadius: 10,
    backgroundColor: Cores.superficieAlta,
    color: Cores.texto,
    textAlign: 'center',
    fontFamily: Fontes.display,
    fontSize: 22,
    padding: 0,
  },
  celulaProxima: { borderWidth: 1.5, borderColor: Cores.verde },
  celulaFeita: { color: Cores.textoSecundario },
  check: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkFeito: { backgroundColor: Cores.verde, borderColor: Cores.verde },
  linhaKg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: Espaco.sm,
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
  },
  botaoKg: {
    flex: 1,
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: Cores.superficieAlta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardio: { backgroundColor: Cores.superficie, borderRadius: Raio.md, padding: Espaco.md, gap: 4 },
  linhaSeries: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Espaco.xs },
  descanso: {
    backgroundColor: Cores.superficie,
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
    paddingTop: Espaco.sm,
    paddingBottom: Espaco.sm,
    gap: Espaco.sm,
  },
  descansoLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Espaco.md + 4 },
  botaoDescanso: {
    width: 58,
    height: 54,
    borderRadius: 12,
    backgroundColor: Cores.superficieAlta,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rodape: { paddingHorizontal: Espaco.md + 4, paddingTop: Espaco.sm, paddingBottom: Espaco.xs },
});
