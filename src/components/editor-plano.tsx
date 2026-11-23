import { router, useNavigation } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { EscolherExercicio } from '@/components/escolher-exercicio';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Fontes, ListaModalidades, Modalidades, Raio } from '@/constants/theme';
import {
  apagarPlano,
  carregarPlano,
  novaChave,
  planoEmBranco,
  proximaLetra,
  salvarPlano,
  treinoVazio,
  type ExercicioNoPlano,
  type PlanoEditavel,
} from '@/lib/personal';
import { rotuloTreino } from '@/lib/rotulo';
import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';

// Editor de plano: usado pelo personal (planos de aluno e modelos) e pelo aluno (o próprio treino).
// id: 'novo' (com alunoNovo), 'modelo' ou o id do plano.
// Cada treino escolhe a modalidade: musculação = lista de exercícios; as outras = descrição + duração (+ distância).

const DIAS = [
  { n: 1, t: 'seg' },
  { n: 2, t: 'ter' },
  { n: 3, t: 'qua' },
  { n: 4, t: 'qui' },
  { n: 5, t: 'sex' },
  { n: 6, t: 'sáb' },
  { n: 0, t: 'dom' },
];

function CampoPequeno({ rotulo, valor, aoMudar, teclado = 'number-pad', largura }: { rotulo: string; valor: string; aoMudar: (v: string) => void; teclado?: 'number-pad' | 'decimal-pad'; largura?: number }) {
  return (
    <View style={[estilos.campoPequeno, largura ? { flex: 0, width: largura } : null]}>
      <Texto variante="legenda" style={{ fontSize: 11 }}>
        {rotulo}
      </Texto>
      <TextInput
        value={valor}
        onChangeText={aoMudar}
        keyboardType={teclado}
        selectTextOnFocus
        placeholder="—"
        placeholderTextColor={Cores.textoApagado}
        style={estilos.campoPequenoTexto}
      />
    </View>
  );
}

type Props = { id: string; aluno?: string; modo: 'personal' | 'aluno' };

