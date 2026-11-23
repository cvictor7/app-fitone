import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Aviso de fim do descanso quando o app está em segundo plano (celular no bolso).
// Com o app aberto, quem avisa é a vibração da própria tela.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: false, // app aberto: a tela já mostra o cronômetro
    shouldShowList: false,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

let permissaoPedida = false;
let agendada: string | null = null;

export async function pedirPermissaoAviso() {
  if (permissaoPedida || Platform.OS === 'web') return;
  permissaoPedida = true;
  try {
    const atual = await Notifications.getPermissionsAsync();
    if (!atual.granted) await Notifications.requestPermissionsAsync();
  } catch {
    // sem permissão: segue só com a vibração
  }
}

export async function agendarFimDescanso(segundos: number, proximo: string) {
  await cancelarAvisoDescanso();
  if (Platform.OS === 'web' || segundos <= 0) return;
  try {
    agendada = await Notifications.scheduleNotificationAsync({
      content: { title: 'Descanso acabou', body: proximo, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(segundos)) },
    });
  } catch {
    agendada = null;
  }
}

export async function cancelarAvisoDescanso() {
  if (!agendada) return;
  const id = agendada;
  agendada = null;
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // já disparou
  }
}
