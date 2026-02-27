import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// 16リング × 256セグメント: 密な線が何重にも重なる構成
const RING_SEGMENTS = 256;
const RING_COUNT = 16;

export default function WaveMode({ getAudioData, params }) {
  const groupRef = useRef();
  const audioRef = useRef({ bass: 0, mid: 0, high: 0, volume: 0, spectralCentroid: 0 });

  const intensity = params?.intensity ?? 0.5;
  const complexity = params?.complexity ?? 0.5;
  const speed = params?.speed ?? 0.5;

  const rings = useMemo(() => {
    return Array.from({ length: RING_COUNT }, (_, ringIndex) => {
      const positions = new Float32Array((RING_SEGMENTS + 1) * 3);
      const colors = new Float32Array((RING_SEGMENTS + 1) * 3);
      return { positions, colors };
    });
  }, []);

  const tmpColor = useMemo(() => new THREE.Color(), []);

  useFrame((state) => {
    if (!groupRef.current) return;
    const audio = getAudioData();
    const a = audioRef.current;
    // スムージング（連続性重視）
    a.bass += (audio.bass - a.bass) * 0.08;
    a.mid += (audio.mid - a.mid) * 0.08;
    a.high += (audio.high - a.high) * 0.08;
    a.volume += (audio.volume - a.volume) * 0.08;
    a.spectralCentroid += (audio.spectralCentroid - a.spectralCentroid) * 0.06;

    const time = state.clock.elapsedTime;
    const scale = 1 + a.volume * 2;
    const timeSpeed = 0.5 + speed * 2.0;

    groupRef.current.children.forEach((line, ringIndex) => {
      const geo = line.geometry;
      const posAttr = geo.attributes.position;
      const colAttr = geo.attributes.color;
      const posArr = posAttr.array;
      const colArr = colAttr.array;

      // 密な間隔: 0.3から始まり0.25刻みで16リング
      const baseRadius = 0.3 + ringIndex * 0.25;
      const ringPhase = ringIndex * 0.8;

      // 波の複雑さ（complexityで制御）
      const waveComplexity = 2 + complexity * 12;

      for (let i = 0; i <= RING_SEGMENTS; i++) {
        const angle = (i / RING_SEGMENTS) * Math.PI * 2;
        const i3 = i * 3;

        // 低音: 大きなうねり（リズムに反応）
        const wave1 = Math.sin(angle * 2 + time * timeSpeed * 0.8 + ringPhase) * a.bass * (1.5 + intensity * 1.0);
        // 中音: 中くらいの波
        const midFreq = 4 + complexity * 6;
        const wave2 = Math.sin(angle * midFreq + time * timeSpeed * 0.6 + ringPhase * 0.7) * a.mid * 0.8;
        // 高音: 細かい波（繊細なディテール）
        const wave3 = Math.sin(angle * waveComplexity + time * timeSpeed * 1.2) * a.high * (0.5 + complexity * 0.3);
        // さらに細かい微振動（倍音的なディテール）
        const wave4 = Math.sin(angle * (waveComplexity * 2.3) + time * timeSpeed * 1.8 + ringPhase * 0.3) * a.high * 0.15 * complexity;

        const r = (baseRadius + wave1 + wave2 + wave3 + wave4) * scale;
        posArr[i3] = Math.cos(angle) * r;
        posArr[i3 + 1] = Math.sin(angle) * r;
        posArr[i3 + 2] = ringIndex * 0.3 - RING_COUNT * 0.15;

        // 色: 周波数重心でベース色、リングごとにずらす
        const centroidNorm = Math.min(a.spectralCentroid / 4000, 1);
        const hue = (centroidNorm * 0.8 + ringIndex * 0.04 + time * 0.02) % 1;
        const sat = 0.6 + a.volume * 0.3;
        const lightness = 0.35 + a.volume * 0.25 + intensity * 0.1;
        tmpColor.setHSL(hue, sat, lightness);
        colArr[i3] = tmpColor.r;
        colArr[i3 + 1] = tmpColor.g;
        colArr[i3 + 2] = tmpColor.b;
      }

      posAttr.needsUpdate = true;
      colAttr.needsUpdate = true;
    });

    // ゆっくり回転
    groupRef.current.rotation.z += 0.001 + speed * 0.004;
  });

  return (
    <group ref={groupRef}>
      {rings.map((ring, idx) => (
        <line key={idx}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={RING_SEGMENTS + 1}
              array={ring.positions}
              itemSize={3}
            />
            <bufferAttribute
              attach="attributes-color"
              count={RING_SEGMENTS + 1}
              array={ring.colors}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            vertexColors
            transparent
            opacity={0.7}
            linewidth={1}
          />
        </line>
      ))}
    </group>
  );
}
