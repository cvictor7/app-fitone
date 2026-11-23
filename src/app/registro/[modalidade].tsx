import * as Crypto from 'expo-crypto';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { BarraTopo } from '@/components/barra-topo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Fontes, Modalidades, Raio, type Modalidade } from '@/constants/theme';
import { useDadosAluno } from '@/lib/dados';
import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';

// Registro rápido das modalidades que ainda não têm tela própria (Fase 1).
// Na Fase 2: Cross e Hybrid ganham timers; Corrida e Bike vêm do relógio.

const SENSACOES = ['Muito leve', 'Leve', 'Na medida', 'Pesado', 'No limite'];

export default function RegistroRapido() {
  const { modalidade, treino: treinoId } = useLocalSearchParams<{ modalidade: Modalidade; treino?: string }>();
  const dados = useDadosAluno();
  const treinoDoPlano = treinoId ? dados.plano?.treinos.find((t) => t.id === treinoId) : undefined;
  const info = Modalidades[modalidade as Modalidade] ?? Modalidades.livre;

  const [minutos, setMinutos] = useState(45);
  const [sensacao, setSensacao] = useState<number | null>(null);
  const [observacao, setObservacao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const { gymId } = useSessao();

  // Treino prescrito no plano: já vem com a duração e o que fazer
  const preencheu = useRef(false);
  useEffect(() => {
    if (preencheu.current || !treinoDoPlano) return;
    preencheu.current = true;
    if (treinoDoPlano.duracaoMin) setMinutos(treinoDoPlano.duracaoMin);
    if (treinoDoPlano.descricao) setObservacao(treinoDoPlano.descricao);
  }, [treinoDoPlano]);

  // id criado no celular uma vez só: se o sinal cair e você tocar em Salvar de novo, não duplica
  const idSessao = useRef(Crypto.randomUUID()).current;

  async function salvar() {
    setSalvando(true);
    const fim = new Date();
    const inicio = new Date(fim.getTime() - minutos * 60000);
    const { data, error } = await supabase.from('sessoes').insert({
      id: idSessao,
      gym_id: gymId,
      modalidade: modalidade in Modalidades ? modalidade : 'livre',
      treino_id: treinoDoPlano?.id ?? null,
      origem: 'app',
      iniciada_em: inicio.toISOString(),
      concluida_em: fim.toISOString(),
      duracao_s: minutos * 60,
      sensacao: sensacao === null ? null : sensacao + 1,
      observacao: observacao.trim() || null,
      status: 'concluida',
    }).select('id').single();
    setSalvando(false);
    // 23505 = já tinha salvo na tentativa anterior (a resposta é que se perdeu)
    if (error && error.code === '23505') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace(`/sessao/concluido/${idSessao}`);
      return;
    }
    if (error) {
      Alert.alert('Não deu para salvar', `Confira a internet e tente de novo.\n(${error.message})`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.replace(`/sessao/concluido/${data.id}`);
  }

  function mudarMinutos(delta: number) {
    Haptics.selectionAsync();
    setMinutos((m) => Math.max(5, Math.min(300, m + delta)));
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo />

      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <View style={{ gap: Espaco.sm }}>
          <View style={[estilos.faixa, { backgroundColor: info.cor }]} />
          <Texto variante="titulo">{treinoDoPlano ? treinoDoPlano.rotulo : info.nome}</Texto>
          <Texto variante="legenda">
            {treinoDoPlano ? treinoDoPlano.nome : 'Registre o treino que você fez.'}
          </Texto>
        </View>

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">DURAÇÃO</Texto>
          <View style={estilos.contador}>
            <Pressable accessibilityLabel="Menos 5 minutos" onPress={() => mudarMinutos(-5)} style={estilos.botaoContador}>
              <Texto variante="titulo">−5</Texto>
            </Pressable>
            <View style={{ alignItems: 'center' }}>
              <Texto variante="display" cor={info.cor} style={{ fontSize: 72, lineHeight: 74 }}>
                {minutos}
              </Texto>
              <Texto variante="legenda">minutos</Texto>
            </View>
            <Pressable accessibilityLabel="Mais 5 minutos" onPress={() => mudarMinutos(5)} style={estilos.botaoContador}>
              <Texto variante="titulo">+5</Texto>
            </Pressable>
          </View>
        </View>

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">COMO FOI?</Texto>
          <View style={estilos.sensacoes}>
            {SENSACOES.map((s, i) => {
              const ativo = sensacao === i;
              return (
                <Pressable
                  key={s}
                  accessibilityRole="button"
                  onPress={() => {
                    Haptics.selectionAsync();
                    setSensacao(i);
                  }}
                  style={[estilos.sensacao, ativo && { backgroundColor: info.cor, borderColor: info.cor }]}>
                  <Texto variante="numero" cor={ativo ? Cores.preto : Cores.texto} style={{ fontSize: 26, lineHeight: 28 }}>
                    {i + 1}
                  </Texto>
                </Pressable>
              );
            })}
          </View>
          <Texto variante="legenda" style={{ textAlign: 'center', minHeight: 18 }}>
            {sensacao === null ? ' ' : SENSACOES[sensacao]}
          </Texto>
        </View>

        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">O QUE VOCÊ FEZ (OPCIONAL)</Texto>
          <TextInput
            value={observacao}
            onChangeText={setObservacao}
            placeholder="O que você fez? Ex.: AMRAP 12 min: 10 burpees, 15 KB swing, 200 m remo. Aparece no card de compartilhar."
            placeholderTextColor={Cores.textoApagado}
            multiline
            style={estilos.campo}
          />
        </View>
      </ScrollView>

      <View style={estilos.rodape}>
        <Botao
          titulo={salvando ? 'Salvando...' : 'Salvar treino'}
          cor={info.cor}
          disabled={salvando}
          onPress={salvar}
        />
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { paddingHorizontal: Espaco.lg - 4, paddingBottom: Espaco.lg, gap: Espaco.xl },
  faixa: { width: 40, height: 6, borderRadius: 3 },
  contador: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    padding: Espaco.md,
  },
  botaoContador: {
    width: 72,
    height: 72,
    borderRadius: Raio.md,
    backgroundColor: Cores.superficieAlta,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  campo: {
    minHeight: 88,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.md,
    padding: Espaco.md,
    color: Cores.texto,
    fontFamily: Fontes.texto,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  rodape: {
    paddingHorizontal: Espaco.lg - 4,
    paddingVertical: Espaco.sm,
    borderTopWidth: 1,
    borderTopColor: Cores.borda,
  },
});
