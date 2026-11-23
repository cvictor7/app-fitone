import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { historicoDoTreino, variacao, type HistoricoTreino } from '@/lib/historico';
import { textoDuracao } from '@/lib/sessao-resumo';

// Histórico de um treino do plano (ex.: todas as vezes que fez o PUSH) e a evolução:
// volume e carga de cada exercício contra a vez anterior e contra a primeira.

function Delta({ v }: { v: number | null }) {
  if (v === null || v === 0) return null;
  return (
    <Texto variante="legenda" cor={v > 0 ? Cores.verde : Cores.perigo} style={{ fontFamily: 'Archivo_600SemiBold' }}>
      {v > 0 ? '+' : ''}
      {v}%
    </Texto>
  );
}

export function HistoricoDoTreino({ alunoId, treinoId, cor, musculacao }: { alunoId: string; treinoId: string; cor: string; musculacao: boolean }) {
  const [h, setH] = useState<HistoricoTreino | null>(null);
  const [todos, setTodos] = useState(false);

  useEffect(() => {
    historicoDoTreino(alunoId, treinoId).then(setH).catch(() => setH({ sessoes: [], exercicios: [] }));
  }, [alunoId, treinoId]);

  if (!h) return <ActivityIndicator color={cor} />;
  if (h.sessoes.length === 0) {
    return (
      <View style={estilos.cartao}>
        <Texto variante="rotulo">HISTÓRICO DESTE TREINO</Texto>
        <Texto variante="legenda">Você ainda não fez este treino. A evolução aparece aqui depois da primeira vez.</Texto>
      </View>
    );
  }

  const ultima = h.sessoes[0];
  const anterior = h.sessoes[1] ?? null;
  const primeira = h.sessoes[h.sessoes.length - 1];
  const lista = todos ? h.sessoes : h.sessoes.slice(0, 5);
  const subiram = h.exercicios.filter((e) => e.atualKg > e.primeiroKg).length;

  return (
    <View style={{ gap: Espaco.sm }}>
      <Texto variante="rotulo">
        HISTÓRICO DESTE TREINO · {h.sessoes.length} {h.sessoes.length === 1 ? 'VEZ' : 'VEZES'}
      </Texto>

      {musculacao && h.sessoes.length > 1 ? (
        <View style={estilos.cartao}>
          <View style={estilos.comparar}>
            <View style={{ flex: 1 }}>
              <Texto variante="legenda">Volume da última vez</Texto>
              <Texto variante="numero" style={{ fontSize: 26, lineHeight: 28 }}>
                {(Math.round(ultima.volumeKg / 100) / 10).toLocaleString('pt-BR')} t
              </Texto>
            </View>
            <View style={{ alignItems: 'flex-end', gap: 2 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Texto variante="legenda">vs anterior</Texto>
                <Delta v={variacao(ultima.volumeKg, anterior?.volumeKg ?? null)} />
              </View>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <Texto variante="legenda">vs 1ª vez</Texto>
                <Delta v={variacao(ultima.volumeKg, primeira.volumeKg)} />
              </View>
            </View>
          </View>
          {h.exercicios.length > 0 ? (
            <>
              <Texto variante="legenda">
                Carga máxima: subiu em {subiram} de {h.exercicios.length} exercícios desde a 1ª vez ({primeira.data.toLocaleDateString('pt-BR')})
              </Texto>
              {h.exercicios.map((e) => (
                <View key={e.exercicioId} style={estilos.linhaEx}>
                  <Texto variante="corpo" style={{ flex: 1, fontSize: 14 }} numberOfLines={1}>
                    {e.nome}
                  </Texto>
                  <Texto variante="legenda">
                    {e.primeiroKg.toLocaleString('pt-BR')} → {e.atualKg.toLocaleString('pt-BR')} kg
                  </Texto>
                  <View style={{ width: 46, alignItems: 'flex-end' }}>
                    <Delta v={variacao(e.atualKg, e.primeiroKg)} />
                  </View>
                </View>
              ))}
            </>
          ) : null}
        </View>
      ) : null}

      <View style={estilos.lista}>
        {lista.map((s, i) => (
          <Pressable
            key={s.id}
            onPress={() => router.push(`/sessao/concluido/${s.id}?ver=1`)}
            style={[estilos.linha, i > 0 && estilos.separador]}>
            <Texto variante="corpo" style={{ width: 92 }}>
              {s.data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
            </Texto>
            <Texto variante="legenda" style={{ flex: 1 }}>
              {textoDuracao(s.duracaoS)}
              {s.volumeKg > 0 ? ` · ${(Math.round(s.volumeKg / 100) / 10).toLocaleString('pt-BR')} t` : ''}
            </Texto>
            <Texto variante="legenda" cor={Cores.textoApagado}>
              ›
            </Texto>
          </Pressable>
        ))}
      </View>
      {h.sessoes.length > 5 ? (
        <Pressable onPress={() => setTodos((v) => !v)} style={{ alignSelf: 'center' }} hitSlop={8}>
          <Texto variante="corpo" cor={cor}>
            {todos ? 'Ver menos' : `Ver as ${h.sessoes.length} vezes`}
          </Texto>
        </Pressable>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, padding: Espaco.md, gap: Espaco.sm },
  comparar: { flexDirection: 'row', alignItems: 'center' },
  linhaEx: { flexDirection: 'row', alignItems: 'center', gap: Espaco.sm, borderTopWidth: 1, borderTopColor: Cores.borda, paddingTop: 8 },
  lista: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, paddingHorizontal: Espaco.md },
  linha: { flexDirection: 'row', alignItems: 'center', minHeight: 50, gap: Espaco.sm },
  separador: { borderTopWidth: 1, borderTopColor: Cores.borda },
});
