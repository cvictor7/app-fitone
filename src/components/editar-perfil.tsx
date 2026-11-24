import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarraTopo } from '@/components/barra-topo';
import { Botao } from '@/components/botao';
import { Campo } from '@/components/campo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';

// Editar perfil: nome (aparece para o personal e, abreviado, na comunidade) e senha.
// O e-mail fica só para ver: trocar e-mail precisa de confirmação por e-mail (chega com o SMTP).

function nomeCurto(nome: string) {
  const p = nome.trim().split(/\s+/);
  return p.length > 1 ? `${p[0]} ${p[1][0].toUpperCase()}.` : p[0] ?? '';
}

export function EditarPerfil() {
  const { perfil, sessao, recarregar } = useSessao();
  const [nome, setNome] = useState(perfil?.nome ?? '');
  const [senha, setSenha] = useState('');
  const [senha2, setSenha2] = useState('');
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [msgNome, setMsgNome] = useState<{ ok: boolean; texto: string } | null>(null);
  const [msgSenha, setMsgSenha] = useState<{ ok: boolean; texto: string } | null>(null);

  async function salvarNome() {
    const n = nome.trim().replace(/\s+/g, ' ');
    if (n.length < 2) return setMsgNome({ ok: false, texto: 'Escreva seu nome.' });
    setSalvandoNome(true);
    const { error } = await supabase.from('profiles').update({ nome: n }).eq('id', sessao?.user.id ?? '');
    setSalvandoNome(false);
    if (error) return setMsgNome({ ok: false, texto: 'Não deu para salvar. Tente de novo.' });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setMsgNome({ ok: true, texto: 'Nome salvo ✓' });
    await recarregar();
  }

  async function salvarSenha() {
    if (senha.length < 6) return setMsgSenha({ ok: false, texto: 'A senha precisa ter pelo menos 6 caracteres.' });
    if (senha !== senha2) return setMsgSenha({ ok: false, texto: 'As duas senhas não são iguais.' });
    setSalvandoSenha(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setSalvandoSenha(false);
    if (error) {
      const m = error.message.toLowerCase();
      return setMsgSenha({
        ok: false,
        texto: m.includes('different') || m.includes('same') ? 'Use uma senha diferente da atual.' : 'Não deu para trocar. Tente de novo.',
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSenha('');
    setSenha2('');
    setMsgSenha({ ok: true, texto: 'Senha trocada ✓ Use a nova no próximo login.' });
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <BarraTopo titulo="Editar perfil" />
      <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={estilos.bloco}>
          <Texto variante="rotulo">NOME</Texto>
          <Campo value={nome} onChangeText={setNome} placeholder="Seu nome completo" autoCapitalize="words" maxLength={60} />
          <Texto variante="legenda">Na comunidade aparece assim: {nomeCurto(nome) || '—'}</Texto>
          {msgNome ? (
            <Texto variante="legenda" cor={msgNome.ok ? Cores.verde : Cores.perigo}>
              {msgNome.texto}
            </Texto>
          ) : null}
          <Botao titulo={salvandoNome ? 'Salvando...' : 'Salvar nome'} disabled={salvandoNome || nome.trim() === (perfil?.nome ?? '')} onPress={salvarNome} />
        </View>

        <View style={estilos.bloco}>
          <Texto variante="rotulo">E-MAIL</Texto>
          <Texto variante="corpo">{sessao?.user.email}</Texto>
          <Texto variante="legenda">Para trocar o e-mail, fale com a recepção por enquanto.</Texto>
        </View>

        <View style={estilos.bloco}>
          <Texto variante="rotulo">TROCAR SENHA</Texto>
          <Campo value={senha} onChangeText={setSenha} placeholder="Nova senha (mínimo 6)" secureTextEntry autoCapitalize="none" />
          <Campo value={senha2} onChangeText={setSenha2} placeholder="Repita a nova senha" secureTextEntry autoCapitalize="none" />
          {msgSenha ? (
            <Texto variante="legenda" cor={msgSenha.ok ? Cores.verde : Cores.perigo}>
              {msgSenha.texto}
            </Texto>
          ) : null}
          <Botao titulo={salvandoSenha ? 'Trocando...' : 'Trocar senha'} tipo="secundario" disabled={salvandoSenha || !senha} onPress={salvarSenha} />
        </View>

        <Botao titulo="Voltar" tipo="secundario" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { padding: Espaco.lg, gap: Espaco.lg, paddingBottom: Espaco.xxl },
  bloco: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, padding: Espaco.md, gap: Espaco.sm },
});
