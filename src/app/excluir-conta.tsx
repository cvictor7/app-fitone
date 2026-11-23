import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';
import { apagarTreinoAtivo } from '@/lib/treino-ativo';

// Excluir a conta (Google Play exige dentro do app; LGPD garante o direito).
// Para não apagar sem querer, a pessoa digita EXCLUIR.

export default function ExcluirConta() {
  const { papel, sair } = useSessao();
  const [texto, setTexto] = useState('');
  const [apagando, setApagando] = useState(false);
  const ehPersonal = papel === 'personal' || papel === 'admin';
  const confirmado = texto.trim().toUpperCase() === 'EXCLUIR';

  async function excluir() {
    setApagando(true);
    const { error } = await supabase.rpc('excluir_minha_conta');
    if (error) {
      setApagando(false);
      Alert.alert('Não deu para excluir', `Tente de novo com internet.\n(${error.message})`);
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await apagarTreinoAtivo();
    await sair();
    Alert.alert('Conta excluída', 'Seus dados foram apagados.');
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo="Excluir conta" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <Texto variante="titulo" cor={Cores.perigo}>
            Excluir minha conta
          </Texto>

          <View style={estilos.cartao}>
            <Texto variante="corpo" style={{ fontFamily: 'Archivo_700Bold' }}>
              O que é apagado, para sempre:
            </Texto>
            <Texto variante="corpo" cor={Cores.textoSecundario}>
              • seu login, nome e e-mail{'\n'}• todos os treinos, séries, recordes e evolução{'\n'}• seus planos e consentimentos
              {ehPersonal ? '\n• seus modelos e os planos que você montou para alunos' : ''}
            </Texto>
            {ehPersonal ? (
              <Texto variante="legenda">Exercícios e vídeos que você criou continuam na biblioteca da academia, sem o seu nome.</Texto>
            ) : null}
            <Texto variante="legenda">Não dá para desfazer. Se só quer parar de usar por um tempo, é melhor apenas sair da conta.</Texto>
          </View>

          <View style={{ gap: Espaco.sm }}>
            <Texto variante="rotulo">PARA CONFIRMAR, DIGITE EXCLUIR</Texto>
            <Campo value={texto} onChangeText={setTexto} autoCapitalize="characters" autoCorrect={false} placeholder="EXCLUIR" />
          </View>

          <Botao
            titulo={apagando ? 'Excluindo...' : 'Excluir minha conta'}
            cor={Cores.perigo}
            disabled={!confirmado || apagando}
            style={(!confirmado || apagando) && { opacity: 0.4 }}
            onPress={excluir}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, gap: Espaco.lg },
  cartao: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, padding: Espaco.md, gap: Espaco.sm },
});
