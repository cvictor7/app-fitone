import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio, infoModalidade } from '@/constants/theme';
import { buscarResumo, textoDuracao, textoVolume, type ResumoSessao } from '@/lib/sessao-resumo';

// Card da Hoje depois que o treino do dia foi feito: números, melhor série e recordes.
type Props = { sessaoId: string; letra?: string | null; nome?: string | null };

export function CardFeitoHoje({ sessaoId, letra, nome }: Props) {
  const [r, setR] = useState<ResumoSessao | null>(null);

  useEffect(() => {
    buscarResumo(sessaoId).then(setR);
  }, [sessaoId]);

  if (!r) {
    return (
      <View style={[estilos.card, { alignItems: 'center', paddingVertical: Espaco.xl }]}>
        <ActivityIndicator color={Cores.verde} />
      </View>
    );
  }

  const info = infoModalidade(r.modalidade);
  const musculacao = r.series > 0;
  const numeros: [string, string][] = musculacao
    ? [
        [textoDuracao(r.duracaoS), 'duração'],
        [textoVolume(r.volumeKg), 'kg de volume'],
        [String(r.series), 'séries'],
      ]
    : [
        [textoDuracao(r.duracaoS), 'de treino'],
        [r.sensacao ? ['Muito leve', 'Leve', 'Na medida', 'Pesado', 'No limite'][r.sensacao - 1] : '—', 'como foi'],
      ];

  return (
    <View style={[estilos.card, { borderLeftColor: info.cor }]}>
      <View style={estilos.topo}>
        <View style={{ flex: 1, gap: 4 }}>
          <Texto variante="rotulo" cor={info.cor}>
            TREINO DE HOJE FEITO ✓
          </Texto>
          <Texto variante="subtitulo">{nome || r.nome || info.nome}</Texto>
        </View>
        <Texto variante="display" cor={info.cor} style={estilos.letra}>
          {letra ?? r.letra ?? '✓'}
        </Texto>
      </View>

      <View style={estilos.numeros}>
        {numeros.map(([n, rot]) => (
          <View key={rot} style={{ flex: 1 }}>
            <Texto variante="numero" style={{ fontSize: 28, lineHeight: 30 }}>
              {n}
            </Texto>
            <Texto variante="legenda">{rot}</Texto>
          </View>
        ))}
      </View>

      {r.melhorSerie ? (
        <View style={estilos.linha}>
          <Texto variante="legenda" style={{ flex: 1 }}>
            Melhor série: {r.melhorSerie.exercicio.toLowerCase()}
          </Texto>
          <Texto variante="subtitulo" style={{ fontSize: 18, textTransform: 'none' }}>
            {r.melhorSerie.kg.toLocaleString('pt-BR')} kg × {r.melhorSerie.reps}
          </Texto>
        </View>
      ) : null}
      {r.recordes.length > 0 ? (
        <View style={estilos.linha}>
          <Texto variante="legenda" cor={Cores.amarelo} style={{ flex: 1 }}>
            {r.recordes.length === 1 ? '1 recorde novo' : `${r.recordes.length} recordes novos`}: {r.recordes.map((x) => x.exercicio.toLowerCase()).join(', ')}
          </Texto>
        </View>
      ) : null}
      {!musculacao && r.observacao ? (
        <Texto variante="legenda" numberOfLines={3}>
          {r.observacao}
        </Texto>
      ) : null}

      <View style={{ flexDirection: 'row', gap: Espaco.sm }}>
        <Botao titulo="Compartilhar" cor={info.cor} style={{ flex: 1, minHeight: 52 }} onPress={() => router.push(`/sessao/compartilhar/${r.id}`)} />
        <Botao titulo="Detalhes" tipo="secundario" cor={info.cor} style={{ flex: 1, minHeight: 52 }} onPress={() => router.push(`/sessao/concluido/${r.id}`)} />
      </View>
      <Pressable onPress={() => router.push('/treinar')} style={{ alignSelf: 'center' }} hitSlop={8}>
        <Texto variante="corpo" cor={Cores.textoSecundario}>
          Treinar mais hoje →
        </Texto>
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  card: {
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderLeftWidth: 4,
    padding: Espaco.md + 4,
    gap: Espaco.md,
    overflow: 'hidden',
  },
  topo: { flexDirection: 'row', alignItems: 'flex-start' },
  letra: { fontSize: 96, lineHeight: 90, marginTop: -6 },
  numeros: { flexDirection: 'row' },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Espaco.sm, borderTopWidth: 1, borderTopColor: Cores.borda, paddingTop: Espaco.sm },
});
