import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Cores, Fontes, Raio, ToqueMinimo } from '@/constants/theme';

// Campo de texto do app: grande, escuro, com o verde da marca no cursor.
export function Campo({ style, ...resto }: TextInputProps) {
  return (
    <TextInput
      placeholderTextColor={Cores.textoApagado}
      selectionColor={Cores.verde}
      cursorColor={Cores.verde}
      style={[estilos.campo, style]}
      {...resto}
    />
  );
}

const estilos = StyleSheet.create({
  campo: {
    minHeight: ToqueMinimo + 4,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.md,
    borderWidth: 1.5,
    borderColor: Cores.borda,
    paddingHorizontal: 18,
    color: Cores.texto,
    fontFamily: Fontes.textoMedio,
    fontSize: 18,
  },
});
