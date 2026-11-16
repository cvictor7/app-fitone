import Svg, { Circle, Path, Rect } from 'react-native-svg';

// Ícones desenhados para o app (traço grosso, cantos retos, no estilo do logo).
type Props = { cor: string; tamanho?: number };

export function IconeHoje({ cor, tamanho = 26 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Rect x="3.5" y="5" width="17" height="15.5" rx="2" stroke={cor} strokeWidth={2.2} />
      <Path d="M3.5 10h17M8 3v4M16 3v4" stroke={cor} strokeWidth={2.2} strokeLinecap="round" />
      <Rect x="7.5" y="13" width="4" height="4" fill={cor} />
    </Svg>
  );
}

export function IconeTreinar({ cor, tamanho = 26 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="9" width="3" height="6" rx="0.8" fill={cor} />
      <Rect x="5" y="6.5" width="3.5" height="11" rx="0.8" fill={cor} />
      <Rect x="15.5" y="6.5" width="3.5" height="11" rx="0.8" fill={cor} />
      <Rect x="19" y="9" width="3" height="6" rx="0.8" fill={cor} />
      <Path d="M8.5 12h7" stroke={cor} strokeWidth={2.4} />
    </Svg>
  );
}

export function IconeEvolucao({ cor, tamanho = 26 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Path d="M3 18l6-6 4 3.5L21 7" stroke={cor} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M15 7h6v6" stroke={cor} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconePerfil({ cor, tamanho = 26 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={cor} strokeWidth={2.2} />
      <Path d="M4 21c.8-4 4-6 8-6s7.2 2 8 6" stroke={cor} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function IconeVoltar({ cor, tamanho = 26 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Path d="M15 5l-7 7 7 7" stroke={cor} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconeSeta({ cor, tamanho = 20 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Path d="M9 5l7 7-7 7" stroke={cor} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
