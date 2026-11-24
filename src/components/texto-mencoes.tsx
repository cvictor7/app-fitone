import type { TextStyle } from 'react-native';

import { Texto } from '@/components/texto';
import { Cores } from '@/constants/theme';
import { partesTexto } from '@/lib/mencoes';

// Mostra um texto com as @menções em verde (sem o código do banco).
export function TextoComMencoes({
  texto,
  cor,
  corMencao = Cores.verde,
  numberOfLines,
  style,
}: {
  texto: string;
  cor?: string;
  corMencao?: string; // em balão verde, a menção vai em preto
  numberOfLines?: number;
  style?: TextStyle;
}) {
  return (
    <Texto variante="corpo" cor={cor} numberOfLines={numberOfLines} style={style}>
      {partesTexto(texto).map((p, i) =>
        p.tipo === 'texto' ? (
          p.valor
        ) : (
          <Texto key={i} variante="corpo" cor={corMencao} style={{ fontFamily: 'Archivo_700Bold' }}>
            @{p.nome}
          </Texto>
        ),
      )}
    </Texto>
  );
}
