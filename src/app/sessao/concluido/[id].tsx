import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Modalidades, Raio } from '@/constants/theme';
import { buscarResumo, textoDuracao, textoVolume, type ResumoSessao } from '@/lib/sessao-resumo';
import { supabase } from '@/lib/supabase';

// Treino concluído: números do treino, recordes novos (calculados pelo banco) e "como foi".

const SENSACOES = ['Muito leve', 'Leve', 'Na medida', 'Pesado', 'No limite'];

export default function TreinoConcluido() {
  const { id, ver } = useLocalSearchParams<{ id: string; ver?: string }>();
  const revendo = ver === '1'; // aberto pelo histórico
  const [resumo, setResumo] = useState<ResumoSessao | null>(null);
  const [sensacao, setSensacao] = useState<number | null>(null);

  useEffect(() => {
    buscarResumo(id).then((r) => {
      setResumo(r);
      setSensacao(r?.sensacao ?? null);
      if (r && r.recordes.length > 0) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    });
  }, [id]);

  async function escolher(n: number) {
    Haptics.selectionAsync();
    setSensacao(n);
    await supabase.from('sessoes').update({ sensacao: n }).eq('id', id);
  }

  if (!resumo) {
    return (
      <SafeAreaView style={estilos.tela}>
        <ActivityIndicator color={Cores.verde} style={{ marginTop: 160 }} />
      </SafeAreaView>
    );
  }

  const cor = Modalidades[resumo.modalidade]?.cor ?? Cores.verde;

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Texto variante="rotulo" cor={cor}>
            TREINO FEITO
          </Texto>
          <Texto
            variante="display"
            cor={cor}
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ fontSize: resumo.rotulo.length <= 2 ? 140 : 88, lineHeight: resumo.rotulo.length <= 2 ? 132 : 92 }}>
            {resumo.rotulo}
          </Texto>
          {resumo.nome && resumo.nome.toUpperCase() !== resumo.rotulo ? (
            <Texto variante="subtitulo" style={{ textAlign: 'center' }}>
              {resumo.nome}
            </Texto>
          ) : null}
          <Texto variante="legenda">
            {resumo.concluidaEm.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Texto>
        </View>

        <View style={estilos.numeros}>
          {(resumo.series > 0
            ? [
                [textoDuracao(resumo.duracaoS), 'duração'],
                [textoVolume(resumo.volumeKg), 'kg de volume'],
                [String(resumo.series), resumo.series === 1 ? 'série' : 'séries'],
              ]
            : [[textoDuracao(resumo.duracaoS), 'de treino']]
          ).map(([n, r]) => (
            <View key={r} style={{ flex: 1, alignItems: 'center' }}>
              <Texto variante="numero" style={{ fontSize: 34, lineHeight: 36 }}>
                {n}
              </Texto>
              <Texto variante="legenda">{r}</Texto>
            </View>
          ))}
        </View>

        {resumo.observacao ? (
          <View style={estilos.obs}>
            <Texto variante="rotulo">O QUE VOCÊ FEZ</Texto>
            <Texto variante="corpo">{resumo.observacao}</Texto>
          </View>
        ) : null}

        {resumo.recordes.length > 0 ? (
          <View style={estilos.recordes}>
            <Texto variante="rotulo" cor={Cores.amarelo}>
              {resumo.recordes.length === 1 ? '1 RECORDE NOVO' : `${resumo.recordes.length} RECORDES NOVOS`}
            </Texto>
            {resumo.recordes.map((r) => (
              <View key={r.exercicio} style={estilos.linhaRecorde}>
                <Texto variante="corpo" style={{ flex: 1 }}>
                  {r.exercicio}
                </Texto>
                <Texto variante="numero" style={{ fontSize: 24, lineHeight: 26 }}>
                  {r.valorKg.toLocaleString('pt-BR')} kg
                </Texto>
              </View>
            ))}
          </View>
        ) : null}

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">COMO FOI?</Texto>
          <View style={estilos.sensacoes}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Pressable
                key={n}
                onPress={() => escolher(n)}
                style={[estilos.sensacao, sensacao === n && { backgroundColor: cor, borderColor: cor }]}>
                <Texto variante="numero" cor={sensacao === n ? Cores.preto : Cores.texto} style={{ fontSize: 26, lineHeight: 28 }}>
                  {n}
                </Texto>
              </Pressable>
            ))}
          </View>
          <Texto variante="legenda" style={{ textAlign: 'center', minHeight: 18 }}>
            {sensacao ? SENSACOES[sensacao - 1] : ' '}
          </Texto>
        </View>
      </ScrollView>

      <View style={estilos.rodape}>
        <Botao titulo="Compartilhar" cor={cor} onPress={() => router.push(`/sessao/compartilhar/${id}`)} />
        <Botao
          titulo={revendo ? 'Voltar' : 'Concluir'}
          tipo="secundario"
          cor={cor}
          onPress={() => (revendo ? router.back() : router.replace('/'))}
        />
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, gap: Espaco.lg },
  numeros: { flexDirection: 'row' },
  recordes: {
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderLeftWidth: 4,
    borderLeftColor: Cores.amarelo,
    padding: Espaco.md,
    gap: Espaco.sm,
  },
  obs: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, padding: Espaco.md, gap: Espaco.xs },
  linhaRecorde: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md },
  sensacoes: { flexDirection: 'row', justifyContent: 'space-between' },
  sensacao: {
    width: 58,
    height: 58,
    borderRadius: Raio.md,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rodape: { paddingHorizontal: Espaco.lg, paddingTop: Espaco.sm, gap: Espaco.sm },
});
