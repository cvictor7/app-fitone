// Identidade da Fit One Manaus (igual ao site fitonemanaus.com.br).
// Tema escuro é o padrão do app.

export const Cores = {
  verde: '#70E000',
  verdeEscuro: '#4F9E00',
  preto: '#0A0A0A',
  branco: '#FFFFFF',
  cinza: '#A9AEA9',

  // Superfícies do tema escuro (do mais fundo para o mais alto)
  fundo: '#0A0A0A',
  superficie: '#141614',
  superficieAlta: '#1D201D',
  borda: '#2A2E2A',

  texto: '#FFFFFF',
  textoSecundario: '#A9AEA9',
  textoApagado: '#6B706B',

  perigo: '#FF5E7A',
} as const;

export type Modalidade =
  | 'musculacao'
  | 'hybrid'
  | 'cross'
  | 'corrida'
  | 'bike'
  | 'hyrox'
  | 'livre';

// Cada modalidade tem sua cor. A ordem aqui é a ordem em que aparecem no app.
export const Modalidades: Record<Modalidade, { nome: string; cor: string }> = {
  musculacao: { nome: 'Musculação', cor: '#70E000' },
  hybrid: { nome: 'Hybrid', cor: '#B7A6FF' },
  cross: { nome: 'Cross', cor: '#FF5E7A' },
  corrida: { nome: 'Corrida', cor: '#FF8A3D' },
  bike: { nome: 'Bike', cor: '#3DD6C4' },
  hyrox: { nome: 'Hyrox', cor: '#FFC83D' },
  livre: { nome: 'Livre', cor: '#A9AEA9' },
};

export const ListaModalidades = Object.keys(Modalidades) as Modalidade[];

// Nomes das fontes (iguais às chaves carregadas em src/app/_layout.tsx)
export const Fontes = {
  display: 'BigShouldersDisplay_900Black',
  titulo: 'BigShouldersDisplay_800ExtraBold',
  texto: 'Archivo_400Regular',
  textoMedio: 'Archivo_500Medium',
  textoSemi: 'Archivo_600SemiBold',
  textoNegrito: 'Archivo_700Bold',
} as const;

export const ArquivosDeFonte = {
  BigShouldersDisplay_900Black: require('../../assets/fonts/BigShouldersDisplay_900Black.ttf'),
  BigShouldersDisplay_800ExtraBold: require('../../assets/fonts/BigShouldersDisplay_800ExtraBold.ttf'),
  Archivo_400Regular: require('../../assets/fonts/Archivo_400Regular.ttf'),
  Archivo_500Medium: require('../../assets/fonts/Archivo_500Medium.ttf'),
  Archivo_600SemiBold: require('../../assets/fonts/Archivo_600SemiBold.ttf'),
  Archivo_700Bold: require('../../assets/fonts/Archivo_700Bold.ttf'),
};

export const Espaco = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const Raio = {
  sm: 8,
  md: 14,
  lg: 22,
  pilula: 999,
} as const;

// Área mínima de toque: grande para usar com a mão suada, entre uma série e outra
export const ToqueMinimo = 56;
