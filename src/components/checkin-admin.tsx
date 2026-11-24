import * as Sharing from 'expo-sharing';
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { captureRef } from 'react-native-view-shot';

import { Botao } from '@/components/botao';
import { Logo } from '@/components/logo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import {
  PREFIXO_QR,
  configCheckin,
  marcarLocalAqui,
  novoQr,
  painelCheckin,
  type ConfigCheckin,
  type PainelCheckin,
} from '@/lib/checkin';

// Admin · check-in na recepção: frequência real (por hora e por dia), o QR para imprimir,
// marcar o local da academia (trava de 300 m) e trocar o QR se ele vazar.

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function CheckinAdmin({ gymId }: { gymId: string }) {
  const [config, setConfig] = useState<ConfigCheckin | null>(null);
  const [painel, setPainel] = useState<PainelCheckin | null>(null);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const cartaz = useRef<ComponentRef<typeof View>>(null);

  const carregar = useCallback(async () => {
    try {
      const [c, p] = await Promise.all([configCheckin(gymId), painelCheckin(gymId)]);
      setConfig(c);
      setPainel(p);
    } catch {
      setErro('Não deu para carregar o check-in. Rode o SQL 0022.');
    }
  }, [gymId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  async function imprimir() {
    try {
      const uri = await captureRef(cartaz as any, { format: 'png', quality: 1, result: 'tmpfile', width: 1240, height: 1754 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'QR de check-in da Fit One' });
    } catch (e: any) {
      Alert.alert('Não deu para gerar a imagem', String(e?.message ?? e));
    }
  }

  async function marcarLocal() {
    Alert.alert('Você está na Fit One agora?', 'O local atual do seu celular vira o local da academia. Só aceita check-in quem estiver a até 300 m.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Estou aqui',
        onPress: async () => {
          setOcupado(true);
          try {
            await marcarLocalAqui(gymId);
            await carregar();
          } catch (e: any) {
            setErro(String(e?.message ?? 'Não deu certo.'));
          } finally {
            setOcupado(false);
          }
        },
      },
    ]);
  }

  function trocarQr() {
    Alert.alert('Gerar um QR novo?', 'O QR impresso hoje para de funcionar. Use se a foto do QR estiver circulando.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Gerar novo',
        style: 'destructive',
        onPress: async () => {
          try {
            await novoQr(gymId);
            await carregar();
          } catch {
            setErro('Não deu para trocar o QR.');
          }
        },
      },
    ]);
  }

  if (erro && !config) {
    return (
      <Texto variante="corpo" cor={Cores.perigo}>
        {erro}
      </Texto>
    );
  }
  if (!config || !painel) return null;

  const horas = painel.porHora.map((n, h) => ({ h, n })).filter((x) => x.h >= 5 && x.h <= 23);
  const maxHora = Math.max(1, ...horas.map((x) => x.n));
  const pico = horas.reduce((a, b) => (b.n > a.n ? b : a), horas[0]);

  return (
    <View style={{ gap: Espaco.md }}>
      <View style={estilos.bloco}>
        <Texto variante="rotulo">CHECK-IN NA RECEPÇÃO</Texto>
        <View style={{ flexDirection: 'row' }}>
          {[
            [painel.hoje, 'hoje'],
            [painel.semana, '7 dias'],
            [painel.pessoas30d, 'pessoas em 30 dias'],
          ].map(([n, r]) => (
            <View key={String(r)} style={{ flex: 1 }}>
              <Texto variante="numero" style={{ fontSize: 30, lineHeight: 32 }}>
                {n}
              </Texto>
              <Texto variante="legenda">{r}</Texto>
            </View>
          ))}
        </View>

        {painel.mes > 0 ? (
          <>
            <Texto variante="legenda" style={{ marginTop: Espaco.sm }}>
              Horários (30 dias){pico && pico.n > 0 ? ` · pico às ${pico.h}h` : ''}
            </Texto>
            <View style={estilos.grafico}>
              {horas.map((x) => (
                <View key={x.h} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
                  <View style={{ height: 70, justifyContent: 'flex-end', width: '70%' }}>
                    <View
                      style={{
                        height: `${(x.n / maxHora) * 100}%`,
                        minHeight: x.n ? 3 : 0,
                        backgroundColor: x.h === pico?.h ? Cores.verde : Cores.textoSecundario,
                        borderRadius: 2,
                      }}
                    />
                  </View>
                  {x.h % 3 === 0 ? (
                    <Texto variante="legenda" style={{ fontSize: 10, lineHeight: 12 }}>
                      {x.h}
                    </Texto>
                  ) : (
                    <View style={{ height: 12 }} />
                  )}
                </View>
              ))}
            </View>
            <Texto variante="legenda">
              Por dia:{' '}
              {[1, 2, 3, 4, 5, 6, 0].map((d) => `${DIAS[d]} ${painel.porDia[d]}`).join(' · ')}
            </Texto>
          </>
        ) : (
          <Texto variante="legenda">Ainda sem check-ins. Imprima o QR e cole na recepção.</Texto>
        )}
      </View>

      <View style={estilos.bloco}>
        <Texto variante="rotulo">QR PARA A RECEPÇÃO</Texto>
        {/* cartaz que vira imagem (A4 em pé) para imprimir */}
        <View ref={cartaz} collapsable={false} style={estilos.cartaz}>
          <Logo largura={150} comCidade={false} fundo="claro" />
          <Texto variante="titulo" cor={Cores.preto} style={{ textAlign: 'center', fontSize: 26, lineHeight: 28 }}>
            FAÇA SEU CHECK-IN
          </Texto>
          <View style={{ backgroundColor: Cores.branco, padding: 12, borderRadius: 12 }}>
            <QRCode value={`${PREFIXO_QR}${config.token}`} size={190} color={Cores.preto} backgroundColor={Cores.branco} />
          </View>
          <Texto variante="corpo" cor={Cores.preto} style={{ textAlign: 'center' }}>
            App Fit One → Hoje → Fazer check-in
          </Texto>
        </View>
        <Texto variante="legenda" cor={config.latitude != null ? Cores.verde : Cores.amarelo}>
          {config.latitude != null
            ? '● Local da academia marcado: só vale check-in a até 300 m.'
            : '● Local não marcado: o QR funciona de qualquer lugar. Marque estando na academia.'}
        </Texto>
        <Botao titulo="Imprimir QR" onPress={imprimir} />
        <Botao titulo={ocupado ? '...' : 'Marcar local da academia'} tipo="secundario" disabled={ocupado} onPress={marcarLocal} />
        <Botao titulo="Gerar QR novo" tipo="secundario" onPress={trocarQr} />
        {erro ? (
          <Texto variante="legenda" cor={Cores.perigo}>
            {erro}
          </Texto>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  bloco: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, padding: Espaco.md, gap: Espaco.sm },
  grafico: { flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  cartaz: {
    alignSelf: 'center',
    width: 280,
    aspectRatio: 1240 / 1754,
    backgroundColor: Cores.branco,
    borderWidth: 6,
    borderColor: Cores.verde,
    borderRadius: Raio.md,
    alignItems: 'center',
    justifyContent: 'space-evenly',
    padding: Espaco.md,
  },
});
