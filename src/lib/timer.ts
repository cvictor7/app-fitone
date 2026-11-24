// Contas dos timers de Cross e Hybrid. Tudo é calculado a partir do tempo decorrido
// (relógio do celular), então continua certo mesmo se o app ficar em segundo plano.

export type ModoTimer = 'amrap' | 'emom' | 'fortime' | 'tabata' | 'prova' | 'janela';

// Uma estação do treino montado (ex.: "Wall ball" · "30 reps", "Corrida" · "200 m")
export type Estacao = { nome: string; alvo: string };

export type ConfigTimer = {
  modo: ModoTimer;
  minutos: number; // AMRAP: duração · For Time: limite (0 = sem limite)
  intervaloS: number; // EMOM
  rodadas: number; // EMOM e Tabata
  trabalhoS: number; // Tabata
  descansoS: number; // Tabata
  estacoes: Estacao[]; // Estações (por tempo) e Janela
  voltas: number; // quantas vezes repete a lista de estações
  janelaS: number; // Janela: tempo de cada estação (o que sobra é descanso)
};

export const NOMES_MODO: Record<ModoTimer, string> = {
  amrap: 'AMRAP',
  emom: 'EMOM',
  fortime: 'For Time',
  tabata: 'Tabata',
  prova: 'Estações',
  janela: 'Estações na janela',
};

export const EXPLICACAO_MODO: Record<ModoTimer, string> = {
  amrap: 'O máximo de rodadas no tempo.',
  emom: 'Uma tarefa no começo de cada minuto; o que sobra é descanso.',
  fortime: 'Terminar o mais rápido possível (com limite de tempo, se quiser).',
  tabata: 'Trabalho e descanso alternados (20 s / 10 s × 8).',
  prova: 'Monte as estações (com ou sem corrida) e faça no menor tempo. Toque em Próxima a cada estação.',
  janela: 'Cada estação tem um tempo fixo (ex.: 1 min). Terminou antes? Descansa o que sobrar. Acabou o tempo, vai para a próxima.',
};

export const CONFIG_PADRAO: ConfigTimer = {
  modo: 'amrap',
  minutos: 12,
  intervaloS: 60,
  rodadas: 10,
  trabalhoS: 20,
  descansoS: 10,
  estacoes: [],
  voltas: 1,
  janelaS: 60,
};

// Modelo da prova híbrida oficial (nomes genéricos). O aluno/personal pode mudar tudo.
export const PROVA_OFICIAL: Estacao[] = [
  { nome: 'Corrida', alvo: '1 km' },
  { nome: 'Ski', alvo: '1000 m' },
  { nome: 'Corrida', alvo: '1 km' },
  { nome: 'Empurrar trenó', alvo: '50 m' },
  { nome: 'Corrida', alvo: '1 km' },
  { nome: 'Puxar trenó', alvo: '50 m' },
  { nome: 'Corrida', alvo: '1 km' },
  { nome: 'Burpee com salto', alvo: '80 m' },
  { nome: 'Corrida', alvo: '1 km' },
  { nome: 'Remo', alvo: '1000 m' },
  { nome: 'Corrida', alvo: '1 km' },
  { nome: 'Carregar peso', alvo: '200 m' },
  { nome: 'Corrida', alvo: '1 km' },
  { nome: 'Avanço com saco', alvo: '100 m' },
  { nome: 'Corrida', alvo: '1 km' },
  { nome: 'Wall ball', alvo: '100 reps' },
];

// Atalhos para montar rápido
export const ESTACOES_RAPIDAS: Estacao[] = [
  { nome: 'Corrida', alvo: '200 m' },
  { nome: 'Corrida', alvo: '400 m' },
  { nome: 'Corrida', alvo: '1 km' },
  { nome: 'Wall ball', alvo: '20 reps' },
  { nome: 'Empurrar trenó', alvo: '20 m' },
  { nome: 'Puxar trenó', alvo: '20 m' },
  { nome: 'Burpee', alvo: '15 reps' },
  { nome: 'Burpee com salto', alvo: '20 m' },
  { nome: 'Remo', alvo: '500 m' },
  { nome: 'Ski', alvo: '500 m' },
  { nome: 'Carregar peso', alvo: '100 m' },
  { nome: 'Avanço com saco', alvo: '50 m' },
  { nome: 'Flexão', alvo: '20 reps' },
  { nome: 'KB swing', alvo: '20 reps' },
  { nome: 'Box jump', alvo: '15 reps' },
  { nome: 'Abdominal', alvo: '20 reps' },
  { nome: 'Bike', alvo: '1 km' },
];

export const ehCorrida = (e: Estacao) => /^corrida/i.test(e.nome.trim());

/** Lista completa na ordem (repete as estações pelo número de voltas). */
export function sequencia(c: ConfigTimer): (Estacao & { volta: number })[] {
  const base = c.estacoes.length ? c.estacoes : PROVA_OFICIAL;
  const n = Math.max(1, c.voltas || 1);
  return Array.from({ length: n }, (_, v) => base.map((e) => ({ ...e, volta: v + 1 }))).flat();
}

// Montagem de estações guardada no treino do plano (personal prescreve)
export type TimerPrescrito = { modo: 'prova' | 'janela'; estacoes: Estacao[]; voltas: number; janelaS: number };

export const textoEstacao = (e: Estacao) => `${e.nome}${e.alvo ? ` ${e.alvo}` : ''}`;

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
      const seq = sequencia(c);
      const parte = seq[Math.min(parteAtual, seq.length - 1)];
      return {
        principalS: t,
        fase: ehCorrida(parte) ? 'corrida' : 'trabalho',
        rotulo: `ESTAÇÃO ${Math.min(parteAtual + 1, seq.length)} DE ${seq.length}${c.voltas > 1 ? ` · VOLTA ${parte.volta}` : ''}`,
        progresso: Math.min(1, parteAtual / seq.length),
        acabou: parteAtual >= seq.length,
        chaveAviso: `prova-${parteAtual}`,
      };
    }
    case 'janela': {
      const seq = sequencia(c);
      const idx = Math.floor(t / c.janelaS);
      const parte = seq[Math.min(idx, seq.length - 1)];
      return {
        principalS: c.janelaS - (t % c.janelaS),
        fase: ehCorrida(parte) ? 'corrida' : 'trabalho',
        rotulo: `ESTAÇÃO ${Math.min(idx + 1, seq.length)} DE ${seq.length}${c.voltas > 1 ? ` · VOLTA ${parte.volta}` : ''}`,
        progresso: Math.min(1, t / (c.janelaS * seq.length)),
        acabou: idx >= seq.length,
        chaveAviso: `janela-${idx}`,
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
      const seq = sequencia(c);
      const linhas = parciais.map((p, i) => `${textoEstacao(seq[i])} ${mmss(p)}`);
      return `Estações · ${mmss(decorridoS)}${c.voltas > 1 ? ` (${c.voltas} voltas)` : ''}\n${linhas.join(' · ')}`;
    }
    case 'janela': {
      const seq = sequencia(c);
      const linhas = parciais.map((p, i) => (seq[i] ? `${textoEstacao(seq[i])} ${p > 0 ? mmss(p) : '–'}` : '')).filter(Boolean);
      return `Estações na janela de ${c.janelaS} s · ${seq.length} estações\n${linhas.join(' · ')}`;
    }
  }
}
