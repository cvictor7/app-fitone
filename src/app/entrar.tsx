import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { Logo } from '@/components/logo';
import { Texto } from '@/components/texto';
import { Cores, Espaco } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

// Entrar com e-mail e senha. A pessoa faz isso uma vez: o app guarda a sessão no celular.
// (O login por código no e-mail volta quando houver envio de e-mail próprio, Etapa 15.)

function traduzirErro(msg: string) {
  const m = msg.toLowerCase();
  if (m.includes('invalid login')) return 'E-mail ou senha errados.';
  if (m.includes('already registered') || m.includes('already been registered')) return 'Esse e-mail já tem conta. Toque em "Já tenho conta".';
  if (m.includes('password') && (m.includes('6') || m.includes('short') || m.includes('weak'))) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('not confirmed')) return 'Conta ainda não confirmada. Avise o Victor (confirmação de e-mail ligada no Supabase).';
  if (m.includes('rate limit') || m.includes('security purposes')) return 'Muitas tentativas em pouco tempo. Espere um pouco e tente de novo.';
  if (m.includes('network') || m.includes('fetch')) return 'Sem internet. Confira a conexão e tente de novo.';
  if (m.includes('email')) return 'Confira se o e-mail está certo.';
  return 'Não deu certo agora. Tente de novo.';
}

export default function Entrar() {
  const [modo, setModo] = useState<'criar' | 'entrar'>('criar');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [verSenha, setVerSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const emailValido = /^\S+@\S+\.\S+$/.test(email.trim());
  const pronto = emailValido && senha.length >= 6;

  async function continuar() {
    setErro('');
    setEnviando(true);
    const dados = { email: email.trim().toLowerCase(), password: senha };
    const { data, error } =
      modo === 'criar' ? await supabase.auth.signUp(dados) : await supabase.auth.signInWithPassword(dados);
    setEnviando(false);
    if (error) return setErro(traduzirErro(error.message));
    if (modo === 'criar' && !data.session) {
      setErro('Conta criada, mas o Supabase pediu confirmação por e-mail. Desligue "Confirm email" no Supabase.');
    }
    // Deu certo: o layout raiz troca de tela sozinho
  }

  return (
    <SafeAreaView style={estilos.tela}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <View style={estilos.marca}>
            <Logo largura={220} />
          </View>

          <View style={estilos.bloco}>
            <Texto variante="titulo">{modo === 'criar' ? 'Bora treinar' : 'Bem-vindo de volta'}</Texto>
            <Texto variante="legenda">
              {modo === 'criar'
                ? 'Crie sua conta. Você faz isso uma vez só.'
                : 'Entre com o e-mail e a senha da sua conta.'}
            </Texto>

            <Campo
              value={email}
              onChangeText={setEmail}
              placeholder="seuemail@exemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              textContentType="emailAddress"
            />
            <View>
              <Campo
                value={senha}
                onChangeText={setSenha}
                placeholder={modo === 'criar' ? 'Crie uma senha (mín. 6)' : 'Sua senha'}
                secureTextEntry={!verSenha}
                autoCapitalize="none"
                autoComplete={modo === 'criar' ? 'new-password' : 'current-password'}
                textContentType={modo === 'criar' ? 'newPassword' : 'password'}
                returnKeyType="go"
                onSubmitEditing={() => pronto && continuar()}
                style={{ paddingRight: 70 }}
              />
              <Pressable onPress={() => setVerSenha((v) => !v)} style={estilos.verSenha} hitSlop={10}>
                <Texto variante="legenda" cor={Cores.verde}>
                  {verSenha ? 'Ocultar' : 'Ver'}
                </Texto>
              </Pressable>
            </View>

            <Botao
              titulo={enviando ? 'Aguarde...' : modo === 'criar' ? 'Criar conta' : 'Entrar'}
              disabled={!pronto || enviando}
              style={(!pronto || enviando) && { opacity: 0.4 }}
              onPress={continuar}
            />

            <Pressable
              onPress={() => {
                setErro('');
                setModo((m) => (m === 'criar' ? 'entrar' : 'criar'));
              }}
              hitSlop={10}
              style={{ alignSelf: 'center', paddingTop: Espaco.xs }}>
              <Texto variante="corpo" cor={Cores.textoSecundario}>
                {modo === 'criar' ? 'Já tenho conta' : 'Não tenho conta, quero criar'}
              </Texto>
            </Pressable>
          </View>

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
  verSenha: { position: 'absolute', right: 18, top: 0, bottom: 0, justifyContent: 'center' },
});
