import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Texto } from '@/components/texto';
import { Cores, Espaco } from '@/constants/theme';

// Rascunho da política de privacidade (versão 2026-11-16).
// Antes de publicar na loja: revisar e colocar também numa página web.

const SECOES = [
  {
    titulo: 'O que o app guarda',
    texto:
      'Seu nome, e-mail, foto (se você colocar), os treinos que você faz (exercícios, séries, cargas, repetições, duração e como foi) e os recordes. O app não pede nem guarda peso corporal, medidas, altura ou data de nascimento.',
  },
  {
    titulo: 'Quem vê',
    texto:
      'Você vê tudo seu. Seu personal vê o plano que ele montou e, só se você autorizar, os treinos que você fez. Na comunidade, outros alunos veem só seu nome abreviado, sua foto e seus pontos. Ninguém de fora da academia vê seus dados.',
  },
  {
    titulo: 'Para que',
    texto: 'Para montar e registrar seus treinos, mostrar sua evolução e deixar seu personal acompanhar. Nada é vendido nem usado para propaganda.',
  },
  {
    titulo: 'Onde fica',
    texto: 'Num banco de dados do Supabase, com acesso protegido por regras que deixam cada pessoa ver só o que deve.',
  },
  {
    titulo: 'Seus direitos (LGPD)',
    texto:
      'Você pode ver, corrigir e apagar seus dados, e tirar a permissão do personal a qualquer hora pelo Perfil. Excluir a conta apaga seus treinos e seu perfil.',
  },
];

export default function Privacidade() {
  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'bottom']}>
      <View style={estilos.topo}>
        <Texto variante="subtitulo">Privacidade</Texto>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Texto variante="corpo" cor={Cores.verde}>
            Fechar
          </Texto>
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        {SECOES.map((s) => (
          <View key={s.titulo} style={{ gap: Espaco.xs }}>
            <Texto variante="corpo" style={{ fontFamily: 'Archivo_700Bold' }}>
              {s.titulo}
            </Texto>
            <Texto variante="corpo" cor={Cores.textoSecundario}>
              {s.texto}
            </Texto>
          </View>
        ))}
        <Texto variante="legenda">Versão de 16/11/2026 · rascunho</Texto>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  topo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Espaco.lg,
    paddingVertical: Espaco.md,
    borderBottomWidth: 1,
    borderBottomColor: Cores.borda,
  },
  conteudo: { padding: Espaco.lg, gap: Espaco.lg },
});
