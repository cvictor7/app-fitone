import { useEffect, useRef } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { Cores, Raio } from '@/constants/theme';

// Mapa do percurso (corrida/bike). Linha verde da Fit One; cada pausa começa um trecho novo.
// "seguir": durante a atividade, o mapa acompanha o último ponto.
// No iPhone usa o Apple Maps; no Android, o Google Maps (na versão da loja precisa de chave).

type Coord = { latitude: number; longitude: number };

export function MapaPercurso({
  trechos,
  seguir = false,
  mostrarEu = false,
  style,
}: {
  trechos: Coord[][];
  seguir?: boolean;
  mostrarEu?: boolean;
  style?: ViewStyle;
}) {
  const mapa = useRef<MapView>(null);
  const todos = trechos.flat();
  const ultimo = todos[todos.length - 1];
  const primeiro = todos[0];

  useEffect(() => {
    if (!mapa.current) return;
    if (seguir && ultimo) {
      mapa.current.animateCamera({ center: ultimo, zoom: 16 }, { duration: 600 });
    } else if (!seguir && todos.length > 1) {
      mapa.current.fitToCoordinates(todos, { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seguir, ultimo?.latitude, ultimo?.longitude, todos.length]);

  return (
    <View style={[estilos.caixa, style]}>
      <MapView
        ref={mapa}
        style={StyleSheet.absoluteFill}
        showsUserLocation={mostrarEu}
        followsUserLocation={false}
        userInterfaceStyle="dark"
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        initialRegion={
          ultimo
            ? { ...ultimo, latitudeDelta: 0.01, longitudeDelta: 0.01 }
            : { latitude: -3.1, longitude: -60.02, latitudeDelta: 0.08, longitudeDelta: 0.08 } // Manaus
        }>
        {trechos.map((t, i) => (t.length > 1 ? <Polyline key={i} coordinates={t} strokeColor={Cores.verde} strokeWidth={5} /> : null))}
        {primeiro && !seguir ? <Marker coordinate={primeiro} pinColor="green" title="Início" /> : null}
        {ultimo && !seguir && todos.length > 1 ? <Marker coordinate={ultimo} pinColor="red" title="Fim" /> : null}
      </MapView>
    </View>
  );
}

const estilos = StyleSheet.create({
  caixa: { overflow: 'hidden', borderRadius: Raio.lg, backgroundColor: Cores.superficie },
});
