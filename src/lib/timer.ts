// Contas dos timers de Cross e Hybrid. Tudo é calculado a partir do tempo decorrido
// (relógio do celular), então continua certo mesmo se o app ficar em segundo plano.

export type ModoTimer = 'amrap' | 'emom' | 'fortime' | 'tabata' | 'prova';

export type ConfigTimer = {
  modo: ModoTimer;
  minutos: number; // AMRAP: duração · For Time: limite (0 = sem limite)
  intervaloS: number; // EMOM
  rodadas: number; // EMOM e Tabata
  trabalhoS: number; // Tabata
  descansoS: number; // Tabata
};

export const NOMES_MODO: Record<ModoTimer, string> = {
  amrap: 'AMRAP',
  emom: 'EMOM',
  fortime: 'For Time',
  tabata: 'Tabata',
  prova: 'Prova híbrida',
};

export const EXPLICACAO_MODO: Record<ModoTimer, string> = {
  amrap: 'O máximo de rodadas no tempo.',
  emom: 'Uma tarefa no começo de cada minuto; o que sobra é descanso.',
  fortime: 'Terminar o mais rápido possível (com limite de tempo, se quiser).',
  tabata: 'Trabalho e descanso alternados (20 s / 10 s × 8).',
  prova: 'Corrida + estação, várias vezes, marcando o tempo de cada parte.',
};

export const CONFIG_PADRAO: ConfigTimer = {
  modo: 'amrap',
  minutos: 12,
  intervaloS: 60,
  rodadas: 10,
  trabalhoS: 20,
  descansoS: 10,
};

// Partes da prova híbrida (nomes genéricos dos exercícios). 8 corridas + 8 estações.
export const PARTES_PROVA = [
  'Corrida 1 km',
  'Ski',
  'Corrida 1 km',
  'Empurrar trenó',
  'Corrida 1 km',
  'Puxar trenó',
  'Corrida 1 km',
  'Burpee com salto',
  'Corrida 1 km',
  'Remo',
  'Corrida 1 km',
  'Carregar peso',
  'Corrida 1 km',
  'Avanço com saco',
  'Corrida 1 km',
  'Wall ball',
];

export type EstadoTimer = {
  principalS: number; // número grande na tela (contagem regressiva ou progressiva)
  fase: 'trabalho' | 'descanso' | 'corrida' | 'livre';
  rotulo: string; // ex.: "MINUTO 3 DE 10", "RODADA 2 DE 8 · TRABALHO"
  progresso: number; // 0 a 1
  acabou: boolean;
  chaveAviso: string; // muda quando a fase/intervalo muda (para falar e vibrar)
};

export function calcular(c: ConfigTimer, decorridoS: number, parteAtual = 0): EstadoTimer {
  const t = Math.max(0, decorridoS);
  switch (c.modo) {
    case 'amrap': {
      const total = c.minutos * 60;
      return {
        principalS: Math.max(0, total - t),
        fase: 'trabalho',
        rotulo: `AMRAP ${c.minutos} MIN`,
        progresso: Math.min(1, t / total),
        acabou: t >= total,
        chaveAviso: `amrap-${Math.floor(t / 60)}`,
      };
    }
    case 'emom': {
      const idx = Math.floor(t / c.intervaloS);
      const dentro = t % c.intervaloS;
      return {
        principalS: c.intervaloS - dentro,
        fase: 'trabalho',
        rotulo: `${c.intervaloS === 60 ? 'MINUTO' : 'INTERVALO'} ${Math.min(idx + 1, c.rodadas)} DE ${c.rodadas}`,
        progresso: Math.min(1, t / (c.intervaloS * c.rodadas)),
        acabou: idx >= c.rodadas,
        chaveAviso: `emom-${idx}`,
      };
    }
    case 'fortime': {
      const limite = c.minutos * 60;
      return {
        principalS: t,
        fase: 'trabalho',
        rotulo: limite ? `FOR TIME · LIMITE ${c.minutos} MIN` : 'FOR TIME',
        progresso: limite ? Math.min(1, t / limite) : 0,
        acabou: limite > 0 && t >= limite,
        chaveAviso: `fortime-${Math.floor(t / 60)}`,
      };
    }
    case 'tabata': {
      const ciclo = c.trabalhoS + c.descansoS;
      const idx = Math.floor(t / ciclo);
      const dentro = t % ciclo;
      const trabalhando = dentro < c.trabalhoS;
      return {
        principalS: trabalhando ? c.trabalhoS - dentro : ciclo - dentro,
        fase: trabalhando ? 'trabalho' : 'descanso',
        rotulo: `RODADA ${Math.min(idx + 1, c.rodadas)} DE ${c.rodadas} · ${trabalhando ? 'TRABALHO' : 'DESCANSO'}`,
        progresso: Math.min(1, t / (ciclo * c.rodadas)),
        acabou: idx >= c.rodadas,
        chaveAviso: `tabata-${idx}-${trabalhando ? 't' : 'd'}`,
      };
    }
    case 'prova': {
      const parte = PARTES_PROVA[Math.min(parteAtual, PARTES_PROVA.length - 1)];
      return {
        principalS: t,
        fase: parte.startsWith('Corrida') ? 'corrida' : 'trabalho',
        rotulo: `PARTE ${Math.min(parteAtual + 1, PARTES_PROVA.length)} DE ${PARTES_PROVA.length} · ${parte.toUpperCase()}`,
        progresso: Math.min(1, parteAtual / PARTES_PROVA.length),
        acabou: parteAtual >= PARTES_PROVA.length,
        chaveAviso: `prova-${parteAtual}`,
      };
    }
  }
}

export function mmss(totalS: number) {
  const s = Math.max(0, Math.floor(totalS));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, '0');
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`;
}

// Texto que vai para o "o que você fez" do treino salvo
export function resumoTimer(c: ConfigTimer, decorridoS: number, rodadas: number, reps: number, parciais: number[]) {
  switch (c.modo) {
    case 'amrap':
      return `AMRAP ${c.minutos} min · ${rodadas} rodadas${reps ? ` + ${reps} reps` : ''}`;
    case 'emom':
      return `EMOM ${c.rodadas} × ${c.intervaloS} s`;
    case 'fortime':
      return `For Time · ${mmss(decorridoS)}${rodadas ? ` · ${rodadas} rodadas` : ''}${c.minutos ? ` (limite ${c.minutos} min)` : ''}`;
    case 'tabata':
      return `Tabata ${c.rodadas} × ${c.trabalhoS} s / ${c.descansoS} s`;
    case 'prova': {
      const linhas = parciais.map((p, i) => `${PARTES_PROVA[i]} ${mmss(p)}`);
      return `Prova híbrida · ${mmss(decorridoS)}\n${linhas.join(' · ')}`;
    }
  }
}
