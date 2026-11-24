import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, Text, type PressableProps } from 'react-native';

import { Cores, Fontes, Raio, ToqueMinimo } from '@/constants/theme';

type Props = Omit<PressableProps, 'children'> & {
  titulo: string;
  tipo?: 'principal' | 'secundario';
  cor?: string; // cor da modalidade; padrão é o verde da marca
};

export function Botao({ titulo, tipo = 'principal', cor = Cores.verde, onPress, style, ...resto }: Props) {
  const principal = tipo === 'principal';

  return (
    <Pressable
      accessibilityRole="button"
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress?.(e);
      }}
      style={(estado) => [
        estilos.base,
        principal ? { backgroundColor: cor } : { borderColor: cor, borderWidth: 2 },
        estado.pressed && estilos.pressionado,
        typeof style === 'function' ? style(estado) : style,
      ]}
      {...resto}>
      {/* nunca quebra a palavra em duas linhas: se não couber, a letra diminui um pouco */}
      <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={[estilos.texto, { color: principal ? Cores.preto : cor }]}>
        {titulo}
      </Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: ToqueMinimo + 8,
    borderRadius: Raio.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  pressionado: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  texto: {
    fontFamily: Fontes.display,
    fontSize: 24,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
