// Contas da corrida/bike com GPS (sem nada de tela aqui, para dar para testar).
// O GPS do celular "pula" às vezes: descartamos pontos imprecisos e saltos impossíveis.

export type Ponto = { lat: number; lng: number; t: number; precisao?: number | null; novoTrecho?: boolean };
export type Parcial = { km: number; s: number }; // tempo daquele km, em segundos

export type EstadoGps = {
  pontos: Ponto[]; // todos os pontos aceitos (para o mapa)
  distanciaM: number;
  parciais: Parcial[];
  ultimoKmEmS: number; // tempo (em movimento) quando fechou o último km
  quebra: boolean; // acabou de voltar da pausa: o próximo ponto começa um trecho novo
};

export const ESTADO_INICIAL: EstadoGps = { pontos: [], distanciaM: 0, parciais: [], ultimoKmEmS: 0, quebra: false };

const RAIO_TERRA = 6371000;
const rad = (g: number) => (g * Math.PI) / 180;

/** Distância em metros entre dois pontos (fórmula de haversine). */
export function distancia(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RAIO_TERRA * Math.asin(Math.sqrt(h));
}

/** Velocidade máxima aceitável (m/s): acima disso é pulo do GPS. */
export const VELOCIDADE_MAX = { corrida: 9, bike: 25 } as const; // ~32 km/h correndo, 90 km/h pedalando

/**
 * Junta um ponto novo. "emMovimentoS" = tempo de atividade até agora (sem pausas),
 * usado para fechar as parciais de cada km. Devolve o novo estado e, se fechou um km, qual.
 */
export function adicionarPonto(
  e: EstadoGps,
  p: Ponto,
  emMovimentoS: number,
  tipo: 'corrida' | 'bike',
): { estado: EstadoGps; kmFechado: Parcial | null } {
  if (p.precisao != null && p.precisao > 30) return { estado: e, kmFechado: null }; // muito impreciso
  const anterior = e.pontos[e.pontos.length - 1];
  if (!anterior) return { estado: { ...e, pontos: [p], quebra: false }, kmFechado: null };
  if (e.quebra) return { estado: { ...e, pontos: [...e.pontos, { ...p, novoTrecho: true }], quebra: false }, kmFechado: null };

  const d = distancia(anterior, p);
  const dt = Math.max(0.5, (p.t - anterior.t) / 1000);
  if (d / dt > VELOCIDADE_MAX[tipo]) return { estado: e, kmFechado: null }; // pulo do GPS
  if (d < 2) return { estado: e, kmFechado: null }; // parado (barulho do GPS)

  const distanciaM = e.distanciaM + d;
  let kmFechado: Parcial | null = null;
  let { parciais, ultimoKmEmS } = e;
  const kmCompletos = Math.floor(distanciaM / 1000);
  if (kmCompletos > parciais.length) {
    kmFechado = { km: kmCompletos, s: Math.max(1, Math.round(emMovimentoS - ultimoKmEmS)) };
    parciais = [...parciais, kmFechado];
    ultimoKmEmS = emMovimentoS;
  }
  return { estado: { pontos: [...e.pontos, p], distanciaM, parciais, ultimoKmEmS, quebra: false }, kmFechado };
}

/** Voltou da pausa: o próximo ponto não soma a distância do "buraco" nem liga a linha. */
export function retomar(e: EstadoGps): EstadoGps {
  return { ...e, quebra: true };
}

/** Separa os pontos em trechos (cada pausa começa um trecho novo no mapa). */
export function trechos(pontos: Ponto[]): Ponto[][] {
  const saida: Ponto[][] = [];
  for (const p of pontos) {
    if (p.novoTrecho || saida.length === 0) saida.push([p]);
    else saida[saida.length - 1].push(p);
  }
  return saida;
}

/** Diminui os pontos para guardar (um a cada ~10 m, no máximo 2000). */
export function simplificar(pontos: Ponto[]): [number, number][] {
  const saida: [number, number][] = [];
  let ultimo: Ponto | null = null;
  for (const p of pontos) {
    if (!ultimo || distancia(ultimo, p) >= 10) {
      saida.push([Number(p.lat.toFixed(6)), Number(p.lng.toFixed(6))]);
      ultimo = p;
    }
  }
  if (saida.length <= 2000) return saida;
  const passo = saida.length / 2000;
  return Array.from({ length: 2000 }, (_, i) => saida[Math.floor(i * passo)]);
}

// ---------- textos ----------

export function textoKm(m: number) {
  return (m / 1000).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Ritmo em min/km, ex.: "5:12". */
export function textoRitmo(segundos: number, metros: number) {
  if (metros < 50 || segundos <= 0) return '–:––';
  const sPorKm = segundos / (metros / 1000);
  if (sPorKm > 59 * 60) return '–:––';
  const m = Math.floor(sPorKm / 60);
  const s = Math.round(sPorKm % 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${String(s).padStart(2, '0')}`;
}

/** Velocidade média em km/h, ex.: "24,3". */
export function textoVelocidade(segundos: number, metros: number) {
  if (segundos <= 0) return '0,0';
  return ((metros / segundos) * 3.6).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

export function textoTempo(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = Math.floor(s % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}` : `${m}:${String(ss).padStart(2, '0')}`;
}

/** O que a voz fala ao fechar cada km. */
export function falaDoKm(p: Parcial, tipo: 'corrida' | 'bike') {
  const min = Math.floor(p.s / 60);
  const seg = p.s % 60;
  const tempo = `${min} ${min === 1 ? 'minuto' : 'minutos'}${seg ? ` e ${seg} segundos` : ''}`;
  return `${p.km} ${p.km === 1 ? 'quilômetro' : 'quilômetros'}. ${tipo === 'corrida' ? 'Último quilômetro em' : 'Parcial de'} ${tempo}.`;
}

/** Resumo que vai em "observação" (aparece no histórico, no feed e no card de compartilhar). */
export function resumoPercurso(tipo: 'corrida' | 'bike', distanciaM: number, duracaoS: number, parciais: Parcial[]) {
  const base =
    tipo === 'corrida'
      ? `${textoKm(distanciaM)} km · ritmo ${textoRitmo(duracaoS, distanciaM)}/km`
      : `${textoKm(distanciaM)} km · ${textoVelocidade(duracaoS, distanciaM)} km/h`;
  if (parciais.length === 0) return base;
  const melhor = parciais.reduce((a, b) => (b.s < a.s ? b : a));
  return tipo === 'corrida' ? `${base} · melhor km ${textoTempo(melhor.s)}` : base;
}
