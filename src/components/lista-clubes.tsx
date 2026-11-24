import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Campo } from '@/components/campo';
import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { entrarComCodigo, traduzirErroClube, type Clube } from '@/lib/clubes';

// Aba "Clubes" da Comunidade: entrar com código, meus clubes e os abertos da Fit One.

export function CardClube({ c, onPress }: { c: Clube; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [estilos.card, c.souMembro && { borderColor: Cores.verde }, pressed && { opacity: 0.7 }]}>
      <View style={estilos.inicial}>
        <Texto variante="display" cor={Cores.preto} style={{ fontSize: 26, lineHeight: 28 }}>
          {c.nome.trim()[0]?.toUpperCase() ?? '?'}
        </Texto>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Texto variante="corpo" style={{ fontFamily: 'Archivo_600SemiBold' }} numberOfLines={1}>
          {c.nome}
          {c.fechado ? '  🔒' : ''}
        </Texto>
        <Texto variante="legenda" numberOfLines={1}>
          {c.membros} {c.membros === 1 ? 'membro' : 'membros'} · {c.treinosSemana} {c.treinosSemana === 1 ? 'treino' : 'treinos'} na semana
        </Texto>
        {c.descricao ? (
          <Texto variante="legenda" cor={Cores.textoApagado} numberOfLines={1}>
            {c.descricao}
          </Texto>
        ) : null}
      </View>
      <Texto variante="rotulo" cor={c.souMembro ? Cores.verde : Cores.textoSecundario}>
        {c.souDono ? 'DONO' : c.souMembro ? 'MEMBRO' : 'VER ›'}
      </Texto>
    </Pressable>
  );
}

export function ListaClubes({ clubes, rotaClube }: { clubes: Clube[]; rotaClube: (id: string) => any }) {
  const [codigo, setCodigo] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar() {
    setErro(null);
    setEntrando(true);
    try {
      const id = await entrarComCodigo(codigo);
      setCodigo('');
      router.push(rotaClube(id));
    } catch (e: any) {
      setErro(traduzirErroClube(String(e?.message ?? '')));
    } finally {
      setEntrando(false);
    }
  }

  const meus = clubes.filter((c) => c.souMembro);
  const outros = clubes.filter((c) => !c.souMembro);

  return (
    <View style={{ gap: Espaco.md }}>
      <View style={{ flexDirection: 'row', gap: Espaco.sm }}>
        <Campo
          value={codigo}
          onChangeText={(t) => setCodigo(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          placeholder="Código do clube"
          autoCapitalize="characters"
          autoCorrect={false}
          style={{ flex: 1, minHeight: 52 }}
        />
        <Pressable
          onPress={entrar}
          disabled={codigo.length < 6 || entrando}
          style={[estilos.entrar, (codigo.length < 6 || entrando) && { opacity: 0.4 }]}>
          <Texto variante="corpo" cor={Cores.preto} style={{ fontFamily: 'Archivo_700Bold' }}>
            {entrando ? '...' : 'Entrar'}
          </Texto>
        </Pressable>
      </View>
      {erro ? (
        <Texto variante="legenda" cor={Cores.perigo}>
          {erro}
        </Texto>
      ) : null}

      {meus.length > 0 ? (
        <View style={{ gap: Espaco.sm }}>
          <Texto variante="rotulo">MEUS CLUBES</Texto>
          {meus.map((c) => (
            <CardClube key={c.id} c={c} onPress={() => router.push(rotaClube(c.id))} />
          ))}
        </View>
      ) : null}

      <View style={{ gap: Espaco.sm }}>
        <Texto variante="rotulo">CLUBES ABERTOS DA FIT ONE</Texto>
        {outros.length === 0 ? (
          <Texto variante="corpo" cor={Cores.textoSecundario}>
            {meus.length === 0
              ? 'Nenhum clube ainda. Crie o primeiro: a turma do seu horário, o pessoal do Hybrid, a corrida de domingo...'
              : 'Você já está em todos os clubes abertos.'}
          </Texto>
        ) : (
          outros.map((c) => <CardClube key={c.id} c={c} onPress={() => router.push(rotaClube(c.id))} />)
        )}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Espaco.md,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    padding: Espaco.md,
  },
  inicial: { width: 48, height: 48, borderRadius: Raio.md, backgroundColor: Cores.verde, alignItems: 'center', justifyContent: 'center' },
  entrar: { minHeight: 52, paddingHorizontal: Espaco.lg, borderRadius: Raio.md, backgroundColor: Cores.verde, justifyContent: 'center' },
});
