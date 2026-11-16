import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconeSeta } from '@/components/icones';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { PERSONAL } from '@/dados/exemplo';

// Aba "Perfil". Login, consentimentos e exclusão de conta entram nas Etapas 4 e 14.

const ITENS = [
  { titulo: 'Meu personal', detalhe: PERSONAL.nome },
  { titulo: 'Privacidade', detalhe: 'quem vê meus treinos' },
  { titulo: 'Relógio e apps', detalhe: 'Apple Saúde, Strava · Fase 2' },
  { titulo: 'Sair', detalhe: '' },
];

export default function Perfil() {
  return (
    <SafeAreaView style={estilos.tela} edges={['top']}>
      <ScrollView contentContainerStyle={estilos.conteudo}>
        <View style={estilos.cabecalho}>
          <View style={estilos.avatar}>
            <Texto variante="titulo" cor={Cores.preto}>
              VM
            </Texto>
          </View>
          <View style={{ gap: 2 }}>
            <Texto variante="subtitulo">Victor Mendes</Texto>
            <Texto variante="legenda">Aluno · Fit One Manaus</Texto>
          </View>
        </View>

        <View style={estilos.lista}>
          {ITENS.map((item, i) => (
            <Pressable
              key={item.titulo}
              accessibilityRole="button"
              onPress={() => Alert.alert(item.titulo, 'Chega nas próximas etapas.')}
              style={({ pressed }) => [estilos.linha, i > 0 && estilos.separador, pressed && { opacity: 0.7 }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <Texto variante="corpo">{item.titulo}</Texto>
                {item.detalhe ? <Texto variante="legenda">{item.detalhe}</Texto> : null}
              </View>
              <IconeSeta cor={Cores.textoApagado} />
            </Pressable>
          ))}
        </View>

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
});
