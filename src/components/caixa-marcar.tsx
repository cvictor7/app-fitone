import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Cores, Espaco, Raio } from '@/constants/theme';

type Props = {
  marcado: boolean;
  aoMudar: (valor: boolean) => void;
  children: ReactNode;
};

export function CaixaMarcar({ marcado, aoMudar, children }: Props) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcado }}
      onPress={() => {
        Haptics.selectionAsync();
        aoMudar(!marcado);
      }}
      style={estilos.linha}>
      <View style={[estilos.caixa, marcado && estilos.caixaMarcada]}>
        {marcado && (
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={Cores.preto} strokeWidth={3.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  linha: { flexDirection: 'row', alignItems: 'flex-start', gap: Espaco.md, paddingVertical: Espaco.sm },
  caixa: {
    width: 28,
    height: 28,
    borderRadius: Raio.sm,
    borderWidth: 2,
    borderColor: Cores.cinza,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  caixaMarcada: { backgroundColor: Cores.verde, borderColor: Cores.verde },
});
