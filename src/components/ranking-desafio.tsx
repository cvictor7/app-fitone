import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { BarraProgresso } from '@/components/card-desafio';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { textoMeta, type LinhaDesafio, type Medida } from '@/lib/desafios';

// Classificação de um desafio: só quem entrou aparece, com nome abreviado.

export function RankingDesafio({ linhas, meta, medida }: { linhas: LinhaDesafio[]; meta: number; medida: Medida }) {
  if (linhas.length === 0) {
    return (
      <Texto variante="corpo" cor={Cores.textoSecundario}>
        Ninguém entrou ainda.
      </Texto>
    );
  }
  return (
    <View style={{ gap: Espaco.sm }}>
      {linhas.map((r, i) => {
        const completou = r.progresso >= meta;
        return (
          <View key={r.userId} style={[estilos.linha, r.eu && { borderColor: Cores.verde }]}>
            <Texto variante="numero" cor={i < 3 ? Cores.verde : Cores.textoApagado} style={{ width: 30, fontSize: 24, lineHeight: 26 }}>
              {i + 1}
            </Texto>
            <Avatar nome={r.autor} tamanho={34} />
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Texto variante="corpo" style={{ fontFamily: 'Archivo_600SemiBold' }} numberOfLines={1}>
                  {r.eu ? `${r.autor} (você)` : r.autor}
                </Texto>
                <Texto variante="corpo" cor={completou ? Cores.verde : Cores.texto}>
                  {completou ? '✓ ' : ''}
                  {textoMeta(medida, r.progresso)}
                </Texto>
              </View>
              <BarraProgresso valor={r.progresso} meta={meta} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.sm,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderWidth: 1.5,
    borderColor: 'transparent',
    padding: Espaco.md,
  },
});
