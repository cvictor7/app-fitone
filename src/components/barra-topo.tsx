import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconeVoltar } from '@/components/icones';
import { Texto } from '@/components/texto';
import { Cores, Espaco } from '@/constants/theme';

// Barra do alto com a seta de voltar. Vai em toda tela que não é aba principal.
type Props = {
  titulo?: string;
  aoVoltar?: () => void; // padrão: volta para a tela anterior
  direita?: ReactNode;
};

export function BarraTopo({ titulo, aoVoltar, direita }: Props) {
  function voltar() {
    if (aoVoltar) return aoVoltar();
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }

  return (
    <View style={estilos.barra}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Voltar"
        onPress={voltar}
        hitSlop={14}
        style={({ pressed }) => [estilos.voltar, pressed && { opacity: 0.6 }]}>
        <IconeVoltar cor={Cores.texto} tamanho={28} />
      </Pressable>
      <View style={estilos.meio}>
        {titulo ? (
          <Texto variante="subtitulo" style={{ fontSize: 20 }} numberOfLines={1}>
            {titulo}
          </Texto>
        ) : null}
      </View>
      <View style={estilos.lado}>{direita}</View>
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Espaco.sm,
    minHeight: 52,
  },
  voltar: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  meio: { flex: 1, alignItems: 'center' },
  lado: { width: 48, alignItems: 'center' },
});
