import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconeSeta } from '@/components/icones';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { useDadosAluno } from '@/lib/dados';
import { useSessao } from '@/lib/sessao';

// Aba "Perfil" (aluno, personal e admin): editar perfil, privacidade, sair, excluir conta.

type Item = { titulo: string; detalhe?: string; abrir: () => void };

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

export function TelaPerfil() {
  const { perfil, sessao, papel, sair } = useSessao();
  const { plano } = useDadosAluno();
  const equipe = papel === 'personal' || papel === 'admin';
  const nome = perfil?.nome || 'Sem nome';

  const itens: Item[] = [
    {
      titulo: 'Editar perfil',
      detalhe: 'nome e senha',
      abrir: () => router.push((equipe ? '/personal/editar-perfil' : '/editar-perfil') as any),
    },
    ...(!equipe
      ? [
          { titulo: 'Meu personal', detalhe: plano?.personalNome ?? 'nenhum ainda', abrir: () => router.push('/treinar') },
          { titulo: 'Conquistas', detalhe: 'medalhas dos seus treinos', abrir: () => router.push('/conquistas') },
        ]
      : []),
    { titulo: 'Privacidade', detalhe: equipe ? 'política e dados' : 'quem vê meus treinos', abrir: () => router.push('/privacidade') },
    ...(!equipe
      ? [
          {
            titulo: 'Relógio e apps',
            detalhe: 'Apple Saúde, Health Connect, Strava',
            abrir: () =>
              Alert.alert(
                'Relógio e apps',
                'Na versão da loja, o app lê seus treinos do Apple Saúde (iPhone) e do Health Connect (Android): qualquer relógio que grave lá funciona. Enquanto isso, use o GPS do app para corrida, caminhada e bike.',
              ),
          },
        ]
      : []),
  ];

  function confirmarSaida() {
    Alert.alert('Sair da conta?', 'Para entrar de novo, use seu e-mail e senha.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: sair },
    ]);
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <Pressable onPress={itens[0].abrir} style={estilos.cabecalho}>
          <View style={estilos.avatar}>
            <Texto variante="titulo" cor={Cores.preto}>
              {iniciais(nome)}
            </Texto>
          </View>
          <View style={{ gap: 2, flex: 1 }}>
            <Texto variante="subtitulo">{nome}</Texto>
            <Texto variante="legenda">
              {papel === 'admin' ? 'Admin' : papel === 'personal' ? 'Personal' : 'Aluno'} · Fit One Manaus
            </Texto>
            <Texto variante="legenda">{sessao?.user.email}</Texto>
          </View>
        </Pressable>

        <View style={estilos.lista}>
          {itens.map((item, i) => (
            <Pressable
              key={item.titulo}
              accessibilityRole="button"
              onPress={item.abrir}
              style={({ pressed }) => [estilos.linha, i > 0 && estilos.separador, pressed && { opacity: 0.7 }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Texto variante="corpo">{item.titulo}</Texto>
                {item.detalhe ? <Texto variante="legenda">{item.detalhe}</Texto> : null}
              </View>
              <IconeSeta cor={Cores.textoApagado} />
            </Pressable>
          ))}
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={confirmarSaida}
          style={({ pressed }) => [estilos.sair, pressed && { opacity: 0.7 }]}>
          <Texto variante="corpo">Sair</Texto>
        </Pressable>

        <Pressable onPress={() => router.push('/excluir-conta')} style={{ alignSelf: 'center' }}>
          <Texto variante="legenda" cor={Cores.perigo}>
            Excluir minha conta
          </Texto>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  conteudo: { paddingHorizontal: Espaco.lg - 4, paddingBottom: Espaco.xl, gap: Espaco.lg },
  cabecalho: { flexDirection: 'row', alignItems: 'center', gap: Espaco.md, paddingTop: Espaco.md },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Cores.verde,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lista: { backgroundColor: Cores.superficie, borderRadius: Raio.lg, paddingHorizontal: Espaco.md },
  linha: { flexDirection: 'row', alignItems: 'center', minHeight: 64, gap: Espaco.md },
  separador: { borderTopWidth: 1, borderTopColor: Cores.borda },
  sair: {
    minHeight: 56,
    borderRadius: Raio.md,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
