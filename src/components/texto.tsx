import { StyleSheet, Text, type TextProps } from 'react-native';

import { Cores, Fontes } from '@/constants/theme';

type Variante = 'display' | 'titulo' | 'subtitulo' | 'numero' | 'corpo' | 'legenda' | 'rotulo';

type Props = TextProps & {
  variante?: Variante;
  cor?: string;
};

export function Texto({ variante = 'corpo', cor, style, ...resto }: Props) {
  return <Text style={[estilos[variante], cor ? { color: cor } : null, style]} {...resto} />;
}

const estilos = StyleSheet.create({
  // Letra do treino, números gigantes
  display: {
    fontFamily: Fontes.display,
    fontSize: 96,
    lineHeight: 96,
    color: Cores.texto,
  },
  titulo: {
    fontFamily: Fontes.display,
    fontSize: 34,
    lineHeight: 36,
    color: Cores.texto,
    textTransform: 'uppercase',
  },
  subtitulo: {
    fontFamily: Fontes.titulo,
    fontSize: 22,
    lineHeight: 26,
    color: Cores.texto,
    textTransform: 'uppercase',
  },
  numero: {
    fontFamily: Fontes.display,
    fontSize: 40,
    lineHeight: 42,
    color: Cores.texto,
  },
  corpo: {
    fontFamily: Fontes.texto,
    fontSize: 16,
    lineHeight: 22,
    color: Cores.texto,
  },
  legenda: {
    fontFamily: Fontes.texto,
    fontSize: 13,
    lineHeight: 18,
    color: Cores.textoSecundario,
  },
  rotulo: {
    fontFamily: Fontes.textoSemi,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.6,
    color: Cores.textoSecundario,
  },
});
