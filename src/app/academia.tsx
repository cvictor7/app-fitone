import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { Logo } from '@/components/logo';
import { Texto } from '@/components/texto';
import { Cores, Espaco } from '@/constants/theme';
import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';

// Liga o aluno à academia (código da recepção) e, se tiver, ao personal (código que o personal gera no app).

function traduzir(msg: string) {
  if (msg.includes('academia não encontrado')) return 'Código da academia não encontrado. Peça na recepção.';
  if (msg.includes('inválido ou vencido')) return 'Código do personal inválido ou vencido. Peça um novo para ele.';
  if (msg.includes('é seu')) return 'Esse código é seu.';
  return 'Não deu certo agora. Confira a internet e tente de novo.';
}

export default function Academia() {
  const { perfil, recarregar } = useSessao();
  const [codigoAcademia, setCodigoAcademia] = useState('');
  const [codigoPersonal, setCodigoPersonal] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const pronto = codigoAcademia.trim().length >= 3;

  async function entrar() {
    setErro('');
    setSalvando(true);
    const r1 = await supabase.rpc('entrar_na_academia', { p_codigo: codigoAcademia });
    if (r1.error) {
      setSalvando(false);
      return setErro(traduzir(r1.error.message));
    }
    if (codigoPersonal.trim()) {
      const r2 = await supabase.rpc('usar_convite_personal', { p_codigo: codigoPersonal });
      if (r2.error) {
        setSalvando(false);
        await recarregar();
        return setErro(traduzir(r2.error.message));
      }
    }
    await recarregar();
    setSalvando(false);
  }

  const primeiroNome = perfil?.nome?.split(' ')[0] ?? '';

  return (
    <SafeAreaView style={estilos.tela}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <Logo largura={140} comCidade={false} />
          <View style={{ gap: Espaco.sm }}>
            <Texto variante="titulo">Bem-vindo, {primeiroNome}</Texto>
            <Texto variante="legenda">Agora ligue sua conta à academia.</Texto>
          </View>

          <View style={{ gap: Espaco.sm }}>
            <Texto variante="rotulo">CÓDIGO DA ACADEMIA</Texto>
            <Campo
              value={codigoAcademia}
              onChangeText={(t) => setCodigoAcademia(t.toUpperCase())}
              placeholder="Peça na recepção"
              autoCapitalize="characters"
              autoCorrect={false}
            />
          </View>

          <View style={{ gap: Espaco.sm }}>
            <Texto variante="rotulo">CÓDIGO DO SEU PERSONAL (OPCIONAL)</Texto>
            <Campo
              value={codigoPersonal}
              onChangeText={(t) => setCodigoPersonal(t.toUpperCase())}
              placeholder="6 letras e números"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={6}
            />
            <Texto variante="legenda">Sem personal? Pode deixar em branco e treinar por conta própria.</Texto>
          </View>

          <Botao
            titulo={salvando ? 'Entrando...' : 'Entrar na academia'}
            disabled={!pronto || salvando}
            style={(!pronto || salvando) && { opacity: 0.4 }}
            onPress={entrar}
          />

          {erro ? (
            <Texto variante="corpo" cor={Cores.perigo} style={{ textAlign: 'center' }}>
              {erro}
            </Texto>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { paddingHorizontal: Espaco.lg, paddingVertical: Espaco.xl, gap: Espaco.xl },
});
