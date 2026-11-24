import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import * as Speech from 'expo-speech';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { MapaPercurso } from '@/components/mapa-percurso';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Fontes, Modalidades, Raio } from '@/constants/theme';
import { useDadosAluno } from '@/lib/dados';
import {
  ESTADO_INICIAL,
  adicionarPonto,
  falaDoKm,
  resumoPercurso,
  retomar,
  simplificar,
  textoKm,
  textoRitmo,
  textoTempo,
  textoVelocidade,
  trechos,
  type EstadoGps,
} from '@/lib/gps';
import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';

// Corrida e bike com o GPS do celular, estilo Strava: mapa, km, ritmo, parcial de cada km por voz.
// No Expo Go, o GPS só funciona com a tela ligada (a tela fica acesa sozinha aqui).
// A corrida em andamento é guardada no celular a cada 15 s: se o app fechar, dá para salvar depois.

type Fase = 'pronto' | 'contagem' | 'ativo' | 'pausado' | 'fim';
const SENSACOES = ['Muito leve', 'Leve', 'Na medida', 'Pesado', 'No limite'];
const CHAVE = 'fitone:gps-ativo';

type Guardado = { tipo: 'corrida' | 'bike'; inicio: number; movimentoS: number; estado: EstadoGps; treinoId?: string };

