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

export function IconeComunidade({ cor, tamanho = 26 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Circle cx="9" cy="8" r="3.4" stroke={cor} strokeWidth={2.2} />
      <Path d="M2.8 20c.6-3.6 3-5.6 6.2-5.6s5.6 2 6.2 5.6" stroke={cor} strokeWidth={2.2} strokeLinecap="round" />
      <Circle cx="17" cy="9" r="2.6" stroke={cor} strokeWidth={2} />
      <Path d="M17.5 14.2c2 .4 3.3 2 3.7 4.6" stroke={cor} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function IconeFogo({ cor, tamanho = 22, cheio = false }: Props & { cheio?: boolean }) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2.5c.6 3.2 4.8 5.6 4.8 10.4a4.8 4.8 0 0 1-9.6 0c0-2 .9-3.4 2-4.6.2 1.5.9 2.6 2 3.1-.6-3.4.2-6.4.8-8.9Z"
        stroke={cor}
        strokeWidth={2}
        strokeLinejoin="round"
        fill={cheio ? cor : 'none'}
      />
    </Svg>
  );
}

export function IconeTrofeu({ cor, tamanho = 26 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" stroke={cor} strokeWidth={2.2} strokeLinejoin="round" />
      <Path d="M7 6H4v1.5A3.5 3.5 0 0 0 7.5 11M17 6h3v1.5a3.5 3.5 0 0 1-3.5 3.5" stroke={cor} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 14v3.5M8 20.5h8" stroke={cor} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function IconeBalao({ cor, tamanho = 18 }: Props) {
  return (
    <Svg width={tamanho} height={tamanho} viewBox="0 0 24 24" fill="none">
      <Path d="M4 5h16v11H10l-5 4v-4H4V5Z" stroke={cor} strokeWidth={2.2} strokeLinejoin="round" />
    </Svg>
  );
}
