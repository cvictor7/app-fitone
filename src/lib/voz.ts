import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { useEffect, useState } from 'react';

// Voz do app (contagem 3, 2, 1, estações, avisos de km). A pessoa pode desligar;
// a escolha fica salva no celular e vale para o timer e o GPS. Vibração continua.

const CHAVE = 'fitone:voz-ligada';
let ligada = true;
const ouvintes = new Set<(v: boolean) => void>();

AsyncStorage.getItem(CHAVE)
  .then((v) => {
    if (v === '0') {
      ligada = false;
      ouvintes.forEach((f) => f(false));
    }
  })
  .catch(() => {});

export function vozLigada() {
  return ligada;
}

export function definirVoz(v: boolean) {
  ligada = v;
  if (!v) Speech.stop();
  AsyncStorage.setItem(CHAVE, v ? '1' : '0').catch(() => {});
  ouvintes.forEach((f) => f(v));
}

/** Fala em português, se a voz estiver ligada. */
export function falar(texto: string, opcoes?: { interromper?: boolean; rate?: number }) {
  if (!ligada) return;
  if (opcoes?.interromper) Speech.stop();
  Speech.speak(texto, { language: 'pt-BR', rate: opcoes?.rate });
}

export function useVoz(): [boolean, (v: boolean) => void] {
  const [v, setV] = useState(ligada);
  useEffect(() => {
    ouvintes.add(setV);
    setV(ligada);
    return () => {
      ouvintes.delete(setV);
    };
  }, []);
  return [v, definirVoz];
}
