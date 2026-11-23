import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { useKeepAwake } from 'expo-keep-awake';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Fontes, Raio, infoModalidade, type Modalidade } from '@/constants/theme';
import { useDadosAluno } from '@/lib/dados';
import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';
import {
  CONFIG_PADRAO,
  EXPLICACAO_MODO,
  NOMES_MODO,
  PARTES_PROVA,
  calcular,
  mmss,
  resumoTimer,
  type ConfigTimer,
  type ModoTimer,
} from '@/lib/timer';

// Timers de Cross e Hybrid: AMRAP, EMOM, For Time, Tabata e Prova híbrida (parciais).
// Voz e vibração nas trocas de fase; no fim vira um treino salvo (com o resumo no "o que você fez").

type Etapa = 'config' | 'contagem' | 'rodando' | 'fim';

function Contador({ rotulo, valor, aoMudar, passo = 1, min = 1, max = 999, sufixo = '' }: { rotulo: string; valor: number; aoMudar: (v: number) => void; passo?: number; min?: number; max?: number; sufixo?: string }) {
  return (
    <View style={estilos.contador}>
      <Texto variante="rotulo">{rotulo}</Texto>
      <View style={estilos.contadorLinha}>
        <Pressable onPress={() => aoMudar(Math.max(min, valor - passo))} style={estilos.contadorBotao} hitSlop={6}>
          <Texto variante="subtitulo">−</Texto>
        </Pressable>
        <Texto variante="numero" style={{ fontSize: 32, lineHeight: 34, minWidth: 70, textAlign: 'center' }}>
          {valor}
          <Texto variante="legenda">{sufixo}</Texto>
        </Texto>
        <Pressable onPress={() => aoMudar(Math.min(max, valor + passo))} style={estilos.contadorBotao} hitSlop={6}>
          <Texto variante="subtitulo">+</Texto>
        </Pressable>
      </View>
    </View>
  );
}

function falar(texto: string) {
  Speech.stop();
  Speech.speak(texto, { language: 'pt-BR', rate: 1.05 });
}

