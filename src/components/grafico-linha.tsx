import { useState } from 'react';
import { type LayoutChangeEvent, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';

import { Cores, Fontes } from '@/constants/theme';

// Gráfico de linha simples, desenhado à mão com SVG (sem biblioteca a mais no app).
type Props = {
  valores: number[];
  rotulos: string[]; // um por valor (datas curtas)
  cor?: string;
  altura?: number;
  unidade?: string;
};

export function GraficoLinha({ valores, rotulos, cor = Cores.verde, altura = 200, unidade = 'kg' }: Props) {
  const [largura, setLargura] = useState(0);
  const aoMedir = (e: LayoutChangeEvent) => setLargura(e.nativeEvent.layout.width);

  const margemEsq = 40;
  const margemDir = 12;
  const margemTopo = 14;
  const margemBaixo = 24;
  const w = Math.max(0, largura - margemEsq - margemDir);
  const h = altura - margemTopo - margemBaixo;

  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const folga = max === min ? Math.max(5, max * 0.1) : (max - min) * 0.15;
  const lo = Math.max(0, min - folga);
  const hi = max + folga;

  const x = (i: number) => margemEsq + (valores.length === 1 ? w / 2 : (i / (valores.length - 1)) * w);
  const y = (v: number) => margemTopo + h - ((v - lo) / (hi - lo || 1)) * h;

  const caminho = valores.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
  const linhasGuia = [0, 0.5, 1].map((f) => lo + (hi - lo) * f);
  const formatar = (v: number) => (Math.round(v * 10) / 10).toLocaleString('pt-BR');

  // no máximo 4 datas embaixo para não amontoar
  const passo = Math.max(1, Math.ceil(rotulos.length / 4));

  return (
    <View onLayout={aoMedir} style={{ height: altura }}>
      {largura > 0 ? (
        <Svg width={largura} height={altura}>
          {linhasGuia.map((v) => (
            <Line key={v} x1={margemEsq} x2={largura - margemDir} y1={y(v)} y2={y(v)} stroke={Cores.borda} strokeWidth={1} />
          ))}
          {linhasGuia.map((v) => (
            <SvgText key={`t${v}`} x={margemEsq - 6} y={y(v) + 4} fill={Cores.textoApagado} fontSize={11} fontFamily={Fontes.texto} textAnchor="end">
              {formatar(v)}
            </SvgText>
          ))}
          <Path d={caminho} stroke={cor} strokeWidth={3.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {valores.map((v, i) => (
            <Circle key={i} cx={x(i)} cy={y(v)} r={i === valores.length - 1 ? 5.5 : 3} fill={i === valores.length - 1 ? cor : Cores.fundo} stroke={cor} strokeWidth={2} />
          ))}
          {rotulos.map((r, i) =>
            i % passo === 0 || i === rotulos.length - 1 ? (
              <SvgText key={`r${i}`} x={x(i)} y={altura - 6} fill={Cores.textoApagado} fontSize={11} fontFamily={Fontes.texto} textAnchor="middle">
                {r}
              </SvgText>
            ) : null,
          )}
          <SvgText x={largura - margemDir} y={margemTopo - 2} fill={Cores.textoApagado} fontSize={10} fontFamily={Fontes.texto} textAnchor="end">
            {unidade}
          </SvgText>
        </Svg>
      ) : null}
    </View>
  );
}
