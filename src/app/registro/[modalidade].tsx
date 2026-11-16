import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { IconeVoltar } from '@/components/icones';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Fontes, Modalidades, Raio, type Modalidade } from '@/constants/theme';

// Registro rápido das modalidades que ainda não têm tela própria (Fase 1).
// Na Fase 2: Cross e Hyrox ganham timers; Corrida e Bike vêm do relógio.

const SENSACOES = ['Muito leve', 'Leve', 'Na medida', 'Pesado', 'No limite'];

export default function RegistroRapido() {
  const { modalidade } = useLocalSearchParams<{ modalidade: Modalidade }>();
  const info = Modalidades[modalidade as Modalidade] ?? Modalidades.livre;

  const [minutos, setMinutos] = useState(45);
  const [sensacao, setSensacao] = useState<number | null>(null);
  const [observacao, setObservacao] = useState('');

  function mudarMinutos(delta: number) {
    Haptics.selectionAsync();
    setMinutos((m) => Math.max(5, Math.min(300, m + delta)));
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <View style={estilos.barraTopo}>
        <Pressable accessibilityLabel="Voltar" onPress={() => router.back()} hitSlop={12} style={estilos.voltar}>
          <IconeVoltar cor={Cores.texto} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
        <View style={{ gap: Espaco.sm }}>
          <View style={[estilos.faixa, { backgroundColor: info.cor }]} />
          <Texto variante="titulo">{info.nome}</Texto>
          <Texto variante="legenda">Registre o treino que você fez.</Texto>
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
          <Texto variante="rotulo">OBSERVAÇÃO (OPCIONAL)</Texto>
          <TextInput
            value={observacao}
            onChangeText={setObservacao}
            placeholder="Ex.: WOD com burpee e remo"
            placeholderTextColor={Cores.textoApagado}
            multiline
            style={estilos.campo}
          />
        </View>
      </ScrollView>

      <View style={estilos.rodape}>
        <Botao
          titulo="Salvar treino"
          cor={info.cor}
          onPress={() =>
            Alert.alert('Treino registrado', 'Exemplo: o salvamento de verdade entra junto com o Supabase.', [
              { text: 'Ok', onPress: () => router.back() },
            ])
          }
        />
      </View>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  barraTopo: { paddingHorizontal: Espaco.md, paddingVertical: Espaco.sm },
  voltar: { width: 44, height: 44, justifyContent: 'center' },
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
