import { router } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconeSeta } from '@/components/icones';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { useDadosAluno } from '@/lib/dados';
import { useSessao } from '@/lib/sessao';

// Aba "Perfil". Login, consentimentos e exclusão de conta entram nas Etapas 4 e 14.

const ITENS_FIXOS = [
  { titulo: 'Privacidade', detalhe: 'quem vê meus treinos' },
  { titulo: 'Relógio e apps', detalhe: 'Apple Saúde, Strava · Fase 2' },
];

function iniciais(nome: string) {
  const partes = nome.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes.length > 1 ? partes[partes.length - 1][0] : '')).toUpperCase();
}

export function TelaPerfil() {
  const { perfil, sessao, papel, sair } = useSessao();
  const { plano } = useDadosAluno();
  const ehPersonal = papel === 'personal' || papel === 'admin';
  const ITENS = ehPersonal
    ? ITENS_FIXOS.filter((i) => i.titulo === 'Privacidade')
    : [{ titulo: 'Meu personal', detalhe: plano?.personalNome ?? 'nenhum ainda' }, ...ITENS_FIXOS];
  const nome = perfil?.nome || 'Sem nome';

  function confirmarSaida() {
    Alert.alert('Sair da conta?', 'Para entrar de novo, use seu e-mail e senha.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: sair },
    ]);
  }

  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.cabecalho}>
          <View style={estilos.avatar}>
            <Texto variante="titulo" cor={Cores.preto}>
              {iniciais(nome)}
            </Texto>
          </View>
          <View style={{ gap: 2 }}>
            <Texto variante="subtitulo">{nome}</Texto>
            <Texto variante="legenda">
              {papel === 'admin' ? 'Admin' : papel === 'personal' ? 'Personal' : 'Aluno'} · Fit One Manaus
            </Texto>
            <Texto variante="legenda">{sessao?.user.email}</Texto>
          </View>
        </View>

        <View style={estilos.lista}>
          {ITENS.map((item, i) => (
            <Pressable
              key={item.titulo}
              accessibilityRole="button"
              onPress={() => (item.titulo === 'Privacidade' ? router.push('/privacidade') : Alert.alert(item.titulo, 'Chega nas próximas etapas.'))}
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

        <Pressable onPress={() => Alert.alert('Excluir conta', 'Chega na Etapa 14.')} style={{ alignSelf: 'center' }}>
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
