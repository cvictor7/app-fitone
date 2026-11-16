import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { Logo } from '@/components/logo';
import { Texto } from '@/components/texto';
import { Cores, Espaco } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// Entrar sem senha: a pessoa digita o e-mail e recebe um código.
// Primeiro acesso = cadastro. Depois disso o app lembra e não pede de novo.

function traduzirErro(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('rate limit') || m.includes('security purposes')) return 'Muitos códigos pedidos em pouco tempo. Espere alguns minutos e tente de novo.';
  if (m.includes('expired') || m.includes('invalid')) return 'Código errado ou vencido. Confira o e-mail ou peça outro.';
  if (m.includes('email')) return 'Confira se o e-mail está certo.';
  if (m.includes('network') || m.includes('fetch')) return 'Sem internet. Confira a conexão e tente de novo.';
  return 'Não deu certo agora. Tente de novo.';
}

export default function Entrar() {
  const [passo, setPasso] = useState<'email' | 'codigo'>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const emailValido = /^\S+@\S+\.\S+$/.test(email.trim());

  async function enviarCodigo() {
    setErro('');
    setEnviando(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true },
    });
    setEnviando(false);
    if (error) return setErro(traduzirErro(error.message));
    setCodigo('');
    setPasso('codigo');
  }

  async function confirmarCodigo() {
    setErro('');
    setEnviando(true);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: codigo.trim(),
      type: 'email',
    });
    setEnviando(false);
    if (error) setErro(traduzirErro(error.message));
    // Deu certo: o layout raiz troca de tela sozinho
  }

  return (
    <SafeAreaView style={estilos.tela}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <View style={estilos.marca}>
            <Logo largura={220} />
          </View>

          {passo === 'email' ? (
            <View style={estilos.bloco}>
              <Texto variante="titulo">Bora treinar</Texto>
              <Texto variante="legenda">Entre com seu e-mail. A gente manda um código, sem senha para decorar.</Texto>
              <Campo
                value={email}
                onChangeText={setEmail}
                placeholder="seuemail@exemplo.com"
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                returnKeyType="send"
                onSubmitEditing={() => emailValido && enviarCodigo()}
              />
              <Botao
                titulo={enviando ? 'Enviando...' : 'Receber código'}
                disabled={!emailValido || enviando}
                style={(!emailValido || enviando) && { opacity: 0.4 }}
                onPress={enviarCodigo}
              />
            </View>
          ) : (
            <View style={estilos.bloco}>
              <Texto variante="titulo">Confira seu e-mail</Texto>
              <Texto variante="legenda">
                Mandamos um código para {email.trim().toLowerCase()}. Olhe também a caixa de spam.
              </Texto>
              <Campo
                value={codigo}
                onChangeText={(t) => setCodigo(t.replace(/\D/g, ''))}
                placeholder="000000"
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={8}
                style={estilos.campoCodigo}
              />
              <Botao
                titulo={enviando ? 'Conferindo...' : 'Entrar'}
                disabled={codigo.length < 6 || enviando}
                style={(codigo.length < 6 || enviando) && { opacity: 0.4 }}
                onPress={confirmarCodigo}
              />
              <View style={estilos.linhaLinks}>
                <Pressable onPress={() => setPasso('email')} hitSlop={10}>
                  <Texto variante="corpo" cor={Cores.textoSecundario}>
                    Trocar e-mail
                  </Texto>
                </Pressable>
                <Pressable onPress={enviarCodigo} hitSlop={10} disabled={enviando}>
                  <Texto variante="corpo" cor={Cores.verde}>
                    Mandar outro código
                  </Texto>
                </Pressable>
              </View>
            </View>
          )}

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
  conteudo: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Espaco.lg,
    paddingVertical: Espaco.xl,
    gap: Espaco.xl,
  },
  marca: { alignItems: 'center', marginBottom: Espaco.md },
  bloco: { gap: Espaco.md },
  campoCodigo: {
    fontSize: 32,
    letterSpacing: 10,
    textAlign: 'center',
    fontFamily: 'BigShouldersDisplay_900Black',
  },
  linhaLinks: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: Espaco.xs },
});
