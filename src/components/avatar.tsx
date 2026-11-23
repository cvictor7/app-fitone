import { View } from 'react-native';

import { Texto } from '@/components/texto';
import { Cores, Modalidades } from '@/constants/theme';

// Bolinha com as iniciais. A cor sai do nome, para cada pessoa ter sempre a mesma.
const CORES = [Cores.verde, Modalidades.hybrid.cor, Modalidades.cross.cor, Modalidades.corrida.cor, Modalidades.bike.cor, Modalidades.hyrox.cor];

export function iniciais(nome: string) {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  if (p.length === 0) return '?';
  return ((p[0][0] ?? '') + (p.length > 1 ? p[p.length - 1][0] : '')).toUpperCase();
}

export function Avatar({ nome, tamanho = 42 }: { nome: string; tamanho?: number }) {
  let soma = 0;
  for (const c of nome) soma += c.charCodeAt(0);
  const cor = CORES[soma % CORES.length];
  return (
    <View
      style={{
        width: tamanho,
        height: tamanho,
        borderRadius: tamanho / 2,
        backgroundColor: cor,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Texto variante="subtitulo" cor={Cores.preto} style={{ fontSize: tamanho * 0.4, lineHeight: tamanho * 0.48 }}>
        {iniciais(nome)}
      </Texto>
    </View>
  );
}
