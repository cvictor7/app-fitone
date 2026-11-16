import { Link } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Botao } from '@/components/botao';
import { CaixaMarcar } from '@/components/caixa-marcar';
import { Campo } from '@/components/campo';
import { Texto } from '@/components/texto';
import { Cores, Espaco } from '@/constants/theme';
import { useSessao } from '@/lib/sessao';
import { VERSAO_TERMOS, supabase } from '@/lib/supabase';

// Primeiro acesso: nome + consentimentos (LGPD).
// "Deixar o personal ver meus treinos" é separado e opcional: a pessoa pode recusar e mudar depois.

export default function Cadastro() {
  const { sessao, perfil, recarregar, sair } = useSessao();
  const [nome, setNome] = useState(perfil?.nome ?? '');
  const [aceitaTermos, setAceitaTermos] = useState(false);
  const [compartilhar, setCompartilhar] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const pronto = nome.trim().length >= 2 && aceitaTermos;

  async function salvar() {
    if (!sessao) return;
    setErro('');
    setSalvando(true);
    const id = sessao.user.id;

    const r1 = await supabase.from('profiles').update({ nome: nome.trim() }).eq('id', id);
    const consentimentos = [
      { user_id: id, tipo: 'termos', versao: VERSAO_TERMOS },
      { user_id: id, tipo: 'privacidade', versao: VERSAO_TERMOS },
      ...(compartilhar ? [{ user_id: id, tipo: 'compartilhar_com_personal', versao: VERSAO_TERMOS }] : []),
    ];
    const r2 = await supabase.from('consentimentos').insert(consentimentos);

    const falha = r1.error ?? r2.error;
    if (falha) {
      setSalvando(false);
      // Mostra o detalhe técnico pequeno embaixo, para achar o problema rápido
      return setErro(`Não deu para salvar.\n(${falha.code ?? ''} ${falha.message})`);
    }
    await recarregar();
    setSalvando(false);
  }

  return (
    <SafeAreaView style={estilos.tela}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={estilos.conteudo} keyboardShouldPersistTaps="handled">
          <View style={{ gap: Espaco.sm }}>
            <Texto variante="titulo">Quase lá</Texto>
            <Texto variante="legenda">Só falta seu nome e o seu ok com as regras.</Texto>
          </View>

          <View style={{ gap: Espaco.sm }}>
            <Texto variante="rotulo">COMO VOCÊ SE CHAMA?</Texto>
            <Campo
              value={nome}
              onChangeText={setNome}
              placeholder="Nome e sobrenome"
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
            />
            <Texto variante="legenda">Na comunidade aparece só o nome abreviado (ex.: Victor M.).</Texto>
          </View>

          <View>
            <CaixaMarcar marcado={aceitaTermos} aoMudar={setAceitaTermos}>
              <Texto variante="corpo">
                Li e aceito os termos de uso e a{' '}
                <Link href="/privacidade">
                  <Texto variante="corpo" cor={Cores.verde}>
                    política de privacidade
                  </Texto>
                </Link>
                .
              </Texto>
            </CaixaMarcar>
            <CaixaMarcar marcado={compartilhar} aoMudar={setCompartilhar}>
              <Texto variante="corpo">Deixar meu personal ver os treinos que eu fizer</Texto>
              <Texto variante="legenda">Opcional. Sem isso ele vê só o plano que montou. Dá para mudar depois no Perfil.</Texto>
            </CaixaMarcar>
          </View>

          <Botao
            titulo={salvando ? 'Salvando...' : 'Continuar'}
            disabled={!pronto || salvando}
            style={(!pronto || salvando) && { opacity: 0.4 }}
            onPress={salvar}
          />

          {erro ? (
            <Texto variante="corpo" cor={Cores.perigo} style={{ textAlign: 'center' }}>
              {erro}
            </Texto>
          ) : null}

          <Texto variante="legenda" style={{ textAlign: 'center' }} onPress={sair}>
            Entrou com o e-mail errado? <Texto variante="legenda" cor={Cores.verde}>Sair</Texto>
          </Texto>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { paddingHorizontal: Espaco.lg, paddingVertical: Espaco.xl, gap: Espaco.xl },
});
