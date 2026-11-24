import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { checkinDeHoje } from '@/lib/checkin';

// Na tela Hoje: "Fazer check-in" (abre a câmera) ou "Check-in feito às 07:12".
export function BotaoCheckin() {
  const [feito, setFeito] = useState<Date | null | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      checkinDeHoje().then(setFeito).catch(() => setFeito(null));
    }, []),
  );

  if (feito === undefined) return null;

  return (
    <Pressable onPress={() => router.push('/checkin')} style={({ pressed }) => [estilos.botao, feito && estilos.feito, pressed && { opacity: 0.7 }]}>
      <Texto style={{ fontSize: 22 }}>{feito ? '✅' : '📍'}</Texto>
      <View style={{ flex: 1 }}>
        <Texto variante="corpo" style={{ fontFamily: 'Archivo_700Bold' }}>
          {feito ? `Check-in feito às ${feito.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Fazer check-in'}
        </Texto>
        {!feito ? <Texto variante="legenda">Chegou na Fit One? Escaneie o QR da recepção.</Texto> : null}
      </View>
      {!feito ? (
        <Texto variante="subtitulo" cor={Cores.verde}>
          ›
        </Texto>
      ) : null}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  botao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.sm,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderWidth: 1.5,
    borderColor: Cores.verde,
    padding: Espaco.md,
    minHeight: 56,
  },
  feito: { borderColor: Cores.borda },
});