export default function TelaGps() {
  const { modalidade, treino: treinoId } = useLocalSearchParams<{ modalidade: string; treino?: string }>();
  const tipo: 'corrida' | 'bike' = modalidade === 'bike' ? 'bike' : 'corrida';
  const info = Modalidades[tipo];
  const { gymId } = useSessao();
  const dados = useDadosAluno();
  const treinoDoPlano = treinoId ? dados.plano?.treinos.find((t) => t.id === treinoId) : undefined;

  const [fase, setFase] = useState<Fase>('pronto');
  const [permissao, setPermissao] = useState<'pedindo' | 'ok' | 'negada'>('pedindo');
  const [precisao, setPrecisao] = useState<number | null>(null);
  const [aqui, setAqui] = useState<{ latitude: number; longitude: number } | null>(null);
  const [estado, setEstado] = useState<EstadoGps>(ESTADO_INICIAL);
  const [contagem, setContagem] = useState(3);
  const [agora, setAgora] = useState(Date.now());
  const [sensacao, setSensacao] = useState<number | null>(null);
  const [nota, setNota] = useState('');
  const [salvando, setSalvando] = useState(false);

  // tempo em movimento = acumulado das partes já pausadas + parte atual
  const inicio = useRef(0);
  const acumuladoS = useRef(0);
  const desdeMs = useRef(0);
  const faseRef = useRef<Fase>('pronto');
  const estadoRef = useRef<EstadoGps>(ESTADO_INICIAL);
  const idSessao = useRef(Crypto.randomUUID()).current;
  faseRef.current = fase;
  estadoRef.current = estado;

  const movimentoS = useCallback(
    () => acumuladoS.current + (faseRef.current === 'ativo' && desdeMs.current ? (Date.now() - desdeMs.current) / 1000 : 0),
    [],
  );

  // permissão + GPS ligado desde a tela "pronto" (para já pegar sinal)
  useEffect(() => {
    let sub: Location.LocationSubscription | null = null;
    let vivo = true;
    (async () => {
      const r = await Location.requestForegroundPermissionsAsync();
      if (!vivo) return;
      if (r.status !== 'granted') return setPermissao('negada');
      setPermissao('ok');
      sub = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 1000, distanceInterval: 3 },
        (loc) => {
          const { latitude, longitude, accuracy } = loc.coords;
          setPrecisao(accuracy ?? null);
          setAqui({ latitude, longitude });
          if (faseRef.current !== 'ativo') return;
          const r2 = adicionarPonto(estadoRef.current, { lat: latitude, lng: longitude, t: loc.timestamp, precisao: accuracy }, movimentoS(), tipo);
          estadoRef.current = r2.estado;
          setEstado(r2.estado);
          if (r2.kmFechado) {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Speech.speak(falaDoKm(r2.kmFechado, tipo), { language: 'pt-BR' });
          }
        },
      );
    })();
    return () => {
      vivo = false;
      sub?.remove();
    };
  }, [movimentoS, tipo]);

  // relógio da tela + tela sempre acesa durante a atividade + backup a cada 15 s
  useEffect(() => {
    if (fase !== 'ativo' && fase !== 'pausado') return;
    activateKeepAwakeAsync('gps');
    const relogio = setInterval(() => setAgora(Date.now()), 1000);
    const backup = setInterval(() => {
      const g: Guardado = { tipo, inicio: inicio.current, movimentoS: movimentoS(), estado: estadoRef.current, treinoId };
      AsyncStorage.setItem(CHAVE, JSON.stringify(g)).catch(() => {});
    }, 15000);
    return () => {
      clearInterval(relogio);
      clearInterval(backup);
      deactivateKeepAwake('gps');
    };
  }, [fase, movimentoS, tipo, treinoId]);

  // sobrou uma atividade de antes (app fechou no meio)?
  useEffect(() => {
    AsyncStorage.getItem(CHAVE).then((t) => {
      if (!t) return;
      const g: Guardado = JSON.parse(t);
      if (!g.estado?.pontos?.length) return AsyncStorage.removeItem(CHAVE);
      Alert.alert(
        'Atividade não salva',
        `Você tem uma ${g.tipo === 'bike' ? 'pedalada' : 'corrida'} de ${textoKm(g.estado.distanciaM)} km que não foi salva.`,
        [
          { text: 'Descartar', style: 'destructive', onPress: () => AsyncStorage.removeItem(CHAVE) },
          {
            text: 'Ver e salvar',
            onPress: () => {
              inicio.current = g.inicio;
              acumuladoS.current = g.movimentoS;
              estadoRef.current = g.estado;
              setEstado(g.estado);
              setFase('fim');
            },
          },
        ],
      );
    });
  }, []);

  function comecar() {
    setFase('contagem');
    setContagem(3);
    Speech.speak('3', { language: 'pt-BR' });
    let n = 3;
    const t = setInterval(() => {
      n -= 1;
      if (n > 0) {
        setContagem(n);
        Speech.speak(String(n), { language: 'pt-BR' });
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        clearInterval(t);
        Speech.speak('Vai!', { language: 'pt-BR' });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        inicio.current = Date.now();
        desdeMs.current = Date.now();
        acumuladoS.current = 0;
        estadoRef.current = ESTADO_INICIAL;
        setEstado(ESTADO_INICIAL);
        setFase('ativo');
      }
    }, 1000);
  }

  function pausar() {
    acumuladoS.current = movimentoS();
    desdeMs.current = 0;
    setFase('pausado');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function continuar() {
    desdeMs.current = Date.now();
    estadoRef.current = retomar(estadoRef.current);
    setEstado(estadoRef.current);
    setFase('ativo');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function terminar() {
    Alert.alert('Terminar?', undefined, [
      { text: 'Continuar', style: 'cancel' },
      {
        text: 'Terminar',
        onPress: () => {
          acumuladoS.current = movimentoS();
          desdeMs.current = 0;
          setFase('fim');
          Speech.speak(`Fim. ${textoKm(estadoRef.current.distanciaM).replace(',', ' vírgula ')} quilômetros.`, { language: 'pt-BR' });
        },
      },
    ]);
  }

  async function salvar() {
    if (!gymId) return;
    const duracaoS = Math.round(acumuladoS.current);
    const e = estadoRef.current;
    setSalvando(true);
    const resumo = resumoPercurso(tipo, e.distanciaM, duracaoS, e.parciais);
    const fim = new Date((inicio.current || Date.now()) + duracaoS * 1000);
    const { error } = await supabase.from('sessoes').insert({
      id: idSessao,
      gym_id: gymId,
      modalidade: tipo,
      treino_id: treinoDoPlano?.id ?? null,
      origem: 'app',
      iniciada_em: new Date(inicio.current || Date.now()).toISOString(),
      concluida_em: fim.toISOString(),
      duracao_s: duracaoS,
      sensacao: sensacao === null ? null : sensacao + 1,
      observacao: nota.trim() ? `${resumo}\n${nota.trim()}` : resumo,
      status: 'concluida',
    });
    if (error && error.code !== '23505') {
      setSalvando(false);
      Alert.alert('Não deu para salvar', 'Confira a internet e toque em Salvar de novo. A atividade continua guardada no celular.');
      return;
    }
    await supabase.from('percursos').upsert({
      sessao_id: idSessao,
      distancia_m: Math.round(e.distanciaM),
      duracao_s: duracaoS,
      parciais: e.parciais,
      pontos: simplificar(e.pontos),
    });
    await AsyncStorage.removeItem(CHAVE);
    setSalvando(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/sessao/concluido/${idSessao}`);
  }

  function descartar() {
    Alert.alert('Descartar esta atividade?', 'Não dá para recuperar depois.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Descartar',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem(CHAVE);
          router.back();
        },
      },
    ]);
  }

  // ---------- números ----------
  void agora; // re-render a cada segundo
  const tempoS = movimentoS();
  const coordTrechos = trechos(estado.pontos).map((t) => t.map((p) => ({ latitude: p.lat, longitude: p.lng })));
  const ultimoKm = estado.parciais[estado.parciais.length - 1];
  const sinal =
    precisao == null ? { texto: 'Procurando GPS...', cor: Cores.textoSecundario }
    : precisao <= 10 ? { texto: 'GPS ótimo', cor: Cores.verde }
    : precisao <= 25 ? { texto: 'GPS ok', cor: Cores.amarelo }
    : { texto: 'GPS fraco: vá para um lugar aberto', cor: Cores.perigo };

  if (permissao === 'negada') {
    return (
      <SafeAreaView style={estilos.tela}>
        <BarraTopo titulo={`${info.nome} com GPS`} />
        <View style={{ padding: Espaco.lg, gap: Espaco.md }}>
          <Texto variante="subtitulo">Sem permissão de localização</Texto>
          <Texto variante="corpo" cor={Cores.textoSecundario}>
            Para medir distância e ritmo, libere a localização nos Ajustes do celular (app Expo Go / Fit One → Localização → Durante o uso).
          </Texto>
          <Botao titulo="Registrar sem GPS" tipo="secundario" onPress={() => router.replace(`/registro/${tipo}${treinoId ? `?treino=${treinoId}` : ''}` as any)} />
        </View>
      </SafeAreaView>
    );
  }

  if (fase === 'contagem') {
    return (
      <SafeAreaView style={[estilos.tela, { alignItems: 'center', justifyContent: 'center' }]}>
        <Texto variante="display" cor={info.cor} style={{ fontSize: 200, lineHeight: 200 }}>
          {contagem}
        </Texto>
      </SafeAreaView>
    );
  }

  if (fase === 'fim') {
    return (
      <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
        <BarraTopo titulo={tipo === 'bike' ? 'Pedalada' : 'Corrida'} />
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          {coordTrechos.flat().length > 1 ? <MapaPercurso trechos={coordTrechos} style={{ height: 240 }} /> : null}
          <View style={estilos.numerosFim}>
            <Numero n={textoKm(estado.distanciaM)} r="km" grande cor={info.cor} />
            <Numero n={textoTempo(acumuladoS.current)} r="tempo" />
            {tipo === 'corrida' ? (
              <Numero n={textoRitmo(acumuladoS.current, estado.distanciaM)} r="ritmo /km" />
            ) : (
              <Numero n={textoVelocidade(acumuladoS.current, estado.distanciaM)} r="km/h" />
            )}
          </View>

          {estado.parciais.length > 0 ? (
            <View style={estilos.bloco}>
              <Texto variante="rotulo">PARCIAIS</Texto>
              {estado.parciais.map((p) => {
                const melhor = Math.min(...estado.parciais.map((x) => x.s));
                return (
                  <View key={p.km} style={estilos.parcial}>
                    <Texto variante="corpo" style={{ width: 52 }}>
                      Km {p.km}
                    </Texto>
                    <View style={{ flex: 1, height: 10, borderRadius: 5, backgroundColor: Cores.superficieAlta, overflow: 'hidden' }}>
                      <View style={{ width: `${(melhor / p.s) * 100}%`, height: 10, borderRadius: 5, backgroundColor: p.s === melhor ? Cores.verde : info.cor }} />
                    </View>
                    <Texto variante="corpo" cor={p.s === melhor ? Cores.verde : Cores.texto} style={{ width: 56, textAlign: 'right' }}>
                      {textoTempo(p.s)}
                    </Texto>
                  </View>
                );
              })}
            </View>
          ) : null}

          <View style={estilos.bloco}>
            <Texto variante="rotulo">COMO FOI?</Texto>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm }}>
              {SENSACOES.map((s, i) => (
                <Pressable key={s} onPress={() => setSensacao(i)} style={[estilos.chip, sensacao === i && { backgroundColor: info.cor, borderColor: info.cor }]}>
                  <Texto variante="corpo" cor={sensacao === i ? Cores.preto : Cores.texto}>
                    {s}
                  </Texto>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={nota}
              onChangeText={setNota}
              placeholder="Anotação (opcional): onde foi, como se sentiu..."
              placeholderTextColor={Cores.textoApagado}
              multiline
              maxLength={300}
              style={estilos.nota}
            />
          </View>

          <Texto variante="legenda">O mapa fica só para você. Na comunidade e para o personal vão só os números.</Texto>
          <Botao titulo={salvando ? 'Salvando...' : 'Salvar'} disabled={salvando} onPress={salvar} />
          <Pressable onPress={descartar} style={{ alignSelf: 'center' }} hitSlop={10}>
            <Texto variante="corpo" cor={Cores.perigo}>
              Descartar
            </Texto>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // pronto / ativo / pausado
  const rodando = fase === 'ativo' || fase === 'pausado';
  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo={`${info.nome} com GPS`} />
      <MapaPercurso
        trechos={rodando ? coordTrechos : aqui ? [[aqui]] : []}
        seguir
        mostrarEu
        style={{ flex: rodando ? 1 : 1.2, marginHorizontal: Espaco.lg, minHeight: 200 }}
      />

      <View style={estilos.painel}>
        {!rodando ? (
          <>
            <Texto variante="corpo" cor={sinal.cor} style={{ textAlign: 'center', fontFamily: 'Archivo_600SemiBold' }}>
              ● {sinal.texto}
            </Texto>
            {treinoDoPlano?.descricao ? (
              <Texto variante="corpo" cor={Cores.textoSecundario} style={{ textAlign: 'center' }} numberOfLines={3}>
                {treinoDoPlano.descricao}
              </Texto>
            ) : null}
            <Texto variante="legenda" style={{ textAlign: 'center' }}>
              Deixe a tela ligada durante a atividade: no app de teste o GPS para com a tela apagada.
            </Texto>
            <Botao titulo="Começar" disabled={precisao == null} onPress={comecar} />
          </>
        ) : (
          <>
            <View style={{ alignItems: 'center' }}>
              <Texto variante="display" cor={fase === 'pausado' ? Cores.textoSecundario : info.cor} style={{ fontSize: 96, lineHeight: 98 }}>
                {textoKm(estado.distanciaM)}
              </Texto>
              <Texto variante="rotulo">{fase === 'pausado' ? 'PAUSADO · KM' : 'KM'}</Texto>
            </View>
            <View style={estilos.numeros}>
              <Numero n={textoTempo(tempoS)} r="tempo" />
              {tipo === 'corrida' ? (
                <Numero n={textoRitmo(tempoS, estado.distanciaM)} r="ritmo médio" />
              ) : (
                <Numero n={textoVelocidade(tempoS, estado.distanciaM)} r="km/h" />
              )}
              <Numero n={ultimoKm ? textoTempo(ultimoKm.s) : '–'} r="último km" />
            </View>
            <View style={{ flexDirection: 'row', gap: Espaco.sm }}>
              {fase === 'ativo' ? (
                <Botao titulo="Pausar" tipo="secundario" style={{ flex: 1 }} onPress={pausar} />
              ) : (
                <Botao titulo="Continuar" style={{ flex: 1 }} onPress={continuar} />
              )}
              <Botao titulo="Terminar" tipo="secundario" style={{ flex: 1 }} onPress={terminar} />
            </View>
            <Texto variante="legenda" cor={sinal.cor} style={{ textAlign: 'center' }}>
              ● {sinal.texto}
            </Texto>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Numero({ n, r, grande, cor }: { n: string; r: string; grande?: boolean; cor?: string }) {
  return (
    <View style={{ alignItems: 'center', flex: 1 }}>
      <Texto variante="numero" cor={cor} style={{ fontSize: grande ? 44 : 30, lineHeight: grande ? 46 : 32 }}>
        {n}
      </Texto>
      <Texto variante="legenda">{r}</Texto>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, gap: Espaco.lg, paddingBottom: Espaco.xxl },
  painel: { padding: Espaco.lg, gap: Espaco.md },
  numeros: { flexDirection: 'row' },
  numerosFim: { flexDirection: 'row', backgroundColor: Cores.superficie, borderRadius: Raio.lg, paddingVertical: Espaco.md },
  bloco: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, padding: Espaco.md, gap: Espaco.sm },
  parcial: { flexDirection: 'row', alignItems: 'center', gap: Espaco.sm },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: Raio.pilula, borderWidth: 1.5, borderColor: Cores.borda, justifyContent: 'center' },
  nota: {
    minHeight: 70,
    borderRadius: Raio.md,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    padding: Espaco.md,
    color: Cores.texto,
    fontFamily: Fontes.texto,
    fontSize: 16,
    textAlignVertical: 'top',
  },
});
