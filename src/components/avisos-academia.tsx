import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Texto } from '@/components/texto';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { avisosFechados, fecharAviso, listarAvisos, type Aviso } from '@/lib/academia';
import { useSessao } from '@/lib/sessao';

// Avisos da academia na tela Hoje. O aluno fecha no ✕ (fica guardado só no celular dele).

export function AvisosAcademia() {
  const { gymId } = useSessao();
  const [avisos, setAvisos] = useState<Aviso[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!gymId) return;
      Promise.all([listarAvisos(gymId, true), avisosFechados()])
        .then(([lista, fechados]) => setAvisos(lista.filter((a) => !fechados.includes(a.id)).slice(0, 3)))
        .catch(() => setAvisos([]));
    }, [gymId]),
  );

  if (avisos.length === 0) return null;

  return (
    <View style={{ gap: Espaco.sm }}>
      {avisos.map((a) => (
        <View key={a.id} style={estilos.aviso}>
          <View style={{ flex: 1, gap: 2 }}>
            <Texto variante="rotulo" cor={Cores.verde}>
              AVISO DA FIT ONE
            </Texto>
            <Texto variante="corpo" style={{ fontFamily: 'Archivo_600SemiBold' }}>
              {a.titulo}
            </Texto>
            {a.texto ? <Texto variante="legenda">{a.texto}</Texto> : null}
          </View>
          <Pressable
            accessibilityLabel="Fechar aviso"
            hitSlop={14}
            onPress={() => {
              fecharAviso(a.id);
              setAvisos((l) => l.filter((x) => x.id !== a.id));
            }}
            style={estilos.fechar}>
            <Texto variante="corpo" cor={Cores.textoSecundario}>
              ✕
            </Texto>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const estilos = StyleSheet.create({
  aviso: {
    flexDirection: 'row',
    gap: Espaco.sm,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    borderLeftWidth: 4,
    borderLeftColor: Cores.verde,
    padding: Espaco.md,
  },
  fechar: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
});