export default function Timer() {
  useKeepAwake();
  const { modalidade, treino: treinoId } = useLocalSearchParams<{ modalidade: Modalidade; treino?: string }>();
  const info = infoModalidade(modalidade);
  const { gymId } = useSessao();
  const dados = useDadosAluno();
  const treinoDoPlano = treinoId ? dados.plano?.treinos.find((t) => t.id === treinoId) : undefined;
  const modos: ModoTimer[] = modalidade === 'hybrid' ? ['amrap', 'emom', 'fortime', 'tabata', 'prova'] : ['amrap', 'emom', 'fortime', 'tabata'];

  const [cfg, setCfg] = useState<ConfigTimer>(CONFIG_PADRAO);
  const [etapa, setEtapa] = useState<Etapa>('config');
  const [nota, setNota] = useState('');
  const [agora, setAgora] = useState(Date.now());
  const [inicio, setInicio] = useState(0); // quando começou (ms)
  const [pausadoEm, setPausadoEm] = useState<number | null>(null);
  const [pausadoTotal, setPausadoTotal] = useState(0);
  const [contagemAte, setContagemAte] = useState(0);
  const [rodadas, setRodadas] = useState(0);
  const [reps, setReps] = useState(0);
  const [parciais, setParciais] = useState<number[]>([]); // duração de cada parte da prova
  const [fimDecorrido, setFimDecorrido] = useState(0);
  const [sensacao, setSensacao] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const ultimoAviso = useRef('');
  const ultimoBip = useRef(-1);
  const preencheu = useRef(false);

  // treino prescrito: "o que fazer" já vem preenchido
  useEffect(() => {
    if (preencheu.current || !treinoDoPlano) return;
    preencheu.current = true;
    if (treinoDoPlano.descricao) setNota(treinoDoPlano.descricao);
    if (treinoDoPlano.duracaoMin) setCfg((c) => ({ ...c, minutos: Math.min(60, treinoDoPlano.duracaoMin!) }));
  }, [treinoDoPlano]);

  useEffect(() => {
    if (etapa !== 'contagem' && etapa !== 'rodando') return;
    const id = setInterval(() => setAgora(Date.now()), 200);
    return () => clearInterval(id);
  }, [etapa]);

  const decorrido = etapa === 'rodando' ? ((pausadoEm ?? agora) - inicio - pausadoTotal) / 1000 : fimDecorrido;
  const inicioParteAtual = parciais.reduce((a, b) => a + b, 0);
  const estado = calcular(cfg, decorrido, parciais.length);

  // contagem 3-2-1 antes de começar
  useEffect(() => {
    if (etapa !== 'contagem') return;
    const falta = Math.ceil((contagemAte - agora) / 1000);
    if (falta !== ultimoBip.current && falta > 0) {
      ultimoBip.current = falta;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      falar(String(falta));
    }
    if (agora >= contagemAte) {
      falar('Vai!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      ultimoAviso.current = calcular(cfg, 0, 0).chaveAviso;
      setInicio(Date.now());
      setPausadoTotal(0);
      setEtapa('rodando');
    }
  }, [agora, etapa, contagemAte, cfg]);

  // avisos durante o treino: troca de fase, últimos 3 segundos, fim
  useEffect(() => {
    if (etapa !== 'rodando' || pausadoEm !== null) return;
    if (estado.acabou) {
      terminar();
      return;
    }
    if (estado.chaveAviso !== ultimoAviso.current) {
      ultimoAviso.current = estado.chaveAviso;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      if (cfg.modo === 'tabata') falar(estado.fase === 'trabalho' ? 'Trabalho' : 'Descanso');
      else if (cfg.modo === 'emom') falar(estado.rotulo.split(' DE ')[0].toLowerCase());
      else if (cfg.modo === 'amrap') {
        const falta = Math.round(estado.principalS / 60);
        if (falta > 0 && (falta <= 3 || falta % 5 === 0)) falar(falta === 1 ? 'Falta um minuto' : `Faltam ${falta} minutos`);
      }
    }
    // bip nos 3 últimos segundos de cada contagem regressiva
    if (cfg.modo !== 'fortime' && cfg.modo !== 'prova') {
      const s = Math.ceil(estado.principalS);
      if (s <= 3 && s >= 1 && ultimoBip.current !== s) {
        ultimoBip.current = s;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      if (s > 3) ultimoBip.current = -1;
    }
  });

  function comecar() {
    ultimoBip.current = -1;
    setRodadas(0);
    setReps(0);
    setParciais([]);
    setPausadoEm(null);
    setContagemAte(Date.now() + 3000);
    setAgora(Date.now());
    setEtapa('contagem');
  }

  function pausar() {
    Haptics.selectionAsync();
    if (pausadoEm === null) {
      setPausadoEm(Date.now());
      Speech.stop();
    } else {
      setPausadoTotal((p) => p + (Date.now() - pausadoEm));
      setPausadoEm(null);
    }
  }

  function terminar() {
    const total = ((pausadoEm ?? Date.now()) - inicio - pausadoTotal) / 1000;
    setFimDecorrido(cfg.modo === 'amrap' ? Math.min(total, cfg.minutos * 60) : total);
    setPausadoEm(null);
    setEtapa('fim');
    falar(cfg.modo === 'fortime' ? 'Terminou!' : 'Tempo!');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  function confirmarTerminar() {
    Alert.alert('Terminar agora?', cfg.modo === 'fortime' || cfg.modo === 'prova' ? 'O tempo para aqui.' : 'O timer ainda não acabou.', [
      { text: 'Continuar', style: 'cancel' },
      { text: 'Terminar', onPress: terminar },
    ]);
  }

  function proximaParte() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const duracao = decorrido - inicioParteAtual;
    const novas = [...parciais, duracao];
    setParciais(novas);
    if (novas.length >= PARTES_PROVA.length) {
      terminar();
    } else {
      falar(PARTES_PROVA[novas.length]);
    }
  }

  // id criado no celular uma vez só: se o sinal cair e você tocar em Salvar de novo, não duplica
  const idSessao = useRef(Crypto.randomUUID()).current;

  async function salvar() {
    setSalvando(true);
    const fim = new Date();
    const resumo = resumoTimer(cfg, fimDecorrido, rodadas, reps, parciais);
    const observacao = [resumo, nota.trim()].filter(Boolean).join('\n');
    const { data, error } = await supabase
      .from('sessoes')
      .insert({
        id: idSessao,
        gym_id: gymId,
        modalidade,
        treino_id: treinoDoPlano?.id ?? null,
        origem: 'app',
        iniciada_em: new Date(fim.getTime() - fimDecorrido * 1000).toISOString(),
        concluida_em: fim.toISOString(),
        duracao_s: Math.round(fimDecorrido),
        sensacao,
        observacao,
        status: 'concluida',
      })
      .select('id')
      .single();
    setSalvando(false);
    // 23505 = já tinha salvo na tentativa anterior (a resposta é que se perdeu)
    if (error && error.code === '23505') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/sessao/concluido/${idSessao}`);
      return;
    }
    if (error) {
      Alert.alert('Não deu para salvar', `Confira a internet e tente de novo.\n(${error.message})`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/sessao/concluido/${data.id}`);
  }

  function sair() {
    if (etapa === 'config') return router.back();
    Alert.alert('Sair do timer?', 'O tempo deste treino não será salvo.', [
      { text: 'Ficar', style: 'cancel' },
      {
        text: 'Sair',
        style: 'destructive',
        onPress: () => {
          Speech.stop();
          router.back();
        },
      },
    ]);
  }

  const mudar = (p: Partial<ConfigTimer>) => setCfg((c) => ({ ...c, ...p }));

  // ------------------------------------------------------------------ CONFIGURAR
  if (etapa === 'config') {
    return (
      <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
        <BarraTopo titulo={treinoDoPlano ? treinoDoPlano.rotulo : info.nome} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
            <View style={estilos.modos}>
              {modos.map((m) => {
                const on = cfg.modo === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() =>
                      mudar({
                        modo: m,
                        ...(m === 'fortime' ? { minutos: 20 } : {}),
                        ...(m === 'amrap' ? { minutos: Math.min(90, treinoDoPlano?.duracaoMin ?? 12) } : {}),
                        ...(m === 'tabata' ? { rodadas: 8 } : {}),
                        ...(m === 'emom' ? { rodadas: 10 } : {}),
                      })
                    }
                    style={[estilos.modo, on && { backgroundColor: info.cor, borderColor: info.cor }]}>
                    <Texto variante="subtitulo" cor={on ? Cores.preto : Cores.texto} style={{ fontSize: 18 }}>
                      {NOMES_MODO[m]}
                    </Texto>
                  </Pressable>
                );
              })}
            </View>
            <Texto variante="legenda">{EXPLICACAO_MODO[cfg.modo]}</Texto>

            <View style={estilos.contadores}>
              {cfg.modo === 'amrap' ? <Contador rotulo="DURAÇÃO" valor={cfg.minutos} aoMudar={(v) => mudar({ minutos: v })} max={90} sufixo=" min" /> : null}
              {cfg.modo === 'fortime' ? (
                <Contador rotulo="LIMITE (0 = SEM)" valor={cfg.minutos} aoMudar={(v) => mudar({ minutos: v })} min={0} max={120} sufixo=" min" />
              ) : null}
              {cfg.modo === 'emom' ? (
                <>
                  <Contador rotulo="RODADAS" valor={cfg.rodadas} aoMudar={(v) => mudar({ rodadas: v })} max={60} />
                  <Contador rotulo="A CADA" valor={cfg.intervaloS} aoMudar={(v) => mudar({ intervaloS: v })} passo={15} min={15} max={300} sufixo=" s" />
                </>
              ) : null}
              {cfg.modo === 'tabata' ? (
                <>
                  <Contador rotulo="RODADAS" valor={cfg.rodadas} aoMudar={(v) => mudar({ rodadas: v })} max={40} />
                  <Contador rotulo="TRABALHO" valor={cfg.trabalhoS} aoMudar={(v) => mudar({ trabalhoS: v })} passo={5} min={5} max={300} sufixo=" s" />
                  <Contador rotulo="DESCANSO" valor={cfg.descansoS} aoMudar={(v) => mudar({ descansoS: v })} passo={5} min={0} max={300} sufixo=" s" />
                </>
              ) : null}
              {cfg.modo === 'prova' ? (
                <Texto variante="legenda">
                  {PARTES_PROVA.length} partes: {PARTES_PROVA.filter((p) => !p.startsWith('Corrida')).join(', ')}, cada uma depois de 1 km de corrida. Toque em "Próxima" ao terminar cada parte.
                </Texto>
              ) : null}
            </View>

            <View style={{ gap: 4 }}>
              <Texto variante="rotulo">O QUE FAZER (OPCIONAL)</Texto>
              <Campo
                value={nota}
                onChangeText={setNota}
                placeholder="Ex.: 10 thrusters 30 kg, 15 box jumps, 200 m remo"
                multiline
                style={{ minHeight: 90, fontSize: 15, paddingVertical: 12, textAlignVertical: 'top' }}
              />
            </View>

            <Botao titulo="Começar" cor={info.cor} onPress={comecar} />
            <Pressable
              onPress={() => router.replace(`/registro/${modalidade}${treinoId ? `?treino=${treinoId}` : ''}` as any)}
              style={{ alignSelf: 'center' }}
              hitSlop={8}>
              <Texto variante="corpo" cor={Cores.textoSecundario}>
                Só registrar, sem timer
              </Texto>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ------------------------------------------------------------------ CONTAGEM 3-2-1
  if (etapa === 'contagem') {
    const falta = Math.max(1, Math.ceil((contagemAte - agora) / 1000));
    return (
      <SafeAreaView style={[estilos.tela, { alignItems: 'center', justifyContent: 'center' }]}>
        <Texto variante="rotulo" cor={info.cor}>
          {NOMES_MODO[cfg.modo].toUpperCase()} · PREPARA
        </Texto>
        <Texto variante="display" cor={info.cor} style={{ fontSize: 220, lineHeight: 220 }}>
          {falta}
        </Texto>
      </SafeAreaView>
    );
  }

  // ------------------------------------------------------------------ FIM
  if (etapa === 'fim') {
    return (
      <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
        <BarraTopo titulo="Treino feito" aoVoltar={sair} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
            <View style={{ alignItems: 'center', gap: 4 }}>
              <Texto variante="display" cor={info.cor} style={{ fontSize: 72, lineHeight: 76 }}>
                {mmss(fimDecorrido)}
              </Texto>
              <Texto variante="subtitulo" style={{ textAlign: 'center' }}>
                {resumoTimer(cfg, fimDecorrido, rodadas, reps, parciais).split('\n')[0]}
              </Texto>
            </View>

            {cfg.modo === 'amrap' || cfg.modo === 'fortime' ? (
              <View style={estilos.linhaRodadas}>
                <Contador rotulo="RODADAS" valor={rodadas} aoMudar={setRodadas} min={0} />
                <Contador rotulo="+ REPS" valor={reps} aoMudar={setReps} min={0} />
              </View>
            ) : null}

            {cfg.modo === 'prova' && parciais.length > 0 ? (
              <View style={estilos.lista}>
                {parciais.map((p, i) => (
                  <View key={i} style={[estilos.linhaParcial, i > 0 && estilos.separador]}>
                    <Texto variante="corpo" style={{ flex: 1 }}>
                      {i + 1}. {PARTES_PROVA[i]}
                    </Texto>
                    <Texto variante="numero" style={{ fontSize: 20, lineHeight: 22 }}>
                      {mmss(p)}
                    </Texto>
                  </View>
                ))}
              </View>
            ) : null}

            <View style={{ gap: 4 }}>
              <Texto variante="rotulo">O QUE VOCÊ FEZ (OPCIONAL)</Texto>
              <Campo value={nota} onChangeText={setNota} multiline style={{ minHeight: 80, fontSize: 15, paddingVertical: 12, textAlignVertical: 'top' }} />
            </View>

            <View style={{ gap: Espaco.sm }}>
              <Texto variante="rotulo">COMO FOI?</Texto>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <Pressable key={n} onPress={() => setSensacao(n)} style={[estilos.sensacao, sensacao === n && { backgroundColor: info.cor, borderColor: info.cor }]}>
                    <Texto variante="numero" cor={sensacao === n ? Cores.preto : Cores.texto} style={{ fontSize: 26, lineHeight: 28 }}>
                      {n}
                    </Texto>
                  </Pressable>
                ))}
              </View>
            </View>

            <Botao titulo={salvando ? 'Salvando...' : 'Salvar treino'} cor={info.cor} disabled={salvando} onPress={salvar} />
            <Pressable onPress={sair} style={{ alignSelf: 'center' }} hitSlop={8}>
              <Texto variante="corpo" cor={Cores.textoSecundario}>
                Descartar
              </Texto>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ------------------------------------------------------------------ RODANDO
  const descanso = estado.fase === 'descanso';
  const corFase = descanso ? Cores.textoSecundario : info.cor;
  const pausado = pausadoEm !== null;
  const tempoParte = decorrido - inicioParteAtual;

  return (
    <SafeAreaView style={[estilos.tela, descanso && { backgroundColor: '#111311' }]} edges={['top', 'bottom']}>
      <View style={estilos.topoRodando}>
        <Pressable onPress={sair} hitSlop={12}>
          <Texto variante="corpo" cor={Cores.textoSecundario}>
            ✕ Sair
          </Texto>
        </Pressable>
        <Texto variante="subtitulo" style={{ fontSize: 18 }}>
          {NOMES_MODO[cfg.modo]}
        </Texto>
        <Pressable onPress={confirmarTerminar} hitSlop={12}>
          <Texto variante="corpo" cor={info.cor} style={{ fontFamily: Fontes.textoSemi }}>
            Terminar
          </Texto>
        </Pressable>
      </View>

      <View style={estilos.centro}>
        <Texto variante="rotulo" cor={corFase} style={{ textAlign: 'center' }}>
          {pausado ? 'PAUSADO' : estado.rotulo}
        </Texto>
        <Texto
          variante="display"
          cor={pausado ? Cores.textoApagado : corFase}
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[estilos.tempo, mmss(estado.principalS).length > 5 && { fontSize: 100, lineHeight: 104 }]}>
          {mmss(estado.principalS)}
        </Texto>
        {cfg.modo === 'prova' ? (
          <Texto variante="subtitulo" style={{ textAlign: 'center' }}>
            Esta parte: {mmss(tempoParte)}
          </Texto>
        ) : cfg.modo === 'amrap' ? (
          <Texto variante="legenda">decorrido {mmss(decorrido)}</Texto>
        ) : null}
        <View style={estilos.barra}>
          <View style={[estilos.barraCheia, { width: `${estado.progresso * 100}%`, backgroundColor: corFase }]} />
        </View>
      </View>

      {cfg.modo === 'amrap' || cfg.modo === 'fortime' ? (
        <View style={estilos.rodadasRodando}>
          <View style={{ alignItems: 'center', flex: 1 }}>
            <Texto variante="rotulo">RODADAS</Texto>
            <Texto variante="display" style={{ fontSize: 64, lineHeight: 66 }}>
              {rodadas}
            </Texto>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              setRodadas((r) => r + 1);
            }}
            onLongPress={() => setRodadas((r) => Math.max(0, r - 1))}
            style={[estilos.botaoRodada, { backgroundColor: info.cor }]}>
            <Texto variante="display" cor={Cores.preto} style={{ fontSize: 36, lineHeight: 38 }}>
              +1 RODADA
            </Texto>
            <Texto variante="legenda" cor={Cores.preto}>
              segure para tirar 1
            </Texto>
          </Pressable>
        </View>
      ) : null}

      {cfg.modo === 'prova' ? (
        <View style={{ paddingHorizontal: Espaco.lg, gap: Espaco.sm }}>
          {parciais.length > 0 ? (
            <Texto variante="legenda" numberOfLines={1}>
              Anterior: {PARTES_PROVA[parciais.length - 1]} em {mmss(parciais[parciais.length - 1])}
            </Texto>
          ) : null}
          <Pressable onPress={proximaParte} style={[estilos.botaoProxima, { backgroundColor: info.cor }]}>
            <Texto variante="display" cor={Cores.preto} style={{ fontSize: 32, lineHeight: 34 }}>
              {parciais.length + 1 >= PARTES_PROVA.length ? 'TERMINEI' : 'PRÓXIMA'}
            </Texto>
            {parciais.length + 1 < PARTES_PROVA.length ? (
              <Texto variante="legenda" cor={Cores.preto}>
                depois: {PARTES_PROVA[parciais.length + 1]}
              </Texto>
            ) : null}
          </Pressable>
        </View>
      ) : null}

      <View style={estilos.rodapeRodando}>
        <Botao titulo={pausado ? 'Continuar' : 'Pausar'} tipo="secundario" cor={info.cor} style={{ flex: 1 }} onPress={pausar} />
        {cfg.modo === 'fortime' ? <Botao titulo="Terminei" cor={info.cor} style={{ flex: 1 }} onPress={terminar} /> : null}
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg - 4, gap: Espaco.lg, paddingBottom: Espaco.xl },
  modos: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
  modo: { paddingHorizontal: 16, height: 46, borderRadius: Raio.md, borderWidth: 1.5, borderColor: Cores.borda, backgroundColor: Cores.superficie, justifyContent: 'center' },
  contadores: { gap: Espaco.sm },
  contador: { backgroundColor: Cores.superficie, borderRadius: Raio.md, padding: Espaco.md, gap: 6, flex: 1 },
  contadorLinha: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contadorBotao: { width: 52, height: 48, borderRadius: 10, backgroundColor: Cores.superficieAlta, alignItems: 'center', justifyContent: 'center' },
  linhaRodadas: { flexDirection: 'row', gap: Espaco.sm },
  lista: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, paddingHorizontal: Espaco.md },
  linhaParcial: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  separador: { borderTopWidth: 1, borderTopColor: Cores.borda },
  sensacao: { width: 58, height: 58, borderRadius: Raio.md, borderWidth: 1.5, borderColor: Cores.borda, alignItems: 'center', justifyContent: 'center' },
  topoRodando: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Espaco.lg, minHeight: 48 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Espaco.sm, paddingHorizontal: Espaco.lg },
  tempo: { fontSize: 132, lineHeight: 136 },
  barra: { width: '100%', height: 8, borderRadius: 4, backgroundColor: Cores.superficieAlta, overflow: 'hidden', marginTop: Espaco.sm },
  barraCheia: { height: '100%' },
  rodadasRodando: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md, paddingHorizontal: Espaco.lg },
  botaoRodada: { flex: 1.4, height: 120, borderRadius: Raio.lg, alignItems: 'center', justifyContent: 'center' },
  botaoProxima: { height: 110, borderRadius: Raio.lg, alignItems: 'center', justifyContent: 'center' },
  rodapeRodando: { flexDirection: 'row', gap: Espaco.sm, padding: Espaco.lg - 4 },
});