export function EditorPlano({ id, aluno, modo }: Props) {
  const { gymId, sessao } = useSessao();
  const ehAluno = modo === 'aluno';
  const navigation = useNavigation();
  const [plano, setPlano] = useState<PlanoEditavel | null>(null);
  const [nomeAluno, setNomeAluno] = useState('');
  const [aba, setAba] = useState(0);
  const [escolhendo, setEscolhendo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const mudou = useRef(false);

  useEffect(() => {
    if (!gymId) return;
    (async () => {
      try {
        const p = id === 'novo' ? planoEmBranco(aluno ?? null) : id === 'modelo' ? planoEmBranco(null) : await carregarPlano(id, gymId);
        if (ehAluno && id === 'novo') p.nome = 'Meu treino';
        setPlano(p);
        if (p.alunoId && !ehAluno) {
          const { data } = await supabase.from('profiles').select('nome').eq('id', p.alunoId).maybeSingle();
          setNomeAluno(data?.nome ?? '');
        }
      } catch (e: any) {
        Alert.alert('Não deu para abrir o plano', e.message);
        router.back();
      }
    })();
  }, [id, aluno, gymId, ehAluno]);

  // Avisa antes de sair sem salvar
  useEffect(() => {
    const sair = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (!mudou.current) return;
      e.preventDefault();
      Alert.alert('Sair sem salvar?', 'As mudanças no plano vão se perder.', [
        { text: 'Continuar editando', style: 'cancel' },
        { text: 'Sair sem salvar', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
      ]);
    });
    return sair;
  }, [navigation]);

  if (!plano || !gymId || !sessao) {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo="Plano" />
        <ActivityIndicator color={Cores.verde} style={{ marginTop: 80 }} />
      </SafeAreaView>
    );
  }

  const treino = plano.treinos[Math.min(aba, plano.treinos.length - 1)];
  const ehModelo = !plano.alunoId;

  function mudar(f: (p: PlanoEditavel) => void) {
    mudou.current = true;
    setPlano((p) => {
      if (!p) return p;
      const c: PlanoEditavel = JSON.parse(JSON.stringify(p));
      f(c);
      return c;
    });
  }

  const mudarExercicio = (i: number, campo: keyof ExercicioNoPlano, valor: string) =>
    mudar((p) => {
      (p.treinos[aba].exercicios[i] as any)[campo] = campo === 'observacao' ? valor : valor.replace(/[^0-9,]/g, '');
    });

  function mover(i: number, delta: number) {
    Haptics.selectionAsync();
    mudar((p) => {
      const lista = p.treinos[aba].exercicios;
      const j = i + delta;
      if (j < 0 || j >= lista.length) return;
      [lista[i], lista[j]] = [lista[j], lista[i]];
    });
  }

  function removerExercicio(i: number) {
    mudar((p) => {
      p.treinos[aba].exercicios.splice(i, 1);
    });
  }

  function adicionarTreino() {
    if (plano!.treinos.length >= 8) return;
    const letra = proximaLetra(plano!.treinos);
    mudar((p) => {
      p.treinos.push(treinoVazio(letra));
    });
    setAba(plano!.treinos.length);
  }

  function removerTreino() {
    if (plano!.treinos.length <= 1) return;
    Alert.alert(`Apagar o treino ${rotuloTreino(treino)}?`, 'Os exercícios dele saem do plano.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          mudar((p) => {
            p.treinos.splice(aba, 1);
            p.treinos.forEach((t, i) => {
              t.letra = 'ABCDEFGH'[i];
            });
          });
          setAba(0);
        },
      },
    ]);
  }

  async function salvar() {
    setSalvando(true);
    try {
      const novoId = await salvarPlano(plano!, gymId!, sessao!.user.id);
      mudou.current = false;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (ehAluno) {
        router.back();
        return;
      }
      if (!plano!.id) router.replace(`/personal/plano/${novoId}`);
      else setPlano((p) => (p ? { ...p, id: novoId } : p));
      Alert.alert('Plano salvo', ehModelo ? 'O modelo está pronto para usar.' : 'O aluno já vê o plano novo no app.');
    } catch (e: any) {
      Alert.alert('Não deu para salvar', e.message);
    } finally {
      setSalvando(false);
    }
  }

  function apagar() {
    if (!plano!.id) return router.back();
    Alert.alert(ehModelo ? 'Apagar modelo?' : 'Apagar plano?', 'Isso não pode ser desfeito. O histórico de treinos do aluno continua.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: async () => {
          try {
            await apagarPlano(plano!.id!);
            mudou.current = false;
            router.back();
          } catch (e: any) {
            Alert.alert('Não deu para apagar', e.message);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo
        titulo={ehAluno ? 'Meu treino' : ehModelo ? 'Modelo' : `Plano · ${nomeAluno.split(' ')[0] ?? ''}`}
        direita={
          <Pressable onPress={salvar} disabled={salvando} hitSlop={10}>
            <Texto variante="corpo" cor={Cores.verde} style={{ fontFamily: Fontes.textoSemi }}>
              {salvando ? '...' : 'Salvar'}
            </Texto>
          </Pressable>
        }
      />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', gap: Espaco.sm }}>
            <View style={{ flex: 1, gap: 4 }}>
              <Texto variante="rotulo">{ehModelo ? 'NOME DO MODELO' : 'NOME DO PLANO'}</Texto>
              <Campo value={plano.nome} onChangeText={(t) => mudar((p) => void (p.nome = t))} style={{ minHeight: 50, fontSize: 16 }} />
            </View>
            {!ehModelo && !ehAluno ? (
              <View style={{ width: 118, gap: 4 }}>
                <Texto variante="rotulo">VENCE</Texto>
                <Campo
                  value={plano.fim}
                  onChangeText={(t) => mudar((p) => void (p.fim = t.replace(/[^0-9/]/g, '')))}
                  placeholder="dd/mm/aaaa"
                  keyboardType="numbers-and-punctuation"
                  style={{ minHeight: 50, fontSize: 16 }}
                />
              </View>
            ) : null}
          </View>

          <View style={{ gap: 4 }}>
            <Texto variante="rotulo">{ehAluno ? 'OBJETIVO / ANOTAÇÕES (OPCIONAL)' : 'OBJETIVO E ORIENTAÇÕES DO PLANO (OPCIONAL)'}</Texto>
            <Campo
              value={plano.observacao}
              onChangeText={(t) => mudar((p) => void (p.observacao = t))}
              placeholder={ehAluno ? 'Ex.: ganhar força; subir carga a cada 2 semanas' : 'Ex.: objetivo força e hipertrofia. Suba a carga quando fizer o máximo de reps em todas as séries.'}
              multiline
              style={{ minHeight: 64, fontSize: 15, paddingVertical: 12 }}
            />
          </View>

          {/* Abas dos treinos */}
          <View style={estilos.abas}>
            {plano.treinos.map((t, i) => (
              <Pressable
                key={t.chave}
                onPress={() => setAba(i)}
                style={[estilos.aba, i === aba && { backgroundColor: Modalidades[t.modalidade]?.cor ?? Cores.verde }]}>
                <Texto
                  variante="subtitulo"
                  cor={i === aba ? Cores.preto : Cores.textoSecundario}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{ fontSize: 17, paddingHorizontal: 4 }}>
                  {rotuloTreino(t)}
                </Texto>
              </Pressable>
            ))}
            {plano.treinos.length < 8 ? (
              <Pressable onPress={adicionarTreino} style={estilos.aba}>
                <Texto variante="subtitulo" cor={Cores.verde} style={{ fontSize: 18 }}>
                  + Treino
                </Texto>
              </Pressable>
            ) : null}
          </View>

          <View style={{ gap: Espaco.sm }}>
            <Campo
              value={treino.nome}
              onChangeText={(t) => mudar((p) => void (p.treinos[aba].nome = t))}
              placeholder="Nome do treino (ex.: Costas e bíceps)"
              style={{ minHeight: 50, fontFamily: Fontes.titulo, fontSize: 22, textTransform: 'uppercase' }}
            />
            <View style={{ flexDirection: 'row', gap: Espaco.sm, alignItems: 'center' }}>
              <View style={{ width: 130, gap: 4 }}>
                <Texto variante="rotulo">NOME CURTO</Texto>
                <Campo
                  value={treino.rotulo}
                  onChangeText={(t) => mudar((p) => void (p.treinos[aba].rotulo = t.slice(0, 10)))}
                  placeholder={rotuloTreino({ ...treino, rotulo: '' })}
                  autoCapitalize="characters"
                  maxLength={10}
                  style={{ minHeight: 46, fontFamily: Fontes.titulo, fontSize: 20 }}
                />
              </View>
              <Texto variante="legenda" style={{ flex: 1, marginTop: 18 }}>
                Aparece grande no app (PUSH, PULL, LEGS...). Vazio = automático.
              </Texto>
            </View>
            <Campo
              value={treino.observacao}
              onChangeText={(t) => mudar((p) => void (p.treinos[aba].observacao = t))}
              placeholder="Orientação do dia (opcional). Ex.: foco na descida lenta; última série até a falha."
              multiline
              style={{ minHeight: 56, fontSize: 15, paddingVertical: 10 }}
            />
            <View style={estilos.modalidades}>
              {ListaModalidades.map((m) => {
                const on = treino.modalidade === m;
                const cor = Modalidades[m].cor;
                return (
                  <Pressable
                    key={m}
                    onPress={() => mudar((p) => void (p.treinos[aba].modalidade = m))}
                    style={[estilos.modalidade, { borderColor: on ? cor : Cores.borda }, on && { backgroundColor: cor }]}>
                    <Texto variante="legenda" cor={on ? Cores.preto : Cores.texto} style={{ fontFamily: Fontes.textoSemi }}>
                      {Modalidades[m].nome}
                    </Texto>
                  </Pressable>
                );
              })}
            </View>
            <View style={estilos.dias}>
              {DIAS.map((d) => {
                const on = treino.diasSemana.includes(d.n);
                return (
                  <Pressable
                    key={d.n}
                    onPress={() =>
                      mudar((p) => {
                        const ds = p.treinos[aba].diasSemana;
                        p.treinos[aba].diasSemana = on ? ds.filter((x) => x !== d.n) : [...ds, d.n];
                      })
                    }
                    style={[estilos.dia, on && estilos.diaOn]}>
                    <Texto variante="legenda" cor={on ? Cores.preto : Cores.textoSecundario} style={{ fontFamily: Fontes.textoSemi }}>
                      {d.t}
                    </Texto>
                  </Pressable>
                );
              })}
            </View>
            <Texto variante="legenda">
              {ehAluno ? 'Dias marcados = treino de hoje nesses dias.' : 'Dias marcados = treino de hoje do aluno nesses dias.'} Sem dia marcado, segue a ordem A, B, C.
            </Texto>
          </View>

          {treino.modalidade !== 'musculacao' ? (
            <View style={{ gap: Espaco.sm }}>
              <Texto variante="rotulo">O QUE FAZER</Texto>
              <Campo
                value={treino.descricao}
                onChangeText={(t) => mudar((p) => void (p.treinos[aba].descricao = t))}
                placeholder={
                  treino.modalidade === 'cross'
                    ? 'Ex.: Aquecimento 10 min. WOD AMRAP 15: 10 thrusters 30 kg, 15 box jumps, 200 m remo.'
                    : treino.modalidade === 'corrida'
                      ? 'Ex.: 10 min leve + 6 × 400 m forte com 1 min trotando + 10 min leve.'
                      : treino.modalidade === 'bike'
                        ? 'Ex.: 40 min em zona 2, cadência 85–90.'
                        : 'Ex.: circuito 4 voltas: 12 KB swing, 10 burpees, 300 m remo, 20 wall balls.'
                }
                multiline
                style={{ minHeight: 130, fontSize: 15, paddingVertical: 12, textAlignVertical: 'top' }}
              />
              <View style={{ flexDirection: 'row', gap: Espaco.sm }}>
                <View style={{ flex: 1, gap: 4 }}>
                  <Texto variante="rotulo">DURAÇÃO (MIN)</Texto>
                  <Campo
                    value={treino.duracaoMin}
                    onChangeText={(t) => mudar((p) => void (p.treinos[aba].duracaoMin = t.replace(/\D/g, '')))}
                    keyboardType="number-pad"
                    placeholder="45"
                    style={{ minHeight: 50, fontSize: 16 }}
                  />
                </View>
                {treino.modalidade === 'corrida' || treino.modalidade === 'bike' ? (
                  <View style={{ flex: 1, gap: 4 }}>
                    <Texto variante="rotulo">DISTÂNCIA (KM)</Texto>
                    <Campo
                      value={treino.distanciaKm}
                      onChangeText={(t) => mudar((p) => void (p.treinos[aba].distanciaKm = t.replace(/[^0-9,]/g, '')))}
                      keyboardType="decimal-pad"
                      placeholder={treino.modalidade === 'corrida' ? '5' : '20'}
                      style={{ minHeight: 50, fontSize: 16 }}
                    />
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {treino.modalidade === 'musculacao' && treino.exercicios.map((e, i) => (
            <View key={e.chave} style={estilos.exercicio}>
              <View style={estilos.exTopo}>
                <View style={[estilos.video, !e.temVideo && estilos.semVideo]}>
                  <Texto variante="legenda" cor={e.temVideo ? Cores.preto : Cores.textoApagado} style={{ fontSize: 11 }}>
                    {e.temVideo ? '▶' : '＋'}
                  </Texto>
                </View>
                <Texto variante="corpo" style={{ flex: 1, fontFamily: Fontes.textoSemi }}>
                  {i + 1}. {e.nome}
                </Texto>
                <Pressable onPress={() => mover(i, -1)} hitSlop={6} style={estilos.seta}>
                  <Texto variante="corpo" cor={i === 0 ? Cores.borda : Cores.textoSecundario}>
                    ↑
                  </Texto>
                </Pressable>
                <Pressable onPress={() => mover(i, 1)} hitSlop={6} style={estilos.seta}>
                  <Texto variante="corpo" cor={i === treino.exercicios.length - 1 ? Cores.borda : Cores.textoSecundario}>
                    ↓
                  </Texto>
                </Pressable>
                <Pressable onPress={() => removerExercicio(i)} hitSlop={6} style={estilos.seta}>
                  <Texto variante="corpo" cor={Cores.perigo}>
                    ✕
                  </Texto>
                </Pressable>
              </View>
              <View style={estilos.campos}>
                <CampoPequeno rotulo="séries" valor={e.series} aoMudar={(v) => mudarExercicio(i, 'series', v)} />
                <CampoPequeno rotulo="reps de" valor={e.repsMin} aoMudar={(v) => mudarExercicio(i, 'repsMin', v)} />
                <CampoPequeno rotulo="até" valor={e.repsMax} aoMudar={(v) => mudarExercicio(i, 'repsMax', v)} />
                <CampoPequeno rotulo="kg" valor={e.carga} aoMudar={(v) => mudarExercicio(i, 'carga', v)} teclado="decimal-pad" />
                <CampoPequeno rotulo="desc. s" valor={e.descanso} aoMudar={(v) => mudarExercicio(i, 'descanso', v)} />
              </View>
              <TextInput
                value={e.observacao}
                onChangeText={(v) => mudarExercicio(i, 'observacao', v)}
                placeholder="Observação (ex.: segura 1 s embaixo)"
                placeholderTextColor={Cores.textoApagado}
                style={estilos.obs}
              />
            </View>
          ))}

          {treino.modalidade === 'musculacao' ? (
            <>
              <Botao titulo="+ Exercício" tipo="secundario" onPress={() => setEscolhendo(true)} />
              <View style={{ gap: 4 }}>
                <Texto variante="rotulo">CARDIO NO FIM (OPCIONAL)</Texto>
                <Campo
                  value={treino.cardio}
                  onChangeText={(t) => mudar((p) => void (p.treinos[aba].cardio = t))}
                  placeholder="Ex.: 40 min de esteira, inclinação 6"
                  style={{ minHeight: 50, fontSize: 15 }}
                />
              </View>
            </>
          ) : null}

          <View style={estilos.rodapeLinks}>
            {plano.treinos.length > 1 ? (
              <Pressable onPress={removerTreino} hitSlop={8}>
                <Texto variante="corpo" cor={Cores.perigo}>
                  Apagar este treino
                </Texto>
              </Pressable>
            ) : (
              <View />
            )}
            {plano.id ? (
              <Pressable onPress={apagar} hitSlop={8}>
                <Texto variante="corpo" cor={Cores.textoSecundario}>
                  {ehModelo ? 'Apagar modelo' : 'Apagar plano'}
                </Texto>
              </Pressable>
            ) : null}
          </View>

          <Botao titulo={salvando ? 'Salvando...' : ehAluno ? 'Salvar meu treino' : 'Salvar plano'} onPress={salvar} disabled={salvando} />
        </ScrollView>
      </KeyboardAvoidingView>

      <EscolherExercicio
        visivel={escolhendo}
        gymId={gymId}
        aoFechar={() => setEscolhendo(false)}
        aoEscolher={(lista) =>
          mudar((p) => {
            for (const x of lista) {
              p.treinos[aba].exercicios.push({
                chave: novaChave(),
                exercicioId: x.id,
                nome: x.nome,
                grupo: x.grupo,
                temVideo: !!x.videoUrl,
                series: '3',
                repsMin: '10',
                repsMax: '12',
                carga: '',
                descanso: '90',
                observacao: '',
              });
            }
          })
        }
      />
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { paddingHorizontal: Espaco.lg - 4, paddingBottom: Espaco.xl, gap: Espaco.md },
  abas: { flexDirection: 'row', gap: 6, backgroundColor: Cores.superficie, borderRadius: 12, padding: 4 },
  aba: { flex: 1, height: 42, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  abaAtiva: { backgroundColor: Cores.verde },
  dias: { flexDirection: 'row', gap: 6 },
  modalidades: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modalidade: { paddingHorizontal: 12, height: 34, borderRadius: 99, borderWidth: 1.5, justifyContent: 'center', backgroundColor: Cores.superficie },
  dia: {
    flex: 1,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    backgroundColor: Cores.superficie,
    alignItems: 'center',
    justifyContent: 'center',
  },
  diaOn: { backgroundColor: Cores.verde, borderColor: Cores.verde },
  exercicio: { backgroundColor: Cores.superficie, borderRadius: Raio.md, padding: 12, gap: 8 },
  exTopo: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  video: { width: 26, height: 26, borderRadius: 7, backgroundColor: Cores.verde, alignItems: 'center', justifyContent: 'center' },
  semVideo: { backgroundColor: Cores.superficieAlta, borderWidth: 1, borderStyle: 'dashed', borderColor: Cores.borda },
  seta: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  campos: { flexDirection: 'row', gap: 6 },
  campoPequeno: { flex: 1, backgroundColor: Cores.superficieAlta, borderRadius: 8, paddingHorizontal: 8, paddingTop: 4, paddingBottom: 2 },
  campoPequenoTexto: { color: Cores.texto, fontFamily: Fontes.display, fontSize: 20, padding: 0, height: 28 },
  obs: {
    backgroundColor: Cores.superficieAlta,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: Cores.texto,
    fontFamily: Fontes.texto,
    fontSize: 14,
  },
  rodapeLinks: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Espaco.xs },
});
